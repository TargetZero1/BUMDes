-- Root cause of "permission denied for schema private" across nearly every table:
-- public.can_access_unit() and public.is_super_admin() are SECURITY INVOKER wrappers
-- that call private.can_access_unit()/private.is_super_admin() internally. Since they
-- run as the CALLER (not the function owner), the caller needs schema-level USAGE on
-- `private` to even resolve the call -- EXECUTE on the individual functions alone
-- (already granted) is not sufficient. This affected virtually every RLS policy that
-- references is_super_admin()/can_access_unit(), i.e. almost all of them.
-- Safe to grant broadly: these are STABLE, read-only privilege-check functions:
-- for anon (no auth.uid()), they will simply evaluate to false, not leak anything.
GRANT USAGE ON SCHEMA private TO authenticated, anon;
