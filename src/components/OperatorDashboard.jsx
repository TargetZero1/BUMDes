import { useEffect, useState } from 'react';
import { FileDown, Store } from 'lucide-react';
import { sbRpc } from '../lib/api';
import { formatRupiah } from '../lib/formatters';

export default function OperatorDashboard({ session }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;
    setLoading(true);
    sbRpc('get_unit_summary', {}, { accessToken: session.access_token })
      .then((data) => { if (active) setRows(data || []); })
      .catch(() => { if (active) setRows([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session]);

  const exportPDF = async (unit) => {
    const { generateUnitOverviewPDF } = await import('../lib/invoice');
    generateUnitOverviewPDF(unit, session?.user?.full_name || 'Operator BUMDes');
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text">Overview Semua Unit</h2>
        <p className="text-sm text-text-muted">Ringkasan per unit — read-only</p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-text-muted">Memuat data…</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-muted">Tidak ada unit aktif.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((unit) => (
            <div key={unit.unit_id} className="rounded-2xl border border-border-subtle bg-surface-2 p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {unit.is_toko && <Store className="h-4 w-4 text-gold-600 dark:text-gold-400" title="Toko BUMDes" />}
                  <div>
                    <div className="font-semibold text-text">
                      {unit.unit_name}
                      {unit.unit_type && <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs font-normal text-text-muted">{unit.unit_type}</span>}
                    </div>
                    <div className="text-xs text-text-muted">
                      Saldo Kas: {formatRupiah((unit.pemasukan_unit || 0) - (unit.pengeluaran_unit || 0))} • Nilai Stok: {formatRupiah(unit.nilai_gudang)}
                    </div>
                    <div className="text-xs text-text-muted">Terakhir: {unit.last_updated ? new Date(unit.last_updated).toLocaleString() : '-'}</div>
                  </div>
                </div>
                <button onClick={() => exportPDF(unit)} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-2">
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
