-- Used by the signup duplicate-phone check so registering with a differently
-- formatted (+62 vs 0-prefixed) but equivalent phone number is caught, same
-- as normalize_phone() already does for login.
create or replace function public.phone_taken(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where private.normalize_phone(phone) = private.normalize_phone(p_phone)
  );
$$;

grant execute on function public.phone_taken(text) to anon, authenticated;

commit;
