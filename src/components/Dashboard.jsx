import { AlertTriangle, ArrowLeftRight, Banknote, Building2, Wallet } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from './StatCard';
import { formatQty, formatRupiah } from '../lib/formatters';

function monthOverMonthDelta(monthlyData, key) {
  if (!monthlyData || monthlyData.length < 2) return undefined;
  const prev = monthlyData[monthlyData.length - 2][key] || 0;
  const current = monthlyData[monthlyData.length - 1][key] || 0;
  if (!prev) return undefined;
  return ((current - prev) / prev) * 100;
}

export default function Dashboard({ kasUmumTotals, kasUnitTotals, unitLabel, grandTotals, monthlyData, gudangAlerts, unitsCount, isOperator, onQuickAction }) {
  const pemasukanDelta = monthOverMonthDelta(monthlyData, 'pemasukan');
  const pengeluaranDelta = monthOverMonthDelta(monthlyData, 'pengeluaran');

  const cards = [
    kasUmumTotals ? { key: 'umum', icon: Wallet, title: 'Kas Umum BUMDes', totals: kasUmumTotals } : null,
    kasUnitTotals ? { key: 'unit', icon: Banknote, title: `Kas Unit — ${unitLabel || 'Unit'}`, totals: kasUnitTotals } : null,
  ].filter(Boolean);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
          Ringkasan
        </h2>
        <p className="text-sm text-stone-500">Update otomatis dari semua transaksi</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Pemasukan" value={grandTotals.pemasukan} icon={Wallet} tone="positive" big delta={pemasukanDelta} subtext="vs bulan lalu" />
        <StatCard label="Total Pengeluaran" value={grandTotals.pengeluaran} icon={ArrowLeftRight} tone="negative" big delta={pengeluaranDelta} subtext="vs bulan lalu" />
        <StatCard label="Saldo" value={grandTotals.bersih} icon={Banknote} tone="highlight" big subtext={isOperator ? 'Seluruh BUMDes' : unitLabel || 'Unit'} />
        <StatCard label="Unit Aktif" value={unitsCount ?? 0} icon={Building2} tone="neutral" big plain subtext="Terdaftar & aktif" />
      </div>

      {cards.length > 0 && (
        <div className={`mb-6 grid grid-cols-1 gap-4 ${cards.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {cards.map(({ key, icon: Icon, title, totals }) => (
            <div key={key} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-emerald-700" />
                <h3 className="truncate font-semibold text-stone-700">{title}</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <StatCard label="Pemasukan" value={totals.pemasukan} tone="positive" />
                <StatCard label="Pengeluaran" value={totals.pengeluaran} tone="negative" />
                <StatCard label="Saldo" value={totals.bersih} tone="highlight" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-stone-700">Tren Saldo</h3>
          {monthlyData.length === 0 ? (
            <div className="py-10 text-center text-sm italic text-stone-400">Belum ada transaksi.</div>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bersihGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#78716c' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                  <Tooltip formatter={(value) => formatRupiah(value)} contentStyle={{ borderRadius: 12, border: '1px solid #d6d3d1' }} />
                  <Area type="monotone" dataKey="pemasukan" name="Pemasukan" stroke="#059669" strokeWidth={2.5} fill="url(#bersihGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-linear-to-br from-emerald-800 to-emerald-950 p-5 text-white">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              {isOperator ? 'Aksi Cepat' : 'Info'}
            </p>
            <p className="text-lg font-bold" style={{ fontFamily: "'Lora', serif" }}>
              {isOperator ? 'Kirim dana ke unit' : 'Kelola kas & gudang unit kamu'}
            </p>
            <p className="mt-2 text-sm text-emerald-100/80">
              {isOperator ? 'Transfer dari Kas Umum BUMDes ke Kas Unit, langsung tercatat di kedua sisi.' : 'Input transaksi harian dan pantau stok gudang unit kamu di sini.'}
            </p>
          </div>
          {isOperator && (
            <button
              onClick={onQuickAction}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-amber-300"
            >
              <ArrowLeftRight className="h-4 w-4" /> Kirim Dana Sekarang
            </button>
          )}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                <Tooltip formatter={(value) => formatRupiah(value)} contentStyle={{ borderRadius: 12, border: '1px solid #d6d3d1' }} />
                <Legend />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#e11d48" radius={[6, 6, 0, 0]} />
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
