'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  isoDate,
  monthMatrix,
  sameMonth,
  selectable,
} from './scheduling';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];

/* The month is drawn as a ruled grid rather than a field of floating numbers:
   the hairlines are what make it read as a diary you are choosing from, and
   they carry the same weight whether the calendar sits on cream or on ink. The
   wrapper draws the top and left edge and every cell draws its own right and
   bottom edge, so no two rules ever double up into a 2px line. */
const HAIR = 'var(--hairline)';

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

  return (
    <div className="w-full border-t border-l" style={{ borderColor: HAIR }}>
      <div className="flex items-center justify-between border-r border-b px-2 py-1.5" style={{ borderColor: HAIR }}>
        <button
          type="button"
          onClick={() => onMonth(prev)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="grid h-8 w-8 cursor-pointer place-items-center border transition-colors hover:bg-[var(--pine-wash)] disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent"
          style={{ borderColor: HAIR, color: 'var(--ink-2)' }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>
          {month.toLocaleDateString(zh ? 'zh-HK' : 'en-GB', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => onMonth(next)}
          disabled={!canNext}
          aria-label="Next month"
          className="grid h-8 w-8 cursor-pointer place-items-center border transition-colors hover:bg-[var(--pine-wash)] disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent"
          style={{ borderColor: HAIR, color: 'var(--ink-2)' }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {(zh ? WEEKDAYS_ZH : WEEKDAYS).map((w, i) => (
          <span
            key={i}
            className="border-r border-b py-2 text-center font-mono text-[10px] uppercase tracking-wider"
            style={{ borderColor: HAIR, color: 'var(--ink-3)' }}
          >
            {w}
          </span>
        ))}

        {cells.map((d, i) => {
          if (!d) {
            return <span key={`x${i}`} className="h-10 border-r border-b" style={{ borderColor: HAIR }} />;
          }
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
              aria-label={d.toLocaleDateString(zh ? 'zh-HK' : 'en-GB', { dateStyle: 'full' })}
              className={`relative grid h-10 cursor-pointer place-items-center border-r border-b text-[12.5px] tabular-nums transition-colors ${
                ok && !on ? 'hover:bg-[var(--pine-wash)]' : ''
              } ${ok ? '' : 'cursor-default'}`}
              style={{
                borderColor: HAIR,
                background: on ? 'var(--accent)' : undefined,
                color: on ? 'var(--paper)' : ok ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: on || isToday ? 600 : 400,
                opacity: ok ? 1 : 0.45,
              }}
            >
              {d.getDate()}
              {isToday && !on && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-[3px] h-[3px] w-[3px]"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <p
        className="border-r border-b py-2 text-center text-[11px]"
        style={{ borderColor: HAIR, color: 'var(--ink-3)' }}
      >
        {zh ? '週一至週五 · 香港時間' : 'Monday to Friday · Hong Kong time'}
      </p>
    </div>
  );
}
