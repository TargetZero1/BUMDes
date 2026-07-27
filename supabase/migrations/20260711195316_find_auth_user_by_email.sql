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
