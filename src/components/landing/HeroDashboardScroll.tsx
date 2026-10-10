'use client';

import { useEffect, useRef, useState } from 'react';
import { HeroProduct, OpportunitiesPageMock } from './ProductMocks';

/* The hero preview, made scroll-driven.

   There is no separate "how it works" section — the dashboard that sits under
   the headline is the demo. As it pins to the viewport the attachment is read,
   the spec rail fills, the reply is drafted, and the finished thread resolves
   into the opportunity it produced (the real pipeline screen).

   The pin only happens at >=1024px. Below that the finished dashboard renders
   statically, so a phone never gets a trapped scroll or an empty card. */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/* One sentence for the whole animation — assistive tech gets this instead of
   every intermediate frame's worth of demo copy. */
const LABEL =
  'A product walkthrough: an enquiry is read, the spec rail fills from the email and from prior records, the reply is drafted, and the thread resolves into a quote-ready opportunity.';

// Keep the pinned preview clear of the fixed header (top) and the viewport
// bottom. If the card is taller than the space between them we scale it down so
// nothing is ever cut off.
const TOP_PAD = 96;
const BOTTOM_PAD = 32;

export default function HeroDashboardScroll() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [fit, setFit] = useState(1);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const el = trackRef.current;
      if (!el) return;
      const travel = el.offsetHeight - window.innerHeight;
      setP(travel > 0 ? clamp01(-el.getBoundingClientRect().top / travel) : 0);

      const stage = stageRef.current;
      if (stage) {
        const natural = stage.offsetHeight;
        const avail = window.innerHeight - TOP_PAD - BOTTOM_PAD;
        setFit(natural > 0 ? Math.min(1, avail / natural) : 1);
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, []);

// The spec checklist is on screen first; the enquiry then lands, the values
  // fill source by source, the reply is drafted, and only then does the thread
  // resolve into the opportunity it produced. The thread resolves at p=0.55 so
  // the last reply holds on screen, the crossover runs, and the opportunity page
  // then stays pinned for the whole tail — the visitor dwells on it instead of
  // scrolling straight past.
  const thread = clamp01(p / 0.44);
  const dashFade = clamp01((p - 0.5) / 0.07);
  const oppFade = clamp01((p - 0.53) / 0.05);
  const rowHighlight = clamp01((p - 0.62) / 0.08);
  const handoffFade = clamp01((p - 0.51) / 0.07);

  return (
    <>
      {/* Phones and tablets — the finished dashboard, static. */}
      <div className="mx-auto mt-10 max-w-5xl px-6 md:mt-12 lg:hidden">
        {/* A phone gets a preview, not the whole screen. The mock stacks into a
            single column down here and runs for four viewports, so it is cropped
            to the part that tells the story — the thread and the drafted reply —
            and faded out rather than cut, so it reads as continuing. */}
        <div
          className="relative overflow-hidden"
          style={{ maxHeight: 460 }}
          role="img"
          aria-label="A product walkthrough: an enquiry is read, the spec rail fills from the email and from prior records, the reply is drafted, and the thread resolves into a quote-ready opportunity."
          data-nosnippet
          translate="no"
        >
          <HeroProduct />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
            style={{ background: 'linear-gradient(180deg, rgba(10,13,11,0) 0%, rgba(10,13,11,0.92) 100%)' }}
          />
        </div>
      </div>

      {/* Desktop — the preview is the motion. Restored to the authored length:
          this is the demo from the live site, and shortening the track only
          speeds the same sequence up. */}
      <div
        ref={trackRef}
        className="relative hidden lg:block"
        style={{ height: '1020vh' }}
        role="img"
        aria-label={LABEL}
        data-nosnippet
        translate="no"
      >
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6 pb-4 pt-[80px]">
          <div
            ref={stageRef}
            className="relative w-full max-w-5xl"
            style={{ transform: `scale(${fit})`, transformOrigin: 'center center' }}
          >
            <div
              style={{
                opacity: 1 - dashFade,
                transform: `translateY(${-14 * dashFade}px) scale(${1 - 0.02 * dashFade})`,
              }}
            >
              <HeroProduct p={thread} />
            </div>
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ opacity: oppFade, transform: `translateY(${(1 - oppFade) * 16}px)` }}
            >
              <div className="w-full">
                <OpportunitiesPageMock highlight={rowHighlight} />
              </div>
            </div>
          </div>

          {/* Hand-off caption: names what just happened so the screen change
              reads as one flow (capture → opportunity) rather than a cut. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center"
            style={{ opacity: handoffFade, transform: `translateY(${(1 - handoffFade) * 10}px)` }}
          >
            <div
              className="flex items-center gap-2 rounded-full border bg-white/95 px-3.5 py-1.5 text-[12px] font-medium shadow-[0_10px_30px_rgba(15,23,42,0.14)] backdrop-blur"
              style={{ borderColor: '#E4E7EC', color: '#667085' }}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: '#E8F5F1' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#038153" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              Specs captured
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <span style={{ color: '#101828' }}>Quote-ready opportunity</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}