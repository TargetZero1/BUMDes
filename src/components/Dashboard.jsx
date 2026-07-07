import { AlertTriangle, Banknote, Egg, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from './StatCard';
import { formatQty, formatRupiah } from '../lib/formatters';

export default function Dashboard({ kasUmumTotals, kasPetelurTotals, grandTotals, monthlyData, gudangAlerts }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
          Ringkasan
        </h2>
        <p className="text-sm text-stone-500">Update otomatis dari semua transaksi</p>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Keuntungan Bersih -- Semua Unit</p>
          <p className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {formatRupiah(grandTotals.bersih)}
          </p>
        </div>
        <div className="text-sm opacity-80 sm:max-w-md">
          Gabungan Kas Umum + Kas RKU Petelur. Transfer dana antar unit otomatis kesaring, jadi angkanya gak dobel hitung.
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-700" />
            <h3 className="font-semibold text-stone-700">Kas Umum BUMDes</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <StatCard label="Pemasukan" value={kasUmumTotals.pemasukan} tone="positive" />
            <StatCard label="Pengeluaran" value={kasUmumTotals.pengeluaran} tone="negative" />
            <StatCard label="Bersih" value={kasUmumTotals.bersih} tone="highlight" />
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Egg className="h-4 w-4 text-emerald-700" />
            <h3 className="font-semibold text-stone-700">Kas RKU Unit Petelur</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <StatCard label="Pemasukan" value={kasPetelurTotals.pemasukan} tone="positive" />
            <StatCard label="Pengeluaran" value={kasPetelurTotals.pengeluaran} tone="negative" />
            <StatCard label="Bersih" value={kasPetelurTotals.bersih} tone="highlight" />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4">
        <h3 className="mb-4 font-semibold text-stone-700">Pemasukan vs Pengeluaran per Bulan</h3>
        {monthlyData.length === 0 ? (
          <div className="py-10 text-center text-sm italic text-stone-400">Belum ada transaksi.</div>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Legend />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {gudangAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Stok Menipis</h3>
          </div>
          <ul className="space-y-1 text-sm text-amber-800">
            {gudangAlerts.map((alert) => (
              <li key={alert.barang}>
                -- {alert.barang}: sisa {formatQty(alert.saldo)} {alert.satuan}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
