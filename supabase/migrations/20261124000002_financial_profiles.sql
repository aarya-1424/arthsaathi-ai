-- Milestone 3: the user's financial profile from onboarding.
-- Money is stored in whole rupees. Each user can only see and change their own row.

create table public.financial_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,

  occupation text not null
    check (occupation in ('student', 'salaried', 'self_employed', 'homemaker', 'other')),
  age_range text
    check (age_range in ('under_18', '18_24', '25_34', '35_44', '45_54', '55_plus')),
  state text check (char_length(state) <= 60),

  monthly_income bigint not null check (monthly_income between 0 and 100000000),
  income_source text
    check (income_source in ('salary', 'allowance', 'business', 'freelance', 'pension', 'family', 'other')),
  monthly_expenses bigint not null check (monthly_expenses between 0 and 100000000),
  monthly_savings bigint check (monthly_savings between 0 and 100000000),
  monthly_emi bigint check (monthly_emi between 0 and 100000000),
  dependents smallint check (dependents between 0 and 20),
  emergency_fund bigint check (emergency_fund between 0 and 10000000000),

  goals text[] not null default '{}'
    check (
      cardinality(goals) <= 12
      and goals <@ array[
        'save_money', 'emergency_fund', 'manage_expenses', 'pay_off_debt', 'buy_gadget',
        'buy_vehicle', 'education', 'family_expense', 'learn_investing', 'understand_taxes', 'other'
      ]::text[]
    ),
  other_goal text check (char_length(other_goal) <= 100),

  knowledge_level text not null
    check (knowledge_level in ('beginner', 'basic', 'intermediate', 'advanced')),

  onboarding_completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_profiles enable row level security;

create policy "Users can read their own financial profile"
  on public.financial_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own financial profile"
  on public.financial_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own financial profile"
  on public.financial_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own financial profile"
  on public.financial_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger financial_profiles_set_updated_at
  before update on public.financial_profiles
  for each row execute function public.set_updated_at();

-- Visitors who are not signed in get no access at all.
revoke all on public.financial_profiles from anon;
