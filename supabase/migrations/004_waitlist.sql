create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Public insert only (no auth required for waitlist signup)
create policy "waitlist: public insert" on public.waitlist
  for insert with check (true);
