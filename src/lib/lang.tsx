'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  const t = useCallback(
    (en: string, zh: string) => (lang === 'zh' ? zh : en),
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/* Two treatments, because the pill is not always the right weight.

   `pill` fills the active segment with --accent. That is correct on a light
   utility surface (the admin sidebar), but in the landing header it made the
   least important control on the page into a filled dark shape sitting beside
   the dark CTA — two solid masses competing for the same corner.

   `quiet` drops all the chrome: no border, no fill, no surface. The active
   language is simply the darker one. Same information, no weight.

   The inactive tone is --ink-2, not --ink-3: sitting directly on the hero
   wash, --ink-3 measured 2.9:1 and failed AA. It only ever read as "muted"
   because the pill used to put a white --surface behind it. On the bare wash
   it needs --ink-2 (6.1:1), with active --ink at 10.7:1 for the step. */
export function LangToggle({ variant = 'pill' }: { variant?: 'pill' | 'quiet' }) {
  const { lang, toggle } = useLang();

  if (variant === 'quiet') {
    return (
      <div className="flex items-center gap-2" role="group" aria-label="Language">
        <button
          onClick={() => lang !== 'en' && toggle()}
          aria-pressed={lang === 'en'}
          className="text-[12px] font-semibold tracking-[0.01em] transition-colors duration-200 hover:text-[var(--ink)]"
          style={{ color: lang === 'en' ? 'var(--ink)' : 'var(--ink-2)' }}
        >
          EN
        </button>
        <span
          aria-hidden="true"
          className="h-3 w-px shrink-0"
          style={{ background: 'var(--ink-2)', opacity: 0.35 }}
        />
        <button
          onClick={() => lang !== 'zh' && toggle()}
          aria-pressed={lang === 'zh'}
          className="text-[12px] font-semibold tracking-[0.01em] transition-colors duration-200 hover:text-[var(--ink)]"
          style={{ color: lang === 'zh' ? 'var(--ink)' : 'var(--ink-2)' }}
        >
          中文
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center rounded-full border p-0.5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      role="group"
      aria-label="Language"
    >
      <button
        onClick={() => lang !== 'en' && toggle()}
        aria-pressed={lang === 'en'}
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
        aria-pressed={lang === 'zh'}
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
