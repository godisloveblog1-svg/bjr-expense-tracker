-- BJR Expense Tracker — Funds Ledger Setup
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- (Safe to re-run; every statement is idempotent)

-- 1. Create the funds table (money received from the client)
create table if not exists public.funds (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  date text not null,
  amount numeric not null,
  note text default '',
  bill_url text
);

-- 2. If the table already existed without the receipt column, add it
alter table public.funds add column if not exists bill_url text;

-- 3. Enable RLS and mirror the same public policies used by `expenses`
alter table public.funds enable row level security;

drop policy if exists "Allow public read funds" on public.funds;
create policy "Allow public read funds"
  on public.funds for select using (true);

drop policy if exists "Allow public insert funds" on public.funds;
create policy "Allow public insert funds"
  on public.funds for insert with check (true);

drop policy if exists "Allow public delete funds" on public.funds;
create policy "Allow public delete funds"
  on public.funds for delete using (true);
