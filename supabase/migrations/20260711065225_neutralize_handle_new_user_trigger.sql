-- Cannot ALTER TABLE auth.users directly (owned by supabase_auth_admin, not
-- accessible even to the project owner). Neutralizing via the trigger FUNCTION
-- instead, which we do own. private.handle_new_user() previously auto-inserted a
-- new public.profiles row on every auth.users insert -- designed for the OLD
-- architecture where signup created an auth.users row directly. No current code
-- path does that except our new db-sign-in Edge Function bridge, which links an
-- EXISTING profile via auth_user_id rather than wanting a fresh one auto-created.
-- Confirmed via testing: this trigger created an unwanted duplicate/garbage profile,
-- which is cleaned up in this same migration.
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- No-op: profile creation/linkage is now handled explicitly by the
  -- db-sign-in Edge Function bridge via profiles.auth_user_id, not by this
  -- trigger. Left in place (rather than dropped) in case some other historical
  -- caller depends on the trigger firing without erroring.
  RETURN NEW;
END;
$function$;

DELETE FROM public.profiles WHERE id = 'bbd58bc3-ebe4-4073-92e3-2edbb94b533a';
