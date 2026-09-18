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
    <button
      onClick={toggle}
      className="text-[13px] px-3 py-1.5 rounded-full font-medium border transition-colors"
      style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
    >
      {lang === 'en' ? '中文' : 'EN'}
    </button>
  );
}
