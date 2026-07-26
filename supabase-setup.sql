-- Run this once in your Supabase project's SQL Editor
-- (Supabase dashboard → SQL Editor → New query → paste → Run)

create table if not exists forms (
  id uuid primary key,
  title text default '',
  doc_ref text default '',
  status text default 'draft',
  tags text[] default '{}',
  version text default '1.0',
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table forms enable row level security;

-- Permissive policy for now (anyone with the anon key can read/write).
-- Tighten this later once you have logins for supervisors vs operators —
-- e.g. restrict writes to authenticated users, or add a role check.
create policy "Allow all access to forms" on forms
  for all
  using (true)
  with check (true);
