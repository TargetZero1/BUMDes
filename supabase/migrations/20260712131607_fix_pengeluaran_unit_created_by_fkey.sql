alter table public.pengeluaran_unit
  drop constraint if exists pengeluaran_unit_created_by_fkey;

alter table public.pengeluaran_unit
  add constraint pengeluaran_unit_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;
