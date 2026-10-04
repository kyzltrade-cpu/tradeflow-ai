'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/billing-plans';
import { useLang } from '@/lib/lang';

type PricingPriceProps = {
  monthly: string;
  annual: string;
  annualTotal?: number;
  period?: string;
};

export default function PricingPrice({ monthly, annual, annualTotal, period = '/mo' }: PricingPriceProps) {
  const { t } = useLang();
  const [mode, setMode] = useState<'monthly' | 'annual'>('monthly');
  const price = mode === 'monthly' ? monthly : annual;

  return (
    <div className="mt-2 mb-7">
      <div className="flex items-baseline gap-2.5">
        <span
          key={mode}
          className="btk-anim-fade-down display inline-block text-[2.75rem] leading-none tabular-nums"
        >
          {price}
        </span>
        <span className="text-[14px] text-[var(--ink-3)]">{period}</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          className="inline-flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ border: '1px solid var(--hairline)' }}
        >
          {(['monthly', 'annual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className="cursor-pointer rounded-[6px] px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--pine)]/30 focus-visible:outline-none"
              style={
                mode === m
                  ? { background: 'var(--ink)', color: '#faf7f2' }
                  : { color: 'var(--ink-2)' }
              }
            >
              {m === 'monthly' ? 'Monthly' : 'Annual'}
            </button>
          ))}
        </div>
        <span
          className="text-[12.5px] tabular-nums transition-colors duration-200"
          style={{ color: mode === 'annual' ? 'var(--pine)' : 'var(--ink-3)' }}
        >
          {mode === 'monthly'
            ? t('Save 20% with annual', '年繳可慳 20%')
            : `${formatPrice(annualTotal ?? 0)} saved / yr`}
        </span>
      </div>
    </div>
  );
}
