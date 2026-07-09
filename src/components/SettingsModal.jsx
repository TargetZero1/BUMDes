import { useState } from 'react';
import { Loader2, Settings, X } from 'lucide-react';
import { updateOwnProfile } from '../lib/auth';
import { ROLE_LABELS } from '../lib/constants';

export default function SettingsModal({ profile, onClose, onSaved }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-700" />
            <h3 className="text-lg font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
              Pengaturan Akun
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">
          Role: <span className="font-semibold text-stone-700">{ROLE_LABELS[profile?.role] || profile?.role}</span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Nama Lengkap</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Nomor Telepon</label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="+628xxxxxxxxxx"
              required
            />
          </div>

          <div className="border-t border-stone-100 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Ganti Password (opsional)</p>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Password saat ini"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Password baru"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Konfirmasi password baru"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {notice && (
            <div className={`rounded-xl px-3 py-2 text-sm ${notice.type === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {notice.text}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">
              Tutup
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
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
