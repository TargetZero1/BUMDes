import { formatRupiah } from '../lib/formatters';

export default function StatCard({ label, value, icon: Icon, tone = 'neutral', big = false }) {
  const tones = {
    positive: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    negative: 'text-rose-700 bg-rose-50 border-rose-200',
    neutral: 'text-stone-700 bg-stone-50 border-stone-200',
    highlight: 'text-amber-900 bg-amber-50 border-amber-300',
  };

  return (
    <div className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${tones[tone]}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[0.68rem] font-semibold uppercase tracking-wide opacity-70 sm:text-xs">{label}</span>
        {Icon && <Icon className="h-4 w-4 opacity-60" />}
      </div>
      <div className={`${big ? 'text-lg sm:text-2xl' : 'text-base sm:text-lg'} break-words font-bold`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {formatRupiah(value)}
      </div>
    </div>
  );
}
