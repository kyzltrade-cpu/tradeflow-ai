'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  isoDate,
  monthMatrix,
  sameMonth,
  selectable,
} from './scheduling';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];

/* The month is drawn as a ruled grid rather than a field of floating numbers:
   the hairlines are what make it read as a diary you are choosing from, and
   they carry the same weight whether the card is on white or on ink. The
   wrapper draws the top and left edge and every cell draws its own right and
   bottom edge, so no two rules ever double up into a 2px line.

   Three states have to be legible without a legend: open (ink on white),
   closed (shaded, weekend or past the horizon) and chosen (filled). Today gets
   a ring. Everything colour-related lives in `.cal` in globals.css. */
const LINE = 'var(--cal-line)';
const SIGNAL = 'var(--cal-signal)';
const ON_SIGNAL = 'var(--cal-on-signal)';
const DIM = 'var(--cal-dim)';
const INK = 'var(--cal-ink)';
const INK_OFF = 'var(--cal-ink-off)';
const CLOSED = 'var(--cal-closed)';

const DAY = 'h-12 sm:h-14';

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
  const gridRef = useRef<HTMLDivElement>(null);
  const todayIso = isoDate(new Date());
  const locale = zh ? 'zh-HK' : 'en-GB';

  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const canPrev = !sameMonth(month, min);
  const canNext = !sameMonth(month, max);

  /* The single day that owns the grid's tab stop; everything else is reached
     with the arrow keys. Without it, Tab would walk thirty-one buttons on its
     way to the form. It follows the selection, otherwise today, otherwise the
     first bookable day of the month being shown. */
  const [cursor, setCursor] = useState<string | null>(null);

  const monthIsos = useMemo(
    () => cells.filter((d): d is Date => !!d).map(isoDate),
    [cells]
  );

  const tabIso = useMemo(() => {
    if (cursor && monthIsos.includes(cursor)) return cursor;
    if (selected && monthIsos.includes(selected)) return selected;
    if (monthIsos.includes(todayIso)) return todayIso;
    const firstOpen = cells.find((d) => d && selectable(d, min, max));
    return firstOpen ? isoDate(firstOpen) : (monthIsos[0] ?? '');
  }, [cursor, selected, monthIsos, todayIso, cells, min, max]);

  const focusDay = useCallback((iso: string) => {
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`)?.focus();
    });
  }, []);

  /* Arrow keys move by a day or a week, Home/End run to the ends of the row and
     PageUp/PageDown change month, all clamped to the booking window. Focus is
     carried across a month change so the grid never drops the user back to the
     top of the page. */
  const go = useCallback(
    (from: Date, days: number, forceMonth?: Date) => {
      const to = new Date(from);
      to.setDate(to.getDate() + days);
      if (to < min || to > max) return;
      const targetMonth = forceMonth ?? (sameMonth(to, month) ? null : new Date(to.getFullYear(), to.getMonth(), 1));
      if (targetMonth) onMonth(targetMonth);
      setCursor(isoDate(to));
      focusDay(isoDate(to));
    },
    [min, max, month, onMonth, focusDay]
  );

  const onKeyDown = (e: React.KeyboardEvent, d: Date) => {
    const rowJump: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -d.getDay(),
      End: 6 - d.getDay(),
    };
    const days = rowJump[e.key];
    if (days !== undefined) {
      e.preventDefault();
      go(d, days);
      return;
    }
    if (e.key === 'PageUp' && canPrev) {
      e.preventDefault();
      const same = new Date(prev.getFullYear(), prev.getMonth(), Math.min(d.getDate(), 28));
      onMonth(prev);
      setCursor(isoDate(same));
      focusDay(isoDate(same));
    }
    if (e.key === 'PageDown' && canNext) {
      e.preventDefault();
      const same = new Date(next.getFullYear(), next.getMonth(), Math.min(d.getDate(), 28));
      onMonth(next);
      setCursor(isoDate(same));
      focusDay(isoDate(same));
    }
  };

  const navBtn =
    'grid h-8 w-8 shrink-0 cursor-pointer place-items-center transition-colors hover:bg-[var(--cal-wash)] disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent';

  return (
    <div className="cal w-full border-t border-l" style={{ borderColor: LINE }}>
      <div className="flex items-center justify-between gap-2 border-r border-b px-2 py-2.5" style={{ borderColor: LINE }}>
        <button
          type="button"
          onClick={() => onMonth(prev)}
          disabled={!canPrev}
          aria-label={zh ? '上個月' : 'Previous month'}
          className={navBtn}
          style={{ color: SIGNAL }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="display text-[15px]" style={{ color: INK }}>
          {month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => onMonth(next)}
          disabled={!canNext}
          aria-label={zh ? '下個月' : 'Next month'}
          className={navBtn}
          style={{ color: SIGNAL }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div ref={gridRef} className="grid grid-cols-7">
        {(zh ? WEEKDAYS_ZH : WEEKDAYS).map((w, i) => (
          <span
            key={`${w}${i}`}
            className="border-r border-b py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{ borderColor: LINE, color: DIM }}
          >
            {w}
          </span>
        ))}

        {cells.map((d, i) => {
          if (!d) {
            return <span key={`x${i}`} className={`${DAY} border-r border-b`} style={{ borderColor: LINE }} />;
          }
          const iso = isoDate(d);
          const ok = selectable(d, min, max);
          const on = iso === selected;
          const isToday = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              data-day={iso}
              tabIndex={iso === tabIso ? 0 : -1}
              aria-pressed={on}
              aria-current={isToday ? 'date' : undefined}
              /* `aria-disabled` rather than `disabled`: a genuinely disabled
                 button cannot take focus, which would make the arrow keys skip
                 weekends and break the grid into islands. */
              aria-disabled={ok ? undefined : true}
              aria-label={d.toLocaleDateString(locale, { dateStyle: 'full' })}
              onClick={() => {
                if (ok) onSelect(iso);
              }}
              onFocus={() => setCursor(iso)}
              onKeyDown={(e) => onKeyDown(e, d)}
              className={`relative grid ${DAY} place-items-center border-r border-b text-[13.5px] tabular-nums transition-colors ${
                on ? 'cursor-pointer' : ok ? 'cursor-pointer hover:bg-[var(--cal-wash)]' : 'cursor-default'
              }`}
              style={{
                borderColor: LINE,
                background: on ? SIGNAL : ok ? undefined : CLOSED,
                color: on ? ON_SIGNAL : ok ? (isToday ? SIGNAL : INK) : INK_OFF,
                fontWeight: on || isToday ? 600 : 400,
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <p className="border-r border-b py-2.5 text-center text-[11px]" style={{ borderColor: LINE, color: DIM }}>
        {zh ? '週一至週五 · 香港時間' : 'Monday to Friday · Hong Kong time'}
      </p>
    </div>
  );
}
