-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.journal_entries enable row level security;
alter table public.daily_intentions enable row level security;
alter table public.goals enable row level security;
alter table public.goal_completions enable row level security;
alter table public.insight_sessions enable row level security;
alter table public.user_streaks enable row level security;

-- users
create policy "users: select own" on public.users
  for select using (auth.uid() = id);
create policy "users: insert own" on public.users
  for insert with check (auth.uid() = id);
create policy "users: update own" on public.users
  for update using (auth.uid() = id);

-- journal_entries
create policy "journal_entries: select own" on public.journal_entries
  for select using (auth.uid() = user_id);
create policy "journal_entries: insert own" on public.journal_entries
  for insert with check (auth.uid() = user_id);
create policy "journal_entries: update own" on public.journal_entries
  for update using (auth.uid() = user_id);
create policy "journal_entries: delete own" on public.journal_entries
  for delete using (auth.uid() = user_id);

-- daily_intentions
create policy "daily_intentions: select own" on public.daily_intentions
  for select using (auth.uid() = user_id);
create policy "daily_intentions: insert own" on public.daily_intentions
  for insert with check (auth.uid() = user_id);
create policy "daily_intentions: update own" on public.daily_intentions
  for update using (auth.uid() = user_id);
create policy "daily_intentions: delete own" on public.daily_intentions
  for delete using (auth.uid() = user_id);

-- goals
create policy "goals: select own" on public.goals
  for select using (auth.uid() = user_id);
create policy "goals: insert own" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "goals: update own" on public.goals
  for update using (auth.uid() = user_id);
create policy "goals: delete own" on public.goals
  for delete using (auth.uid() = user_id);

-- goal_completions
create policy "goal_completions: select own" on public.goal_completions
  for select using (auth.uid() = user_id);
create policy "goal_completions: insert own" on public.goal_completions
  for insert with check (auth.uid() = user_id);
create policy "goal_completions: delete own" on public.goal_completions
  for delete using (auth.uid() = user_id);

-- insight_sessions: users can read their own; server (service role) writes via RLS bypass
create policy "insight_sessions: select own" on public.insight_sessions
  for select using (auth.uid() = user_id);

-- user_streaks: read-only for users (written by triggers with security definer)
create policy "user_streaks: select own" on public.user_streaks
  for select using (auth.uid() = user_id);
