
-- Login should accept a phone typed as either +62xxxxxxxxxx or 0xxxxxxxxxx
-- (and tolerate stray spaces/dashes) and still match the stored number,
-- regardless of which format was originally used at signup.
create or replace function private.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when p is null then null
    when regexp_replace(p, '[^0-9+]', '', 'g') like '+62%' then regexp_replace(p, '[^0-9+]', '', 'g')
    when regexp_replace(p, '[^0-9+]', '', 'g') like '62%' then '+' || regexp_replace(p, '[^0-9+]', '', 'g')
    when regexp_replace(p, '[^0-9+]', '', 'g') like '0%' then '+62' || substring(regexp_replace(p, '[^0-9+]', '', 'g') from 2)
    else regexp_replace(p, '[^0-9+]', '', 'g')
  end;
$$;

create or replace function public.db_sign_in(p_phone text, p_password_hash text)
returns table(id uuid, phone text, role text, unit_id uuid, status text, can_view_all boolean)
language sql
stable
security definer
set search_path = 'public'
as $$
  select id, phone, role, unit_id, status, can_view_all
  from public.profiles
  where private.normalize_phone(phone) = private.normalize_phone(p_phone)
    and password_hash = p_password_hash
    and status = 'approved'
  limit 1;
$$;

NOTIFY pgrst, 'reload schema';
