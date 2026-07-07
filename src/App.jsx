import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Egg, FileSpreadsheet, LayoutDashboard, LogOut, Menu, RefreshCw, Wallet, Warehouse, Wifi, WifiOff, X } from 'lucide-react';
import AuthPanel from './components/AuthPanel';
import Dashboard from './components/Dashboard';
import EmblemBadge from './components/EmblemBadge';
import GudangSection from './components/GudangSection';
import ImportExportSection from './components/ImportExportSection';
import LedgerSection from './components/LedgerSection';
import { KATEGORI_PETELUR, KATEGORI_UMUM, ROLE_LABELS, SUMBER_PETELUR, SUMBER_UMUM, TABLE_MAP, UNIT_SCOPE_ALL } from './lib/constants';
import { sbDelete, sbDeleteWhere, sbInsert, sbSelect } from './lib/api';
import { buildGudangAlerts, buildMonthlyData, computeRingkasan } from './lib/analytics';
import { emptyData, rowToEntry, rowToGudang } from './lib/data';
import { formatRupiah } from './lib/formatters';
import { supabase } from './lib/supabaseClient';

const DATA_TABLES = ['kas_umum_debit', 'kas_umum_kredit', 'kas_petelur_debit', 'kas_petelur_kredit', 'gudang'];

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
    unit_id: unitId,
    created_by: userId,
  };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authMessage, setAuthMessage] = useState(null);
  const [profile, setProfile] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState(UNIT_SCOPE_ALL);
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dbOk, setDbOk] = useState(true);
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.can_view_all;
  const selectedUnit = useMemo(() => units.find((unit) => unit.id === selectedUnitId) ?? null, [units, selectedUnitId]);
  const currentUnitId = isSuperAdmin ? (selectedUnitId === UNIT_SCOPE_ALL ? null : selectedUnitId) : profile?.unit_id ?? null;
  const currentUnitLabel = selectedUnitId === UNIT_SCOPE_ALL ? 'Semua Unit' : selectedUnit?.name || 'Unit aktif';
  const overviewOnly = isSuperAdmin && selectedUnitId === UNIT_SCOPE_ALL;

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data: authData }) => {
        if (active) setSession(authData.session ?? null);
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadUnits = useCallback(async () => {
    try {
      const rows = await sbSelect('units', { query: 'select=id,name,code,is_active&order=name.asc' });
      setUnits(rows || []);
    } catch {
      setUnits([]);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const loadProfile = useCallback(async (userId, accessToken) => {
    const rows = await sbSelect('profiles', {
      accessToken,
      query: `select=id,full_name,role,unit_id,status,can_view_all&id=eq.${userId}`,
    });
    const nextProfile = rows?.[0] ?? null;
    setProfile(nextProfile);

    if (nextProfile?.role === 'super_admin' || nextProfile?.can_view_all) {
      setSelectedUnitId((current) => (current === UNIT_SCOPE_ALL ? UNIT_SCOPE_ALL : current));
    } else if (nextProfile?.unit_id) {
      setSelectedUnitId(nextProfile.unit_id);
    }
  }, []);

  const loadDataForScope = useCallback(async (accessToken, scopeUnitId) => {
    const query = unitQuery(scopeUnitId);
    const [kud, kuk, kpd, kpk, gd] = await Promise.all([
      sbSelect('kas_umum_debit', { accessToken, query }),
      sbSelect('kas_umum_kredit', { accessToken, query }),
      sbSelect('kas_petelur_debit', { accessToken, query }),
      sbSelect('kas_petelur_kredit', { accessToken, query }),
      sbSelect('gudang', { accessToken, query }),
    ]);

    setData({
      kasUmum: { debit: kud.map(rowToEntry), kredit: kuk.map(rowToEntry) },
      kasPetelur: { debit: kpd.map(rowToEntry), kredit: kpk.map(rowToEntry) },
      gudang: gd.map(rowToGudang),
    });
    setDbOk(true);
    setLoaded(true);
  }, []);

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

    loadProfile(session.user.id, session.access_token).catch(() => {
      if (!active) return;
      setProfile({
        id: session.user.id,
        full_name: session.user.email || 'User',
        role: 'viewer',
        unit_id: null,
        status: 'pending',
        can_view_all: false,
      });
      setAuthMessage({ type: 'error', text: 'Profil user belum siap. Hubungi super admin untuk approval.' });
    });

    return () => {
      active = false;
    };
  }, [session, loadProfile]);

  useEffect(() => {
    if (!session || !profile || profile.status !== 'approved') return;
    const scopeUnitId = isSuperAdmin && selectedUnitId === UNIT_SCOPE_ALL ? null : currentUnitId;

    let active = true;
    setLoaded(false);

    loadDataForScope(session.access_token, scopeUnitId).catch((error) => {
      if (!active) return;
      setDbOk(false);
      setNotice({ type: 'error', text: error.message || 'Gagal ambil data. Coba muat ulang.' });
      setData(emptyData());
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [session, profile, currentUnitId, selectedUnitId, isSuperAdmin, loadDataForScope]);

  const refreshData = useCallback(async () => {
    if (!session || !profile || profile.status !== 'approved') return;
    try {
      const scopeUnitId = isSuperAdmin && selectedUnitId === UNIT_SCOPE_ALL ? null : currentUnitId;
      await loadDataForScope(session.access_token, scopeUnitId);
    } catch (error) {
      setDbOk(false);
      setNotice({ type: 'error', text: error.message || 'Gagal refresh data.' });
    }
  }, [session, profile, isSuperAdmin, selectedUnitId, currentUnitId, loadDataForScope]);

  const handleLogin = async ({ email, password }) => {
    setAuthBusy(true);
    setAuthMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage({ type: 'error', text: error.message || 'Gagal masuk.' });
    }
    setAuthBusy(false);
  };

  const handleSignup = async ({ fullName, email, password, unitId }) => {
    setAuthBusy(true);
    setAuthMessage(null);

    const maxRetries = 5;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            requested_unit_id: unitId,
            requested_role: 'staff',
          },
        },
      });

      if (!error) {
        setAuthMessage({
          type: 'success',
          text: 'Pendaftaran berhasil. Jika email confirmation aktif, cek inbox kamu. Akun pertama akan otomatis jadi Super Admin.',
        });
        setAuthBusy(false);
        return;
      }

      lastError = error;

      // Only retry on rate limit (429) errors
      if (error.status !== 429 || attempt === maxRetries) {
        setAuthMessage({ type: 'error', text: error.message || 'Gagal daftar.' });
        setAuthBusy(false);
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      setAuthMessage({
        type: 'error',
        text: `Rate limit. Coba ulang dalam ${delayMs / 1000}s... (percobaan ${attempt}/${maxRetries})`,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    setAuthMessage({ type: 'error', text: lastError?.message || 'Gagal daftar setelah 5 percobaan.' });
    setAuthBusy(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    if (!currentUnitId) throw new Error('Pilih unit dulu sebelum input data.');
    const table = TABLE_MAP[`${book}.${side}`];
    const payload = side === 'debit' ? toDebitInsert(entry, currentUnitId, session.user.id) : toKreditInsert(entry, currentUnitId, session.user.id);
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
    await Promise.all(DATA_TABLES.map((table) => sbDeleteWhere(table, `unit_id=eq.${currentUnitId}`, { accessToken: session.access_token })));

    const [kud, kuk, kpd, kpk, gd] = await Promise.all([
      sbInsert('kas_umum_debit', next.kasUmum.debit.map((entry) => toDebitInsert(entry, currentUnitId, session.user.id)), { accessToken: session.access_token }),
      sbInsert('kas_umum_kredit', next.kasUmum.kredit.map((entry) => toKreditInsert(entry, currentUnitId, session.user.id)), { accessToken: session.access_token }),
      sbInsert('kas_petelur_debit', next.kasPetelur.debit.map((entry) => toDebitInsert(entry, currentUnitId, session.user.id)), { accessToken: session.access_token }),
      sbInsert('kas_petelur_kredit', next.kasPetelur.kredit.map((entry) => toKreditInsert(entry, currentUnitId, session.user.id)), { accessToken: session.access_token }),
      sbInsert('gudang', next.gudang.map((entry) => toGudangInsert(entry, currentUnitId, session.user.id)), { accessToken: session.access_token }),
    ]);

    setData({
      kasUmum: { debit: kud.map(rowToEntry), kredit: kuk.map(rowToEntry) },
      kasPetelur: { debit: kpd.map(rowToEntry), kredit: kpk.map(rowToEntry) },
      gudang: gd.map(rowToGudang),
    });
  });

  const handleReset = () => replaceAllData(emptyData());

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'kasUmum', label: 'Kas Umum BUMDes', icon: Wallet },
    { key: 'kasPetelur', label: 'Kas RKU Petelur', icon: Egg },
    { key: 'gudang', label: 'Buku Gudang', icon: Warehouse },
    { key: 'importExport', label: 'Impor / Ekspor', icon: FileSpreadsheet },
  ];

  const handleTabChange = (key) => {
    setTab(key);
    setNavOpen(false);
  };

  const pendingRender = profile && profile.status !== 'approved';

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="flex items-center gap-2 text-stone-400">
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#f5f5f4_100%)] px-4 py-10 text-stone-800">
        <div className="mx-auto max-w-2xl rounded-4xl border border-amber-200 bg-white p-8 shadow-xl shadow-stone-900/5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Menunggu Persetujuan</p>
          <h1 className="text-3xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
            Akun kamu sudah dibuat
          </h1>
          <p className="mt-3 text-sm text-stone-600">
            Status akun saat ini <span className="font-semibold">{profile.status}</span>. Setelah super admin menyetujui, kamu bisa masuk ke dashboard.
          </p>
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            Role yang diminta: <span className="font-semibold">{ROLE_LABELS[profile.role] || profile.role}</span>
            {profile.unit_id ? (
              <>
                {' '}
                untuk unit <span className="font-semibold">{units.find((unit) => unit.id === profile.unit_id)?.name || profile.unit_id}</span>
              </>
            ) : null}
          </div>
          <button onClick={handleLogout} className="mt-6 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
            Keluar
          </button>
        </div>
      </div>
    );
  }

  if (!loaded || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="flex items-center gap-2 text-stone-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat data unit...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=JetBrains+Mono:wght@500;600&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <header className="bg-linear-to-r sticky top-0 z-40 text-white from-emerald-950 to-emerald-800">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <EmblemBadge />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold leading-tight md:text-2xl" style={{ fontFamily: "'Lora', serif" }}>
              Buku Kas BUMDes Mulyoarjo
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-emerald-200 md:text-sm">
              {dbOk ? <Wifi className="h-3.5 w-3.5 text-emerald-300" /> : <WifiOff className="h-3.5 w-3.5 text-rose-300" />}
              <span>{dbOk ? `Tersambung ke database • ${currentUnitLabel}` : 'Gagal tersambung -- data kosong sementara'}</span>
            </div>
          </div>
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            {isSuperAdmin && (
              <select
                value={selectedUnitId}
                onChange={(event) => setSelectedUnitId(event.target.value)}
                className="max-w-55 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none backdrop-blur focus:border-amber-300"
              >
                <option value={UNIT_SCOPE_ALL} className="text-stone-800">
                  Semua Unit
                </option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id} className="text-stone-800">
                    {unit.name}
                  </option>
                ))}
              </select>
            )}
            <button onClick={refreshData} className="text-emerald-200 hover:text-white" title="Refresh data">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={handleLogout} className="text-emerald-200 hover:text-white" title="Keluar">
              <LogOut className="h-4 w-4" />
            </button>
            <div className="hidden items-center gap-1.5 text-sm text-amber-300 sm:flex">
              <Banknote className="h-4 w-4" />
              <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatRupiah(computeRingkasan(data).grand.bersih)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen((open) => !open)}
            className="ml-auto inline-flex items-center justify-center rounded-lg border border-emerald-700/60 bg-emerald-900/40 p-2 text-emerald-100 sm:hidden"
            aria-label={navOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={navOpen}
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {navOpen && (
          <nav className="mx-auto border-t border-emerald-700/50 px-4 py-3 sm:hidden">
            {isSuperAdmin && (
              <div className="mb-3 rounded-2xl border border-emerald-700/60 bg-emerald-900/20 p-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-emerald-200">Unit Aktif</label>
                <select
                  value={selectedUnitId}
                  onChange={(event) => setSelectedUnitId(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
                >
                  <option value={UNIT_SCOPE_ALL} className="text-stone-800">
                    Semua Unit
                  </option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id} className="text-stone-800">
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2">
              {tabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleTabChange(item.key)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${active ? 'border-amber-400 bg-emerald-900/50 text-white' : 'border-emerald-700/60 bg-emerald-900/20 text-emerald-100 hover:bg-emerald-900/35'}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <nav className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto border-t border-emerald-700/50 px-4 sm:flex">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleTabChange(item.key)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${active ? 'border-amber-400 text-white' : 'border-transparent text-emerald-200 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {overviewOnly && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Kamu sedang melihat overview semua unit. Untuk input, edit, impor, atau reset data, pilih satu unit dulu.
          </div>
        )}

        {notice && <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${notice.type === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{notice.text}</div>}

        {tab === 'dashboard' && (
          <Dashboard
            kasUmumTotals={computeRingkasan(data).umum}
            kasPetelurTotals={computeRingkasan(data).petelur}
            grandTotals={computeRingkasan(data).grand}
            monthlyData={buildMonthlyData(data)}
            gudangAlerts={buildGudangAlerts(data)}
          />
        )}

        {tab === 'kasUmum' && (!overviewOnly ? (
          <LedgerSection
            title="Kas Umum BUMDes"
            subtitle="Aliran dana pusat BUMDes -- bentuk skontro"
            debitLabel="Sumber Pemasukan"
            kreditLabel="Kategori Pengeluaran"
            debitOptions={SUMBER_UMUM}
            kreditOptions={KATEGORI_UMUM}
            debitEntries={data.kasUmum.debit}
            kreditEntries={data.kasUmum.kredit}
            onAddDebit={(entry) => addEntry('kasUmum', 'debit', entry)}
            onDeleteDebit={(id) => deleteEntry('kasUmum', 'debit', id)}
            onAddKredit={(entry) => addEntry('kasUmum', 'kredit', entry)}
            onDeleteKredit={(id) => deleteEntry('kasUmum', 'kredit', id)}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
            Pilih satu unit di header untuk mengelola data kas.
          </div>
        ))}

        {tab === 'kasPetelur' && (!overviewOnly ? (
          <LedgerSection
            title="Kas RKU Unit Petelur"
            subtitle="Operasional harian kandang -- bentuk skontro"
            debitLabel="Sumber Pemasukan"
            kreditLabel="Kategori Pengeluaran"
            debitOptions={SUMBER_PETELUR}
            kreditOptions={KATEGORI_PETELUR}
            debitEntries={data.kasPetelur.debit}
            kreditEntries={data.kasPetelur.kredit}
            onAddDebit={(entry) => addEntry('kasPetelur', 'debit', entry)}
            onDeleteDebit={(id) => deleteEntry('kasPetelur', 'debit', id)}
            onAddKredit={(entry) => addEntry('kasPetelur', 'kredit', entry)}
            onDeleteKredit={(id) => deleteEntry('kasPetelur', 'kredit', id)}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
            Pilih satu unit di header untuk mengelola data kas.
          </div>
        ))}

        {tab === 'gudang' && (!overviewOnly ? (
          <GudangSection entries={data.gudang} onAdd={addGudang} onDelete={deleteGudang} />
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
            Pilih satu unit di header untuk mengelola gudang.
          </div>
        ))}

        {tab === 'importExport' && (!overviewOnly ? (
          <ImportExportSection data={data} onImportReplace={replaceAllData} onReset={handleReset} computeRingkasan={computeRingkasan} />
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
            Pilih satu unit di header untuk impor / ekspor data.
          </div>
        ))}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-stone-400">
        Data tersimpan di database BUMDes Mulyoarjo -- otomatis update di semua perangkat.
      </footer>
    </div>
  );
}
