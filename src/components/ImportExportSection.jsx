import { useRef, useState, useEffect } from 'react';
import { Download, Eye, FileSpreadsheet, Loader2, Undo2, Upload, AlertCircle, CheckCircle, Lock, History } from 'lucide-react';
import { buildWorkbook, createEmptyWorkbook, downloadWorkbook, parseImportedWorkbook } from '../lib/excel';
import { sbInsert, sbPatch, sbSelect } from '../lib/api';
import { todayStr } from '../lib/formatters';

const HISTORY_COUNT_ROWS = [
  { label: 'Kas Unit Debit', key: 'debit' },
  { label: 'Kas Unit Kredit', key: 'kredit' },
  { label: 'Gudang', key: 'gudang' },
];

export default function ImportExportSection({ data, onImportReplace, computeRingkasan, profile, selectedUnitId, currentUnitLabel, session }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [validationOpen, setValidationOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [rollbackConfirm, setRollbackConfirm] = useState(null);
  const [rollbackBusyId, setRollbackBusyId] = useState(null);

  const canExport = profile?.role !== 'viewer';
  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'operator';

  // Load import history
  useEffect(() => {
    loadImportHistory();
  }, [selectedUnitId, session?.access_token]);

  const loadImportHistory = async () => {
    if (!session?.access_token || !selectedUnitId) return;
    setLoadingHistory(true);
    try {
      const rows = await sbSelect('import_history', {
        accessToken: session.access_token,
        query: `select=*,importer:profiles!imported_by(full_name)&unit_id=eq.${selectedUnitId}&order=created_at.desc&limit=10`
      });
      setHistory(rows || []);
    } catch (error) {
      console.error('Failed to load import history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveImportHistory = async (fileName, totalRows, warnings_array, snapshotBefore, next) => {
    if (!session?.access_token || !profile?.id) return;
    try {
      const countsBefore = {
        debit: snapshotBefore?.kasUnit?.debit?.length || 0,
        kredit: snapshotBefore?.kasUnit?.kredit?.length || 0,
        gudang: snapshotBefore?.gudang?.length || 0,
      };
      const countsAfter = {
        debit: next?.kasUnit?.debit?.length || 0,
        kredit: next?.kasUnit?.kredit?.length || 0,
        gudang: next?.gudang?.length || 0,
      };
      await sbInsert('import_history', {
        unit_id: selectedUnitId,
        imported_by: profile.id,
        file_name: fileName,
        total_rows: totalRows,
        warnings: warnings_array || [],
        status: 'completed',
        snapshot_before: snapshotBefore,
        counts_before: countsBefore,
        counts_after: countsAfter,
      }, { accessToken: session.access_token });
      loadImportHistory();
    } catch (error) {
      console.error('Failed to save import history:', error);
    }
  };

  const handleExport = async () => {
    if (!canExport) return;
    const workbook = await buildWorkbook(data, computeRingkasan, profile, selectedUnitId, currentUnitLabel);
    await downloadWorkbook(workbook, `BMSA_Export_${todayStr()}_MSA.xlsx`);
    setMsg({ type: 'success', text: 'File berhasil di-download.' });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleTemplate = async () => {
    const workbook = await createEmptyWorkbook(computeRingkasan, profile);
    await downloadWorkbook(workbook, 'Template_BMSA_MSA.xlsx');
    setMsg({ type: 'success', text: 'Template kosong berhasil di-download.' });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleFile = (file) => {
    if (!file) return;
    setBusy(true);
    setWarnings([]);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { next, totalRows, warnings: importWarnings } = parseImportedWorkbook(event.target.result, data);
        if (totalRows === 0) {
          setMsg({ type: 'error', text: 'Gak ada data yang kebaca. Pastikan nama sheet-nya sama kayak hasil Export.' });
          setBusy(false);
          return;
        }

        // Store pending import and show validation modal
        setPendingImport({ next, totalRows, fileName: file.name, warnings: importWarnings || [] });
        setWarnings(importWarnings || []);
        setValidationOpen(true);
      } catch (error) {
        const errorMsg = error.message || 'Gagal baca file. Pastikan formatnya .xlsx dan sesuai template.';
        setMsg({ type: 'error', text: errorMsg });
      } finally {
        setBusy(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    setBusy(true);
    try {
      const snapshotBefore = {
        kasUnit: { debit: data.kasUnit?.debit || [], kredit: data.kasUnit?.kredit || [] },
        gudang: data.gudang || [],
      };
      await onImportReplace(pendingImport.next);
      await saveImportHistory(pendingImport.fileName, pendingImport.totalRows, pendingImport.warnings, snapshotBefore, pendingImport.next);
      setMsg({ type: 'success', text: `✓ Berhasil impor ${pendingImport.totalRows} baris ke database.` });
      setValidationOpen(false);
      setPendingImport(null);
      setTimeout(() => {
        setMsg(null);
        setWarnings([]);
      }, 5000);
    } catch (error) {
      const errorMsg = error.message || 'Gagal menyimpan data.';
      setMsg({ type: 'error', text: errorMsg });
    } finally {
      setBusy(false);
    }
  };

  const handleRollback = async (record) => {
    if (!record?.snapshot_before || record.rolled_back_at) return;
    setRollbackBusyId(record.id);
    try {
      await onImportReplace(record.snapshot_before);
      await sbPatch('import_history', record.id, {
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: profile.id,
      }, { accessToken: session.access_token });
      setMsg({ type: 'success', text: `✓ Rollback berhasil — data dikembalikan ke sebelum import "${record.file_name}".` });
      setTimeout(() => setMsg(null), 5000);
      loadImportHistory();
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'Gagal rollback.' });
    } finally {
      setRollbackBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text" style={{ fontFamily: "'Lora', serif" }}>
          Impor / Ekspor
        </h2>
        <p className="text-sm text-text-muted">Pindahkan data antara database dan file Excel dengan validasi lengkap</p>
      </div>

      {/* Role-based access message */}
      {!canExport && (
        <div className="mb-6 rounded-2xl border border-gold-500/30 bg-gold-500/10 p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-gold-600 dark:text-gold-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-gold-700 dark:text-gold-300">Akses Terbatas</div>
            <p className="text-sm text-gold-700 dark:text-gold-300">Role Viewer tidak dapat export atau import data. Hubungi admin untuk mengubah role.</p>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Export Section */}
        <div className={`rounded-2xl border border-border-subtle bg-surface-2 p-5 ${!canExport ? 'opacity-50' : ''}`}>
          <div className="mb-2 flex items-center gap-2">
            <Download className="h-4 w-4 text-ink dark:text-gold-400" />
            <h3 className="font-semibold text-text">Ekspor</h3>
            {isSuperAdmin && <span className="text-xs bg-ink/10 text-ink dark:bg-white/10 dark:text-white/80 px-2 py-1 rounded">Semua Unit</span>}
            {profile?.role === 'unit_admin' && <span className="text-xs bg-gold-500/15 text-gold-700 dark:text-gold-300 px-2 py-1 rounded">Unit Sendiri</span>}
          </div>
          <p className="mb-4 text-sm text-text-muted">
            Download data ke Excel. File akan berisi:
            <br />• Sheet INFO dengan metadata
            <br />• Data lengkap (kas, gudang, ringkasan)
            <br />• Siap untuk diedit dan di-import ulang
          </p>
          <button 
            onClick={handleExport} 
            disabled={!canExport}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-semibold text-white hover:bg-ink-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="h-4 w-4" /> Export Data
          </button>
          <button
            onClick={handleTemplate}
            disabled={!canExport}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface py-2.5 text-sm font-semibold text-text hover:bg-border-subtle/40 disabled:opacity-50 disabled:cursor-not-allowed">
            <FileSpreadsheet className="h-4 w-4" /> Template Kosong
          </button>
        </div>

        {/* Import Section */}
        <div className={`rounded-2xl border border-border-subtle bg-surface-2 p-5 ${!canExport ? 'opacity-50' : ''}`}>
          <div className="mb-2 flex items-center gap-2">
            <Upload className="h-4 w-4 text-ink dark:text-gold-400" />
            <h3 className="font-semibold text-text">Impor</h3>
          </div>
          <p className="mb-4 text-sm text-text-muted">
            Upload file .xlsx. Sistem akan:
            <br />• Validasi format dan struktur sheet
            <br />• Cek duplikat dengan data existing
            <br />• Minta konfirmasi sebelum simpan
          </p>
          <input 
            ref={fileRef} 
            type="file" 
            accept=".xlsx,.xls" 
            disabled={!canExport}
            className="hidden" 
            onChange={(event) => handleFile(event.target.files?.[0])} 
          />
          <button 
            onClick={() => fileRef.current?.click()} 
            disabled={busy || !canExport}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-semibold text-white hover:bg-ink-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Pilih File & Impor
          </button>
          {msg && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
            }`}>
              {msg.type === 'success' ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <div>{msg.text}</div>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 rounded-2xl border border-ink/15 bg-ink/5 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex gap-2">
          <FileSpreadsheet className="h-5 w-5 text-ink dark:text-gold-400 shrink-0 mt-0.5" />
          <div className="text-sm text-text">
            <div className="font-semibold mb-1">📋 Cara Aman Import/Export:</div>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Klik "Export" → simpan file di folder aman</li>
              <li>Buka file Excel, edit data sesuai kebutuhan</li>
              <li><strong>JANGAN</strong> tambah/hapus kolom, jangan rename sheet</li>
              <li>Simpan file dengan format Excel (.xlsx)</li>
              <li>Klik "Impor" → pilih file → review hasil validasi</li>
              <li>Konfirmasi atau batal sebelum data disimpan</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Validation Confirmation Modal */}
      {validationOpen && pendingImport && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-scale-in w-full max-w-2xl rounded-2xl bg-surface-2 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 font-bold text-text text-lg">Validasi & Konfirmasi Import</h3>
            
            <div className="space-y-4 mb-6">
              <div className="rounded-lg bg-ink/5 border border-ink/15 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-ink dark:text-gold-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-text">
                    <div className="font-semibold">File berhasil dibaca:</div>
                    <p className="mt-1">{pendingImport.fileName}</p>
                    <p className="mt-1 font-semibold text-lg">{pendingImport.totalRows} baris siap diimpor</p>
                  </div>
                </div>
              </div>

              {pendingImport.warnings && pendingImport.warnings.length > 0 && (
                <div className="rounded-lg border border-gold-500/30 bg-gold-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-700 dark:text-gold-300">
                    <AlertCircle className="h-4 w-4" /> Peringatan ({pendingImport.warnings.length}):
                  </div>
                  <ul className="space-y-1 text-xs text-gold-700 dark:text-gold-300">
                    {pendingImport.warnings.map((warn, idx) => (
                      <li key={idx}>• {warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg bg-surface p-4 text-xs text-text-muted">
                <div className="font-semibold mb-2 text-text">Metadata:</div>
                <div className="space-y-1">
                  <div>Unit: {currentUnitLabel}</div>
                  <div>User: {profile?.full_name}</div>
                  <div>Waktu: {new Date().toLocaleString('id-ID')}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setValidationOpen(false);
                  setPendingImport(null);
                  setWarnings([]);
                }}
                className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface">
                Batal
              </button>
              <button
                onClick={confirmImport}
                disabled={busy}
                className="rounded-lg bg-ink px-4 py-2 text-sm text-white hover:bg-ink-2 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : ''}
                Ya, Impor Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import History */}
      <div className="mb-6 rounded-2xl border border-border-subtle bg-surface-2 p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-text-muted" />
          <h3 className="font-semibold text-text">Riwayat Import</h3>
          {loadingHistory && <Loader2 className="h-4 w-4 animate-spin text-text-muted" />}
        </div>
        
        {history.length === 0 ? (
          <p className="text-sm text-text-muted">Belum ada import di unit ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-text-muted">
              <thead className="border-b border-border-subtle">
                <tr className="text-left">
                  <th className="pb-2 font-semibold">Tanggal</th>
                  <th className="pb-2 font-semibold">File</th>
                  <th className="pb-2 font-semibold">User</th>
                  <th className="pb-2 font-semibold">Baris</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-surface">
                    <td className="py-2 text-xs whitespace-nowrap">{new Date(record.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="py-2 text-xs truncate max-w-xs" title={record.file_name}>{record.file_name || '-'}</td>
                    <td className="py-2 text-xs whitespace-nowrap">{record.importer?.full_name || '-'}</td>
                    <td className="py-2 font-semibold">{record.total_rows}</td>
                    <td className="py-2">
                      {record.rolled_back_at ? (
                        <span className="text-xs px-2 py-1 rounded bg-gold-500/15 text-gold-700 dark:text-gold-300 whitespace-nowrap">↩ Rolled back</span>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                          record.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-gold-500/15 text-gold-700 dark:text-gold-300'
                        }`}>
                          {record.status === 'completed' ? '✓ Berhasil' : 'Pending'}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewRecord(record)}
                          title="Preview perubahan"
                          className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setRollbackConfirm(record)}
                          disabled={!record.snapshot_before || !!record.rolled_back_at || rollbackBusyId === record.id}
                          title={record.rolled_back_at ? 'Sudah di-rollback' : !record.snapshot_before ? 'Import ini terjadi sebelum fitur rollback ada' : 'Rollback ke sebelum import ini'}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-rose-600 disabled:opacity-30 disabled:hover:text-text-muted dark:hover:text-rose-400">
                          {rollbackBusyId === record.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewRecord && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreviewRecord(null)}>
          <div className="animate-scale-in w-full max-w-lg rounded-2xl bg-surface-2 p-6 max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-1 font-bold text-text text-lg">Preview Import</h3>
            <p className="mb-4 text-xs text-text-muted truncate">{previewRecord.file_name} • {new Date(previewRecord.created_at).toLocaleString('id-ID')}</p>

            {!previewRecord.counts_before && !previewRecord.counts_after ? (
              <p className="mb-4 text-sm text-text-muted">Import ini terjadi sebelum fitur preview ada, jadi rincian per-baris tidak tercatat.</p>
            ) : (
              <div className="mb-4 space-y-2">
                {HISTORY_COUNT_ROWS.map(({ label, key }) => {
                  const before = previewRecord.counts_before?.[key] ?? 0;
                  const after = previewRecord.counts_after?.[key] ?? 0;
                  const delta = after - before;
                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                      <span className="text-text">{label}</span>
                      <span className="text-text-muted">
                        {before} → {after}
                        <span className={`ml-2 font-semibold ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted'}`}>
                          ({delta > 0 ? '+' : ''}{delta})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {previewRecord.warnings?.length > 0 && (
              <div className="mb-4 rounded-lg border border-gold-500/30 bg-gold-500/10 p-3">
                <div className="mb-1 text-xs font-semibold text-gold-700 dark:text-gold-300">Peringatan saat import:</div>
                <ul className="space-y-1 text-xs text-gold-700 dark:text-gold-300">
                  {previewRecord.warnings.map((warn, idx) => (
                    <li key={idx}>• {warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewRecord.rolled_back_at && (
              <p className="mb-4 text-xs text-text-muted">Import ini sudah di-rollback pada {new Date(previewRecord.rolled_back_at).toLocaleString('id-ID')}.</p>
            )}

            <div className="flex justify-end">
              <button onClick={() => setPreviewRecord(null)} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Confirmation Modal */}
      {rollbackConfirm && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-surface-2 p-6">
            <h3 className="mb-2 font-bold text-text">Rollback import ini?</h3>
            <p className="mb-4 text-sm text-text-muted">
              Data unit akan dikembalikan ke kondisi sebelum import "{rollbackConfirm.file_name}" ({new Date(rollbackConfirm.created_at).toLocaleDateString('id-ID')}). Perubahan setelahnya akan hilang.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRollbackConfirm(null)} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface">Batal</button>
              <button
                onClick={() => {
                  const record = rollbackConfirm;
                  setRollbackConfirm(null);
                  handleRollback(record);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
              >
                Ya, Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
