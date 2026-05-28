-- Users (extends auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  advice_frequency text not null default 'weekly'
    check (advice_frequency in ('daily', 'every_2_days', 'weekly')),
  reminder_enabled boolean not null default false,
  reminder_time time,
  recording_mode text not null default 'guided'
    check (recording_mode in ('quick', 'guided')),
  push_token text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Journal entries
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  video_url text,
  transcript text,
  sentiment_summary text,
  recorded_at timestamptz not null default now(),
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create index on public.journal_entries (user_id, recorded_at desc);

-- Daily intentions (per-entry short goals)
create table public.daily_intentions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.journal_entries(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.daily_intentions (entry_id);
create index on public.daily_intentions (user_id);

-- Long-term goals library
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  source text not null default 'user'
    check (source in ('user', 'ai_suggested')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index on public.goals (user_id, is_active);

-- Goal completions (which goals were completed per entry)
create table public.goal_completions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade not null,
  entry_id uuid references public.journal_entries(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  completed_at timestamptz not null default now(),
  unique (goal_id, entry_id)
);

create index on public.goal_completions (entry_id);
create index on public.goal_completions (user_id);

-- Insight sessions
create table public.insight_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  advice_text text not null,
  audio_url text,
  generated_at timestamptz not null default now(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  entry_count integer not null default 0
);

create index on public.insight_sessions (user_id, generated_at desc);

-- Streaks
create table public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null unique,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_entry_date date
);

-- Trigger: auto-create user profile + streak row on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);

  insert into public.user_streaks (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: recalculate streak on new journal entry
create or replace function public.update_streak()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  entry_date date := (new.recorded_at at time zone 'utc')::date;
  streak_row public.user_streaks%rowtype;
  new_streak integer;
  new_longest integer;
begin
  select * into streak_row from public.user_streaks where user_id = new.user_id;

  if streak_row.last_entry_date is null then
    new_streak := 1;
  elsif streak_row.last_entry_date = entry_date then
    new_streak := streak_row.current_streak;
  elsif streak_row.last_entry_date = entry_date - interval '1 day' then
    new_streak := streak_row.current_streak + 1;
  else
    new_streak := 1;
  end if;

  new_longest := greatest(new_streak, streak_row.longest_streak);

  update public.user_streaks
  set
    current_streak = new_streak,
    longest_streak = new_longest,
    last_entry_date = entry_date
  where user_id = new.user_id;

  return new;
end;
$$;

create trigger on_journal_entry_created
  after insert on public.journal_entries
  for each row execute function public.update_streak();
