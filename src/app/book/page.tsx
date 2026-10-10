'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CircleCheck } from 'lucide-react';
import SiteHeader from '@/components/landing/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import MiniCalendar from '@/components/landing/booking/MiniCalendar';
import {
  HORIZON_DAYS,
  atHour,
  LOCALE_EN,
  LOCALE_ZH,
  longDate,
  slotsFor,
  startOfDay,
  validation,
} from '@/components/landing/booking/scheduling';
import { useLang } from '@/lib/lang';

/* The booking page.

   Replaces a modal that was never mounted — every "Book a pilot call" on the
   site fired an event with no listener, so the buttons did nothing. A page also
   gives the questions room: the point of the call is to hear what is actually
   costing the owner time, so the form asks for it in their words.

   Layout is two steps side by side on desktop and stacked on a phone, with one
   numbered header style announcing both. The two halves are deliberately not
   the same object: the month is a white card because it is the thing you look
   at, the form is drawn straight onto the band because it is the thing you fill
   in. Running a border around both made them compete. */

const VOLUMES: [string, string][] = [
  ['Fewer than 50 a month', '每月少於 50 封'],
  ['50–200 a month', '每月 50–200 封'],
  ['200–500 a month', '每月 200–500 封'],
  ['More than 500 a month', '每月超過 500 封'],
];

const CALL_STEPS: [string, string][] = [
  [
    'We open a real inquiry from your inbox — or one of ours, if you would rather watch first.',
    '我們打開一封您信箱中的真實詢盤——如果您想先看，也可以用我們的。',
  ],
  [
    'You watch the specs get extracted, the gaps flagged and the quote drafted, live.',
    '您會看到規格被擷取、缺漏被標示、報價被草擬的整個過程。',
  ],
  [
    'We tell you plainly whether it is a fit. No deck, no sales script.',
    '我們會直說它是否適合您。沒有簡報，沒有推銷話術。',
  ],
];

/* Both steps are announced the same way — counter, title, rule — so the two
   columns read as one flow rather than as two unrelated panels. */
function StepHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center border font-mono text-[11px] tabular-nums"
        style={{ borderColor: 'var(--hairline-2)', color: 'var(--accent)' }}
      >
        {n}
      </span>
      <h2
        className="font-mono text-[12px] font-medium uppercase tracking-[0.18em]"
        style={{ color: 'var(--ink)' }}
      >
        {title}
      </h2>
      <span
        aria-hidden="true"
        className="h-px flex-1"
        style={{ background: 'var(--hairline)' }}
      />
    </div>
  );
}

export default function BookPage() {
  const { t, lang } = useLang();
  const zh = lang === 'zh';
  const locale = zh ? LOCALE_ZH : LOCALE_EN;

  const min = useMemo(() => startOfDay(new Date()), []);
  const max = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + HORIZON_DAYS);
    return d;
  }, []);
  const [month, setMonth] = useState(() => {
    const d = startOfDay(new Date());
    d.setDate(1);
    return d;
  });

  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [volume, setVolume] = useState('');
  const [problems, setProblems] = useState('');

  const [errs, setErrs] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [fail, setFail] = useState('');

  const chosen = day ? new Date(`${day}T00:00:00`) : null;
  const slots = chosen ? slotsFor(chosen, locale) : [];
  const when = chosen && hour !== null ? atHour(chosen, hour) : null;
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validation({ name, email, company }, {});
    setErrs(next);
    if (Object.keys(next).length) return;
    if (!when || hour === null) {
      setFail(t('Pick a time for the call first.', '請先選擇通話時間。'));
      return;
    }
    setSending(true);
    setFail('');
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company,
          volume,
          note: problems,
          whenIso: when.toISOString(),
          whenLabel: `${longDate(when, locale)} · ${slotsFor(when, locale).find((s) => s.hour === hour)?.label ?? ''}`,
          tz,
        }),
      });
      if (!res.ok) throw new Error('failed');
      setSent(true);
    } catch {
      setFail(
        t(
          'Something went wrong. Email tradeflow.hk@gmail.com and we will sort it out.',
          '出了問題。請電郵 tradeflow.hk@gmail.com，我們會為您處理。'
        )
      );
    } finally {
      setSending(false);
    }
  };

  const slotLabel = when && hour !== null ? slotsFor(when, locale).find((s) => s.hour === hour)?.label : null;

  return (
    <div className="landing min-h-screen">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow">
        <div className="shell pt-[116px] pb-16 lg:pt-[148px] lg:pb-20">
          <p className="eyebrow" style={{ color: 'var(--accent)' }}>
            {t('Book a pilot call', '預約試用通話')}
          </p>
          <h1 className="display h-section mt-5 max-w-4xl text-balance">
            {t('Thirty minutes on your inquiries.', '用三十分鐘，談您的詢盤流程。')}
          </h1>
          <p className="lede mt-5 max-w-2xl">
            {t(
              'Tell us what is costing you the most time. We will show you how Sailwise would handle it on your own threads — and say plainly if it is not a fit.',
              '告訴我們最耗費您時間的是什麼。我們會在您自己的對話上示範 Sailwise 如何處理——如果不適合，我們也會直說。'
            )}
          </p>
        </div>
      </section>

      {/* ── Pick a time, then tell us about it ───────────────────────────── */}
      {/* `band` carries the vertical rhythm; `band-white` is the plain white
          ground this desk sits on. No `band-glow` — the ambience wash is the
          same colour as the shadow the calendar casts. */}
      <section className="band band-white">
        <div className="shell">
          {sent ? (
            <div className="card mx-auto max-w-2xl bg-white p-8 text-center md:p-12">
              <CircleCheck className="mx-auto h-10 w-10" style={{ color: 'var(--pine)' }} />
              <h2 className="display text-[1.75rem] mt-5">{t('That is booked.', '已預約完成。')}</h2>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {t(
                  `We have you down for ${longDate(when as Date, locale)}${slotLabel ? ` at ${slotLabel}` : ''}. A confirmation is on its way to ${email}.`,
                  `我們已為您保留 ${longDate(when as Date, locale)}${slotLabel ? ` ${slotLabel}` : ''}。確認信正寄往 ${email}。`
                )}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/product" className="btn btn-primary">
                  {t('See the product in the meantime', '等候期間先看看產品')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/" className="btn btn-outline">
                  {t('Back to home', '返回首頁')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-12 lg:grid-cols-[0.94fr_1.06fr] lg:gap-16">
                {/* ── Step 1 · the picker ──────────────────────────────── */}
                <div>
                  <StepHead n="01" title={t('Pick a time', '選擇時間')} />

                  <div className="mt-8">
                    <MiniCalendar
                      month={month}
                      onMonth={setMonth}
                      selected={day}
                      onSelect={(iso) => {
                        setDay(iso);
                        setHour(null);
                        setFail('');
                      }}
                      min={min}
                      max={max}
                      zh={zh}
                    />
                  </div>

                  {chosen ? (
                    <div className="mt-9">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="eyebrow" style={{ color: 'var(--accent)' }}>
                          {longDate(chosen, locale)}
                        </p>
                        <p className="text-[12px] tabular-nums" style={{ color: 'var(--ink-3)' }}>
                          {t(`${slots.length} times`, `${slots.length} 個時段`)}
                        </p>
                      </div>

                      {/* A hairline grid rather than loose pills: the times read
                          as one block you pick a cell out of, and the count on
                          the right says at a glance how much of the day is
                          still free. */}
                      <div
                        className="mt-4 grid grid-cols-3 gap-px border"
                        style={{ background: 'var(--hairline)', borderColor: 'var(--hairline)' }}
                      >
                        {slots.map((s) => {
                          const on = hour === s.hour;
                          return (
                            <button
                              key={s.hour}
                              type="button"
                              onClick={() => {
                                setHour(s.hour);
                                setFail('');
                              }}
                              aria-pressed={on}
                              className={`cursor-pointer py-2.5 text-[13.5px] tabular-nums transition-colors ${
                                on ? '' : 'bg-white hover:bg-black/[0.035]'
                              }`}
                              style={
                                on
                                  ? { background: 'var(--pine)', color: '#ffffff', fontWeight: 600 }
                                  : { color: 'var(--ink-2)' }
                              }
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>

                      <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                        {t(
                          `Times shown in ${tz}. Mon, Wed and Fri afternoons and evenings; Tue and Thu after 7pm.`,
                          `時間以 ${tz} 顯示。週一、三、五下午至晚上；週二、四晚上 7 時後。`
                        )}
                      </p>
                    </div>
                  ) : (
                    /* The empty state says what to do rather than leaving the
                       column trailing off after the calendar. It carries no rule
                       of its own — the block below opens with one, and two
                       hairlines a line apart read as a mistake. */
                    <p
                      className="mt-6 flex items-center gap-3 text-[13.5px] leading-relaxed"
                      style={{ color: 'var(--ink-2)' }}
                    >
                      <CalendarDays className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
                      {t('Pick a day to see the times we have open.', '選擇日期以查看可預約時間。')}
                    </p>
                  )}

                  {/* Answers the two questions a booking page always raises:
                      what happens on the call, and who am I talking to. It sits
                      under the calendar so it is read after a time is chosen,
                      and answers the question you have at that point. */}
                  <div className="mt-10 border-t pt-8" style={{ borderColor: 'var(--hairline)' }}>
                    <p className="eyebrow" style={{ color: 'var(--accent)' }}>
                      {t('What happens on the call', '通話會發生什麼')}
                    </p>

                    <ol className="mt-6 space-y-5">
                      {CALL_STEPS.map(([en, zhh], i) => (
                        <li key={en} className="grid grid-cols-[1.6rem_1fr] gap-x-4">
                          <span
                            className="pt-[3px] font-mono text-[11px] tabular-nums tracking-[0.14em]"
                            style={{ color: 'var(--ink-3)' }}
                          >
                            {`0${i + 1}`}
                          </span>
                          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                            {t(en, zhh)}
                          </p>
                        </li>
                      ))}
                    </ol>

                    <div className="mt-8 flex items-center gap-4">
                      <span className="flex shrink-0 gap-2">
                        {['/founders/kyle.jpg', '/founders/neel.jpg'].map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt=""
                            aria-hidden="true"
                            width={48}
                            height={48}
                            className="h-12 w-12 object-cover"
                          />
                        ))}
                      </span>
                      <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                        {t(
                          'You will speak to Kyle or Neel — the two people who built it.',
                          '與您通話的是 Kyle 或 Neel——打造這個產品的兩個人。'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Step 2 · the form ────────────────────────────────── */}
                <form onSubmit={submit}>
                  <StepHead n="02" title={t('Who we are speaking to', '與誰通話')} />

                  <div className="mt-8 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="name" className="field-label">
                          {t('Your name', '您的姓名')}
                        </label>
                        <input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                          className="field-input"
                          aria-invalid={!!errs.name}
                        />
                        {errs.name && <p className="field-hint mt-1.5" style={{ color: 'var(--peach)' }}>{t('Required', '必填')}</p>}
                      </div>
                      <div>
                        <label htmlFor="company" className="field-label">
                          {t('Company', '公司')}
                        </label>
                        <input
                          id="company"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          autoComplete="organization"
                          className="field-input"
                          aria-invalid={!!errs.company}
                        />
                        {errs.company && <p className="field-hint mt-1.5" style={{ color: 'var(--peach)' }}>{t('Required', '必填')}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="field-label">
                        {t('Work email', '公司電郵')}
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="field-input"
                        aria-invalid={!!errs.email}
                      />
                      {errs.email && <p className="field-hint mt-1.5" style={{ color: 'var(--peach)' }}>{t('A valid email, so we can send the invite', '請填有效電郵，以便寄送邀請')}</p>}
                    </div>

                    {/* The first three fields are about the person; the last two
                        are about the inbox. A rule marks the change of subject
                        so the form does not read as one undifferentiated stack
                        of inputs. */}
                    <div className="grid gap-5 border-t pt-7" style={{ borderColor: 'var(--hairline)' }}>
                      <div>
                        <label htmlFor="volume" className="field-label">
                          {t('Roughly how many inquiries a month?', '每月大約多少封詢盤？')}
                        </label>
                        <select
                          id="volume"
                          value={volume}
                          onChange={(e) => setVolume(e.target.value)}
                          className="field-input"
                          style={{ height: 44 }}
                        >
                          <option value="">{t('Prefer not to say', '不願透露')}</option>
                          {VOLUMES.map(([en, zhh]) => (
                            <option key={en} value={en}>
                              {t(en, zhh)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="problems" className="field-label">
                          {t('What is costing you the most time right now?', '目前最耗費您時間的是什麼？')}
                        </label>
                        <textarea
                          id="problems"
                          value={problems}
                          onChange={(e) => setProblems(e.target.value)}
                          rows={5}
                          placeholder={t(
                            'Chasing specs, rebuilding quotes, missing follow-ups — in your words.',
                            '追規格、重做報價、漏掉跟進——用您自己的話說。'
                          )}
                          className="field-input"
                          style={{ height: 'auto', padding: '0.7rem 0.75rem', lineHeight: 1.6, resize: 'vertical' }}
                        />
                        <p className="field-hint mt-1.5">
                          {t(
                            'This is the part we care about most — it decides what we show you.',
                            '這是我們最在意的部分——它決定我們向您示範什麼。'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {fail && (
                    <div role="alert" className="field-error mt-6">
                      {fail}
                    </div>
                  )}

                  {/* The chosen slot is repeated next to the button that commits
                      to it: by the time you reach the bottom of the form on a
                      phone, the calendar is a full screen away. */}
                  <div
                    className="mt-9 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-t pt-7"
                    style={{ borderColor: 'var(--hairline)' }}
                  >
                    <div>
                      <p className="eyebrow">{t('Your call', '您的通話')}</p>
                      <p
                        id="call-summary"
                        className="mt-2 text-[15px]"
                        style={{ color: slotLabel ? 'var(--ink)' : 'var(--ink-3)' }}
                      >
                        {slotLabel && when
                          ? `${longDate(when, locale)} · ${slotLabel}`
                          : t('No time selected yet', '尚未選擇時間')}
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={sending || !when}
                      aria-describedby="call-summary"
                      className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? t('Sending…', '傳送中…') : t('Request the call', '預約通話')}
                      {!sending && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>

                  <p className="mt-5 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                    {t(
                      'We reply to every request ourselves. Your details are used to arrange this call and nothing else.',
                      '每一封請求都由我們親自回覆。您的資料只會用於安排這次通話。'
                    )}
                  </p>
                </form>
              </div>

          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
