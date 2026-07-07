import { formatRupiah, sumBy } from '../lib/formatters';

export default function RekapList({ title, items, tone }) {
  const color = tone === 'debit' ? 'text-emerald-700' : 'text-rose-700';
  const total = sumBy(items, 'value');

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">{title}</h4>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-stone-600">{item.label}</span>
            <div className="mx-2 flex h-1.5 max-w-[40%] flex-1 items-center overflow-hidden rounded-full bg-stone-100">
              <div
                className={tone === 'debit' ? 'h-full bg-emerald-500' : 'h-full bg-rose-500'}
                style={{ width: total ? `${Math.min(100, (item.value / total) * 100)}%` : '0%' }}
              />
            </div>
            <span className={`font-semibold ${color}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatRupiah(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
