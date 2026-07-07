import { BARANG_LIST } from './constants';
import { sumBy } from './formatters';

export function computeRingkasan(payload) {
  const umum = {
    pemasukan: sumBy(payload.kasUmum.debit, 'jumlah'),
    pengeluaran: sumBy(payload.kasUmum.kredit, 'jumlah'),
  };
  umum.bersih = umum.pemasukan - umum.pengeluaran;

  const petelur = {
    pemasukan: sumBy(payload.kasPetelur.debit, 'jumlah'),
    pengeluaran: sumBy(payload.kasPetelur.kredit, 'jumlah'),
  };
  petelur.bersih = petelur.pemasukan - petelur.pengeluaran;

  const grand = {
    pemasukan: umum.pemasukan + petelur.pemasukan,
    pengeluaran: umum.pengeluaran + petelur.pengeluaran,
  };
  grand.bersih = umum.bersih + petelur.bersih;

  return { umum, petelur, grand };
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

  [...data.kasUmum.debit, ...data.kasPetelur.debit].forEach((entry) => addTo(entry.tanggal, 'pemasukan', entry.jumlah || 0));
  [...data.kasUmum.kredit, ...data.kasPetelur.kredit].forEach((entry) => addTo(entry.tanggal, 'pengeluaran', entry.jumlah || 0));

  return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export function buildGudangAlerts(data) {
  if (!data) return [];
  return BARANG_LIST.map((barang) => {
    const items = data.gudang.filter((entry) => entry.namaBarang === barang);
    if (!items.length) return null;
    const saldo = sumBy(items, 'masuk') - sumBy(items, 'keluar');
    return saldo <= 2 ? { barang, saldo, satuan: items[0]?.satuan || '' } : null;
  }).filter(Boolean);
}
