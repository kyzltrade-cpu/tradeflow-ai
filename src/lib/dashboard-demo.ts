/**
 * Isolated demo fixture + pure view adapter for the /admin dashboard.
 *
 * This module is the ONLY place dashboard sample data may live. It is
 * intentionally pure and client-safe: no Supabase, no network, no writes to
 * any tenant row. The dashboard reads it read-only; nothing here creates
 * records or sends notifications.
 *
 * The demo clock is pinned to 7 Oct 2026 (Asia/Hong_Kong) so every countdown in
 * the fixture reads coherently. Production callers pass the current local
 * calendar date instead (see `todayIsoLocal`).
 */

/** The sample tenant whose dashboard is rendered from this fixture. */
export const DASHBOARD_DEMO_COMPANY_ID = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';

/** Fixed "today" for the demo fixture so countdowns never drift. */
export const DEMO_TODAY_ISO = '2026-10-07';

const DAY_MS = 86_400_000;

/* ── pure date helpers (UTC-safe on 'YYYY-MM-DD' strings) ─────────────────── */

export function todayIsoLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

/** Whole days from `todayIso` to `iso` (negative = overdue). */
export function daysUntil(iso: string, todayIso: string): number {
  return Math.round((isoToUtc(iso) - isoToUtc(todayIso)) / DAY_MS);
}

function addDays(iso: string, n: number): string {
  const d = new Date(isoToUtc(iso) + n * DAY_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function shortDate(iso: string): string {
  return new Date(isoToUtc(iso)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function longDate(iso: string): string {
  return new Date(isoToUtc(iso)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export type Tone = 'overdue' | 'soon' | 'future';

/** Red when overdue, amber within three days, otherwise plain. */
export function toneFor(iso: string, todayIso: string): Tone {
  const d = daysUntil(iso, todayIso);
  if (d < 0) return 'overdue';
  if (d <= 3) return 'soon';
  return 'future';
}

/* ── fixture types ───────────────────────────────────────────────────────── */

export interface DashAction {
  id: string;
  titleEn: string; titleZh: string;
  ref: string;
  productEn: string; productZh: string;
  contextEn: string; contextZh: string;
  dueIso: string;
}

export interface DashWaiting {
  id: string;
  party: string;
  waitingEn: string; waitingZh: string;
  ref: string;
  sinceIso: string;
}

export interface DashWork {
  id: string;
  kind: 'quote' | 'order';
  ref: string;
  productEn: string; productZh: string;
  /** Omitted rather than invented when unknown. */
  qty?: string;
  buyer: string;
  buyerCountry: string;
  shipTo: string[];
  statusEn: string; statusZh: string;
  /** Pending booking date (shows a countdown) … */
  bookingIso?: string;
  /** … or an already-confirmed booking date (no countdown). */
  bookingConfirmedIso?: string;
  shipmentIso?: string;
  sourceRef: string;
  sourceSubject: string;
  updatedText: string;
}

export interface DashFiled {
  id: string;
  ref: string;
  productEn: string; productZh: string;
  doneIso: string;
}

/* ── fixture data ─────────────────────────────────────────────────────────── */

export const DASHBOARD_ACTIONS: DashAction[] = [
  { id: 'a1', titleEn: 'Send the revised price', titleZh: '發送修改後的價格', ref: 'HT-2042', productEn: 'Stainless steel flasks', productZh: '不鏽鋼保溫瓶', contextEn: 'Promised 6 Oct', contextZh: '承諾 10 月 6 日', dueIso: '2026-10-06' },
  { id: 'a2', titleEn: 'Confirm forwarder booking', titleZh: '確認貨代訂艙', ref: 'HT-2048', productEn: 'Stainless steel flasks', productZh: '不鏽鋼保溫瓶', contextEn: 'Booking confirmation needed', contextZh: '需要訂艙確認', dueIso: '2026-10-10' },
  { id: 'a3', titleEn: 'Confirm shipment readiness', titleZh: '確認出貨準備情況', ref: 'HT-2031', productEn: 'Ceramic mug restock', productZh: '陶瓷杯補貨', contextEn: 'Check readiness with supplier', contextZh: '向供應商確認備貨', dueIso: '2026-10-08' },
];

export const DASHBOARD_WAITING: DashWaiting[] = [
  { id: 'w1', party: 'Pacific Retail Ltd', waitingEn: 'Lid colour + packaging spec', waitingZh: '杯蓋顏色及包裝規格', ref: 'HT-2048', sinceIso: '2026-10-06' },
  { id: 'w2', party: 'Everwell Factory', waitingEn: 'Unit price for ceramic mugs', waitingZh: '陶瓷馬克杯單價', ref: 'HT-2051', sinceIso: '2026-10-05' },
];

export const DASHBOARD_WORK: DashWork[] = [
  {
    id: 'o1', kind: 'order', ref: 'HT-2048',
    productEn: 'Stainless steel flasks', productZh: '不鏽鋼保溫瓶',
    qty: '5,000 pcs',
    buyer: 'Pacific Retail Ltd', buyerCountry: 'Hong Kong',
    shipTo: ['Japan', 'Hong Kong', 'Chile'],
    statusEn: 'Awaiting booking confirmation', statusZh: '等待訂艙確認',
    bookingIso: '2026-10-10', shipmentIso: '2026-10-14',
    sourceRef: 'HT-2048', sourceSubject: 'shipping instructions',
    updatedText: '7 Oct 2026, 16:20 HKT',
  },
  {
    id: 'o2', kind: 'order', ref: 'HT-2031',
    productEn: 'Ceramic mug restock', productZh: '陶瓷馬克杯補貨',
    buyer: 'Eastbay Home', buyerCountry: 'Hong Kong',
    shipTo: ['Hong Kong'],
    statusEn: 'Awaiting supplier readiness', statusZh: '等待供應商備貨',
    bookingConfirmedIso: '2026-10-06', shipmentIso: '2026-10-08',
    sourceRef: 'HT-2031', sourceSubject: 'dispatch plan',
    updatedText: '7 Oct 2026, 15:45 HKT',
  },
  {
    id: 'q1', kind: 'quote', ref: 'HT-2062',
    productEn: 'Aluminium travel mugs', productZh: '鋁製旅行杯',
    qty: '2,000 pcs',
    buyer: 'Nordic Promo AB', buyerCountry: 'Sweden',
    shipTo: ['Gothenburg, SE'],
    statusEn: 'Sent · awaiting buyer', statusZh: '已發送 · 等待買家',
    sourceRef: 'Thread #4821', sourceSubject: 'quote follow-up',
    updatedText: '7 Oct 2026, 11:20 HKT',
  },
  {
    id: 'q2', kind: 'quote', ref: 'HT-2059',
    productEn: 'Bamboo cutlery sets', productZh: '竹製餐具組',
    qty: '8,000 sets',
    buyer: 'GreenTable GmbH', buyerCountry: 'Germany',
    shipTo: ['Hamburg, DE'],
    statusEn: 'Revised · sent', statusZh: '已修改 · 已發送',
    sourceRef: 'Thread #4809', sourceSubject: 'revised quote',
    updatedText: '6 Oct 2026, 09:05 HKT',
  },
];

const FILED_PRODUCTS: Array<[string, string]> = [
  ['Embroidered caps', '刺繡帽'],
  ['Cork coasters', '軟木杯墊'],
  ['Recycled pens', '再生筆'],
  ['Cotton tote bags', '棉質托特包'],
  ['Steel water bottles', '不鏽鋼水瓶'],
];

export const DASHBOARD_FILED: DashFiled[] = Array.from({ length: 24 }, (_, i) => {
  const [productEn, productZh] = FILED_PRODUCTS[i % FILED_PRODUCTS.length];
  return {
    id: `f${i + 1}`,
    ref: `HT-${1998 - i * 7}`,
    productEn, productZh,
    doneIso: addDays(DEMO_TODAY_ISO, -(5 + i * 3)),
  };
});