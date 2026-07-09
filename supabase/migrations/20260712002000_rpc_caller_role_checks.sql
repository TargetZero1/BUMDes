-- Critical fix: the write-capable RPCs (approve_unit_request, create_unit_transfer,
-- reject_unit_request) previously trusted whatever profile id the client sent
-- without verifying the caller actually holds an operator/super_admin profile.
-- Since this app's custom auth never mints a real Supabase session, auth.uid()
-- is unusable here -- instead each RPC now takes an explicit p_caller_id and
-- checks it server-side before doing anything.

create or replace function private.is_admin_caller(p_caller_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_caller_id
      and status = 'approved'
      and (role in ('operator', 'super_admin') or can_view_all = true)
  );
$$;

-- approve_unit_request: add p_caller_id, verify before creating/approving.
drop function if exists public.approve_unit_request(uuid, text, text);

create or replace function public.approve_unit_request(
  p_caller_id uuid,
  p_profile_id uuid,
  p_unit_name text default null,
  p_unit_type text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_unit_id uuid;
  v_name text;
  v_type text;
begin
  if not private.is_admin_caller(p_caller_id) then
    raise exception 'Not authorized: caller is not an approved operator';
  end if;

  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if v_profile.requested_unit_id is not null then
    v_unit_id := v_profile.requested_unit_id;
  else
    v_name := coalesce(nullif(trim(p_unit_name), ''), v_profile.requested_unit_name);
    v_type := coalesce(nullif(trim(p_unit_type), ''), v_profile.requested_unit_type);
    if v_name is null then
      raise exception 'No unit name to approve';
    end if;

    insert into public.units (name, code, type, is_active)
    values (
      v_name,
      upper(left(regexp_replace(v_name, '[^a-zA-Z0-9]+', '', 'g'), 10)) || '-' || left(gen_random_uuid()::text, 4),
      v_type,
      true
    )
    returning id into v_unit_id;
  end if;

  update public.profiles
  set status = 'approved',
      unit_id = v_unit_id,
      requested_unit_id = null,
      requested_unit_name = null,
      requested_unit_type = null,
      updated_at = now()
  where id = p_profile_id
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.approve_unit_request(uuid, uuid, text, text) to anon, authenticated;

-- reject_unit_request: add p_caller_id, verify before rejecting.
drop function if exists public.reject_unit_request(uuid);

create or replace function public.reject_unit_request(p_caller_id uuid, p_profile_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not private.is_admin_caller(p_caller_id) then
    raise exception 'Not authorized: caller is not an approved operator';
  end if;

  update public.profiles
  set status = 'disabled',
      requested_unit_id = null,
      requested_unit_name = null,
      requested_unit_type = null,
      updated_at = now()
  where id = p_profile_id
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.reject_unit_request(uuid, uuid) to anon, authenticated;

-- create_unit_transfer: reuse the existing p_created_by as the caller identity.
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

  insert into public.pengeluaran_unit (unit_id, amount, tanggal, description, created_by, bank_name, account_number)
  values (p_unit_id, p_amount, coalesce(p_tanggal, current_date), p_description, p_created_by, p_bank_name, p_account_number)
  returning * into v_pengeluaran;

  insert into public.kas_umum_kredit (tanggal, uraian, kategori, jumlah, unit_id, created_by, pengeluaran_unit_id)
  values (v_pengeluaran.tanggal, coalesce(p_description, 'Transfer ke unit'), 'Transfer ke Unit', p_amount, null, p_created_by, v_pengeluaran.id);

  insert into public.ledger_debit (tanggal, uraian, sumber, jumlah, unit_id, created_by, pengeluaran_unit_id)
  values (v_pengeluaran.tanggal, coalesce(p_description, 'Transfer dari BUMDes'), 'Transfer dari BUMDes', p_amount, p_unit_id, p_created_by, v_pengeluaran.id);

  return v_pengeluaran;
end;
$$;

grant execute on function public.create_unit_transfer(uuid, numeric, date, text, uuid, text, text) to anon, authenticated;
