-- create_unit_transfer() inserts private.current_profile_id() (a profiles.id)
-- into pengeluaran_unit.created_by, but that column's FK pointed at
-- auth.users(id) -- the only created_by-style column in the schema with a
-- hard FK, and the only one pointed at the wrong table. Every sibling actor
-- column on this table (bendahara_id, direktur_id, rejected_by) already
-- points at profiles(id); align created_by with them so "Kirim Dana ke Unit"
-- stops failing with "violates foreign key constraint
-- pengeluaran_unit_created_by_fkey".

alter table public.pengeluaran_unit
  drop constraint if exists pengeluaran_unit_created_by_fkey;

alter table public.pengeluaran_unit
  add constraint pengeluaran_unit_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;
