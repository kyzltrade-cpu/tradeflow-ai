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
  Users,
  Bot,
  Play,
  Pause,
} from 'lucide-react';

const STAGES = [
  { key: 'inquiry', label: 'Inquiry', icon: Inbox, accent: '#F59E0B' },
  { key: 'clarify', label: 'Clarify', icon: MessageCircle, accent: '#2563EB' },
  { key: 'rfq', label: 'RFQ', icon: Users, accent: '#7C3AED' },
  { key: 'quote', label: 'Quote', icon: Quote, accent: '#059669' },
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
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#000' }}>
            SC
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>Sarah Chen</div>
            <div className="text-xs" style={{ color: '#9A9A9A' }}>Pacific Trading · Shenzhen</div>
          </div>
          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#F4F4F4', color: '#000', borderColor: '#E0E0E0' }}>
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </span>
          <span className="text-[11px] shrink-0" style={{ color: '#9A9A9A' }}>just now</span>
        </div>
      </Stagger>

      <Stagger delay={150}>
        <div className="rounded-xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed" style={{ background: '#FAFAFA', color: '#555555', border: '1px solid #ECECEC' }}>
          Hi, we need 10,000 pcs of 500ml stainless steel vacuum bottles for a corporate order. Please quote with
          logo printing and your best lead time. Preference for double-wall, 304 food grade. We also need a sample
          before mass production.
        </div>
      </Stagger>

      <Stagger delay={450}>
        <div className="rounded-xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed border" style={{ background: '#FFF', color: '#111', borderColor: '#E5E5E5', boxShadow: '0 8px 24px -16px rgba(0,0,0,0.14)' }}>
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold" style={{ color: '#000' }}>
            <span className="inline-flex items-center gap-1"><Bot className="w-3 h-3" /> AI draft</span>
            <span className="text-[#9A9A9A] font-medium">· awaiting approval</span>
          </div>
          <div className="leading-relaxed" style={{ color: '#333333' }}>
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
        <div className="rounded-xl px-4 py-3.5" style={{ background: '#FAFAFA', border: '1px solid #ECECEC' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#9A9A9A' }}>Extracted</div>
          <ul className="space-y-2">
            {EXTRACTED.map((item, i) => (
              <Stagger key={item} delay={i * 140}>
                <li className="flex items-center gap-2 text-sm" style={{ color: '#555555' }}>
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#000' }} strokeWidth={3} />
                  {item}
                </li>
              </Stagger>
            ))}
          </ul>
        </div>
        <div className="rounded-xl px-4 py-3.5" style={{ background: '#FCFCFC', border: '1px dashed #CFCFCF' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: '#000' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> Gaps it caught
          </div>
          <ul className="space-y-2">
            {GAPS.map((item, i) => (
              <Stagger key={item} delay={240 + i * 140}>
                <li className="flex items-center gap-2 text-sm" style={{ color: '#333333' }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#000' }} />
                  {item}
                </li>
              </Stagger>
            ))}
          </ul>
        </div>
      </div>
      <Stagger delay={700}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#F4F4F4', color: '#000', borderColor: '#E0E0E0' }}>
            <Globe className="w-3 h-3" /> Draft reply · English · awaiting your approval
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#000', boxShadow: 'inset 0 -2px 0 0 #1A1A1A' }}>
            <Send className="w-3 h-3" /> Approve &amp; ask
          </span>
        </div>
      </Stagger>
    </div>
  );
}

const SUPPLIERS = ['Global Stainless · Guangdong', 'SZ Metal Works · Shenzhen', 'Ningbo Pacific Metal · Zhejiang'];

function RfqScene() {
  return (
    <div className="space-y-3">
      {SUPPLIERS.map((s, i) => (
        <Stagger key={s} delay={i * 160}>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#FAFAFA', border: '1px solid #ECECEC' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: i === 0 ? '#000' : '#8A8A8A' }}>
              {s[0]}
            </div>
            <div className="text-sm font-medium" style={{ color: '#0A0A0A' }}>{s}</div>
            <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: '#000' }}>
              <Check className="w-3.5 h-3.5" strokeWidth={3} /> Replied
            </span>
          </div>
        </Stagger>
      ))}
      <Stagger delay={620}>
        <div>
          <div className="flex justify-between text-[11px] font-semibold mb-1.5" style={{ color: '#9A9A9A' }}>
            <span>3 / 3 suppliers replied</span>
            <span style={{ color: '#000' }}>best landed <span className="font-bold">USD 4.00</span>/pc</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E8E8E8' }}>
            <div className="h-full rounded-full btk-anim-rise" style={{ background: '#000', width: '100%', transformOrigin: 'left', animationName: 'btk-trace', animationDuration: '1.2s' }} />
          </div>
        </div>
      </Stagger>
    </div>
  );
}

const QUOTE_LINES = [
  { qty: '10,000 pcs', label: '500ml Vacuum Bottle, Double-Wall 304', unit: 'USD 5.00 / pc', total: 'USD 50,000', src: 'SO-2091 · Global Stainless' },
  { qty: '10,000 pcs', label: 'Logo Printing (single-color laser)', unit: 'USD 0.35 / pc', total: 'USD 3,500', src: 'SO-2091' },
  { qty: '1 pc', label: 'Sample (air freight)', unit: 'USD 25.00', total: 'USD 25', src: 'Ctn 2026-03 · FX 7.82' },
];

const QUOTE_TOTAL = 'USD 53,525';

function QuoteScene() {
  const [sent, setSent] = useState(false);

  return (
    <div className="space-y-3">
      {QUOTE_LINES.map((line, i) => (
        <Stagger key={line.label} delay={i * 180}>
          <div className="rounded-xl px-4 py-3" style={{ background: '#FAFAFA', border: '1px solid #ECECEC' }}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="font-medium" style={{ color: '#0A0A0A' }}>
                <span className="text-xs font-semibold" style={{ color: '#9A9A9A' }}>{line.qty} · </span>
                {line.label}
              </span>
              <span className="shrink-0 font-bold tabular-nums" style={{ color: '#000' }}>{line.unit}</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]" style={{ color: '#9A9A9A' }}>
              <span className="flex items-center gap-1.5">
                <FileText className="w-3 h-3" style={{ color: '#000' }} /> {line.src}
              </span>
              <span className="font-semibold tabular-nums">{line.total}</span>
            </div>
          </div>
        </Stagger>
      ))}
      <Stagger delay={620}>
        <div className="rounded-xl px-4 py-3 flex items-center justify-between text-sm font-bold border" style={{ background: '#F4F4F4', color: '#000', borderColor: '#E0E0E0' }}>
          <span>Subtotal</span>
          <span className="tabular-nums">{QUOTE_TOTAL}</span>
        </div>
      </Stagger>
      <Stagger delay={700}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] leading-relaxed" style={{ color: '#555555' }}>
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
                ? { background: '#F4F4F4', color: '#000', boxShadow: 'inset 0 0 0 1px #000', border: 'none' }
                : { background: '#000', boxShadow: 'inset 0 -2px 0 0 #1A1A1A' }
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

  const scenes = [<InquiryScene key="i" />, <ClarifyScene key="c" />, <RfqScene key="r" />, <QuoteScene key="q" />];

  const hold = () => setInteracting(true);
  const release = () => setInteracting(false);
  const selectStage = (i: number) => {
    setStage(i);
    setPaused(true);
  };
  const autoplaying = !reduceMotion.current && !paused && !interacting;

  return (
    <div className="max-w-4xl mx-auto rounded-2xl border p-5 md:p-7 text-left btk-anim-rise" style={{ background: '#fff', borderColor: '#E5E5E5', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.85), 0 1px 2px rgba(0,0,0,0.05), 0 24px 60px -30px rgba(0,0,0,0.18)' }}>
      <div className="flex items-center gap-2 mb-5 select-none">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
        <span className="ml-3 text-xs font-semibold" style={{ color: '#0A0A0A' }}>Vectra</span>
        <span className="hidden sm:inline text-[11px]" style={{ color: '#9A9A9A' }}>· Pacific Trading inbox</span>
        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play demo' : 'Pause demo'}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors hover:bg-black/[0.04] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ color: '#000' }}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {paused || reduceMotion.current ? 'Play' : 'Pause'}
          </button>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6" onMouseEnter={hold} onMouseLeave={release} onTouchStart={hold} onTouchEnd={release}>
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
                color: active ? s.accent : '#9A9A9A',
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

      <div key={stage} className="min-h-[300px] md:min-h-[286px]" onMouseEnter={hold} onMouseLeave={release} onTouchStart={hold} onTouchEnd={release}>
        {scenes[stage]}
      </div>

      <div className="mt-6 pt-4 border-t" style={{ borderColor: '#EEEEEE' }}>
        <span className="text-xs" style={{ color: '#9A9A9A' }}>Every step is a draft you approve before it goes out.</span>
      </div>
    </div>
  );
}