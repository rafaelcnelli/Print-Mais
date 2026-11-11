import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type TimeRangePeriod = 'month' | '3months' | '6months' | '1year' | 'custom' | 'all';

export interface TimeRangeFilterValue {
  period: TimeRangePeriod;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export const TIME_RANGE_OPTIONS: { id: TimeRangePeriod; label: string; shortLabel: string }[] = [
  { id: 'month', label: 'Este Mês (30 dias)', shortLabel: 'Mês' },
  { id: '3months', label: 'Últimos 3 Meses', shortLabel: '3 Meses' },
  { id: '6months', label: 'Últimos 6 Meses', shortLabel: '6 Meses' },
  { id: '1year', label: 'Último 1 Ano', shortLabel: '1 Ano' },
  { id: 'all', label: 'Todo o Período', shortLabel: 'Tudo' },
  { id: 'custom', label: 'Personalizado', shortLabel: 'Personalizado' },
];

/**
 * Checks if a given ISO date (or YYYY-MM-DD string) falls within the selected TimeRangeFilterValue
 */
export function isDateWithinTimeRange(
  dateIsoOrYmd: string | undefined | null,
  filter: TimeRangeFilterValue,
  referenceNow: Date = new Date()
): boolean {
  if (!dateIsoOrYmd) return true;
  if (filter.period === 'all') return true;

  const itemDate = new Date(dateIsoOrYmd);
  if (Number.isNaN(itemDate.getTime())) return true;

  const now = new Date(referenceNow);

  if (filter.period === 'custom') {
    if (filter.startDate) {
      const start = new Date(filter.startDate + 'T00:00:00');
      if (itemDate < start) return false;
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate + 'T23:59:59.999');
      if (itemDate > end) return false;
    }
    return true;
  }

  // Relative periods from referenceNow
  const cutoff = new Date(now);
  if (filter.period === 'month') {
    cutoff.setDate(cutoff.getDate() - 30);
  } else if (filter.period === '3months') {
    cutoff.setDate(cutoff.getDate() - 90);
  } else if (filter.period === '6months') {
    cutoff.setDate(cutoff.getDate() - 180);
  } else if (filter.period === '1year') {
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  }

  return itemDate >= cutoff;
}

interface TimeRangeSelectorProps {
  value: TimeRangeFilterValue;
  onChange: (next: TimeRangeFilterValue) => void;
  className?: string;
  compact?: boolean;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
  className = '',
  compact = false,
}) => {
  const [isCustomOpen, setIsCustomOpen] = React.useState<boolean>(value.period === 'custom');

  const handleSelectPeriod = (p: TimeRangePeriod) => {
    if (p === 'custom') {
      setIsCustomOpen(true);
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      onChange({
        period: 'custom',
        startDate: value.startDate || thirtyDaysAgo,
        endDate: value.endDate || today,
      });
    } else {
      setIsCustomOpen(false);
      onChange({ period: p });
    }
  };

  return (
    <div className={`inline-flex flex-col gap-2 ${className}`}>
      {/* Pills Container */}
      <div className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100 dark:bg-[#0D0F14] p-1 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-1.5 pl-2 pr-1 text-[11px] font-bold text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-[#1D63FF]" />
          <span className="hidden sm:inline">Período:</span>
        </div>

        {TIME_RANGE_OPTIONS.map((opt) => {
          const isActive = value.period === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectPeriod(opt.id)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {compact ? opt.shortLabel : opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers (Shown when Personalizado is active) */}
      {(value.period === 'custom' || isCustomOpen) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white dark:bg-[#14171F] p-2.5 border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">De:</span>
            <input
              type="date"
              value={value.startDate || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  period: 'custom',
                  startDate: e.target.value,
                })
              }
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Até:</span>
            <input
              type="date"
              value={value.endDate || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  period: 'custom',
                  endDate: e.target.value,
                })
              }
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
            />
          </div>

          {(value.startDate || value.endDate) && (
            <button
              type="button"
              onClick={() => handleSelectPeriod('month')}
              className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-[#1D63FF] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Redefinir
            </button>
          )}
        </div>
      )}
    </div>
  );
};
