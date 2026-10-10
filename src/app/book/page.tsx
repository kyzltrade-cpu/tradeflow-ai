'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
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
   costing the owner time, so the form asks for it in their words. */

const VOLUMES: [string, string][] = [
  ['Fewer than 50 a month', '每月少於 50 封'],
  ['50–200 a month', '每月 50–200 封'],
  ['200–500 a month', '每月 200–500 封'],
  ['More than 500 a month', '每月超過 500 封'],
];

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
      <section className="band-dark band-glow">
        <div className="shell">
          {sent ? (
            <div className="card mx-auto max-w-2xl p-8 text-center md:p-12" style={{ background: 'var(--paper-2)' }}>
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
            <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
              {/* ── Calendar ─────────────────────────────────────────────── */}
              <div>
                <p className="eyebrow">{t('Step 1 · Pick a time', '第一步 · 選擇時間')}</p>
                <div className="mt-6">
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

                {chosen && (
                  <div className="mt-8">
                    <p className="eyebrow">{longDate(chosen, locale)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
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
                            className="cursor-pointer rounded-[4px] border px-3.5 py-2 text-[13.5px] tabular-nums transition-colors"
                            style={{
                              borderColor: on ? 'var(--pine)' : 'var(--hairline-2)',
                              background: on ? 'var(--accent-light)' : 'transparent',
                              color: on ? 'var(--pine)' : 'var(--ink-2)',
                              fontWeight: on ? 600 : 400,
                            }}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                      {t(
                        `Times shown in ${tz}. Mon, Wed and Fri afternoons and evenings; Tue and Thu after 7pm.`,
                        `時間以 ${tz} 顯示。週一、三、五下午至晚上；週二、四晚上 7 時後。`
                      )}
                    </p>
                  </div>
                )}

                {/* Fills the column under the calendar, and answers the two
                    questions a booking page always raises: what happens, and
                    who am I talking to. */}
                <div className="mt-10 border-t pt-8" style={{ borderColor: 'var(--hairline)' }}>
                  <p className="eyebrow">{t('What happens on the call', '通話會發生什麼')}</p>
                  <ul className="mt-5 space-y-3">
                    {[
                      t(
                        'We open a real inquiry from your inbox — or one of ours, if you would rather watch first.',
                        '我們打開一封您信箱中的真實詢盤——如果您想先看，也可以用我們的。'
                      ),
                      t(
                        'You watch the specs get extracted, the gaps flagged and the quote drafted, live.',
                        '您會看到規格被擷取、缺漏被標示、報價被草擬的整個過程。'
                      ),
                      t(
                        'We tell you plainly whether it is a fit. No deck, no sales script.',
                        '我們會直說它是否適合您。沒有簡報，沒有推銷話術。'
                      ),
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-3 text-[14px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                        <CircleCheck className="mt-[3px] h-4 w-4 shrink-0" style={{ color: 'var(--pine)' }} />
                        {line}
                      </li>
                    ))}
                  </ul>

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

              {/* ── Form ─────────────────────────────────────────────────── */}
              <form onSubmit={submit}>
                <p className="eyebrow">{t('Step 2 · Who we are speaking to', '第二步 · 與誰通話')}</p>

                <div className="mt-6 space-y-5">
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

                {fail && (
                  <div role="alert" className="field-error mt-6">
                    {fail}
                  </div>
                )}

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <button type="submit" disabled={sending} className="btn btn-primary">
                    {sending ? t('Sending…', '傳送中…') : t('Request the call', '預約通話')}
                    {!sending && <ArrowRight className="h-4 w-4" />}
                  </button>
                  <p className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                    {when && slotLabel
                      ? `${longDate(when, locale)} · ${slotLabel}`
                      : t('No time selected yet', '尚未選擇時間')}
                  </p>
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
