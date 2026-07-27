-- db_sign_in's RETURNS TABLE(id uuid, ...) implicitly creates an OUT
-- parameter variable named `id` in scope for the whole function body, which
-- collided with the bare `id` column reference in the lazy-upgrade UPDATE --
-- every legacy-hash login was throwing a 500 instead of upgrading + succeeding.
-- Caught via testing with a throwaway account before this shipped anywhere.
create or replace function public.db_sign_in(p_phone text, p_password text)
returns table(id uuid, phone text, role text, unit_id uuid, status text, can_view_all boolean)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_row public.profiles;
begin
  select *
  into v_row
  from public.profiles p
  where private.normalize_phone(p.phone) = private.normalize_phone(p_phone)
    and p.status = 'approved'
  limit 1;

  if v_row.id is null or not private.verify_password(p_password, v_row.password_hash) then
    return;
  end if;

  if v_row.password_hash not like '$2%' then
    update public.profiles set password_hash = crypt(p_password, gen_salt('bf')) where public.profiles.id = v_row.id;
  end if;

  return query
    select v_row.id, v_row.phone, v_row.role, v_row.unit_id, v_row.status, v_row.can_view_all;
end;
$function$;

grant execute on function public.db_sign_in(text, text) to anon, authenticated;
notify pgrst, 'reload schema';
