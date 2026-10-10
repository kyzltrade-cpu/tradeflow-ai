'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// global-error replaces the root layout, so it does NOT get globals.css, the
// font variables, or LangProvider. Every style here is inline and the copy is
// English-only by necessity — reaching for useLang here would throw inside the
// boundary that is supposed to catch failures. The values below are the landing
// palette written out by hand so a total boot failure still looks like Sailwise.
const INK = '#0A0D0B';
const CREAM = '#F7F4ED';
const MUTED = 'rgba(247,244,237,0.72)';
const FAINT = 'rgba(247,244,237,0.5)';
const ACCENT = '#7FD1B9';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled root error', error.digest ?? '(no digest)');
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 24px',
          background: INK,
          color: CREAM,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <img
              src="/brand/sailwise-mark.png"
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span style={{ fontSize: '18px', fontWeight: 500 }}>Sailwise</span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: ACCENT,
            }}
          >
            Error
          </p>
          <h1
            style={{
              margin: '24px 0 0',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 500,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
            }}
          >
            Sailwise could not start.
          </h1>
          <p style={{ margin: '24px 0 0', fontSize: '17px', lineHeight: 1.65, color: MUTED, maxWidth: '32rem' }}>
            A problem stopped the app from loading. Trying again often fixes it.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '36px' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: 'pointer',
                borderRadius: '3px',
                border: `1px solid ${CREAM}`,
                padding: '12px 22px',
                fontSize: '15px',
                fontWeight: 500,
                background: CREAM,
                color: INK,
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '3px',
                border: `1px solid rgba(247,244,237,0.28)`,
                padding: '12px 22px',
                fontSize: '15px',
                fontWeight: 500,
                color: CREAM,
                textDecoration: 'none',
              }}
            >
              Go to homepage
            </Link>
          </div>

          {error.digest ? (
            <p style={{ margin: '32px 0 0', fontSize: '12.5px', color: FAINT }}>
              Reference: <code>{error.digest}</code>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
