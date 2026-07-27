import { sumBy } from './formatters';
import { KATEGORI_TAK_TERDUGA } from './constants';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function computeRingkasan(payload) {
  const umum = {
    pemasukan: sumBy(payload.kasUmum.debit, 'jumlah'),
    pengeluaran: sumBy(payload.kasUmum.kredit, 'jumlah'),
  };
  umum.bersih = umum.pemasukan - umum.pengeluaran;

  const unit = {
    pemasukan: sumBy(payload.kasUnit.debit, 'jumlah'),
    pengeluaran: sumBy(payload.kasUnit.kredit, 'jumlah'),
  };
  unit.bersih = unit.pemasukan - unit.pengeluaran;

  const grand = {
    pemasukan: umum.pemasukan + unit.pemasukan,
    pengeluaran: umum.pengeluaran + unit.pengeluaran,
  };
  grand.bersih = umum.bersih + unit.bersih;

  return { umum, unit, grand };
}

export function computeConsolidatedRingkasan(kasUmumDebit, kasUmumKredit, allUnitsDebit, allUnitsKredit) {
  const pemasukan = sumBy(kasUmumDebit, 'jumlah') + sumBy(allUnitsDebit, 'jumlah');
  const pengeluaran = sumBy(kasUmumKredit, 'jumlah') + sumBy(allUnitsKredit, 'jumlah');
  return { pemasukan, pengeluaran, bersih: pemasukan - pengeluaran };
}

export function buildMonthlyData(data) {
  if (!data) return [];
  const map = {};
  const addTo = (dateValue, key, amount) => {
    if (!dateValue) return;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return;
    const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    if (!map[sortKey]) map[sortKey] = { sortKey, label, pemasukan: 0, pengeluaran: 0 };
    map[sortKey][key] += amount;
  };

  [...data.kasUmum.debit, ...data.kasUnit.debit].forEach((entry) => addTo(entry.tanggal, 'pemasukan', entry.jumlah || 0));
  [...data.kasUmum.kredit, ...data.kasUnit.kredit].forEach((entry) => addTo(entry.tanggal, 'pengeluaran', entry.jumlah || 0));

  return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export function getAvailableYears(debitEntries, kreditEntries) {
  const years = new Set();
  [...debitEntries, ...kreditEntries].forEach((entry) => {
    if (!entry.tanggal) return;
    const date = new Date(entry.tanggal);
    if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
  });
  if (years.size === 0) years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
}

export function buildYearlyRecap(debitEntries, kreditEntries) {
  const map = {};
  const addTo = (entry, key) => {
    if (!entry.tanggal) return;
    const date = new Date(entry.tanggal);
    if (Number.isNaN(date.getTime())) return;
    const year = date.getFullYear();
    if (!map[year]) map[year] = { year, pemasukan: 0, pengeluaran: 0 };
    map[year][key] += Number(entry.jumlah) || 0;
  };

  debitEntries.forEach((entry) => addTo(entry, 'pemasukan'));
  kreditEntries.forEach((entry) => addTo(entry, 'pengeluaran'));

  return Object.values(map)
    .map((row) => ({ ...row, bersih: row.pemasukan - row.pengeluaran }))
    .sort((a, b) => a.year - b.year);
}

export function buildMonthlyRecapForYear(debitEntries, kreditEntries, year) {
  const months = MONTH_LABELS.map((label, month) => ({ month, label, pemasukan: 0, pengeluaran: 0 }));
  const addTo = (entry, key) => {
    if (!entry.tanggal) return;
    const date = new Date(entry.tanggal);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
    months[date.getMonth()][key] += Number(entry.jumlah) || 0;
  };

  debitEntries.forEach((entry) => addTo(entry, 'pemasukan'));
  kreditEntries.forEach((entry) => addTo(entry, 'pengeluaran'));

  return months.map((row) => ({ ...row, bersih: row.pemasukan - row.pengeluaran }));
}

export function buildKategoriBreakdown(kreditEntries, { year, month } = {}) {
  const map = {};
  kreditEntries.forEach((entry) => {
    if (!entry.tanggal) return;
    const date = new Date(entry.tanggal);
    if (Number.isNaN(date.getTime())) return;
    if (year !== undefined && date.getFullYear() !== year) return;
    if (month !== undefined && date.getMonth() !== month) return;
    const kategori = entry.kategori || 'Lain-lain';
    map[kategori] = (map[kategori] || 0) + (Number(entry.jumlah) || 0);
  });

  return Object.entries(map)
    .map(([kategori, total]) => ({ kategori, total }))
    .sort((a, b) => b.total - a.total);
}

export function filterTakTerduga(kreditEntries, { year, month } = {}) {
  return kreditEntries.filter((entry) => {
    if (entry.kategori !== KATEGORI_TAK_TERDUGA) return false;
    if (!entry.tanggal) return false;
    const date = new Date(entry.tanggal);
    if (Number.isNaN(date.getTime())) return false;
    if (year !== undefined && date.getFullYear() !== year) return false;
    if (month !== undefined && date.getMonth() !== month) return false;
    return true;
  });
}

export function buildGudangAlerts(data) {
  if (!data) return [];
  const namaBarangList = [...new Set(data.gudang.map((entry) => entry.namaBarang).filter(Boolean))];
  return namaBarangList
    .map((barang) => {
      const items = data.gudang.filter((entry) => entry.namaBarang === barang);
      const saldo = sumBy(items, 'masuk') - sumBy(items, 'keluar');
      return saldo <= 2 ? { barang, saldo, satuan: items[0]?.satuan || '' } : null;
    })
    .filter(Boolean);
}
