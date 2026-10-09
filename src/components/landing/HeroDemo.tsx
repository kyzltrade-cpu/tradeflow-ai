'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Inbox, Check, Send, Globe, AlertTriangle, Bot, Play, Pause } from 'lucide-react';

const STAGES = [
  { key: 'inquiry', label: 'Inquiry', icon: Inbox, accent: '#8A8279' },
  { key: 'specs', label: 'Specs complete', icon: Check, accent: '#0A6E5C' },
];

const SCENE_DURATION = 5200;

function Stagger({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <div
      className="btk-anim-rise-sm"
      style={{
        animationDelay: `${delay}ms`,
        animationPlayState: 'running',
      }}
    >
      {children}
    </div>
  );
}

const INQUIRY =
  'Hi, we need 5,000 pcs of 500ml stainless steel vacuum bottles for a corporate ' +
  'order. Please quote with logo printing and your best lead time. Preference for ' +
  'double-wall, 304 food grade. We also need a sample before mass production.';

/* The gaps the buyer left, shown as the questions Sailwise turns them into. The
   earlier version buried all three inside a prose sentence, which is exactly the
   thing this product exists to replace — you should be able to see at a glance
   that it knows what it does not know. */
const QUESTIONS = [
  'Target price or budget?',
  'Which Incoterm — FOB, CIF or EXW?',
  'Delivery destination and required date?',
];

function InquiryScene() {
  return (
    <div className="space-y-3.5">
      {/* The buyer. Left-aligned, warm grey, tail on the bottom-left — the
          standard incoming-message shape, so the eye reads it as received
          rather than composed. */}
      <Stagger delay={0}>
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
            style={{ background: '#8A8279' }}
          >
            SC
          </span>
          <span className="text-xs font-semibold" style={{ color: '#1B1917' }}>
            Sarah Chen
          </span>
          <span className="truncate text-[11px]" style={{ color: '#8A8279' }}>
            Apex Retail · Singapore
          </span>
          <span
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-[3px] text-[10px] font-semibold"
            style={{ background: '#F0EDE6', color: '#5A554E', borderColor: '#D8CFC0' }}
          >
            <Inbox className="h-2.5 w-2.5" />
            Email
          </span>
          <span className="shrink-0 text-[10px]" style={{ color: '#A9A29A' }}>
            just now
          </span>
        </div>
      </Stagger>

      <Stagger delay={140}>
        <div
          className="max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed"
          style={{ background: '#F5F2EC', color: '#46423D', border: '1px solid #E8E4DE' }}
        >
          {INQUIRY}
        </div>
      </Stagger>

      {/* Ours. Right-aligned and ink-dark, which is what makes the approval
          question legible: the draft is visibly *not sent* because it sits on
          your side of the thread with a footer of controls still attached. */}
      <Stagger delay={420}>
        <div className="ml-auto max-w-[94%]">
          <div className="mb-1.5 flex items-center justify-end gap-2">
            <span className="text-[10px] font-semibold" style={{ color: '#8A8279' }}>
              awaiting approval
            </span>
            <span
              className="grid h-5 w-5 place-items-center rounded-full"
              style={{ background: '#0A6E5C' }}
            >
              <Bot className="h-3 w-3" style={{ color: '#FAF7F2' }} />
            </span>
            <span className="text-[11px] font-semibold" style={{ color: '#1B1917' }}>
              Sailwise
            </span>
          </div>

          <div
            className="rounded-2xl rounded-br-md px-4 py-3.5"
            style={{ background: '#F5F2EC', color: '#1B1917', border: '1px solid #E8E4DE' }}
          >
            <div className="text-sm leading-relaxed" style={{ color: '#1B1917' }}>
              Hi Sarah — I have the product, quantity and branding. Three things are
              still missing before this can be priced:
            </div>

            {/* Numbered because count is the point: it is three questions, not
                thirty, and each one is a thing the buyer actually left out. */}
            <ol className="mt-3 space-y-2">
              {QUESTIONS.map((q, i) => (
                <Stagger key={q} delay={580 + i * 130}>
                  <li className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: '#1B1917' }}>
                    <span
                      className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: '#FAF7F2', color: '#1B1917', borderColor: '#E8E4DE' }}
                    >
                      {i + 1}
                    </span>
                    {q}
                  </li>
                </Stagger>
              ))}
            </ol>

            <div
              className="mt-3.5 flex flex-wrap items-center gap-2 border-t pt-3"
              style={{ borderColor: '#E8E4DE' }}
            >
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[10px] font-semibold"
                style={{ background: '#FAF7F2', color: '#8A8279', borderColor: '#E8E4DE' }}
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                3 gaps found
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[10px] font-semibold"
                style={{ background: '#FAF7F2', color: '#8A8279', borderColor: '#E8E4DE' }}
              >
                <Globe className="h-2.5 w-2.5" />
                English
              </span>
              <span
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ background: '#FAF7F2', color: '#1B1917', borderColor: '#E8E4DE' }}
              >
                <Send className="h-3 w-3" />
                Send questions
              </span>
            </div>
          </div>
        </div>
      </Stagger>
    </div>
  );
}

/* "Specs complete" is the payoff, so it lists everything it pulled out of that
   one email — product, material, quantity, branding, sample and lead time — with
   the line each one came from. Four chips was a summary pretending to be a
   result; this is the actual spec sheet the trader would approve. */
const EXTRACTED = [
  { label: 'Product', value: '500ml double-wall vacuum bottle', cite: 'line 12' },
  { label: 'Material', value: '304 food grade stainless', cite: 'line 12' },
  { label: 'Quantity', value: '5,000 pcs', cite: 'line 12' },
  { label: 'Branding', value: 'Logo printing', cite: 'line 12' },
  { label: 'Sample', value: 'Required before mass production', cite: 'line 13' },
  { label: 'Lead time', value: 'Best available — requested', cite: 'line 13' },
] as const;

function SpecsScene() {
  return (
    <div className="space-y-3.5">
      <Stagger delay={0}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#1B1917' }}>
            Extracted from this thread
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#F0EDE6', color: '#8A8279', borderColor: '#D8CFC0' }}>
            {EXTRACTED.length} specs
          </span>
        </div>
      </Stagger>

      <div className="grid sm:grid-cols-2 gap-2.5">
        {EXTRACTED.map((row, i) => (
          <Stagger key={row.label} delay={140 + i * 110}>
            <div
              className="flex items-start gap-2.5 rounded-xl px-4 py-3"
              style={{ background: '#F5F2EC', border: '1px solid #E8E4DE' }}
            >
              <Check className="mt-[3px] w-3.5 h-3.5 shrink-0" style={{ color: '#0A6E5C' }} strokeWidth={3} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#8A8279' }}>
                  {row.label}
                </div>
                <div className="mt-0.5 text-sm leading-snug" style={{ color: '#1B1917' }}>
                  {row.value}
                </div>
                <div className="mt-1 font-mono text-[10px]" style={{ color: '#8A8279' }}>
                  {row.cite}
                </div>
              </div>
            </div>
          </Stagger>
        ))}
      </div>

      <Stagger delay={800}>
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ background: '#0A6E5C' }}
        >
          <Check className="w-4 h-4 shrink-0" style={{ color: '#FAF7F2' }} strokeWidth={3} />
          <span style={{ color: '#FAF7F2' }}>
            Nothing left to guess — every field carries its source line.
          </span>
        </div>
      </Stagger>
    </div>
  );
}

export default function HeroDemo() {
  const [stage, setStage] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion.current) setPaused(true);
  }, []);

  useEffect(() => {
    if (reduceMotion.current || paused || interacting) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setStage((s) => (s + 1) % STAGES.length);
    }, SCENE_DURATION);

    return () => clearInterval(id);
  }, [paused, interacting]);

  // Two scenes, both about specs. The price/quote scenes were cut: quoting is
  // the next thing to ship, so animating it here was promising a pilot a
  // feature it does not get on day one.
  const scenes = [<InquiryScene key="i" />, <SpecsScene key="s" />];

  const hold = () => setInteracting(true);
  const release = () => setInteracting(false);
  const selectStage = (i: number) => {
    setStage(i);
    setPaused(true);
  };
  const autoplaying = !reduceMotion.current && !paused && !interacting;

  return (
    <div className="max-w-4xl 2xl:max-w-5xl mx-auto rounded-2xl border p-4 md:p-5 text-left btk-anim-rise" style={{
      background: '#FFFFFF',
      backgroundImage:
        'linear-gradient(to right, rgba(27, 25, 23, 0.045) 1px, transparent 1px), ' +
        'linear-gradient(to bottom, rgba(27, 25, 23, 0.045) 1px, transparent 1px)',
      backgroundSize: '12px 12px',
      backgroundPosition: '-1px -1px',
      borderColor: '#E8E4DE',
      boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.85), 0 1px 2px rgba(0,0,0,0.05), 0 24px 60px -30px rgba(0,0,0,0.18)'
    }}>
      <div className="flex items-center gap-2 mb-3 select-none">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
        <span className="ml-3 text-xs font-semibold" style={{ color: '#1B1917' }}>Sailwise</span>
        <span className="hidden sm:inline text-[11px]" style={{ color: '#8A8279' }}>· Apex Retail inbox · example</span>
        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play demo' : 'Pause demo'}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors hover:bg-black/[0.04] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ color: '#1B1917' }}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {paused || reduceMotion.current ? 'Play' : 'Pause'}
          </button>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4" onMouseEnter={hold} onMouseLeave={release} onTouchStart={hold} onTouchEnd={release}>
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const active = i === stage;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => selectStage(i)}
              aria-pressed={active}
              aria-label={`Show ${s.label} step`}
              className="flex flex-col items-center gap-1 rounded-xl px-2 pt-2.5 pb-1.5 text-xs font-semibold cursor-pointer transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              style={{
                background: active ? `${s.accent}14` : 'transparent',
                color: active ? s.accent : '#8A8279',
              }}
            >
              <span className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{s.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div key={stage} className="min-h-[360px] md:min-h-[340px]" onMouseEnter={hold} onMouseLeave={release} onTouchStart={hold} onTouchEnd={release}>
        {scenes[stage]}
      </div>

      <div className="mt-5 pt-3.5 border-t" style={{ borderColor: '#E8E4DE' }}>
        <span className="text-xs" style={{ color: '#8A8279' }}>Every step is a draft you approve before it goes out.</span>
      </div>
    </div>
  );
}