import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import SiteHeader from '@/components/landing/SiteHeader';
import PricingPrice from '@/components/landing/PricingPrice';
import {
  HeroProduct,
  InboxMock,
  HandoffMock,
  QuoteMock,
  WhatsAppMock,
} from '@/components/landing/ProductMocks';

/* ── Content ─────────────────────────────────────────────────────────────── */

const PROOF = [
  {
    title: 'Every field shows its work',
    body: 'Each extracted spec carries a confidence, a status and the source it came from — never a black-box summary you have to trust.',
  },
  {
    title: 'Approved, not auto-sent',
    body: 'Replies and quotes stay drafts until you say go. Nothing leaves your mailbox without you.',
  },
  {
    title: 'Your prices, your margins',
    body: 'Quote lines are calculated from your product list and margin rules — not invented by a language model.',
  },
];

const FACTS = [
  { value: '3', label: 'Languages handled' },
  { value: '4', label: 'Attachment formats parsed' },
  { value: '3 days', label: 'Follow-up cadence' },
  { value: 'Every send', label: 'Waits for your approval' },
];

const QUEUE = [
  {
    label: 'Needs specs',
    tone: '#8A8279',
    title: 'Waiting on the buyer',
    body: 'The inquiry is missing something you need before it can be priced. Sailwise drafts the one question to ask, in their language.',
  },
  {
    label: 'Owed replies',
    tone: '#B4552D',
    title: 'Waiting on you',
    body: 'The customer asked something and is still waiting. These are the threads quietly costing you the deal.',
  },
  {
    label: 'Needs you',
    tone: '#14342B',
    title: 'Ready for sign-off',
    body: 'A reply or a quote has been drafted and is sitting in your approval queue, one tap from going out.',
  },
];

const STEPS = [
  {
    code: 'INBOUND',
    title: 'The inquiry arrives',
    body: 'A buyer’s email lands in the mailbox you already use — no new app for your team or your customers to learn.',
  },
  {
    code: 'EXTRACT',
    title: 'Specs, extracted',
    body: 'Quantities, materials, certifications and lead times are pulled out and pinned to the line they came from.',
  },
  {
    code: 'CLARIFY',
    title: 'Gaps get clarified',
    body: 'Target price, Incoterm, destination. Sailwise flags what is missing and drafts one question in the customer’s language.',
  },
  {
    code: 'QUOTE',
    title: 'The quote is drafted',
    body: 'Priced from your product list, your margin rules and the live FX rate — every line traceable to its source.',
  },
];

const GATES = [
  {
    label: 'Approval',
    title: 'Every message is a draft',
    body: 'Replies, quotes and follow-ups all wait for your sign-off before they send.',
  },
  {
    label: 'Knowledge',
    title: 'Your rules do the pricing',
    body: 'Products, margins, certifications and FAQ rules define what the AI may say and charge.',
  },
  {
    label: 'Handover',
    title: 'Step in — and hand it back',
    body: 'Sailwise flags the sensitive threads — a discount, a complaint, a big order — and hands over. Take control mid-conversation, then hand it back to the AI when you are done.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 'HK$1,880',
    period: '/mo',
    features: [
      'Email inbox (Google / Microsoft)',
      'WhatsApp alerts when a thread needs you',
      'Unlimited AI conversations',
      'Unlimited products & FAQ rules',
      'English, Mandarin, Cantonese, Spanish',
      'Human takeover anytime',
    ],
  },
];

const FAQS = [
  {
    q: 'Does it work with the email I already use?',
    a: 'Yes. Sailwise runs over your existing mailbox with a one-click Google or Microsoft connection — no new software for your team or your customers.',
  },
  {
    q: 'Can it handle Chinese and mixed-language messages?',
    a: 'It reads and replies in English, Simplified and Traditional Chinese, and mixed-language threads — common across HK and Shenzhen trade.',
  },
  {
    q: 'Who controls what actually gets sent?',
    a: 'You do. Every reply and every quote is a draft until you approve it. Sailwise cites where each number came from so you can verify fast.',
  },
  {
    q: 'How does the WhatsApp feature work?',
    a: 'WhatsApp is how Sailwise reaches you, not a channel your customers talk to. When a thread needs a decision — a discount request, a large order — you get an alert with the sender, product and quantity. Replies and quotes always send as normal email from your own mailbox, so your customers see the address they already know.',
  },
  {
    q: 'Do I need to be technical to set it up?',
    a: 'No. Guided setup connects your mailbox, imports your products and gets you approving your first draft the same day.',
  },
  {
    q: 'Is my product and pricing data safe?',
    a: 'Your knowledge base is private to your company, stored encrypted, and never used to train models shared with other customers.',
  },
];

/* ── Shared ──────────────────────────────────────────────────────────────── */

function SectionHead({
  label,
  title,
  sub,
  align = 'left',
}: {
  label: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="eyebrow">{label}</p>
      <h2 className="display mt-4 text-balance text-[clamp(1.9rem,3.6vw,2.9rem)]">{title}</h2>
      {sub && (
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--ink-2)]">{sub}</p>
      )}
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--ink-2)]">
      <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--pine)]" />
      {children}
    </li>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="landing min-h-screen">
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="hero-wash px-6 pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">For HK &amp; Shenzhen trading companies</p>
            <h1 className="display mt-6 text-[clamp(2.5rem,6.4vw,4.5rem)]">
              Every inquiry answered.
              <br />
              <em>In seconds, not hours.</em>
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-balance text-[1.0625rem] leading-[1.75] text-[var(--ink-2)]">
              Sailwise turns a buyer’s email into a tracked deal — every spec extracted with its
              source, gaps flagged, and a priced quote drafted from your own product list and margin
              rules. You approve every word before it sends.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="group btn-primary w-full px-6 py-3 sm:w-auto">
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="#product" className="btn-ghost w-full px-6 py-3 sm:w-auto">
                See the product
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-[var(--ink-3)]">
              14-day free trial · No contracts · Cancel anytime
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl md:mt-20">
            <HeroProduct />
          </div>
        </div>
      </section>

      {/* ── Product facts ── */}
      <section className="border-y border-[var(--hairline)] px-6 py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 sm:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.label} className="text-center">
              <div className="display text-[1.5rem]">{f.value}</div>
              <div className="mt-1 text-[13px] text-[var(--ink-3)]">{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Proof trio ── */}
      <section className="border-y border-[var(--hairline)] bg-[var(--paper-2)] px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3 md:gap-14">
          {PROOF.map((p) => (
            <div key={p.title}>
              <h3 className="display text-[1.35rem]">{p.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-2)]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Statement ── */}
      <section className="band-dark px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="display text-[clamp(1.7rem,3.8vw,2.9rem)] leading-[1.22]">
            While you sleep, customers message three suppliers at once.
            <br className="hidden sm:block" /> Sailwise replies <em>first</em>.
          </p>
          <p className="mx-auto mt-7 max-w-lg text-[15px] leading-relaxed text-[rgba(244,241,236,0.68)]">
            In seconds, in their language, with pricing pulled from your own data.
          </p>
        </div>
      </section>

      {/* ── Product: one inbox ── */}
      <section id="product" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead label="One inbox" title="Your mailbox, turned into a work queue" />
          <div className="mt-6 grid gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-16">
            <div>
              <p className="max-w-lg text-[17px] leading-[1.75] text-[var(--ink-2)]">
                Inquiries land in the mailbox you already use — Gmail or Outlook, connected in one
                click. Sailwise extracts the specs, flags what is missing, and sorts every thread by
                what it needs from you next.
              </p>
              <ul className="mt-7 space-y-3.5">
                <Bullet>Works over the Gmail or Outlook mailbox you already use</Bullet>
                <Bullet>Specs, quantities and gaps pulled from the thread and its attachments</Bullet>
                <Bullet>Replies drafted in the customer’s own language</Bullet>
              </ul>
            </div>
            <div className="min-w-0">
              <InboxMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── Two-up: extraction & clarification ── */}
      <section className="border-y border-[var(--hairline)] bg-[var(--paper-2)] px-6 py-24 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-2 md:gap-8">
            <div className="ecard p-8 md:p-10">
              <p className="eyebrow">Extraction</p>
              <h3 className="display mt-4 text-[1.6rem]">Specs, pinned to the source</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-2)]">
                Quantities, materials, certifications and lead times are pulled out of the thread and
                tied to the exact line they came from. Nothing is inferred.
              </p>
              <div className="mt-7 rounded-xl border border-[var(--hairline)] bg-[var(--paper)] p-5">
                <p className="text-[11px] font-medium tracking-[0.16em] text-[var(--ink-3)] uppercase">
                  Extracted
                </p>
                <ul className="mt-3 space-y-2 text-[14px] text-[var(--ink)]">
                  <li>10,000 pcs · 500ml · double-wall 304</li>
                  <li>Logo printing · sample required</li>
                </ul>
                <p className="mt-4 border-t border-[var(--hairline)] pt-4 text-[12px] leading-relaxed text-[var(--ink-3)] italic">
                  from “Hi, we need 10,000 pcs of 500ml stainless steel bottles…”
                </p>
              </div>
            </div>

            <div className="ecard p-8 md:p-10">
              <p className="eyebrow">Clarification</p>
              <h3 className="display mt-4 text-[1.6rem]">Gaps get asked about, not assumed</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-2)]">
                Sailwise drafts one question in the customer’s language for whatever is missing. You
                approve it before it goes out.
              </p>
              <div className="mt-7 rounded-xl border border-[var(--hairline)] bg-[var(--paper)] p-5">
                <p className="text-[11px] font-medium tracking-[0.16em] text-[var(--ink-3)] uppercase">
                  Flagged before quoting
                </p>
                <ul className="mt-3 space-y-2 text-[14px] text-[var(--ink)]">
                  <li>Target price or budget?</li>
                  <li>Incoterm — FOB / CIF / EXW?</li>
                  <li>Delivery destination &amp; date?</li>
                </ul>
                <p className="mt-4 border-t border-[var(--hairline)] pt-4 text-[12px] text-[var(--ink-3)]">
                  Asked in English, 简体中文 or Español.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Work queue ── */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead label="The work queue" title="Every thread sorted by what it needs next" />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] md:grid-cols-3">
            {QUEUE.map((q) => (
              <div key={q.label} className="bg-[var(--paper)] p-8">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: q.tone }} />
                  <span
                    className="font-mono text-[11px] tracking-[0.18em] uppercase"
                    style={{ color: q.tone }}
                  >
                    {q.label}
                  </span>
                </div>
                <h3 className="display mt-4 text-[1.35rem]">{q.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-2)]">{q.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-[var(--ink-3)]">
            Each thread’s state is derived from the conversation itself — who spoke last, what is
            still missing, how many chases have gone unanswered — so the queue stays current without
            anyone maintaining it.
          </p>
        </div>
      </section>

      {/* ── Control (dark) ── */}
      <section className="band-dark px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
            <div>
              <p className="eyebrow">Built-in control</p>
              <h2 className="display mt-4 text-[clamp(1.9rem,3.6vw,2.9rem)]">
                AI does the legwork.
                <br />
                You stay in <em>control</em>.
              </h2>
              <p className="mt-6 max-w-lg text-[16px] leading-[1.75] text-[rgba(244,241,236,0.7)]">
                Nothing is sent on your behalf without a decision. Every message is a draft, every
                number is traceable, and you can take over any thread mid-conversation.
              </p>
              <ul className="mt-9 space-y-7">
                {GATES.map((g) => (
                  <li key={g.label}>
                    <p className="font-mono text-[11px] tracking-[0.2em] text-[rgba(244,241,236,0.5)] uppercase">
                      {g.label}
                    </p>
                    <p className="display mt-2 text-[1.25rem]">{g.title}</p>
                    <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-[rgba(244,241,236,0.62)]">
                      {g.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <HandoffMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── Quotes ── */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead label="Quotes" title="Quotes in seconds, priced from your data" />
          <div className="mt-6 grid gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-16">
            <div>
              <p className="max-w-lg text-[17px] leading-[1.75] text-[var(--ink-2)]">
                Every line is priced from your own product list and your margin rules, and shown on
                the quote so you can check it in seconds. You approve it before it sends as a normal
                email.
              </p>
              <ul className="mt-7 space-y-3.5">
                <Bullet>Priced from your product list and margin rules</Bullet>
                <Bullet>Lines that cannot be matched confidently are flagged, not guessed</Bullet>
                <Bullet>One click to send from your own mailbox</Bullet>
              </ul>
            </div>
            <div className="min-w-0">
              <QuoteMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── WhatsApp ── */}
      <section className="border-t border-[var(--hairline)] bg-[var(--paper-2)] px-6 py-24 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <WhatsAppMock />
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">Alerts</p>
            <h2 className="display mt-4 text-[clamp(1.9rem,3.6vw,2.7rem)]">
              Know the moment
              <br />
              something needs you.
            </h2>
            <p className="mt-6 max-w-lg text-[16px] leading-[1.75] text-[var(--ink-2)]">
              When a thread needs a decision, Sailwise sends a WhatsApp alert with the sender, the
              product and the quantity — so a deal never goes cold while you are away from your desk.
              Replies and quotes still go out as normal email from your own address.
            </p>
            <ul className="mt-7 space-y-3.5">
              <Bullet>WhatsApp alert when a thread needs a decision</Bullet>
              <Bullet>Sender, product, quantity and status at a glance</Bullet>
              <Bullet>Replies and quotes always sent from your own mailbox</Bullet>
            </ul>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <SectionHead
            label="How it works"
            title="From inquiry to quote, end to end"
            sub="The whole pipeline, with you approving every message."
          />
          <div className="mt-12">
            {STEPS.map((s, i) => (
              <div key={s.code} className="step-row">
                <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--pine)] uppercase">
                    {s.code}
                  </p>
                  <h3 className="display mt-2 text-[1.3rem]">{s.title}</h3>
                </div>
                <p className="max-w-xl text-[15.5px] leading-[1.75] text-[var(--ink-2)]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        id="pricing"
        className="border-y border-[var(--hairline)] bg-[var(--paper-2)] px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-2xl text-center">
          <SectionHead label="Pricing" title="One plan. Everything included." align="center" />
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[var(--ink-2)]">
            14-day free trial, then HK$1,880 per month. Cancel anytime.
          </p>

          <div className="ecard mx-auto mt-12 max-w-[460px] p-8 text-left md:p-9">
            <div className="flex items-baseline justify-between">
              <span className="display text-[1.35rem]">Starter</span>
              <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--pine)] uppercase">
                everything included
              </span>
            </div>
            <PricingPrice monthly={PLANS[0].price} annual="HK$1,504" period={PLANS[0].period} />
            <div className="mt-6 mb-6 h-px bg-[var(--hairline)]" />
            <ul className="space-y-3">
              {PLANS[0].features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[14.5px] leading-snug text-[var(--ink-2)]"
                >
                  <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--pine)]" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-[var(--hairline)] pt-6">
              <Link href="/signup" className="group btn-primary w-full py-3">
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-3 text-center text-[12px] text-[var(--ink-3)]">
                14-day free trial · Card required · Cancel anytime
              </p>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-md text-[13.5px] leading-relaxed text-[var(--ink-3)]">
            Annual billing is HK$1,504/month. Need a bigger team or custom workflows?{' '}
            <a
              href="mailto:tradeflow.hk@gmail.com"
              className="text-[var(--pine)] underline underline-offset-4"
            >
              Talk to us
            </a>
            .
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl">
          <SectionHead
            label="FAQ"
            title="Questions, answered"
            sub="Everything traders ask us before starting."
          />
          <div className="mt-12">
            {FAQS.map((f) => (
              <details key={f.q} className="faq-item group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left">
                  <span className="display text-[1.15rem] md:text-[1.3rem]">{f.q}</span>
                  <svg
                    className="h-4 w-4 shrink-0 text-[var(--ink-3)] transition-transform duration-300 group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <p className="-mt-1 max-w-2xl pb-7 text-[15.5px] leading-[1.75] text-[var(--ink-2)]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="band-dark px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="display text-[clamp(2rem,4.4vw,3.25rem)]">Stop copy-pasting quotes.</h2>
          <p className="mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-[rgba(244,241,236,0.7)]">
            Let Sailwise answer first — then close the deal.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex w-full items-center justify-center gap-1.5 rounded-[9px] bg-[#faf7f2] px-6 py-3 text-[14px] font-medium text-[var(--pine-deep)] transition hover:-translate-y-px sm:w-auto"
            >
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="mailto:tradeflow.hk@gmail.com?subject=Demo%20request"
              className="inline-flex w-full items-center justify-center rounded-[9px] border border-[rgba(244,241,236,0.28)] px-6 py-3 text-[14px] font-medium text-[#f4f1ec] transition hover:border-[rgba(244,241,236,0.6)] sm:w-auto"
            >
              Book a demo
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--hairline)] px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/brand/sailwise-mark.png"
                alt=""
                aria-hidden="true"
                className="h-6 w-6 object-contain"
              />
              <span className="display text-[1.05rem]">Sailwise</span>
            </div>
            <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed text-[var(--ink-2)]">
              The AI sales assistant for HK and Shenzhen trading companies — from inquiry to sent
              quote, with you approving every message.
            </p>
            <p className="mt-8 text-[12px] text-[var(--ink-3)]">
              © 2026 Sailwise. All rights reserved.
            </p>
          </div>
          <div>
            <p className="eyebrow">Product</p>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li>
                <a href="#product" className="footer-link">
                  Product
                </a>
              </li>
              <li>
                <a href="#pricing" className="footer-link">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="footer-link">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">Company</p>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li>
                <Link href="/login" className="footer-link">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="footer-link">
                  Start free
                </Link>
              </li>
              <li>
                <a href="/privacy" className="footer-link">
                  Privacy
                </a>
              </li>
              <li>
                <a href="mailto:tradeflow.hk@gmail.com" className="footer-link">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
