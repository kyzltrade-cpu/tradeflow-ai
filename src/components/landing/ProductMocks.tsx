import type { ReactNode } from 'react';

/* ── Product mocks ────────────────────────────────────────────────────────
   Faithful, static renderings of the real Sailwise surfaces (inbox, human
   hand-off, quote) and the WhatsApp owner alert, styled from the product's own
   UI. No interactivity — these are the "screenshots" the landing shows instead
   of describing features in prose. */

const INK = '#1B1917';
const MUTED = '#5A554E';
const FAINT = '#8A8279';
const HAIR = '#E8E4DE';
const SIDEBAR = '#F7F5F0';
const TEAL = '#0A6E5C';
const TEAL_SOFT = '#E7F4F0';
const PEACH = '#EDBF86';
const PEACH_SOFT = '#FBF1E6';
const TERRA = '#C96A44';

const CARD = {
  borderColor: HAIR,
  boxShadow: '0 1px 2px rgba(27,25,23,0.04), 0 32px 64px -48px rgba(27,25,23,0.50)',
} as const;

function Logo() {
  return (
    <img
      src="/brand/sailwise-mark.png"
      alt=""
      aria-hidden="true"
      className="h-6 w-6 shrink-0 object-contain"
    />
  );
}

function Sidebar() {
  const items = ['Dashboard', 'Inbox', 'Opportunities', 'Follow-ups', 'Products', 'Settings'];
  return (
    <div
      className="hidden w-[170px] shrink-0 flex-col p-3.5 @min-[700px]:flex"
      style={{ background: SIDEBAR, borderRight: `1px solid ${HAIR}` }}
    >
      <div className="mb-5 flex items-center gap-2">
        <Logo />
        <span className="text-[13px] font-semibold" style={{ color: INK }}>
          Sailwise
        </span>
      </div>
      {items.map((item, i) => (
        <div
          key={item}
          className="mb-0.5 rounded-md px-2 py-1.5 text-[11.5px]"
          style={{
            background: i === 1 ? TEAL_SOFT : 'transparent',
            color: i === 1 ? TEAL : MUTED,
            fontWeight: i === 1 ? 600 : 500,
          }}
        >
          {item}
        </div>
      ))}
      <div className="mt-auto rounded-lg p-2.5 text-[10.5px] leading-snug" style={{ background: PEACH_SOFT, color: TERRA }}>
        <span className="font-semibold">2 need you</span> — approvals waiting
      </div>
    </div>
  );
}

function Tabs({ active = 0 }: { active?: number }) {
  const tabs = ['All', 'Needs specs', 'Owed replies', 'Needs you'];
  return (
    <div className="flex items-center gap-1 px-3 pb-2 pt-3" style={{ borderBottom: `1px solid ${HAIR}` }}>
      {tabs.map((t, i) => (
        <span
          key={t}
          className="rounded-full px-2.5 py-1 text-[10.5px] font-medium"
          style={{ background: i === active ? INK : 'transparent', color: i === active ? '#fff' : MUTED }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

const CONVOS = [
  { name: 'Sarah Chen', msg: 'Can you do FOB to Singapore?', time: '2m', tag: 'Needs you', hot: true },
  { name: 'Ah Wei', msg: 'MOQ for the 500ml bottles?', time: '5m', tag: 'Owed reply', hot: false },
  { name: 'David Tan', msg: 'Thanks for the revised quote!', time: '12m', tag: 'In progress', hot: false },
  { name: 'Li Ming', msg: 'What certifications do you hold?', time: '18m', tag: 'Needs specs', hot: false },
  { name: 'Rachel Wong', msg: 'Sample before mass production?', time: '34m', tag: 'In progress', hot: false },
];

function ConvoList({ selected = 0 }: { selected?: number }) {
  return (
    <div className="hidden w-full flex-col @min-[560px]:flex @min-[560px]:w-[244px] @min-[560px]:shrink-0" style={{ borderRight: `1px solid ${HAIR}` }}>
      <Tabs active={selected === 0 ? 3 : 0} />
      <div className="flex-1">
        {CONVOS.map((c, i) => {
          const active = i === selected;
          return (
            <div
              key={c.name}
              className="flex items-center gap-2.5 px-3 py-2.5"
              style={{ background: active ? TEAL_SOFT : 'transparent', borderBottom: `1px solid #F3F4F6` }}
            >
              <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: active ? '#BFE6DC' : '#ECEFF3' }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-semibold" style={{ color: INK }}>
                    {c.name}
                  </span>
                  <span className="shrink-0 text-[9.5px]" style={{ color: FAINT }}>
                    {c.time}
                  </span>
                </div>
                <div className="truncate text-[10.5px]" style={{ color: MUTED }}>
                  {c.msg}
                </div>
              </div>
              {c.hot && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TERRA }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bubble({
  children,
  side = 'in',
  tint,
  meta,
}: {
  children: ReactNode;
  side?: 'in' | 'out';
  tint?: string;
  meta?: string;
}) {
  const out = side === 'out';
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] rounded-xl px-3 py-2 text-[11.5px] leading-snug"
        style={{
          background: tint ?? (out ? TEAL_SOFT : '#F3F4F6'),
          color: INK,
          borderBottomRightRadius: out ? 4 : 12,
          borderBottomLeftRadius: out ? 12 : 4,
        }}
      >
        {children}
        {meta && (
          <div className="mt-1 text-[9px]" style={{ color: FAINT }}>
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Hero: the inbox at full size ──────────────────────────────────────── */

export function HeroProduct() {
  return (
    <div className="@container overflow-hidden rounded-2xl border bg-white" style={CARD}>
      <div className="flex h-[404px] sm:h-[440px] md:h-[500px]">
        <Sidebar />
        <ConvoList selected={0} />
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${HAIR}` }}>
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full" style={{ background: '#BFE6DC' }} />
              <div>
                <div className="text-[12.5px] font-semibold" style={{ color: INK }}>
                  Sarah Chen
                </div>
                <div className="text-[10px] font-medium" style={{ color: TEAL }}>
                  Receiving — AI handling
                </div>
              </div>
            </div>
            <span className="rounded-md px-2.5 py-1 text-[10.5px] font-semibold" style={{ background: TEAL_SOFT, color: TEAL }}>
              Take over
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2.5 px-4 py-3.5">
            <Bubble side="in" meta="Email · 09:12">
              Can you do FOB to Singapore?
            </Bubble>
            <Bubble side="out" meta="Draft · AI">
              FOB HK: USD 1,825. Air freight ~USD 400. Sending the quote now.
            </Bubble>
            <Bubble side="in" meta="Email · 09:41">
              What about certifications?
            </Bubble>
            <Bubble side="out" meta="Draft · AI">
              We hold ISO 9001, SGS, and FDA. I&apos;ll attach the certificates.
            </Bubble>
          </div>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: `1px solid ${HAIR}` }}>
            <span className="flex-1 rounded-lg px-3 py-2 text-[11px]" style={{ background: '#F7F6F3', color: FAINT, border: `1px solid ${HAIR}` }}>
              Your reply is a draft until you approve…
            </span>
            <span className="rounded-lg px-3.5 py-2 text-[11px] font-semibold text-white" style={{ background: TEAL }}>
              Approve
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Unified inbox ──────────────────────────────────────────────────────── */

export function InboxMock() {
  return (
    <div className="@container overflow-hidden rounded-2xl border bg-white" style={CARD}>
      <div className="flex h-[380px]">
        <Sidebar />
        <ConvoList selected={0} />
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${HAIR}` }}>
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full" style={{ background: '#BFE6DC' }} />
              <div>
                <div className="text-[12.5px] font-semibold" style={{ color: INK }}>
                  Sarah Chen
                </div>
                <div className="text-[10px]" style={{ color: FAINT }}>
                  sarah@apexretail.sg · English
                </div>
              </div>
            </div>
            <span className="rounded-md border px-2.5 py-1 text-[10.5px] font-medium" style={{ borderColor: HAIR, color: MUTED }}>
              All mail
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2.5 px-4 py-3.5">
            <Bubble side="in" meta="Email · 09:12">
              Hi, we need 10,000 pcs of 500ml stainless steel bottles. Please quote with logo printing.
            </Bubble>
            <div className="flex justify-start">
              <div className="rounded-xl px-3.5 py-2.5 text-[11px]" style={{ background: '#FAFAFA', border: `1px solid ${HAIR}`, color: MUTED }}>
                <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: FAINT }}>
                  Extracted
                </div>
                <ul className="space-y-1" style={{ color: INK }}>
                  <li>10,000 pcs · 500ml · double-wall 304</li>
                  <li>Logo printing · sample required</li>
                </ul>
              </div>
            </div>
            <Bubble side="in" meta="Email · 09:41">
              Target price and Incoterm please?
            </Bubble>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── AI hand-off ────────────────────────────────────────────────────────── */

export function HandoffMock() {
  return (
    <div className="@container overflow-hidden rounded-2xl border bg-white" style={CARD}>
      <div className="flex h-[380px]">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${HAIR}` }}>
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full" style={{ background: '#BFE6DC' }} />
              <div>
                <div className="text-[12.5px] font-semibold" style={{ color: INK }}>
                  Ah Wei
                </div>
                <div className="text-[10px]" style={{ color: FAINT }}>
                  Email · 中文
                </div>
              </div>
            </div>
            <span className="rounded-md px-2.5 py-1 text-[10.5px] font-semibold text-white" style={{ background: TERRA }}>
              Needs you
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2.5 px-4 py-3.5">
            <Bubble side="in" meta="Customer · 10:30">
              MOQ for the 500ml one?
            </Bubble>
            <Bubble side="out" tint="#DCF8C6" meta="AI · 10:30">
              MOQ is 100 units at HKD 28 each.
            </Bubble>
            <Bubble side="in" meta="Customer · 10:32">
              Can you give me a{' '}
              <span className="rounded px-1 font-semibold" style={{ background: PEACH_SOFT, color: TERRA }}>
                discount
              </span>{' '}
              if I order 500?
            </Bubble>
            <div className="flex justify-start">
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-semibold"
                style={{ background: PEACH_SOFT, color: TERRA, border: `1px solid ${PEACH}` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: TERRA }} />
                Flagged &ldquo;discount&rdquo; — a human should take this one
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: `1px solid ${HAIR}` }}>
            <span className="flex-1 rounded-lg px-3 py-2 text-[11px]" style={{ background: '#FFF8EE', color: TERRA, border: `1px solid ${PEACH}` }}>
              You: &ldquo;For 500+ I can do $25/unit — 11% off.&rdquo;
            </span>
            <span className="rounded-lg px-3.5 py-2 text-[11px] font-semibold text-white" style={{ background: INK }}>
              Send
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Quote ──────────────────────────────────────────────────────────────── */

export function QuoteMock() {
  const lines = [
    { qty: '10,000 pcs', desc: '500ml Vacuum Bottle · Double-wall 304', price: 'USD 5.00' },
    { qty: '10,000 pcs', desc: 'Logo printing · single-colour laser', price: 'USD 0.35' },
    { qty: '1 pc', desc: 'Pre-production sample · air freight', price: 'USD 25.00' },
  ];
  return (
    <div className="@container overflow-hidden rounded-2xl border bg-white" style={CARD}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${HAIR}` }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: FAINT }}>
            Quote draft · Q-2091
          </div>
          <div className="text-[14px] font-semibold" style={{ color: INK }}>
            Apex Retail · Sarah Chen
          </div>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{ background: PEACH_SOFT, color: TERRA }}>
          Awaiting approval
        </span>
      </div>
      <div className="px-5 py-4">
        {lines.map((l) => (
          <div key={l.desc} className="flex items-baseline justify-between gap-4 py-2.5" style={{ borderBottom: `1px solid #F3F4F6` }}>
            <div className="min-w-0">
              <div className="text-[9.5px] font-medium uppercase tracking-wider" style={{ color: FAINT }}>
                {l.qty}
              </div>
              <div className="truncate text-[12px] font-medium" style={{ color: INK }}>
                {l.desc}
              </div>
            </div>
            <div className="shrink-0 text-[12.5px] font-semibold" style={{ color: INK }}>
              {l.price}
            </div>
          </div>
        ))}
        <div className="flex items-baseline justify-between py-3.5">
          <span className="text-[13px] font-semibold" style={{ color: INK }}>
            Subtotal
          </span>
          <span className="text-[16px] font-bold" style={{ color: TEAL }}>
            USD 53,525
          </span>
        </div>
        <div className="rounded-lg px-3.5 py-2.5 text-[10.5px] leading-relaxed" style={{ background: '#FAFAFA', border: `1px solid ${HAIR}`, color: MUTED }}>
          <span className="font-semibold" style={{ color: INK }}>
            Every number is sourced:{' '}
          </span>
          price list · 20% margin rule (4.00 → 5.00) · FX 7.82 · holds 15 days
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-lg px-4 py-2.5 text-[11.5px] font-semibold text-white" style={{ background: TEAL }}>
            Approve &amp; send
          </span>
          <span className="rounded-lg px-4 py-2.5 text-[11.5px] font-medium" style={{ background: '#fff', color: MUTED, border: `1px solid ${HAIR}` }}>
            Edit lines
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── WhatsApp owner alert ──────────────────────────────────────────────────
   WhatsApp is an *outbound alert channel for the owner*, not a customer
   channel: the product sends a Twilio notification when a thread needs a
   human. Replies and quotes always go out as email from the trader's own
   mailbox, so this mock shows alerts landing — not an AI chatting with a
   buyer, which the product does not do. */

function PhoneStatusBar() {
  return (
    <div
      className="flex shrink-0 items-center justify-between px-5 pt-3 pb-1.5"
      style={{ background: '#075E54' }}
    >
      <span className="text-[11px] font-semibold text-white">9:32</span>
      <div className="flex items-center gap-[6px]">
        <span className="flex items-end gap-[2px]">
          {[4, 6, 8, 10].map((h) => (
            <span
              key={h}
              className="w-[2.5px] rounded-[1px]"
              style={{ height: h, background: 'rgba(255,255,255,0.9)' }}
            />
          ))}
        </span>
        <span className="text-[10px] font-semibold text-white/90">5G</span>
        <span
          className="flex h-[11px] w-[22px] items-center rounded-[3px] p-[1.5px]"
          style={{ border: '1px solid rgba(255,255,255,0.6)' }}
        >
          <span className="h-full w-[72%] rounded-[2px]" style={{ background: 'rgba(255,255,255,0.9)' }} />
        </span>
      </div>
    </div>
  );
}

function AlertRow({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex gap-2 text-[12px] leading-snug">
      <span className="w-[58px] shrink-0" style={{ color: muted ? '#9AA1AC' : '#8A8279' }}>
        {k}
      </span>
      <span style={{ color: muted ? '#6B7280' : '#1B1917' }}>{v}</span>
    </div>
  );
}

function DayChip({ children }: { children: string }) {
  return (
    <div
      className="mx-auto rounded-full px-2.5 py-1 text-[9.5px] font-semibold tracking-[0.08em]"
      style={{ background: 'rgba(0,0,0,0.07)', color: '#5B6B66' }}
    >
      {children}
    </div>
  );
}

export function WhatsAppMock() {
  return (
    <div className="mx-auto w-full max-w-[330px]">
      {/* Device */}
      <div
        className="rounded-[46px] p-[10px]"
        style={{
          background: 'linear-gradient(155deg,#33383E 0%,#15181B 45%,#0B0D0F 100%)',
          boxShadow:
            'inset 0 2px 0 rgba(255,255,255,0.07), 0 44px 80px -44px rgba(27,25,23,0.6)',
        }}
      >
        <div
          className="flex h-[556px] flex-col overflow-hidden rounded-[37px]"
          style={{ background: '#ECE5DD' }}
        >
          <PhoneStatusBar />

          {/* Chat header */}
          <div
            className="flex shrink-0 items-center gap-3 px-4 pb-3"
            style={{ background: '#075E54' }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.22)' }}
            >
              <img
                src="/brand/sailwise-mark-dashboard.png"
                alt=""
                aria-hidden="true"
                className="h-5 w-5 object-contain"
              />
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-[13.5px] font-semibold text-white">Sailwise alerts</div>
              <div className="text-[10.5px]" style={{ color: '#B7E4D8' }}>
                notifications to you
              </div>
            </div>
          </div>

          {/* Alert feed */}
          <div className="flex flex-1 flex-col gap-3.5 px-3.5 py-4">
            <DayChip>TODAY</DayChip>

            <div
              className="rounded-xl rounded-tl-[3px] bg-white p-3.5"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.10)' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#C96A44' }} />
                <span
                  className="text-[10px] font-bold tracking-[0.12em] uppercase"
                  style={{ color: '#C96A44' }}
                >
                  Needs you
                </span>
              </div>
              <div className="mt-2.5 space-y-1.5">
                <AlertRow k="From" v="Sarah Chen · Pacific Trading" />
                <AlertRow k="Product" v="500ml vacuum bottle · 304" />
                <AlertRow k="Quantity" v="10,000 pcs" />
                <AlertRow k="Status" v="Specs ready — awaiting review" />
              </div>
              <div
                className="mt-3 rounded-lg py-2 text-center text-[11.5px] font-semibold text-white"
                style={{ background: '#075E54' }}
              >
                Review the draft
              </div>
              <div className="mt-1.5 text-right text-[9px]" style={{ color: '#9AA1AC' }}>
                9:32 AM
              </div>
            </div>

            <DayChip>YESTERDAY</DayChip>

            <div
              className="rounded-xl rounded-tl-[3px] p-3"
              style={{ background: 'rgba(255,255,255,0.68)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#8A8279' }} />
                <span
                  className="text-[10px] font-bold tracking-[0.12em] uppercase"
                  style={{ color: '#8A8279' }}
                >
                  Sent
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                <AlertRow k="From" v="Ah Wei · Kowloon Trading" muted />
                <AlertRow k="Quote" v="USD 53,525 · approved" muted />
              </div>
            </div>

            <p
              className="mt-auto pt-2 text-center text-[9.5px] leading-snug"
              style={{ color: '#6B7A75' }}
            >
              Alerts only — replies send from your mailbox
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
