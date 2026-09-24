'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircleQuestion, Send, X } from 'lucide-react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Msg = {
  role: 'assistant',
  content:
    "Hi! I'm the Vectra support assistant. Ask me anything about the product, pricing, or getting started — I reply in your language.",
};

const QUICK_QUESTIONS = [
  'How does the free trial work?',
  'How much does it cost?',
  'How do I connect WhatsApp?',
  'Which languages are supported?',
];

export default function SupportChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
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
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
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

  const hidden = pathname.startsWith('/admin') || pathname === '/onboarding';
  if (hidden) return null;

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
        headers: { 'Content-Type': 'application/json' },
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
      console.error('[support-chat] error:', err);
      setMessages(next);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Vectra support chat"
          className="btk-anim-rise fixed flex flex-col rounded-[20px] border z-40 overflow-hidden"
          style={{
            left: 'max(1.25rem, env(safe-area-inset-left))',
            bottom: 'calc(max(1.25rem, env(safe-area-inset-bottom)) + 5rem)',
            width: 'min(24rem, calc(100vw - 2.5rem))',
            height: 'min(34rem, calc(100dvh - 9rem))',
            background: '#fff',
            borderColor: '#E5E5E5',
            boxShadow: '0 32px 72px -24px rgba(15,23,42,0.28), 0 8px 24px -16px rgba(15,23,42,0.14)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b shrink-0" style={{ borderColor: '#EEEEEE', background: '#fff' }}>
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ background: 'linear-gradient(180deg, #3A3A3A, #000 60%, #000)', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.18)' }}
            >
              <MessageCircleQuestion className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold" style={{ color: '#0A0A0A' }}>Vectra support</div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#555555' }}>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-60" style={{ background: '#1C7A4D' }} />
                  <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: '#1C7A4D' }} />
                </span>
                Online · replies instantly
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close support chat"
              className="w-8 h-8 ml-auto rounded-lg flex items-center justify-center transition-colors duration-150"
              style={{ color: '#555555' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F4F4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={bodyRef}
            aria-live="polite"
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            style={{ background: '#FAFAFA' }}
          >
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div
                    className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed text-white whitespace-pre-wrap break-words rounded-2xl rounded-br-md"
                    style={{ background: 'linear-gradient(180deg, #1F1F1F, #000 60%, #000)', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.15)' }}
                  >
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  {m.content === '' && streaming ? (
                    <div className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl rounded-bl-md" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
                      <span className="btk-chat-dot w-1.5 h-1.5 rounded-full" style={{ background: '#000' }} />
                      <span className="btk-chat-dot w-1.5 h-1.5 rounded-full" style={{ background: '#000', animationDelay: '120ms' }} />
                      <span className="btk-chat-dot w-1.5 h-1.5 rounded-full" style={{ background: '#000', animationDelay: '240ms' }} />
                    </div>
                  ) : (
                    <div
                      className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl rounded-bl-md"
                      style={{ background: '#fff', color: '#0A0A0A', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-card)' }}
                    >
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
                  <button
                    type="button"
                    onClick={() => void send(lastPromptRef.current)}
                    className="mt-2 text-xs font-semibold underline underline-offset-2"
                    style={{ color: '#B42318' }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {!hasUserMessages && !streaming && !error && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors duration-150 hover:text-white"
                    style={{ background: '#fff', color: '#555555', borderColor: '#DFDFDF' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#555555'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={onSubmit} className="p-3 border-t shrink-0" style={{ borderColor: '#EEEEEE', background: '#fff' }}>
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Vectra…"
                aria-label="Message"
                autoComplete="off"
                className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-xl border outline-none"
                style={{ background: '#FAFAFA', color: '#0A0A0A', borderColor: '#E5E5E5' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.12)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                aria-label="Send message"
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(180deg, #1F1F1F, #000 60%, #000)', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.15), inset 0 -2px 0 0 #1A1A1A' }}
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
            <p className="text-[11px] mt-2 text-center" style={{ color: '#9A9A9A' }}>
              Powered by NVIDIA NIM · Human review on request
            </p>
          </form>
        </div>
      )}

      {/* Launcher */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        aria-expanded={open}
        className="fixed flex items-center justify-center z-40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        style={{
          right: 'max(1.25rem, env(safe-area-inset-right))',
          bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          width: 58,
          height: 58,
          borderRadius: '999px',
          background: 'linear-gradient(180deg, #1F1F1F, #000 60%, #000)',
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.15), inset 0 -3px 0 0 rgba(0,0,0,0.85), 0 20px 40px -16px rgba(0,0,0,0.55)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircleQuestion className="w-6 h-6 text-white" />}
      </button>
    </>
  );
}