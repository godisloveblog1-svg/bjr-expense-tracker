-- BJR Expense Tracker — SECURITY HARDENING
-- Run in Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (idempotent).
--
-- BEFORE running: create your admin login in
--   Supabase Dashboard → Authentication → Users → Add user
-- (email + password). That account is what the admin panel signs in with.

-- ============================================================
-- 1. TABLES: public read (ledger stays shareable), admin-only writes
-- ============================================================
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['expenses', 'funds', 'investments'] loop
    -- Only proceed if the table exists
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then

      -- Drop ALL existing policies on this table (removes the old
      -- "Allow public insert/delete/update" policies)
      for p in select policyname from pg_policies
               where schemaname = 'public' and tablename = t
      loop
        execute format('drop policy if exists %I on public.%I', p.policyname, t);
      end loop;

      execute format('alter table public.%I enable row level security', t);

      -- Anyone may READ (client ledger is public on purpose)
      execute format(
        'create policy %I on public.%I for select using (true)',
        'Public read ' || t, t
      );

      -- Only a signed-in admin may WRITE
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (true)',
        'Admin insert ' || t, t
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (true) with check (true)',
        'Admin update ' || t, t
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using (true)',
        'Admin delete ' || t, t
      );
    end if;
  end loop;
end $$;

-- ============================================================
-- 2. STORAGE (bills bucket): public read of receipts, admin-only uploads
-- ============================================================
do $$
declare
  p record;
begin
  -- Drop existing policies that target the bills bucket
  for p in select policyname from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
  loop
    -- only drop ones we previously created or that mention bills
    if p.policyname ilike '%bill%' then
      execute format('drop policy if exists %I on storage.objects', p.policyname);
    end if;
  end loop;
end $$;

-- Public can view receipts (needed for the public ledger + PDF export)
drop policy if exists "Public read bills" on storage.objects;
create policy "Public read bills"
  on storage.objects for select
  using (bucket_id = 'bills');

-- Only a signed-in admin can upload / replace / delete receipts
drop policy if exists "Admin insert bills" on storage.objects;
create policy "Admin insert bills"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'bills');

drop policy if exists "Admin update bills" on storage.objects;
create policy "Admin update bills"
  on storage.objects for update to authenticated
  using (bucket_id = 'bills');

drop policy if exists "Admin delete bills" on storage.objects;
create policy "Admin delete bills"
  on storage.objects for delete to authenticated
  using (bucket_id = 'bills');

-- ============================================================
-- 3. Verify (optional): list the resulting policies
-- ============================================================
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where (schemaname = 'public' and tablename in ('expenses', 'funds', 'investments'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, cmd;
