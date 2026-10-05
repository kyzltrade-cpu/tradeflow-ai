'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// global-error replaces the root layout, so it does NOT get globals.css, the
// font variables, or LangProvider. Every style here is inline and the copy is
// English-only by necessity — reaching for useLang here would throw inside the
// boundary that is supposed to catch failures.
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
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#FFFFFF',
          color: '#0A0A0A',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div
            style={{
              border: '1px solid #E5E5E5',
              borderRadius: '12px',
              padding: '28px',
              background: '#FFFFFF',
            }}
          >
            <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 600, letterSpacing: '-0.5px' }}>
              Sailwise could not start
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.6, color: '#555555' }}>
              A problem stopped the app from loading. Trying again often fixes it.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  cursor: 'pointer',
                  borderRadius: '8px',
                  border: 'none',
                  padding: '10px 16px',
                  fontSize: '15px',
                  fontWeight: 500,
                  background: '#000000',
                  color: '#FFFFFF',
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid #E5E5E5',
                  padding: '10px 16px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#0A0A0A',
                  textDecoration: 'none',
                }}
              >
                Go to homepage
              </Link>
            </div>

            {error.digest ? (
              <p style={{ margin: '20px 0 0', fontSize: '12px', color: '#555555' }}>
                Reference: <code>{error.digest}</code>
              </p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
