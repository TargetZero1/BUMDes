import { useState } from 'react';
import { Loader2, Settings, X } from 'lucide-react';
import { updateOwnProfile } from '../lib/auth';
import { ROLE_LABELS } from '../lib/constants';
import PasswordInput from './PasswordInput';

export default function SettingsModal({ profile, session, onClose, onSaved }) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const handleSave = async (event) => {
    event.preventDefault();
    setNotice(null);

    if (newPassword && newPassword !== confirmPassword) {
      setNotice({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setNotice({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }

    setBusy(true);
    try {
      const updated = await updateOwnProfile({
        profileId: profile.id,
        currentPhone: profile.phone,
        fullName: fullName.trim(),
        phone: phone.trim(),
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword: newPassword || undefined,
        accessToken: session?.access_token,
      });
      setNotice({ type: 'success', text: 'Perubahan berhasil disimpan.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (updated) onSaved(updated);
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Gagal menyimpan perubahan.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="animate-scale-in w-full max-w-md rounded-2xl bg-surface-2 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-ink dark:text-gold-400" />
            <h3 className="text-lg font-bold text-text" style={{ fontFamily: "'Lora', serif" }}>
              Pengaturan Akun
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-surface px-3 py-2 text-xs text-text-muted">
          Role: <span className="font-semibold text-text">{ROLE_LABELS[profile?.role] || profile?.role}</span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Nama Lengkap</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-border-subtle px-3 py-2 text-sm outline-none focus:border-gold-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Nomor Telepon</label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-border-subtle px-3 py-2 text-sm outline-none focus:border-gold-500"
              placeholder="+628xxxxxxxxxx"
              required
            />
          </div>

          <div className="border-t border-border-subtle pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Ganti Password (opsional)</p>
            <div className="space-y-3">
              <PasswordInput
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Password saat ini"
                inputClassName="w-full rounded-xl border border-border-subtle px-3 py-2 text-sm outline-none focus:border-gold-500"
                autoComplete="current-password"
              />
              <PasswordInput
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Password baru"
                inputClassName="w-full rounded-xl border border-border-subtle px-3 py-2 text-sm outline-none focus:border-gold-500"
                autoComplete="new-password"
              />
              <PasswordInput
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Konfirmasi password baru"
                inputClassName="w-full rounded-xl border border-border-subtle px-3 py-2 text-sm outline-none focus:border-gold-500"
                autoComplete="new-password"
              />
            </div>
          </div>

          {notice && (
            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                notice.type === 'error'
                  ? 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
              }`}
            >
              {notice.text}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-text-muted hover:bg-surface">
              Tutup
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-2 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
