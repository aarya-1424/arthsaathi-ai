-- Milestone 4: My Money. Income and expense entries, and monthly budgets.
-- Money is stored in whole rupees. Each user can only see and change their own rows.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  amount bigint not null check (amount > 0 and amount <= 100000000),
  occurred_on date not null check (occurred_on >= date '2000-01-01'),
  category text not null,
  description text check (char_length(description) <= 120),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_category_matches_kind check (
    (kind = 'income' and category in ('salary', 'allowance', 'freelance', 'business', 'other'))
    or (kind = 'expense' and category in (
      'rent', 'food', 'groceries', 'transport', 'education', 'medical', 'utilities',
      'shopping', 'family', 'entertainment', 'emi', 'other'
    ))
  )
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc, created_at desc);

alter table public.transactions enable row level security;

create policy "Users can read their own transactions"
  on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own transactions"
  on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can change their own transactions"
  on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own transactions"
  on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

revoke all on public.transactions from anon;


create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1 and month >= date '2000-01-01'),
  category text not null check (category in (
    'rent', 'food', 'groceries', 'transport', 'education', 'medical', 'utilities',
    'shopping', 'family', 'entertainment', 'emi', 'other'
  )),
  amount bigint not null check (amount > 0 and amount <= 100000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month, category)
);

alter table public.budgets enable row level security;

create policy "Users can read their own budgets"
  on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own budgets"
  on public.budgets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can change their own budgets"
  on public.budgets for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own budgets"
  on public.budgets for delete to authenticated using ((select auth.uid()) = user_id);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

revoke all on public.budgets from anon;


-- Replace a whole month's budget in one step (all or nothing).
-- "security invoker" means it runs as the signed-in user, so the privacy rules above still apply.
create function public.set_month_budget(p_month date, p_limits jsonb)
returns setof public.budgets
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if jsonb_typeof(p_limits) is distinct from 'array' then
    raise exception 'limits must be a list' using errcode = '22023';
  end if;

  delete from public.budgets where user_id = (select auth.uid()) and month = p_month;

  insert into public.budgets (user_id, month, category, amount)
  select (select auth.uid()), p_month, x.category, x.amount
  from jsonb_to_recordset(p_limits) as x(category text, amount bigint);

  return query
    select * from public.budgets
    where user_id = (select auth.uid()) and month = p_month
    order by category;
end;
$$;

revoke execute on function public.set_month_budget(date, jsonb) from public, anon;
grant execute on function public.set_month_budget(date, jsonb) to authenticated;
