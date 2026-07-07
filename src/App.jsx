import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Egg, FileSpreadsheet, LayoutDashboard, RefreshCw, Wallet, Warehouse, Wifi, WifiOff } from 'lucide-react';
import Dashboard from './components/Dashboard';
import EmblemBadge from './components/EmblemBadge';
import GudangSection from './components/GudangSection';
import ImportExportSection from './components/ImportExportSection';
import LedgerSection from './components/LedgerSection';
import { KATEGORI_PETELUR, KATEGORI_UMUM, SUMBER_PETELUR, SUMBER_UMUM, TABLE_MAP } from './lib/constants';
import { sbDelete, sbDeleteAll, sbInsert, sbSelect } from './lib/api';
import { buildGudangAlerts, buildMonthlyData, computeRingkasan } from './lib/analytics';
import { emptyData, rowToEntry, rowToGudang } from './lib/data';
import { formatRupiah } from './lib/formatters';

export default function App() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dbOk, setDbOk] = useState(true);
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState('dashboard');

  const fetchAll = useCallback(async () => {
    const [kud, kuk, kpd, kpk, gd] = await Promise.all([
      sbSelect('kas_umum_debit'),
      sbSelect('kas_umum_kredit'),
      sbSelect('kas_petelur_debit'),
      sbSelect('kas_petelur_kredit'),
      sbSelect('gudang'),
    ]);

    setData({
      kasUmum: { debit: kud.map(rowToEntry), kredit: kuk.map(rowToEntry) },
      kasPetelur: { debit: kpd.map(rowToEntry), kredit: kpk.map(rowToEntry) },
      gudang: gd.map(rowToGudang),
    });
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      await fetchAll();
      setDbOk(true);
    } catch (error) {
      setDbOk(false);
      setData(emptyData());
    }
    setLoaded(true);
  }, [fetchAll]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const ringkasan = useMemo(() => (data ? computeRingkasan(data) : null), [data]);
  const monthlyData = useMemo(() => buildMonthlyData(data), [data]);
  const gudangAlerts = useMemo(() => buildGudangAlerts(data), [data]);

  const withErrorHandling = (fn) => async (...args) => {
    try {
      await fn(...args);
      setDbOk(true);
    } catch (error) {
      setDbOk(true);
      setNotice({ type: 'error', text: error.message || 'Ada masalah nyimpen ke database. Coba lagi.' });
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const addEntry = withErrorHandling(async (book, side, entry) => {
    const table = TABLE_MAP[`${book}.${side}`];
    const payload =
      side === 'debit'
        ? { tanggal: entry.tanggal, uraian: entry.uraian, sumber: entry.sumber, jumlah: entry.jumlah }
        : { tanggal: entry.tanggal, uraian: entry.uraian, kategori: entry.kategori, jumlah: entry.jumlah };
    const [row] = await sbInsert(table, [payload]);
    setData((previous) => ({
      ...previous,
      [book]: { ...previous[book], [side]: [...previous[book][side], rowToEntry(row)] },
    }));
  });

  const deleteEntry = withErrorHandling(async (book, side, id) => {
    const table = TABLE_MAP[`${book}.${side}`];
    await sbDelete(table, id);
    setData((previous) => ({
      ...previous,
      [book]: { ...previous[book], [side]: previous[book][side].filter((entry) => entry.id !== id) },
    }));
  });

  const addGudang = withErrorHandling(async (entry) => {
    const payload = { tanggal: entry.tanggal, nama_barang: entry.namaBarang, satuan: entry.satuan, uraian: entry.uraian, masuk: entry.masuk || 0, keluar: entry.keluar || 0 };
    const [row] = await sbInsert('gudang', [payload]);
    setData((previous) => ({ ...previous, gudang: [...previous.gudang, rowToGudang(row)] }));
  });

  const deleteGudang = withErrorHandling(async (id) => {
    await sbDelete('gudang', id);
    setData((previous) => ({ ...previous, gudang: previous.gudang.filter((entry) => entry.id !== id) }));
  });

  const replaceAllData = withErrorHandling(async (next) => {
    await Promise.all([
      sbDeleteAll('kas_umum_debit'),
      sbDeleteAll('kas_umum_kredit'),
      sbDeleteAll('kas_petelur_debit'),
      sbDeleteAll('kas_petelur_kredit'),
      sbDeleteAll('gudang'),
    ]);

    const [kud, kuk, kpd, kpk, gd] = await Promise.all([
      sbInsert('kas_umum_debit', next.kasUmum.debit.map((entry) => ({ tanggal: entry.tanggal, uraian: entry.uraian, sumber: entry.sumber, jumlah: entry.jumlah }))),
      sbInsert('kas_umum_kredit', next.kasUmum.kredit.map((entry) => ({ tanggal: entry.tanggal, uraian: entry.uraian, kategori: entry.kategori, jumlah: entry.jumlah }))),
      sbInsert('kas_petelur_debit', next.kasPetelur.debit.map((entry) => ({ tanggal: entry.tanggal, uraian: entry.uraian, sumber: entry.sumber, jumlah: entry.jumlah }))),
      sbInsert('kas_petelur_kredit', next.kasPetelur.kredit.map((entry) => ({ tanggal: entry.tanggal, uraian: entry.uraian, kategori: entry.kategori, jumlah: entry.jumlah }))),
      sbInsert('gudang', next.gudang.map((entry) => ({ tanggal: entry.tanggal, nama_barang: entry.namaBarang, satuan: entry.satuan, uraian: entry.uraian, masuk: entry.masuk || 0, keluar: entry.keluar || 0 }))),
    ]);

    setData({
      kasUmum: { debit: kud.map(rowToEntry), kredit: kuk.map(rowToEntry) },
      kasPetelur: { debit: kpd.map(rowToEntry), kredit: kpk.map(rowToEntry) },
      gudang: gd.map(rowToGudang),
    });
  });

  const handleReset = () => replaceAllData(emptyData());

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'kasUmum', label: 'Kas Umum BUMDes', icon: Wallet },
    { key: 'kasPetelur', label: 'Kas RKU Petelur', icon: Egg },
    { key: 'gudang', label: 'Buku Gudang', icon: Warehouse },
    { key: 'importExport', label: 'Impor / Ekspor', icon: FileSpreadsheet },
  ];

  if (!loaded || !data) {
    return (
      <div className="flex min-h-100 items-center justify-center bg-stone-50">
        <div className="flex items-center gap-2 text-stone-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Nyambungin ke database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui" }}>
      <header className="sticky top-0 z-40 bg-linear-to-r from-emerald-950 to-emerald-800 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <EmblemBadge />
          <div>
            <h1 className="text-xl font-bold leading-tight md:text-2xl" style={{ fontFamily: "'Lora', serif" }}>
              Buku Kas BUMDes Mulyoarjo
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-emerald-200 md:text-sm">
              {dbOk ? <Wifi className="h-3.5 w-3.5 text-emerald-300" /> : <WifiOff className="h-3.5 w-3.5 text-rose-300" />}
              <span>{dbOk ? 'Tersambung ke database' : 'Gagal tersambung -- data kosong sementara'}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={loadInitial} className="text-emerald-200 hover:text-white" title="Refresh data">
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="hidden items-center gap-1.5 text-sm text-amber-300 sm:flex">
              <Banknote className="h-4 w-4" />
              <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatRupiah(ringkasan.grand.bersih)}
              </span>
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto border-t border-emerald-700/50 px-4">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${active ? 'border-amber-400 text-white' : 'border-transparent text-emerald-200 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {notice && <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${notice.type === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{notice.text}</div>}

        {tab === 'dashboard' && (
          <Dashboard kasUmumTotals={ringkasan.umum} kasPetelurTotals={ringkasan.petelur} grandTotals={ringkasan.grand} monthlyData={monthlyData} gudangAlerts={gudangAlerts} />
        )}
        {tab === 'kasUmum' && (
          <LedgerSection
            title="Kas Umum BUMDes"
            subtitle="Aliran dana pusat BUMDes -- bentuk skontro"
            debitLabel="Sumber Pemasukan"
            kreditLabel="Kategori Pengeluaran"
            debitOptions={SUMBER_UMUM}
            kreditOptions={KATEGORI_UMUM}
            debitEntries={data.kasUmum.debit}
            kreditEntries={data.kasUmum.kredit}
            onAddDebit={(entry) => addEntry('kasUmum', 'debit', entry)}
            onDeleteDebit={(id) => deleteEntry('kasUmum', 'debit', id)}
            onAddKredit={(entry) => addEntry('kasUmum', 'kredit', entry)}
            onDeleteKredit={(id) => deleteEntry('kasUmum', 'kredit', id)}
          />
        )}
        {tab === 'kasPetelur' && (
          <LedgerSection
            title="Kas RKU Unit Petelur"
            subtitle="Operasional harian kandang -- bentuk skontro"
            debitLabel="Sumber Pemasukan"
            kreditLabel="Kategori Pengeluaran"
            debitOptions={SUMBER_PETELUR}
            kreditOptions={KATEGORI_PETELUR}
            debitEntries={data.kasPetelur.debit}
            kreditEntries={data.kasPetelur.kredit}
            onAddDebit={(entry) => addEntry('kasPetelur', 'debit', entry)}
            onDeleteDebit={(id) => deleteEntry('kasPetelur', 'debit', id)}
            onAddKredit={(entry) => addEntry('kasPetelur', 'kredit', entry)}
            onDeleteKredit={(id) => deleteEntry('kasPetelur', 'kredit', id)}
          />
        )}
        {tab === 'gudang' && <GudangSection entries={data.gudang} onAdd={addGudang} onDelete={deleteGudang} />}
        {tab === 'importExport' && <ImportExportSection data={data} onImportReplace={replaceAllData} onReset={handleReset} computeRingkasan={computeRingkasan} />}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-stone-400">Data tersimpan di database BUMDes Mulyoarjo -- otomatis update di semua perangkat.</footer>
    </div>
  );
}
