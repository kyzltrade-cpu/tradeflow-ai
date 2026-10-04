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
      src="/brand/sailwise-logo.png"
      alt=""
      aria-hidden="true"
      className="h-5 w-auto shrink-0 object-contain"
    />
  );
}

function Sidebar() {
  const items = ['Inbox', 'Opportunities', 'Follow-ups', 'Products', 'Knowledge', 'Settings'];
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
            background: i === 0 ? TEAL_SOFT : 'transparent',
            color: i === 0 ? TEAL : MUTED,
            fontWeight: i === 0 ? 600 : 500,
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

/* Mock profile pictures — monogram avatars tinted per contact, so the thread
   list reads like a real inbox instead of a row of grey placeholders. */
const AVATAR_TONES: Record<string, { bg: string; fg: string }> = {
  'Sarah Chen': { bg: '#D8ECE5', fg: '#0A6E5C' },
  'Ah Wei': { bg: '#F5E2D6', fg: '#B4552D' },
  'David Tan': { bg: '#ECE9DC', fg: '#7A6A46' },
  'Li Ming': { bg: '#DFE7EF', fg: '#46586B' },
  'Rachel Wong': { bg: '#E3EDDB', fg: '#4F6B45' },
};
const AVATAR_FALLBACK = { bg: '#ECEFF3', fg: '#6B7280' };

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function Avatar({
  name,
  size = 32,
  dot = false,
}: {
  name: string;
  size?: number;
  dot?: boolean;
}) {
  const tone = AVATAR_TONES[name] ?? AVATAR_FALLBACK;
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full font-semibold"
        style={{
          background: tone.bg,
          color: tone.fg,
          fontSize: Math.round(size * 0.36),
          letterSpacing: '0.01em',
          // A hairline ring keeps the avatar legible on both white rows and the
          // tinted active row.
          boxShadow: 'inset 0 0 0 1px rgba(15,17,21,0.06), 0 0 0 2px #FFFFFF',
        }}
      >
        {initialsOf(name)}
      </span>
      {dot && (
        <span
          className="sail-pulse absolute rounded-full"
          style={{
            right: -1,
            bottom: -1,
            width: Math.round(size * 0.3),
            height: Math.round(size * 0.3),
            background: '#1FA97F',
            boxShadow: '0 0 0 2px #FFFFFF',
          }}
        />
      )}
    </span>
  );
}

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
              <Avatar name={c.name} size={32} />
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
              {c.hot && (
                <span className="sail-pulse h-2 w-2 shrink-0 rounded-full" style={{ background: TERRA }} />
              )}
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
              <Avatar name="Sarah Chen" size={28} dot />
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
              <Avatar name="Sarah Chen" size={28} dot />
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

            {/* Live: the AI is drafting the next reply, right now */}
            <div className="flex justify-end">
              <div
                className="flex items-center gap-1.5 rounded-xl rounded-br-[4px] px-3.5 py-2.5"
                style={{ background: TEAL_SOFT }}
              >
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="sail-typing h-1.5 w-1.5 rounded-full"
                    style={{ background: TEAL, animationDelay: `${d * 0.16}s` }}
                  />
                ))}
                <span className="ml-1 text-[10px] font-medium" style={{ color: TEAL }}>
                  drafting a reply…
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Extraction ────────────────────────────────────────────────────────────
   The differentiating surface: the buyer line a spec came from, each field
   pulled out of it with the confidence and status behind it, and the gap that
   turns into a drafted question in the buyer's own language. */

const EXTRACT_FIELDS = [
  { label: 'Quantity', value: '10,000 pcs', conf: 0.98, status: 'Confirmed', cite: 'line 12' },
  { label: 'Specification', value: '500ml · double-wall 304', conf: 0.94, status: 'Confirmed', cite: 'line 12' },
  { label: 'Branding', value: 'Logo printing · sample required', conf: 0.81, status: 'Needs check', cite: 'line 12' },
] as const;

const GAP_LANGS = ['English', '简体中文', 'Español'];
const FLAGGED = ['Target price', 'Incoterm', 'Destination & date'];

function ConfBar({ value, delay }: { value: number; delay: number }) {
  return (
    <span className="relative block h-[3px] w-full overflow-hidden rounded-full" style={{ background: '#EFECE6' }}>
      <span
        className="sail-bar-fill absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${Math.round(value * 100)}%`, background: TEAL, animationDelay: `${delay}ms` }}
      />
    </span>
  );
}

export function ExtractionMock() {
  return (
    <div className="@container overflow-hidden rounded-2xl border bg-white" style={CARD}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${HAIR}` }}
      >
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
            Extraction
          </span>
        </div>
        <span
          className="rounded-md border px-2.5 py-1 text-[10.5px] font-medium"
          style={{ borderColor: HAIR, color: MUTED }}
        >
          Thread · line 12
        </span>
      </div>

      <div className="px-4 pt-3.5 pb-3">
        <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: FAINT }}>
          Source
        </p>
        <blockquote
          className="mt-2 border-l-2 pl-3 text-[11.5px] leading-relaxed"
          style={{ borderColor: PEACH, color: INK }}
        >
          &ldquo;Hi, we need 10,000 pcs of 500ml stainless steel bottles. Please quote with logo
          printing.&rdquo;
        </blockquote>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: FAINT }}>
            Extracted
          </p>
          <span className="text-[9.5px]" style={{ color: FAINT }}>
            confidence · status
          </span>
        </div>
        <ul className="mt-2.5 space-y-3">
          {EXTRACT_FIELDS.map((f, i) => (
            <li key={f.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px]" style={{ color: MUTED }}>
                  {f.label}
                </span>
                <span className="text-[9.5px]" style={{ color: FAINT }}>
                  {f.cite}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2.5">
                <span className="flex-1 text-[11.5px] font-medium" style={{ color: INK }}>
                  {f.value}
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-[2px] text-[9px] font-semibold"
                  style={
                    f.status === 'Confirmed'
                      ? { background: TEAL_SOFT, color: TEAL }
                      : { background: PEACH_SOFT, color: TERRA }
                  }
                >
                  {f.status}
                </span>
              </div>
              <div className="mt-1.5">
                <ConfBar value={f.conf} delay={140 + i * 130} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="mx-4 mb-4 rounded-xl px-3.5 py-3"
        style={{ background: '#FAFAFA', border: `1px solid ${HAIR}` }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: FAINT }}>
            Clarification
          </p>
          <span
            className="rounded-full px-2 py-[2px] text-[9px] font-semibold"
            style={{ background: PEACH_SOFT, color: TERRA }}
          >
            Draft
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: INK }}>
          Target price and Incoterm please?
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {GAP_LANGS.map((l) => (
            <span
              key={l}
              className="rounded-full border px-2 py-[2px] text-[9px]"
              style={{ borderColor: HAIR, color: MUTED }}
            >
              {l}
            </span>
          ))}
        </div>
        <div className="mt-3 border-t pt-2.5" style={{ borderColor: HAIR }}>
          <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: FAINT }}>
            Flagged before quoting
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FLAGGED.map((g) => (
              <span
                key={g}
                className="rounded-full px-2 py-[2px] text-[9px]"
                style={{ background: '#F4F1EC', color: MUTED }}
              >
                {g}
              </span>
            ))}
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
              <Avatar name="Ah Wei" size={28} dot />
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
            Pacific Trading · Sarah Chen
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
          price list · 20% margin rule (4.00 → 5.00) · holds 15 days
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
    <div className="relative z-20 flex shrink-0 items-center justify-between px-7 pt-[15px] pb-1">
      <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-white">9:41</span>
      <div className="flex items-center gap-[5px]">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" aria-hidden="true">
          <rect x="0.5" y="7.4" width="2.8" height="3.2" rx="0.6" fill="#fff" />
          <rect x="4.6" y="5.4" width="2.8" height="5.2" rx="0.6" fill="#fff" />
          <rect x="8.7" y="3" width="2.8" height="7.6" rx="0.6" fill="#fff" />
          <rect x="12.8" y="0.6" width="2.8" height="10" rx="0.6" fill="#fff" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true">
          <path d="M8 2.3c1.85 0 3.6.68 4.9 1.93l1.25-1.36A9.36 9.36 0 0 0 8 .1 9.36 9.36 0 0 0 1.85 2.87L3.1 4.23A6.98 6.98 0 0 1 8 2.3Z" fill="#fff" />
          <path d="M8 5.3c.98 0 1.9.37 2.78 1.02l1.24-1.36A6.05 6.05 0 0 0 8 3.35 6.05 6.05 0 0 0 3.98 4.96l1.24 1.36A4.7 4.7 0 0 1 8 5.3Z" fill="#fff" />
          <circle cx="8" cy="9.2" r="1.5" fill="#fff" />
        </svg>
        <span className="flex h-[12px] w-[25px] items-center rounded-[4px] p-[1.5px]" style={{ border: '1px solid rgba(255,255,255,0.55)' }}>
          <span className="h-full w-[76%] rounded-[2px] bg-white" />
        </span>
      </div>
    </div>
  );
}

function DayChip({ children }: { children: string }) {
  return (
    <div
      className="mx-auto rounded-[7px] px-2.5 py-1 text-[10.5px] font-medium tracking-[0.04em]"
      style={{ background: '#FFFFFF', color: '#54656F', boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)' }}
    >
      {children}
    </div>
  );
}

function Ticks({ read }: { read?: boolean }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true" className="inline-block">
      <path d="M1 5.6 3.4 8 8 2.2" stroke={read ? '#53BDEB' : '#8696A0'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.4 5.6 8.8 8 15 1" stroke={read ? '#53BDEB' : '#8696A0'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WhatsAppMock() {
  return (
    <div className="mx-auto w-full max-w-[302px]">
      {/* Titanium frame */}
      <div
        className="relative rounded-[3.1rem] p-[11px]"
        style={{
          background:
            'linear-gradient(150deg,#60666d 0%,#2c3035 26%,#14171a 60%,#3c4147 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.5), 0 60px 100px -55px rgba(20,25,23,0.85)',
        }}
      >
        {/* Side buttons */}
        <span className="absolute -left-[3px] top-[112px] h-7 w-[3px] rounded-l-[2px]" style={{ background: '#3a3f45' }} />
        <span className="absolute -left-[3px] top-[164px] h-12 w-[3px] rounded-l-[2px]" style={{ background: '#3a3f45' }} />
        <span className="absolute -right-[3px] top-[150px] h-16 w-[3px] rounded-r-[2px]" style={{ background: '#3a3f45' }} />

        {/* Screen */}
        <div
          className="relative flex flex-col overflow-hidden rounded-[2.55rem]"
          style={{ aspectRatio: '9 / 19.5', background: '#0B141A' }}
        >
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-[9px] z-30 h-[27px] w-[94px] -translate-x-1/2 rounded-full bg-black" />

          {/* WhatsApp chrome: status bar + chat header */}
          <div className="relative shrink-0" style={{ background: '#008069' }}>
            <PhoneStatusBar />
            <div className="flex items-center gap-3 px-3.5 pb-2.5 pt-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path d="M15 5l-7 7 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                <img src="/brand/sailwise-logo.png" alt="" aria-hidden="true" className="h-5 w-auto object-contain" />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[14px] font-medium text-white">Sailwise alerts</div>
                <div className="flex items-center gap-1 text-[11px]" style={{ color: '#B7E4D8' }}>
                  <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: '#7AE2C4' }} />
                  online
                </div>
              </div>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path d="M15 10l5-3v10l-5-3" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" />
                <rect x="3" y="6" width="12" height="12" rx="2.5" stroke="#fff" strokeWidth="1.7" />
              </svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z" fill="#fff" />
              </svg>
            </div>
          </div>

          {/* Chat body */}
          <div className="relative flex flex-1 flex-col gap-2 overflow-hidden px-3 py-3" style={{ background: '#EFEAE2' }}>
            <DayChip>TODAY</DayChip>

            {/* Incoming alert bubble */}
            <div className="flex justify-start">
              <div
                className="relative max-w-[83%] rounded-[8px] rounded-tl-[2px] bg-white px-2.5 py-2 text-[12.5px] leading-snug"
                style={{ color: '#111B21', boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)' }}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: '#C96A44' }} />
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: '#C96A44' }}>
                    Needs you
                  </span>
                </div>
                <div className="font-semibold">Sarah Chen · Pacific Trading</div>
                <div>500ml vacuum bottle · 304</div>
                <div>10,000 pcs · specs ready to price</div>
                <div className="mt-1.5 border-t pt-1.5 text-[12px] font-medium" style={{ borderColor: '#E9EDEF', color: '#008069' }}>
                  Review the draft ›
                </div>
                <div className="mt-1 text-right text-[10.5px]" style={{ color: '#667781' }}>
                  9:41 AM
                </div>
              </div>
            </div>

            {/* Outgoing reply bubble (owner) */}
            <div className="flex justify-end">
              <div
                className="relative max-w-[80%] rounded-[8px] rounded-tr-[2px] px-2.5 py-2 text-[12.5px] leading-snug"
                style={{ background: '#D9FDD3', color: '#111B21', boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)' }}
              >
                <div>Approved — sending the quote from my mailbox.</div>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10.5px]" style={{ color: '#667781' }}>
                  9:42 AM
                  <Ticks read />
                </div>
              </div>
            </div>

            {/* Chinese-language alert */}
            <div className="flex justify-start">
              <div
                className="relative max-w-[83%] rounded-[8px] rounded-tl-[2px] bg-white px-2.5 py-2 text-[12.5px] leading-snug"
                style={{ color: '#111B21', boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)' }}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: '#14342B' }} />
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: '#14342B' }}>
                    已寄出
                  </span>
                </div>
                <div className="font-semibold">Ah Wei · 九龍貿易</div>
                <div>報價單 Q-2091 · USD 53,525</div>
                <div className="mt-1 text-right text-[10.5px]" style={{ color: '#667781' }}>
                  9:41 AM
                </div>
              </div>
            </div>

            {/* Encryption note */}
            <div className="mt-auto">
              <div
                className="mx-auto max-w-[85%] rounded-[7px] px-2.5 py-1.5 text-center text-[10.5px] leading-snug"
                style={{ background: '#FFE8A3', color: '#54656F' }}
              >
                Messages and calls are end-to-end encrypted.
              </div>
              <p className="mt-3 text-center text-[10px] leading-snug" style={{ color: '#667781' }}>
                Alerts only — replies send from your own mailbox
              </p>
            </div>
          </div>

          {/* Input bar */}
          <div className="flex shrink-0 items-center gap-2 px-2.5 py-2" style={{ background: '#F0F2F5' }}>
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-1.5" style={{ border: '1px solid #E9EDEF' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: '#8696A0' }}>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="9" cy="10" r="1.1" fill="currentColor" />
                <circle cx="15" cy="10" r="1.1" fill="currentColor" />
                <path d="M8.4 14.2c.9 1.1 2.2 1.7 3.6 1.7s2.7-.6 3.6-1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span className="flex-1 text-[12.5px]" style={{ color: '#8696A0' }}>
                Message
              </span>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: '#8696A0' }}>
                <path d="M8 12.5 15.5 5a3 3 0 0 1 4.2 4.2l-9.9 9.9a5 5 0 0 1-7-7l9.4-9.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: '#8696A0' }}>
                <rect x="3" y="6.5" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8.5 6.5 10 4h4l1.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: '#00A884' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </div>

          {/* Home indicator */}
          <div className="pointer-events-none absolute bottom-[7px] left-1/2 z-30 h-[5px] w-[116px] -translate-x-1/2 rounded-full bg-black/30" />
        </div>
      </div>
    </div>
  );
}
