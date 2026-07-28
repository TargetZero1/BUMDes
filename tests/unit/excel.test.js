import * as XLSX from 'xlsx';
import { describe, it, expect } from 'vitest';
import { parseImportedWorkbook } from '../../src/lib/excelImport';

// QA_CHECKLIST.md § 4 Data Integrity: "Edge cases: missing columns, extra
// columns, blank rows handled gracefully."

function buildWorkbook(sheets) {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  }
  return workbook;
}

function toArrayBuffer(workbook) {
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

// Every parseImportedWorkbook call needs all 5 logical sheets present
// (validateImportedData throws a hard error otherwise) — the row content
// of each sheet is what varies per test.
function baseSheets(overrides = {}) {
  return {
    KasUmum_Debit: [{ Tanggal: '2026-01-01', Uraian: 'Setoran', Sumber: 'Unit A', 'Jumlah (Rp)': 100000 }],
    KasUmum_Kredit: [{ Tanggal: '2026-01-02', Uraian: 'Belanja', Kategori: 'ATK', 'Jumlah (Rp)': 50000 }],
    KasUnit_Debit: [{ Tanggal: '2026-01-01', Uraian: 'Setoran Unit', Sumber: 'Toko', 'Jumlah (Rp)': 20000 }],
    KasUnit_Kredit: [{ Tanggal: '2026-01-02', Uraian: 'Belanja Unit', Kategori: 'Operasional', 'Jumlah (Rp)': 10000 }],
    Gudang: [{ Tanggal: '2026-01-01', 'Nama Barang': 'Beras', Satuan: 'kg', Uraian: 'Stok awal', 'Masuk (+)': 10, 'Keluar (-)': 0 }],
    ...overrides,
  };
}

describe('parseImportedWorkbook — edge cases', () => {
  it('handles a missing (renamed-away) optional column with a warning, not a hard error', () => {
    const sheets = baseSheets({
      // "Sumber" column dropped entirely from KasUmum_Debit.
      KasUmum_Debit: [{ Tanggal: '2026-01-01', Uraian: 'Setoran', 'Jumlah (Rp)': 100000 }],
    });
    const workbook = buildWorkbook(sheets);
    const buffer = toArrayBuffer(workbook);

    const result = parseImportedWorkbook(buffer);

    expect(result.next.kasUmum.debit).toHaveLength(1);
    expect(result.next.kasUmum.debit[0].sumber).toBe('');
    expect(result.next.kasUmum.debit[0].jumlah).toBe(100000);
    // Column presence is reported as a warning (see validateSheetColumns), never thrown.
    expect(result.warnings.some((w) => w.includes('KasUmum_Debit'))).toBe(true);
  });

  it('ignores extra/unexpected columns without error', () => {
    const sheets = baseSheets({
      KasUmum_Debit: [
        { Tanggal: '2026-01-01', Uraian: 'Setoran', Sumber: 'Unit A', 'Jumlah (Rp)': 100000, Catatan: 'not a recognized field' },
      ],
    });
    const workbook = buildWorkbook(sheets);
    const buffer = toArrayBuffer(workbook);

    const result = parseImportedWorkbook(buffer);

    expect(result.next.kasUmum.debit).toHaveLength(1);
    expect(result.next.kasUmum.debit[0].uraian).toBe('Setoran');
    expect(result.next.kasUmum.debit[0]).not.toHaveProperty('Catatan');
  });

  it('drops fully blank rows instead of producing empty/garbage entries', () => {
    const sheets = baseSheets({
      KasUmum_Debit: [
        { Tanggal: '2026-01-01', Uraian: 'Setoran', Sumber: 'Unit A', 'Jumlah (Rp)': 100000 },
        { Tanggal: '', Uraian: '', Sumber: '', 'Jumlah (Rp)': '' },
      ],
    });
    const workbook = buildWorkbook(sheets);
    const buffer = toArrayBuffer(workbook);

    const result = parseImportedWorkbook(buffer);

    expect(result.next.kasUmum.debit).toHaveLength(1);
  });

  it('drops rows missing required fields (tanggal/uraian) even if other columns are filled', () => {
    const sheets = baseSheets({
      KasUmum_Debit: [
        { Tanggal: '2026-01-01', Uraian: 'Setoran', Sumber: 'Unit A', 'Jumlah (Rp)': 100000 },
        // Jumlah filled but no Tanggal/Uraian — should not become a phantom entry.
        { Tanggal: '', Uraian: '', Sumber: 'Unit A', 'Jumlah (Rp)': 5000 },
      ],
    });
    const workbook = buildWorkbook(sheets);
    const buffer = toArrayBuffer(workbook);

    const result = parseImportedWorkbook(buffer);

    expect(result.next.kasUmum.debit).toHaveLength(1);
    expect(result.next.kasUmum.debit[0].jumlah).toBe(100000);
  });
});
