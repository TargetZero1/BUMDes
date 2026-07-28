import * as XLSX from 'xlsx';

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
