import { useState } from 'react';
import { LayoutGrid, TrendingDown, TrendingUp } from 'lucide-react';
import EntryForm from './EntryForm';
import RekapList from './RekapList';
import TxTable from './TxTable';
import { formatTanggal, formatRupiah, sumBy } from '../lib/formatters';

export default function LedgerSection({
  title,
  subtitle,
  debitLabel,
  kreditLabel,
  debitOptions,
  kreditOptions,
  debitEntries,
  kreditEntries,
  onAddDebit,
  onDeleteDebit,
  onAddKredit,
  onDeleteKredit,
}) {
  const [view, setView] = useState('both');

  const totalDebit = sumBy(debitEntries, 'jumlah');
  const totalKredit = sumBy(kreditEntries, 'jumlah');
  const bersih = totalDebit - totalKredit;

  const rekapDebit = debitOptions.map((option) => ({
    label: option,
    value: sumBy(debitEntries.filter((entry) => entry.sumber === option), 'jumlah'),
  }));

  const rekapKredit = kreditOptions.map((option) => ({
    label: option,
    value: sumBy(kreditEntries.filter((entry) => entry.kategori === option), 'jumlah'),
  }));

  const showDebit = view === 'both' || view === 'debit';
  const showKredit = view === 'both' || view === 'kredit';

  const viewOptions = [
    { key: 'both', label: 'Semua', icon: LayoutGrid },
    { key: 'debit', label: 'Debit', icon: TrendingUp },
    { key: 'kredit', label: 'Kredit', icon: TrendingDown },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
            {title}
          </h2>
          <p className="text-sm text-stone-500">{subtitle}</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
          {viewOptions.map((option) => {
            const Icon = option.icon;
            const active = view === option.key;
            return (
              <button
                key={option.key}
                onClick={() => setView(option.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`mb-6 grid grid-cols-1 gap-6 ${showDebit && showKredit ? 'lg:grid-cols-2' : ''}`}>
        {showDebit && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-stone-700">Debit -- Uang Masuk</h3>
            </div>
            <EntryForm
              tone="debit"
              submitLabel="Tambah Pemasukan"
              fields={[
                { key: 'tanggal', label: 'Tanggal', type: 'date', default: new Date().toISOString().slice(0, 10) },
                { key: 'jumlah', label: 'Jumlah (Rp)', type: 'number', step: 1000, placeholder: '0' },
                { key: 'uraian', label: 'Uraian', span2: true, placeholder: 'Contoh: Setoran Toko' },
                { key: 'sumber', label: debitLabel, type: 'select', options: debitOptions, span2: true },
              ]}
              onSubmit={onAddDebit}
            />
            <TxTable
              rows={debitEntries}
              emptyText="Belum ada catatan pemasukan."
              onDelete={onDeleteDebit}
              columns={[
                { key: 'tanggal', label: 'Tgl', render: (row) => formatTanggal(row.tanggal) },
                { key: 'uraian', label: 'Uraian' },
                { key: 'sumber', label: debitLabel },
                { key: 'jumlah', label: 'Jumlah', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(row.jumlah)}</span> },
              ]}
            />
          </div>
        )}

        {showKredit && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <h3 className="font-semibold text-stone-700">Kredit -- Uang Keluar</h3>
            </div>
            <EntryForm
              tone="kredit"
              submitLabel="Tambah Pengeluaran"
              fields={[
                { key: 'tanggal', label: 'Tanggal', type: 'date', default: new Date().toISOString().slice(0, 10) },
                { key: 'jumlah', label: 'Jumlah (Rp)', type: 'number', step: 1000, placeholder: '0' },
                { key: 'uraian', label: 'Uraian', span2: true, placeholder: 'Contoh: Beli ATK' },
                { key: 'kategori', label: kreditLabel, type: 'select', options: kreditOptions, span2: true },
              ]}
              onSubmit={onAddKredit}
            />
            <TxTable
              rows={kreditEntries}
              emptyText="Belum ada catatan pengeluaran."
              onDelete={onDeleteKredit}
              columns={[
                { key: 'tanggal', label: 'Tgl', render: (row) => formatTanggal(row.tanggal) },
                { key: 'uraian', label: 'Uraian' },
                { key: 'kategori', label: kreditLabel },
                { key: 'jumlah', label: 'Jumlah', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(row.jumlah)}</span> },
              ]}
            />
          </div>
        )}
      </div>

      <div className={`mb-6 grid grid-cols-1 gap-6 ${showDebit && showKredit ? 'lg:grid-cols-2' : ''}`}>
        {showDebit && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <RekapList title={`Per ${debitLabel}`} items={rekapDebit} tone="debit" />
          </div>
        )}
        {showKredit && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <RekapList title={`Per ${kreditLabel}`} items={rekapKredit} tone="kredit" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-linear-to-r from-emerald-900 to-emerald-800 p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">Tutup Buku</p>
          <p className="text-lg font-bold" style={{ fontFamily: "'Lora', serif" }}>
            Keuntungan Bersih
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-8">
          <div className="min-w-0">
            <p className="text-xs text-emerald-200">Pemasukan</p>
            <p className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatRupiah(totalDebit)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-emerald-200">Pengeluaran</p>
            <p className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatRupiah(totalKredit)}
            </p>
          </div>
          <div className="min-w-0 border-l border-emerald-700 pl-3 sm:pl-6">
            <p className="text-xs text-amber-300">Saldo</p>
            <p className="text-xl font-bold text-amber-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatRupiah(bersih)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
