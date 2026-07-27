-- These functions/policy check `profiles.id = auth.uid()`, which matched the OLD
-- architecture where profiles.id WAS the auth.users id directly. Since that FK was
-- dropped (profiles_id_default_uuid / drop_profiles_id_fkey migrations) and our new
-- db-sign-in Edge Function bridge produces sessions where auth.uid() = auth_user_id
-- (not id), these checks would otherwise never match for any real logged-in user.
-- Scope: only the functions actually referenced by current RLS policies
-- (is_super_admin, is_operator, can_access_unit) and the one policy checking
-- identity directly. NOT touching the p_caller_id/p_uid-parameter RPC functions
-- (create_unit_transfer, approve_unit_request, etc.) -- those trust a
-- client-supplied ID by design and are a separate, deeper issue already flagged
-- in wiki/Projects/BUMDES/Conventions.md, out of scope for this fix.

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and (p.role = 'super_admin' or p.can_view_all)
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_access_unit(target_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select private.is_super_admin()
    or exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.status = 'approved'
        and p.unit_id = target_unit_id
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid() and p.role = 'operator' and p.status = 'approved'
  );
$function$;

DROP POLICY IF EXISTS profiles_read_own_or_super_admin ON public.profiles;
CREATE POLICY profiles_read_own_or_super_admin ON public.profiles
  FOR SELECT
  USING (auth_user_id = auth.uid() OR is_super_admin());
