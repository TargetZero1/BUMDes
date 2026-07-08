import { useMemo, useState } from 'react';
import { ArrowRight, Lock, LogIn, UserPlus } from 'lucide-react';

export default function AuthPanel({ units, busy, message, mode, onModeChange, onLogin, onSignup }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    unitId: '',
    customUnitName: '',
  });

  const unitOptions = useMemo(() => units ?? [], [units]);

  const submit = async (event) => {
    event.preventDefault();
    if (mode === 'login') {
      await onLogin({ phone: form.phone.trim(), password: form.password });
      return;
    }
    await onSignup({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      password: form.password,
      unitId: form.unitId || null,
      customUnitName: form.customUnitName?.trim() || null,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#f5f5f4_100%)] px-4 py-10 text-stone-800">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-4xl bg-emerald-950 px-6 py-8 text-white shadow-2xl shadow-emerald-950/20 sm:px-8 sm:py-10">
          <div className="mb-6 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
            BUMDes Access Control
          </div>
          <h1 className="max-w-lg text-3xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: "'Lora', serif" }}>
            Satu sistem, banyak unit, role yang jelas.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-100/85 sm:text-base">
            Akun pertama yang mendaftar akan otomatis jadi Super Admin. Setelah itu, user baru masuk status pending dan menunggu approve.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ['Super Admin', 'Lihat semua unit dan approve user baru'],
              ['Unit Admin', 'Kelola kas dan gudang unit sendiri'],
              ['Staf', 'Input data sesuai unit yang ditugaskan'],
              ['Viewer', 'Hanya lihat laporan tanpa edit'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-emerald-100/80">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-4xl border border-stone-200 bg-white p-5 shadow-xl shadow-stone-900/5 sm:p-7">
          <div className="mb-5 flex gap-2 rounded-2xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <LogIn className="h-4 w-4" /> Masuk
            </button>
            <button
              type="button"
              onClick={() => onModeChange('signup')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <UserPlus className="h-4 w-4" /> Daftar
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Nama Lengkap</label>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0 focus:border-emerald-500"
                  placeholder="Contoh: Siti Aminah"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0 focus:border-emerald-500"
                placeholder="+628xxxxxxxxxx"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0 focus:border-emerald-500"
                placeholder="Minimal 6 karakter"
                required
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Request Unit</label>
                <select
                  value={form.unitId}
                  onChange={(event) => setForm((current) => ({ ...current, unitId: event.target.value }))}
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0 focus:border-emerald-500"
                >
                  <option value="">Pilih unit</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                  <option value="other">Other (Buat unit baru)</option>
                </select>
                {form.unitId === 'other' && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Nama Unit Baru</label>
                    <input
                      value={form.customUnitName}
                      onChange={(event) => setForm((current) => ({ ...current, customUnitName: event.target.value }))}
                      className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0 focus:border-emerald-500"
                      placeholder="Contoh: Bumdes Mulyoarjo"
                      required
                    />
                  </div>
                )}
                <p className="mt-2 text-xs text-stone-500">
                  Jika ini akun pertama, sistem akan otomatis menjadikannya Super Admin.
                </p>
              </div>
            )}

            {message && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy ? <Lock className="h-4 w-4 animate-pulse" /> : <ArrowRight className="h-4 w-4" />}
              {mode === 'login' ? 'Masuk ke Sistem' : 'Daftar Akun Baru'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}