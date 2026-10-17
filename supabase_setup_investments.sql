-- BJR Expense Tracker — Investments Ledger Setup
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- (Safe to re-run; every statement is idempotent)

-- 1. Create the investments table (money the investor pours into the startup)
create table if not exists public.investments (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  date text not null,
  amount numeric not null,
  note text default '',
  bill_url text
);

-- 2. If the table already existed without the receipt column, add it
alter table public.investments add column if not exists bill_url text;

-- 3. Enable RLS and mirror the same public policies used by `expenses` / `funds`
alter table public.investments enable row level security;

drop policy if exists "Allow public read investments" on public.investments;
create policy "Allow public read investments"
  on public.investments for select using (true);

drop policy if exists "Allow public insert investments" on public.investments;
create policy "Allow public insert investments"
  on public.investments for insert with check (true);

drop policy if exists "Allow public delete investments" on public.investments;
create policy "Allow public delete investments"
  on public.investments for delete using (true);
