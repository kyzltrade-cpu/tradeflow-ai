'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

interface LangContextType {
  lang: Lang;
  toggle: () => void;
  t: (en: string, zh: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  toggle: () => {},
  t: (en) => en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lang');
      if (saved === 'en' || saved === 'zh') return saved;
    }
    return 'en';
  });
  const toggle = () => {
    const next = lang === 'en' ? 'zh' : 'en';
    localStorage.setItem('lang', next);
    setLang(next);
  };
  const t = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <div
      className="flex items-center rounded-full border p-0.5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      role="group"
      aria-label="Language"
    >
      <button
        onClick={() => lang !== 'en' && toggle()}
        className="rounded-full px-3 py-1 text-[12px] font-semibold transition-colors"
        style={
          lang === 'en'
            ? { background: 'var(--accent)', color: '#FFFFFF' }
            : { color: 'var(--text-muted)' }
        }
      >
        EN
      </button>
      <button
        onClick={() => lang !== 'zh' && toggle()}
        className="rounded-full px-3 py-1 text-[12px] font-semibold transition-colors"
        style={
          lang === 'zh'
            ? { background: 'var(--accent)', color: '#FFFFFF' }
            : { color: 'var(--text-muted)' }
        }
      >
        中文
      </button>
    </div>
  );
}
