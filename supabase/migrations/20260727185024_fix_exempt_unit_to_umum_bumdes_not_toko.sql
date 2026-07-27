-- Correction: the exempted "central" unit that Operator/Bendahara/Direktur can
-- see across-the-board is Unit Umum BUMDes (code = 'pusat', the main
-- government/village capital unit that funds transfers to every other unit),
-- NOT Toko Bumdes. Toko Bumdes turns out to be held by its own staff, same as
-- any other unit -- it goes back to being fully private, no operator bypass.
create or replace function private.can_access_unit(target_unit_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select case
    when target_unit_id is null then private.is_super_admin()
    when exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.status = 'approved'
        and p.unit_id = target_unit_id
    ) then true
    when private.is_super_admin() and exists (
      select 1 from public.units u where u.id = target_unit_id and u.code = 'pusat'
    ) then true
    else false
  end;
$function$;

notify pgrst, 'reload schema';
