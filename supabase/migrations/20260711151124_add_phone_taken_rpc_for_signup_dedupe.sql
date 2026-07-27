
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

NOTIFY pgrst, 'reload schema';
