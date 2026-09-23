-- Run this in Supabase SQL Editor.

alter table public.events
  add column if not exists large_needed integer not null default 0,
  add column if not exists medium_needed integer not null default 0,
  add column if not exists small_needed integer not null default 0;

create table if not exists public.daily_todos (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists daily_todos_date_idx on public.daily_todos(date);

create table if not exists public.illustration_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  large integer not null default 0 check (large >= 0),
  medium integer not null default 0 check (medium >= 0),
  small integer not null default 0 check (small >= 0),
  created_at timestamptz not null default now()
);

create index if not exists illustration_logs_date_idx on public.illustration_logs(date);

alter table public.daily_todos enable row level security;
alter table public.illustration_logs enable row level security;

create policy "daily todos are accessible" on public.daily_todos
  for all using (true) with check (true);
create policy "illustration logs are accessible" on public.illustration_logs
  for all using (true) with check (true);
