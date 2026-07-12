-- Cleanup pass:
-- 1. Drop dead invoices/transfers schema left over from a design that was
--    replaced by pengeluaran_unit (invoices table was never written to by the
--    app -- invoice PDFs are generated client-side and never persisted -- and
--    private.on_transfer_approved() referenced tables/columns that no longer
--    exist, e.g. kas_petelur_debit and kas_umum_debit.transfer_id).
-- 2. Remove ghost profiles with no auth_user_id (unloggable test rows) and
--    orphaned auth.users rows with no matching profiles.auth_user_id
--    (pre-decoupling leftovers from early auth debugging).
-- 3. Document private.current_profile_id(), which existed live but had no
--    migration file, so a fresh `supabase db reset` won't silently break
--    every RPC that depends on it.

drop table if exists public.invoices;
drop function if exists private.on_transfer_approved();
drop function if exists private.backfill_invoice_url_on_invoice_insert();

delete from public.profiles
where auth_user_id is null
  and id in ('85aea37c-2831-46a5-9a71-5e53e91c2730', '81bc8bff-5e81-454b-88e0-cbe6322d9a49');

delete from auth.users
where id in (
  '85aea37c-2831-46a5-9a71-5e53e91c2730', -- superadmin@example.com, no profile
  '2950415f-5e2d-44ba-81a4-96546b0e9544', -- admin@bumdes.id, no profile
  '81bc8bff-5e81-454b-88e0-cbe6322d9a49', -- vijaybrara@gmail.com, no profile
  '33e7aeb7-e0b5-48da-b984-5412a41cdaf2', -- legacy dup of Vijay's phone, superseded by f2155e5d-...
  '05823a0a-bc64-4440-b2c1-6410048b3666'  -- legacy dup of Nini's account, superseded by 1010fe4f-...
)
and not exists (
  select 1 from public.profiles p where p.auth_user_id = auth.users.id
);

create or replace function private.current_profile_id()
returns uuid
language sql
stable
set search_path to 'public'
as $$
  select id from public.profiles where auth_user_id = (select auth.uid());
$$;
