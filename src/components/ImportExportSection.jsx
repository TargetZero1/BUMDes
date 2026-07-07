import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Loader2, RefreshCw, Upload } from 'lucide-react';
import { buildWorkbook, createEmptyWorkbook, parseImportedWorkbook } from '../lib/excel';
import { todayStr } from '../lib/formatters';

export default function ImportExportSection({ data, onImportReplace, onReset, computeRingkasan }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    const workbook = buildWorkbook(data, computeRingkasan);
    XLSX.writeFile(workbook, `BUMDes_Mulyoarjo_${todayStr()}.xlsx`);
  };

  const handleTemplate = () => {
    const workbook = createEmptyWorkbook(computeRingkasan);
    XLSX.writeFile(workbook, 'Template_Kosong_BUMDes_Mulyoarjo.xlsx');
  };

  const handleFile = (file) => {
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { next, totalRows } = parseImportedWorkbook(event.target.result);
        if (totalRows === 0) {
          setMsg({ type: 'error', text: 'Gak ada data yang kebaca. Pastikan nama sheet-nya sama kayak hasil Export (KasUmum_Debit, dst).' });
          setBusy(false);
          return;
        }
        await onImportReplace(next);
        setMsg({ type: 'success', text: `Berhasil impor ${totalRows} baris ke database.` });
      } catch (error) {
        setMsg({ type: 'error', text: 'Gagal baca file. Pastikan formatnya .xlsx dan sesuai template.' });
      } finally {
        setBusy(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
          Impor / Ekspor
        </h2>
        <p className="text-sm text-stone-500">Pindahkan data antara database dan file Excel</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-2 flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-700" />
            <h3 className="font-semibold text-stone-700">Ekspor</h3>
          </div>
          <p className="mb-4 text-sm text-stone-500">Download semua data jadi satu file .xlsx -- bisa dibuka di Excel atau Google Sheets.</p>
          <button onClick={handleExport} className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
            <Download className="h-4 w-4" /> Export Semua Data (.xlsx)
          </button>
          <button onClick={handleTemplate} className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-100 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200">
            <FileSpreadsheet className="h-4 w-4" /> Download Template Kosong
          </button>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-2 flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-700" />
            <h3 className="font-semibold text-stone-700">Impor</h3>
          </div>
          <p className="mb-4 text-sm text-stone-500">Upload file .xlsx format yang sama kayak hasil Export. Data lama di database bakal <b>diganti</b>.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Pilih File & Impor
          </button>
          {msg && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {msg.text}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-100 p-4 text-sm text-stone-600">
        Data kesimpan di database Supabase asli, bukan cuma di browser -- bisa dibuka dari HP atau laptop lain, tetap sinkron. Catatan: akses masih pakai kunci publik (belum ada login per staf). Cukup aman buat pemakaian internal, tapi kalau nanti mau dipakai banyak orang dengan akun masing-masing, itu bisa ditambahin belakangan.
      </div>

      <div className="rounded-2xl border border-rose-200 bg-white p-5">
        <h3 className="mb-2 font-semibold text-rose-700">Reset Data</h3>
        <p className="mb-3 text-sm text-stone-500">Hapus semua transaksi dari database dan mulai dari kosong. Gak bisa dibatalkan.</p>
        <button onClick={() => setConfirmOpen(true)} className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
          <RefreshCw className="h-4 w-4" /> Reset ke Data Kosong
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 font-bold text-stone-800">Yakin hapus semua data?</h3>
            <p className="mb-4 text-sm text-stone-500">Semua transaksi di database akan dihapus permanen.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">Batal</button>
              <button
                onClick={async () => {
                  await onReset();
                  setConfirmOpen(false);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
