-- Milestone 5: financial goals. Money is stored in whole rupees.
-- Each user can only see and change their own goals.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  target_amount bigint not null check (target_amount > 0 and target_amount <= 10000000000),
  saved_amount bigint not null default 0 check (saved_amount >= 0 and saved_amount <= 10000000000),
  target_date date check (target_date >= date '2000-01-01' and target_date <= date '2100-12-31'),
  monthly_contribution bigint check (monthly_contribution > 0 and monthly_contribution <= 100000000),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_idx on public.goals (user_id, created_at);

alter table public.goals enable row level security;

create policy "Users can read their own goals"
  on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own goals"
  on public.goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can change their own goals"
  on public.goals for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own goals"
  on public.goals for delete to authenticated using ((select auth.uid()) = user_id);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

revoke all on public.goals from anon;
