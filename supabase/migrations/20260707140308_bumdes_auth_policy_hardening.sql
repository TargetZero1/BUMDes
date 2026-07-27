begin;

create schema if not exists private;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or p.can_view_all)
  );
$$;

create or replace function private.can_access_unit(target_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_super_admin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.status = 'approved'
        and p.unit_id = target_unit_id
    );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_profile boolean;
  requested_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'viewer');
  requested_unit_id uuid := nullif(new.raw_user_meta_data ->> 'requested_unit_id', '')::uuid;
  full_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1));
begin
  select not exists (select 1 from public.profiles) into first_profile;

  insert into public.profiles (id, full_name, role, unit_id, status, can_view_all)
  values (
    new.id,
    coalesce(full_name, ''),
    case
      when first_profile then 'super_admin'
      when requested_role in ('super_admin', 'unit_admin', 'staff', 'viewer') then requested_role
      else 'viewer'
    end,
    requested_unit_id,
    case when first_profile then 'approved' else 'pending' end,
    first_profile
  );

  return new;
end;
$$;

create or replace function private.touch_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select private.is_super_admin();
$$;

create or replace function public.can_access_unit(target_unit_id uuid)
returns boolean
language sql
stable
as $$
  select private.can_access_unit(target_unit_id);
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row execute function private.touch_profiles_updated_at();

drop policy if exists public_all_gudang on public.gudang;
drop policy if exists public_all_kas_umum_debit on public.kas_umum_debit;
drop policy if exists public_all_kas_umum_kredit on public.kas_umum_kredit;
drop policy if exists public_all_kas_petelur_debit on public.kas_petelur_debit;
drop policy if exists public_all_kas_petelur_kredit on public.kas_petelur_kredit;

commit;
