'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Sparkles, Send, X } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

function makeWelcome(t: (en: string, zh: string) => string): Msg {
  return {
    role: 'assistant',
    content: t(
      "Hi, I'm your business co-pilot. I have full context on your company — goals, product catalog, and knowledge base. Ask me about pricing, shortages, leads, or anything in your mailbox.",
      '你好，我是你的業務助手。我已掌握你公司的完整資料——目標、產品目錄同知識庫。可以問我定價、缺貨、商機，或者郵件相關嘅問題。'
    ),
  };
}

const QUICK_QUESTIONS_EN = [
  'What should I reply to today\'s pending quotes?',
  'Summarize the OpenAI deal status',
  'Which products have the best margin?',
  'Do we have suppliers for recycled bulk orders?',
  'PTE. LTD. vs US LLC — which entity?',
];

const QUICK_QUESTIONS_ZH = [
  '今日待報價應點回覆？',
  '總結 OpenAI 訂單最新進度',
  '邊款產品利潤最好？',
  '有冇適合回收大批採購嘅供應商？',
  '較多訂單來自邊個國家？',
];

export default function AdminChat() {
  const { companyId } = useCompany();
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([makeWelcome(t)]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastPromptRef = useRef('');

  const scrollToBottom = useCallback(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open, scrollToBottom]);

  useEffect(() => {
    if (open) {
      const tId = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(tId);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || streaming) return;

    const base =
      messages[messages.length - 1]?.role === 'user' && !streaming
        ? messages.slice(0, -1)
        : messages;
    const history = base.slice(-10);
    const next = [...base, { role: 'user' as const, content: text }];

    setMessages(next);
    setInput('');
    setError(null);
    setStreaming(true);
    lastPromptRef.current = text;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(companyId ? { 'x-company-id': companyId } : {}),
        },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Stream unavailable');

      const decoder = new TextDecoder();
      let acc = '';
      setMessages([...next, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: 'assistant', content: acc }]);
      }

      if (!acc) throw new Error('Empty response');
    } catch (err) {
      console.error('[admin-chat] error:', err);
      setMessages(next);
      setError(err instanceof Error ? err.message : t('Something went wrong. Please try again.', '發生錯誤，請再試一次。'));
    } finally {
      setStreaming(false);
      scrollToBottom();
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void send(input);
  };

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const quickQuestions = lang === 'zh' ? QUICK_QUESTIONS_ZH : QUICK_QUESTIONS_EN;

  return (
    <>
      {open && (
<div
            role="dialog"
            aria-label="Business AI chat"
            className="fixed flex flex-col rounded-[16px] border z-40 overflow-hidden btk-anim-rise"
            style={{
              left: 'max(1.25rem, env(safe-area-inset-left))',
              bottom: 'calc(max(1.25rem, env(safe-area-inset-bottom)) + 5rem)',
              width: 'min(24rem, calc(100vw - 2.5rem))',
              height: 'min(34rem, calc(100dvh - 9rem))',
              background: 'var(--bg)',
              borderColor: 'var(--border)',
              boxShadow: '0 32px 72px -24px rgba(15,23,42,0.28), 0 8px 24px -16px rgba(15,23,42,0.14)',
            }}
          >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <span className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: 'var(--accent)', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.18)' }}>
              <Sparkles className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                {t('Business AI', '業務 AI')}
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-60" style={{ background: '#1C7A4D' }} />
                  <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: '#1C7A4D' }} />
                </span>
                {t('Context: goals · products · inquiries · deals', '已載入：目標 · 產品 · 詢盤 · 商機')}
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t('Close AI chat', '關閉 AI 對話')}
              className="w-8 h-8 ml-auto rounded-lg flex items-center justify-center transition-colors duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={bodyRef} aria-live="polite" className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: 'var(--bg)' }}>
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed text-white whitespace-pre-wrap break-words rounded-2xl rounded-br-md" style={{ background: 'var(--accent)', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.15)' }}>
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  {m.content === '' && streaming ? (
                    <div className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl rounded-bl-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span className="btk-chat-dot w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                      <span className="btk-chat-dot w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', animationDelay: '120ms' }} />
                      <span className="btk-chat-dot w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', animationDelay: '240ms' }} />
                    </div>
                  ) : (
                    <div className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl rounded-bl-md" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                      {m.content}
                    </div>
                  )}
                </div>
              )
            )}

            {error && !streaming && (
              <div className="flex justify-start">
                <div className="max-w-[90%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl rounded-bl-md" style={{ background: '#FBF1F0', color: '#B42318', border: '1px solid #F0D5D2' }}>
                  <div className="whitespace-pre-wrap break-words">{error}</div>
                  <button type="button" onClick={() => void send(lastPromptRef.current)} className="mt-2 text-xs font-semibold underline underline-offset-2" style={{ color: '#B42318' }}>
                    {t('Try again', '重試')}
                  </button>
                </div>
              </div>
            )}

            {!hasUserMessages && !streaming && !error && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors duration-150 hover:text-white"
                    style={{ background: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={onSubmit} className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('Ask about your business…', '問關於你公司嘅嘢…')}
                aria-label={t('Message', '訊息')}
                autoComplete="off"
                className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-xl border outline-none"
                style={{ background: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-light)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                aria-label={t('Send message', '送出訊息')}
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.12)' }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.filter = 'brightness(1.05)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
              {t('Powered by NVIDIA NIM · Full company context', '由 NVIDIA NIM 驅動 · 已載入公司完整資料')}
            </p>
          </form>
        </div>
      )}

      {/* Launcher */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('Close AI chat', '關閉 AI 對話') : t('Open AI chat', '開啟 AI 對話')}
        aria-expanded={open}
        className="fixed flex items-center justify-center z-40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        style={{
          left: 'max(1.25rem, env(safe-area-inset-left))',
          bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          width: 56,
          height: 56,
          borderRadius: '999px',
          background: 'var(--accent)',
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.16), 0 20px 40px -16px rgba(0,0,0,0.45)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
        title={t('Business AI', '業務 AI')}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <Sparkles className="w-6 h-6 text-white" />}
      </button>
    </>
  );
}