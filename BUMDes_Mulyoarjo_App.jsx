import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  LayoutDashboard, Wallet, Egg, Warehouse, FileSpreadsheet, Plus, Trash2,
  Download, Upload, RefreshCw, TrendingUp, TrendingDown, AlertTriangle,
  Building2, Loader2, Banknote, Wifi, WifiOff,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const SUPABASE_URL = "https://jqxwsffybmcdmsepufjs.supabase.co";
const SUPABASE_KEY = "sb_publishable_zWO6W0YibcWTVjgytmv5nw_oiUhjCSV";
const REST = `${SUPABASE_URL}/rest/v1`;

const SUMBER_UMUM = ["Dana Desa (Pihak Ketiga)", "Unit Petelur", "Toko", "Lain-lain"];
const KATEGORI_UMUM = ["ATK", "Inventaris", "Aset", "Pendidikan", "Sosial", "Lain-lain"];
const SUMBER_PETELUR = ["BUMDes", "Lain-lain"];
const KATEGORI_PETELUR = ["ATK", "Aset (Kandang, Tanah)", "Aksesoris Kandang", "Pakan", "Obat-obatan", "Lain-lain", "Pihak Ketiga"];
const BARANG_LIST = ["Pakan Ayam (Konsentrat)", "Vaksin ND", "Obat-obatan Lain", "Aksesoris Kandang", "Lain-lain"];
const SATUAN_LIST = ["Kg", "Sak", "Botol", "Pcs", "Liter"];

const TABLE_MAP = {
  "kasUmum.debit": "kas_umum_debit",
  "kasUmum.kredit": "kas_umum_kredit",
  "kasPetelur.debit": "kas_petelur_debit",
  "kasPetelur.kredit": "kas_petelur_kredit",
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const formatQty = (n) => new Intl.NumberFormat("id-ID").format(n || 0);
const sumBy = (arr, key) => arr.reduce((s, e) => s + (Number(e[key]) || 0), 0);
const formatTanggal = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

function emptyData() {
  return {
    kasUmum: { debit: [], kredit: [] },
    kasPetelur: { debit: [], kredit: [] },
    gudang: [],
  };
}

function rowToEntry(row) {
  return { id: row.id, tanggal: row.tanggal, uraian: row.uraian, sumber: row.sumber, kategori: row.kategori, jumlah: Number(row.jumlah) || 0 };
}
function rowToGudang(row) {
  return { id: row.id, tanggal: row.tanggal, namaBarang: row.nama_barang, satuan: row.satuan, uraian: row.uraian, masuk: Number(row.masuk) || 0, keluar: Number(row.keluar) || 0 };
}

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}
async function sbSelect(table) {
  const res = await fetch(`${REST}/${table}?select=*&order=tanggal.desc`, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`Gagal ambil data ${table}`);
  return res.json();
}
async function sbInsert(table, rows) {
  if (!rows.length) return [];
  const res = await fetch(`${REST}/${table}`, {
    method: "POST",
    headers: sbHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Gagal simpan ke ${table}`);
  return res.json();
}
async function sbDelete(table, id) {
  const res = await fetch(`${REST}/${table}?id=eq.${id}`, { method: "DELETE", headers: sbHeaders() });
  if (!res.ok) throw new Error(`Gagal hapus dari ${table}`);
}
async function sbDeleteAll(table) {
  const res = await fetch(`${REST}/${table}?id=not.is.null`, { method: "DELETE", headers: sbHeaders() });
  if (!res.ok) throw new Error(`Gagal reset ${table}`);
}

function normalizeExcelDate(v) {
  if (v === undefined || v === null || v === "") return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return "";
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const parsed = new Date(v);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return String(v);
}

function EmblemBadge() {
  return (
    <div className="relative w-14 h-14 shrink-0 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-emerald-950/40">
      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
        <Building2 className="w-5 h-5 text-emerald-950" strokeWidth={2.5} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = "neutral", big = false }) {
  const tones = {
    positive: "text-emerald-700 bg-emerald-50 border-emerald-200",
    negative: "text-rose-700 bg-rose-50 border-rose-200",
    neutral: "text-stone-700 bg-stone-50 border-stone-200",
    highlight: "text-amber-900 bg-amber-50 border-amber-300",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
        {Icon && <Icon className="w-4 h-4 opacity-60" />}
      </div>
      <div className={big ? "text-2xl font-bold" : "text-lg font-bold"} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {formatRupiah(value)}
      </div>
    </div>
  );
}

function TxTable({ rows, columns, onDelete, emptyText }) {
  if (!rows.length) {
    return <div className="text-sm text-stone-400 italic py-6 text-center border border-dashed border-stone-200 rounded-xl">{emptyText}</div>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-100 text-stone-500 text-xs uppercase tracking-wide">
            {columns.map((c) => <th key={c.key} className="text-left px-3 py-2 font-semibold">{c.label}</th>)}
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.slice().sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)).map((row) => (
            <tr key={row.id} className="border-t border-stone-100 hover:bg-stone-50">
              {columns.map((c) => <td key={c.key} className="px-3 py-2 whitespace-nowrap">{c.render ? c.render(row) : row[c.key]}</td>)}
              <td className="px-2 py-2 text-right">
                <button onClick={() => onDelete(row.id)} className="text-stone-300 hover:text-rose-600 transition-colors" title="Hapus">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntryForm({ tone, fields, onSubmit, submitLabel }) {
  const initial = {};
  fields.forEach((f) => (initial[f.key] = f.default !== undefined ? f.default : ""));
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uraianField = fields.find((f) => f.key === "uraian");
    const jumlahField = fields.find((f) => f.key === "jumlah");
    if (uraianField && !form.uraian.trim()) return;
    if (jumlahField && (!form.jumlah || Number(form.jumlah) <= 0)) return;
    setBusy(true);
    try {
      await onSubmit({ ...form, jumlah: form.jumlah ? Number(form.jumlah) : undefined });
      setForm({ ...initial, tanggal: form.tanggal });
    } finally {
      setBusy(false);
    }
  };

  const toneBtn = tone === "debit" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-700 hover:bg-rose-800";

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 mb-3">
      {fields.map((f) => (
        <div key={f.key} className={f.span2 ? "col-span-2" : ""}>
          <label className="block text-xs font-medium text-stone-500 mb-1">{f.label}</label>
          {f.type === "select" ? (
            <select value={form[f.key]} onChange={(e) => set(f.key, e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="" disabled>Pilih...</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={f.type || "text"}
              value={form[f.key]}
              min={f.type === "number" ? 0 : undefined}
              step={f.type === "number" ? f.step || 1 : undefined}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}
        </div>
      ))}
      <button type="submit" disabled={busy}
        className={`col-span-2 flex items-center justify-center gap-1.5 text-white text-sm font-semibold rounded-lg py-2 transition-colors disabled:opacity-60 ${toneBtn}`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {submitLabel}
      </button>
    </form>
  );
}

function RekapList({ title, items, tone }) {
  const color = tone === "debit" ? "text-emerald-700" : "text-rose-700";
  const total = sumBy(items, "value");
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">{title}</h4>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-sm">
            <span className="text-stone-600">{it.label}</span>
            <div className="flex items-center gap-2 flex-1 mx-2 h-1.5 rounded-full bg-stone-100 overflow-hidden max-w-[40%]">
              <div className={tone === "debit" ? "h-full bg-emerald-500" : "h-full bg-rose-500"}
                style={{ width: total ? `${Math.min(100, (it.value / total) * 100)}%` : "0%" }} />
            </div>
            <span className={`font-semibold ${color}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(it.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LedgerSection({
  title, subtitle, debitLabel, kreditLabel, debitOptions, kreditOptions,
  debitEntries, kreditEntries, onAddDebit, onDeleteDebit, onAddKredit, onDeleteKredit,
}) {
  const totalDebit = sumBy(debitEntries, "jumlah");
  const totalKredit = sumBy(kreditEntries, "jumlah");
  const bersih = totalDebit - totalKredit;

  const rekapDebit = debitOptions.map((o) => ({ label: o, value: sumBy(debitEntries.filter((e) => e.sumber === o), "jumlah") }));
  const rekapKredit = kreditOptions.map((o) => ({ label: o, value: sumBy(kreditEntries.filter((e) => e.kategori === o), "jumlah") }));

  return (
    <div>
      <div className="mb-5">
        <h2 style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-bold text-stone-800">{title}</h2>
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-stone-700">Debit -- Uang Masuk</h3>
          </div>
          <EntryForm tone="debit" submitLabel="Tambah Pemasukan"
            fields={[
              { key: "tanggal", label: "Tanggal", type: "date", default: todayStr() },
              { key: "jumlah", label: "Jumlah (Rp)", type: "number", step: 1000, placeholder: "0" },
              { key: "uraian", label: "Uraian", span2: true, placeholder: "Contoh: Setoran Toko" },
              { key: "sumber", label: debitLabel, type: "select", options: debitOptions, span2: true },
            ]}
            onSubmit={onAddDebit}
          />
          <TxTable rows={debitEntries} emptyText="Belum ada catatan pemasukan." onDelete={onDeleteDebit}
            columns={[
              { key: "tanggal", label: "Tgl", render: (r) => formatTanggal(r.tanggal) },
              { key: "uraian", label: "Uraian" },
              { key: "sumber", label: debitLabel },
              { key: "jumlah", label: "Jumlah", render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(r.jumlah)}</span> },
            ]}
          />
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            <h3 className="font-semibold text-stone-700">Kredit -- Uang Keluar</h3>
          </div>
          <EntryForm tone="kredit" submitLabel="Tambah Pengeluaran"
            fields={[
              { key: "tanggal", label: "Tanggal", type: "date", default: todayStr() },
              { key: "jumlah", label: "Jumlah (Rp)", type: "number", step: 1000, placeholder: "0" },
              { key: "uraian", label: "Uraian", span2: true, placeholder: "Contoh: Beli ATK" },
              { key: "kategori", label: kreditLabel, type: "select", options: kreditOptions, span2: true },
            ]}
            onSubmit={onAddKredit}
          />
          <TxTable rows={kreditEntries} emptyText="Belum ada catatan pengeluaran." onDelete={onDeleteKredit}
            columns={[
              { key: "tanggal", label: "Tgl", render: (r) => formatTanggal(r.tanggal) },
              { key: "uraian", label: "Uraian" },
              { key: "kategori", label: kreditLabel },
              { key: "jumlah", label: "Jumlah", render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(r.jumlah)}</span> },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <RekapList title={`Per ${debitLabel}`} items={rekapDebit} tone="debit" />
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <RekapList title={`Per ${kreditLabel}`} items={rekapKredit} tone="kredit" />
        </div>
      </div>

      <div className="rounded-2xl bg-linear-to-r from-emerald-900 to-emerald-800 text-white p-5 flex flex-wrap gap-6 items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-200 font-semibold mb-1">Tutup Buku</p>
          <p style={{ fontFamily: "'Lora', serif" }} className="text-lg font-bold">Keuntungan Bersih</p>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-emerald-200">Pemasukan</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="font-semibold">{formatRupiah(totalDebit)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-200">Pengeluaran</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="font-semibold">{formatRupiah(totalKredit)}</p>
          </div>
          <div className="pl-6 border-l border-emerald-700">
            <p className="text-xs text-amber-300">Bersih</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xl font-bold text-amber-300">{formatRupiah(bersih)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GudangSection({ entries, onAdd, onDelete }) {
  const rekap = BARANG_LIST.map((barang) => {
    const items = entries.filter((e) => e.namaBarang === barang);
    const masuk = sumBy(items, "masuk");
    const keluar = sumBy(items, "keluar");
    const satuan = items[0]?.satuan || "-";
    return { barang, satuan, masuk, keluar, saldo: masuk - keluar };
  }).filter((r) => r.masuk || r.keluar);

  return (
    <div>
      <div className="mb-5">
        <h2 style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-bold text-stone-800">Buku Gudang</h2>
        <p className="text-sm text-stone-500">Stok barang unit petelur (Kg/Sak/Botol)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 lg:col-span-1">
          <h3 className="font-semibold text-stone-700 mb-3">Catat Barang</h3>
          <EntryForm tone="debit" submitLabel="Simpan"
            fields={[
              { key: "tanggal", label: "Tanggal", type: "date", default: todayStr() },
              { key: "namaBarang", label: "Nama Barang", type: "select", options: BARANG_LIST, span2: true },
              { key: "satuan", label: "Satuan", type: "select", options: SATUAN_LIST },
              { key: "uraian", label: "Uraian", span2: true, placeholder: "Contoh: Pembelian dari toko pakan" },
              { key: "masuk", label: "Masuk (+)", type: "number", default: 0 },
              { key: "keluar", label: "Keluar (-)", type: "number", default: 0 },
            ]}
            onSubmit={(vals) => onAdd({ ...vals, masuk: Number(vals.masuk) || 0, keluar: Number(vals.keluar) || 0, jumlah: undefined })}
          />
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 lg:col-span-2">
          <h3 className="font-semibold text-stone-700 mb-3">Riwayat</h3>
          <TxTable rows={entries} emptyText="Belum ada catatan gudang." onDelete={onDelete}
            columns={[
              { key: "tanggal", label: "Tgl", render: (r) => formatTanggal(r.tanggal) },
              { key: "namaBarang", label: "Barang" },
              { key: "uraian", label: "Uraian" },
              { key: "masuk", label: "Masuk", render: (r) => (r.masuk ? `+${formatQty(r.masuk)} ${r.satuan}` : "-") },
              { key: "keluar", label: "Keluar", render: (r) => (r.keluar ? `-${formatQty(r.keluar)} ${r.satuan}` : "-") },
            ]}
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-stone-700 mb-3">Rekap Stok</h3>
        {rekap.length === 0 ? (
          <div className="text-sm text-stone-400 italic py-6 text-center border border-dashed border-stone-200 rounded-xl">Belum ada stok untuk direkap.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rekap.map((r) => (
              <div key={r.barang} className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-stone-700 text-sm">{r.barang}</p>
                  {r.saldo <= 2 && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" title="Stok menipis" />}
                </div>
                <div className="flex justify-between text-xs text-stone-500 mb-1"><span>Masuk</span><span>+{formatQty(r.masuk)} {r.satuan}</span></div>
                <div className="flex justify-between text-xs text-stone-500 mb-2"><span>Keluar</span><span>-{formatQty(r.keluar)} {r.satuan}</span></div>
                <div className={`flex justify-between text-sm font-bold pt-2 border-t border-stone-100 ${r.saldo <= 2 ? "text-amber-600" : "text-emerald-700"}`}>
                  <span>Saldo</span><span>{formatQty(r.saldo)} {r.satuan}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard({ kasUmumTotals, kasPetelurTotals, grandTotals, monthlyData, gudangAlerts }) {
  return (
    <div>
      <div className="mb-6">
        <h2 style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-bold text-stone-800">Ringkasan</h2>
        <p className="text-sm text-stone-500">Update otomatis dari semua transaksi</p>
      </div>

      <div className="rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 text-amber-950 p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold opacity-70">Keuntungan Bersih -- Semua Unit</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-3xl font-bold">{formatRupiah(grandTotals.bersih)}</p>
        </div>
        <div className="text-sm opacity-80 max-w-md">
          Gabungan Kas Umum + Kas RKU Petelur. Transfer dana antar unit otomatis kesaring, jadi angkanya gak dobel hitung.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center gap-2 mb-3"><Wallet className="w-4 h-4 text-emerald-700" /><h3 className="font-semibold text-stone-700">Kas Umum BUMDes</h3></div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Pemasukan" value={kasUmumTotals.pemasukan} tone="positive" />
            <StatCard label="Pengeluaran" value={kasUmumTotals.pengeluaran} tone="negative" />
            <StatCard label="Bersih" value={kasUmumTotals.bersih} tone="highlight" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center gap-2 mb-3"><Egg className="w-4 h-4 text-emerald-700" /><h3 className="font-semibold text-stone-700">Kas RKU Unit Petelur</h3></div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Pemasukan" value={kasPetelurTotals.pemasukan} tone="positive" />
            <StatCard label="Pengeluaran" value={kasPetelurTotals.pengeluaran} tone="negative" />
            <StatCard label="Bersih" value={kasPetelurTotals.bersih} tone="highlight" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6">
        <h3 className="font-semibold text-stone-700 mb-4">Pemasukan vs Pengeluaran per Bulan</h3>
        {monthlyData.length === 0 ? (
          <div className="text-sm text-stone-400 italic py-10 text-center">Belum ada transaksi.</div>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#78716c" }} />
                <YAxis tick={{ fontSize: 11, fill: "#78716c" }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                <Tooltip formatter={(v) => formatRupiah(v)} />
                <Legend />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {gudangAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-amber-600" /><h3 className="font-semibold text-amber-800 text-sm">Stok Menipis</h3></div>
          <ul className="text-sm text-amber-800 space-y-1">
            {gudangAlerts.map((a) => <li key={a.barang}>-- {a.barang}: sisa {formatQty(a.saldo)} {a.satuan}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ImportExportSection({ data, onImportReplace, onReset, computeRingkasan }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const buildWorkbook = (payload) => {
    const wb = XLSX.utils.book_new();
    const mapDebit = (arr) => arr.map((e) => ({ Tanggal: e.tanggal, Uraian: e.uraian, Sumber: e.sumber, "Jumlah (Rp)": e.jumlah }));
    const mapKredit = (arr) => arr.map((e) => ({ Tanggal: e.tanggal, Uraian: e.uraian, Kategori: e.kategori, "Jumlah (Rp)": e.jumlah }));
    const mapGudang = (arr) => arr.map((e) => ({ Tanggal: e.tanggal, "Nama Barang": e.namaBarang, Satuan: e.satuan, Uraian: e.uraian, "Masuk (+)": e.masuk || 0, "Keluar (-)": e.keluar || 0 }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapDebit(payload.kasUmum.debit)), "KasUmum_Debit");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapKredit(payload.kasUmum.kredit)), "KasUmum_Kredit");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapDebit(payload.kasPetelur.debit)), "KasPetelur_Debit");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapKredit(payload.kasPetelur.kredit)), "KasPetelur_Kredit");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapGudang(payload.gudang)), "Gudang");

    const r = computeRingkasan(payload);
    const ringkasan = [
      { Unit: "Kas Umum BUMDes", "Total Pemasukan": r.umum.pemasukan, "Total Pengeluaran": r.umum.pengeluaran, "Keuntungan Bersih": r.umum.bersih },
      { Unit: "Kas RKU Unit Petelur", "Total Pemasukan": r.petelur.pemasukan, "Total Pengeluaran": r.petelur.pengeluaran, "Keuntungan Bersih": r.petelur.bersih },
      { Unit: "TOTAL GABUNGAN", "Total Pemasukan": r.grand.pemasukan, "Total Pengeluaran": r.grand.pengeluaran, "Keuntungan Bersih": r.grand.bersih },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), "Ringkasan");
    return wb;
  };

  const handleExport = () => {
    const wb = buildWorkbook(data);
    XLSX.writeFile(wb, `BUMDes_Mulyoarjo_${todayStr()}.xlsx`);
  };
  const handleTemplate = () => {
    const wb = buildWorkbook(emptyData());
    XLSX.writeFile(wb, `Template_Kosong_BUMDes_Mulyoarjo.xlsx`);
  };

  const handleFile = (file) => {
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wbIn = XLSX.read(evt.target.result, { type: "array" });
        const sheetRows = (name) => (wbIn.Sheets[name] ? XLSX.utils.sheet_to_json(wbIn.Sheets[name]) : []);
        const toDebit = (rows) => rows.map((r) => ({ tanggal: normalizeExcelDate(r.Tanggal), uraian: r.Uraian || "", sumber: r.Sumber || "", jumlah: Number(r["Jumlah (Rp)"] ?? r.Jumlah) || 0 }));
        const toKredit = (rows) => rows.map((r) => ({ tanggal: normalizeExcelDate(r.Tanggal), uraian: r.Uraian || "", kategori: r.Kategori || "", jumlah: Number(r["Jumlah (Rp)"] ?? r.Jumlah) || 0 }));
        const toGudang = (rows) => rows.map((r) => ({ tanggal: normalizeExcelDate(r.Tanggal), namaBarang: r["Nama Barang"] || "", satuan: r.Satuan || "", uraian: r.Uraian || "", masuk: Number(r["Masuk (+)"] ?? r.Masuk) || 0, keluar: Number(r["Keluar (-)"] ?? r.Keluar) || 0 }));

        const next = {
          kasUmum: { debit: toDebit(sheetRows("KasUmum_Debit")), kredit: toKredit(sheetRows("KasUmum_Kredit")) },
          kasPetelur: { debit: toDebit(sheetRows("KasPetelur_Debit")), kredit: toKredit(sheetRows("KasPetelur_Kredit")) },
          gudang: toGudang(sheetRows("Gudang")),
        };
        const totalRows = next.kasUmum.debit.length + next.kasUmum.kredit.length + next.kasPetelur.debit.length + next.kasPetelur.kredit.length + next.gudang.length;
        if (totalRows === 0) {
          setMsg({ type: "error", text: "Gak ada data yang kebaca. Pastikan nama sheet-nya sama kayak hasil Export (KasUmum_Debit, dst)." });
          setBusy(false);
          return;
        }
        await onImportReplace(next);
        setMsg({ type: "success", text: `Berhasil impor ${totalRows} baris ke database.` });
      } catch (err) {
        setMsg({ type: "error", text: "Gagal baca file. Pastikan formatnya .xlsx dan sesuai template." });
      } finally {
        setBusy(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-bold text-stone-800">Impor / Ekspor</h2>
        <p className="text-sm text-stone-500">Pindahkan data antara database dan file Excel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center gap-2 mb-2"><Download className="w-4 h-4 text-emerald-700" /><h3 className="font-semibold text-stone-700">Ekspor</h3></div>
          <p className="text-sm text-stone-500 mb-4">Download semua data jadi satu file .xlsx -- bisa dibuka di Excel atau Google Sheets.</p>
          <button onClick={handleExport} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2 mb-2">
            <Download className="w-4 h-4" /> Export Semua Data (.xlsx)
          </button>
          <button onClick={handleTemplate} className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Download Template Kosong
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center gap-2 mb-2"><Upload className="w-4 h-4 text-emerald-700" /><h3 className="font-semibold text-stone-700">Impor</h3></div>
          <p className="text-sm text-stone-500 mb-4">Upload file .xlsx format yang sama kayak hasil Export. Data lama di database bakal <b>diganti</b>.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Pilih File & Impor
          </button>
          {msg && (
            <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${msg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</div>
          )}
        </div>
      </div>

      <div className="bg-stone-100 border border-stone-200 rounded-2xl p-4 text-sm text-stone-600 mb-6">
        Data kesimpan di database Supabase asli, bukan cuma di browser -- bisa dibuka dari HP atau laptop lain, tetap
        sinkron. Catatan: akses masih pakai kunci publik (belum ada login per staf). Cukup aman buat pemakaian internal,
        tapi kalau nanti mau dipakai banyak orang dengan akun masing-masing, itu bisa ditambahin belakangan.
      </div>

      <div className="bg-white rounded-2xl border border-rose-200 p-5">
        <h3 className="font-semibold text-rose-700 mb-2">Reset Data</h3>
        <p className="text-sm text-stone-500 mb-3">Hapus semua transaksi dari database dan mulai dari kosong. Gak bisa dibatalkan.</p>
        <button onClick={() => setConfirmOpen(true)} className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold rounded-lg px-4 py-2 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Reset ke Data Kosong
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-stone-800 mb-2">Yakin hapus semua data?</h3>
            <p className="text-sm text-stone-500 mb-4">Semua transaksi di database akan dihapus permanen.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 text-sm rounded-lg text-stone-600 hover:bg-stone-100">Batal</button>
              <button onClick={async () => { await onReset(); setConfirmOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700">Ya, Hapus Semua</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dbOk, setDbOk] = useState(true);
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState("dashboard");

  const fetchAll = useCallback(async () => {
    const [kud, kuk, kpd, kpk, gd] = await Promise.all([
      sbSelect("kas_umum_debit"), sbSelect("kas_umum_kredit"),
      sbSelect("kas_petelur_debit"), sbSelect("kas_petelur_kredit"),
      sbSelect("gudang"),
    ]);
    setData({
      kasUmum: { debit: kud.map(rowToEntry), kredit: kuk.map(rowToEntry) },
      kasPetelur: { debit: kpd.map(rowToEntry), kredit: kpk.map(rowToEntry) },
      gudang: gd.map(rowToGudang),
    });
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      await fetchAll();
      setDbOk(true);
    } catch (e) {
      setDbOk(false);
      setData(emptyData());
    }
    setLoaded(true);
  }, [fetchAll]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const computeRingkasan = (payload) => {
    const umum = { pemasukan: sumBy(payload.kasUmum.debit, "jumlah"), pengeluaran: sumBy(payload.kasUmum.kredit, "jumlah") };
    umum.bersih = umum.pemasukan - umum.pengeluaran;
    const petelur = { pemasukan: sumBy(payload.kasPetelur.debit, "jumlah"), pengeluaran: sumBy(payload.kasPetelur.kredit, "jumlah") };
    petelur.bersih = petelur.pemasukan - petelur.pengeluaran;
    const grand = { pemasukan: umum.pemasukan + petelur.pemasukan, pengeluaran: umum.pengeluaran + petelur.pengeluaran };
    grand.bersih = umum.bersih + petelur.bersih;
    return { umum, petelur, grand };
  };

  const ringkasan = useMemo(() => (data ? computeRingkasan(data) : null), [data]);

  const monthlyData = useMemo(() => {
    if (!data) return [];
    const map = {};
    const addTo = (dateStr, key, amount) => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d)) return;
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      if (!map[sortKey]) map[sortKey] = { sortKey, label, pemasukan: 0, pengeluaran: 0 };
      map[sortKey][key] += amount;
    };
    [...data.kasUmum.debit, ...data.kasPetelur.debit].forEach((e) => addTo(e.tanggal, "pemasukan", e.jumlah || 0));
    [...data.kasUmum.kredit, ...data.kasPetelur.kredit].forEach((e) => addTo(e.tanggal, "pengeluaran", e.jumlah || 0));
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [data]);

  const gudangAlerts = useMemo(() => {
    if (!data) return [];
    return BARANG_LIST.map((barang) => {
      const items = data.gudang.filter((e) => e.namaBarang === barang);
      if (!items.length) return null;
      const saldo = sumBy(items, "masuk") - sumBy(items, "keluar");
      return saldo <= 2 ? { barang, saldo, satuan: items[0]?.satuan || "" } : null;
    }).filter(Boolean);
  }, [data]);

  const withErrorHandling = (fn) => async (...args) => {
    try {
      await fn(...args);
      setDbOk(true);
    } catch (e) {
      setDbOk(true);
      setNotice({ type: "error", text: e.message || "Ada masalah nyimpen ke database. Coba lagi." });
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const addEntry = withErrorHandling(async (book, side, entry) => {
    const table = TABLE_MAP[`${book}.${side}`];
    const payload = side === "debit"
      ? { tanggal: entry.tanggal, uraian: entry.uraian, sumber: entry.sumber, jumlah: entry.jumlah }
      : { tanggal: entry.tanggal, uraian: entry.uraian, kategori: entry.kategori, jumlah: entry.jumlah };
    const [row] = await sbInsert(table, [payload]);
    setData((prev) => ({ ...prev, [book]: { ...prev[book], [side]: [...prev[book][side], rowToEntry(row)] } }));
  });

  const deleteEntry = withErrorHandling(async (book, side, id) => {
    const table = TABLE_MAP[`${book}.${side}`];
    await sbDelete(table, id);
    setData((prev) => ({ ...prev, [book]: { ...prev[book], [side]: prev[book][side].filter((e) => e.id !== id) } }));
  });

  const addGudang = withErrorHandling(async (entry) => {
    const payload = { tanggal: entry.tanggal, nama_barang: entry.namaBarang, satuan: entry.satuan, uraian: entry.uraian, masuk: entry.masuk || 0, keluar: entry.keluar || 0 };
    const [row] = await sbInsert("gudang", [payload]);
    setData((prev) => ({ ...prev, gudang: [...prev.gudang, rowToGudang(row)] }));
  });

  const deleteGudang = withErrorHandling(async (id) => {
    await sbDelete("gudang", id);
    setData((prev) => ({ ...prev, gudang: prev.gudang.filter((e) => e.id !== id) }));
  });

  const replaceAllData = withErrorHandling(async (next) => {
    await Promise.all([
      sbDeleteAll("kas_umum_debit"), sbDeleteAll("kas_umum_kredit"),
      sbDeleteAll("kas_petelur_debit"), sbDeleteAll("kas_petelur_kredit"),
      sbDeleteAll("gudang"),
    ]);
    const [kud, kuk, kpd, kpk, gd] = await Promise.all([
      sbInsert("kas_umum_debit", next.kasUmum.debit.map((e) => ({ tanggal: e.tanggal, uraian: e.uraian, sumber: e.sumber, jumlah: e.jumlah }))),
      sbInsert("kas_umum_kredit", next.kasUmum.kredit.map((e) => ({ tanggal: e.tanggal, uraian: e.uraian, kategori: e.kategori, jumlah: e.jumlah }))),
      sbInsert("kas_petelur_debit", next.kasPetelur.debit.map((e) => ({ tanggal: e.tanggal, uraian: e.uraian, sumber: e.sumber, jumlah: e.jumlah }))),
      sbInsert("kas_petelur_kredit", next.kasPetelur.kredit.map((e) => ({ tanggal: e.tanggal, uraian: e.uraian, kategori: e.kategori, jumlah: e.jumlah }))),
      sbInsert("gudang", next.gudang.map((e) => ({ tanggal: e.tanggal, nama_barang: e.namaBarang, satuan: e.satuan, uraian: e.uraian, masuk: e.masuk || 0, keluar: e.keluar || 0 }))),
    ]);
    setData({
      kasUmum: { debit: kud.map(rowToEntry), kredit: kuk.map(rowToEntry) },
      kasPetelur: { debit: kpd.map(rowToEntry), kredit: kpk.map(rowToEntry) },
      gudang: gd.map(rowToGudang),
    });
  });

  const handleReset = () => replaceAllData(emptyData());

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "kasUmum", label: "Kas Umum BUMDes", icon: Wallet },
    { key: "kasPetelur", label: "Kas RKU Petelur", icon: Egg },
    { key: "gudang", label: "Buku Gudang", icon: Warehouse },
    { key: "importExport", label: "Impor / Ekspor", icon: FileSpreadsheet },
  ];

  if (!loaded || !data) {
    return (
      <div className="min-h-100 flex items-center justify-center bg-stone-50">
        <div className="flex items-center gap-2 text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Nyambungin ke database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=JetBrains+Mono:wght@500;600&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <header className="bg-linear-to-r from-emerald-950 to-emerald-800 text-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <EmblemBadge />
          <div>
            <h1 style={{ fontFamily: "'Lora', serif" }} className="text-xl md:text-2xl font-bold leading-tight">Buku Kas BUMDes Mulyoarjo</h1>
            <div className="flex items-center gap-1.5 text-xs md:text-sm text-emerald-200">
              {dbOk ? <Wifi className="w-3.5 h-3.5 text-emerald-300" /> : <WifiOff className="w-3.5 h-3.5 text-rose-300" />}
              <span>{dbOk ? "Tersambung ke database" : "Gagal tersambung -- data kosong sementara"}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={loadInitial} className="text-emerald-200 hover:text-white" title="Refresh data">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-amber-300 text-sm">
              <Banknote className="w-4 h-4" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="font-semibold">{formatRupiah(ringkasan.grand.bersih)}</span>
            </div>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-emerald-700/50">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${active ? "border-amber-400 text-white" : "border-transparent text-emerald-200 hover:text-white"}`}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {notice && (
          <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${notice.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
            {notice.text}
          </div>
        )}

        {tab === "dashboard" && (
          <Dashboard kasUmumTotals={ringkasan.umum} kasPetelurTotals={ringkasan.petelur} grandTotals={ringkasan.grand} monthlyData={monthlyData} gudangAlerts={gudangAlerts} />
        )}
        {tab === "kasUmum" && (
          <LedgerSection
            title="Kas Umum BUMDes" subtitle="Aliran dana pusat BUMDes -- bentuk skontro"
            debitLabel="Sumber Pemasukan" kreditLabel="Kategori Pengeluaran"
            debitOptions={SUMBER_UMUM} kreditOptions={KATEGORI_UMUM}
            debitEntries={data.kasUmum.debit} kreditEntries={data.kasUmum.kredit}
            onAddDebit={(e) => addEntry("kasUmum", "debit", e)}
            onDeleteDebit={(id) => deleteEntry("kasUmum", "debit", id)}
            onAddKredit={(e) => addEntry("kasUmum", "kredit", e)}
            onDeleteKredit={(id) => deleteEntry("kasUmum", "kredit", id)}
          />
        )}
        {tab === "kasPetelur" && (
          <LedgerSection
            title="Kas RKU Unit Petelur" subtitle="Operasional harian kandang -- bentuk skontro"
            debitLabel="Sumber Pemasukan" kreditLabel="Kategori Pengeluaran"
            debitOptions={SUMBER_PETELUR} kreditOptions={KATEGORI_PETELUR}
            debitEntries={data.kasPetelur.debit} kreditEntries={data.kasPetelur.kredit}
            onAddDebit={(e) => addEntry("kasPetelur", "debit", e)}
            onDeleteDebit={(id) => deleteEntry("kasPetelur", "debit", id)}
            onAddKredit={(e) => addEntry("kasPetelur", "kredit", e)}
            onDeleteKredit={(id) => deleteEntry("kasPetelur", "kredit", id)}
          />
        )}
        {tab === "gudang" && <GudangSection entries={data.gudang} onAdd={addGudang} onDelete={deleteGudang} />}
        {tab === "importExport" && (
          <ImportExportSection data={data} onImportReplace={replaceAllData} onReset={handleReset} computeRingkasan={computeRingkasan} />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-6 text-xs text-stone-400 text-center">
        Data tersimpan di database BUMDes Mulyoarjo -- otomatis update di semua perangkat.
      </footer>
    </div>
  );
}
