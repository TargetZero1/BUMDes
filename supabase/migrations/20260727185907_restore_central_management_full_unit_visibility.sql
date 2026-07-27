-- Clarified with the user: Operator (Sekretaris), Bendahara, and Direktur are
-- the central BUMDes management team and are accountable for the ENTIRE
-- organization's finances (they sign the annual report to the village) --
-- they should see every unit's Kas Unit ledger and Gudang, not just one
-- exempted unit. Only individual unit staff (e.g. the Toko Bumdes shopkeeper,
-- Unit Petelur's own staff) are scoped to just their own unit. This supersedes
-- both scope_unit_privacy_to_toko_bumdes and
-- fix_exempt_unit_to_umum_bumdes_not_toko -- the earlier "exempt one special
-- unit" model was based on a misunderstanding of the real governance
-- structure. The original cross-unit gudang leak this whole thread started
-- from (ANY authenticated user, including other units' staff/viewers, could
-- read any unit's gudang) stays fixed -- that was never in question, only
-- whether the central management trio should also be restricted, and they
-- should not be.
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
    when private.is_admin_caller(private.current_profile_id()) then true
    else false
  end;
$function$;

notify pgrst, 'reload schema';
