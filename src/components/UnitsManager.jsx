import { useEffect, useState } from 'react';
import { sbSelect, sbInsert, sbPatch, sbRpc } from '../lib/api';
import { Plus, Check, X, Store } from 'lucide-react';

export default function UnitsManager({ session }) {
  const [units, setUnits] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [unitRows, pendingRows] = await Promise.all([
        sbSelect('units', { accessToken: session?.access_token, query: 'select=*&order=name.asc' }),
        sbSelect('profiles', {
          accessToken: session?.access_token,
          query: 'select=id,full_name,phone,role,status,unit_id,requested_unit_id,requested_unit_name,requested_unit_type&status=eq.pending&order=created_at.asc',
        }),
      ]);
      setUnits(unitRows || []);
      setPending(pendingRows || []);
    } catch (err) {
      console.error('Failed load units/pending', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session?.access_token]);

  const handleCreate = async () => {
    if (!name.trim() || !code.trim()) return;
    try {
      await sbInsert('units', [{ name: name.trim(), code: code.trim(), type: type.trim() || null, is_active: true }], { accessToken: session?.access_token });
      setName(''); setCode(''); setType('');
      await load();
    } catch (err) { console.error(err); }
  };

  const toggleActive = async (id, current) => {
    try {
      await sbPatch('units', id, { is_active: !current }, { accessToken: session?.access_token });
      await load();
    } catch (err) { console.error(err); }
  };

  const unitNameFor = (unitId) => units.find((u) => u.id === unitId)?.name || unitId;

  const draftFor = (profile) => drafts[profile.id] ?? {
    name: profile.requested_unit_name || '',
    type: profile.requested_unit_type || '',
  };

  const updateDraft = (profileId, patch) => {
    setDrafts((current) => ({ ...current, [profileId]: { ...draftFor({ id: profileId }), ...current[profileId], ...patch } }));
  };

  const approve = async (profile) => {
    setBusyId(profile.id);
    try {
      const draft = draftFor(profile);
      await sbRpc('approve_unit_request', {
        p_caller_id: session?.user?.id || null,
        p_profile_id: profile.id,
        p_unit_name: profile.requested_unit_id ? null : draft.name,
        p_unit_type: profile.requested_unit_id ? null : draft.type,
      }, { accessToken: session?.access_token });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (profile) => {
    setBusyId(profile.id);
    try {
      await sbRpc('reject_unit_request', { p_caller_id: session?.user?.id || null, p_profile_id: profile.id }, { accessToken: session?.access_token });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>Manage Units</h2>
        <p className="text-sm text-stone-500">Buat unit baru, konfirmasi pendaftaran, dan aktifkan/nonaktifkan unit.</p>
      </div>

      <div className="mb-8">
        <h3 className="mb-3 font-semibold text-stone-700">Menunggu Konfirmasi ({pending.length})</h3>
        {loading ? (
          <div className="text-sm text-stone-400">Memuat…</div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm italic text-stone-400">Tidak ada pendaftaran menunggu.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((profile) => {
              const draft = draftFor(profile);
              const isExisting = Boolean(profile.requested_unit_id);
              return (
                <div key={profile.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-stone-800">{profile.full_name || 'Tanpa nama'}</div>
                      <div className="text-xs text-stone-500">{profile.phone} • Role diminta: {profile.role}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approve(profile)}
                        disabled={busyId === profile.id}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => reject(profile)}
                        disabled={busyId === profile.id}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" /> Tolak
                      </button>
                    </div>
                  </div>

                  {isExisting ? (
                    <div className="text-sm text-stone-700">Meminta akses ke unit: <span className="font-semibold">{unitNameFor(profile.requested_unit_id)}</span></div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Nama Unit Baru</label>
                        <input
                          value={draft.name}
                          onChange={(event) => updateDraft(profile.id, { name: event.target.value })}
                          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Tipe Unit</label>
                        <input
                          value={draft.type}
                          onChange={(event) => updateDraft(profile.id, { type: event.target.value })}
                          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama unit" className="rounded-lg border px-3 py-2" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kode (unik)" className="rounded-lg border px-3 py-2" />
        <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Tipe (opsional)" className="rounded-lg border px-3 py-2" />
        <button onClick={handleCreate} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800"><Plus className="h-4 w-4" />Buat Unit</button>
      </div>

      {loading ? <div className="text-sm text-stone-400">Loading…</div> : (
        <div className="space-y-2">
          {units.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
              <div className="flex items-center gap-2">
                {u.is_toko && <Store className="h-4 w-4 text-amber-600" title="Toko Bumdes" />}
                <div>
                  <div className="font-semibold text-stone-800">{u.name}</div>
                  <div className="text-xs text-stone-500">
                    {u.code} {u.type ? `• ${u.type}` : ''} — {u.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(u.id, u.is_active)} className="rounded border px-2 py-1 text-sm">{u.is_active ? 'Disable' : 'Enable'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
