import { useEffect, useState } from 'react';
import { sbSelect, sbInsert, sbPatch, sbDelete } from '../lib/api';
import { Plus, Trash2, Edit } from 'lucide-react';

export default function UnitsManager({ session }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const rows = await sbSelect('units', { accessToken: session?.access_token, query: 'select=*&order=name.asc' });
      setUnits(rows || []);
    } catch (err) {
      console.error('Failed load units', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session?.access_token]);

  const handleCreate = async () => {
    if (!name.trim() || !code.trim()) return;
    try {
      await sbInsert('units', [{ name: name.trim(), code: code.trim(), is_active: true }], { accessToken: session?.access_token });
      setName(''); setCode('');
      await load();
    } catch (err) { console.error(err); }
  };

  const toggleActive = async (id, current) => {
    try {
      await sbPatch('units', id, { is_active: !current }, { accessToken: session?.access_token });
      await load();
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Manage Units</h2>
        <p className="text-sm text-stone-500">Create, edit, and deactivate units.</p>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Unit name" className="rounded-lg border px-3 py-2" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="code (unique)" className="rounded-lg border px-3 py-2" />
        <button onClick={handleCreate} className="rounded-lg bg-emerald-700 text-white px-3 py-2 flex items-center gap-2"><Plus className="w-4 h-4"/>Create</button>
      </div>

      {loading ? <div className="text-sm text-stone-400">Loading…</div> : (
        <div className="space-y-2">
          {units.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border p-3 bg-white">
              <div>
                <div className="font-semibold">{u.name}</div>
                <div className="text-xs text-stone-500">{u.code} — {u.is_active ? 'Active' : 'Inactive'}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(u.id, u.is_active)} className="text-sm rounded px-2 py-1 border">{u.is_active ? 'Disable' : 'Enable'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
