create or replace function public.list_pengeluaran_unit(p_caller_id uuid, p_unit_id uuid default null)
returns setof public.pengeluaran_unit
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.is_admin_caller(p_caller_id) then
    return query
      select * from public.pengeluaran_unit
      where p_unit_id is null or unit_id = p_unit_id
      order by tanggal desc;
  elsif p_unit_id is not null and exists (
    select 1 from public.profiles
    where id = p_caller_id and unit_id = p_unit_id and status = 'approved'
  ) then
    return query
      select * from public.pengeluaran_unit
      where unit_id = p_unit_id
      order by tanggal desc;
  else
    raise exception 'Not authorized';
  end if;
end;
$$;

grant execute on function public.list_pengeluaran_unit(uuid, uuid) to anon, authenticated;

revoke select (account_number) on public.pengeluaran_unit from anon, authenticated;
