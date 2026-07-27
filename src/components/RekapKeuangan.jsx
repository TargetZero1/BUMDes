import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, BarChart3, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart as ReBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from './StatCard';
import TxTable from './TxTable';
import { buildKategoriBreakdown, buildMonthlyRecapForYear, buildYearlyRecap, filterTakTerduga, getAvailableYears } from '../lib/analytics';
import { KATEGORI_TAK_TERDUGA } from '../lib/constants';
import { formatRupiah, formatTanggal } from '../lib/formatters';

function useIsDark() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export default function RekapKeuangan({ debitEntries, kreditEntries, unitLabel, isOperator }) {
  const isDark = useIsDark();
  const availableYears = useMemo(() => getAvailableYears(debitEntries, kreditEntries), [debitEntries, kreditEntries]);
  const [selectedYear, setSelectedYear] = useState(availableYears[0]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) setSelectedYear(availableYears[0]);
  }, [availableYears, selectedYear]);

  const chart = isDark
    ? { grid: '#24344e', axis: '#94a3b8', tooltipBorder: '#24344e', tooltipBg: '#13233a', tooltipText: '#e2e8f0', pemasukan: '#34d399', pengeluaran: '#fb7185' }
    : { grid: '#e2e8f0', axis: '#64748b', tooltipBorder: '#e2e8f0', tooltipBg: '#ffffff', tooltipText: '#0f172a', pemasukan: '#059669', pengeluaran: '#be123c' };

  const yearlyRecap = useMemo(() => buildYearlyRecap(debitEntries, kreditEntries), [debitEntries, kreditEntries]);
  const monthlyRecap = useMemo(() => buildMonthlyRecapForYear(debitEntries, kreditEntries, selectedYear), [debitEntries, kreditEntries, selectedYear]);
  const kategoriBreakdown = useMemo(() => buildKategoriBreakdown(kreditEntries, { year: selectedYear }), [kreditEntries, selectedYear]);
  const takTerdugaEntries = useMemo(() => filterTakTerduga(kreditEntries, { year: selectedYear }), [kreditEntries, selectedYear]);

  const yearTotals = yearlyRecap.find((row) => row.year === selectedYear) || { pemasukan: 0, pengeluaran: 0, bersih: 0 };
  const takTerdugaTotal = kategoriBreakdown.find((row) => row.kategori === KATEGORI_TAK_TERDUGA)?.total || 0;
  const maxKategoriTotal = kategoriBreakdown[0]?.total || 1;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-text" style={{ fontFamily: "'Lora', serif" }}>
            Rekap Keuangan
          </h2>
          <p className="text-sm text-text-muted">
            {isOperator ? 'Rekap tahunan & bulanan seluruh BUMDes' : `Rekap tahunan & bulanan -- ${unitLabel || 'Unit'}`}
          </p>
        </div>
        <select
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-gold-500"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              Tahun {year}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Pemasukan ${selectedYear}`} value={yearTotals.pemasukan} icon={TrendingUp} tone="positive" big />
        <StatCard label={`Pengeluaran ${selectedYear}`} value={yearTotals.pengeluaran} icon={TrendingDown} tone="negative" big />
        <StatCard label={`Saldo Bersih ${selectedYear}`} value={yearTotals.bersih} icon={Wallet} tone="highlight" big />
        <StatCard
          label="Pengeluaran Tak Terduga"
          value={takTerdugaTotal}
          icon={AlertOctagon}
          tone="glass"
          big
          subtext={`${takTerdugaEntries.length} transaksi tahun ${selectedYear}`}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4 shadow-sm ring-1 ring-black/5">
          <h3 className="mb-4 font-semibold text-text">Pemasukan vs Pengeluaran per Bulan -- {selectedYear}</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <ReBarChart data={monthlyRecap} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: chart.axis }} />
                <YAxis tick={{ fontSize: 11, fill: chart.axis }} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                <Tooltip
                  formatter={(value) => formatRupiah(value)}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${chart.tooltipBorder}`, background: chart.tooltipBg, color: chart.tooltipText }}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                />
                <Legend />
                <Bar dataKey="pemasukan" name="Pemasukan" fill={chart.pemasukan} radius={[6, 6, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill={chart.pengeluaran} radius={[6, 6, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4 shadow-sm ring-1 ring-black/5">
          <h3 className="mb-4 font-semibold text-text">Tren Saldo per Tahun</h3>
          {yearlyRecap.length <= 1 ? (
            <div className="py-10 text-center text-sm italic text-text-muted">Butuh data lebih dari 1 tahun untuk lihat tren.</div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={yearlyRecap} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rekapBersihGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chart.pemasukan} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={chart.pemasukan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: chart.axis }} />
                  <YAxis tick={{ fontSize: 11, fill: chart.axis }} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                  <Tooltip
                    formatter={(value) => formatRupiah(value)}
                    contentStyle={{ borderRadius: 12, border: `1px solid ${chart.tooltipBorder}`, background: chart.tooltipBg, color: chart.tooltipText }}
                  />
                  <Area type="monotone" dataKey="bersih" name="Saldo Bersih" stroke={chart.pemasukan} strokeWidth={2.5} fill="url(#rekapBersihGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border-subtle bg-surface-2 p-4 shadow-sm ring-1 ring-black/5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-ink dark:text-gold-400" />
          <h3 className="font-semibold text-text">Pengeluaran per Kategori -- {selectedYear}</h3>
        </div>
        {kategoriBreakdown.length === 0 ? (
          <div className="py-6 text-center text-sm italic text-text-muted">Belum ada pengeluaran tahun ini.</div>
        ) : (
          <div className="space-y-2">
            {kategoriBreakdown.map((row) => {
              const isTakTerduga = row.kategori === KATEGORI_TAK_TERDUGA;
              return (
                <div key={row.kategori} className="flex items-center gap-3">
                  <span className={`w-40 shrink-0 truncate text-sm ${isTakTerduga ? 'font-semibold text-gold-700 dark:text-gold-300' : 'text-text'}`}>
                    {isTakTerduga && <AlertOctagon className="mr-1 inline h-3.5 w-3.5" />}
                    {row.kategori}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, (row.total / maxKategoriTotal) * 100)}%`, backgroundColor: isDark ? '#94a3b8' : '#64748b' }}
                    />
                  </div>
                  <span className="w-32 shrink-0 text-right text-xs font-semibold tabular-nums text-text" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatRupiah(row.total)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gold-500/30 bg-gold-500/10 p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-gold-600 dark:text-gold-400" />
          <h3 className="text-sm font-semibold text-gold-700 dark:text-gold-300">Daftar Pengeluaran Tak Terduga -- {selectedYear}</h3>
        </div>
        <TxTable
          rows={takTerdugaEntries}
          emptyText="Tidak ada pengeluaran tak terduga tahun ini."
          columns={[
            { key: 'tanggal', label: 'Tgl', render: (row) => formatTanggal(row.tanggal) },
            { key: 'uraian', label: 'Uraian' },
            { key: 'jumlah', label: 'Jumlah', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(row.jumlah)}</span> },
          ]}
        />
      </div>
    </div>
  );
}
