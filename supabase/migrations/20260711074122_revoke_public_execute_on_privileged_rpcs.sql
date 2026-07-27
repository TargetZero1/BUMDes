revoke execute on function public.approve_unit_request(uuid, text, text) from public;
revoke execute on function public.reject_unit_request(uuid) from public;
revoke execute on function public.list_pengeluaran_unit(uuid) from public;
revoke execute on function public.create_unit_transfer(uuid, numeric, date, text, text, text) from public;
revoke execute on function public.bendahara_approve_transfer(uuid) from public;
revoke execute on function public.direktur_approve_transfer(uuid) from public;
revoke execute on function public.reject_transfer(uuid, text) from public;

grant execute on function public.approve_unit_request(uuid, text, text) to authenticated, service_role;
grant execute on function public.reject_unit_request(uuid) to authenticated, service_role;
grant execute on function public.list_pengeluaran_unit(uuid) to authenticated, service_role;
grant execute on function public.create_unit_transfer(uuid, numeric, date, text, text, text) to authenticated, service_role;
grant execute on function public.bendahara_approve_transfer(uuid) to authenticated, service_role;
grant execute on function public.direktur_approve_transfer(uuid) to authenticated, service_role;
grant execute on function public.reject_transfer(uuid, text) to authenticated, service_role;
notify pgrst, 'reload schema';
