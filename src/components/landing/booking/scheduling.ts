export const SLOT_HOURS_MON_WED_FRI = [16.5, 17, 17.5, 18];
export const SLOT_HOURS_TUE_THU = [17, 17.5, 18, 18.5, 19];
export const HORIZON_DAYS = 60;

export type Slot = { label: string; hour: number };

export const startOfDay = (d: Date): Date => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

export const isWeekend = (d: Date): boolean => {
  const w = d.getDay();
  return w === 0 || w === 6;
};

export const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const atHour = (date: Date, hour: number): Date => {
  const d = new Date(date);
  d.setHours(Math.floor(hour), hour % 1 ? 30 : 0, 0, 0);
  return d;
};

export const slotsFor = (date: Date): Slot[] => {
  const w = date.getDay(); // 0 Sun 1 Mon ...
  const hours = w === 2 || w === 4 ? SLOT_HOURS_TUE_THU : SLOT_HOURS_MON_WED_FRI;
  return hours.map((hour) => ({
    hour,
    label: atHour(date, hour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }));
};

export const longDate = (d: Date): string =>
  d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

export const sameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export function monthMatrix(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = first.getDay();
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= total; d += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function selectable(d: Date, min: Date, max: Date): boolean {
  const t = startOfDay(d).getTime();
  return t >= min.getTime() && t <= max.getTime() && !isWeekend(d);
}

export function validation(
  v: { name: string; email: string; company: string },
  errors: Record<string, string>
): Record<string, string> {
  const next: Record<string, string> = {};
  if (!v.name.trim()) next.name = 'Name';
  if (!v.email.trim()) next.email = 'Work email';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) next.email = 'Valid work email';
  if (!v.company.trim()) next.company = 'Company';
  return { ...errors, ...next };
}

const stamp = (d: Date): string => `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

export function buildIcs(when: Date, durationMin: number, ref: string): string {
  const end = new Date(when.getTime() + durationMin * 60_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sailwise//Founding Pilot Call//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${when.getTime()}@sailwise`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(when)}`,
    `DTEND:${stamp(end)}`,
    'SUMMARY:Sailwise — founding pilot call',
    'DESCRIPTION:Thirty minutes on your own inquiries. Bring one real inquiry and we will run it live.',
    'LOCATION:Video call (link to follow)',
    `STATUS:TENTATIVE`,
    `UID_REFERENCE:${ref}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}