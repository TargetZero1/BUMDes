import { useEffect, useState } from 'react';
import { sbSelect } from '../lib/api';
import { formatRupiah } from '../lib/formatters';

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
    const html = `
      <html>
        <head>
          <title>Laporan ${unit.unit_name}</title>
        </head>
        <body>
          <h2>${unit.unit_name} — Ringkasan</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr><th>Item</th><th>Nilai</th></tr>
            <tr><td>Pemasukan Umum</td><td>${formatRupiah(unit.pemasukan_umum)}</td></tr>
            <tr><td>Pengeluaran Umum</td><td>${formatRupiah(unit.pengeluaran_umum)}</td></tr>
            <tr><td>Pemasukan Petelur</td><td>${formatRupiah(unit.pemasukan_petelur)}</td></tr>
            <tr><td>Pengeluaran Petelur</td><td>${formatRupiah(unit.pengeluaran_petelur)}</td></tr>
            <tr><td>Saldo Gudang</td><td>${formatRupiah(unit.saldo_gudang)}</td></tr>
          </table>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800">Operator Dashboard</h2>
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
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stone-800">{unit.unit_name}</div>
                  <div className="text-xs text-stone-500">Terakhir: {unit.last_updated ? new Date(unit.last_updated).toLocaleString() : '-'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">Bersih: {formatRupiah((unit.pemasukan_umum || 0) + (unit.pemasukan_petelur || 0) - ((unit.pengeluaran_umum || 0) + (unit.pengeluaran_petelur || 0)) )}</div>
                  <button onClick={() => exportPDF(unit)} className="mt-2 inline-block rounded bg-emerald-700 px-3 py-1 text-xs text-white">Export PDF</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
