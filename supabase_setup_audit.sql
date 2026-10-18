-- BJR Expense Tracker — TRUST LAYER: Audit trail + Soft delete
-- Run AFTER supabase_setup_security.sql
-- Supabase Dashboard → SQL Editor → New query → Run  (safe to re-run)

-- ============================================================
-- 1. SOFT DELETE COLUMN on every money table
--    Deleting a row no longer erases it — it is marked deleted,
--    hidden from the ledger, and stays restorable.
-- ============================================================
alter table public.expenses    add column if not exists deleted_at timestamptz;
alter table public.funds       add column if not exists deleted_at timestamptz;
alter table public.investments add column if not exists deleted_at timestamptz;

-- ============================================================
-- 2. AUDIT LOG (append-only: who changed what, when)
-- ============================================================
create table if not exists public.audit_log (
  id          bigserial primary key,
  happened_at timestamptz not null default now(),
  actor_email text,
  action      text not null,          -- insert | update | soft_delete | restore | delete
  table_name  text not null,          -- expenses | funds | investments
  row_id      bigint,
  before_row  jsonb,
  after_row   jsonb
);

create index if not exists audit_log_happened_at_idx on public.audit_log (happened_at desc);
create index if not exists audit_log_table_name_idx  on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;

-- Admins may READ the trail; nobody can write it directly (only the trigger below)
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'audit_log'
  loop
    execute format('drop policy if exists %I on public.audit_log', p.policyname);
  end loop;
end $$;

create policy "Admin read audit log" on public.audit_log
  for select to authenticated using (true);

-- ============================================================
-- 3. TRIGGER: log every insert / update / delete automatically
--    (works even if a change is made outside the app)
-- ============================================================
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  text;
  v_action text;
  v_id     bigint;
begin
  v_actor := coalesce(nullif(auth.jwt() ->> 'email', ''), 'signed-in user');

  if (TG_OP = 'INSERT') then
    v_action := 'insert';
    v_id := NEW.id;
    insert into public.audit_log (actor_email, action, table_name, row_id, after_row)
    values (v_actor, v_action, TG_TABLE_NAME, v_id, to_jsonb(NEW));
    return NEW;

  elsif (TG_OP = 'UPDATE') then
    if NEW.deleted_at is not null and OLD.deleted_at is null then
      v_action := 'soft_delete';
    elsif NEW.deleted_at is null and OLD.deleted_at is not null then
      v_action := 'restore';
    else
      v_action := 'update';
    end if;
    v_id := NEW.id;
    insert into public.audit_log (actor_email, action, table_name, row_id, before_row, after_row)
    values (v_actor, v_action, TG_TABLE_NAME, v_id, to_jsonb(OLD), to_jsonb(NEW));
    return NEW;

  else
    v_action := 'delete';
    v_id := OLD.id;
    insert into public.audit_log (actor_email, action, table_name, row_id, before_row)
    values (v_actor, v_action, TG_TABLE_NAME, v_id, to_jsonb(OLD));
    return OLD;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['expenses', 'funds', 'investments'] loop
    execute format('drop trigger if exists audit_%1$s_change on public.%1$s', t);
    execute format(
      'create trigger audit_%1$s_change after insert or update or delete on public.%1$s
         for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

-- ============================================================
-- 4. RLS: public ledger sees ACTIVE rows only; admins see everything
--    (deleted rows stay visible to a signed-in admin so they can
--     be reviewed in the Activity tab and restored)
-- ============================================================
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['expenses', 'funds', 'investments'] loop

    for p in select policyname from pg_policies
             where schemaname = 'public' and tablename = t and cmd = 'SELECT'
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    -- public / client ledger: only rows that are not deleted
    execute format(
      'create policy %I on public.%I for select using (deleted_at is null)',
      'Public read ' || t, t);

    -- signed-in admin: everything, including deleted rows (for restore)
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      'Admin read all ' || t, t);

  end loop;
end $$;

-- ============================================================
-- 5. Verify: should show the new policies + the audit table
-- ============================================================
select schemaname, tablename, policyname, cmd, roles::text as roles
from pg_policies
where schemaname = 'public'
  and tablename in ('expenses', 'funds', 'investments', 'audit_log')
order by tablename, cmd;
