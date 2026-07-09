import { useEffect, useState } from 'react';
import { FileDown, Store } from 'lucide-react';
import { sbSelect } from '../lib/api';
import { formatRupiah } from '../lib/formatters';
import { generateUnitOverviewPDF } from '../lib/invoice';

export default function OperatorDashboard({ session }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;
    setLoading(true);
    sbSelect('unit_summary', { accessToken: session.access_token, query: 'select=*&order=unit_name.asc' })
      .then((data) => { if (active) setRows(data || []); })
      .catch(() => { if (active) setRows([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session]);

  const exportPDF = (unit) => {
    generateUnitOverviewPDF(unit, session?.user?.full_name || 'Operator BUMDes');
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800">Overview Semua Unit</h2>
        <p className="text-sm text-stone-500">Ringkasan per unit — read-only</p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-stone-400">Memuat data…</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-stone-400">Tidak ada unit aktif.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((unit) => (
            <div key={unit.unit_id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {unit.is_toko && <Store className="h-4 w-4 text-amber-600" title="Toko Bumdes" />}
                  <div>
                    <div className="font-semibold text-stone-800">
                      {unit.unit_name}
                      {unit.unit_type && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-500">{unit.unit_type}</span>}
                    </div>
                    <div className="text-xs text-stone-500">
                      Saldo Kas: {formatRupiah((unit.pemasukan_unit || 0) - (unit.pengeluaran_unit || 0))} • Nilai Stok: {formatRupiah(unit.nilai_gudang)}
                    </div>
                    <div className="text-xs text-stone-400">Terakhir: {unit.last_updated ? new Date(unit.last_updated).toLocaleString() : '-'}</div>
                  </div>
                </div>
                <button onClick={() => exportPDF(unit)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
                  <FileDown className="h-3.5 w-3.5" /> Export PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
