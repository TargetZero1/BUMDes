-- db-sign-in creates a placeholder Supabase Auth user for a profile on its
-- first login, then links it via profiles.auth_user_id. If that link write
-- ever fails after the auth user was already created (e.g. a mid-request
-- crash), every future login retried createUser with the same placeholder
-- email and GoTrue correctly rejected it as a duplicate -- surfacing a raw
-- "email already registered" error on the phone/password login screen with
-- no way to recover. This lets the edge function look up and re-link the
-- orphaned auth user instead of failing outright.
create or replace function public.find_auth_user_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from auth.users where email = p_email limit 1;
$$;

grant execute on function public.find_auth_user_by_email(text) to anon, authenticated, service_role;
