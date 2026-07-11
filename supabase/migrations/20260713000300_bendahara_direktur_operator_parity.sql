-- Bendahara and Direktur get the same access as Operator (view all units, send
-- transfers, approve unit requests, etc.), on top of their own transfer-approval
-- role. This just widens the existing admin-caller check used by every
-- operator-gated RPC.

create or replace function private.is_admin_caller(p_caller_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_caller_id
      and status = 'approved'
      and (role in ('operator', 'super_admin', 'bendahara', 'direktur') or can_view_all = true)
  );
$$;
