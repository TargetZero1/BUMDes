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

// Create metadata header row for export
function createMetadataRow(label, value) {
  return { __metadata: label, __value: value };
}

// Build metadata info sheet
function buildMetadataSheet(profile, selectedUnitId, unitLabel, timestamp) {
  const rows = [
    { Info: 'File Generated', Value: timestamp || new Date().toLocaleString('id-ID') },
    { Info: 'Exported By', Value: profile?.full_name || 'Unknown' },
    { Info: 'User Role', Value: profile?.role || 'unknown' },
    { Info: 'Unit Exported', Value: unitLabel },
    { Info: 'Access Level', Value: profile?.can_view_all ? 'All Units' : 'Single Unit' },
    { Info: 'Brand', Value: 'MSA' },
    { Info: 'Contact Person', Value: 'Bu Shefi (+62 896-5658-9449)' },
    { Info: '', Value: '' },
    { Info: 'INSTRUCTIONS', Value: '' },
    { Info: '1. Edit data in rows below', Value: '' },
    { Info: '2. Keep column names unchanged', Value: '' },
    { Info: '3. Do NOT add/remove sheet tabs', Value: '' },
    { Info: '4. Save as .xlsx format', Value: '' },
    { Info: '5. Import back via Impor button', Value: '' },
  ];
  return XLSX.utils.json_to_sheet(rows);
}

// Validate imported data integrity
export function validateImportedData(workbook, expectedSheets = null) {
  const sheetNames = workbook.SheetNames || [];
  const errors = [];
  const warnings = [];

  // Required logical sheets (accept small name variations)
  const requiredLogical = ['kasumumdebit', 'kasumumkredit', 'kaspetelurdebit', 'kaspetelurkredit', 'gudang'];
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

export function buildWorkbook(payload, computeRingkasan, profile = null, selectedUnitId = null, unitLabel = 'Semua Unit') {
  const workbook = XLSX.utils.book_new();
  const mapDebit = (items) => items.map((entry) => ({ Tanggal: entry.tanggal, Uraian: entry.uraian, Sumber: entry.sumber, 'Jumlah (Rp)': entry.jumlah }));
  const mapKredit = (items) => items.map((entry) => ({ Tanggal: entry.tanggal, Uraian: entry.uraian, Kategori: entry.kategori, 'Jumlah (Rp)': entry.jumlah }));
  const mapGudang = (items) => items.map((entry) => ({ Tanggal: entry.tanggal, 'Nama Barang': entry.namaBarang, Satuan: entry.satuan, Uraian: entry.uraian, 'Masuk (+)': entry.masuk || 0, 'Keluar (-)': entry.keluar || 0 }));

  // Add metadata sheet
  const metadataSheet = buildMetadataSheet(profile, selectedUnitId, unitLabel, new Date().toLocaleString('id-ID'));
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'INFO');

  // Add data sheets
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapDebit(payload.kasUmum.debit)), 'KasUmum_Debit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapKredit(payload.kasUmum.kredit)), 'KasUmum_Kredit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapDebit(payload.kasPetelur.debit)), 'KasPetelur_Debit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapKredit(payload.kasPetelur.kredit)), 'KasPetelur_Kredit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mapGudang(payload.gudang)), 'Gudang');

  // Add summary/ringkasan sheet
  const ringkasan = computeRingkasan(payload);
  const summaryRows = [
    { Unit: 'Kas Umum BUMDes', 'Total Pemasukan': ringkasan.umum.pemasukan, 'Total Pengeluaran': ringkasan.umum.pengeluaran, 'Keuntungan Bersih': ringkasan.umum.bersih },
    { Unit: 'Kas RKU Unit Petelur', 'Total Pemasukan': ringkasan.petelur.pemasukan, 'Total Pengeluaran': ringkasan.petelur.pengeluaran, 'Keuntungan Bersih': ringkasan.petelur.bersih },
    { Unit: 'TOTAL GABUNGAN', 'Total Pemasukan': ringkasan.grand.pemasukan, 'Total Pengeluaran': ringkasan.grand.pengeluaran, 'Keuntungan Bersih': ringkasan.grand.bersih },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Ringkasan');
  return workbook;
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
  })).filter((e) => e.tanggal && e.namaBarang);

  const debitUmum = toDebit(sheetRows('KasUmum_Debit'));
  const kreditUmum = toKredit(sheetRows('KasUmum_Kredit'));
  const debitPetelur = toDebit(sheetRows('KasPetelur_Debit'));
  const kreditPetelur = toKredit(sheetRows('KasPetelur_Kredit'));
  const gudangRows = toGudang(sheetRows('Gudang'));

  // Check for duplicates
  const duplicateWarnings = [];
  if (currentData) {
    const dupDebitUmum = detectDuplicates(debitUmum, currentData.kasUmum?.debit);
    const dupKreditUmum = detectDuplicates(kreditUmum, currentData.kasUmum?.kredit);
    const dupDebitPetelur = detectDuplicates(debitPetelur, currentData.kasPetelur?.debit);
    const dupKreditPetelur = detectDuplicates(kreditPetelur, currentData.kasPetelur?.kredit);
    if (dupDebitUmum.length > 0) duplicateWarnings.push(`${dupDebitUmum.length} duplikat di Kas Umum Debit`);
    if (dupKreditUmum.length > 0) duplicateWarnings.push(`${dupKreditUmum.length} duplikat di Kas Umum Kredit`);
    if (dupDebitPetelur.length > 0) duplicateWarnings.push(`${dupDebitPetelur.length} duplikat di Kas Petelur Debit`);
    if (dupKreditPetelur.length > 0) duplicateWarnings.push(`${dupKreditPetelur.length} duplikat di Kas Petelur Kredit`);
  }

  const next = {
    kasUmum: { debit: debitUmum, kredit: kreditUmum },
    kasPetelur: { debit: debitPetelur, kredit: kreditPetelur },
    gudang: gudangRows,
  };

  const totalRows = debitUmum.length + kreditUmum.length + debitPetelur.length + kreditPetelur.length + gudangRows.length;
  return { next, totalRows, warnings: [...validation.warnings, ...duplicateWarnings] };
}

export function createEmptyWorkbook(computeRingkasan, profile = null) {
  return buildWorkbook(emptyData(), computeRingkasan, profile);
}
