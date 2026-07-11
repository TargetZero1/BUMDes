-- Adds a two-step approval hierarchy (Bendahara then Direktur) for operator-initiated
-- transfers to units. Money no longer posts to the ledgers when the Operator sends it --
-- it now posts only after Direktur gives final approval. Bendahara/Direktur can reject
-- at their respective stage with a reason, which stops the transfer without moving money.

begin;

-- 1. New roles -----------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('super_admin', 'operator', 'unit_admin', 'staff', 'viewer', 'bendahara', 'direktur'));

-- Template accounts so the roles are usable immediately. Password for both is
-- "bumdes123" (SHA-256 hashed, same scheme as src/lib/auth.js). Meant to be
-- changed by each holder via the app's own "Ubah Password" screen after first login.
insert into public.profiles (full_name, phone, role, status, password_hash, unit_id, can_view_all)
values
  ('Bendahara BUMDes', '081100000001', 'bendahara', 'approved', 'dd6228f43ba93eb85a63f805cfe1ef523fe9e39a901ee548a25953a004d9fea6', null, false),
  ('Direktur BUMDes', '081100000002', 'direktur', 'approved', 'dd6228f43ba93eb85a63f805cfe1ef523fe9e39a901ee548a25953a004d9fea6', null, false)
on conflict (phone) do nothing;

-- 2. Approval columns on pengeluaran_unit ---------------------------------------
alter table public.pengeluaran_unit add column if not exists status text;
alter table public.pengeluaran_unit add column if not exists bendahara_id uuid references public.profiles(id) on delete set null;
alter table public.pengeluaran_unit add column if not exists bendahara_approved_at timestamptz;
alter table public.pengeluaran_unit add column if not exists direktur_id uuid references public.profiles(id) on delete set null;
alter table public.pengeluaran_unit add column if not exists direktur_approved_at timestamptz;
alter table public.pengeluaran_unit add column if not exists rejected_by uuid references public.profiles(id) on delete set null;
alter table public.pengeluaran_unit add column if not exists rejected_at timestamptz;
alter table public.pengeluaran_unit add column if not exists rejected_role text;
alter table public.pengeluaran_unit add column if not exists rejection_reason text;

-- Existing rows already posted to the ledgers under the old immediate-post
-- behavior -- backfill them as approved so history/invoices keep working.
update public.pengeluaran_unit set status = 'approved' where status is null;

alter table public.pengeluaran_unit alter column status set default 'menunggu_bendahara';
alter table public.pengeluaran_unit alter column status set not null;
alter table public.pengeluaran_unit drop constraint if exists pengeluaran_unit_status_check;
alter table public.pengeluaran_unit add constraint pengeluaran_unit_status_check
  check (status in ('menunggu_bendahara', 'menunggu_direktur', 'approved', 'ditolak'));

-- 3. Role check helper -----------------------------------------------------------
create or replace function private.is_approved_role(p_caller_id uuid, p_role text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_caller_id and status = 'approved' and role = p_role
  );
$$;

-- 4. create_unit_transfer: only creates the request, no longer posts to ledgers ---
drop function if exists public.create_unit_transfer(uuid, numeric, date, text, uuid, text, text);

create or replace function public.create_unit_transfer(
  p_unit_id uuid,
  p_amount numeric,
  p_tanggal date,
  p_description text,
  p_created_by uuid,
  p_bank_name text default null,
  p_account_number text default null
)
returns public.pengeluaran_unit
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pengeluaran public.pengeluaran_unit;
begin
  if not private.is_admin_caller(p_created_by) then
    raise exception 'Not authorized: caller is not an approved operator';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  if p_unit_id is null then
    raise exception 'Target unit is required';
  end if;

  insert into public.pengeluaran_unit (unit_id, amount, tanggal, description, created_by, bank_name, account_number, status)
  values (p_unit_id, p_amount, coalesce(p_tanggal, current_date), p_description, p_created_by, p_bank_name, p_account_number, 'menunggu_bendahara')
  returning * into v_pengeluaran;

  return v_pengeluaran;
end;
$$;

grant execute on function public.create_unit_transfer(uuid, numeric, date, text, uuid, text, text) to anon, authenticated;

-- 5. Bendahara approval: menunggu_bendahara -> menunggu_direktur -----------------
create or replace function public.bendahara_approve_transfer(p_caller_id uuid, p_transfer_id uuid)
returns public.pengeluaran_unit
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pengeluaran_unit;
begin
  if not private.is_approved_role(p_caller_id, 'bendahara') then
    raise exception 'Not authorized: caller is not an approved Bendahara';
  end if;

  select * into v_row from public.pengeluaran_unit where id = p_transfer_id;
  if v_row.id is null then
    raise exception 'Transfer not found';
  end if;
  if v_row.status <> 'menunggu_bendahara' then
    raise exception 'Transfer is not waiting for Bendahara approval';
  end if;

  update public.pengeluaran_unit
  set status = 'menunggu_direktur', bendahara_id = p_caller_id, bendahara_approved_at = now()
  where id = p_transfer_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.bendahara_approve_transfer(uuid, uuid) to anon, authenticated;

-- 6. Direktur approval: menunggu_direktur -> approved, and THIS is when the ledgers post --
create or replace function public.direktur_approve_transfer(p_caller_id uuid, p_transfer_id uuid)
returns public.pengeluaran_unit
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pengeluaran_unit;
begin
  if not private.is_approved_role(p_caller_id, 'direktur') then
    raise exception 'Not authorized: caller is not an approved Direktur';
  end if;

  select * into v_row from public.pengeluaran_unit where id = p_transfer_id;
  if v_row.id is null then
    raise exception 'Transfer not found';
  end if;
  if v_row.status <> 'menunggu_direktur' then
    raise exception 'Transfer is not waiting for Direktur approval';
  end if;

  update public.pengeluaran_unit
  set status = 'approved', direktur_id = p_caller_id, direktur_approved_at = now()
  where id = p_transfer_id
  returning * into v_row;

  insert into public.kas_umum_kredit (tanggal, uraian, kategori, jumlah, unit_id, created_by, pengeluaran_unit_id)
  values (v_row.tanggal, coalesce(v_row.description, 'Transfer ke unit'), 'Transfer ke Unit', v_row.amount, null, v_row.created_by, v_row.id);

  insert into public.ledger_debit (tanggal, uraian, sumber, jumlah, unit_id, created_by, pengeluaran_unit_id)
  values (v_row.tanggal, coalesce(v_row.description, 'Transfer dari BUMDes'), 'Transfer dari BUMDes', v_row.amount, v_row.unit_id, v_row.created_by, v_row.id);

  return v_row;
end;
$$;

grant execute on function public.direktur_approve_transfer(uuid, uuid) to anon, authenticated;

-- 7. Reject at whichever stage is currently pending -------------------------------
create or replace function public.reject_transfer(p_caller_id uuid, p_transfer_id uuid, p_reason text default null)
returns public.pengeluaran_unit
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pengeluaran_unit;
  v_role text;
begin
  select * into v_row from public.pengeluaran_unit where id = p_transfer_id;
  if v_row.id is null then
    raise exception 'Transfer not found';
  end if;

  if v_row.status = 'menunggu_bendahara' and private.is_approved_role(p_caller_id, 'bendahara') then
    v_role := 'bendahara';
  elsif v_row.status = 'menunggu_direktur' and private.is_approved_role(p_caller_id, 'direktur') then
    v_role := 'direktur';
  else
    raise exception 'Not authorized to reject this transfer at its current stage';
  end if;

  update public.pengeluaran_unit
  set status = 'ditolak', rejected_by = p_caller_id, rejected_at = now(), rejected_role = v_role, rejection_reason = p_reason
  where id = p_transfer_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.reject_transfer(uuid, uuid, text) to anon, authenticated;

-- 8. list_pengeluaran_unit: Bendahara/Direktur can see all requests, plus join
-- approver names so the invoice can render the Bendahara/Direktur signatures.
drop function if exists public.list_pengeluaran_unit(uuid, uuid);

create or replace function public.list_pengeluaran_unit(p_caller_id uuid, p_unit_id uuid default null)
returns table (
  id uuid,
  unit_id uuid,
  amount numeric,
  tanggal date,
  description text,
  invoice_url text,
  created_by uuid,
  created_at timestamptz,
  metadata jsonb,
  bank_name text,
  account_number text,
  status text,
  bendahara_id uuid,
  bendahara_approved_at timestamptz,
  direktur_id uuid,
  direktur_approved_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  rejected_role text,
  rejection_reason text,
  bendahara_name text,
  direktur_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.is_admin_caller(p_caller_id)
     or private.is_approved_role(p_caller_id, 'bendahara')
     or private.is_approved_role(p_caller_id, 'direktur') then
    return query
      select p.*, b.full_name, d.full_name
      from public.pengeluaran_unit p
      left join public.profiles b on b.id = p.bendahara_id
      left join public.profiles d on d.id = p.direktur_id
      where p_unit_id is null or p.unit_id = p_unit_id
      order by p.tanggal desc;
  elsif p_unit_id is not null and exists (
    select 1 from public.profiles
    where id = p_caller_id and unit_id = p_unit_id and status = 'approved'
  ) then
    return query
      select p.*, b.full_name, d.full_name
      from public.pengeluaran_unit p
      left join public.profiles b on b.id = p.bendahara_id
      left join public.profiles d on d.id = p.direktur_id
      where p.unit_id = p_unit_id
      order by p.tanggal desc;
  else
    raise exception 'Not authorized';
  end if;
end;
$$;

grant execute on function public.list_pengeluaran_unit(uuid, uuid) to anon, authenticated;

commit;
