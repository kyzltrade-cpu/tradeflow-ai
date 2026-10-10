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
// Recessed inner surfaces. Must be clearly darker than white or the panels
// read as translucent film on the card rather than as solid objects.
const PANEL = '#F2EEE7';
/* The dashboard sidebar is dark in the product (.sidebar-dark). Sampled from
   globals.css so the mock is the same object, not a light reinterpretation. */
const SB_BG = '#101216';
const SB_BORDER = '#1E2026';
const SB_TEXT = '#F4F4F5';
const SB_MUTED = '#A1A1AA';
const SB_IDLE = '#C9C9CE';
const SB_FAINT = '#9CA0A8';
const SB_ACTIVE_BG = '#FFFFFF';
const SB_ACTIVE_TEXT = '#0A0A0A';
const SB_BADGE = 'rgba(255,255,255,0.16)';
const TEAL = '#0A6E5C';
const TEAL_SOFT = '#E7F4F0';
const PEACH = '#EDBF86';
const PEACH_SOFT = '#FBF1E6';
const TERRA = '#C96A44';

/* Pane dividers. Inside a pane, HAIR is enough; between panes it
   disappears and the columns read as one block of text. */
const EDGE = '#D5CFC4';
const LIST_SURFACE = '#F6F3EC';
const RAIL_SURFACE = '#FCFBF9';

const CARD = {
  borderColor: HAIR,
  boxShadow: '0 1px 2px rgba(27,25,23,0.04), 0 32px 64px -48px rgba(27,25,23,0.50)',
} as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

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

/* The sidebar as it actually reads: grouped nav, 17px icons, count badges, and
   the account footer. A flat list of six words looks like a nav bar; this looks
   like the tool someone keeps open all day. */
const NAV_ICONS = {
  inbox: 'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.929 8.298a2.25 2.25 0 00-2.156-1.548h-2.986a2.25 2.25 0 01-2.157 1.54H11.37a2.25 2.25 0 01-2.157-1.54H6.227a2.25 2.25 0 00-2.156 1.548L1.6 13.177a5.25 5.25 0 00-.1.661z',
  mail: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m17.25 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  sparkles: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L22.5 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  box: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
  book: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  cog: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.99a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z',
  dashboard: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
};

interface NavEntry {
  en: string;
  icon: keyof typeof NAV_ICONS;
  count?: number;
}

const NAV: { label: string; items: NavEntry[] }[] = [
  {
    label: 'Overview',
    items: [
      { en: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    label: 'Inbox',
    items: [
      { en: 'Inbox', icon: 'inbox' },
      { en: 'Needs specs', icon: 'mail', count: 4 },
      { en: 'Owed replies', icon: 'mail', count: 7 },
      { en: 'Needs you', icon: 'sparkles', count: 2 },
    ],
  },
  {
    label: 'Pipeline',
    items: [
      { en: 'Opportunities', icon: 'sparkles' },
      { en: 'Follow-ups', icon: 'clock', count: 3 },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { en: 'Products', icon: 'box' },
      { en: 'Suppliers', icon: 'users' },
      { en: 'Knowledge Base', icon: 'book' },
      { en: 'Settings', icon: 'cog' },
    ],
  },
];

function NavIcon({ d, active }: { d: string; active?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={active ? 2 : 1.75}
      stroke="currentColor"
      className="h-[15px] w-[15px] shrink-0"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Sidebar({ active = 'Inbox' }: { active?: string } = {}) {
  return (
    <div
      className="hidden w-[186px] shrink-0 flex-col @min-[820px]:flex"
      style={{ background: SB_BG, borderRight: `1px solid ${SB_BORDER}` }}
    >
      <div
        className="flex h-11 shrink-0 items-center gap-2 border-b px-3.5"
        style={{ borderColor: SB_BORDER }}
      >
        <img
          src="/brand/sailwise-mark-dashboard.png"
          alt="Sailwise"
          className="h-6 w-6 shrink-0 rounded-[5px] object-contain"
        />
        <span className="text-[13px] font-semibold" style={{ color: SB_TEXT }}>
          Sailwise
        </span>
      </div>

      <nav className="min-h-0 flex-1 overflow-hidden px-2.5 py-3">
        {NAV.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
            <div
              className="mb-1.5 px-2 text-[9.5px] font-semibold uppercase tracking-[0.09em]"
              style={{ color: SB_FAINT }}
            >
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const count = item.count;
                const isActive = item.en === active;
                return (
                  <div
                    key={item.en}
                    className="flex h-[30px] items-center gap-2 rounded-[7px] px-2.5"
                    style={{
                      background: isActive ? SB_ACTIVE_BG : 'transparent',
                      color: isActive ? SB_ACTIVE_TEXT : SB_IDLE,
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    <NavIcon d={NAV_ICONS[item.icon]} active={isActive} />
                    <span className="min-w-0 flex-1 truncate text-[12px]">{item.en}</span>
                    {count !== undefined && (
                      <span
                        className="flex h-[17px] min-w-[19px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums leading-none"
                        style={{
                          background: isActive ? SB_ACTIVE_TEXT : SB_BADGE,
                          color: '#FFFFFF',
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Account footer, as in the product: who you are, and the language toggle. */}
      <div className="shrink-0 border-t px-3.5 py-2.5" style={{ borderColor: SB_BORDER }}>
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-white"
            style={{ background: SB_ACTIVE_BG, color: SB_ACTIVE_TEXT }}
          >
            ST
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: SB_MUTED }}>
            sales@apextextiles.co
          </span>
        </div>
        <div
          className="mt-2 flex items-center justify-between border-t pt-2"
          style={{ borderColor: SB_BORDER }}
        >
          <span className="text-[10.5px]" style={{ color: SB_FAINT }}>
            Language
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: SB_BADGE, color: '#FFFFFF' }}
          >
            EN · 中文
          </span>
        </div>
      </div>
    </div>
  );
}

const CONVOS = [
  {
    name: 'Sarah Chen',
    email: 'sarah@apexretail.sg',
    subject: 'FOB Rotterdam to Singapore',
    msg: 'Can you do FOB to Singapore? We need 5,000 units.',
    date: '09:41',
    filter: 'Needs you',
    count: 2,
    hot: true,
  },
  {
    name: 'Ah Wei',
    email: 'ah.wei@kelvin.sg',
    subject: '500ml bottles',
    msg: 'MOQ for the 500ml double-wall bottles?',
    date: '09:38',
    filter: 'Needs specs',
    count: 4,
    hot: false,
  },
  {
    name: 'David Tan',
    email: 'david@northbay.com.sg',
    subject: 'Revised quote',
    msg: 'Thanks for the revised quote — one question on the tooling.',
    date: '09:12',
    filter: 'Owed replies',
    count: 7,
    hot: false,
  },
  {
    name: 'Li Ming',
    email: 'liming@jiangsu-textiles.cn',
    subject: 'Certifications',
    msg: 'What certifications do you hold for the 40D canvas?',
    date: '08:54',
    filter: 'Needs specs',
    count: 0,
    hot: false,
  },
  {
    name: 'Rachel Wong',
    email: 'rachel@harbourpoint.hk',
    subject: 'Sample before production',
    msg: 'Can we see a sample before mass production?',
    date: '08:20',
    filter: 'In progress',
    count: 0,
    hot: false,
  },
] as const;

/* The inbox as it actually reads: filter lenses with counts and an underline
   on the active one, then a sender/thread/date grid. */
const FILTERS = ['All', 'Needs specs', 'Owed replies', 'Needs you'] as const;

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
    <div
      className="hidden w-full shrink-0 flex-col @min-[620px]:flex @min-[620px]:w-[238px]"
      style={{ background: LIST_SURFACE, borderRight: `1px solid ${EDGE}` }}
    >
      <div
        className="flex items-center gap-1 px-3"
        style={{ borderBottom: `1px solid ${HAIR}` }}
      >
        {FILTERS.map((f, i) => (
          <span
            key={f}
            className="relative flex items-center gap-1.5 px-2 py-2.5 text-[11.5px]"
            style={{ color: i === 3 ? INK : MUTED, fontWeight: i === 3 ? 600 : 500 }}
          >
            {f}
            {i === 1 && <span className="tabular-nums text-[10.5px]">4</span>}
            {i === 2 && <span className="tabular-nums text-[10.5px]">7</span>}
            {i === 3 && (
              <span
                className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9.5px] font-semibold text-white"
                style={{ background: TEAL }}
              >
                2
              </span>
            )}
            {i === 3 && (
              <span
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                style={{ background: TEAL }}
              />
            )}
          </span>
        ))}
      </div>

      <div
        className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-1.5"
        style={{ background: '#FBFBFB', borderBottom: `1px solid ${HAIR}` }}
      >
        <span
          className="text-[9.5px] font-semibold uppercase tracking-[0.05em]"
          style={{ color: FAINT }}
        >
          Sender
        </span>
        <span
          className="text-[9.5px] font-semibold uppercase tracking-[0.05em]"
          style={{ color: FAINT }}
        >
          Date
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        {CONVOS.map((c, i) => {
          const active = i === selected;
          return (
            <div
              key={c.email}
              className="flex items-start gap-2 px-3 py-2.5"
              style={{
                background: active ? TEAL_SOFT : 'transparent',
                borderBottom: `1px solid ${HAIR}`,
              }}
            >
              <Avatar name={c.name} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[11.5px] font-semibold" style={{ color: INK }}>
                    {c.name}
                  </span>
                  {c.hot && (
                    <span className="sail-pulse h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TERRA }} />
                  )}
                </div>
                <div className="truncate text-[10.5px]" style={{ color: MUTED }}>
                  {c.subject}
                </div>
                <div className="truncate text-[10px]" style={{ color: FAINT }}>
                  {c.msg}
                </div>
              </div>
              <span className="shrink-0 text-[9.5px] tabular-nums" style={{ color: FAINT }}>
                {c.date}
              </span>
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
  scale = 'sm',
}: {
  children: ReactNode;
  side?: 'in' | 'out';
  tint?: string;
  meta?: string;
  scale?: 'sm' | 'lg';
}) {
  const out = side === 'out';
  const lg = scale === 'lg';
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-xl leading-snug ${lg ? 'px-4 py-3 text-[14.5px]' : 'px-3 py-2 text-[11.5px]'}`}
        style={{
          background: tint ?? (out ? TEAL_SOFT : '#F3F4F6'),
          color: INK,
          borderBottomRightRadius: out ? 4 : 12,
          borderBottomLeftRadius: out ? 12 : 4,
        }}
      >
        {children}
        {meta && (
          <div className={lg ? 'mt-2 text-[11.5px]' : 'mt-1 text-[9px]'} style={{ color: FAINT }}>
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Hero: the dashboard, running ───────────────────────────────────────────
   Sidebar, inbox and the open thread in one frame. Every pane copies the real
   surface: the grouped nav, the sender/thread/date grid, the mail header with
   its back link and subject line, the roles the product actually stores (buyer
   right, AI left, labelled), and the composer that opens the reply. */

type MailRole = 'buyer' | 'ai';

function MailBubble({
  role,
  time,
  reveal = 1,
  children,
}: {
  role: MailRole;
  time: string;
  reveal?: number;
  children: ReactNode;
}) {
  const buyer = role === 'buyer';
  return (
    <div
      className={`flex ${buyer ? 'justify-start' : 'justify-end'}`}
      style={{ opacity: reveal, transform: `translateY(${(1 - reveal) * 14}px)` }}
    >
<div
        className="max-w-[86%] rounded-[4px] px-3.5 py-2 text-[12.5px] leading-[1.45]"
        style={{
          background: buyer ? '#FFFFFF' : '#DCF1E6',
          border: `1px solid ${buyer ? HAIR : '#BFE6D2'}`,
        }}
      >
        <p className="whitespace-pre-wrap" style={{ color: INK }}>
          {children}
        </p>
        <p className="mt-1 flex items-center gap-2 text-[10.5px]" style={{ color: FAINT }}>
          {time}
        </p>
      </div>
    </div>
  );
}

export function HeroProduct({ p }: { p?: number } = {}) {
  /* The real thread screen is nav | thread | buyer rail. There is no email
     list on this screen — the list is its own page — so the rail carries the
     buyer, and the thread carries the conversation. Provenance is the point:
     a tick means Sailwise read it out of the email or its attachment, and an
     amber dot marks a field that was missing from the email and is still
     waiting on the buyer. */
  const SPECS: {
    label: string;
    value: string | null;
    fetched?: boolean;
    /* Where the value comes from — drives what animates in during extraction. */
    origin: 'email' | 'fetched' | 'reply' | 'open';
  }[] = [
    { label: 'Quantity', value: '5,000 pcs', origin: 'email' },
    { label: 'Product', value: '500 ml double-wall flask', origin: 'email' },
    { label: 'Material / size', value: '304 steel, double-wall', origin: 'email' },
    { label: 'Logo / printing', value: 'Laser, 1 colour', origin: 'reply' },
    { label: 'Incoterm', value: 'FOB Rotterdam', origin: 'email' },
    { label: 'Target price', value: 'USD 4.60–4.90', fetched: true, origin: 'fetched' },
    { label: 'Destination port', value: 'Singapore', origin: 'reply' },
    { label: 'Timeline', value: '30 days post-sample', fetched: true, origin: 'fetched' },
    { label: 'Certification', value: 'EN 4210, LFGB', fetched: true, origin: 'fetched' },
  ];
  const emailCount = SPECS.filter((r) => r.origin === 'email').length;
  const fetchedCount = SPECS.filter((r) => r.origin === 'fetched').length;
  const replyCount = SPECS.filter((r) => r.origin === 'reply').length;
  const openCount = SPECS.filter((r) => !r.value).length;

  /* Scroll progress (0→1) when this is the animated first-scroll demo. When
     undefined everything renders in its finished state — the hero uses that,
     so the two copies can never drift. */
  const R = (a: number, b: number) => (p === undefined ? 1 : clamp01((p - a) / (b - a)));

  // All specs are in once the last reply-sourced row finishes filling
  // (reply fills start at 0.84–0.89 and take 0.07 to complete).
  const specsDone = R(0.9, 1);

  // The buyer panel's frame (labels, rows, grid, tag slots) is on screen from
  // the first scroll so the layout never pops in. Only the *values* — who the
  // buyer is and what they've done before — fade in once the email lands.
  const buyerValues = R(0.14, 0.26);

  return (
    <div className="@container overflow-hidden rounded-2xl border bg-white" style={CARD}>
      <div className="flex flex-col @min-[620px]:h-[620px] @min-[620px]:flex-row">
        <Sidebar />

        {/* Thread */}
        <div className="flex min-w-0 flex-1 flex-col bg-white">
          {/* Mail header — back link, contact, subject, thread controls. */}
          <div
            className="flex flex-nowrap items-center justify-between gap-3 border-b px-4 py-2.5"
            style={{ borderColor: EDGE, background: '#FFFFFF' }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex items-center gap-1 text-[11.5px] font-medium" style={{ color: MUTED }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Inbox
              </span>
              <span className="h-5 w-px shrink-0" style={{ background: EDGE }} />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold" style={{ color: INK }}>
                  Sarah Chen
                </div>
                <div className="truncate text-[10.5px]" style={{ color: FAINT }}>
                  sarah@apexretail.sg · English
                </div>
                <div className="truncate text-[11.5px] font-medium" style={{ color: MUTED }}>
                  5,000 × 500 ml flask · FOB Rotterdam
                </div>
              </div>
            </div>
            {/* Hidden in a narrow container: at phone width these collide with
                the back link and the contact name. */}
            <div className="hidden shrink-0 items-center gap-2 @min-[560px]:flex">
              {['Pause AI', 'Bookmark'].map((label) => (
                <span
                  key={label}
                  className="rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold"
                  style={{ borderColor: HAIR, color: MUTED }}
                >
                  {label}
                </span>
              ))}
              <span
                className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-white"
                style={{ background: '#038153' }}
              >
                Take over
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3.5 overflow-hidden px-4 py-3">
            <MailBubble role="buyer" time="Email · 09:12" reveal={R(0.14, 0.26)}>
              Hi — we’re looking at 5,000 double-wall flasks for our Q4 range. Last
              year’s spec sheet is attached. Can you quote FOB Rotterdam?
              <span
                className="mt-2 flex w-fit items-center gap-1.5 rounded border px-2 py-1 text-[10.5px]"
                style={{ borderColor: HAIR, background: '#FBFBFB', color: MUTED }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Apex-RFQ-Q4.pdf
              </span>
            </MailBubble>

            <MailBubble role="ai" time="AI · 09:13" reveal={R(0.50, 0.60)}>
              Thanks for the spec sheet — it answered most of it. Confirmed: 5,000 pcs, 500 ml
              double-wall flask, 304 stainless steel, FOB Rotterdam; added from our records
              EN 4210 + LFGB and 30 days post-sample. Could you confirm the destination port
              and the logo method? Indicatively USD 4.60–4.90/unit — USD 23,000–24,500 for
              5,000 pcs, freight excluded.
            </MailBubble>

            <MailBubble role="buyer" time="Email · 09:41" reveal={R(0.80, 0.90)}>
              Destination is Singapore. Logo needs to be laser-etched, one colour.
            </MailBubble>

            <MailBubble role="ai" time="AI · 09:42" reveal={R(0.94, 1)}>
              Noted — Singapore, laser-etched in one colour. The range holds at USD 4.60–4.90
              per unit; laser is a tooling-free pass. Certificates attached and the draft
              reply is ready below.
            </MailBubble>
          </div>

          {/* Composer — one bar, no field rows. The product's compose dialog
              still has To / Cc / Bcc / Subject; the demo keeps the thread. */}
          <div
            className="flex shrink-0 items-center gap-2 border-t px-4 py-2.5"
            style={{ borderColor: EDGE }}
          >
            <span
              className="min-w-0 flex-1 truncate rounded border px-3 py-2.5 text-[12px]"
              style={{ borderColor: HAIR, background: '#FBFBFB', color: FAINT }}
            >
              Write a reply…
            </span>
            <span
              className="shrink-0 rounded px-4 py-2.5 text-[12px] font-medium text-white"
              style={{ background: '#038153' }}
            >
              Reply
            </span>
          </div>
        </div>

        {/* Buyer rail — the right-hand panel in the app: who they are, what
            they asked for, and which fields Sailwise had to go fetch. This is
            the product's best feature, so it must not vanish on a phone.

            It used to be `hidden` under 1000px, which meant every phone visitor
            never saw the spec extraction at all. Now it stacks under the thread
            at full width below 620px, stays hidden in the 620–1000px band where
            a side-by-side layout would squeeze the thread, and becomes the
            288px right rail at 1000px and up. */}
        <div
          className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t @min-[620px]:hidden @min-[1000px]:flex @min-[1000px]:w-[288px] @min-[1000px]:shrink-0 @min-[1000px]:border-t-0 @min-[1000px]:border-l"
          style={{ borderColor: EDGE, background: RAIL_SURFACE }}
        >
          {/* Buyer */}
          <div className="border-b px-4 py-3" style={{ borderColor: EDGE }}>
            <div className="mb-3 flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
                Buyer
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                <span
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#EDE7DE' }}
                />
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-full text-[13px] font-semibold text-white"
                  style={{ background: '#6366F1', opacity: buyerValues }}
                >
                  SC
                </span>
              </span>
              <div className="relative min-w-0 flex-1">
                {/* Empty slots — the frame is here from the start; the values
                    fill in once the email lands. */}
                <div
                  className="space-y-[7px] py-[3px]"
                  style={{ opacity: buyerValues < 1 ? 1 - buyerValues : 0 }}
                >
                  <div className="h-[12px] w-24 rounded-[3px]" style={{ background: '#EDE7DE' }} />
                  <div className="h-[10px] w-32 rounded-[3px]" style={{ background: '#F2ECE3' }} />
                </div>
                <div className="absolute inset-0" style={{ opacity: buyerValues }}>
                  <div className="truncate text-[13px] font-semibold" style={{ color: INK }}>
                    Sarah Chen
                  </div>
                  <div className="truncate text-[11px]" style={{ color: FAINT }}>
                    sarah@apexretail.sg
                  </div>
                </div>
              </div>
            </div>
            <dl
              className="mt-3 overflow-hidden rounded-md"
              style={{ background: '#FFFFFF', border: `1px solid ${HAIR}` }}
            >
              {[
                ['Company', 'Apex Retail Pte Ltd'],
                ['Industry', 'Retail, home & lifestyle'],
                ['Country', 'Singapore'],
                ['Payment', '30% deposit, 70% vs B/L'],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline justify-between gap-2 border-b px-2.5 py-1.5 last:border-b-0"
                  style={{ borderColor: HAIR }}
                >
                  <dt
                    className="shrink-0 text-[10px] uppercase tracking-[0.06em]"
                    style={{ color: FAINT }}
                  >
                    {k}
                  </dt>
                  <dd
                    className="min-w-0 truncate text-right text-[11.5px] font-medium"
                    style={{ color: INK, opacity: buyerValues }}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                ['Past threads', '6'],
                ['Past orders', '$84,200'],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-md px-2.5 py-2"
                  style={{ background: '#FFFFFF', border: `1px solid ${HAIR}` }}
                >
                  <p className="text-[10px] uppercase tracking-[0.06em]" style={{ color: FAINT }}>
                    {k}
                  </p>
                  <p
                    className="mt-0.5 text-[14px] font-semibold leading-none"
                    style={{ color: INK, opacity: buyerValues }}
                  >
                    {v}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5" style={{ opacity: buyerValues }}>
              {['email', 'EN', '4 Oct'].map((tag) => (
                <span
                  key={tag}
                  className="rounded border px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: '#FFFFFF', borderColor: HAIR, color: MUTED }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Specs — the extraction, with provenance on every row. */}
          <div
            className={`border-b px-4 py-4 ${specsDone > 0 ? 'btk-spec-glow' : ''}`}
            style={{ borderColor: EDGE }}
          >
            <div className="mb-3 flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
                Specs
              </span>
              {specsDone > 0 ? (
                <span
                  className="ml-auto flex items-center gap-1 text-[10.5px] font-medium"
                  style={{ color: '#0B7A4B' }}
                >
                  <svg
                    className="btk-spec-check"
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  {SPECS.length}/{SPECS.length} captured
                </span>
              ) : (
                <span className="ml-auto text-[10.5px] font-medium" style={{ color: FAINT }}>
                  Extracting…
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {SPECS.map((r, i) => {
                // The checklist is on screen from the first scroll: every label
                // shows immediately, with empty values. Once the enquiry lands
                // the values fill in, source by source (email, our records, the
                // buyer's reply).
                const groupIdx = SPECS.slice(0, i).filter((s) => s.origin === r.origin).length;
                const fillAt =
                  r.origin === 'email'
                    ? 0.3 + groupIdx * 0.05
                    : r.origin === 'fetched'
                      ? 0.48 + groupIdx * 0.05
                      : 0.84 + groupIdx * 0.05;
                const fill = R(fillAt, fillAt + 0.07);
                return (
                  <div key={r.label} className="flex items-start gap-2">
                    <span
                      className="flex w-[92px] shrink-0 items-center gap-1 text-[10.5px] leading-[1.35]"
                      style={{ color: FAINT }}
                    >
                      <span className="min-w-0 truncate">{r.label}</span>
                      {r.origin === 'reply' && (
                        <span
                          title="Missing from the email — waiting on the buyer"
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: '#D97706', opacity: 1 - fill }}
                        />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 items-start gap-1" style={{ opacity: fill }}>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#038153"
                        strokeWidth="2.5"
                        className="mt-[3px] shrink-0"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="min-w-0 text-[11.5px] leading-[1.35]" style={{ color: INK }}>
                        {r.value}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p
              className="mt-2.5 border-t pt-2 text-[10.5px] leading-snug"
              style={{ borderColor: HAIR, color: FAINT, opacity: R(0.96, 1) }}
            >
              {emailCount} read from the email · {fetchedCount} from our records ·{' '}
              <span
                className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{ background: '#D97706' }}
              />
              {replyCount} missing
              {openCount > 0 ? ` · ${openCount} still open` : ' · no gaps left'}
            </p>
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
            <span className="rounded-md border px-2.5 py-1 text-[10.5px] font-medium" style={{ background: PANEL, borderColor: HAIR, color: MUTED }}>
              All mail
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2.5 px-4 py-3.5">
            <Bubble side="in" meta="Email · 09:12">
              Hi, we need 5,000 double-wall flasks, 500ml, 304 steel. Logo to be laser-etched.
            </Bubble>
            <div className="flex justify-start">
              <div className="rounded-xl px-3.5 py-2.5 text-[11px]" style={{ background: PANEL, border: `1px solid ${HAIR}`, color: MUTED }}>
                <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: FAINT }}>
                  Extracted
                </div>
                <ul className="space-y-1" style={{ color: INK }}>
                  <li>5,000 pcs · 500ml · double-wall 304</li>
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
  { label: 'Quantity', value: '5,000 pcs', conf: 0.98, status: 'Confirmed', cite: 'line 12' },
  { label: 'Specification', value: '500ml · double-wall 304', conf: 0.94, status: 'Confirmed', cite: 'line 12' },
  { label: 'Branding', value: 'Logo printing · sample required', conf: 0.81, status: 'Needs check', cite: 'line 12' },
] as const;

const GAP_LANGS = ['English', '繁體中文'];
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
          style={{ background: PANEL, borderColor: HAIR, color: MUTED }}
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
          &ldquo;Hi, we need 5,000 double-wall flasks, 500ml, 304 steel. Logo to be
          laser-etched.&rdquo;
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
        style={{ background: PANEL, border: `1px solid ${HAIR}` }}
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
              style={{ background: '#FFFFFF', borderColor: HAIR, color: MUTED }}
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
                style={{ background: PEACH_SOFT, color: TERRA, border: `1px solid ${PEACH}` }}
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
              MOQ is 100 units at USD 4.20 each.
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
    { qty: '5,000 pcs', desc: '500ml Double-wall Flask · 304 steel', price: 'USD 4.60' },
    { qty: '5,000 pcs', desc: 'Logo · single-colour laser etch', price: 'USD 0.30' },
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
            USD 24,500
          </span>
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
                <div className="font-semibold">Sarah Chen · Apex Retail</div>
                <div>500ml vacuum bottle · 304</div>
                <div>5,000 pcs · specs ready to price</div>
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
                <div>報價單 Q-2091 · USD 24,500</div>
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

/* ── Opportunities ──────────────────────────────────────────────────────────
   The pipeline page, rendered to match the real app screen (title, subtitle,
   create button, search, and the Title / Product / Stage / Value / Priority /
   Updated table) rather than the landing's own card language. The thread the
   dashboard just finished shows up as the newest row, so the motion reads as
   "the inquiry became an opportunity" without any copy saying so. */

interface OppStage {
  label: string;
  color: string;
  bg: string;
}

const OPP_STAGES: Record<string, OppStage> = {
  needs: { label: 'Needs specs', color: '#B45309', bg: '#FEF3C7' },
  quoted: { label: 'Quoted', color: '#0891B2', bg: '#ECFEFF' },
  negotiation: { label: 'Negotiation', color: '#7C3AED', bg: '#F5F3FF' },
  sample: { label: 'Sample sent', color: '#2563EB', bg: '#EFF6FF' },
};

const OPP_PRIORITIES: Record<string, OppStage> = {
  high: { label: 'High', color: '#B45309', bg: '#FEF3C7' },
  medium: { label: 'Medium', color: '#4B5563', bg: '#F3F4F6' },
  low: { label: 'Low', color: '#6B7280', bg: '#F3F4F6' },
};

const OPP_ROWS: {
  title: string;
  product: string;
  stage: string;
  priority: string;
  value: string;
  updated: string;
  fresh?: boolean;
}[] = [
  {
    title: '5,000 × 500 ml flask',
    product: '500ml Double-wall Flask',
    stage: 'needs',
    priority: 'high',
    value: 'USD 23,000',
    updated: 'Just now',
    fresh: true,
  },
  {
    title: 'Ceramic mug set restock',
    product: 'Ceramic Mug Set',
    stage: 'quoted',
    priority: 'medium',
    value: 'USD 12,400',
    updated: '2h ago',
  },
  {
    title: 'Insulated tumblers — Q1',
    product: 'Stainless Tumbler',
    stage: 'negotiation',
    priority: 'high',
    value: 'USD 41,800',
    updated: 'Yesterday',
  },
  {
    title: 'Bamboo lid sample run',
    product: 'Bamboo Lid',
    stage: 'sample',
    priority: 'low',
    value: 'USD 6,900',
    updated: '3d ago',
  },
];

export function OpportunitiesPageMock({ highlight = 1 }: { highlight?: number } = {}) {
  const h = clamp01(highlight);
  return (
    <div className="@container overflow-hidden rounded-2xl border bg-white" style={CARD}>
      <div className="flex @min-[620px]:h-[620px] @min-[620px]:flex-row flex-col">
        {/* Keep the product nav, only switching the active item — the same
            object the inbox mock showed, so the swap reads as one app. */}
        <Sidebar active="Opportunities" />

        <div className="flex min-w-0 flex-1 flex-col bg-white">
          {/* Page header */}
          <div
            className="flex items-center justify-between gap-3 border-b px-4 py-3.5"
            style={{ borderColor: EDGE }}
          >
            <div className="min-w-0">
              <div className="text-[16px] font-semibold tracking-[-0.2px]" style={{ color: INK }}>
                Opportunities
              </div>
              <div className="mt-0.5 truncate text-[11.5px]" style={{ color: FAINT }}>
                Threads with every spec collected — ready to quote.
              </div>
            </div>
            <span
              className="shrink-0 rounded px-3 py-2 text-[11.5px] font-medium text-white"
              style={{ background: '#038153' }}
            >
              Create Opportunity
            </span>
          </div>

          {/* Search */}
          <div className="px-4 pt-3.5">
            <div
              className="flex items-center gap-2 rounded border px-2.5 py-2 text-[11.5px]"
              style={{ borderColor: HAIR, background: '#FBFBFB', color: FAINT }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
              </svg>
              Search opportunities…
            </div>
          </div>

          {/* Table */}
          <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-3">
            <div className="overflow-hidden rounded border" style={{ borderColor: EDGE }}>
              <div
                className="grid grid-cols-[1.6fr_1.1fr_0.85fr_0.7fr_0.6fr_0.6fr] gap-3 border-b px-3 py-2 text-[10px] font-medium uppercase tracking-[0.05em]"
                style={{ borderColor: EDGE, background: LIST_SURFACE, color: FAINT }}
              >
                <span>Title</span>
                <span>Product</span>
                <span>Stage</span>
                <span>Value</span>
                <span>Priority</span>
                <span>Updated</span>
              </div>
              {OPP_ROWS.map((row) => {
                const stage = OPP_STAGES[row.stage];
                const prio = OPP_PRIORITIES[row.priority];
                const fresh = row.fresh ? h : 1;
                return (
                  <div
                    key={row.title}
                    className="relative grid grid-cols-[1.6fr_1.1fr_0.8fr_0.7fr_0.6fr_0.6fr] items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
                    style={{
                      borderColor: HAIR,
                      background: row.fresh ? `rgba(3,129,83,${0.06 * h})` : '#FFFFFF',
                      opacity: row.fresh ? 0.25 + 0.75 * fresh : 1,
                      transform: `translateY(${(1 - fresh) * -6}px)`,
                    }}
                  >
                    {row.fresh && (
                      <span
                        className="absolute left-0 top-0 h-full w-[3px]"
                        style={{ background: '#038153', opacity: h }}
                      />
                    )}
                    <span className="min-w-0 truncate text-[12px] font-medium" style={{ color: INK }}>
                      {row.title}
                      {row.fresh && (
                        <span
                          className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] align-middle"
                          style={{ background: '#E8F5F1', color: '#038153', opacity: h }}
                        >
                          New
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 truncate text-[11.5px]" style={{ color: MUTED }}>
                      {row.product}
                    </span>
                    <span>
                      <span
                        className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ color: stage.color, background: stage.bg }}
                      >
                        {stage.label}
                      </span>
                    </span>
                    <span className="text-[11.5px] tabular-nums" style={{ color: INK }}>
                      {row.value}
                    </span>
                    <span>
                      <span
                        className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ color: prio.color, background: prio.bg }}
                      >
                        {prio.label}
                      </span>
                    </span>
                    <span className="truncate text-[11px]" style={{ color: FAINT }}>
                      {row.updated}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2.5 text-[10.5px]" style={{ color: FAINT }}>
              4 opportunities · {OPP_ROWS.length} rows
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────────────────────
   The landing's "morning briefing". Reads as the same app the inbox/opps
   mocks show — same sidebar (active item switched to Dashboard), same card
   frame — so a visitor sees the tool they'd open first thing. Data mirrors
   the Opportunities mock so the story stays consistent (USD 23,000 flask,
   the negotiating tumbler, etc.). */
const DASH_ATTENTION: { label: string; count: number; tone: string }[] = [
  { label: 'Needs your confirmation', count: 3, tone: '#038153' },
  { label: 'Owed replies', count: 5, tone: '#B45309' },
  { label: 'Missing specs', count: 4, tone: '#B45309' },
  { label: 'Follow-ups due', count: 2, tone: '#6B7280' },
];

const DASH_KPIS: [string, string][] = [
  ['Needs you', '3'],
  ['Owed replies', '5'],
  ['Missing specs', '4'],
  ['Ready to quote', '6'],
  ['Open opportunities', '18'],
  ['Won this month', '4'],
];

const DASH_PIPELINE: [string, number, string][] = [
  ['New', 5, '#6B7280'],
  ['Qualified', 4, '#2563EB'],
  ['Sourcing', 3, '#7C3AED'],
  ['Quote draft', 3, '#D97706'],
  ['Pending approval', 2, '#D97706'],
  ['Sent', 6, '#2563EB'],
  ['Negotiating', 3, '#7C3AED'],
];

export function DashboardPageMock() {
  const maxPipeline = Math.max(...DASH_PIPELINE.map(([, n]) => n));
  return (
    <div className="@container overflow-hidden rounded-2xl border bg-white" style={CARD}>
      <div className="flex @min-[620px]:h-[620px] @min-[620px]:flex-row flex-col">
        <Sidebar active="Dashboard" />

        <div className="flex min-w-0 flex-1 flex-col bg-white">
          {/* Page header */}
          <div
            className="flex items-center justify-between gap-3 border-b px-4 py-3.5"
            style={{ borderColor: EDGE }}
          >
            <div className="min-w-0">
              <div className="text-[16px] font-semibold tracking-[-0.2px]" style={{ color: INK }}>
                Dashboard
              </div>
              <div className="text-[11.5px]" style={{ color: FAINT }}>
                What needs you right now, at a glance.
              </div>
            </div>
            <span className="hidden text-[11px] @min-[460px]:block" style={{ color: FAINT }}>
              Mon, 6 Oct
            </span>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3.5 overflow-hidden px-4 py-4 @min-[620px]:grid-cols-2">
            {/* Left column: needs attention + pipeline */}
            <div className="flex min-w-0 flex-col gap-3.5">
              <div className="rounded-lg border" style={{ borderColor: HAIR }}>
                <div
                  className="flex items-center justify-between border-b px-3 py-2"
                  style={{ borderColor: HAIR }}
                >
                  <span className="text-[12px] font-semibold" style={{ color: INK }}>
                    Needs attention
                  </span>
                  <span className="text-[10.5px]" style={{ color: FAINT }}>
                    24 conversations
                  </span>
                </div>
                {DASH_ATTENTION.map((row, i) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-2.5 px-3 py-2"
                    style={{ borderTop: i === 0 ? 'none' : `1px solid ${HAIR}` }}
                  >
                    <span
                      className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums leading-none text-white"
                      style={{ background: row.tone }}
                    >
                      {row.count}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: MUTED }}>
                      {row.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border" style={{ borderColor: HAIR }}>
                <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: HAIR }}>
                  <span className="text-[12px] font-semibold" style={{ color: INK }}>
                    Pipeline
                  </span>
                  <span className="text-[10.5px]" style={{ color: FAINT }}>
                    USD 84,100 open
                  </span>
                </div>
                <div className="space-y-1.5 px-3 py-2.5">
                  {DASH_PIPELINE.map(([label, n, color]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-[86px] shrink-0 truncate text-[10.5px]" style={{ color: MUTED }}>
                        {label}
                      </span>
                      <span className="h-3 flex-1 overflow-hidden rounded-[3px]" style={{ background: PANEL }}>
                        <span
                          className="block h-full rounded-[3px]"
                          style={{ width: `${(n / maxPipeline) * 100}%`, background: color, opacity: 0.85 }}
                        />
                      </span>
                      <span className="w-4 text-right text-[10.5px] tabular-nums" style={{ color: INK }}>
                        {n}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: KPIs + recent */}
            <div className="flex min-w-0 flex-col gap-3.5">
              <div className="grid grid-cols-3 gap-2">
                {DASH_KPIS.map(([label, value], i) => (
                  <div
                    key={label}
                    className="rounded-lg border px-2.5 py-2"
                    style={{ borderColor: HAIR, background: i === 0 ? TEAL_SOFT : '#FFFFFF' }}
                  >
                    <div
                      className="text-[17px] font-semibold leading-none tabular-nums"
                      style={{ color: i === 0 ? TEAL : INK }}
                    >
                      {value}
                    </div>
                    <div className="mt-1 text-[9.5px] leading-tight" style={{ color: MUTED }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border" style={{ borderColor: HAIR }}>
                <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: HAIR }}>
                  <span className="text-[12px] font-semibold" style={{ color: INK }}>
                    Recent opportunities
                  </span>
                  <span className="text-[10.5px]" style={{ color: '#038153' }}>
                    View all
                  </span>
                </div>
                {OPP_ROWS.map((row, i) => {
                  const stage = OPP_STAGES[row.stage];
                  return (
                    <div
                      key={row.title}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ borderTop: i === 0 ? 'none' : `1px solid ${HAIR}` }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] font-medium" style={{ color: INK }}>
                          {row.title}
                        </span>
                        <span className="block truncate text-[10px]" style={{ color: FAINT }}>
                          {row.product}
                        </span>
                      </span>
                      <span className="text-[10.5px] tabular-nums" style={{ color: INK }}>
                        {row.value}
                      </span>
                      <span
                        className="whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-medium"
                        style={{ color: stage.color, background: stage.bg }}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
