'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useLang, LangToggle } from '@/lib/lang';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
}

export default function HomePage() {
  const { t } = useLang();
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoError, setDemoError] = useState('');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const getNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const addAiMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: `ai-${Date.now()}`,
      role: 'ai',
      content,
      timestamp: getNow(),
    }]);
  };

  const addUserMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: getNow(),
    }]);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const input = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    if (!chatStarted) {
      setChatStarted(true);
    }

    // Check if it's a URL
    const isUrl = /^https?:\/\//.test(input) || /\.\w{2,}/.test(input);

    addUserMessage(input);

    if (isUrl) {
      // Show typing indicator then analyze
      await new Promise(r => setTimeout(r, 800));
      addAiMessage(`🔍 Analyzing ${input}...`);

      try {
        const res = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: input }),
        });
        const data = await res.json();
        const response = data.response || 'Could not analyze that website. Please try another URL.';

        await new Promise(r => setTimeout(r, 600));
        addAiMessage(response);
      } catch {
        await new Promise(r => setTimeout(r, 400));
        addAiMessage('Something went wrong. Please try again.');
      }
    } else {
      // Simulate conversational responses
      await new Promise(r => setTimeout(r, 800));

      const lower = input.toLowerCase();
      if (lower.includes('quote') || lower.includes('rfq') || lower.includes('price') || lower.includes('quotation')) {
        addAiMessage(
          "I can generate a formal RFQ quotation with Incoterms (FOB, CIF, DDP, EXW) and real-time FX conversion. Just tell me:\n\n• Product & quantity\n• Destination port\n• Preferred Incoterm\n\nI'll prepare a professional PDF quote in seconds."
        );
      } else if (lower.includes('photo') || lower.includes('image') || lower.includes('picture') || lower.includes('look like') || lower.includes('similar')) {
        addAiMessage(
          "I can match your photo to our catalog. Upload or describe the product you're looking for — I'll find similar items from your catalog with pricing, MOQ, and lead times."
        );
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        addAiMessage("Hello! I'm TradeFlow AI. I can help you with:\n\n• 📋 RFQ quotes with Incoterms\n• 🔍 Visual catalog search\n• 💬 Product & pricing info\n\nTry pasting your website link to see what I can do for your business!");
      } else {
        addAiMessage(
          "I can help with that. Try pasting your website URL above — I'll analyze your business and show you how TradeFlow automates customer inquiries on WhatsApp & WeChat."
        );
      }
    }

    setChatLoading(false);
  };

  const initialMessages: ChatMessage[] = [
    {
      id: 'welcome-1',
      role: 'ai',
      content: "Welcome to TradeFlow! I'm an AI assistant that handles customer inquiries 24/7 on WhatsApp & WeChat.\n\nTry pasting your website link below to see what I can do for your business.",
      timestamp: '9:41',
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-[17px] font-semibold tracking-[-0.3px]" style={{ color: '#FFFFFF' }}>
              TradeFlow
            </span>
            <div className="hidden md:flex items-center gap-6 text-[14px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <a href="#how-it-works" className="hover:text-white transition-colors">{t('How it works', '運作方式')}</a>
              <a href="#pricing" className="hover:text-white transition-colors">{t('Pricing', '定價')}</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <Link href="/login" className="hidden md:inline text-[14px] hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {t('Dashboard', '控制台')}
            </Link>
            <Link
              href="/signup"
              className="text-[13px] font-medium px-3 py-1.5 md:px-4 md:py-2 rounded-[4px] text-[#064E3B]"
              style={{ background: '#FFFFFF' }}
            >
              {t('Get started', '開始使用')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A6E5C 0%, #085C4D 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        {/* Soft glow behind phone area */}
        <div className="absolute top-0 right-0 w-[500px] h-full opacity-[0.08]" style={{
          background: 'radial-gradient(ellipse at 80% 50%, #34d399, transparent 70%)',
        }} />
        <div className="max-w-[1200px] mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-28 relative z-10">
          <div className="flex flex-col md:flex-row items-start gap-10 md:gap-16">
            {/* Left: copy */}
            <div className="w-full md:w-[58%] pt-0 md:pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 md:mb-8" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-[11px] md:text-[12px] font-medium" style={{ color: '#a7f3d0' }}>
                  {t('Built for Hong Kong trading companies', '專為香港貿易公司而設')}
                </span>
              </div>
              <h1 className="text-[32px] md:text-[52px] leading-[1.1] md:leading-[1.05] font-semibold tracking-[-1px] md:tracking-[-1.5px] mb-5 md:mb-6" style={{ color: '#FFFFFF' }}>
                {t('The 24/7 AI Sales Assistant for HK Trading Companies', '香港貿易公司的 24/7 AI 銷售助手')}
              </h1>
              <p className="text-[16px] md:text-[19px] leading-[1.6] md:leading-[1.65] mb-8 md:mb-10 max-w-[520px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {t(
                  'Instantly qualify overseas WhatsApp inquiries. Your team sleeps, your AI closes deals.',
                  '即時篩選海外 WhatsApp 查詢。您的團隊休息時，AI 繼續成交。'
                )}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 mt-12">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto text-[15px] font-medium px-7 py-3.5 rounded-[4px] text-[#064E3B] hover:opacity-90 transition-opacity"
                  style={{ background: '#FFFFFF' }}
                >
                  {t('Login', '登入')}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
                <button
                  onClick={() => {
                    const el = document.getElementById('book-demo');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto text-[15px] font-medium px-7 py-3.5 rounded-[4px] transition-colors cursor-pointer"
                  style={{ border: '1px solid rgba(255,255,255,0.25)', color: '#FFFFFF' }}
                >
                  {t('Book a Demo', '預約演示')}
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto text-[15px] font-medium px-7 py-3.5 rounded-[4px] transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.25)', color: '#FFFFFF' }}
                >
                  {t('See how it works', '了解運作方式')}
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] md:text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {t('No contracts', '無合約')}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {t('Setup in 5 minutes', '5分鐘設定')}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {t('From HK$880/mo · 14-day free trial', 'HK$880/月起 · 14 天免費試用')}
                </span>
              </div>
            </div>

            {/* Right: phone */}
            <div className="hidden lg:flex w-[42%] justify-center pt-2 -ml-6">
              <div className="relative">
                {/* Glow behind phone */}
                <div className="absolute -inset-8 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />
                {/* iPhone frame */}
                <div className="relative">
                  {/* Side buttons */}
                  <div className="absolute -left-[3px] top-[70px] w-[3px] h-[26px] rounded-l-sm" style={{ background: '#2A2A2C' }} />
                  <div className="absolute -left-[3px] top-[110px] w-[3px] h-[44px] rounded-l-sm" style={{ background: '#2A2A2C' }} />
                  <div className="absolute -left-[3px] top-[164px] w-[3px] h-[44px] rounded-l-sm" style={{ background: '#2A2A2C' }} />
                  <div className="absolute -right-[3px] top-[114px] w-[3px] h-[56px] rounded-r-sm" style={{ background: '#2A2A2C' }} />
                  {/* Phone body */}
                  <div className="w-[230px] rounded-[40px] p-[10px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)]" style={{ background: 'linear-gradient(145deg, #3A3A3C, #1C1C1E)' }}>
                    {/* Screen */}
                    <div className="rounded-[30px] overflow-hidden relative flex flex-col" style={{ background: '#ECE5DD', height: '460px' }}>
                      {/* Dynamic Island */}
                      <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[84px] h-[24px] rounded-full z-10" style={{ background: '#000000' }} />
                      {/* Status bar */}
                      <div className="h-[42px] px-4 flex items-end justify-between pb-1 shrink-0">
                        <span className="text-[9px] font-semibold text-black/70">9:41</span>
                        <div className="flex items-center gap-1">
                          <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 5.5C1.8 3.5 3.5 2 5.5 2s3.7 1.5 4.5 3.5" stroke="black" strokeWidth="1" strokeLinecap="round" opacity="0.7"/><circle cx="5.5" cy="6" r="1" fill="black" opacity="0.7"/></svg>
                          <svg width="14" height="8" viewBox="0 0 14 8" fill="none"><rect x="0.5" y="0.5" width="11" height="7" rx="1.5" stroke="black" opacity="0.7"/><rect x="2" y="2" width="7" height="4" rx="0.5" fill="black" opacity="0.7"/><path d="M12.5 2.5V5.5" stroke="black" strokeWidth="1" strokeLinecap="round" opacity="0.7"/></svg>
                        </div>
                      </div>
                      {/* WhatsApp header */}
                      <div className="px-3 py-2 flex items-center gap-2 shrink-0" style={{ background: '#075E54' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-semibold text-white">HK</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-medium text-white">HK Trading Co.</p>
                          <p className="text-[8px]" style={{ color: '#a7f3d0' }}>● online</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        </div>
                      </div>
                      {/* Chat */}
                      <div className="px-2.5 py-2 space-y-1.5 flex-1 overflow-hidden" style={{ background: '#ECE5DD' }}>
                        <div className="flex justify-end">
                          <div className="rounded-[8px] rounded-tr-none px-2.5 py-1.5 max-w-[82%] text-[9px] leading-[1.35]" style={{ background: '#DCF8C6' }}>
                            Price for 1000 water bottles?
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="rounded-[8px] rounded-tl-none px-2.5 py-1.5 max-w-[82%] text-[9px] leading-[1.35]" style={{ background: '#FFFFFF' }}>
                            <p>304 SS 500ml: MOQ 500, $2.80–3.50</p>
                            <p>316 SS 750ml: MOQ 300, $4.20–5.00</p>
                            <p className="mt-0.5 text-[8px]" style={{ color: '#666' }}>FDA certified. Samples free.</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="rounded-[8px] rounded-tr-none px-2.5 py-1.5 max-w-[82%] text-[9px] leading-[1.35]" style={{ background: '#DCF8C6' }}>
                            Custom logo 2000 pcs?
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="rounded-[8px] rounded-tl-none px-2.5 py-1.5 max-w-[82%] text-[9px] leading-[1.35]" style={{ background: '#FFFFFF' }}>
                            <p>USD 2.70/pc, free silk screen</p>
                            <p>Total: USD 5,400 FOB Shenzhen</p>
                            <p className="mt-0.5 text-[8px]" style={{ color: '#666' }}>Shall I prepare a quote?</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="rounded-[8px] rounded-tr-none px-2.5 py-1.5 max-w-[82%] text-[9px] leading-[1.35]" style={{ background: '#DCF8C6' }}>
                            Yes please, CIF London
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="rounded-[8px] rounded-tl-none px-2.5 py-1.5 max-w-[82%] text-[9px] leading-[1.35]" style={{ background: '#FFFFFF' }}>
                            <p>CIF London: +18% freight</p>
                            <p>Total: USD 6,372 CIF London</p>
                            <p className="mt-0.5 text-[8px]" style={{ color: '#666' }}>ETA 25–30 days. Confirm?</p>
                          </div>
                        </div>
                        {/* Rich media: Product photo */}
                        <div className="flex justify-start">
                          <div className="rounded-[8px] rounded-tl-none overflow-hidden max-w-[82%]" style={{ background: '#FFFFFF' }}>
                            <div className="w-full h-[60px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f0f0, #e0e0e0)' }}>
                              <div className="flex flex-col items-center gap-1">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                <span className="text-[7px]" style={{ color: '#999' }}>304-SS-WaterBottle.jpg</span>
                              </div>
                            </div>
                            <div className="px-2.5 py-1.5">
                              <p className="text-[9px] font-medium">304 Stainless Steel 500ml</p>
                              <p className="text-[8px]" style={{ color: '#666' }}>MOQ 500 · $2.80–3.50</p>
                            </div>
                          </div>
                        </div>
                        {/* Rich media: PDF spec sheet */}
                        <div className="flex justify-start">
                          <div className="rounded-[8px] rounded-tl-none overflow-hidden max-w-[82%]" style={{ background: '#FFFFFF' }}>
                            <div className="px-2.5 py-2 flex items-center gap-2">
                              <div className="w-8 h-10 rounded-[3px] flex items-center justify-center shrink-0" style={{ background: '#E53E3E' }}>
                                <span className="text-[7px] font-bold text-white">PDF</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-medium truncate">Product-Spec-Sheet.pdf</p>
                                <p className="text-[7px]" style={{ color: '#666' }}>FDA · CE · RoHS certifications</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Input bar */}
                      <div className="px-2 py-2 flex items-center gap-1.5 shrink-0" style={{ background: '#F0F0F0' }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FFFFFF' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                        </div>
                        <div className="flex-1 rounded-full px-3 py-1.5 flex items-center" style={{ background: '#FFFFFF' }}>
                          <span className="text-[9px]" style={{ color: '#8696A0' }}>Message</span>
                        </div>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FFFFFF' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        </div>
                      </div>
                      {/* Home indicator */}
                      <div className="h-[16px] flex items-center justify-center shrink-0">
                        <div className="w-[80px] h-[4px] rounded-full bg-black/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-8 md:py-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div>
            <p className="text-[32px] md:text-[36px] font-semibold tracking-[-1px]">7x</p>
            <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('More likely to close when you reply within 1 hour', '1小時內回覆，成交率提升7倍')}
            </p>
          </div>
          <div>
            <p className="text-[32px] md:text-[36px] font-semibold tracking-[-1px]">24/7</p>
            <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('Coverage across every time zone, every day', '全天候覆蓋所有時區')}
            </p>
          </div>
          <div>
            <p className="text-[32px] md:text-[36px] font-semibold tracking-[-1px]">3</p>
            <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('Languages — English, Mandarin, Cantonese, Spanish — auto-detected', '四種語言——英語、普通話、廣東話、西班牙語——自動偵測')}
            </p>
          </div>
        </div>
      </section>

      {/* Built-In Guardrails */}
      <section className="border-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-10 md:py-14">
          <div className="border rounded-[10px] p-6 md:p-8" style={{ borderColor: 'var(--accent)', background: 'var(--bg)', boxShadow: '0 0 0 1px var(--accent), 0 4px 24px rgba(0,0,0,0.06)' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-[18px] font-semibold mb-1">{t('Built-In Guardrails', '內建安全機制')}</h3>
                <p className="text-[14px] mb-5" style={{ color: 'var(--text-muted)' }}>
                  {t('Your AI never goes off-script. Every response stays within your rules.', '您的 AI 永遠不會偏離腳本。每個回覆都在您的規則範圍內。')}
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#D1FAE5' }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{t('Excel catalog ingestion', 'Excel 目錄匯入')}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('Upload your product list directly', '直接上傳產品清單')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#D1FAE5' }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{t('Strict non-disclosure rules', '嚴格保密規則')}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('AI never reveals pricing to wrong parties', 'AI 絕不向錯誤方透露價格')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#D1FAE5' }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{t('Instant human-takeover pings', '即時人手接管通知')}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('Get alerted the moment a deal needs you', '交易需要您時立即收到提醒')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-[1200px] mx-auto px-6 py-14 md:py-20">
        <p className="text-[12px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--accent)' }}>
          {t('How it works', '運作方式')}
        </p>
        <h2 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.8px] mb-10 md:mb-12">
          {t('Three steps. No code required.', '三個步驟，無需編程。')}
        </h2>
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <div className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[14px] font-semibold text-white mb-4" style={{ background: 'var(--accent)' }}>1</div>
            <h3 className="text-[17px] font-semibold mb-2">{t('Connect your WhatsApp', '連接您的 WhatsApp')}</h3>
            <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--text-muted)' }}>
              {t('Link your WhatsApp Business number in 2 minutes. Customers message you as normal — the AI answers in the background.', '2分鐘內連結您的 WhatsApp 商業號碼。客戶照常發訊息——AI 在背景自動回覆。')}
            </p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[14px] font-semibold text-white mb-4" style={{ background: 'var(--accent)' }}>2</div>
            <h3 className="text-[17px] font-semibold mb-2">{t('Add your products', '新增您的產品')}</h3>
            <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--text-muted)' }}>
              {t('Upload your catalog — product names, MOQ, pricing, specs. The AI learns your business and answers accurately.', '上傳您的產品目錄——產品名稱、MOQ、價格、規格。AI 學習您的業務並準確回答。')}
            </p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[14px] font-semibold text-white mb-4" style={{ background: 'var(--accent)' }}>3</div>
            <h3 className="text-[17px] font-semibold mb-2">{t('Deals close while you sleep', '您睡覺時，AI 成交訂單')}</h3>
            <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--text-muted)' }}>
              {t('The AI responds instantly to every inquiry, qualifies leads, and hands off complex negotiations to your team.', 'AI 即時回覆每個查詢、篩選潛在客戶，並將複雜談判交給您的團隊。')}
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Chat Demo */}
      <section className="border-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-[800px] mx-auto px-4 md:px-6 py-14 md:py-20">
          <div className="text-center mb-8">
            <p className="text-[12px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--accent)' }}>
              {t('Try it now', '立即試用')}
            </p>
            <h2 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.8px] mb-3">
              {t('See TradeFlow in action', '體驗 TradeFlow 的實際運作')}
            </h2>
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
              {t('Paste your website link or chat with the AI to explore what it can do.', '貼上您的網站連結或與 AI 對話，探索其功能。')}
            </p>
          </div>

          {/* WhatsApp-style chat container */}
          <div className="rounded-[12px] overflow-hidden shadow-[0_8px_40px_-8px_rgba(0,0,0,0.15)] flex flex-col" style={{ background: '#ECE5DD', height: '520px' }}>
            {/* WhatsApp header */}
            <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ background: '#075E54' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-semibold text-white">TF</div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-white">TradeFlow AI</p>
                <p className="text-[10px]" style={{ color: '#a7f3d0' }}>● online</p>
              </div>
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </div>
            </div>

            {/* Chat messages area */}
            <div className="px-4 py-3 space-y-2 overflow-y-auto flex-1" style={{ background: '#ECE5DD' }}>
              {(chatStarted ? chatMessages : initialMessages).map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`rounded-[8px] px-3 py-2 max-w-[80%] text-[13px] leading-[1.5] whitespace-pre-line ${
                      msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'
                    }`}
                    style={{
                      background: msg.role === 'user' ? '#DCF8C6' : '#FFFFFF',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-[8px] rounded-tl-none px-3 py-2" style={{ background: '#FFFFFF' }}>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-3 py-2 flex items-center gap-2 shrink-0" style={{ background: '#F0F0F0' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FFFFFF' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              </div>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder={t('Paste your website link or ask anything...', '貼上網站連結或提問...')}
                className="flex-1 rounded-full px-4 py-2 text-[13px] focus:outline-none"
                style={{ background: '#FFFFFF', border: '1px solid #E0E0E0' }}
                disabled={chatLoading}
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
                style={{ background: chatInput.trim() ? '#075E54' : '#D9DBDC' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>

            {/* Home indicator */}
            <div className="h-4 flex items-center justify-center" style={{ background: '#F0F0F0' }}>
              <div className="w-20 h-1 rounded-full bg-black/20" />
            </div>
          </div>

          <p className="text-[12px] text-center mt-4" style={{ color: 'var(--text-muted)' }}>
            {t('This is a live demo — the AI responds in real-time.', '這是即時演示——AI 會即時回覆。')}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-14 md:py-20">
          <p className="text-[12px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--accent)' }}>
            {t('Features', '功能')}
          </p>
          <h2 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.8px] mb-4">
            {t('Everything you need to manage AI conversations', '管理 AI 對話所需的一切')}
          </h2>
          <p className="text-[16px] mb-12 max-w-[600px]" style={{ color: 'var(--text-muted)' }}>
            {t('A powerful AI platform built for trading companies. From instant replies to automated quotations.', '專為貿易公司打造的強大 AI 平台。從即時回覆到自動化報價。')}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Conversations */}
            <div className="border rounded-[8px] p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold mb-2">{t('Conversations', '對話')}</h3>
              <p className="text-[14px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
                {t('Live chat view with every customer conversation. See AI responses in real-time, jump in manually when needed, and bookmark conversations for follow-up.', '即時查看每個客戶對話。實時觀看 AI 回覆，需要時手動介入，並標記對話以便跟進。')}
              </p>
            </div>

            {/* Products */}
            <div className="border rounded-[8px] p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold mb-2">{t('Products', '產品')}</h3>
              <p className="text-[14px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
                {t('Manage your full product catalog — names, descriptions, MOQ, pricing, categories. The AI uses this to answer customer inquiries accurately.', '管理完整產品目錄——名稱、描述、MOQ、價格、類別。AI 使用這些資料準確回答客戶查詢。')}
              </p>
            </div>

            {/* Knowledge Base */}
            <div className="border rounded-[8px] p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold mb-2">{t('Knowledge Base', '知識庫')}</h3>
              <p className="text-[14px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
                {t('Upload documents, specs, and certifications. The AI reads your knowledge base to answer detailed technical and compliance questions.', '上傳文件、規格和認證。AI 讀取知識庫以回答技術和合規問題。')}
              </p>
            </div>

            {/* FAQ Rules */}
            <div className="border rounded-[8px] p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold mb-2">{t('FAQ Rules', 'FAQ 規則')}</h3>
              <p className="text-[14px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
                {t('Set keyword triggers and canned answers for common questions. Priority-based matching ensures the right answer every time.', '為常見問題設定關鍵詞觸發和預設回答。優先級匹配確保每次給出正確答案。')}
              </p>
            </div>

            {/* Settings */}
            <div className="border rounded-[8px] p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold mb-2">{t('Settings', '設定')}</h3>
              <p className="text-[14px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
                {t('Customize your AI personality, system prompt, and connected channels. Switch between AI and human mode per conversation.', '自訂 AI 個性、系統提示詞和已連接渠道。按對話切換 AI 和人手模式。')}
              </p>
            </div>

            {/* Human Takeover */}
            <div className="border rounded-[8px] p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold mb-2">{t('Human Takeover', '人手接管')}</h3>
              <p className="text-[14px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
                {t('One click to switch any conversation from AI to human. Your team steps in for complex negotiations while AI handles the rest.', '一鍵將任何對話從 AI 切換到人手。您的團隊處理複雜談判，AI 處理其餘。')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-[1100px] mx-auto px-6 py-14 md:py-20">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-[12px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--accent)' }}>
              {t('Pricing', '定價')}
            </p>
            <h2 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.8px] mb-4">
              {t('Simple pricing for every team size', '簡單定價，適合各種團隊規模')}
            </h2>
            <p className="text-[16px] max-w-[600px] mx-auto" style={{ color: 'var(--text-muted)' }}>
              {t('Start free, scale when ready. No setup fees, no surprises.', '免費開始，準備好再升級。無設置費，無隱藏費用。')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {/* TradeFlow AI - HK$880 */}
            <div className="border rounded-[8px] p-6 flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="mb-3">
                <h3 className="text-[17px] font-semibold">Starter SDR</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>HK$</span>
                  <span className="text-[28px] font-semibold tracking-[-1px]">880</span>
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>/mo</span>
                </div>
              </div>
              <div className="space-y-2 mt-4 flex-1">
                {[
                  'Unlimited WhatsApp conversations',
                  'Unlimited products & FAQ rules',
                  'English, Mandarin, Cantonese, Spanish',
                  'Human override anytime',
                  'Knowledge base & documents',
                  'Custom AI personality',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-[13px]">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/login"
                className="block w-full text-center text-[13px] font-medium py-2.5 rounded-[4px] mt-6 border"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
              >
                {t('Login / Sign up', '登入 / 註冊')}
              </Link>
            </div>

            {/* Growth Trading Desk - HK$2,480 - Coming Soon */}
            <div className="border rounded-[8px] p-6 relative overflow-hidden opacity-60 flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                {t('COMING SOON', '即將推出')}
              </div>
              <div className="mb-3">
                <h3 className="text-[17px] font-semibold">Growth Trading Desk</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>HK$</span>
                  <span className="text-[28px] font-semibold tracking-[-1px]">2,480</span>
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>/mo</span>
                </div>
              </div>
              <div className="space-y-2 mt-4 flex-1">
                {[
                  'WeChat Work integration',
                  'Multi-user dashboard',
                  'Analytics & reporting',
                  'Priority support',
                  'Lead Ingestion (Email & WhatsApp)',
                  'Quote Engine (PDF RFQ)',
                ].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2 ${i >= 4 ? 'opacity-50' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-[13px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Enterprise - HK$4,880 - Coming Soon */}
            <div className="border rounded-[8px] p-6 relative overflow-hidden opacity-60 flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                {t('COMING SOON', '即將推出')}
              </div>
              <div className="mb-3">
                <h3 className="text-[17px] font-semibold">Enterprise</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>HK$</span>
                  <span className="text-[28px] font-semibold tracking-[-1px]">4,880</span>
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>/mo</span>
                </div>
              </div>
              <div className="space-y-2 mt-4 flex-1">
                {[
                  'AI sourcing & supplier matching',
                  'Automated quote generation',
                  'Dedicated account manager',
                  'Custom integrations',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-[13px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[13px] text-center mt-8" style={{ color: 'var(--text-muted)' }}>
            {t('14-day free trial · Card required · 50 AI responses included · Cancel anytime.', '14 天免費試用 · 需要信用卡 · 包含 50 次 AI 回覆 · 隨時取消。')}
          </p>
        </div>
      </section>

      {/* Book a Demo */}
      <section id="book-demo" style={{ background: 'var(--surface)' }}>
        <div className="max-w-[600px] mx-auto px-6 py-14 md:py-20">
          <div className="text-center mb-8">
            <p className="text-[12px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--accent)' }}>
              {t('Book a Demo', '預約演示')}
            </p>
            <h2 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.8px] mb-3">
              {t('See TradeFlow in action', '看看 TradeFlow 如何運作')}
            </h2>
            <p className="text-[15px]" style={{ color: 'var(--text-muted)' }}>
              {t('Get a personalized 15-minute walkthrough. No commitment required.', '獲取 15 分鐘個人化演示。無需承諾。')}
            </p>
          </div>

          {demoSubmitted ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#D1FAE5' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="text-[20px] font-semibold mb-2">{t('Thank you!', '謝謝！')}</h3>
              <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
                {t('We\'ll contact you within 24 hours to schedule your demo.', '我們會在 24 小時內聯繫您安排演示。')}
              </p>
              <button
                onClick={() => { setDemoSubmitted(false); setDemoError(''); }}
                className="text-[13px] font-medium px-5 py-2 rounded-[4px] border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                {t('Submit another request', '提交另一個請求')}
              </button>
            </div>
          ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setDemoSubmitting(true);
              setDemoError('');
              const form = e.target as HTMLFormElement;
              const fd = new FormData(form);
              const data = {
                name: fd.get('name'),
                email: fd.get('email'),
                company: fd.get('company'),
                phone: fd.get('phone'),
              };
              try {
                const res = await fetch('/api/demo-request', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error('Failed');
                form.reset();
                setDemoSubmitted(true);
              } catch {
                setDemoError(t('Something went wrong. Please try again.', '出了點問題，請重試。'));
              } finally {
                setDemoSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium mb-1.5">{t('Name', '姓名')}</label>
                <input
                  name="name"
                  required
                  className="w-full px-3 py-2.5 text-[14px] rounded-[4px] border outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  placeholder={t('Your name', '您的姓名')}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-1.5">{t('Email', '電郵')}</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-3 py-2.5 text-[14px] rounded-[4px] border outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  placeholder={t('you@company.com', 'you@company.com')}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium mb-1.5">{t('Company', '公司')}</label>
                <input
                  name="company"
                  required
                  className="w-full px-3 py-2.5 text-[14px] rounded-[4px] border outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  placeholder={t('Your company name', '您的公司名稱')}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-1.5">{t('Phone', '電話')}</label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full px-3 py-2.5 text-[14px] rounded-[4px] border outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  placeholder={t('+852 XXXX XXXX', '+852 XXXX XXXX')}
                />
              </div>
            </div>
            {demoError && (
              <div className="text-[13px] px-4 py-3 rounded-[4px]" style={{ background: '#FEE8EA', color: 'var(--error, #ef4444)' }}>
                {demoError}
              </div>
            )}
            <button
              type="submit"
              disabled={demoSubmitting}
              className="w-full text-[14px] font-medium py-3 rounded-[4px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {demoSubmitting ? t('Submitting…', '提交中…') : t('Request Demo', '預約演示')}
            </button>
            <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
              {t('We typically respond within 24 hours. No spam, ever.', '我們通常在 24 小時內回覆。絕不發送垃圾訊息。')}
            </p>
          </form>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, #0A6E5C 0%, #064E3B 100%)' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-14 md:py-20 text-center">
          <h2 className="text-[26px] md:text-[36px] font-semibold tracking-[-1px] mb-4" style={{ color: '#FFFFFF' }}>
            {t('Ready to never miss a lead?', '準備好不再錯過任何客戶？')}
          </h2>
          <p className="text-[15px] md:text-[16px] mb-8" style={{ color: '#a7f3d0' }}>
            {t('Set up in 5 minutes. Card required for trial.', '5 分鐘設定，試用需要信用卡。')}
          </p>
          <Link
            href="/signup"
            className="inline-block text-[15px] font-medium px-8 py-3.5 rounded-[4px] text-[#064E3B]"
            style={{ background: '#FFFFFF' }}
          >
            {t('Get started free →', '免費開始 →')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-6 md:py-8 flex flex-col md:flex-row items-center justify-between gap-2 text-[12px] md:text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <span>© 2026 TradeFlow AI</span>
          <span>{t('Built in Hong Kong', '香港開發')}</span>
        </div>
      </footer>
    </div>
  );
}
