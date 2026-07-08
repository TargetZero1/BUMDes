-- Create a secure server-side RPC function for DB auth sign-in.
-- This avoids exposing password_hash to anon/public clients.

begin;

create or replace function public.db_sign_in(p_phone text, p_password_hash text)
returns table(
  id uuid,
  phone text,
  role text,
  unit_id uuid,
  status text,
  can_view_all boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select id, phone, role, unit_id, status, can_view_all
  from public.profiles
  where phone = p_phone
    and password_hash = p_password_hash
    and status = 'approved'
  limit 1;
$$;

grant execute on function public.db_sign_in(text, text) to anon;

commit;
