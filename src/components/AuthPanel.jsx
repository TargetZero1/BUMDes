import { useMemo, useState } from 'react';
import { ArrowRight, Lock, LogIn, UserPlus } from 'lucide-react';
import EmblemBadge from './EmblemBadge';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function AuthPanel({ units, busy, message, mode, onModeChange, onLogin, onSignup }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    unitId: '',
    customUnitName: '',
    customUnitType: '',
  });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const unitOptions = useMemo(() => (units ?? []).filter((unit) => unit.code !== 'pusat'), [units]);

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
      customUnitType: form.customUnitType?.trim() || null,
    });
  };

  return (
    <div className="min-h-screen px-4 py-10 text-text">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-seal-pattern relative flex flex-col items-center justify-center overflow-hidden rounded-4xl bg-linear-to-br from-ink to-ink-2 px-6 py-12 text-center text-white shadow-2xl shadow-ink/30 sm:px-8">
          <EmblemBadge className="h-28 w-28 sm:h-32 sm:w-32" />
          <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: "'Lora', serif" }}>
            BUMDes Mulyoarjo
          </h1>
          <p className="mt-2 max-w-sm text-sm text-white/70">
            Ampelgading, Mulyoarjo, Kec. Lawang, Kabupaten Malang, Jawa Timur 65216
          </p>
          <div className="mt-5 h-px w-16 bg-gold-500/50" />
          <p className="mt-5 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            Sistem pencatatan kas dan keuangan digital BUMDes — kas pusat, kas unit, dan gudang dalam satu tempat.
          </p>
        </div>

        <div className="rounded-4xl border border-border-subtle bg-surface-2 p-5 shadow-xl shadow-ink/5 sm:p-7">
          <div className="mb-5 flex justify-center">
            <EmblemBadge className="h-20 w-20" />
          </div>
          <div className="mb-5 flex justify-center">
            <div className="inline-flex gap-2 rounded-2xl bg-surface p-1">
              <button
                type="button"
                onClick={() => onModeChange('login')}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-surface-2 text-ink shadow-sm dark:text-gold-400' : 'text-text-muted hover:text-text'}`}
              >
                <LogIn className="h-4 w-4" /> Masuk
              </button>
              <button
                type="button"
                onClick={() => onModeChange('signup')}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-surface-2 text-ink shadow-sm dark:text-gold-400' : 'text-text-muted hover:text-text'}`}
              >
                <UserPlus className="h-4 w-4" /> Daftar
              </button>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Nama Lengkap</label>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-text outline-none ring-0 focus:border-gold-500"
                  placeholder="Contoh: Siti Aminah"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-text outline-none ring-0 focus:border-gold-500"
                placeholder="+628xxxxxxxxxx"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-text outline-none ring-0 focus:border-gold-500"
                placeholder="Minimal 6 karakter"
                required
              />
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="mt-1.5 text-xs font-semibold text-ink hover:underline dark:text-gold-400"
                >
                  Lupa Password?
                </button>
              )}
            </div>

            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Request Unit</label>
                <select
                  value={form.unitId}
                  onChange={(event) => setForm((current) => ({ ...current, unitId: event.target.value }))}
                  className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-text outline-none ring-0 focus:border-gold-500"
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
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Nama Unit Baru</label>
                      <input
                        value={form.customUnitName}
                        onChange={(event) => setForm((current) => ({ ...current, customUnitName: event.target.value }))}
                        className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-text outline-none ring-0 focus:border-gold-500"
                        placeholder="Contoh: Unit Perikanan"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Tipe Unit</label>
                      <input
                        value={form.customUnitType}
                        onChange={(event) => setForm((current) => ({ ...current, customUnitType: event.target.value }))}
                        className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-text outline-none ring-0 focus:border-gold-500"
                        placeholder="Contoh: Perikanan"
                      />
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-text-muted">
                  Pendaftaran unit baru menunggu konfirmasi Operator sebelum bisa dipakai.
                </p>
              </div>
            )}

            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  message.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-2 disabled:opacity-60"
            >
              {busy ? <Lock className="h-4 w-4 animate-pulse" /> : <ArrowRight className="h-4 w-4" />}
              {mode === 'login' ? 'Masuk ke Sistem' : 'Daftar Akun Baru'}
            </button>
          </form>
        </div>
      </div>

      {forgotPasswordOpen && <ForgotPasswordModal onClose={() => setForgotPasswordOpen(false)} />}
    </div>
  );
}