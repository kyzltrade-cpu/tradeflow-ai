'use client';

import { useState } from 'react';

type PricingPriceProps = {
  monthly: string;
  annual: string;
  period?: string;
};

export default function PricingPrice({ monthly, annual, period = '/mo' }: PricingPriceProps) {
  const [mode, setMode] = useState<'monthly' | 'annual'>('monthly');
  const price = mode === 'monthly' ? monthly : annual;

  return (
    <div className="mt-1 mb-6">
      <div className="flex items-baseline gap-1.5">
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
        <span
          className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: '#F4F4F4', color: '#000', border: '1px solid #E0E0E0' }}
        >
          {mode === 'monthly' ? 'Save 20% annually' : 'HK$3,792 saved / yr'}
        </span>
      </div>
      <div
        className="mt-5 inline-flex items-center rounded-full p-1"
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
    </div>
  );
}