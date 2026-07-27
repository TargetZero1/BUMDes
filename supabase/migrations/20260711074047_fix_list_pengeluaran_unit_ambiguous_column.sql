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
    select 1 from public.profiles pr
    where pr.id = v_caller_id and pr.unit_id = p_unit_id and pr.status = 'approved'
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
notify pgrst, 'reload schema';
