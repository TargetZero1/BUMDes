import { sumBy } from './formatters';

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
