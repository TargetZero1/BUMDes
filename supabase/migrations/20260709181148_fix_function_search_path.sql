alter function private.auto_confirm_email() set search_path = '';
alter function private.is_super_admin(uuid) set search_path = '';
alter function private.is_operator(uuid) set search_path = '';
alter function private.can_access_unit(uuid, uuid) set search_path = '';
alter function private.on_transfer_approved() set search_path = '';
