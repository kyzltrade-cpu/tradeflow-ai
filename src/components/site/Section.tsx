import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';
import PilotCTA from '@/components/landing/PilotCTA';

/* Shared section furniture for the marketing routes. Kept in one place so the
   numbered chapters, headings and the mock frame stay identical across Home,
   Product, Trust, Pricing and FAQ. */

/* Numbered act marker. The reference announces each chapter this way, which is
   what lets a long page read as a sequence instead of a stack. */
export function Chapter({ n, label }: { n: string; label: string }) {
  return (
    <div className="mb-10 flex items-center gap-4">
      <span className="eyebrow" style={{ color: 'var(--pine)' }}>
        {n}
      </span>
      <span className="eyebrow">{label}</span>
      <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
    </div>
  );
}

export function SectionHead({
  label,
  title,
  sub,
  align = 'left',
}: {
  label: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-4xl'}>
      <p className="eyebrow">{label}</p>
      <h2 className="display h-section mt-5 text-balance">{title}</h2>
      {sub && <p className="lede mt-5 max-w-2xl">{sub}</p>}
    </div>
  );
}

export function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
      <Check className="mt-[3px] h-4 w-4 shrink-0" style={{ color: 'var(--pine)' }} strokeWidth={2.5} />
      {children}
    </li>
  );
}

/* The mocks draw their own card; this only squares the corners to the page's
   radius so they read as part of the same system.

   They are pictures, not content. Left as ordinary DOM they pour roughly four
   hundred words of invented UI copy — invented companies, invented email
   addresses, invented prices — into the document, where a screen reader reads
   all of it and a crawler indexes it as if it were ours. `role="img"` collapses
   the whole subtree into the one-sentence label, and `data-nosnippet` keeps the
   demo strings out of search results. `translate="no"` stops a machine
   translation of the page from rewriting the sample data. */
export function MockFrame({
  children,
  className = '',
  label,
}: {
  children: ReactNode;
  className?: string;
  /** One sentence describing what the screen shows. Required, deliberately. */
  label: string;
}) {
  return (
    <div
      className={`mock-frame ${className}`}
      role="img"
      aria-label={label}
      data-nosnippet
      translate="no"
    >
      {children}
    </div>
  );
}

/* Closing ask, repeated at the foot of every marketing route so no page dead-ends. */
export function ClosingCTA({
  eyebrow,
  title,
  sub,
  image,
  t,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  /** Optional background photograph; the Home route uses one, subpages do not. */
  image?: string;
  t: (en: string, zh: string) => string;
}) {
  return (
    <section className="band-dark band-glow band-xl relative overflow-hidden">
      {image && (
        <Image
          src={image}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="object-cover"
          style={{ opacity: 0.65 }}
        />
      )}
      {/* Near-black first, photograph second — the band reads as ink with a
          hint of image behind it, not as a picture with text on top. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(52% 80% at 78% 46%, rgba(127,209,185,0.20) 0%, transparent 70%), linear-gradient(90deg, rgba(10,13,11,0.97) 0%, rgba(10,13,11,0.90) 42%, rgba(10,13,11,0.62) 72%, rgba(10,13,11,0.34) 100%)',
        }}
      />
      <div className="shell relative">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>
          {eyebrow}
        </p>
        <h2 className="display h-section mt-6 max-w-3xl text-balance">{title}</h2>
        <p className="lede mt-6 max-w-xl">{sub}</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <PilotCTA className="btn btn-primary" />
          <Link href="/signup" className="btn btn-outline">
            {t('Start free trial', '開始免費試用')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px]" style={{ color: 'var(--ink-2)' }}>
          {[
            t('Encrypted in transit and at rest', '傳輸與靜態皆加密'),
            t('Nothing sends without you', '未經您核准不會送出'),
            t('Delete your data any time', '隨時可刪除您的資料'),
          ].map((label) => (
            <li key={label} className="inline-flex items-center gap-2">
              <Check className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
