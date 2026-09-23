import Link from 'next/link';
import { MessageCircle, Quote, Timer, Bot, ArrowRight, Languages } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';
import HeroDemo from '@/components/landing/HeroDemo';

/* ── Data ───────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Bot,
    title: 'Company Brain',
    desc: 'AI learns your products, suppliers, margins, and certifications. Every quote it builds gets smarter.',
    detail: 'Upload specs, pricing sheets, and supplier docs. Backtide builds a knowledge graph that powers every future quote.',
  },
  {
    icon: MessageCircle,
    title: 'Email + WhatsApp Inbox',
    desc: 'Works over email and WhatsApp — the channels you already use. An inquiry lands in your inbox, and Backtide drives it through the whole sourcing pipeline.',
    detail: 'Works with the email and WhatsApp you already use. No new software for your team, customers, or suppliers to learn. Supports English, Chinese, and mixed-language threads.',
  },
  {
    icon: Quote,
    title: 'Quotes with a source',
    desc: 'Every number on your quote comes from a supplier price, your margin rule, and the FX rate — all traceable.',
    detail: 'No guesswork. Every line traces back to a supplier price, your margin rule, and the FX rate.',
  },
  {
    icon: Timer,
    title: 'Smart Follow-ups',
    desc: 'Auto-scheduled follow-ups that stop the moment a customer replies. No embarrassing double-texts.',
    detail: 'AI drafts messages in the customer\'s language. Human approves before send.',
  },
];

const STEPS = [
  { num: '01', title: 'Inquiry comes in', desc: 'From email or WhatsApp. Every spec, quantity, and requirement is extracted with source citations.' },
  { num: '02', title: 'Gaps get clarified', desc: 'AI flags missing details and drafts a clarification question in the customer\'s language. You approve, we ask.' },
  { num: '03', title: 'Suppliers get RFQed', desc: 'A batch RFQ goes to your shortlisted suppliers on their preferred channel. You approve every send.' },
  { num: '04', title: 'Quote is drafted', desc: 'Responses are compared, landed cost is calculated, and a quote is drafted. You approve, one click to send.' },
];

const PLANS = [
  {
    name: 'Starter SDR',
    price: 'HK$880',
    period: '/mo',
    features: [
      '1 WhatsApp number & email inbox',
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

const FAQS = [
  {
    q: 'Does it work with the email I already use?',
    a: 'Yes. Backtide works over your existing mailbox — an inquiry can arrive from a customer or be added in one click. There is no new software for your team, your customers, or your suppliers to learn.',
  },
  {
    q: 'Does it work with WhatsApp?',
    a: 'Yes. Backtide works over email and WhatsApp, depending on what the customer or supplier prefers. Specs are extracted the same way, and replies route back through the channel you choose — ideal for Shenzhen and mainland suppliers who live on WeChat and WhatsApp.',
  },
  {
    q: 'Can it handle Chinese and mixed-language emails?',
    a: 'Backtide extracts specs from English, Simplified Chinese, Traditional Chinese, and mixed-language threads — common in HK and SZ trade.',
  },
  {
    q: 'What happens when a spec is missing?',
    a: 'AI flags the gap and drafts a clarification question in the customer\'s language, so you never quote on assumptions.',
  },
  {
    q: 'Who controls the final quote?',
    a: 'You do. Every quote is a draft until you approve it. AI cites where each number came from — supplier price, margin rule, FX rate — so you can verify fast.',
  },
  {
    q: 'Is my supplier and pricing data safe?',
    a: 'Your knowledge base is private to your company. Data is stored encrypted, access is per-user, and it is never used to train models shared with other customers.',
  },
  {
    q: 'Is there a setup fee?',
    a: 'You can start free on your own. There\'s also an optional done-for-you setup for HK$1,288 one-time — our team connects WhatsApp, uploads your products, and configures the AI for you.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Plans are month-to-month with no contracts. Cancel anytime and keep access through the end of your billing period.',
  },
];

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FAF9F6', color: '#111' }}>
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b" style={{ background: 'rgba(250,249,246,0.85)', borderColor: '#E8E5E1' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="justify-self-start text-base font-semibold tracking-tight" style={{ color: '#111' }}>Backtide</div>
          <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium" style={{ color: '#626260' }}>
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-black transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
          </div>
          <div className="justify-self-end flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ color: '#626260' }}>
              Log in
            </Link>
            <Link href="/signup" className="text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-all" style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}>
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border" style={{ background: '#E6F4F0', color: '#0A6E5C', borderColor: '#B8DDD3' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0A6E5C' }}></span>
            Built for HK &amp; SZ trading companies
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            From inquiry to quote.<br />
            <span className="relative inline-block" style={{ color: '#0A6E5C' }}>
              End to end.
              <span className="absolute left-0 -bottom-1 h-[3px] w-full rounded-full btk-anim-rise" style={{ background: '#0A6E5C', opacity: 0.35 }} />
            </span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: '#626260' }}>
            Backtide is the AI copilot for trading companies. It takes a customer inquiry, extracts every spec, checks for gaps, RFQs your suppliers, compares their responses with cited landed costs, and drafts a ready-to-send quote — in hours, not days.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/signup" className="group w-full sm:w-auto px-8 py-3.5 rounded-lg text-sm font-medium text-white transition-all hover:-translate-y-0.5 active:translate-y-px active:scale-[0.99] inline-flex items-center justify-center gap-2" style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}>
              Start Free Trial
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="#see-it-in-action" className="w-full sm:w-auto px-8 py-3.5 rounded-lg text-sm font-medium border transition-all hover:bg-black/[0.03] hover:-translate-y-0.5 active:translate-y-px" style={{ borderColor: '#D9D7CB', color: '#374151' }}>
              See a Live Demo
            </Link>
          </div>

          <HeroDemo />

          <div className="mt-14 overflow-hidden" aria-hidden="true">
            <div className="flex gap-3 text-xs font-semibold uppercase tracking-[0.2em] whitespace-nowrap btk-marquee" style={{ color: '#B0ADA8' }}>
              {[0, 1].map((n) => (
                <div key={n} className="flex shrink-0 items-center gap-3 pr-3">
                  {['English', '简体中文', '繁體中文', 'Español', 'English', '简体中文', '繁體中文', 'Español', 'English', '简体中文', '繁體中文', 'Español'].map((lang, i) => (
                    <span key={`${n}-${i}`} className="flex items-center gap-2">
                      <Languages className="w-3.5 h-3.5" style={{ color: '#0A6E5C' }} />
                      {lang}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#626260' }}>
              Built for the way traders actually work — citation-backed, human-approved.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 90}>
                  <div className="group h-full p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-teal-600/30" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
                    <div className="flex items-center gap-3.5 mb-4">
                      <span className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-300" style={{ background: '#E6F4F0', color: '#0A6E5C' }}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <h3 className="text-xl font-bold">{f.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: '#626260' }}>{f.desc}</p>
                    <p className="text-xs leading-relaxed px-4 py-3 rounded-lg border" style={{ background: '#F8FAFD', color: '#50617A', borderColor: '#E5EDF5' }}>{f.detail}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: '#F8FAFD' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              From inquiry to quote in 4 steps
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#626260' }}>
              The whole sourcing pipeline, with you approving every message.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 110}>
                <div className="group text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white mx-auto mb-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105" style={{ background: '#0A6E5C', boxShadow: 'inset 0 -3px 0 0 #085a4a' }}>
                    {s.num}
                  </div>
                  <h3 className="text-base font-bold mb-2">{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#626260' }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── See It In Action ── */}
      <section id="see-it-in-action" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              See it in action
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#626260' }}>
              A real RFQ, 10 minutes later. Here&apos;s the whole flow.
            </p>
          </Reveal>

          <div className="space-y-6">
            <Reveal>
            <div className="p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-teal-600/30" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#0A6E5C' }}>1</div>
                <div>
                  <div className="text-sm font-semibold">The RFQ arrives</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>The inquiry lands in your shared inbox</div>
                </div>
              </div>
              <div className="px-5 py-4 rounded-xl text-sm leading-relaxed" style={{ background: '#F8FAFD', color: '#50617A', border: '1px solid #E5EDF5' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>From: Sarah Chen</div>
                Hi, we need 10,000 pcs of 500ml stainless steel vacuum bottles for a corporate order. Please quote with logo printing and your best lead time. Preference for double-wall, 304 food grade. We also need a sample before mass production. Thank you!
              </div>
            </div>
            </Reveal>

            <Reveal delay={120}>
            <div className="p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-teal-600/30" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#0A6E5C' }}>2</div>
                <div>
                  <div className="text-sm font-semibold">AI extracts every spec</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>It pulls specs, detects the gaps, and asks only what&apos;s missing</div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="px-5 py-4 rounded-xl text-sm" style={{ background: '#F8FAFD', border: '1px solid #E5EDF5' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>Extracted</div>
                  <ul className="space-y-2 text-sm" style={{ color: '#50617A' }}>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#0A6E5C' }}></span>10,000 pcs</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#0A6E5C' }}></span>500ml, double-wall, 304</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#0A6E5C' }}></span>Logo printing requested</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#0A6E5C' }}></span>Sample required pre-order</li>
                  </ul>
                </div>
                <div className="px-5 py-4 rounded-xl text-sm" style={{ background: '#FFF9EC', border: '1px solid #F3E5C9' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#B45309' }}>Gaps it caught</div>
                  <ul className="space-y-2 text-sm" style={{ color: '#92600E' }}>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D97706' }}></span>Target price or budget?</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D97706' }}></span>Incoterm (FOB / CIF / EXW)?</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D97706' }}></span>Delivery destination &amp; date?</li>
                  </ul>
                </div>
              </div>
            </div>
            </Reveal>

            <Reveal delay={240}>
            <div className="p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-teal-600/30" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#0A6E5C' }}>3</div>
                <div>
                  <div className="text-sm font-semibold">A quote you can trace</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Every number traces back to a supplier price or your margin rule</div>
                </div>
              </div>
              <div className="px-5 py-4 rounded-xl text-sm" style={{ background: '#F8FAFD', border: '1px solid #E5EDF5' }}>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="font-semibold" style={{ color: '#111' }}>
                    <span className="text-xs font-semibold mr-1" style={{ color: '#9CA3AF' }}>10,000 pcs ·</span>
                    500ml Vacuum Bottle, Double-Wall 304
                  </span>
                  <span className="font-bold shrink-0 ml-3" style={{ color: '#0A6E5C' }}>USD 5.00 / pc</span>
                </div>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="font-semibold" style={{ color: '#111' }}>
                    <span className="text-xs font-semibold mr-1" style={{ color: '#9CA3AF' }}>10,000 pcs ·</span>
                    Logo Printing (single-color laser)
                  </span>
                  <span className="font-bold shrink-0 ml-3" style={{ color: '#0A6E5C' }}>USD 0.35 / pc</span>
                </div>
                <div className="flex justify-between items-baseline mb-4">
                  <span className="font-semibold" style={{ color: '#111' }}>
                    <span className="text-xs font-semibold mr-1" style={{ color: '#9CA3AF' }}>1 pc ·</span>
                    Sample (air freight)
                  </span>
                  <span className="font-bold shrink-0 ml-3" style={{ color: '#0A6E5C' }}>USD 25.00</span>
                </div>
                <div className="flex justify-between items-baseline py-3 border-t text-sm font-bold" style={{ borderColor: '#E5EDF5', color: '#0A6E5C' }}>
                  <span>Subtotal</span>
                  <span>USD 53,525</span>
                </div>
                <div className="py-3 border-t text-xs" style={{ borderColor: '#E5EDF5', color: '#50617A' }}>
                  <span className="font-semibold" style={{ color: '#0A6E5C' }}>Sources: </span>
                  Supplier quote #SO-2091 (Global Stainless) · 20% margin on bottles (4.00 → 5.00) · FX 7.82 · Holds for 15 days
                </div>
              </div>
              <p className="text-sm mt-4" style={{ color: '#626260' }}>
                You review, adjust, approve. The quote goes out in your voice, with your margins intact.
              </p>
            </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden" style={{ background: '#F8FAFD' }}>
        <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 -translate-x-1/2 w-[820px] h-[460px] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(10,110,92,0.09), rgba(10,110,92,0) 70%)' }} />
        <div className="max-w-4xl mx-auto text-center relative">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Simple, transparent pricing
            </h2>
            <p className="text-lg mb-16" style={{ color: '#626260' }}>
              14-day free trial, then HK$880/month. Cancel anytime.
            </p>
          </Reveal>
          <Reveal className="max-w-[440px] mx-auto">
            <div
              className="relative flex h-full flex-col p-8 rounded-2xl text-left transition-all duration-300 md:hover:-translate-y-1"
              style={{
                background: '#fff',
                border: '1.5px solid #0A6E5C',
                boxShadow: '0 24px 60px -24px rgba(10,110,92,0.45)',
              }}
            >
              <div className="text-base font-semibold" style={{ color: '#111' }}>{PLANS[0].name}</div>
              <div className="flex items-baseline gap-1.5 mt-1 mb-6">
                <span className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{PLANS[0].price}</span>
                <span className="text-sm" style={{ color: '#626260' }}>{PLANS[0].period}</span>
              </div>
              <p className="text-[11px] uppercase tracking-wider font-semibold mb-4 text-left" style={{ color: '#9CA3AF' }}>
                What&apos;s included
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {PLANS[0].features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: '#374151' }}>
                    <span className="w-5 h-5 mt-px rounded-full flex items-center justify-center shrink-0" style={{ background: '#E6F4F0', color: '#0A6E5C' }}>
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="group/cta w-full text-center py-3 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5 active:translate-y-px active:scale-[0.99] inline-flex items-center justify-center gap-2" style={{ background: '#0A6E5C', color: '#fff', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}>
                Start Free Trial
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
          <p className="text-xs mt-10" style={{ color: '#626260' }}>
            14-day free trial · Card required · 50 AI responses included · Cancel anytime.
          </p>
          <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
            Need extra WhatsApp numbers, a bigger team, or custom workflows? We do custom plans —{' '}
            <a href="mailto:tradeflow.hk@gmail.com" className="font-medium underline underline-offset-2" style={{ color: '#0A6E5C' }}>
              tradeflow.hk@gmail.com
            </a>
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Questions, answered
            </h2>
            <p className="text-lg" style={{ color: '#626260' }}>
              Everything traders ask us before starting.
            </p>
          </Reveal>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <Reveal key={faq.q} delay={Math.min(i, 6) * 60}>
              <details key={faq.q} className="group rounded-2xl border transition-colors duration-300 hover:border-teal-600/30" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
                <summary className="flex items-center justify-between gap-4 px-8 py-5 text-base font-medium cursor-pointer select-none list-none" style={{ color: '#111' }}>
                  {faq.q}
                  <svg className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" style={{ color: '#9CA3AF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <div className="px-8 pb-6 -mt-1 text-sm leading-relaxed" style={{ color: '#626260' }}>
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
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center select-none whitespace-nowrap font-bold leading-none" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#F1EFE9', fontSize: 'clamp(6rem, 22vw, 16rem)' }}>
          Backtide
        </div>
        <Reveal className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Stop copy-pasting quotes.<br />
            <span style={{ color: '#0A6E5C' }}>Start closing deals.</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: '#626260' }}>
            Backtide helps trading companies in HK, Shenzhen, and beyond quote faster and win more deals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="group w-full sm:w-auto px-8 py-4 rounded-lg text-sm font-medium text-white transition-all hover:-translate-y-0.5 active:translate-y-px active:scale-[0.99] inline-flex items-center justify-center gap-2" style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}>
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-lg text-sm font-medium border transition-all hover:bg-black/[0.03] hover:-translate-y-0.5" style={{ borderColor: '#D9D7CB', color: '#374151' }}>
              Book a Demo
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 border-t" style={{ borderColor: '#E8E5E1' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm font-semibold" style={{ color: '#111' }}>Backtide</div>
          <div className="flex items-center gap-6 text-sm" style={{ color: '#626260' }}>
            <a href="/privacy" className="hover:text-black transition-colors">Privacy</a>
            <Link href="/pricing" className="hover:text-black transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-black transition-colors">Log in</Link>
          </div>
          <div className="text-xs" style={{ color: '#B0ADA8' }}>© 2026 Backtide. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}