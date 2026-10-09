'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  isoDate,
  monthMatrix,
  sameMonth,
  selectable,
  startOfDay,
} from './scheduling';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];

export default function MiniCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  min,
  max,
  zh,
}: {
  month: Date;
  onMonth: (d: Date) => void;
  selected: string | null;
  onSelect: (iso: string) => void;
  min: Date;
  max: Date;
  zh: boolean;
}) {
  const cells = monthMatrix(month);
  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const canPrev = !sameMonth(month, min);
  const canNext = !sameMonth(month, max);
  const today = isoDate(new Date());

  const shift = (d: Date) => onMonth(d);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => shift(prev)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--ink-2)] transition hover:bg-black/[0.05] disabled:opacity-25"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13.5px] font-semibold text-[var(--ink)]">
          {month.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => shift(next)}
          disabled={!canNext}
          aria-label="Next month"
          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--ink-2)] transition hover:bg-black/[0.05] disabled:opacity-25"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {(zh ? WEEKDAYS_ZH : WEEKDAYS).map((w, i) => (
          <span key={i} className="pb-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
            {w}
          </span>
        ))}

        {cells.map((d, i) => {
          if (!d) return <span key={`x${i}`} />;
          const iso = isoDate(d);
          const ok = selectable(d, min, max);
          const on = iso === selected;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              disabled={!ok}
              onClick={() => onSelect(iso)}
              aria-pressed={on}
              aria-label={d.toLocaleDateString([], { dateStyle: 'full' })}
              className={`mx-auto grid h-9 w-9 place-items-center rounded-lg text-[12.5px] transition ${
                on
                  ? 'bg-[var(--pine)] font-semibold text-white'
                  : ok
                    ? 'font-medium text-[var(--ink)] hover:bg-black/[0.06]'
                    : 'cursor-not-allowed text-[var(--ink-3)]/40'
              } ${isToday && !on ? 'ring-1 ring-inset ring-[var(--pine)]/40' : ''}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-3 border-t border-[var(--hairline)] pt-2.5 text-center text-[11px] text-[var(--ink-3)]">
        {zh ? '週一至週五 · 香港時間' : 'Monday to Friday · Hong Kong time'}
      </p>
    </div>
  );
}