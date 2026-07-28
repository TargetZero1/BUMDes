import ExcelJS from 'exceljs';
import { emptyData } from './data';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  left: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  right: { style: 'thin', color: { argb: 'FFD0D5DD' } },
};

// Adds a data sheet with a blue header row, thin borders, a frozen header, and
// column widths sized to fit their content (SheetJS's community edition can't
// write cell styles at all, hence ExcelJS for anything generated for humans).
function addFormattedSheet(workbook, sheetName, columns, rows) {
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.columns = columns.map((col) => ({ key: col.key, width: col.width || 12 }));

  const headerRow = sheet.addRow(columns.map((col) => col.header));
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 20;

  rows.forEach((row) => {
    const dataRow = sheet.addRow(columns.map((col) => row[col.key] ?? ''));
    dataRow.eachCell((cell, colNumber) => {
      cell.border = THIN_BORDER;
      const col = columns[colNumber - 1];
      if (col?.numFmt) cell.numFmt = col.numFmt;
      cell.alignment = { vertical: 'middle', horizontal: col?.numFmt ? 'right' : 'left' };
    });
  });

  // Auto-fit column widths from header + content (character-unit approximation, +2 padding).
  columns.forEach((col, idx) => {
    const headerLen = String(col.header || '').length;
    const maxContentLen = rows.reduce((max, row) => {
      const raw = row[col.key];
      const text = col.numFmt && typeof raw === 'number' ? raw.toLocaleString('id-ID') : String(raw ?? '');
      return Math.max(max, text.length);
    }, 0);
    sheet.getColumn(idx + 1).width = Math.min(Math.max(headerLen, maxContentLen, col.width || 10) + 2, 40);
  });

  return sheet;
}

const MONEY_FMT = '#,##0';

const DEBIT_COLUMNS = [
  { header: 'Tanggal', key: 'Tanggal', width: 12 },
  { header: 'Uraian', key: 'Uraian', width: 24 },
  { header: 'Sumber', key: 'Sumber', width: 16 },
  { header: 'Jumlah (Rp)', key: 'Jumlah (Rp)', width: 16, numFmt: MONEY_FMT },
];

const KREDIT_COLUMNS = [
  { header: 'Tanggal', key: 'Tanggal', width: 12 },
  { header: 'Uraian', key: 'Uraian', width: 24 },
  { header: 'Kategori', key: 'Kategori', width: 16 },
  { header: 'Jumlah (Rp)', key: 'Jumlah (Rp)', width: 16, numFmt: MONEY_FMT },
];

const GUDANG_COLUMNS = [
  { header: 'Tanggal', key: 'Tanggal', width: 12 },
  { header: 'Nama Barang', key: 'Nama Barang', width: 22 },
  { header: 'Satuan', key: 'Satuan', width: 10 },
  { header: 'Uraian', key: 'Uraian', width: 24 },
  { header: 'Masuk (+)', key: 'Masuk (+)', width: 12, numFmt: MONEY_FMT },
  { header: 'Keluar (-)', key: 'Keluar (-)', width: 12, numFmt: MONEY_FMT },
  { header: 'Kategori', key: 'Kategori', width: 16 },
  { header: 'Harga Beli', key: 'Harga Beli', width: 14, numFmt: MONEY_FMT },
  { header: 'Harga Jual', key: 'Harga Jual', width: 14, numFmt: MONEY_FMT },
  { header: 'Kode', key: 'Kode', width: 14 },
];

const RINGKASAN_COLUMNS = [
  { header: 'Unit', key: 'Unit', width: 20 },
  { header: 'Total Pemasukan', key: 'Total Pemasukan', width: 18, numFmt: MONEY_FMT },
  { header: 'Total Pengeluaran', key: 'Total Pengeluaran', width: 18, numFmt: MONEY_FMT },
  { header: 'Keuntungan Bersih', key: 'Keuntungan Bersih', width: 18, numFmt: MONEY_FMT },
];

const INFO_COLUMNS = [
  { header: 'Info', key: 'Info', width: 30 },
  { header: 'Value', key: 'Value', width: 40 },
];

// Build metadata/info sheet rows
function buildMetadataRows(profile, unitLabel, timestamp) {
  return [
    { Info: 'File Dibuat', Value: timestamp || new Date().toLocaleString('id-ID') },
    { Info: 'Diekspor Oleh', Value: profile?.full_name || 'Tidak diketahui' },
    { Info: 'Peran Pengguna', Value: profile?.role || 'tidak diketahui' },
    { Info: 'Unit yang Diekspor', Value: unitLabel },
    { Info: 'Level Akses', Value: profile?.can_view_all ? 'Semua Unit' : 'Satu Unit' },
    { Info: 'Brand', Value: 'MSA' },
    { Info: 'Kontak', Value: 'Bu Shefi (+62 896-5658-9449)' },
    { Info: '', Value: '' },
    { Info: 'PETUNJUK PENGISIAN', Value: '' },
    { Info: '1. Isi/edit data pada baris di setiap sheet data', Value: '' },
    { Info: '2. Jangan ubah nama kolom (baris header biru)', Value: '' },
    { Info: '3. Jangan tambah atau hapus tab sheet', Value: '' },
    { Info: '4. Simpan dalam format .xlsx', Value: '' },
    { Info: '5. Impor kembali lewat tombol Impor', Value: '' },
  ];
}

export async function buildWorkbook(payload, computeRingkasan, profile = null, selectedUnitId = null, unitLabel = 'Semua Unit') {
  const workbook = new ExcelJS.Workbook();
  const mapDebit = (items) => items.map((entry) => ({ Tanggal: entry.tanggal, Uraian: entry.uraian, Sumber: entry.sumber, 'Jumlah (Rp)': entry.jumlah }));
  const mapKredit = (items) => items.map((entry) => ({ Tanggal: entry.tanggal, Uraian: entry.uraian, Kategori: entry.kategori, 'Jumlah (Rp)': entry.jumlah }));
  const mapGudang = (items) => items.map((entry) => ({
    Tanggal: entry.tanggal,
    'Nama Barang': entry.namaBarang,
    Satuan: entry.satuan,
    Uraian: entry.uraian,
    'Masuk (+)': entry.masuk || 0,
    'Keluar (-)': entry.keluar || 0,
    Kategori: entry.kategori || '',
    'Harga Beli': entry.hargaBeli ?? '',
    'Harga Jual': entry.hargaJual ?? '',
    Kode: entry.kode || '',
  }));

  addFormattedSheet(workbook, 'INFO', INFO_COLUMNS, buildMetadataRows(profile, unitLabel, new Date().toLocaleString('id-ID')));
  addFormattedSheet(workbook, 'KasUmum_Debit', DEBIT_COLUMNS, mapDebit(payload.kasUmum.debit));
  addFormattedSheet(workbook, 'KasUmum_Kredit', KREDIT_COLUMNS, mapKredit(payload.kasUmum.kredit));
  addFormattedSheet(workbook, 'KasUnit_Debit', DEBIT_COLUMNS, mapDebit(payload.kasUnit.debit));
  addFormattedSheet(workbook, 'KasUnit_Kredit', KREDIT_COLUMNS, mapKredit(payload.kasUnit.kredit));
  addFormattedSheet(workbook, 'Gudang', GUDANG_COLUMNS, mapGudang(payload.gudang));

  const ringkasan = computeRingkasan(payload);
  const summaryRows = [
    { Unit: 'Kas Umum BUMDes', 'Total Pemasukan': ringkasan.umum.pemasukan, 'Total Pengeluaran': ringkasan.umum.pengeluaran, 'Keuntungan Bersih': ringkasan.umum.bersih },
    { Unit: 'Kas Unit', 'Total Pemasukan': ringkasan.unit.pemasukan, 'Total Pengeluaran': ringkasan.unit.pengeluaran, 'Keuntungan Bersih': ringkasan.unit.bersih },
    { Unit: 'TOTAL GABUNGAN', 'Total Pemasukan': ringkasan.grand.pemasukan, 'Total Pengeluaran': ringkasan.grand.pengeluaran, 'Keuntungan Bersih': ringkasan.grand.bersih },
  ];
  addFormattedSheet(workbook, 'Ringkasan', RINGKASAN_COLUMNS, summaryRows);

  return workbook;
}

export async function createEmptyWorkbook(computeRingkasan, profile = null) {
  return buildWorkbook(emptyData(), computeRingkasan, profile);
}

// Triggers a browser download for an ExcelJS workbook built by buildWorkbook/createEmptyWorkbook.
export async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
