-- Root cause: these RPCs took a client-supplied p_caller_id/p_created_by and trusted it
-- for authorization (is_admin_caller/is_approved_role just check profiles.id = <param>).
-- Any authenticated user could pass someone else's profile id and be treated as that
-- person -- e.g. a 'staff' account calling approve_unit_request with an operator's known
-- profile id would be granted operator-level authorization. Fix: derive the caller's own
-- profile id server-side from the real Supabase session (auth.uid() -> profiles.auth_user_id),
-- never from a client-supplied parameter.

create or replace function private.current_profile_id()
returns uuid
language sql
stable
set search_path to 'public'
as $$
  select id from public.profiles where auth_user_id = (select auth.uid());
$$;

-- approve_unit_request: drop p_caller_id, resolve caller server-side
drop function public.approve_unit_request(uuid, uuid, text, text);
create or replace function public.approve_unit_request(p_profile_id uuid, p_unit_name text default null, p_unit_type text default null)
returns profiles
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := private.current_profile_id();
  v_profile public.profiles;
  v_unit_id uuid;
  v_name text;
  v_type text;
begin
  if not private.is_admin_caller(v_caller_id) then
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
$function$;
grant execute on function public.approve_unit_request(uuid, text, text) to authenticated, service_role;

-- reject_unit_request: drop p_caller_id
drop function public.reject_unit_request(uuid, uuid);
create or replace function public.reject_unit_request(p_profile_id uuid)
returns profiles
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := private.current_profile_id();
  v_profile public.profiles;
begin
  if not private.is_admin_caller(v_caller_id) then
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
$function$;
grant execute on function public.reject_unit_request(uuid) to authenticated, service_role;

-- list_pengeluaran_unit: drop p_caller_id
drop function public.list_pengeluaran_unit(uuid, uuid);
create or replace function public.list_pengeluaran_unit(p_unit_id uuid default null)
returns table(id uuid, unit_id uuid, amount numeric, tanggal date, description text, invoice_url text, created_by uuid, created_at timestamp with time zone, metadata jsonb, bank_name text, account_number text, status text, bendahara_id uuid, bendahara_approved_at timestamp with time zone, direktur_id uuid, direktur_approved_at timestamp with time zone, rejected_by uuid, rejected_at timestamp with time zone, rejected_role text, rejection_reason text, bendahara_name text, direktur_name text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := private.current_profile_id();
begin
  if private.is_admin_caller(v_caller_id)
     or private.is_approved_role(v_caller_id, 'bendahara')
     or private.is_approved_role(v_caller_id, 'direktur') then
    return query
      select p.*, b.full_name, d.full_name
      from public.pengeluaran_unit p
      left join public.profiles b on b.id = p.bendahara_id
      left join public.profiles d on d.id = p.direktur_id
      where p_unit_id is null or p.unit_id = p_unit_id
      order by p.tanggal desc;
  elsif p_unit_id is not null and exists (
    select 1 from public.profiles
    where id = v_caller_id and unit_id = p_unit_id and status = 'approved'
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
$function$;
grant execute on function public.list_pengeluaran_unit(uuid) to authenticated, service_role;

-- create_unit_transfer: drop p_created_by
drop function public.create_unit_transfer(uuid, numeric, date, text, uuid, text, text);
create or replace function public.create_unit_transfer(p_unit_id uuid, p_amount numeric, p_tanggal date, p_description text, p_bank_name text default null, p_account_number text default null)
returns pengeluaran_unit
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := private.current_profile_id();
  v_pengeluaran public.pengeluaran_unit;
begin
  if not private.is_admin_caller(v_caller_id) then
    raise exception 'Not authorized: caller is not an approved operator';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  if p_unit_id is null then
    raise exception 'Target unit is required';
  end if;

  insert into public.pengeluaran_unit (unit_id, amount, tanggal, description, created_by, bank_name, account_number, status)
  values (p_unit_id, p_amount, coalesce(p_tanggal, current_date), p_description, v_caller_id, p_bank_name, p_account_number, 'menunggu_bendahara')
  returning * into v_pengeluaran;

  return v_pengeluaran;
end;
$function$;
grant execute on function public.create_unit_transfer(uuid, numeric, date, text, text, text) to authenticated, service_role;

-- bendahara_approve_transfer: drop p_caller_id
drop function public.bendahara_approve_transfer(uuid, uuid);
create or replace function public.bendahara_approve_transfer(p_transfer_id uuid)
returns pengeluaran_unit
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := private.current_profile_id();
  v_row public.pengeluaran_unit;
begin
  if not private.is_approved_role(v_caller_id, 'bendahara') then
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
  set status = 'menunggu_direktur', bendahara_id = v_caller_id, bendahara_approved_at = now()
  where id = p_transfer_id
  returning * into v_row;

  return v_row;
end;
$function$;
grant execute on function public.bendahara_approve_transfer(uuid) to authenticated, service_role;

-- direktur_approve_transfer: drop p_caller_id
drop function public.direktur_approve_transfer(uuid, uuid);
create or replace function public.direktur_approve_transfer(p_transfer_id uuid)
returns pengeluaran_unit
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := private.current_profile_id();
  v_row public.pengeluaran_unit;
begin
  if not private.is_approved_role(v_caller_id, 'direktur') then
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
  set status = 'approved', direktur_id = v_caller_id, direktur_approved_at = now()
  where id = p_transfer_id
  returning * into v_row;

  insert into public.kas_umum_kredit (tanggal, uraian, kategori, jumlah, unit_id, created_by, pengeluaran_unit_id)
  values (v_row.tanggal, coalesce(v_row.description, 'Transfer ke unit'), 'Transfer ke Unit', v_row.amount, null, v_row.created_by, v_row.id);

  insert into public.ledger_debit (tanggal, uraian, sumber, jumlah, unit_id, created_by, pengeluaran_unit_id)
  values (v_row.tanggal, coalesce(v_row.description, 'Transfer dari BUMDes'), 'Transfer dari BUMDes', v_row.amount, v_row.unit_id, v_row.created_by, v_row.id);

  return v_row;
end;
$function$;
grant execute on function public.direktur_approve_transfer(uuid) to authenticated, service_role;

-- reject_transfer: drop p_caller_id
drop function public.reject_transfer(uuid, uuid, text);
create or replace function public.reject_transfer(p_transfer_id uuid, p_reason text default null)
returns pengeluaran_unit
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid := private.current_profile_id();
  v_row public.pengeluaran_unit;
  v_role text;
begin
  select * into v_row from public.pengeluaran_unit where id = p_transfer_id;
  if v_row.id is null then
    raise exception 'Transfer not found';
  end if;

  if v_row.status = 'menunggu_bendahara' and private.is_approved_role(v_caller_id, 'bendahara') then
    v_role := 'bendahara';
  elsif v_row.status = 'menunggu_direktur' and private.is_approved_role(v_caller_id, 'direktur') then
    v_role := 'direktur';
  else
    raise exception 'Not authorized to reject this transfer at its current stage';
  end if;

  update public.pengeluaran_unit
  set status = 'ditolak', rejected_by = v_caller_id, rejected_at = now(), rejected_role = v_role, rejection_reason = p_reason
  where id = p_transfer_id
  returning * into v_row;

  return v_row;
end;
$function$;
grant execute on function public.reject_transfer(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
