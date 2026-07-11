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
      await sbRpc('reject_unit_request', { p_profile_id: profile.id }, { accessToken: session?.access_token });
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
        <h2 className="text-2xl font-bold text-text" style={{ fontFamily: "'Lora', serif" }}>Manage Units</h2>
        <p className="text-sm text-text-muted">Buat unit baru, konfirmasi pendaftaran, dan aktifkan/nonaktifkan unit.</p>
      </div>

      <div className="mb-8">
        <h3 className="mb-3 font-semibold text-text">Menunggu Konfirmasi ({pending.length})</h3>
        {loading ? (
          <div className="text-sm text-text-muted">Memuat…</div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-2 p-6 text-center text-sm italic text-text-muted">Tidak ada pendaftaran menunggu.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((profile) => {
              const draft = draftFor(profile);
              const isExisting = Boolean(profile.requested_unit_id);
              return (
                <div key={profile.id} className="rounded-2xl border border-gold-500/30 bg-gold-500/10 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-text">{profile.full_name || 'Tanpa nama'}</div>
                      <div className="text-xs text-text-muted">{profile.phone} • Role diminta: {profile.role}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approve(profile)}
                        disabled={busyId === profile.id}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => reject(profile)}
                        disabled={busyId === profile.id}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-surface-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      >
                        <X className="h-3.5 w-3.5" /> Tolak
                      </button>
                    </div>
                  </div>

                  {isExisting ? (
                    <div className="text-sm text-text">Meminta akses ke unit: <span className="font-semibold">{unitNameFor(profile.requested_unit_id)}</span></div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Nama Unit Baru</label>
                        <input
                          value={draft.name}
                          onChange={(event) => updateDraft(profile.id, { name: event.target.value })}
                          className="w-full rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Tipe Unit</label>
                        <input
                          value={draft.type}
                          onChange={(event) => updateDraft(profile.id, { type: event.target.value })}
                          className="w-full rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold-500"
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama unit" className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-text outline-none focus:border-gold-500" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kode (unik)" className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-text outline-none focus:border-gold-500" />
        <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Tipe (opsional)" className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-text outline-none focus:border-gold-500" />
        <button onClick={handleCreate} className="flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-white hover:bg-ink-2"><Plus className="h-4 w-4" />Buat Unit</button>
      </div>

      {loading ? <div className="text-sm text-text-muted">Loading…</div> : (
        <div className="space-y-2">
          {units.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                {u.is_toko && <Store className="h-4 w-4 text-gold-600 dark:text-gold-400" title="Toko Bumdes" />}
                <div>
                  <div className="font-semibold text-text">{u.name}</div>
                  <div className="text-xs text-text-muted">
                    {u.code} {u.type ? `• ${u.type}` : ''} — {u.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(u.id, u.is_active)} className="rounded border border-border-subtle px-2 py-1 text-sm text-text hover:bg-surface">
                  {u.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
