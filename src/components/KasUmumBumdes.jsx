import { useMemo, useState } from 'react';
import { Landmark, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import EntryForm from './EntryForm';
import StatCard from './StatCard';
import TxTable from './TxTable';
import { SUMBER_UMUM, KATEGORI_UMUM } from '../lib/constants';
import { computeConsolidatedRingkasan } from '../lib/analytics';
import { formatRupiah, formatTanggal, sumBy } from '../lib/formatters';

const CENTRAL_SOURCE = 'Kas Umum BUMDes';

export default function KasUmumBumdes({ units, kasUmumEntries, allUnitsLedger, onAddDebit, onDeleteDebit, onAddKredit, onDeleteKredit }) {
  const [filterSource, setFilterSource] = useState('all');
  const [filterTipe, setFilterTipe] = useState('all');

  const unitNameFor = (unitId) => units.find((unit) => unit.id === unitId)?.name || 'Unit';

  const consolidated = computeConsolidatedRingkasan(kasUmumEntries.debit, kasUmumEntries.kredit, allUnitsLedger.debit, allUnitsLedger.kredit);

  const allTransactions = useMemo(() => {
    const rows = [
      ...kasUmumEntries.debit.map((entry) => ({ ...entry, source: CENTRAL_SOURCE, sourceId: 'central', tipe: 'Pemasukan', label: entry.sumber })),
      ...kasUmumEntries.kredit.map((entry) => ({ ...entry, source: CENTRAL_SOURCE, sourceId: 'central', tipe: 'Pengeluaran', label: entry.kategori })),
      ...allUnitsLedger.debit.map((entry) => ({ ...entry, source: unitNameFor(entry.unitId), sourceId: entry.unitId, tipe: 'Pemasukan', label: entry.sumber })),
      ...allUnitsLedger.kredit.map((entry) => ({ ...entry, source: unitNameFor(entry.unitId), sourceId: entry.unitId, tipe: 'Pengeluaran', label: entry.kategori })),
    ];
    return rows.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  }, [kasUmumEntries, allUnitsLedger, units]);

  const filteredTransactions = allTransactions.filter((row) => {
    if (filterSource !== 'all' && row.sourceId !== filterSource) return false;
    if (filterTipe !== 'all' && row.tipe !== filterTipe) return false;
    return true;
  });

  const perUnitBreakdown = useMemo(() => {
    const centralRow = {
      key: 'central',
      name: CENTRAL_SOURCE,
      pemasukan: sumBy(kasUmumEntries.debit, 'jumlah'),
      pengeluaran: sumBy(kasUmumEntries.kredit, 'jumlah'),
    };
    const unitRows = units.map((unit) => ({
      key: unit.id,
      name: unit.name,
      pemasukan: sumBy(allUnitsLedger.debit.filter((e) => e.unitId === unit.id), 'jumlah'),
      pengeluaran: sumBy(allUnitsLedger.kredit.filter((e) => e.unitId === unit.id), 'jumlah'),
    }));
    return [centralRow, ...unitRows].filter((row) => row.pemasukan || row.pengeluaran);
  }, [units, kasUmumEntries, allUnitsLedger]);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
          Kas Umum BUMDes
        </h2>
        <p className="text-sm text-stone-500">Ringkasan keuangan seluruh BUMDes -- kas pusat digabung dengan seluruh unit</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Pemasukan (BUMDes)" value={consolidated.pemasukan} icon={TrendingUp} tone="positive" big />
        <StatCard label="Total Pengeluaran (BUMDes)" value={consolidated.pengeluaran} icon={TrendingDown} tone="negative" big />
        <StatCard label="Keuntungan Bersih (BUMDes)" value={consolidated.bersih} icon={Wallet} tone="highlight" big />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-stone-700">Debit -- Uang Masuk (Kas Pusat)</h3>
          </div>
          <EntryForm
            tone="debit"
            submitLabel="Tambah Pemasukan"
            fields={[
              { key: 'tanggal', label: 'Tanggal', type: 'date', default: new Date().toISOString().slice(0, 10) },
              { key: 'jumlah', label: 'Jumlah (Rp)', type: 'number', step: 1000, placeholder: '0' },
              { key: 'uraian', label: 'Uraian', span2: true, placeholder: 'Contoh: Setoran Toko' },
              { key: 'sumber', label: 'Sumber Pemasukan', type: 'select', options: SUMBER_UMUM, span2: true },
            ]}
            onSubmit={onAddDebit}
          />
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-rose-600" />
            <h3 className="font-semibold text-stone-700">Kredit -- Uang Keluar (Kas Pusat)</h3>
          </div>
          <EntryForm
            tone="kredit"
            submitLabel="Tambah Pengeluaran"
            fields={[
              { key: 'tanggal', label: 'Tanggal', type: 'date', default: new Date().toISOString().slice(0, 10) },
              { key: 'jumlah', label: 'Jumlah (Rp)', type: 'number', step: 1000, placeholder: '0' },
              { key: 'uraian', label: 'Uraian', span2: true, placeholder: 'Contoh: Beli ATK' },
              { key: 'kategori', label: 'Kategori Pengeluaran', type: 'select', options: KATEGORI_UMUM, span2: true },
            ]}
            onSubmit={onAddKredit}
          />
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-emerald-700" />
            <h3 className="font-semibold text-stone-700">Semua Transaksi -- Kas Pusat + Seluruh Unit</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterSource}
              onChange={(event) => setFilterSource(event.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Sumber</option>
              <option value="central">{CENTRAL_SOURCE}</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
            <select
              value={filterTipe}
              onChange={(event) => setFilterTipe(event.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Tipe</option>
              <option value="Pemasukan">Pemasukan</option>
              <option value="Pengeluaran">Pengeluaran</option>
            </select>
          </div>
        </div>
        <TxTable
          rows={filteredTransactions}
          emptyText="Belum ada transaksi."
          renderExtraActions={(row) =>
            row.sourceId === 'central' ? (
              <button
                onClick={() => (row.tipe === 'Pemasukan' ? onDeleteDebit(row.id) : onDeleteKredit(row.id))}
                className="text-stone-300 transition-colors hover:text-rose-600"
                title="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-[0.65rem] text-stone-300" title="Kelola dari halaman Kas Unit">
                --
              </span>
            )
          }
          columns={[
            { key: 'tanggal', label: 'Tgl', render: (row) => formatTanggal(row.tanggal) },
            {
              key: 'source',
              label: 'Sumber',
              render: (row) => (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.sourceId === 'central' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {row.source}
                </span>
              ),
            },
            { key: 'uraian', label: 'Uraian' },
            {
              key: 'tipe',
              label: 'Tipe',
              render: (row) => (
                <span className={row.tipe === 'Pemasukan' ? 'text-emerald-700' : 'text-rose-700'}>{row.tipe}</span>
              ),
            },
            { key: 'label', label: 'Kategori / Sumber' },
            { key: 'jumlah', label: 'Jumlah', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(row.jumlah)}</span> },
          ]}
        />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-stone-700">Ringkasan per Unit</h3>
        {perUnitBreakdown.length === 0 ? (
          <div className="py-6 text-center text-sm italic text-stone-400">Belum ada data.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-100 text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-3 py-2 text-left font-semibold">Unit</th>
                  <th className="px-3 py-2 text-left font-semibold">Pemasukan</th>
                  <th className="px-3 py-2 text-left font-semibold">Pengeluaran</th>
                  <th className="px-3 py-2 text-left font-semibold">Bersih</th>
                </tr>
              </thead>
              <tbody>
                {perUnitBreakdown.map((row) => (
                  <tr key={row.key} className="border-t border-stone-100">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-emerald-700">{formatRupiah(row.pemasukan)}</td>
                    <td className="px-3 py-2 text-rose-700">{formatRupiah(row.pengeluaran)}</td>
                    <td className="px-3 py-2 font-semibold text-amber-700">{formatRupiah(row.pemasukan - row.pengeluaran)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
