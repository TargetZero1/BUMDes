-- Follow-up to emergency_reenable_rls_and_lock_anon_rpcs: the prior REVOKE FROM anon
-- was a no-op because these functions grant EXECUTE to PUBLIC, which anon inherits
-- implicitly regardless of any explicit per-role revoke. Must revoke from PUBLIC
-- directly, then re-grant to authenticated only (db_sign_in stays open — it's the
-- login RPC and must remain callable pre-auth).

REVOKE EXECUTE ON FUNCTION public.approve_unit_request(uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bendahara_approve_transfer(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_unit_transfer(uuid, numeric, date, text, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.direktur_approve_transfer(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_pengeluaran_unit(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_transfer(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_unit_request(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.approve_unit_request(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bendahara_approve_transfer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_unit_transfer(uuid, numeric, date, text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.direktur_approve_transfer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_pengeluaran_unit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_transfer(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_unit_request(uuid, uuid) TO authenticated;
