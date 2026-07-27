import { useState } from 'react';
import { X, MessageCircle, KeyRound, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { requestPasswordResetOtp, verifyPasswordResetOtp } from '../lib/auth';
import PasswordInput from './PasswordInput';

export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submitPhone = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordResetOtp(phone.trim());
      setStep('code');
    } catch (err) {
      setError(err.message || 'Gagal mengirim kode OTP');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sama');
      return;
    }
    setBusy(true);
    try {
      await verifyPasswordResetOtp({ phone: phone.trim(), code: code.trim(), newPassword });
      setStep('done');
    } catch (err) {
      setError(err.message || 'Gagal reset password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="animate-scale-in w-full max-w-md rounded-2xl bg-surface-2 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-ink dark:text-gold-400" />
            <h3 className="font-bold text-text">Lupa Password</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-text-muted hover:bg-surface hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'phone' && (
          <form onSubmit={submitPhone} className="space-y-4">
            <p className="text-sm text-text-muted">
              Masukkan nomor HP yang terdaftar. Kode OTP 6 digit akan dikirim lewat WhatsApp ke nomor tersebut.
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-text outline-none focus:border-gold-500"
                placeholder="+628xxxxxxxxxx"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Kirim Kode OTP
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} className="space-y-4">
            <p className="text-sm text-text-muted">
              Cek WhatsApp kamu, masukkan kode 6 digit dan password baru.
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Kode OTP</label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-center text-lg tracking-[0.5em] text-text outline-none focus:border-gold-500"
                placeholder="000000"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Password Baru</label>
              <PasswordInput
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                inputClassName="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-text outline-none focus:border-gold-500"
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Konfirmasi Password Baru</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                inputClassName="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-text outline-none focus:border-gold-500"
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                required
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="rounded-2xl px-4 py-3 text-sm text-text-muted hover:bg-surface"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink-2 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Ganti Password
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="text-sm text-text">Password berhasil diubah. Silakan login dengan password baru.</p>
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink-2"
            >
              Kembali ke Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
