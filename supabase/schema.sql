-- Paste into Supabase → SQL Editor → Run. Safe to run once on a fresh project.

create table entries (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  task       text not null check (task in ('T1', 'T2', 'T3')),
  content    text not null,
  word_count int  not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: a signed-in user can only read and write their own rows.
-- Without a session, the public key in the browser can reach nothing.
alter table entries enable row level security;

create policy "own entries" on entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
