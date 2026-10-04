'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Inbox,
  MessageCircle,
  FileText,
  Check,
  Send,
  Quote,
  Globe,
  AlertTriangle,
  Bot,
  Play,
  Pause,
} from 'lucide-react';

const STAGES = [
  { key: 'inquiry', label: 'Inquiry', icon: Inbox, accent: '#8A8279' },
  { key: 'clarify', label: 'Clarify', icon: MessageCircle, accent: '#0A6E5C' },
  { key: 'price', label: 'Price', icon: FileText, accent: '#0A6E5C' },
  { key: 'quote', label: 'Quote', icon: Quote, accent: '#1B1917' },
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

function InquiryScene() {
  return (
    <div className="space-y-3">
      <Stagger delay={0}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#1B1917' }}>
            SC
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: '#1B1917' }}>Sarah Chen</div>
            <div className="text-xs" style={{ color: '#8A8279' }}>Pacific Trading · Shenzhen</div>
          </div>
          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#F0EDE6', color: '#1B1917', borderColor: '#D8CFC0' }}>
            <Inbox className="w-3 h-3" /> Email
          </span>
          <span className="text-[11px] shrink-0" style={{ color: '#8A8279' }}>just now</span>
        </div>
      </Stagger>

      <Stagger delay={150}>
        <div className="rounded-xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed" style={{ background: '#F5F2EC', color: '#5A554E', border: '1px solid #E8E4DE' }}>
          Hi, we need 10,000 pcs of 500ml stainless steel vacuum bottles for a corporate order. Please quote with
          logo printing and your best lead time. Preference for double-wall, 304 food grade. We also need a sample
          before mass production.
        </div>
      </Stagger>

      <Stagger delay={450}>
        <div className="rounded-xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed border" style={{ background: '#FFF', color: '#111', borderColor: '#E8E4DE', boxShadow: '0 8px 24px -16px rgba(0,0,0,0.14)' }}>
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold" style={{ color: '#1B1917' }}>
            <span className="inline-flex items-center gap-1"><Bot className="w-3 h-3" /> AI draft</span>
            <span className="text-[#8A8279] font-medium">· awaiting approval</span>
          </div>
          <div className="leading-relaxed" style={{ color: '#46423D' }}>
            Hi Sarah — thanks for the inquiry. Glad to quote the 500ml double-wall 304 bottles with logo printing.
            Before pricing: could you share a target price or budget, the Incoterm, and the delivery destination &amp; date?
            A sample can ship before mass production.
          </div>
        </div>
      </Stagger>
    </div>
  );
}

const EXTRACTED = ['10,000 pcs', '500ml · double-wall · 304', 'Logo printing', 'Sample pre-order'];

const GAPS = ['Target price / budget', 'Incoterm (FOB / CIF / EXW)', 'Destination & date'];

function ClarifyScene() {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl px-4 py-3.5" style={{ background: '#F5F2EC', border: '1px solid #E8E4DE' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#8A8279' }}>Extracted</div>
          <ul className="space-y-2">
            {EXTRACTED.map((item, i) => (
              <Stagger key={item} delay={i * 140}>
                <li className="flex items-center gap-2 text-sm" style={{ color: '#5A554E' }}>
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#1B1917' }} strokeWidth={3} />
                  {item}
                </li>
              </Stagger>
            ))}
          </ul>
        </div>
        <div className="rounded-xl px-4 py-3.5" style={{ background: '#FAF7F2', border: '1px dashed #D8CFC0' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: '#1B1917' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> Gaps it caught
          </div>
          <ul className="space-y-2">
            {GAPS.map((item, i) => (
              <Stagger key={item} delay={240 + i * 140}>
                <li className="flex items-center gap-2 text-sm" style={{ color: '#46423D' }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#1B1917' }} />
                  {item}
                </li>
              </Stagger>
            ))}
          </ul>
        </div>
      </div>
      <Stagger delay={700}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#F0EDE6', color: '#1B1917', borderColor: '#D8CFC0' }}>
            <Globe className="w-3 h-3" /> Draft reply · English · awaiting your approval
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#1B1917', boxShadow: 'inset 0 -2px 0 0 #2B2724' }}>
            <Send className="w-3 h-3" /> Approve &amp; ask
          </span>
        </div>
      </Stagger>
    </div>
  );
}

const PRICE_INPUTS = [
  { label: 'Unit price (your list)', value: 'USD 4.00 / pc', note: 'Product price list' },
  { label: 'Margin applied', value: '+20%', note: 'Bottle margin rule' },
  { label: 'FX rate', value: '7.82', note: 'USD → HKD' },
];

function DraftPriceScene() {
  return (
    <div className="space-y-3">
      {PRICE_INPUTS.map((p, i) => (
        <Stagger key={p.label} delay={i * 160}>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#F5F2EC', border: '1px solid #E8E4DE' }}>
            <div className="flex-1 text-sm font-medium" style={{ color: '#1B1917' }}>{p.label}</div>
            <div className="text-sm font-bold tabular-nums" style={{ color: '#1B1917' }}>{p.value}</div>
            <span className="text-[11px] shrink-0" style={{ color: '#8A8279' }}>{p.note}</span>
          </div>
        </Stagger>
      ))}
      <Stagger delay={620}>
        <div>
          <div className="flex justify-between text-[11px] font-semibold mb-1.5" style={{ color: '#8A8279' }}>
            <span>Drafting your price</span>
            <span style={{ color: '#1B1917' }}>target <span className="font-bold">USD 5.00</span>/pc</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E8E4DE' }}>
            <div className="h-full rounded-full btk-anim-rise" style={{ background: '#1B1917', width: '100%', transformOrigin: 'left', animationName: 'btk-trace', animationDuration: '1.2s' }} />
          </div>
        </div>
      </Stagger>
    </div>
  );
}

const QUOTE_LINES = [
  { qty: '10,000 pcs', label: '500ml Vacuum Bottle, Double-Wall 304', unit: 'USD 5.00 / pc', total: 'USD 50,000', src: 'Product price · 20% margin' },
  { qty: '10,000 pcs', label: 'Logo Printing (single-color laser)', unit: 'USD 0.35 / pc', total: 'USD 3,500', src: 'Cost + margin rule' },
  { qty: '1 pc', label: 'Sample (air freight)', unit: 'USD 25.00', total: 'USD 25', src: 'Ctn 2026-03 · FX 7.82' },
];

const QUOTE_TOTAL = 'USD 53,525';

function QuoteScene() {
  const [sent, setSent] = useState(false);

  return (
    <div className="space-y-3">
      {QUOTE_LINES.map((line, i) => (
        <Stagger key={line.label} delay={i * 180}>
          <div className="rounded-xl px-4 py-3" style={{ background: '#F5F2EC', border: '1px solid #E8E4DE' }}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="font-medium" style={{ color: '#1B1917' }}>
                <span className="text-xs font-semibold" style={{ color: '#8A8279' }}>{line.qty} · </span>
                {line.label}
              </span>
              <span className="shrink-0 font-bold tabular-nums" style={{ color: '#1B1917' }}>{line.unit}</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]" style={{ color: '#8A8279' }}>
              <span className="flex items-center gap-1.5">
                <FileText className="w-3 h-3" style={{ color: '#1B1917' }} /> {line.src}
              </span>
              <span className="font-semibold tabular-nums">{line.total}</span>
            </div>
          </div>
        </Stagger>
      ))}
      <Stagger delay={620}>
        <div className="rounded-xl px-4 py-3 flex items-center justify-between text-sm font-bold border" style={{ background: '#F0EDE6', color: '#1B1917', borderColor: '#D8CFC0' }}>
          <span>Subtotal</span>
          <span className="tabular-nums">{QUOTE_TOTAL}</span>
        </div>
      </Stagger>
      <Stagger delay={700}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] leading-relaxed" style={{ color: '#5A554E' }}>
            Bottles: 20% margin (USD 4.00 → 5.00/pc). Printing &amp; sample at cost. FX 7.82 — quote holds for 15 days.
          </p>
          <button
            type="button"
            onClick={() => setSent(true)}
            disabled={sent}
            aria-live="polite"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg text-white transition-all active:scale-[0.98] disabled:cursor-default shrink-0"
            style={
              sent
                ? { background: '#F0EDE6', color: '#1B1917', boxShadow: 'inset 0 0 0 1px #1B1917', border: 'none' }
                : { background: '#1B1917', boxShadow: 'inset 0 -2px 0 0 #2B2724' }
            }
          >
            {sent ? (
              <>
                <Check className="w-3.5 h-3.5" strokeWidth={3} /> Sent to Sarah
              </>
            ) : (
              <>
                <Send className="w-3 h-3" /> Approve &amp; send to Sarah
              </>
            )}
          </button>
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

  const scenes = [<InquiryScene key="i" />, <ClarifyScene key="c" />, <DraftPriceScene key="p" />, <QuoteScene key="q" />];

  const hold = () => setInteracting(true);
  const release = () => setInteracting(false);
  const selectStage = (i: number) => {
    setStage(i);
    setPaused(true);
  };
  const autoplaying = !reduceMotion.current && !paused && !interacting;

  return (
    <div className="max-w-4xl 2xl:max-w-5xl mx-auto rounded-2xl border p-4 md:p-5 text-left btk-anim-rise" style={{ background: '#FFFFFF', borderColor: '#E8E4DE', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.85), 0 1px 2px rgba(0,0,0,0.05), 0 24px 60px -30px rgba(0,0,0,0.18)' }}>
      <div className="flex items-center gap-2 mb-3 select-none">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
        <span className="ml-3 text-xs font-semibold" style={{ color: '#1B1917' }}>Sailwise</span>
        <span className="hidden sm:inline text-[11px]" style={{ color: '#8A8279' }}>· Pacific Trading inbox</span>
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

      <div className="grid grid-cols-4 gap-2 mb-4" onMouseEnter={hold} onMouseLeave={release} onTouchStart={hold} onTouchEnd={release}>
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

      <div key={stage} className="min-h-[282px] md:min-h-[262px]" onMouseEnter={hold} onMouseLeave={release} onTouchStart={hold} onTouchEnd={release}>
        {scenes[stage]}
      </div>

      <div className="mt-5 pt-3.5 border-t" style={{ borderColor: '#E8E4DE' }}>
        <span className="text-xs" style={{ color: '#8A8279' }}>Every step is a draft you approve before it goes out.</span>
      </div>
    </div>
  );
}