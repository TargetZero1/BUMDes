-- Add pending unit-request fields to profiles (matches what dbSignUp already sends)

alter table public.profiles add column if not exists requested_unit_id uuid references public.units(id);
alter table public.profiles add column if not exists requested_unit_name text;
alter table public.profiles add column if not exists requested_unit_type text;
