import { Fragment } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatRupiah } from '../lib/formatters';

// Only allow line breaks at thousands-separator dots, so a long value that
// doesn't fit drops to a new line as a whole group (e.g. "161.500." | "000")
// instead of splitting mid-digit.
function BreakableAmount({ text }) {
  const parts = String(text).split('.');
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {i > 0 ? `.${part}` : part}
    </Fragment>
  ));
}

export default function StatCard({ label, value, icon: Icon, tone = 'neutral', big = false, delta, subtext, plain = false }) {
  const tones = {
    positive: {
      card: 'border-emerald-200/70 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/25',
      text: 'text-emerald-700 dark:text-emerald-300',
      chip: 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
    },
    negative: {
      card: 'border-rose-200/70 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/25',
      text: 'text-rose-800 dark:text-rose-300',
      chip: 'bg-rose-600/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
    },
    neutral: {
      card: 'border-border-subtle bg-surface-2',
      text: 'text-text',
      chip: 'bg-ink/5 text-ink dark:bg-white/10 dark:text-text',
    },
    highlight: {
      card: 'border-gold-500/30 bg-gold-500/10',
      text: 'text-gold-700 dark:text-gold-300',
      chip: 'bg-gold-500/15 text-gold-600 dark:text-gold-400',
    },
  };

  const palette = tones[tone];
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const deltaPositive = delta >= 0;

  return (
    <div className={`min-w-0 rounded-2xl border p-3 shadow-sm ring-1 ring-black/5 sm:p-4 ${palette.card}`}>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <span className={`min-w-0 break-words text-[0.68rem] font-semibold uppercase tracking-wide opacity-80 sm:text-xs ${palette.text}`}>{label}</span>
        {Icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${palette.chip}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <div
          className={`min-w-0 tabular-nums font-bold ${big ? 'text-lg sm:text-2xl' : 'text-base sm:text-lg'} ${
            tone === 'highlight' ? 'text-gold-gradient' : palette.text
          }`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {plain ? value : <BreakableAmount text={formatRupiah(value)} />}
        </div>
        {hasDelta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold ${
              deltaPositive
                ? 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
                : 'bg-rose-600/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300'
            }`}
          >
            {deltaPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {deltaPositive ? '+' : ''}
            {delta.toFixed(0)}%
          </span>
        )}
      </div>
      {subtext && <div className={`mt-1 text-[0.68rem] opacity-70 ${palette.text}`}>{subtext}</div>}
    </div>
  );
}
