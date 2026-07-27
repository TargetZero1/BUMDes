create table public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.password_reset_otps enable row level security;

create index idx_password_reset_otps_profile_created
  on public.password_reset_otps(profile_id, created_at desc);

create or replace function public.find_profile_by_phone(p_phone text)
returns table(id uuid, phone text, status text, normalized_phone text)
language sql
stable
security definer
set search_path = public
as $$
  select id, phone, status, private.normalize_phone(phone)
  from public.profiles
  where private.normalize_phone(phone) = private.normalize_phone(p_phone)
    and status = 'approved'
  limit 1;
$$;

grant execute on function public.find_profile_by_phone(text) to service_role;
