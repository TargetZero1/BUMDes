import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { todayStr } from '../lib/formatters';

const formatThousands = (digits) => (digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '');
const OTHER_LABELS = new Set(['Lain-lain', 'Lainnya']);

export default function EntryForm({ tone, fields, onSubmit, submitLabel }) {
  const initial = {};
  fields.forEach((field) => {
    initial[field.key] = field.default !== undefined ? field.default : '';
  });

  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const uraianField = fields.find((field) => field.key === 'uraian');
    const jumlahField = fields.find((field) => field.key === 'jumlah');

    if (uraianField && !form.uraian.trim()) return;
    if (jumlahField && (!form.jumlah || Number(form.jumlah) <= 0)) return;

    const resolved = { ...form };
    fields.forEach((field) => {
      if (field.type === 'select' && OTHER_LABELS.has(form[field.key])) {
        resolved[field.key] = (form[`${field.key}Other`] || '').trim();
      }
    });

    setBusy(true);
    try {
      await onSubmit({ ...resolved, jumlah: resolved.jumlah ? Number(resolved.jumlah) : undefined });
      setForm({ ...initial, tanggal: form.tanggal || todayStr() });
    } finally {
      setBusy(false);
    }
  };

  const toneButton =
    tone === 'debit'
      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
      : tone === 'kredit'
        ? 'bg-rose-700 text-white hover:bg-rose-800'
        : tone === 'transfer'
          ? 'bg-ink text-white hover:bg-ink-2'
          : 'bg-gold-500 text-ink hover:bg-gold-400';

  return (
    <form onSubmit={handleSubmit} className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className={field.span2 ? 'sm:col-span-2' : ''}>
          <label className="mb-1 block text-xs font-medium text-text-muted">{field.label}</label>
          {field.type === 'select' ? (
            <>
              <select
                value={form[field.key]}
                onChange={(event) => set(field.key, event.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="" disabled>
                  Pilih...
                </option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {OTHER_LABELS.has(form[field.key]) && (
                <input
                  type="text"
                  value={form[`${field.key}Other`] || ''}
                  onChange={(event) => set(`${field.key}Other`, event.target.value)}
                  placeholder={`Tulis ${field.label.toLowerCase()} lainnya`}
                  required
                  className="mt-2 w-full rounded-lg border border-border-subtle px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              )}
            </>
          ) : field.type === 'currency' ? (
            <input
              type="text"
              inputMode="numeric"
              value={formatThousands(form[field.key])}
              placeholder={field.placeholder}
              onChange={(event) => set(field.key, event.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg border border-border-subtle px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          ) : (
            <input
              type={field.type || 'text'}
              value={form[field.key]}
              min={field.type === 'number' ? 0 : undefined}
              step={field.type === 'number' ? field.step || 1 : undefined}
              placeholder={field.placeholder}
              list={field.listId}
              onChange={(event) => set(field.key, event.target.value)}
              className="w-full rounded-lg border border-border-subtle px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          )}
          {field.listId && field.listOptions && (
            <datalist id={field.listId}>
              {field.listOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
      ))}
      <button
        type="submit"
        disabled={busy}
        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-60 sm:col-span-2 ${toneButton}`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {submitLabel}
      </button>
    </form>
  );
}
