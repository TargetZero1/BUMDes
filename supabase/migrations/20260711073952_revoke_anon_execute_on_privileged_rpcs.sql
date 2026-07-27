revoke execute on function public.approve_unit_request(uuid, text, text) from anon;
revoke execute on function public.reject_unit_request(uuid) from anon;
revoke execute on function public.list_pengeluaran_unit(uuid) from anon;
revoke execute on function public.create_unit_transfer(uuid, numeric, date, text, text, text) from anon;
revoke execute on function public.bendahara_approve_transfer(uuid) from anon;
revoke execute on function public.direktur_approve_transfer(uuid) from anon;
revoke execute on function public.reject_transfer(uuid, text) from anon;
notify pgrst, 'reload schema';
