import Link from 'next/link';

/* ── Data ───────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    title: 'Company Brain',
    desc: 'AI learns your products, suppliers, margins, and certifications. Every quote it builds gets smarter.',
    detail: 'Upload specs, pricing sheets, and supplier docs. Backtide builds a knowledge graph that powers every future quote.',
  },
  {
    title: 'Email + WhatsApp Inbox',
    desc: 'Works over email and WhatsApp — the channels you already use. An inquiry lands in your inbox, and Backtide drives it through the whole sourcing pipeline.',
    detail: 'Works with the email and WhatsApp you already use. No new software for your team, customers, or suppliers to learn. Supports English, Chinese, and mixed-language threads.',
  },
  {
    title: 'Cited Quotes',
    desc: 'Every number on your quote has a source. Supplier price, margin, FX rate — all traceable.',
    detail: 'AI cites where every data point came from. Show customers confidence, not guesswork.',
  },
  {
    title: 'Smart Follow-ups',
    desc: 'Auto-scheduled follow-ups that stop the moment a customer replies. No embarrassing double-texts.',
    detail: 'AI drafts messages in the customer\'s language. Human approves before send.',
  },
];

const STEPS = [
  { num: '01', title: 'Inquiry comes in', desc: 'From email or WhatsApp. Every spec, quantity, and requirement is extracted with source citations.' },
  { num: '02', title: 'Gaps get clarified', desc: 'AI flags missing details and drafts a clarification question in the customer\'s language. You approve, we ask.' },
  { num: '03', title: 'Suppliers get RFQed', desc: 'A batch RFQ goes to your shortlisted suppliers on their preferred channel. You approve every send.' },
  { num: '04', title: 'Quote is drafted', desc: 'Responses are compared, landed cost is calculated, and a cited quote is drafted. You approve, one click to send.' },
];

const PLANS = [
  {
    name: 'Starter SDR',
    price: 'HK$880',
    period: '/mo',
    features: [
      'Unlimited WhatsApp conversations',
      'Unlimited products & FAQ rules',
      'English, Mandarin, Cantonese, Spanish',
      'Knowledge base & documents',
      'Human override anytime',
      'Custom AI personality',
    ],
    cta: 'Start Free Trial',
    accent: true,
    available: true,
  },
  {
    name: 'Growth Trading Desk',
    price: 'HK$1,942',
    period: '/mo',
    features: [
      'WeChat Work integration',
      'Multi-user dashboard',
      'Analytics & reporting',
      'Priority support',
    ],
    cta: 'Coming soon',
    accent: false,
    available: false,
  },
  {
    name: 'Enterprise',
    price: 'HK$4,880',
    period: '/mo',
    features: [
      'AI sourcing & supplier matching',
      'Automated quote generation',
      'Dedicated account manager',
      'Custom integrations',
    ],
    cta: 'Coming soon',
    accent: false,
    available: false,
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
        <div className="max-w-7xl mx-auto px-6 h-16 grid grid-cols-[auto_1fr_auto] items-center">
          <div className="text-base font-semibold tracking-tight" style={{ color: '#111' }}>Backtide</div>
          <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium" style={{ color: '#626260' }}>
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-black transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
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
            <span style={{ color: '#0A6E5C' }}>End to end.</span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: '#626260' }}>
            Backtide is the AI copilot for trading companies. It takes a customer inquiry, extracts every spec, checks for gaps, RFQs your suppliers, compares their responses with cited landed costs, and drafts a ready-to-send quote — in hours, not days.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-3.5 rounded-lg text-sm font-medium text-white transition-all active:translate-y-px active:scale-[0.99]" style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}>
              Start Free Trial
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 rounded-lg text-sm font-medium border transition-colors hover:bg-black/[0.03]" style={{ borderColor: '#D9D7CB', color: '#374151' }}>
              See a Live Demo
            </Link>
          </div>

          <div className="max-w-4xl mx-auto rounded-2xl border p-6 md:p-8 text-left" style={{ background: '#fff', borderColor: '#E8E5E1', boxShadow: '0 24px 60px -30px rgba(10,110,92,0.18)' }}>
            <div className="grid md:grid-cols-4 gap-4 md:gap-0">
              {[
                {
                  icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>),
                  label: 'Inquiry',
                  sub: 'Extract specs',
                },
                {
                  icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>),
                  label: 'Clarify',
                  sub: 'AI flags gaps',
                },
                {
                  icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 6.75v-1.5a4.5 4.5 0 00-9 0v1.5h9z" /></svg>),
                  label: 'RFQ',
                  sub: 'Batch suppliers',
                },
                {
                  icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                  label: 'Quote',
                  sub: 'Cited & ready',
                },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-4 md:gap-0">
                  <div className="flex-1 flex md:flex-col items-center md:items-start gap-3 md:text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E6F4F0', color: '#0A6E5C' }}>{step.icon}</div>
                      <div className="md:hidden">
                        <div className="text-sm font-semibold">{step.label}</div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>{step.sub}</div>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <div className="text-sm font-semibold">{step.label}</div>
                      <div className="text-xs" style={{ color: '#9CA3AF' }}>{step.sub}</div>
                    </div>
                  </div>
                  {i < 3 && (
                    <svg className="hidden md:block w-4 h-4 shrink-0 mx-1" style={{ color: '#C8C6BF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: '#EFEDE8' }}>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>Every step is a draft you approve before it goes out.</span>
              <span className="text-xs font-semibold" style={{ color: '#0A6E5C' }}>Email · WhatsApp</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#626260' }}>
              Built for the way traders actually work — citation-backed, human-approved.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="group p-8 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#626260' }}>{f.desc}</p>
                <p className="text-xs leading-relaxed px-4 py-3 rounded-lg" style={{ background: '#F8FAFD', color: '#50617A' }}>{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: '#F8FAFD' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              From inquiry to quote in 4 steps
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#626260' }}>
              The whole sourcing pipeline, with you approving every message.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white mx-auto mb-4" style={{ background: '#0A6E5C' }}>{s.num}</div>
                <h3 className="text-base font-bold mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#626260' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── See It In Action ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              See it in action
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#626260' }}>
              A real RFQ, 10 minutes later. Here&apos;s the whole flow.
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-8 rounded-2xl border" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
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

            <div className="p-8 rounded-2xl border" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
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

            <div className="p-8 rounded-2xl border" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#0A6E5C' }}>3</div>
                <div>
                  <div className="text-sm font-semibold">A cited quote, ready to send</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Every number traces back to a supplier price or your margin rule</div>
                </div>
              </div>
              <div className="px-5 py-4 rounded-xl text-sm" style={{ background: '#F8FAFD', border: '1px solid #E5EDF5' }}>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="font-semibold" style={{ color: '#111' }}>500ml Vacuum Bottle, Double-Wall 304</span>
                  <span className="font-bold" style={{ color: '#0A6E5C' }}>USD 4.80 / pc</span>
                </div>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="font-semibold" style={{ color: '#111' }}>Logo Printing (single-color laser)</span>
                  <span className="font-bold" style={{ color: '#0A6E5C' }}>USD 0.35 / pc</span>
                </div>
                <div className="flex justify-between items-baseline mb-4">
                  <span className="font-semibold" style={{ color: '#111' }}>Sample (air freight)</span>
                  <span className="font-bold" style={{ color: '#0A6E5C' }}>USD 25.00</span>
                </div>
                <div className="py-3 border-t text-xs" style={{ borderColor: '#E5EDF5', color: '#50617A' }}>
                  <span className="font-semibold" style={{ color: '#0A6E5C' }}>Sources: </span>
                  Supplier quote #SO-2091 (Global Stainless) · 32% target margin · FX 7.82 · Validity 15 days
                </div>
              </div>
              <p className="text-sm mt-4" style={{ color: '#626260' }}>
                You review, adjust, approve. The quote goes out in your voice, with your margins intact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#F8FAFD' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Simple, transparent pricing
          </h2>
          <p className="text-lg mb-12" style={{ color: '#626260' }}>
            Start with a 14-day free trial. Scale when you&apos;re ready.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.name} className="p-8 rounded-2xl border-2 text-left transition-all hover:shadow-xl" style={{ background: '#fff', borderColor: plan.accent ? '#0A6E5C' : '#E8E5E1' }}>
                {plan.accent && <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#0A6E5C' }}>Most Popular</div>}
                <div className="text-base font-semibold mb-2" style={{ color: '#626260' }}>{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-2xl font-bold" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{plan.price}</span>
                  {plan.period && <span className="text-sm" style={{ color: '#626260' }}>{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 shrink-0" style={{ color: '#0A6E5C' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.available ? (
                  <Link href="/signup" className="block w-full text-center py-3 rounded-lg text-sm font-medium transition-all" style={{ background: '#0A6E5C', color: '#fff', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}>
                    {plan.cta}
                  </Link>
                ) : (
                  <div className="block w-full text-center py-3 rounded-lg text-sm font-medium" style={{ background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }}>
                    {plan.cta}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs mt-8" style={{ color: '#626260' }}>
            14-day free trial · Card required · 50 AI responses included · Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Questions, answered
            </h2>
            <p className="text-lg" style={{ color: '#626260' }}>
              Everything traders ask us before starting.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border overflow-hidden" style={{ background: '#fff', borderColor: '#E8E5E1' }}>
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
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Stop copy-pasting quotes.<br />
            <span style={{ color: '#0A6E5C' }}>Start closing deals.</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: '#626260' }}>
            Join trading companies in HK, Shenzhen, and beyond who are already using AI to quote faster and win more deals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 rounded-lg text-sm font-medium text-white transition-all active:translate-y-px active:scale-[0.99]" style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}>
              Get Started Free
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-lg text-sm font-medium border transition-colors hover:bg-black/[0.03]" style={{ borderColor: '#D9D7CB', color: '#374151' }}>
              Book a Demo
            </Link>
          </div>
        </div>
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