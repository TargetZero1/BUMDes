import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, FileSpreadsheet, LayoutDashboard, RefreshCw, Users, Wallet, Warehouse, Wifi, WifiOff } from 'lucide-react';
import AuthPanel from './components/AuthPanel';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import { KATEGORI_UNIT, ROLE_LABELS, SUMBER_UNIT, TABLE_MAP, UNIT_SCOPE_ALL } from './lib/constants';
import { sbDelete, sbDeleteWhere, sbInsert, sbSelect } from './lib/api';
import { buildGudangAlerts, buildMonthlyData, computeConsolidatedRingkasan, computeRingkasan } from './lib/analytics';
import { emptyData, rowToEntry, rowToGudang } from './lib/data';
import { formatRupiah } from './lib/formatters';
import { dbSignIn, dbSignUp } from './lib/auth';
import { subscribeGudangRealtime, subscribeTableRealtime } from './lib/realtime';
import { supabase } from './lib/supabaseClient';
import { clearSession, loadSession, saveSession } from './lib/session';

const Dashboard = lazy(() => import('./components/Dashboard'));
const ApprovalQueue = lazy(() => import('./components/ApprovalQueue'));
const GudangSection = lazy(() => import('./components/GudangSection'));
const KasUmumBumdes = lazy(() => import('./components/KasUmumBumdes'));
const LedgerSection = lazy(() => import('./components/LedgerSection'));
const OperatorDashboard = lazy(() => import('./components/OperatorDashboard'));
const TransferToUnit = lazy(() => import('./components/TransferToUnit'));
const UnitsManager = lazy(() => import('./components/UnitsManager'));
const ImportExportSection = lazy(() => import('./components/ImportExportSection'));

const TabFallback = () => <div className="py-8 text-center text-sm text-text-muted">Memuat…</div>;

const UNIT_DATA_TABLES = ['ledger_debit', 'ledger_kredit', 'gudang'];

function unitQuery(scopeUnitId) {
  return `select=*&order=tanggal.desc${scopeUnitId ? `&unit_id=eq.${scopeUnitId}` : ''}`;
}

function toDebitInsert(entry, unitId, userId) {
  return {
    tanggal: entry.tanggal,
    uraian: entry.uraian,
    sumber: entry.sumber,
    jumlah: entry.jumlah,
    unit_id: unitId,
    created_by: userId,
  };
}

function toKreditInsert(entry, unitId, userId) {
  return {
    tanggal: entry.tanggal,
    uraian: entry.uraian,
    kategori: entry.kategori,
    jumlah: entry.jumlah,
    unit_id: unitId,
    created_by: userId,
  };
}

function toGudangInsert(entry, unitId, userId) {
  return {
    tanggal: entry.tanggal,
    nama_barang: entry.namaBarang,
    satuan: entry.satuan,
    uraian: entry.uraian,
    masuk: entry.masuk || 0,
    keluar: entry.keluar || 0,
    kategori: entry.kategori || null,
    harga_beli: entry.hargaBeli ?? null,
    harga_jual: entry.hargaJual ?? null,
    kode: entry.kode || null,
    unit_id: unitId,
    created_by: userId,
  };
}

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  kasUmum: 'Kas Umum BUMDes',
  kasUnit: 'Kas Unit',
  gudang: 'Buku Gudang',
  kirimDana: 'Kirim Dana ke Unit',
  persetujuan: 'Persetujuan Kirim Dana',
  operator: 'Overview Semua Unit',
  units: 'Manage Units',
  importExport: 'Impor / Ekspor',
};

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authMessage, setAuthMessage] = useState(null);
  const [profile, setProfile] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState(UNIT_SCOPE_ALL);
  const [data, setData] = useState(null);
  const [allUnitsLedger, setAllUnitsLedger] = useState({ debit: [], kredit: [] });
  const [loaded, setLoaded] = useState(false);
  const [dbOk, setDbOk] = useState(true);
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isApprover = profile?.role === 'bendahara' || profile?.role === 'direktur';
  const isOperator = profile?.role === 'super_admin' || profile?.role === 'operator' || profile?.can_view_all || isApprover;
  const selectedUnit = useMemo(() => units.find((unit) => unit.id === selectedUnitId) ?? null, [units, selectedUnitId]);
  const currentUnitId = isOperator ? (selectedUnitId === UNIT_SCOPE_ALL ? null : selectedUnitId) : profile?.unit_id ?? null;
  const currentUnitLabel = selectedUnitId === UNIT_SCOPE_ALL ? 'Semua Unit' : selectedUnit?.name || 'Unit aktif';
  const overviewOnly = isOperator && selectedUnitId === UNIT_SCOPE_ALL;
  const isToko = Boolean(selectedUnit?.is_toko);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  const loadUnits = useCallback(async () => {
    try {
      const rows = await sbSelect('units', { query: 'select=id,name,code,type,is_toko,is_active&order=name.asc' });
      setUnits(rows || []);
    } catch {
      setUnits([]);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const loadProfile = useCallback(async (userId, accessToken, fallbackProfile = null) => {
    try {
      const rows = await sbSelect('profiles', {
        accessToken,
        query: `select=id,full_name,phone,role,unit_id,status,can_view_all&id=eq.${userId}`,
      });
      const nextProfile = rows?.[0] ?? fallbackProfile ?? null;
      setProfile(nextProfile);

      if (nextProfile?.role === 'super_admin' || nextProfile?.role === 'operator' || nextProfile?.role === 'bendahara' || nextProfile?.role === 'direktur' || nextProfile?.can_view_all) {
        setSelectedUnitId((current) => (current === UNIT_SCOPE_ALL ? UNIT_SCOPE_ALL : current));
      } else if (nextProfile?.unit_id) {
        setSelectedUnitId(nextProfile.unit_id);
      }
    } catch {
      const nextProfile = fallbackProfile ?? null;
      setProfile(nextProfile);

      if (nextProfile?.role === 'super_admin' || nextProfile?.role === 'operator' || nextProfile?.role === 'bendahara' || nextProfile?.role === 'direktur' || nextProfile?.can_view_all) {
        setSelectedUnitId((current) => (current === UNIT_SCOPE_ALL ? UNIT_SCOPE_ALL : current));
      } else if (nextProfile?.unit_id) {
        setSelectedUnitId(nextProfile.unit_id);
      }
    }
  }, []);

  const loadDataForScope = useCallback(async (accessToken, scopeUnitId, canLoadCentral) => {
    const unitScoped = scopeUnitId ? unitQuery(scopeUnitId) : null;

    const [kud, kuk, aud, auk] = canLoadCentral
      ? await Promise.all([
          sbSelect('kas_umum_debit', { accessToken, query: 'select=*&order=tanggal.desc' }),
          sbSelect('kas_umum_kredit', { accessToken, query: 'select=*&order=tanggal.desc' }),
          sbSelect('ledger_debit', { accessToken, query: 'select=*&order=tanggal.desc' }),
          sbSelect('ledger_kredit', { accessToken, query: 'select=*&order=tanggal.desc' }),
        ])
      : [[], [], [], []];

    const [lud, luk, gd] = unitScoped
      ? await Promise.all([
          sbSelect('ledger_debit', { accessToken, query: unitScoped }),
          sbSelect('ledger_kredit', { accessToken, query: unitScoped }),
          sbSelect('gudang', { accessToken, query: unitScoped }),
        ])
      : [[], [], []];

    setData({
      kasUmum: { debit: kud.map(rowToEntry), kredit: kuk.map(rowToEntry) },
      kasUnit: { debit: lud.map(rowToEntry), kredit: luk.map(rowToEntry) },
      gudang: gd.map(rowToGudang),
    });
    setAllUnitsLedger({ debit: aud.map(rowToEntry), kredit: auk.map(rowToEntry) });
    setDbOk(true);
    setLoaded(true);
  }, []);

  // The `supabase` client (used only for Realtime) is created with the static
  // anon key and never learns about the real per-user session minted by
  // dbSignIn -- REST calls attach that token manually per-request (see
  // sbHeaders), but Realtime's server-side RLS check runs against whatever
  // JWT is set on this client's own session. Without this, every Realtime
  // connection is anonymous and RLS silently drops every event.
  useEffect(() => {
    if (session?.access_token && session?.refresh_token) {
      supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    } else {
      supabase.auth.signOut();
    }
  }, [session?.access_token, session?.refresh_token]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setData(null);
      setLoaded(false);
      setSelectedUnitId(UNIT_SCOPE_ALL);
      setTab('dashboard');
      setNavOpen(false);
      return;
    }

    let active = true;
    setLoaded(false);

    loadProfile(session.user.id, session.access_token, session.user).catch(() => {
      if (!active) return;
      const fallbackProfile = session.user ?? null;
      if (fallbackProfile) {
        setProfile(fallbackProfile);
      } else {
        setProfile({
          id: session.user.id,
          full_name: session.user.email || 'User',
          role: 'viewer',
          unit_id: null,
          status: 'pending',
          can_view_all: false,
        });
      }
      setAuthMessage({ type: 'error', text: 'Profil user belum siap. Hubungi operator untuk approval.' });
    });

    return () => {
      active = false;
    };
  }, [session, loadProfile]);

  useEffect(() => {
    if (!session || !profile || profile.status !== 'approved') return;
    const scopeUnitId = isOperator && selectedUnitId === UNIT_SCOPE_ALL ? null : currentUnitId;

    let active = true;
    setLoaded(false);

    loadDataForScope(session.access_token, scopeUnitId, isOperator).catch((error) => {
      if (!active) return;
      setDbOk(false);
      setNotice({ type: 'error', text: error.message || 'Gagal ambil data. Coba muat ulang.' });
      setData(emptyData());
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [session, profile, currentUnitId, selectedUnitId, isOperator, loadDataForScope]);

  const refreshData = useCallback(async () => {
    if (!session || !profile || profile.status !== 'approved') return;
    try {
      const scopeUnitId = isOperator && selectedUnitId === UNIT_SCOPE_ALL ? null : currentUnitId;
      await Promise.all([loadDataForScope(session.access_token, scopeUnitId, isOperator), loadUnits()]);
    } catch (error) {
      setDbOk(false);
      setNotice({ type: 'error', text: error.message || 'Gagal refresh data.' });
    }
  }, [session, profile, isOperator, selectedUnitId, currentUnitId, loadDataForScope, loadUnits]);

  // Keep this unit's Gudang stock realtime -- any insert/update/delete refreshes automatically.
  useEffect(() => {
    if (!session || !profile || profile.status !== 'approved' || !currentUnitId) return undefined;
    const unsubscribe = subscribeGudangRealtime(currentUnitId, () => {
      refreshData();
    });
    return unsubscribe;
  }, [session, profile, currentUnitId, refreshData]);

  // Ledgers/kas/units are shared, cross-user data -- any insert/update/delete by
  // anyone (a transfer approval, a unit being added, etc.) should be reflected
  // for every connected client without them having to hit refresh.
  useEffect(() => {
    if (!session || !profile || profile.status !== 'approved') return undefined;
    const tables = ['ledger_debit', 'ledger_kredit', 'kas_umum_debit', 'kas_umum_kredit', 'units'];
    const unsubscribes = tables.map((table) =>
      subscribeTableRealtime(`${table}-realtime`, table, null, () => refreshData())
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [session, profile, refreshData]);

  // Keep the signed-in user's own profile (name, phone, role, status) live --
  // e.g. a Pengaturan Akun change from another tab/device, or an operator
  // approving this account, should reflect here without a manual refresh.
  useEffect(() => {
    if (!session || !profile?.id) return undefined;
    return subscribeTableRealtime(`own-profile-realtime-${profile.id}`, 'profiles', `id=eq.${profile.id}`, () => {
      loadProfile(session.user.id, session.access_token, session.user);
    });
  }, [session, profile?.id, loadProfile]);

  const handleLogin = async ({ phone, password }) => {
    setAuthBusy(true);
    setAuthMessage(null);
    try {
      const sess = await dbSignIn({ phone, password });
      setSession(sess);
      saveSession(sess);
      setAuthBusy(false);
      return;
    } catch (err) {
      setAuthMessage({ type: 'error', text: err.message || 'Gagal masuk.' });
    }
    setAuthBusy(false);
  };

  const handleSignup = async ({ fullName, phone, password, unitId, customUnitName, customUnitType }) => {
    setAuthBusy(true);
    setAuthMessage(null);

    try {
      const sess = await dbSignUp({
        fullName,
        phone,
        password,
        requested_unit_id: unitId && unitId !== 'other' ? unitId : null,
        requested_unit_name: unitId === 'other' ? customUnitName : null,
        requested_unit_type: unitId === 'other' ? customUnitType : null,
      });
      setSession(sess);
      saveSession(sess);
      setAuthBusy(false);
      setAuthMessage({ type: 'success', text: 'Pendaftaran berhasil. Menunggu konfirmasi Operator.' });
    } catch (err) {
      setAuthMessage({ type: 'error', text: err.message || 'Gagal daftar.' });
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    clearSession();
    setSession(null);
    setProfile(null);
    setData(null);
    setLoaded(false);
    setSelectedUnitId(UNIT_SCOPE_ALL);
    setTab('dashboard');
    setNavOpen(false);
  };

  const withErrorHandling = (fn) => async (...args) => {
    try {
      await fn(...args);
      setDbOk(true);
    } catch (error) {
      setDbOk(false);
      setNotice({ type: 'error', text: error.message || 'Ada masalah nyimpen ke database. Coba lagi.' });
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const addEntry = withErrorHandling(async (book, side, entry) => {
    const table = TABLE_MAP[`${book}.${side}`];
    const unitId = book === 'kasUmum' ? null : currentUnitId;
    if (book === 'kasUnit' && !unitId) throw new Error('Pilih unit dulu sebelum input data.');
    const payload = side === 'debit' ? toDebitInsert(entry, unitId, session.user.id) : toKreditInsert(entry, unitId, session.user.id);
    const [row] = await sbInsert(table, [payload], { accessToken: session.access_token });
    setData((previous) => ({
      ...previous,
      [book]: { ...previous[book], [side]: [...previous[book][side], rowToEntry(row)] },
    }));
  });

  const deleteEntry = withErrorHandling(async (book, side, id) => {
    const table = TABLE_MAP[`${book}.${side}`];
    await sbDelete(table, id, { accessToken: session.access_token });
    setData((previous) => ({
      ...previous,
      [book]: { ...previous[book], [side]: previous[book][side].filter((entry) => entry.id !== id) },
    }));
  });

  const addGudang = withErrorHandling(async (entry) => {
    if (!currentUnitId) throw new Error('Pilih unit dulu sebelum input data.');
    const payload = toGudangInsert(entry, currentUnitId, session.user.id);
    const [row] = await sbInsert('gudang', [payload], { accessToken: session.access_token });
    setData((previous) => ({ ...previous, gudang: [...previous.gudang, rowToGudang(row)] }));
  });

  const deleteGudang = withErrorHandling(async (id) => {
    await sbDelete('gudang', id, { accessToken: session.access_token });
    setData((previous) => ({ ...previous, gudang: previous.gudang.filter((entry) => entry.id !== id) }));
  });

  const replaceAllData = withErrorHandling(async (next) => {
    if (!currentUnitId) throw new Error('Pilih unit dulu sebelum impor atau reset.');
    await Promise.all(UNIT_DATA_TABLES.map((table) => sbDeleteWhere(table, `unit_id=eq.${currentUnitId}`, { accessToken: session.access_token })));

    const [lud, luk, gd] = await Promise.all([
      sbInsert('ledger_debit', (next.kasUnit?.debit || []).map((entry) => toDebitInsert(entry, currentUnitId, session.user.id)), { accessToken: session.access_token }),
      sbInsert('ledger_kredit', (next.kasUnit?.kredit || []).map((entry) => toKreditInsert(entry, currentUnitId, session.user.id)), { accessToken: session.access_token }),
      sbInsert('gudang', (next.gudang || []).map((entry) => toGudangInsert(entry, currentUnitId, session.user.id)), { accessToken: session.access_token }),
    ]);

    setData((previous) => ({
      kasUmum: previous.kasUmum,
      kasUnit: { debit: lud.map(rowToEntry), kredit: luk.map(rowToEntry) },
      gudang: gd.map(rowToGudang),
    }));
  });

  const navGroups = useMemo(() => {
    const mainItems = [{ key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    if (isOperator) mainItems.push({ key: 'kasUmum', label: 'Kas Umum BUMDes', icon: Wallet });
    if (!overviewOnly) {
      mainItems.push({ key: 'kasUnit', label: `Kas Unit${selectedUnit ? ` — ${selectedUnit.name}` : ''}`, icon: Wallet });
      mainItems.push({ key: 'gudang', label: 'Buku Gudang', icon: Warehouse });
    }

    const groups = [{ label: 'Utama', items: mainItems }];

    if (isOperator) {
      const operatorItems = [
        { key: 'kirimDana', label: 'Kirim Dana ke Unit', icon: ArrowLeftRight },
        { key: 'operator', label: 'Overview Semua Unit', icon: LayoutDashboard },
        { key: 'units', label: 'Manage Units', icon: Users },
      ];
      if (isApprover) operatorItems.push({ key: 'persetujuan', label: 'Persetujuan Kirim Dana', icon: CheckCircle2 });
      groups.push({ label: 'Operator', items: operatorItems });
    }

    groups.push({ label: 'Lainnya', items: [{ key: 'importExport', label: 'Impor / Ekspor', icon: FileSpreadsheet }] });

    return groups;
  }, [isOperator, isApprover, overviewOnly, selectedUnit]);

  const handleTabChange = (key) => {
    setTab(key);
    setNavOpen(false);
  };

  const pendingRender = profile && profile.status !== 'approved';

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex items-center gap-2 text-text-muted">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Menyiapkan akses...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthPanel
        units={units}
        busy={authBusy}
        message={authMessage}
        mode={authMode}
        onModeChange={setAuthMode}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />
    );
  }

  if (pendingRender) {
    return (
      <div className="min-h-screen px-4 py-10 text-text">
        <div className="mx-auto max-w-2xl rounded-4xl border border-gold-500/30 bg-surface-2 p-8 shadow-xl shadow-ink/5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 dark:text-gold-400">Menunggu Persetujuan</p>
          <h1 className="text-3xl font-bold text-text" style={{ fontFamily: "'Lora', serif" }}>
            Akun kamu sudah dibuat
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Status akun saat ini <span className="font-semibold">{profile.status}</span>. Setelah Operator menyetujui, kamu bisa masuk ke dashboard.
          </p>
          <div className="mt-6 rounded-2xl bg-gold-500/10 p-4 text-sm text-gold-700 dark:text-gold-300">
            Role yang diminta: <span className="font-semibold">{ROLE_LABELS[profile.role] || profile.role}</span>
            {profile.unit_id ? (
              <>
                {' '}
                untuk unit <span className="font-semibold">{units.find((unit) => unit.id === profile.unit_id)?.name || profile.unit_id}</span>
              </>
            ) : null}
          </div>
          <button onClick={handleLogout} className="mt-6 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink-2">
            Keluar
          </button>
        </div>
      </div>
    );
  }

  if (!loaded || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex items-center gap-2 text-text-muted">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat data unit...</span>
        </div>
      </div>
    );
  }

  const ringkasan = computeRingkasan(data);
  const consolidatedRingkasan = computeConsolidatedRingkasan(data.kasUmum.debit, data.kasUmum.kredit, allUnitsLedger.debit, allUnitsLedger.kredit);
  const dashboardGrandTotals = isOperator ? consolidatedRingkasan : ringkasan.unit;
  const dashboardKasUmumTotals = isOperator ? consolidatedRingkasan : null;
  const dashboardMonthlyData = isOperator ? buildMonthlyData({ kasUmum: data.kasUmum, kasUnit: allUnitsLedger }) : buildMonthlyData(data);
  const activeUnitsCount = units.filter((unit) => unit.is_active).length;

  return (
    <div className="flex min-h-screen bg-surface text-text" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=JetBrains+Mono:wght@500;600&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <Sidebar
        navGroups={navGroups}
        tab={tab}
        onTabChange={handleTabChange}
        profile={profile}
        navOpen={navOpen}
        onNavToggle={() => setNavOpen((open) => !open)}
        onLogout={handleLogout}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setNavOpen(false);
        }}
      />

      {settingsOpen && (
        <SettingsModal
          profile={profile}
          session={session}
          onClose={() => setSettingsOpen(false)}
          onSaved={(updated) => setProfile((current) => ({ ...current, ...updated }))}
        />
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-2/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 pl-14 lg:pl-6">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-text" style={{ fontFamily: "'Lora', serif" }}>
                {PAGE_TITLES[tab] || 'Dashboard'}
              </h1>
              <div className="flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
                {dbOk ? <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5 shrink-0 text-rose-600" />}
                <span className="truncate">{dbOk ? `Tersambung ke database • ${currentUnitLabel}` : 'Gagal tersambung -- data kosong sementara'}</span>
              </div>
            </div>

            {isOperator && (
              <select
                value={selectedUnitId}
                onChange={(event) => setSelectedUnitId(event.target.value)}
                className="hidden max-w-48 rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-gold-500 sm:block"
              >
                <option value={UNIT_SCOPE_ALL}>Semua Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            )}

            <button onClick={refreshData} className="rounded-lg border border-border-subtle p-2 text-text-muted hover:bg-surface" title="Refresh data">
              <RefreshCw className="h-4 w-4" />
            </button>

            <div className="hidden items-center gap-1.5 rounded-xl bg-gold-500/10 px-3 py-2 text-sm text-gold-700 dark:text-gold-300 sm:flex">
              <span className="font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatRupiah(dashboardGrandTotals.bersih)}
              </span>
            </div>
          </div>

          {isOperator && (
            <div className="border-t border-border-subtle px-4 py-2 sm:hidden">
              <select
                value={selectedUnitId}
                onChange={(event) => setSelectedUnitId(event.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-gold-500"
              >
                <option value={UNIT_SCOPE_ALL}>Semua Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">
          {overviewOnly && (tab === 'kasUnit' || tab === 'gudang') && (
            <div className="mb-4 rounded-2xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-gold-700 dark:text-gold-300">
              Kamu sedang melihat overview semua unit. Untuk input, edit, impor, atau reset data unit, pilih satu unit dulu.
            </div>
          )}

          {notice && (
            <div
              className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${
                notice.type === 'error'
                  ? 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
              }`}
            >
              {notice.text}
            </div>
          )}

          <div key={tab} className="animate-fade-in">
          {tab === 'dashboard' && (
            <Suspense fallback={<TabFallback />}>
              <Dashboard
                kasUmumTotals={dashboardKasUmumTotals}
                kasUnitTotals={!overviewOnly ? ringkasan.unit : null}
                unitLabel={selectedUnit?.name}
                grandTotals={dashboardGrandTotals}
                monthlyData={dashboardMonthlyData}
                gudangAlerts={buildGudangAlerts(data)}
                unitsCount={activeUnitsCount}
                isOperator={isOperator}
                onQuickAction={() => handleTabChange('kirimDana')}
              />
            </Suspense>
          )}

          {tab === 'kasUmum' && isOperator && (
            <Suspense fallback={<TabFallback />}>
              <KasUmumBumdes
                units={units}
                kasUmumEntries={data.kasUmum}
                allUnitsLedger={allUnitsLedger}
                onAddDebit={(entry) => addEntry('kasUmum', 'debit', entry)}
                onDeleteDebit={(id) => deleteEntry('kasUmum', 'debit', id)}
                onAddKredit={(entry) => addEntry('kasUmum', 'kredit', entry)}
                onDeleteKredit={(id) => deleteEntry('kasUmum', 'kredit', id)}
              />
            </Suspense>
          )}

          {tab === 'kasUnit' && (!overviewOnly ? (
            <Suspense fallback={<TabFallback />}>
              <div>
                <LedgerSection
                  title={`Kas Unit — ${selectedUnit?.name || currentUnitLabel}`}
                  subtitle="Kas operasional unit -- bentuk skontro"
                  debitLabel="Sumber Pemasukan"
                  kreditLabel="Kategori Pengeluaran"
                  debitOptions={SUMBER_UNIT}
                  kreditOptions={KATEGORI_UNIT}
                  debitEntries={data.kasUnit.debit}
                  kreditEntries={data.kasUnit.kredit}
                  onAddDebit={(entry) => addEntry('kasUnit', 'debit', entry)}
                  onDeleteDebit={(id) => deleteEntry('kasUnit', 'debit', id)}
                  onAddKredit={(entry) => addEntry('kasUnit', 'kredit', entry)}
                  onDeleteKredit={(id) => deleteEntry('kasUnit', 'kredit', id)}
                />
                <div className="mt-6">
                  <TransferToUnit session={session} profile={profile} units={units} canSend={false} currentUnitId={currentUnitId} />
                </div>
              </div>
            </Suspense>
          ) : (
            <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-2 p-6 text-sm text-text-muted">
              Pilih satu unit di header untuk mengelola data kas.
            </div>
          ))}

          {tab === 'gudang' && (!overviewOnly ? (
            <Suspense fallback={<TabFallback />}>
              <GudangSection entries={data.gudang} onAdd={addGudang} onDelete={deleteGudang} isToko={isToko} unitLabel={selectedUnit?.name} />
            </Suspense>
          ) : (
            <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-2 p-6 text-sm text-text-muted">
              Pilih satu unit di header untuk mengelola gudang.
            </div>
          ))}

          {tab === 'kirimDana' && isOperator && (
            <Suspense fallback={<TabFallback />}>
              <TransferToUnit session={session} profile={profile} units={units} canSend currentUnitId={currentUnitId} />
            </Suspense>
          )}

          {tab === 'operator' && isOperator && (
            <Suspense fallback={<TabFallback />}>
              <div>
                <OperatorDashboard session={session} />
              </div>
            </Suspense>
          )}

          {tab === 'units' && isOperator && (
            <Suspense fallback={<TabFallback />}>
              <div>
                <UnitsManager session={session} />
              </div>
            </Suspense>
          )}

          {tab === 'persetujuan' && isApprover && (
            <Suspense fallback={<TabFallback />}>
              <ApprovalQueue session={session} profile={profile} units={units} />
            </Suspense>
          )}

          {tab === 'importExport' && (!overviewOnly ? (
            <Suspense fallback={<TabFallback />}>
              <ImportExportSection data={data} onImportReplace={replaceAllData} computeRingkasan={computeRingkasan} profile={profile} selectedUnitId={selectedUnitId} currentUnitLabel={currentUnitLabel} session={session} />
            </Suspense>
          ) : (
            <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-2 p-6 text-sm text-text-muted">
              Pilih satu unit di header untuk impor / ekspor data.
            </div>
          ))}
          </div>
        </main>

        <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs text-text-muted lg:px-8">
          <div>Data tersimpan di database BUMDes Mulyoarjo — otomatis update di semua perangkat.</div>
          <div className="mt-1">Brand: MSA • Contact: Bu Shefi — +62 896-5658-9449</div>
        </footer>
      </div>
    </div>
  );
}
