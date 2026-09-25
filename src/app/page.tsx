import Link from 'next/link';
import {
  Inbox,
  MessageSquare,
  ScanSearch,
  MessageCircleQuestion,
  Quote,
  Timer,
  ShieldCheck,
  Layers,
  Languages,
  LayoutDashboard,
  ArrowRight,
} from 'lucide-react';
import Reveal from '@/components/landing/Reveal';
import HeroDemo from '@/components/landing/HeroDemo';
import SiteHeader from '@/components/landing/SiteHeader';
import GlowCard from '@/components/landing/GlowCard';
import MouseGlow from '@/components/landing/MouseGlow';
import PricingPrice from '@/components/landing/PricingPrice';

/* ── The pipeline: the core loop the product runs ───────────────────────── */

const CORE_FEATURES = [
  {
    icon: Inbox,
    code: 'INBOX',
    span: 'lg:col-span-4',
    wide: true,
    title: 'Email-first inbox',
    desc: 'An inquiry lands in the mailbox you already use — Google or Microsoft — and Sailwise drives it through the whole pipeline from there.',
    detail: 'No new software for your team or customers to learn. Supports English, Chinese, and mixed-language threads.',
  },
  {
    icon: ScanSearch,
    code: 'SPECS',
    span: 'lg:col-span-2',
    title: 'Specs, extracted',
    desc: 'Every spec, quantity, and requirement is pulled out and pinned to where it came from — so nothing is guessed.',
    detail: 'Quantities, materials, certifications, lead times. Each extracted spec cites the line it came from.',
  },
  {
    icon: MessageCircleQuestion,
    code: 'GAPS',
    span: 'lg:col-span-2',
    title: 'Gaps get clarified',
    desc: 'AI flags what\u2019s missing and drafts a clarification question in the customer\u2019s language. You approve before it\u2019s sent.',
    detail: 'Never quote on assumptions — target price, Incoterm, and destination are caught before you commit.',
  },
  {
    icon: ShieldCheck,
    code: 'TRACE',
    span: 'lg:col-span-2',
    title: 'Every number traceable',
    desc: 'Each line cites where it came from — your products, your margin rules, the FX rate.',
    detail: 'A full paper trail for every spec, price, and approval. Nothing is guessed.',
  },
  {
    icon: Quote,
    code: 'QUOTE',
    span: 'lg:col-span-2',
    title: 'Quotes with a source',
    desc: 'Every number on your quote comes from your product price, your margin rule, and the FX rate — all traceable.',
    detail: 'No guesswork. Every line traces back to your product price, a margin rule, and the FX rate.',
  },
  {
    icon: Timer,
    code: 'FOLLOW-UP',
    span: 'lg:col-span-6',
    wide: true,
    title: 'Smart follow-ups',
    desc: 'Auto-scheduled follow-ups that stop the moment a customer replies. No embarrassing double-texts.',
    detail: 'AI drafts messages in the customer\u2019s language. Human approves before send.',
  },
];

/* ── The control layer: how you stay in charge ──────────────────────────── */

const CONTROL_FEATURES = [
  {
    icon: ShieldCheck,
    code: 'APPROVAL',
    title: 'Approve everything',
    desc: 'Every reply and every quote is a draft until you say go.',
  },
  {
    icon: Layers,
    code: 'KNOWLEDGE',
    title: 'Products & knowledge base',
    desc: 'Your products, margins, FAQ rules, and certifications power every draft.',
  },
  {
    icon: Languages,
    code: 'LANGUAGE',
    title: 'English · 中文 · Español',
    desc: 'Answers in the customer\u2019s language, including HK and mainland channels.',
  },
  {
    icon: LayoutDashboard,
    code: 'OVERVIEW',
    title: 'Live overview',
    desc: 'One live view of inquiries, pipeline, and where each deal stands.',
  },
];

/* ── How it works ───────────────────────────────────────────────────────── */

const STEPS = [
  { num: '01', code: 'INBOUND', channels: 'EMAIL', title: 'Inquiry comes in', desc: 'From your connected mailbox. Every spec, quantity, and requirement is pulled out and pinned to the line it came from.', gate: 'GATE 01 — APPROVE THE EXTRACTION' },
  { num: '02', code: 'CLARIFY', channels: 'CUSTOMER LANGUAGE', title: 'Gaps get clarified', desc: 'AI flags what\'s missing and drafts one question in the customer\'s language. You approve, we ask.', gate: 'GATE 02 — APPROVE THE QUESTION' },
  { num: '03', code: 'QUOTE', channels: 'PRICE · MARGIN · FX', title: 'Quote is drafted', desc: 'Quote drafted from your product prices, margin rules, and the FX rate — every number traced. You approve, one click sends.', gate: 'GATE 03 — YOUR SIGN-OFF' },
];

/* ── Ops marquee tokens ─────────────────────────────────────────────────── */

const OPS_TOKENS = [
  'HKG', 'SZX', 'CNSGH', 'NINGBO', 'FOB', 'CIF', 'EXW',
  '40HQ', 'MOQ 10K', 'SUS 304', 'FX 7.82', '+14%', 'LC · TT', '30 DAYS', 'SEA · AIR',
];

/* ── Pricing ────────────────────────────────────────────────────────────── */

const PLANS = [
  {
    name: 'Starter SDR',
    price: 'HK$1,880',
    period: '/mo',
    features: [
      'Email inbox (Google / Microsoft)',
      '1,000 AI conversations a month',
      'Unlimited products & FAQ rules',
      'English, Mandarin, Cantonese, Spanish',
      'Human override & takeover anytime',
      'Knowledge base & website sync',
      'Custom AI personality',
    ],
    cta: 'Start Free Trial',
    accent: true,
    available: true,
  },
];

/* ── FAQ ────────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: 'Does it work with the email I already use?',
    a: 'Yes. Sailwise works over your existing mailbox with a one-click Google or Microsoft connection. There is no new software for your team or your customers to learn.',
  },
  {
    q: 'Can I use a personal Gmail or Hotmail?',
    a: 'Yes — personal accounts work exactly like business mailboxes. Many of our customers run their entire trading business from a personal email address.',
  },
  {
    q: 'Can it handle Chinese and mixed-language emails?',
    a: 'Sailwise extracts specs from English, Simplified Chinese, Traditional Chinese, and mixed-language threads — common in HK and SZ trade.',
  },
  {
    q: 'What happens when a spec is missing?',
    a: 'AI flags the gap and drafts a clarification question in the customer\'s language, so you never quote on assumptions.',
  },
  {
    q: 'Who controls the final quote?',
    a: 'You do. Every quote is a draft until you approve it. AI cites where each number came from — product price, margin rule, FX rate — so you can verify fast.',
  },
  {
    q: 'Why not just use ChatGPT or a generic AI add-on?',
    a: 'Sailwise is a pipeline, not a chat window. It ties each step to your data — your products, margins, and FX rates — and keeps a human approving every outbound message. A generic chatbot can write a reply; it can\'t extract specs with citations, respect your margin rules, or draft a quote you can trace through your own pricing.',
  },
  {
    q: 'Do I need to be technical to set it up?',
    a: 'No. Self-serve setup is guided: connect your Google or Microsoft mailbox, upload your products, and approve your first draft. There\'s also an optional done-for-you setup for HK$1,000 one-time where our team does all of it for you.',
  },
  {
    q: 'Is my product and pricing data safe?',
    a: 'Your knowledge base is private to your company. Data is stored encrypted, access is per-user, and it is never used to train models shared with other customers.',
  },
  {
    q: 'Is there a setup fee?',
    a: 'You can start free on your own. There\'s also an optional done-for-you setup for HK$1,000 one-time — our team connects your mailbox, uploads your products, and configures the AI for you.',
  },
  {
    q: 'How does the WhatsApp alert feature work?',
    a: 'Connect your WhatsApp account to Sailwise. When an important email lands, you get an instant alert. You can review the extracted specs and draft a reply directly on WhatsApp. The bot sends it as a proper email from your mailbox — no need to jump between apps.',
  },
  {
    q: 'What makes an email "important"?',
    a: 'Sailwise learns what matters to your business. High-value customers, certain keywords, and new inquiries get flagged. You can customize the rules in your knowledge base to mark repeat customers or specific product categories as high-priority.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Plans are month-to-month with no contracts. Cancel anytime and keep access through the end of your billing period.',
  },
];

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF', color: '#0A0A0A' }}>
      <MouseGlow />
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="pt-28 pb-14 px-6 relative overflow-hidden">
        {/* Hero background banner — top band only, anchored left, not behind the demo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[540px] md:h-[600px]"
          style={{
            backgroundImage: 'url(/hero/hero-banner.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'right 62% bottom 75%',
          }}
        />
        {/* Light wash for headline legibility; fades to white before the demo dashboard */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[540px] md:h-[600px]"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.85) 100%)',
          }}
        />
        <div aria-hidden="true" className="btk-breathe pointer-events-none absolute top-0 left-1/2 w-[940px] h-[640px]" style={{ marginLeft: -470, background: 'radial-gradient(50% 50% at 50% 28%, rgba(0,0,0,0.045), rgba(0,0,0,0) 70%)' }} />
        <div className="max-w-5xl mx-auto sm:ml-6 md:sm:ml-10 relative">
          <div className="sm:max-w-2xl text-center sm:text-left">
            <div className="btk-anim-fade-down inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border" style={{ background: 'rgba(255,255,255,0.85)', color: '#000', borderColor: '#E0E0E0', animationDelay: '0ms', backdropFilter: 'blur(6px)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#000' }}></span>
              Built for HK &amp; SZ trading companies
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.02em' }}>
              <span className="btk-anim-rise block" style={{ animationDelay: '90ms' }}>
                From inquiry to quote.
              </span>
              <span className="relative inline-block btk-anim-rise" style={{ color: '#000', animationDelay: '210ms' }}>
                End to end.
                <span className="absolute left-0 -bottom-1 h-[3px] w-full rounded-full" style={{ background: '#000', opacity: 0.35, animation: 'btk-trace 0.9s cubic-bezier(0.16,1,0.3,1) 0.55s backwards' }} />
              </span>
            </h1>

            <p className="btk-anim-rise text-lg md:text-xl max-w-2xl mx-auto sm:mx-0 mb-10 leading-relaxed" style={{ color: '#4A4A4A', animationDelay: '330ms', textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}>
              Sailwise is the AI copilot for trading companies. It takes a customer inquiry, extracts every spec, checks for gaps, drafts a cited price from your products and margins, and follows up until the deal closes — in hours, not days.
            </p>

            <div className="btk-anim-rise flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 mb-10" style={{ animationDelay: '450ms' }}>
              <Link href="/signup" className="group btn-primary w-full sm:w-auto px-8 py-3.5">
                Start Free Trial
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="#see-it-in-action" className="btn-ghost w-full sm:w-auto px-8 py-3.5">
                See a Live Demo
              </Link>
            </div>
          </div>

          <div className="relative">
            <div aria-hidden="true" className="btk-breathe pointer-events-none absolute -inset-x-8 -inset-y-12 rounded-[40px]" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.015) 40%, transparent 75%)', filter: 'blur(28px)' }} />
            <div className="btk-anim-rise relative" style={{ animationDelay: '560ms' }}>
              <GlowCard className="rounded-2xl">
                <HeroDemo />
              </GlowCard>
            </div>
          </div>

          <div className="mt-14 overflow-hidden" aria-hidden="true" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)' }}>
            <div className="btk-marquee flex w-max gap-6 text-[11px] font-semibold uppercase whitespace-nowrap" style={{ color: '#9A9A9A' }}>
              {[0, 1].map((n) => (
                <div key={n} className="flex shrink-0 items-center gap-6 pr-6">
                  {OPS_TOKENS.map((tok, i) => (
                    <span key={`${n}-${i}`} className="flex items-center gap-6">
                      <span className="w-1 h-1 rounded-full" style={{ background: '#C9C9C9' }}></span>
                      {tok}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features: the pipeline ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="relative text-center mb-16">
            <div aria-hidden="true" className="pointer-events-none select-none absolute inset-x-0 -top-4 flex items-center justify-center" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: 'rgba(0,0,0,0.045)', fontSize: 'clamp(6rem, 14vw, 11rem)', lineHeight: 1, zIndex: -1 }}>
              01
            </div>
            <p className="btk-kicker mb-5">01 · The pipeline</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#555555' }}>
              Built for the way traders actually work — citation-backed, human-approved.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6">
            {CORE_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={(i % 3) * 90} className={f.span}>
                  <GlowCard
                    className={`group relative h-full p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-black/25 hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.22)] ${f.wide ? 'md:flex md:items-center lg:gap-10' : ''}`}
                    style={{ background: '#fff', borderColor: '#E5E5E5', boxShadow: 'var(--shadow-card)' }}
                  >
                    <span aria-hidden="true" className="btk-mono absolute top-6 right-6 text-[9px]" style={{ color: '#9A9A9A' }}>{f.code}</span>
                    <div className={f.wide ? 'md:w-1/2 lg:w-3/5 pr-0' : ''}>
                      <div className="flex items-center gap-3.5 mb-4">
                        <span className="w-11 h-11 rounded-xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-105" style={{ background: '#F4F4F4', color: '#000', borderColor: '#E5E5E5' }}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <h3 className="text-lg font-bold">{f.title}</h3>
                      </div>
                      <p className="text-sm leading-relaxed mb-4" style={{ color: '#555555' }}>{f.desc}</p>
                      <p className="text-xs leading-relaxed px-4 py-3 rounded-lg border" style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)', borderColor: 'var(--panel-border)' }}>{f.detail}</p>
                    </div>
                  </GlowCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── You stay in control ── */}
      <section className="py-24 px-6" style={{ background: '#FAFAFA' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="relative text-center mb-14">
            <div aria-hidden="true" className="pointer-events-none select-none absolute inset-x-0 -top-4 flex items-center justify-center" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: 'rgba(0,0,0,0.045)', fontSize: 'clamp(6rem, 14vw, 11rem)', lineHeight: 1, zIndex: -1 }}>
              02
            </div>
            <p className="btk-kicker mb-5">02 · Built-in control</p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              AI does the legwork. You stay in control.
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#555555' }}>
              Every message is a draft until you approve it — your margins, your voice, your relationships.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-4 gap-6">
            {CONTROL_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 90}>
                  <GlowCard className="h-full rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1 hover:border-black/25 hover:shadow-[0_16px_32px_-24px_rgba(0,0,0,0.25)]" style={{ background: '#fff', borderColor: '#E5E5E5' }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: '#F4F4F4', color: '#000', borderColor: '#E5E5E5' }}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="btk-mono text-[9px]" style={{ color: '#9A9A9A' }}>{f.code}</span>
                    </div>
                    <h3 className="text-base font-bold mb-1.5">{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#555555' }}>{f.desc}</p>
                  </GlowCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WhatsApp Mobile Alerts ── */}
      <section className="py-24 px-6" style={{ background: '#FAFAFA' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="relative text-center mb-16">
            <div aria-hidden="true" className="pointer-events-none select-none absolute inset-x-0 -top-4 flex items-center justify-center" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: 'rgba(0,0,0,0.045)', fontSize: 'clamp(6rem, 14vw, 11rem)', lineHeight: 1, zIndex: -1 }}>
              02
            </div>
            <p className="btk-kicker mb-5">02 · Mobile-first alerts</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Get alerts where you are
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#555555' }}>
              Important emails land as WhatsApp alerts. Review specs, draft replies, and send them as emails — all from your phone.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Reveal delay={120}>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#000' }}>
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Instant notifications</h3>
                    <p style={{ color: '#555555', fontSize: '0.95rem' }}>Important inquiries trigger WhatsApp alerts in real-time. Never miss a deal while you&apos;re away from your desk.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#000' }}>
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Review on mobile</h3>
                    <p style={{ color: '#555555', fontSize: '0.95rem' }}>See extracted specs, quantities, and requirements right in WhatsApp. No jumping between apps or logging into dashboards.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#000' }}>
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Draft replies on WhatsApp</h3>
                    <p style={{ color: '#555555', fontSize: '0.95rem' }}>Respond with clarification questions or initial quotes. The bot formats and sends them as professional emails from your mailbox.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#000' }}>
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Smart filtering</h3>
                    <p style={{ color: '#555555', fontSize: '0.95rem' }}>Only "important" emails trigger alerts. Your system learns what matters — VIP customers, high-value inquiries, new leads.</p>
                  </div>
                </div>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal className="relative text-center mb-16">
            <div aria-hidden="true" className="pointer-events-none select-none absolute inset-x-0 -top-4 flex items-center justify-center" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: 'rgba(0,0,0,0.045)', fontSize: 'clamp(6rem, 14vw, 11rem)', lineHeight: 1, zIndex: -1 }}>
              03
            </div>
            <p className="btk-kicker mb-5">03 · The workflow</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              From inquiry to quote in 4 steps
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#555555' }}>
              The whole sourcing pipeline, with you approving every message.
            </p>
          </Reveal>
          <div className="relative">
            <div aria-hidden="true" className="absolute left-[17px] top-3 bottom-3 w-px" style={{ background: '#E5E5E5' }} />
            <div className="space-y-12">
              {STEPS.map((s, i) => (
                <Reveal key={s.num} delay={i * 90}>
                  <div className={`relative flex gap-6 ${i < STEPS.length - 1 ? '' : ''}`}>
                    <div
                      className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold"
                      style={{
                        background: i === STEPS.length - 1 ? '#000' : '#fff',
                        color: i === STEPS.length - 1 ? '#fff' : '#000',
                        borderColor: '#000',
                      }}
                    >
                      {s.num}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
                        <span className="btk-mono text-[10px]" style={{ color: '#000' }}>{s.code}</span>
                        <span className="btk-mono text-[10px]" style={{ color: '#9A9A9A' }}>{s.channels}</span>
                      </div>
                      <h3 className="text-lg font-bold mb-1.5">{s.title}</h3>
                      <p className="text-sm max-w-2xl leading-relaxed" style={{ color: '#555555' }}>{s.desc}</p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[10px] font-semibold" style={{ border: '1px solid #E0E0E0', background: '#FAFAFA', color: '#555555' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: i === STEPS.length - 1 ? '#000' : '#B5B5B5' }} />
                        {s.gate}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── See It In Action ── */}
      <section id="see-it-in-action" className="py-24 px-6" style={{ background: '#FAFAFA' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="relative text-center mb-16">
            <div aria-hidden="true" className="pointer-events-none select-none absolute inset-x-0 -top-4 flex items-center justify-center" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: 'rgba(0,0,0,0.045)', fontSize: 'clamp(6rem, 14vw, 11rem)', lineHeight: 1, zIndex: -1 }}>
              04
            </div>
            <p className="btk-kicker mb-5">04 · Product demo</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              See it in action
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#555555' }}>
              A real inquiry, minutes later. Here&apos;s the whole flow.
            </p>
          </Reveal>

          <div className="space-y-6">
            <Reveal>
            <GlowCard className="p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-black/25" style={{ background: '#fff', borderColor: '#E5E5E5' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#000' }}>1</div>
                <div>
                  <div className="text-sm font-semibold">The inquiry arrives</div>
                  <div className="text-xs" style={{ color: '#8A8A8A' }}>The inquiry lands in your inbox</div>
                </div>
                <span className="btk-mono ml-auto text-[10px]" style={{ color: '#9A9A9A' }}>T+00:00</span>
              </div>
              <div className="px-5 py-4 rounded-xl text-sm leading-relaxed" style={{ background: '#FAFAFA', color: '#555555', border: '1px solid #ECECEC' }}>
                <div className="btk-mono text-[10px] mb-2" style={{ color: '#8A8A8A' }}>FROM: SARAH CHEN</div>
                Hi, we need 10,000 pcs of 500ml stainless steel vacuum bottles for a corporate order. Please quote with logo printing and your best lead time. Preference for double-wall, 304 food grade. We also need a sample before mass production. Thank you!
              </div>
            </GlowCard>
            </Reveal>

            <Reveal delay={120}>
            <GlowCard className="p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-black/25" style={{ background: '#fff', borderColor: '#E5E5E5' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#000' }}>2</div>
                <div>
                  <div className="text-sm font-semibold">AI extracts every spec</div>
                  <div className="text-xs" style={{ color: '#8A8A8A' }}>It pulls specs, detects the gaps, and asks only what&apos;s missing</div>
                </div>
                <span className="btk-mono ml-auto text-[10px]" style={{ color: '#9A9A9A' }}>T+02:10</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="px-5 py-4 rounded-xl text-sm" style={{ background: '#FAFAFA', border: '1px solid #ECECEC' }}>
                  <div className="btk-mono text-[10px] mb-3" style={{ color: '#8A8A8A' }}>Extracted</div>
                  <ul className="space-y-2 text-sm" style={{ color: '#333333' }}>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000' }}></span>10,000 pcs</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000' }}></span>500ml, double-wall, 304</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000' }}></span>Logo printing requested</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000' }}></span>Sample required pre-order</li>
                  </ul>
                </div>
                <div className="px-5 py-4 rounded-xl text-sm" style={{ background: '#FCFCFC', border: '1px dashed #D5D5D5' }}>
                  <div className="btk-mono text-[10px] mb-3" style={{ color: '#8A8A8A' }}>Gaps it flagged</div>
                  <ul className="space-y-2 text-sm" style={{ color: '#333333' }}>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000' }}></span>Target price or budget?</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000' }}></span>Incoterm (FOB / CIF / EXW)?</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000' }}></span>Delivery destination &amp; date?</li>
                  </ul>
                </div>
              </div>
            </GlowCard>
            </Reveal>

            <Reveal delay={240}>
            <GlowCard className="p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-black/25" style={{ background: '#fff', borderColor: '#E5E5E5' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#000' }}>3</div>
                <div>
                  <div className="text-sm font-semibold">A quote you can trace</div>
                  <div className="text-xs" style={{ color: '#8A8A8A' }}>Every number traces back to your product price, a margin rule, or the FX rate</div>
                </div>
                <span className="btk-mono ml-auto text-[10px]" style={{ color: '#9A9A9A' }}>T+09:25</span>
              </div>
              <div className="px-5 py-4 rounded-xl text-sm" style={{ background: '#FAFAFA', border: '1px solid #ECECEC' }}>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="font-semibold" style={{ color: '#0A0A0A' }}>
                    <span className="btk-mono text-[10px] mr-1" style={{ color: '#8A8A8A' }}>10,000 PCS</span>
                    500ml Vacuum Bottle, Double-Wall 304
                  </span>
                  <span className="font-bold shrink-0 ml-3" style={{ color: '#000' }}>USD 5.00 / pc</span>
                </div>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="font-semibold" style={{ color: '#0A0A0A' }}>
                    <span className="btk-mono text-[10px] mr-1" style={{ color: '#8A8A8A' }}>10,000 PCS</span>
                    Logo Printing (single-color laser)
                  </span>
                  <span className="font-bold shrink-0 ml-3" style={{ color: '#000' }}>USD 0.35 / pc</span>
                </div>
                <div className="flex justify-between items-baseline mb-4">
                  <span className="font-semibold" style={{ color: '#0A0A0A' }}>
                    <span className="btk-mono text-[10px] mr-1" style={{ color: '#8A8A8A' }}>1 PC</span>
                    Sample (air freight)
                  </span>
                  <span className="font-bold shrink-0 ml-3" style={{ color: '#000' }}>USD 25.00</span>
                </div>
                <div className="flex justify-between items-baseline py-3 border-t text-sm font-bold" style={{ borderColor: '#ECECEC', color: '#000' }}>
                  <span>Subtotal</span>
                  <span>USD 53,525</span>
                </div>
                <div className="py-3 border-t text-xs" style={{ borderColor: '#ECECEC', color: '#555555' }}>
                  <span className="font-semibold" style={{ color: '#000' }}>Sources: </span>
                  Product price list · 20% margin rule (4.00 → 5.00) · FX 7.82 · Holds for 15 days
                </div>
              </div>
              <p className="text-sm mt-4" style={{ color: '#555555' }}>
                You review, adjust, approve. The quote goes out in your voice, with your margins intact.
              </p>
            </GlowCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden">
        <div aria-hidden="true" className="btk-breathe pointer-events-none absolute -top-48 left-1/2 w-[820px] h-[460px] rounded-full" style={{ marginLeft: -410, background: 'radial-gradient(closest-side, rgba(0,0,0,0.06), rgba(0,0,0,0) 70%)' }} />
        <div className="max-w-4xl mx-auto text-center relative">
          <Reveal className="relative text-center">
            <div aria-hidden="true" className="pointer-events-none select-none absolute inset-x-0 -top-4 flex items-center justify-center" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: 'rgba(0,0,0,0.045)', fontSize: 'clamp(6rem, 14vw, 11rem)', lineHeight: 1, zIndex: -1 }}>
              05
            </div>
            <p className="btk-kicker mb-5">05 · Pricing</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Simple, transparent pricing
            </h2>
            <p className="text-lg mb-16" style={{ color: '#555555' }}>
              14-day free trial, then HK$1,880/month. Cancel anytime.
            </p>
          </Reveal>
          <Reveal className="max-w-[440px] mx-auto">
            <div
              className="relative flex h-full flex-col p-8 rounded-2xl text-left transition-all duration-300 md:hover:-translate-y-2 btk-card-hover"
              style={{
                background: '#fff',
                border: '1.5px solid #000',
              }}
            >
              <div>
                <div className="text-lg font-semibold tracking-tight" style={{ color: '#0A0A0A' }}>{PLANS[0].name}</div>
                <span className="btk-mono text-[10px] font-semibold px-2.5 py-1 rounded-full border inline-block mt-2" style={{ color: '#8A8A8A', borderColor: '#E0E0E0' }}>one plan · everything included</span>
              </div>
              <PricingPrice monthly={PLANS[0].price} annual="HK$1,504" period={PLANS[0].period} />
              <div className="h-px bg-black/10 mb-4" />
              <p className="btk-mono text-[10px] mb-4 text-left" style={{ color: '#8A8A8A' }}>
                What&apos;s included
              </p>
              <ul className="space-y-3 mb-2 flex-1">
                {PLANS[0].features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: '#333333' }}>
                    <span className="w-5 h-5 mt-px rounded-full flex items-center justify-center shrink-0" style={{ background: '#0A0A0A', color: '#fff' }}>
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="pt-5 border-t border-black/10">
                <Link href="/signup" className="group/cta btn-primary w-full py-3.5">
                  Start Free Trial
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-0.5" />
                </Link>
                <p className="text-center mt-3 text-[11px]" style={{ color: '#8A8A8A' }}>
                  No credit card required · 14-day free trial · Cancel anytime
                </p>
              </div>
            </div>
          </Reveal>
          <p className="text-xs mt-10" style={{ color: '#555555' }}>
            14-day free trial · Card required · 50 AI responses included · Cancel anytime.
          </p>
          <p className="text-xs mt-4 max-w-xl mx-auto" style={{ color: '#555555' }}>
            Prefer a white-glove start? For <span className="font-semibold" style={{ color: '#0A0A0A' }}>HK$1,288</span> one-time we connect your mailbox, upload your products, and configure the AI for you. Annual billing drops the price to HK$1,504/month —{' '}
            <Link href="/pricing" className="font-medium underline underline-offset-2" style={{ color: '#000' }}>see pricing</Link>.
          </p>
          <p className="text-xs mt-3" style={{ color: '#8A8A8A' }}>
            Need a bigger team, more AI conversations, or custom workflows? We do custom plans —{' '}
            <a href="mailto:tradeflow.hk@gmail.com" className="font-medium underline underline-offset-2" style={{ color: '#000' }}>
              tradeflow.hk@gmail.com
            </a>
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6" style={{ background: '#FAFAFA' }}>
        <div className="max-w-3xl mx-auto">
          <Reveal className="relative text-center mb-16">
            <div aria-hidden="true" className="pointer-events-none select-none absolute inset-x-0 -top-4 flex items-center justify-center" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: 'rgba(0,0,0,0.045)', fontSize: 'clamp(6rem, 14vw, 11rem)', lineHeight: 1, zIndex: -1 }}>
              06
            </div>
            <p className="btk-kicker mb-5">06 · FAQ</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Questions, answered
            </h2>
            <p className="text-lg" style={{ color: '#555555' }}>
              Everything traders ask us before starting.
            </p>
          </Reveal>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <Reveal key={faq.q} delay={Math.min(i, 6) * 60}>
              <details key={faq.q} className="group rounded-2xl border transition-colors duration-300 hover:border-black/25" style={{ background: '#fff', borderColor: '#E5E5E5' }}>
                <summary className="flex items-center justify-between gap-4 px-8 py-5 text-base font-medium cursor-pointer select-none list-none" style={{ color: '#0A0A0A' }}>
                  {faq.q}
                  <svg className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" style={{ color: '#8A8A8A' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <div className="px-8 pb-6 -mt-1 text-sm leading-relaxed" style={{ color: '#555555' }}>
                  {faq.a}
                </div>
              </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div aria-hidden="true" className="btk-drift pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center select-none whitespace-nowrap font-bold leading-none" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#F4F4F4', fontSize: 'clamp(6rem, 22vw, 16rem)' }}>
          Sailwise
        </div>
        <Reveal className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Stop copy-pasting quotes.<br />
            <span style={{ color: '#000' }}>Start closing deals.</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: '#555555' }}>
            Sailwise helps trading companies in HK, Shenzhen, and beyond quote faster and win more deals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="group btn-primary w-full sm:w-auto px-8 py-4">
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="btn-ghost w-full sm:w-auto px-8 py-4">
              Book a Demo
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="py-14 px-6 border-t" style={{ borderColor: '#E5E5E5' }}>
        <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <img src="/brand/sailwise-mark.png" alt="Sailwise" className="h-8 w-8 rounded object-cover" />
              <span className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>Sailwise</span>
            </div>
            <p className="text-sm max-w-[280px]" style={{ color: '#555555' }}>
              The AI copilot for HK and Shenzhen trading companies — inquiry to quote, end to end.
            </p>
            <p className="text-xs mt-6" style={{ color: '#9A9A9A' }}>© 2026 Sailwise. All rights reserved.</p>
          </div>
          <div>
            <div className="btk-mono text-[10px] mb-4" style={{ color: '#8A8A8A' }}>Product</div>
            <ul className="space-y-2.5 text-sm" style={{ color: '#555555' }}>
              <li><a href="#features" className="hover:text-black transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-black transition-colors">How It Works</a></li>
              <li><a href="#see-it-in-action" className="hover:text-black transition-colors">Live Demo</a></li>
              <li><Link href="/pricing" className="hover:text-black transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <div className="btk-mono text-[10px] mb-4" style={{ color: '#8A8A8A' }}>Company</div>
            <ul className="space-y-2.5 text-sm" style={{ color: '#555555' }}>
              <li><Link href="/login" className="hover:text-black transition-colors">Log in</Link></li>
              <li><Link href="/signup" className="hover:text-black transition-colors">Start Free</Link></li>
              <li><a href="/privacy" className="hover:text-black transition-colors">Privacy</a></li>
              <li><a href="mailto:tradeflow.hk@gmail.com" className="hover:text-black transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}