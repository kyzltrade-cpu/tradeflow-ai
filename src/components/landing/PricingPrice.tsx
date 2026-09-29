'use client';

import { useState } from 'react';
import { useLang } from '@/lib/lang';

type PricingPriceProps = {
  monthly: string;
  annual: string;
  period?: string;
};

export default function PricingPrice({ monthly, annual, period = '/mo' }: PricingPriceProps) {
  const { t } = useLang();
  const [mode, setMode] = useState<'monthly' | 'annual'>('monthly');
  const price = mode === 'monthly' ? monthly : annual;

  return (
    <div className="mt-1 mb-6">
      <div className="flex items-baseline gap-2">
        <span
          key={mode}
          className="btk-anim-fade-down inline-block text-4xl font-bold tracking-tight tabular-nums"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {price}
        </span>
        <span className="text-sm" style={{ color: '#555555' }}>
          {period}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <div
          className="inline-flex items-center rounded-full p-1"
          style={{ background: '#FAFAFA', border: '1px solid #E0E0E0' }}
        >
          {(['monthly', 'annual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className="rounded-full px-3.5 py-1 text-[11px] font-semibold transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              style={mode === m ? { background: '#000', color: '#fff' } : { color: '#555' }}
            >
              {m === 'monthly' ? 'Monthly' : 'Annual'}
            </button>
          ))}
        </div>
        <span
          className="hidden sm:inline text-[12px] font-medium tabular-nums transition-colors duration-300"
          style={{ color: mode === 'annual' ? 'var(--accent)' : '#9A9A9A' }}
        >
          {mode === 'monthly' ? t('Save 20% with annual', '年繳可慳 20%') : 'HK$3,792 saved / yr'}
        </span>
      </div>
    </div>
  );
}