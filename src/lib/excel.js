import * as XLSX from 'xlsx';
import { emptyData } from './data';

export function normalizeExcelDate(value) {
  if (value === undefined || value === null || value === '') return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return String(value);
}

export function buildWorkbook(payload, computeRingkasan) {
  const workbook = XLSX.utils.book_new();
  const mapDebit = (items) => items.map((entry) => ({ Tanggal: entry.tanggal, Uraian: entry.uraian, Sumber: entry.sumber, 'Jumlah (Rp)': entry.jumlah }));
  const mapKredit = (items) => items.map((entry) => ({ Tanggal: entry.tanggal, Uraian: entry.uraian, Kategori: entry.kategori, 'Jumlah (Rp)': entry.jumlah }));
  const mapGudang = (items) => items.map((entry) => ({ Tanggal: entry.tanggal, 'Nama Barang': entry.namaBarang, Satuan: entry.satuan, Uraian: entry.uraian, 'Masuk (+)': entry.masuk || 0, 'Keluar (-)': entry.keluar || 0 }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapDebit(payload.kasUmum.debit)), 'KasUmum_Debit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapKredit(payload.kasUmum.kredit)), 'KasUmum_Kredit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapDebit(payload.kasPetelur.debit)), 'KasPetelur_Debit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapKredit(payload.kasPetelur.kredit)), 'KasPetelur_Kredit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapGudang(payload.gudang)), 'Gudang');

  const ringkasan = computeRingkasan(payload);
  const summaryRows = [
    { Unit: 'Kas Umum BUMDes', 'Total Pemasukan': ringkasan.umum.pemasukan, 'Total Pengeluaran': ringkasan.umum.pengeluaran, 'Keuntungan Bersih': ringkasan.umum.bersih },
    { Unit: 'Kas RKU Unit Petelur', 'Total Pemasukan': ringkasan.petelur.pemasukan, 'Total Pengeluaran': ringkasan.petelur.pengeluaran, 'Keuntungan Bersih': ringkasan.petelur.bersih },
    { Unit: 'TOTAL GABUNGAN', 'Total Pemasukan': ringkasan.grand.pemasukan, 'Total Pengeluaran': ringkasan.grand.pengeluaran, 'Keuntungan Bersih': ringkasan.grand.bersih },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Ringkasan');
  return workbook;
}

export function parseImportedWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetRows = (name) => (workbook.Sheets[name] ? XLSX.utils.sheet_to_json(workbook.Sheets[name]) : []);
  const toDebit = (rows) => rows.map((row) => ({ tanggal: normalizeExcelDate(row.Tanggal), uraian: row.Uraian || '', sumber: row.Sumber || '', jumlah: Number(row['Jumlah (Rp)'] ?? row.Jumlah) || 0 }));
  const toKredit = (rows) => rows.map((row) => ({ tanggal: normalizeExcelDate(row.Tanggal), uraian: row.Uraian || '', kategori: row.Kategori || '', jumlah: Number(row['Jumlah (Rp)'] ?? row.Jumlah) || 0 }));
  const toGudang = (rows) => rows.map((row) => ({ tanggal: normalizeExcelDate(row.Tanggal), namaBarang: row['Nama Barang'] || '', satuan: row.Satuan || '', uraian: row.Uraian || '', masuk: Number(row['Masuk (+)'] ?? row.Masuk) || 0, keluar: Number(row['Keluar (-)'] ?? row.Keluar) || 0 }));

  const next = {
    kasUmum: { debit: toDebit(sheetRows('KasUmum_Debit')), kredit: toKredit(sheetRows('KasUmum_Kredit')) },
    kasPetelur: { debit: toDebit(sheetRows('KasPetelur_Debit')), kredit: toKredit(sheetRows('KasPetelur_Kredit')) },
    gudang: toGudang(sheetRows('Gudang')),
  };

  const totalRows = next.kasUmum.debit.length + next.kasUmum.kredit.length + next.kasPetelur.debit.length + next.kasPetelur.kredit.length + next.gudang.length;
  return { next, totalRows };
}

export function createEmptyWorkbook(computeRingkasan) {
  return buildWorkbook(emptyData(), computeRingkasan);
}
