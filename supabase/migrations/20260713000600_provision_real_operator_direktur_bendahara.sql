-- Replace placeholder Direktur/Bendahara profiles with the real people, and
-- add the two real operator accounts. Updating the placeholder rows in place
-- (rather than inserting new ones) preserves any existing pengeluaran_unit
-- .bendahara_id/.direktur_id references, so past + future invoices pick up
-- the correct signer name automatically.
--
-- NOTE: initial passwords below are seed values only -- users should change
-- them via their profile settings after first login.

update public.profiles
set full_name = 'Rokhim',
    phone = '+6282132501924',
    password_hash = encode(digest('RokhimAmanah91!', 'sha256'), 'hex')
where role = 'direktur' and full_name = 'Direktur BUMDes';

update public.profiles
set full_name = 'Bambang Sulistiyo',
    phone = '+6285234644175',
    password_hash = encode(digest('BambangKas63!', 'sha256'), 'hex')
where role = 'bendahara' and full_name = 'Bendahara BUMDes';

insert into public.profiles (full_name, phone, role, status, password_hash)
values
  ('Shefi Yanti Dwi Putri', '+6289656589449', 'operator', 'approved', encode(digest('ShefiPadi72!', 'sha256'), 'hex')),
  ('Muhammad Ibnu Alwan', '+628885826986', 'operator', 'approved', encode(digest('IbnuLadang84!', 'sha256'), 'hex'));

commit;
