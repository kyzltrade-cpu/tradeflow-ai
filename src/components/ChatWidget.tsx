'use client';

import { useState, useRef, useEffect } from 'react';
import { useLang } from '@/lib/lang';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWidget() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const isUrl = (text: string): boolean => {
    const lower = text.trim().toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
    if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(lower) && !lower.includes(' ')) return true;
    return false;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      if (isUrl(userMessage)) {
        setResearching(true);
        const res = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: userMessage }),
        });
        const data = await res.json();
        setResearching(false);

        if (data.response) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Thanks for sharing! Let me learn more about your business. Could you tell me what products or services you offer?' }]);
        }
      } else {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            history: messages.slice(-6),
          }),
        });

        const reader = res.body?.getReader();
        if (reader) {
          let assistantMessage = '';
          setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            assistantMessage += chunk;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
              return updated;
            });
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again or email us at tradeflow.hk@gmail.com'
      }]);
    } finally {
      setLoading(false);
      setResearching(false);
    }
  };

  return (
    <>
      {/* Strobe animation */}
      <style>{`
        @keyframes chatStrobe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
        }
        .chat-strobe { animation: chatStrobe 2s ease-in-out infinite; }
      `}</style>

      {/* Chat bubble button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 ${!open ? 'chat-strobe' : ''}`}
        style={{ background: 'var(--accent)' }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[9999] w-[360px] max-w-[calc(100vw-48px)] border rounded-[12px] overflow-hidden shadow-2xl" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium text-white" style={{ background: 'var(--accent)' }}>TF</div>
            <div>
              <p className="text-[14px] font-medium">TradeFlow AI</p>
              <p className="text-[12px]" style={{ color: 'var(--success)' }}>● {t('online', '在線')}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="p-4 h-[320px] overflow-y-auto" style={{ background: '#F0F0EB' }}>
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="rounded-[8px] px-3 py-2 max-w-[85%] text-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <p className="font-medium text-[12px] mb-1" style={{ color: 'var(--accent)' }}>TradeFlow AI</p>
                    <p>{t("Hi! I'm TradeFlow AI. Paste your website URL below and I'll show you how we can help elevate your business with 24/7 AI-powered customer service.", '你好！我是 TradeFlow AI。請在下方貼上您的網站網址，我會向您展示我們如何透過全天候 AI 客戶服務提升您的業務。')}</p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                {msg.role === 'assistant' && (
                  <div className="rounded-[8px] px-3 py-2 max-w-[85%] text-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {i === messages.length - 1 && loading && !msg.content ? (
                      <div className="flex gap-1 py-1">
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '300ms' }} />
                      </div>
                    ) : researching && i === messages.length - 1 ? (
                      <div>
                        <p className="font-medium text-[12px] mb-1" style={{ color: 'var(--accent)' }}>TradeFlow AI</p>
                        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                          {t('🔍 Researching your website...', '🔍 正在研究您的網站...')}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-[12px] mb-1" style={{ color: 'var(--accent)' }}>TradeFlow AI</p>
                        <p>{msg.content}</p>
                      </div>
                    )}
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="rounded-[8px] px-3 py-2 max-w-[85%] text-[14px]" style={{ background: '#D4EDDA' }}>
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={t('Type a message or paste your website URL...', '輸入訊息或貼上您的網站網址...')}
                className="flex-1 border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-3 py-2 rounded-[4px] text-white disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
