import { supabase } from './supabaseClient';

export function subscribeTableRealtime(channelName, table, filter, onChange) {
  let builder = supabase.channel(channelName).on(
    'postgres_changes',
    filter ? { event: '*', schema: 'public', table, filter } : { event: '*', schema: 'public', table },
    onChange
  );
  const channel = builder.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeGudangRealtime(unitId, onChange) {
  if (!unitId) return () => {};
  return subscribeTableRealtime(`gudang-realtime-${unitId}`, 'gudang', `unit_id=eq.${unitId}`, onChange);
}
