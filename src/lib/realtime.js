import { supabase } from './supabaseClient';

export function subscribeGudangRealtime(unitId, onChange) {
  if (!unitId) return () => {};

  const channel = supabase
    .channel(`gudang-realtime-${unitId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'gudang', filter: `unit_id=eq.${unitId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
