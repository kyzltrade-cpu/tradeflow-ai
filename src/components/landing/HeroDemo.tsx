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
  BadgeCheck,
} from 'lucide-react';

const STAGES = [
  { key: 'inquiry', label: 'Inquiry', icon: Inbox },
  { key: 'clarify', label: 'Clarify', icon: MessageCircle },
  { key: 'rfq', label: 'RFQ', icon: Users },
  { key: 'quote', label: 'Quote', icon: Quote },
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
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#0A6E5C' }}>
            SC
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: '#111' }}>Sarah Chen</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>Pacific Trading · Shenzhen</div>
          </div>
          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#E6F4F0', color: '#0A6E5C' }}>
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </span>
          <span className="text-[11px] shrink-0" style={{ color: '#9CA3AF' }}>just now</span>
        </div>
      </Stagger>

      <Stagger delay={150}>
        <div className="rounded-xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed" style={{ background: '#F8FAFD', color: '#50617A', border: '1px solid #E5EDF5' }}>
          Hi, we need 10,000 pcs of 500ml stainless steel vacuum bottles for a corporate order. Please quote with
          logo printing and your best lead time. Preference for double-wall, 304 food grade. We also need a sample
          before mass production.
        </div>
      </Stagger>

      <Stagger delay={450}>
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl rounded-tr-sm" style={{ background: '#0A6E5C', color: '#fff' }}>
            <span className="flex gap-1">
              <span className="btk-think-dot" style={{ animationDelay: '0ms', background: '#fff' }} />
              <span className="btk-think-dot" style={{ animationDelay: '150ms', background: '#fff' }} />
              <span className="btk-think-dot" style={{ animationDelay: '300ms', background: '#fff' }} />
            </span>
            <span className="text-xs font-medium">Reading specs…<span className="btk-caret" style={{ background: '#fff' }} /></span>
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
        <div className="rounded-xl px-4 py-3.5" style={{ background: '#F8FAFD', border: '1px solid #E5EDF5' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#9CA3AF' }}>Extracted</div>
          <ul className="space-y-2">
            {EXTRACTED.map((item, i) => (
              <Stagger key={item} delay={i * 140}>
                <li className="flex items-center gap-2 text-sm" style={{ color: '#50617A' }}>
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#0A6E5C' }} strokeWidth={3} />
                  {item}
                </li>
              </Stagger>
            ))}
          </ul>
        </div>
        <div className="rounded-xl px-4 py-3.5" style={{ background: '#FFF9EC', border: '1px solid #F3E5C9' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: '#B45309' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> Gaps it caught
          </div>
          <ul className="space-y-2">
            {GAPS.map((item, i) => (
              <Stagger key={item} delay={240 + i * 140}>
                <li className="flex items-center gap-2 text-sm" style={{ color: '#92600E' }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#D97706' }} />
                  {item}
                </li>
              </Stagger>
            ))}
          </ul>
        </div>
      </div>
      <Stagger delay={700}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#E6F4F0', color: '#0A6E5C' }}>
            <Globe className="w-3 h-3" /> Draft answer in 繁體中文 · 待您批准
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}>
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
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#F8FAFD', border: '1px solid #E5EDF5' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: i === 0 ? '#0A6E5C' : '#7A8588' }}>
              {s[0]}
            </div>
            <div className="text-sm font-medium" style={{ color: '#111' }}>{s}</div>
            <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: '#0A6E5C' }}>
              <Check className="w-3.5 h-3.5" strokeWidth={3} /> Replied
            </span>
          </div>
        </Stagger>
      ))}
      <Stagger delay={620}>
        <div>
          <div className="flex justify-between text-[11px] font-semibold mb-1.5" style={{ color: '#9CA3AF' }}>
            <span>3 / 3 suppliers replied</span>
            <span style={{ color: '#0A6E5C' }}>best landed FOB <span className="font-bold">USD 4.10</span>/pc</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EEEBE6' }}>
            <div className="h-full rounded-full btk-anim-rise" style={{ background: '#0A6E5C', width: '100%', transformOrigin: 'left', animationName: 'btk-trace', animationDuration: '1.2s' }} />
          </div>
        </div>
      </Stagger>
    </div>
  );
}

const QUOTE_LINES = [
  { label: '500ml Vacuum Bottle, Double-Wall 304', price: 'USD 4.80 / pc', src: 'SO-2091 · Global Stainless' },
  { label: 'Logo Printing (single-color laser)', price: 'USD 0.35 / pc', src: 'SO-2091' },
  { label: 'Sample (air freight)', price: 'USD 25.00', src: 'Ctn 2026-03 · FX 7.82' },
];

function QuoteScene() {
  return (
    <div className="space-y-3">
      {QUOTE_LINES.map((line, i) => (
        <Stagger key={line.label} delay={i * 180}>
          <div className="rounded-xl px-4 py-3" style={{ background: '#F8FAFD', border: '1px solid #E5EDF5' }}>
            <div className="flex justify-between items-baseline gap-4 text-sm">
              <span className="font-medium" style={{ color: '#111' }}>{line.label}</span>
              <span className="font-bold shrink-0" style={{ color: '#0A6E5C' }}>{line.price}</span>
            </div>
            <div className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: '#9CA3AF' }}>
              <BadgeCheck className="w-3 h-3" style={{ color: '#0A6E5C' }} /> Source: {line.src}
            </div>
          </div>
        </Stagger>
      ))}
      <Stagger delay={620}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: '#0A6E5C' }}>
              <FileText className="w-3 h-3" /> Cited
            </span>
            {' '}· 32% target margin · validity 15 days
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg text-white animate-pulse" style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}>
            <Send className="w-3 h-3" /> Approve &amp; send to Sarah
          </span>
        </div>
      </Stagger>
    </div>
  );
}

export default function HeroDemo() {
  const [stage, setStage] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion.current) {
      setStage(STAGES.length - 1);
      return;
    }

    const id = setInterval(() => {
      if (document.hidden || interacting) return;
      setStage((s) => (s + 1) % STAGES.length);
    }, SCENE_DURATION);

    return () => clearInterval(id);
  }, [interacting]);

  const scenes = [<InquiryScene key="i" />, <ClarifyScene key="c" />, <RfqScene key="r" />, <QuoteScene key="q" />];
  const shown = reduceMotion.current ? STAGES.length - 1 : stage;

  const hold = () => setInteracting(true);
  const release = () => setInteracting(false);

  return (
    <div className="max-w-4xl mx-auto rounded-2xl border p-5 md:p-7 text-left btk-anim-rise" style={{ background: '#fff', borderColor: '#E8E5E1', boxShadow: '0 24px 60px -30px rgba(10,110,92,0.18)' }}>
      <div className="flex items-center gap-2 mb-5 select-none">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F1A7A0' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F2D68F' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#A9CEA8' }} />
        <span className="ml-3 text-xs font-semibold" style={{ color: '#111' }}>Backtide</span>
        <span className="hidden sm:inline text-[11px]" style={{ color: '#9CA3AF' }}>· Pacific Trading inbox</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#E6F4F0', color: '#0A6E5C' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0A6E5C' }} />
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6" onMouseEnter={hold} onMouseLeave={release} onTouchStart={hold} onTouchEnd={release}>
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const active = i === shown;
          return (
            <div
              key={s.key}
              className="flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all duration-300"
              style={{
                background: active ? '#E6F4F0' : 'transparent',
                color: active ? '#0A6E5C' : '#9CA3AF',
              }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          );
        })}
      </div>

      <div key={shown} className="min-h-[300px] md:min-h-[286px]" onMouseEnter={hold} onMouseLeave={release} onTouchStart={hold} onTouchEnd={release}>
        {scenes[shown]}
      </div>

      <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: '#EFEDE8' }}>
        <span className="text-xs" style={{ color: '#9CA3AF' }}>Every step is a draft you approve before it goes out.</span>
        <span className="text-xs font-semibold" style={{ color: '#0A6E5C' }}>Email · WhatsApp · 中文 · English</span>
      </div>
    </div>
  );
}