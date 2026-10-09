'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import {
  DASHBOARD_ACTIONS,
  DASHBOARD_FILED,
  DASHBOARD_WAITING,
  DASHBOARD_WORK,
  DASHBOARD_DEMO_COMPANY_ID,
  DEMO_TODAY_ISO,
  daysUntil,
  longDate,
  shortDate,
  toneFor,
  todayIsoLocal,
  type DashWork,
  type Tone,
} from '@/lib/dashboard-demo';

type T = (en: string, zh: string) => string;

const TONE_COLOR: Record<Tone, string> = {
  overdue: '#DC2626',
  soon: '#D97706',
  future: 'var(--text-muted)',
};

/* Circle is always solid amber; its white content carries the urgency. */
const AMBER = '#D97706';

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** Badge + deadline text for an action row. */
function actionTiming(iso: string, todayIso: string, t: T): { tone: Tone; badge: string; text: string } {
  const d = daysUntil(iso, todayIso);
  if (d < 0) {
    const n = Math.abs(d);
    return { tone: 'overdue', badge: '!', text: t(`${n} ${plural(n, 'day', 'days')} overdue`, `逾期 ${n} 天`) };
  }
  if (d === 0) return { tone: 'soon', badge: '!', text: t('Due today', '今天到期') };
  if (d === 1) return { tone: 'soon', badge: '1d', text: t(`Tomorrow · ${shortDate(iso)}`, `明天 · ${shortDate(iso)}`) };
  if (d <= 3) return { tone: 'soon', badge: `${d}d`, text: t(`${d} days left · ${shortDate(iso)}`, `剩 ${d} 天 · ${shortDate(iso)}`) };
  return { tone: 'future', badge: `${d}d`, text: t(`${d} days left`, `剩 ${d} 天`) };
}

function countdown(iso: string, todayIso: string, t: T): { tone: Tone; text: string } {
  const d = daysUntil(iso, todayIso);
  if (d < 0) {
    const n = Math.abs(d);
    return { tone: 'overdue', text: t(`${n} ${plural(n, 'day', 'days')} overdue`, `逾期 ${n} 天`) };
  }
  if (d === 0) return { tone: 'soon', text: t('Today', '今天') };
  if (d === 1) return { tone: 'soon', text: t('Tomorrow', '明天') };
  return { tone: toneFor(iso, todayIso), text: t(`${d} days left`, `剩 ${d} 天`) };
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="border rounded-[6px] px-4 py-3.5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="text-[24px] font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>{value}</div>
      <div className="text-[12px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function PanelHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="h-10 px-3.5 border-b flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
      {right}
    </div>
  );
}

function CountLabel({ count, t }: { count: number; t: T }) {
  return <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{count} {t('items', '項')}</span>;
}

function WorkRow({ w, todayIso, t }: { w: DashWork; todayIso: string; t: T }) {
  const bookingIso = w.bookingIso ?? w.bookingConfirmedIso;
  const hasDates = Boolean(bookingIso || w.shipmentIso);
  const bookingWhen = w.bookingIso ? countdown(w.bookingIso, todayIso, t) : null;
  const shipmentWhen = w.shipmentIso ? countdown(w.shipmentIso, todayIso, t) : null;

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div className="grid grid-cols-2 md:grid-cols-[48fr_26fr_26fr] gap-x-3 gap-y-3 px-3.5 py-3">
        <div className={hasDates ? 'col-span-2 md:col-span-1 min-w-0' : 'col-span-2 min-w-0'}>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
            <span className="tabular-nums">{w.ref}</span> · {t(w.productEn, w.productZh)}
          </div>
          <div className="mt-1 text-[12px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>
            <div>{w.qty ? `${w.qty} · ` : ''}{t('Buyer', '買家')}: {w.buyer}, {w.buyerCountry}</div>
            <div>{t('Ship-to', '目的地')}: {w.shipTo.length ? w.shipTo.join(' · ') : t('Unknown', '未提供')}</div>
            <div>{t('Status', '狀態')}: {t(w.statusEn, w.statusZh)}</div>
          </div>
        </div>

        {hasDates && (
          <>
            <div className="min-w-0">
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {w.bookingIso ? t('Booking date', '訂艙日期') : t('Booking confirmed', '已確認訂艙')}
              </div>
              <div className="text-[13px] font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{bookingIso ? longDate(bookingIso) : t('Unknown', '未提供')}</div>
              {bookingWhen && (
                <div className="text-[12px] mt-0.5" style={{ color: TONE_COLOR[bookingWhen.tone] }}>{bookingWhen.text}</div>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('Shipment date', '出貨日期')}</div>
              <div className="text-[13px] font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{w.shipmentIso ? longDate(w.shipmentIso) : t('Unknown', '未提供')}</div>
              {shipmentWhen && (
                <div className="text-[12px] mt-0.5" style={{ color: TONE_COLOR[shipmentWhen.tone] }}>{shipmentWhen.text}</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3.5 py-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
          {t('Source', '來源')}: {w.sourceRef} / {w.sourceSubject}
        </span>
        <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{w.updatedText}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLang();
  const { companyId } = useCompany();
  const isDemo = companyId === DASHBOARD_DEMO_COMPANY_ID;

  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<'quote' | 'order'>('order');
  const [filedOpen, setFiledOpen] = useState(false);

  const todayIso = isDemo ? DEMO_TODAY_ISO : todayIsoLocal(now);

  const actions = DASHBOARD_ACTIONS;
  const waiting = DASHBOARD_WAITING;
  const quotes = DASHBOARD_WORK.filter((w) => w.kind === 'quote');
  const orders = DASHBOARD_WORK.filter((w) => w.kind === 'order');
  const shown = tab === 'quote' ? quotes : orders;
  const filed = DASHBOARD_FILED;

  const refresh = () => {
    setRefreshing(true);
    setNow(new Date());
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-[20px] font-semibold" style={{ color: 'var(--text)' }}>{t('Dashboard', '儀表板')}</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('What needs you right now, at a glance.', '一眼看清現在需要您處理的事。')}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          aria-label={t('Refresh', '重新整理')}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] border transition-colors hover:bg-[var(--bg)] disabled:opacity-50 shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <RefreshCw aria-hidden className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? t('Refreshing…', '重新整理中…') : t('Refresh', '重新整理')}
        </button>
      </div>

      <div className="space-y-4">
        {isDemo && (
          <div className="flex justify-end">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
              {t('Sample data', '範例資料')}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard value={actions.length} label={t('Needs your action', '需要你處理')} />
          <StatCard value={waiting.length} label={t('Waiting on others', '等待他人')} />
          <StatCard value={quotes.length} label={t('Open quotes', '進行中報價')} />
          <StatCard value={orders.length} label={t('Open orders', '進行中訂單')} />
        </div>

        {/* Needs your action */}
        {actions.length > 0 && (
          <section className="border rounded-[6px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <PanelHeader title={t('Needs your action', '需要你處理')} right={<CountLabel count={actions.length} t={t} />} />
            {actions.map((a) => {
              const timing = actionTiming(a.dueIso, todayIso, t);
              return (
                <Link
                  key={a.id}
                  href="/admin/inbox"
                  className="flex items-center gap-3 px-3.5 py-2.5 min-h-[56px] border-b last:border-b-0 transition-colors hover:bg-[var(--bg)]"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white tabular-nums"
                    style={{ background: AMBER }}
                  >
                    {timing.badge}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{t(a.titleEn, a.titleZh)}</span>
                    <span className="block text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {a.ref} · {t(a.productEn, a.productZh)} · {t(a.contextEn, a.contextZh)}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-3 md:hidden">
                      <span className="text-[12px]" style={{ color: TONE_COLOR[timing.tone] }}>{timing.text}</span>
                      <span className="text-[12px]" style={{ color: 'var(--accent)' }}>{t('View', '檢視')} →</span>
                    </span>
                  </span>

                  <span className="hidden md:block w-[150px] shrink-0 text-[12px]" style={{ color: TONE_COLOR[timing.tone] }}>{timing.text}</span>
                  <span className="hidden md:block w-16 shrink-0 text-right text-[12px]" style={{ color: 'var(--accent)' }}>{t('View', '檢視')} →</span>
                </Link>
              );
            })}
          </section>
        )}

        {/* Waiting on others */}
        {waiting.length > 0 && (
          <section className="border rounded-[6px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <PanelHeader title={t('Waiting on others', '等待他人')} right={<CountLabel count={waiting.length} t={t} />} />
            {waiting.map((w, i) => (
              <Link
                key={w.id}
                href="/admin/inbox"
                className="flex items-center gap-3 px-3.5 py-2.5 min-h-[56px] border-b last:border-b-0 transition-colors hover:bg-[var(--bg)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums"
                  style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  {i + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{w.party}</span>
                  <span className="block text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {t(w.waitingEn, w.waitingZh)} · {w.ref}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-3 md:hidden">
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('Since', '自')} {shortDate(w.sinceIso)}</span>
                    <span className="text-[12px]" style={{ color: 'var(--accent)' }}>{t('View', '檢視')} →</span>
                  </span>
                </span>

                <span className="hidden md:block w-[150px] shrink-0 text-right text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {t('Since', '自')} {shortDate(w.sinceIso)}
                </span>
                <span className="hidden md:block w-16 shrink-0 text-right text-[12px]" style={{ color: 'var(--accent)' }}>{t('View', '檢視')} →</span>
              </Link>
            ))}
          </section>
        )}

        {/* Open work */}
        {(quotes.length > 0 || orders.length > 0) && (
          <section className="border rounded-[6px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <PanelHeader
              title={t('Open work', '進行中的工作')}
              right={
                <div className="flex items-center gap-1.5">
                  {([
                    { key: 'quote' as const, label: t('Quotes', '報價'), count: quotes.length },
                    { key: 'order' as const, label: t('Orders', '訂單'), count: orders.length },
                  ]).map((opt) => {
                    const active = tab === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setTab(opt.key)}
                        className="text-[12px] font-medium px-2.5 py-1 rounded-[4px] border transition-colors"
                        style={{
                          background: active ? 'var(--accent)' : 'var(--surface)',
                          color: active ? '#fff' : 'var(--text-muted)',
                          borderColor: active ? 'var(--accent)' : 'var(--border)',
                        }}
                      >
                        {opt.label} <span aria-hidden className="tabular-nums opacity-80">{opt.count}</span>
                      </button>
                    );
                  })}
                </div>
              }
            />

            {shown.length === 0 ? (
              <div className="px-3.5 py-6 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('Nothing here yet.', '暫時沒有項目。')}
              </div>
            ) : (
              shown.map((w) => <WorkRow key={w.id} w={w} todayIso={todayIso} t={t} />)
            )}
          </section>
        )}

        {/* Filed */}
        <section className="border rounded-[6px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <button
            type="button"
            onClick={() => setFiledOpen((v) => !v)}
            aria-expanded={filedOpen}
            className="w-full h-10 px-3.5 flex items-center justify-between gap-3 text-left transition-colors hover:bg-[var(--bg)]"
          >
            <span className="flex items-center gap-2 min-w-0">
              <ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition-transform" style={{ color: 'var(--text-muted)', transform: filedOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{t('Filed', '已歸檔')}</span>
              <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{filed.length}</span>
            </span>
            <span className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{t('Completed and kept for reference', '已完成，保留供參考')}</span>
          </button>
          {filedOpen && (
            <div className="border-t" style={{ borderColor: 'var(--border)' }}>
              {filed.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <span className="min-w-0 truncate text-[13px]" style={{ color: 'var(--text)' }}>
                    <span className="tabular-nums">{f.ref}</span> · {t(f.productEn, f.productZh)}
                  </span>
                  <span className="shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>{longDate(f.doneIso)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Demo-only WhatsApp preview — illustrative only, sends nothing. */}
        {isDemo && (
          <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <span>{t('WhatsApp · Phone preview', 'WhatsApp · 電話預覽')}</span>
              <span>{t('Booking due in 3 days - HT-2048', '訂艙將於 3 天後到期 - HT-2048')}</span>
              <span>{t('Illustrative reminder', '示意提醒')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
