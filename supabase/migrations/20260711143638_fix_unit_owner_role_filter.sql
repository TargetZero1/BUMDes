
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
  direktur_name text,
  unit_owner_name text
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
      select p.*, b.full_name, d.full_name, o.full_name
      from public.pengeluaran_unit p
      left join public.profiles b on b.id = p.bendahara_id
      left join public.profiles d on d.id = p.direktur_id
      left join lateral (
        select pr.full_name
        from public.profiles pr
        where pr.unit_id = p.unit_id
          and pr.role in ('unit_admin', 'staff')
          and pr.status = 'approved'
        order by pr.role = 'unit_admin' desc, pr.created_at asc
        limit 1
      ) o on true
      where p_unit_id is null or p.unit_id = p_unit_id
      order by p.tanggal desc;
  elsif p_unit_id is not null and exists (
    select 1 from public.profiles
    where id = p_caller_id and unit_id = p_unit_id and status = 'approved'
  ) then
    return query
      select p.*, b.full_name, d.full_name, o.full_name
      from public.pengeluaran_unit p
      left join public.profiles b on b.id = p.bendahara_id
      left join public.profiles d on d.id = p.direktur_id
      left join lateral (
        select pr.full_name
        from public.profiles pr
        where pr.unit_id = p.unit_id
          and pr.role in ('unit_admin', 'staff')
          and pr.status = 'approved'
        order by pr.role = 'unit_admin' desc, pr.created_at asc
        limit 1
      ) o on true
      where p.unit_id = p_unit_id
      order by p.tanggal desc;
  else
    raise exception 'Not authorized';
  end if;
end;
$$;
