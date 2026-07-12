import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
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

// Normalize sheet/header keys for tolerant matching
function normalizeKey(key) {
  if (key === undefined || key === null) return '';
  return String(key).toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

// Find the actual key in a row object given a list of candidate header names
function findKeyInRow(row, candidates) {
  const keys = Object.keys(row || {});
  const normalized = keys.map((k) => ({ raw: k, norm: normalizeKey(k) }));
  for (const cand of candidates) {
    const want = normalizeKey(cand);
    const found = normalized.find((k) => k.norm === want);
    if (found) return found.raw;
  }
  // fallback: try to match by substring (e.g., 'jumlah' inside 'jumlahrp')
  for (const cand of candidates) {
    const want = normalizeKey(cand);
    const found = normalized.find((k) => k.norm.includes(want) || want.includes(k.norm));
    if (found) return found.raw;
  }
  return null;
}

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

// Validate imported data integrity
export function validateImportedData(workbook, expectedSheets = null) {
  const sheetNames = workbook.SheetNames || [];
  const errors = [];
  const warnings = [];

  // Required logical sheets (accept small name variations)
  const requiredLogical = ['kasumumdebit', 'kasumumkredit', 'kasunitdebit', 'kasunitkredit', 'gudang'];
  const normalizedSheetNames = sheetNames.map((s) => ({ raw: s, norm: normalizeKey(s) }));
  const missing = requiredLogical.filter((logical) => !normalizedSheetNames.some((s) => s.norm === logical));
  if (missing.length > 0) {
    // If some are missing, try fuzzy match by startsWith
    const stillMissing = missing.filter((m) => !normalizedSheetNames.some((s) => s.norm.startsWith(m) || m.startsWith(s.norm)));
    if (stillMissing.length > 0) {
      errors.push(`Sheet tidak ditemukan (diharapkan): ${stillMissing.join(', ')}. Pastikan tab sheet tidak dihapus.`);
    }
  }

  // Validate presence of commonly expected columns but be permissive; prefer warnings over hard errors
  const validateSheetColumns = (sheetName, expectedColumns) => {
    const sheetEntry = normalizedSheetNames.find((s) => s.norm === normalizeKey(sheetName) || s.norm.startsWith(normalizeKey(sheetName)));
    if (!sheetEntry) return;
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetEntry.raw]);
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const missingCols = [];
    for (const exp of expectedColumns) {
      const found = headers.find((h) => normalizeKey(h) === normalizeKey(exp) || normalizeKey(h).includes(normalizeKey(exp)));
      if (!found) missingCols.push(exp);
    }
    if (missingCols.length > 0) warnings.push(`Sheet "${sheetEntry.raw}" kolom hilang atau bernama berbeda: ${missingCols.join(', ')}`);
  };

  validateSheetColumns('KasUmum_Debit', ['Tanggal', 'Uraian', 'Sumber', 'Jumlah (Rp)']);
  validateSheetColumns('KasUmum_Kredit', ['Tanggal', 'Uraian', 'Kategori', 'Jumlah (Rp)']);
  validateSheetColumns('Gudang', ['Tanggal', 'Nama Barang', 'Satuan', 'Uraian', 'Masuk (+)', 'Keluar (-)']);

  return { valid: errors.length === 0, errors, warnings };
}

// Detect potential duplicates in import
function detectDuplicates(entries, currentData = null) {
  if (!currentData || currentData.length === 0) return [];
  const duplicates = [];
  const existing = new Set(currentData.map((e) => `${e.tanggal}|${e.uraian}|${e.jumlah}`));
  entries.forEach((entry, idx) => {
    const key = `${entry.tanggal}|${entry.uraian}|${entry.jumlah}`;
    if (existing.has(key)) {
      duplicates.push({ row: idx + 2, entry, key });
    }
  });
  return duplicates;
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

export function parseImportedWorkbook(arrayBuffer, currentData = null) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Validate structure
  const validation = validateImportedData(workbook);
  if (!validation.valid) {
    const error = new Error(validation.errors.join(' | '));
    error.validation = validation;
    throw error;
  }

  // Helper: find actual sheet name by logical name (tolerant)
  const findSheetActual = (logicalName) => {
    const names = workbook.SheetNames || [];
    const normalized = names.map((n) => ({ raw: n, norm: normalizeKey(n) }));
    const want = normalizeKey(logicalName);
    const exact = normalized.find((s) => s.norm === want);
    if (exact) return exact.raw;
    const fuzzy = normalized.find((s) => s.norm.startsWith(want) || want.startsWith(s.norm));
    return fuzzy ? fuzzy.raw : null;
  };

  const sheetRows = (logicalName) => {
    const actual = findSheetActual(logicalName);
    if (!actual) return [];
    const raw = XLSX.utils.sheet_to_json(workbook.Sheets[actual], { defval: '' });
    return raw.filter((row) => Object.keys(row).some((key) => row[key] != null && row[key] !== ''));
  };

  // Field extraction using tolerant header matching
  const extractField = (row, candidates) => {
    const key = findKeyInRow(row, candidates);
    if (!key) return undefined;
    return row[key];
  };

  const toDebit = (rows) => rows.map((row) => ({
    tanggal: normalizeExcelDate(extractField(row, ['Tanggal', 'Date'])),
    uraian: String(extractField(row, ['Uraian', 'Description', 'Keterangan']) || '').trim(),
    sumber: String(extractField(row, ['Sumber', 'Source']) || '').trim(),
    jumlah: Number(extractField(row, ['Jumlah (Rp)', 'Jumlah', 'Amount', 'Rp']) || 0) || 0,
  })).filter((e) => e.tanggal && e.uraian);

  const toKredit = (rows) => rows.map((row) => ({
    tanggal: normalizeExcelDate(extractField(row, ['Tanggal', 'Date'])),
    uraian: String(extractField(row, ['Uraian', 'Description', 'Keterangan']) || '').trim(),
    kategori: String(extractField(row, ['Kategori', 'Category']) || '').trim(),
    jumlah: Number(extractField(row, ['Jumlah (Rp)', 'Jumlah', 'Amount', 'Rp']) || 0) || 0,
  })).filter((e) => e.tanggal && e.uraian);

  const toGudang = (rows) => rows.map((row) => ({
    tanggal: normalizeExcelDate(extractField(row, ['Tanggal', 'Date'])),
    namaBarang: String(extractField(row, ['Nama Barang', 'Item Name', 'Barang']) || '').trim(),
    satuan: String(extractField(row, ['Satuan', 'Unit']) || '').trim(),
    uraian: String(extractField(row, ['Uraian', 'Description', 'Keterangan']) || '').trim(),
    masuk: Number(extractField(row, ['Masuk (+)', 'Masuk', 'In', 'Qty In']) || 0) || 0,
    keluar: Number(extractField(row, ['Keluar (-)', 'Keluar', 'Out', 'Qty Out']) || 0) || 0,
    kategori: String(extractField(row, ['Kategori', 'Category']) || '').trim() || undefined,
    hargaBeli: extractField(row, ['Harga Beli', 'Buy Price']) !== undefined && extractField(row, ['Harga Beli', 'Buy Price']) !== '' ? Number(extractField(row, ['Harga Beli', 'Buy Price'])) : undefined,
    hargaJual: extractField(row, ['Harga Jual', 'Sell Price']) !== undefined && extractField(row, ['Harga Jual', 'Sell Price']) !== '' ? Number(extractField(row, ['Harga Jual', 'Sell Price'])) : undefined,
    kode: String(extractField(row, ['Kode', 'SKU', 'Code']) || '').trim() || undefined,
  })).filter((e) => e.tanggal && e.namaBarang);

  const debitUmum = toDebit(sheetRows('KasUmum_Debit'));
  const kreditUmum = toKredit(sheetRows('KasUmum_Kredit'));
  const debitUnit = toDebit(sheetRows('KasUnit_Debit'));
  const kreditUnit = toKredit(sheetRows('KasUnit_Kredit'));
  const gudangRows = toGudang(sheetRows('Gudang'));

  // Check for duplicates
  const duplicateWarnings = [];
  if (currentData) {
    const dupDebitUmum = detectDuplicates(debitUmum, currentData.kasUmum?.debit);
    const dupKreditUmum = detectDuplicates(kreditUmum, currentData.kasUmum?.kredit);
    const dupDebitUnit = detectDuplicates(debitUnit, currentData.kasUnit?.debit);
    const dupKreditUnit = detectDuplicates(kreditUnit, currentData.kasUnit?.kredit);
    if (dupDebitUmum.length > 0) duplicateWarnings.push(`${dupDebitUmum.length} duplikat di Kas Umum Debit`);
    if (dupKreditUmum.length > 0) duplicateWarnings.push(`${dupKreditUmum.length} duplikat di Kas Umum Kredit`);
    if (dupDebitUnit.length > 0) duplicateWarnings.push(`${dupDebitUnit.length} duplikat di Kas Unit Debit`);
    if (dupKreditUnit.length > 0) duplicateWarnings.push(`${dupKreditUnit.length} duplikat di Kas Unit Kredit`);
  }

  const next = {
    kasUmum: { debit: debitUmum, kredit: kreditUmum },
    kasUnit: { debit: debitUnit, kredit: kreditUnit },
    gudang: gudangRows,
  };

  const totalRows = debitUmum.length + kreditUmum.length + debitUnit.length + kreditUnit.length + gudangRows.length;
  return { next, totalRows, warnings: [...validation.warnings, ...duplicateWarnings] };
}
