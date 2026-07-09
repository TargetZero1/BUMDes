import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatRupiah } from '../lib/formatters';

export default function StatCard({ label, value, icon: Icon, tone = 'neutral', big = false, delta, subtext, plain = false }) {
  const tones = {
    positive: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    negative: 'text-rose-700 bg-rose-50 border-rose-200',
    neutral: 'text-stone-700 bg-stone-50 border-stone-200',
    highlight: 'text-amber-900 bg-amber-50 border-amber-300',
  };

  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const deltaPositive = delta >= 0;

  return (
    <div className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${tones[tone]}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[0.68rem] font-semibold uppercase tracking-wide opacity-70 sm:text-xs">{label}</span>
        {Icon && <Icon className="h-4 w-4 opacity-60" />}
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <div className={`${big ? 'text-lg sm:text-2xl' : 'text-base sm:text-lg'} wrap-break-word font-bold`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {plain ? value : formatRupiah(value)}
        </div>
        {hasDelta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold ${
              deltaPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {deltaPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {deltaPositive ? '+' : ''}
            {delta.toFixed(0)}%
          </span>
        )}
      </div>
      {subtext && <div className="mt-1 text-[0.68rem] text-current opacity-60">{subtext}</div>}
    </div>
  );
}
