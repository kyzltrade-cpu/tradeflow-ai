'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  Clock,
  Mail,
  MessageCircle,
  X,
} from 'lucide-react';
import { onBookingOpen } from './booking-bus';
import { useLang } from '@/lib/lang';
import { PILOT_WHATSAPP_HREF } from '@/lib/pilot';
import MiniCalendar from './booking/MiniCalendar';
import {
  HORIZON_DAYS,
  atHour,
  buildIcs,
  downloadIcs,
  isoDate,
  longDate,
  slotsFor,
  startOfDay,
  validation,
} from './booking/scheduling';

const DURATION = 30;

const AGENDA: [string, string][] = [
  ['The threads sitting unanswered longest', '最久沒回覆的詢盤'],
  ['Which specs you chase by hand today', '您目前需手動確認的規格'],
  ['What a pilot on your inbox would cover', '試用具體涵蓋範圍'],
  ['Price — after we have seen your real quotes', '價格，在看過真實報價後再談'],
];

const VOLUMES: [string, string][] = [
  ['Under 50', '少於 50'],
  ['50–200', '50–200'],
  ['200–1,000', '200–1,000'],
  ['Over 1,000', '多於 1,000'],
];

type Step = 'time' | 'details' | 'done';

export default function BookingModal() {
  const { lang } = useLang();
  const zh = lang === 'zh';
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('time');

  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [volume, setVolume] = useState('');
  const [note, setNote] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const min = useMemo(() => startOfDay(new Date()), []);
  const max = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + HORIZON_DAYS);
    return d;
  }, []);

  const tz = useMemo(
    () => (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'),
    []
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(
    () =>
      onBookingOpen(() => {
        restoreRef.current = document.activeElement as HTMLElement;
        setStep('time');
        setOpen(true);
      }),
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!nodes?.length) return;
      const list = Array.from(nodes).filter((n) => n.offsetParent !== null);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => firstRef.current?.focus(), 40);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(timer);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => restoreRef.current?.focus(), 0);
  };

  if (!open) return null;

  const chosen = day ? new Date(day) : null;
  const when = chosen && hour !== null ? atHour(chosen, hour) : null;
  const slots = day ? slotsFor(chosen as Date) : [];

  const confirm = async () => {
    const next = validation({ name, email, company }, errs);
    setErrs(next);
    if (Object.keys(next).length) return;
    if (!when) return;
    setSubmitErr('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company,
          volume,
          note,
          whenIso: when.toISOString(),
          whenLabel: `${longDate(when)} · ${
            slotsFor(when).find((s) => s.hour === hour)?.label ?? ''
          }`,
          tz,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      setStep('done');
    } catch {
      setSubmitErr(
        zh
          ? '未能送出預約，請再試一次，或改用 WhatsApp 聯絡我們。'
          : 'Could not send your request. Please try again, or reach us on WhatsApp.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const addToCalendar = () => {
    if (!when) return;
    const label = slotsFor(when).find((s) => s.hour === hour)?.label ?? '';
    downloadIcs(
      buildIcs(when, DURATION, `${name} · ${company}`),
      `sailwise-pilot-${isoDate(when)}.ics`
    );
    void label;
  };

  const steps: { key: Step; en: string; zh: string }[] = [
    { key: 'time', en: 'Pick a time', zh: '選擇時間' },
    { key: 'details', en: 'Your details', zh: '您的資料' },
    { key: 'done', en: 'Requested', zh: '已送出' },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  const input =
    'w-full rounded-lg border border-[var(--hairline)] bg-white px-3 py-2.5 text-[14px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-3)]/60 focus:border-[var(--pine)] focus:ring-2 focus:ring-[var(--pine)]/12';
  const labelCls = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-3)]';
  const field = 'space-y-3.5';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-3 sm:p-6"
      style={{ background: 'rgba(27,25,23,0.52)', backdropFilter: 'blur(3px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={zh ? '預約通話' : 'Book a call'}
        className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_40px_100px_-40px_rgba(20,52,43,0.55)]"
      >
        <div className="grid md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          {/* What the call is. Sold on the left so the calendar is never the
              first thing read — people book when they know what they get. */}
          <aside className="flex flex-col justify-between bg-[var(--pine)] p-6 text-[#F4F1EA] sm:p-7">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold">
                <Clock className="h-3 w-3" />
                {DURATION} {zh ? '分鐘' : 'minutes'}
              </span>
              <h2 className="display mt-4 text-[1.6rem] leading-tight">
                {zh ? '創始試用通話' : 'Founding pilot call'}
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#F4F1EA]/70">
                {zh
                  ? '不用簡報。帶一封真實詢盤，我們現場跑一次給您看。'
                  : 'No deck. Bring one real inquiry and we will run it live on the call.'}
              </p>

              <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-white/8 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F4F1EA] text-[11px] font-bold text-[var(--pine)]">
                  KT
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">
                    {zh ? '團隊 · Sailwise' : 'The Sailwise team'}
                  </span>
                  <span className="block text-[11.5px] text-[#F4F1EA]/60">
                    {zh ? '香港 · 繁體中文 / English' : 'Hong Kong · English / 繁體中文'}
                  </span>
                </span>
              </div>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F4F1EA]/50">
                {zh ? '我們會談什麼' : 'What we will cover'}
              </p>
              <ul className="mt-2.5 space-y-2">
                {AGENDA.map(([en, cn]) => (
                  <li key={en} className="flex gap-2 text-[12.5px] leading-snug text-[#F4F1EA]/85">
                    <Check className="mt-[2px] h-3 w-3 shrink-0 text-[#8FD3BE]" strokeWidth={3} />
                    {zh ? cn : en}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={PILOT_WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#F4F1EA]/70 transition hover:text-[#F4F1EA]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {zh ? '改用 WhatsApp 聯絡' : 'Rather talk on WhatsApp?'}
            </a>
          </aside>

          <div className="flex flex-col p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <ol className="flex flex-1 items-center gap-2">
                {steps.map((s, i) => (
                  <li key={s.key} className="flex flex-1 items-center gap-2">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition ${
                        i < stepIndex
                          ? 'bg-[var(--pine)] text-white'
                          : i === stepIndex
                            ? 'bg-[var(--ink)] text-white'
                            : 'bg-black/[0.06] text-[var(--ink-3)]'
                      }`}
                    >
                      {i < stepIndex ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                    </span>
                    <span
                      className={`hidden truncate text-[12px] font-medium sm:block ${
                        i === stepIndex ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'
                      }`}
                    >
                      {zh ? s.zh : s.en}
                    </span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--ink-3)] transition hover:bg-black/[0.05] hover:text-[var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === 'time' && (
              <div className="mt-5">
                <p className="text-[17px] font-semibold leading-snug text-[var(--ink)]">
                  {zh ? '甚麼時間方便？' : 'What time works?'}
                </p>
                <p className="mt-1 text-[12.5px] text-[var(--ink-2)]">
                  {zh
                    ? '我們只列出未來 60 天內的工作日。'
                    : 'Weekdays only, booked in Hong Kong time. Pick a day, then a slot.'}
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
                  <MiniCalendar month={month} onMonth={setMonth} selected={day} onSelect={setDay} min={min} max={max} zh={zh} />

                  <div>
                    <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                      {chosen ? longDate(chosen) : zh ? '選擇日期' : 'Select a day'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {slots.map((s) => {
                        const on = hour === s.hour;
                        return (
                          <button
                            key={s.hour}
                            type="button"
                            disabled={!day}
                            onClick={() => setHour(s.hour)}
                            aria-pressed={on}
                            className={`rounded-lg border px-3 py-2.5 text-[13px] font-medium transition disabled:cursor-not-allowed ${
                              on
                                ? 'border-[var(--pine)] bg-[var(--pine)] text-white'
                                : day
                                  ? 'border-[var(--hairline)] bg-white text-[var(--ink)] hover:border-[var(--pine)]/50 hover:bg-[var(--pine)]/[0.04]'
                                  : 'border-[var(--hairline)] bg-[#FAF9F6] text-[var(--ink-3)]/45'
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-[11px] text-[var(--ink-3)]">
                      {zh ? '時區' : 'Times shown in'} {tz.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-[var(--hairline)] pt-4">
                  <button
                    ref={firstRef}
                    type="button"
                    disabled={!when}
                    onClick={() => setStep('details')}
                    className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-[13.5px] disabled:opacity-35"
                  >
                    {zh ? '下一步' : 'Continue'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {step === 'details' && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setStep('time')}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--ink-3)] transition hover:text-[var(--ink)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {zh ? '更改時間' : 'Change time'}
                </button>

                <p className="mt-3 text-[17px] font-semibold leading-snug text-[var(--ink)]">
                  {zh ? '您的資料' : 'Where should we send the link?'}
                </p>
                <p className="mt-1 text-[12.5px] text-[var(--ink-2)]">
                  {when
                    ? `${longDate(when)} · ${slotsFor(when).find((s) => s.hour === hour)?.label} (${tz})`
                    : ''}
                </p>

                <div className={`mt-5 ${field}`}>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label className={labelCls} htmlFor="bk-name">
                        {zh ? '姓名' : 'Name'}
                      </label>
                      <input
                        id="bk-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={zh ? '陳大文' : 'Jordan Lee'}
                        className={input}
                      />
                      {errs.name && <p className="mt-1 text-[11px] text-[var(--terra)]">{zh ? '請輸入姓名' : 'Required'}</p>}
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="bk-company">
                        {zh ? '公司' : 'Company'}
                      </label>
                      <input
                        id="bk-company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder={zh ? '有限公司' : 'Apex Retail'}
                        className={input}
                      />
                      {errs.company && <p className="mt-1 text-[11px] text-[var(--terra)]">{zh ? '請輸入公司' : 'Required'}</p>}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="bk-email">
                      {zh ? '工作電郵' : 'Work email'}
                    </label>
                    <input
                      id="bk-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className={input}
                    />
                    {errs.email && (
                      <p className="mt-1 text-[11px] text-[var(--terra)]">
                        {zh ? '請輸入有效電郵' : 'Enter a valid work email'}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className={labelCls}>{zh ? '每月詢盤數量' : 'Inquiries per month'}</span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {VOLUMES.map(([en, cn]) => (
                        <button
                          key={en}
                          type="button"
                          onClick={() => setVolume(en)}
                          aria-pressed={volume === en}
                          className={`rounded-lg border px-3 py-2 text-[12.5px] font-medium transition ${
                            volume === en
                              ? 'border-[var(--pine)] bg-[var(--pine)]/[0.07] text-[var(--pine)]'
                              : 'border-[var(--hairline)] text-[var(--ink-2)] hover:border-[var(--pine)]/45'
                          }`}
                        >
                          {zh ? cn : en}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="bk-note">
                      {zh ? '想先討論甚麼？（選填）' : 'Anything we should look at first? (optional)'}
                    </label>
                    <textarea
                      id="bk-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder={zh ? '例如：上個月有 12 封詢盤沒回覆' : 'e.g. 12 inquiries went unanswered last month'}
                      className={`${input} resize-none`}
                    />
                  </div>
                </div>

<div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4">
                  <p className="text-[11px] leading-snug text-[var(--ink-3)]">
                    {submitErr ? (
                      <span className="text-[#B4232B]">{submitErr}</span>
                    ) : zh ? (
                      '我們會用電郵確認，並附上通話連結。'
                    ) : (
                      'We confirm by email with the call link.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={submitting}
                    className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-[13.5px] disabled:opacity-50"
                  >
                    {submitting
                      ? zh ? '傳送中…' : 'Sending…'
                      : zh ? '確認預約' : 'Confirm booking'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="mt-6 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--pine)]">
                  <Check className="h-5 w-5 text-white" strokeWidth={3} />
                </span>
                <h3 className="display mt-4 text-[1.35rem] leading-snug text-[var(--ink)]">
                  {zh ? '已收到您的預約' : 'Time held for you'}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--ink-2)]">
                  {when
                    ? `${longDate(when)} · ${slotsFor(when).find((s) => s.hour === hour)?.label} (${tz})`
                    : ''}
                </p>

                <div className="mx-auto mt-5 max-w-sm rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)] p-4 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                    {zh ? '接下來' : 'What happens next'}
                  </p>
                  <ol className="mt-2 space-y-1.5 text-[12.5px] leading-snug text-[var(--ink-2)]">
                    <li className="flex gap-2">
                      <Mail className="mt-[2px] h-3 w-3 shrink-0 text-[var(--ink-3)]" />
                      {zh
                        ? '我們已收到您的預約。'
                        : 'We have your booking request.'}
                    </li>
                    <li className="flex gap-2">
                      <MessageCircle className="mt-[2px] h-3 w-3 shrink-0 text-[var(--ink-3)]" />
                      {zh
                        ? '我們確認檔期後，會把通話連結電郵給您。'
                        : 'We confirm the slot and email you the call link.'}
                    </li>
                  </ol>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={addToCalendar}
                    className="btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px]"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    {zh ? '加入日曆' : 'Add to calendar'}
                  </button>
                  <a
                    href={PILOT_WHATSAPP_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hairline)] px-4 py-2.5 text-[13px] font-semibold text-[var(--ink-2)] transition hover:border-[var(--ink-3)]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {zh ? 'WhatsApp' : 'WhatsApp us'}
                  </a>
                </div>

                <button type="button" onClick={close} className="mt-5 text-[12.5px] font-semibold text-[var(--ink-3)] underline underline-offset-4 hover:text-[var(--ink)]">
                  {zh ? '關閉' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}