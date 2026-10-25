'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useMoonPortal, UseMoonPortalOptions } from '@/hooks/useMoonPortal'

export interface MoonPortalHeroProps extends UseMoonPortalOptions {
  /**
   * Image source URL for the blood-moon emblem circle.
   */
  emblemSrc: string

  /**
   * The next section content that gets revealed through the expanding moon portal.
   */
  next: React.ReactNode

  /**
   * Custom headline text lines (defaults to Arkham MUN standard headline).
   */
  headline?: {
    line1?: string
    line2?: string
    line3?: string
  }

  /**
   * Eyebrow banner above headline.
   */
  eyebrow?: React.ReactNode

  /**
   * Lead paragraph below headline.
   */
  lead?: string

  /**
   * Custom CTA row content.
   */
  cta?: React.ReactNode

  /**
   * Meta information row items (Date, Venue).
   */
  metaItems?: { label: string; value: string }[]

  /**
   * Additional custom CSS classes for the outer wrapper.
   */
  className?: string
}

export function MoonPortalHero({
  emblemSrc,
  next,
  headline = {
    line1: 'Question.',
    line2: 'Negotiate.',
    line3: 'Shape tomorrow.',
  },
  eyebrow = (
    <div className="flex items-center gap-2 text-[12px] font-bold tracking-[0.24em] text-[#e3262e] uppercase">
      <span className="inline-block w-2 h-2 rounded-full bg-[#e3262e] shadow-[0_0_8px_#e3262e] animate-pulse" />
      <span>10—11 April 2027 · Central Delhi</span>
    </div>
  ),
  lead = 'Arkham MUN is a Model United Nations conference built for voices ready to engage with diplomacy, challenge assumptions and turn ideas into action.',
  cta,
  metaItems = [
    { label: 'DATE', value: '10—11 APRIL 2027' },
    { label: 'VENUE', value: 'IN CENTRAL DELHI' },
  ],
  wrapperHeightMultiplier = 3.2,
  lerpFactor = 0.1,
  smoothScroll = true,
  petalCount = 26,
  emberCount = 70,
  ringGlowIntensity = 1.0,
  onProgress,
  className = '',
}: MoonPortalHeroProps) {
  const { refs, smoothScrollEnabled, toggleSmoothScroll, isReducedMotion } =
    useMoonPortal({
      wrapperHeightMultiplier,
      lerpFactor,
      smoothScroll,
      petalCount,
      emberCount,
      ringGlowIntensity,
      onProgress,
    })

  return (
    <div
      ref={refs.wrapperRef}
      className={`moon-portal-wrapper relative w-full bg-[#0a0608] text-white selection:bg-[#e3262e] selection:text-white ${className}`}
      style={{ height: `${wrapperHeightMultiplier * 100}vh` }}
    >
      {/* Sticky Pin Container (100vh viewport, pins during the 3.2x scroll sequence) */}
      <div
        ref={refs.pinRef}
        className="moon-portal-pin sticky top-0 h-screen w-full overflow-hidden bg-[#0a0608]"
        style={{ isolation: 'isolate' }}
      >
        {/* Top Scroll Progress Indicator */}
        <div
          ref={refs.progressBarRef}
          className="moon-portal-progress-bar fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#ff4a50] via-[#e3262e] to-[#8f0510] z-50 origin-left pointer-events-none"
          style={{ transform: 'scaleX(0)' }}
          aria-hidden="true"
        />

        {/* Hexagonal Background Grid Pattern */}
        <div
          ref={refs.hexBgRef}
          className="moon-portal-hex-bg absolute inset-0 pointer-events-none z-[1] will-change-transform opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 70% 30%, rgba(227, 38, 46, 0.12), transparent 45%),
              linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 48px 48px, 48px 48px',
          }}
          aria-hidden="true"
        />

        {/* Ambient blood-red site wash */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background:
              'radial-gradient(circle at 68% 35%, rgba(227, 38, 46, 0.18), transparent 50%), linear-gradient(180deg, rgba(10, 6, 8, 0.4) 0%, rgba(10, 6, 8, 0.95) 100%)',
          }}
          aria-hidden="true"
        />

        {/* ------------------------------------------------------------------- */}
        {/* LAYER 1: HERO CONTENT (z-2)                                         */}
        {/* ------------------------------------------------------------------- */}
        <section
          ref={refs.heroRef}
          className="moon-portal-hero absolute inset-0 z-[2] flex flex-col justify-between overflow-hidden will-change-transform px-4 sm:px-8 md:px-16 py-8 md:py-12"
          aria-label="Conference Hero"
        >
          {/* Main Hero Row: Headline on Left, Moon on Right */}
          <div className="moon-portal-hero-grid flex-1 flex flex-col md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center gap-8 md:gap-12 max-w-[1560px] mx-auto w-full pt-4 md:pt-8">
            {/* Left Content Column */}
            <div className="moon-portal-left-col flex flex-col justify-center items-start z-10 w-full">
              {/* Eyebrow */}
              <div
                ref={refs.eyebrowRef}
                className="moon-portal-eyebrow mb-4 will-change-transform font-['Cinzel',serif]"
              >
                {eyebrow}
              </div>

              {/* Headline with 3 distinct animated line blocks */}
              <h1 className="moon-portal-headline font-['Cinzel',serif] text-[clamp(2.4rem,5.5vw,5.2rem)] font-bold tracking-tight text-white leading-[1.08] mb-6 select-text">
                <span
                  ref={refs.headlineLine1Ref}
                  className="block will-change-transform"
                >
                  {headline.line1}
                </span>
                <span
                  ref={refs.headlineLine2Ref}
                  className="block will-change-transform italic text-[#ff4a50] drop-shadow-[0_0_18px_rgba(255,74,80,0.5)]"
                >
                  {headline.line2}
                </span>
                <span
                  ref={refs.headlineLine3Ref}
                  className="block will-change-transform"
                >
                  {headline.line3}
                </span>
              </h1>

              {/* Lead Paragraph */}
              <p
                ref={refs.leadRef}
                className="moon-portal-lead text-[clamp(15px,1.2vw,18px)] leading-[1.7] text-[#f4f1f1]/80 max-w-[560px] mb-8 will-change-transform select-text"
              >
                {lead}
              </p>

              {/* Call-to-action Row */}
              <div
                ref={refs.ctaRef}
                className="moon-portal-cta-row flex flex-wrap items-center gap-4 will-change-transform"
              >
                {cta ? (
                  cta
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-md font-semibold text-[14px] text-white bg-gradient-to-r from-[#e5252d] to-[#8f0510] shadow-[0_4px_24px_rgba(229,37,45,0.4)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(229,37,45,0.6)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4a50] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0608]"
                    >
                      <span>Register now</span>
                      <ArrowRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                    <a
                      href="#about"
                      className="inline-flex items-center gap-1.5 px-5 py-3 text-[14px] font-medium text-[#b9afb2] hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4a50] rounded-md"
                    >
                      <span>Explore Arkham</span>
                      <ChevronDown size={15} />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Blood Moon Emblem with SVG Rings */}
            <div className="moon-portal-moon-col flex items-center justify-center w-full z-10 order-first md:order-last">
              <div
                ref={refs.moonWrapperRef}
                className="moon-portal-moon-wrapper relative flex items-center justify-center w-[clamp(220px,40vmin,420px)] aspect-square will-change-transform"
                style={{ transformOrigin: 'center center' }}
              >
                {/* Red Radial Glow Layer Behind Moon */}
                <div
                  className="moon-glow absolute inset-[-20%] rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(227, 38, 46, 0.45) 0%, rgba(143, 5, 16, 0.2) 45%, transparent 70%)',
                    filter: 'blur(20px)',
                  }}
                  aria-hidden="true"
                />

                {/* SVG Rings with Dashed Circle & Scanning Arc */}
                <svg
                  className="moon-svg-rings absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="-100 -100 200 200"
                  aria-hidden="true"
                >
                  {/* Outer Thin Red Guide Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r="97"
                    fill="none"
                    stroke="#e3262e"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                  {/* Dashed Red Ring (slow continuous rotation) */}
                  <circle
                    ref={refs.moonDashedRingRef}
                    cx="0"
                    cy="0"
                    r="93"
                    fill="none"
                    stroke="#ff4a50"
                    strokeWidth="1.2"
                    strokeDasharray="6 8"
                    strokeOpacity="0.75"
                    style={{ transformOrigin: '0 0' }}
                  />
                  {/* Inner Tick Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r="88"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="2 12"
                    strokeOpacity="0.25"
                  />
                  {/* Bright Scanning Red Arc (accelerates with scroll velocity) */}
                  <circle
                    ref={refs.moonArcRef}
                    cx="0"
                    cy="0"
                    r="97"
                    fill="none"
                    stroke="#ff4a50"
                    strokeWidth="2.4"
                    strokeDasharray="70 540"
                    strokeLinecap="round"
                    style={{
                      transformOrigin: '0 0',
                      filter: 'drop-shadow(0 0 6px #ff4a50)',
                    }}
                  />
                </svg>

                {/* Moon Emblem Circular Disc (Radius r0 ≈ 0.39 * wrapper width) */}
                <div
                  className="moon-emblem-disc relative w-[78%] h-[78%] rounded-full overflow-hidden border-2 border-white/40 shadow-[0_0_35px_rgba(227,38,46,0.65),inset_0_0_20px_rgba(0,0,0,0.8)]"
                  style={{
                    backgroundColor: '#120508',
                  }}
                >
                  <img
                    src={emblemSrc}
                    alt="Arkham Model United Nations Blood Moon Emblem"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Meta Info Row */}
          <div className="moon-portal-bottom-row max-w-[1560px] mx-auto w-full pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-6 z-10">
            <div className="moon-portal-info-row flex flex-wrap items-center gap-8 md:gap-16">
              {metaItems.map((item, idx) => (
                <div
                  key={item.label}
                  ref={(el) => {
                    refs.infoItemsRef.current[idx] = el
                  }}
                  className="moon-portal-info-item flex flex-col will-change-transform"
                >
                  <span className="text-[11px] font-bold tracking-[0.2em] text-[#8c8ba4] font-['Cinzel',serif]">
                    {item.label}
                  </span>
                  <span className="text-[14px] md:text-[15px] font-semibold text-white tracking-wide">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Smooth Scroll Lerp Toggle Switch */}
            <button
              onClick={toggleSmoothScroll}
              type="button"
              className="text-[11px] font-medium tracking-wider uppercase px-3 py-1.5 rounded border border-white/15 text-[#8c8ba4] hover:text-white hover:border-white/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff4a50]"
              title="Toggle between cinematic lerp smooth-scrolling and native scroll response"
            >
              Smooth Scroll: {smoothScrollEnabled ? 'ON (0.1)' : 'OFF'}
            </button>
          </div>
        </section>

        {/* ------------------------------------------------------------------- */}
        {/* LAYER 2: NEXT SECTION REVEALED THROUGH PORTAL (z-3)                 */}
        {/* ------------------------------------------------------------------- */}
        <section
          ref={refs.nextSectionRef}
          className="moon-portal-next-section absolute inset-0 z-[3] w-full h-full overflow-y-auto will-change-[clip-path,transform,opacity]"
          style={{
            clipPath: 'circle(0px at 50% 50%)',
            WebkitClipPath: 'circle(0px at 50% 50%)',
            opacity: 0,
            visibility: 'hidden',
          }}
          aria-label="Next Section Revealed"
        >
          {next}
        </section>

        {/* ------------------------------------------------------------------- */}
        {/* LAYER 3: GLOWING RED PORTAL RING (#portal-ring) (z-4)               */}
        {/* ------------------------------------------------------------------- */}
        <div
          ref={refs.portalRingRef}
          id="portal-ring"
          className="absolute rounded-full border-2 border-[#ff4a50] pointer-events-none will-change-transform z-[4]"
          style={{
            opacity: 0,
            transformOrigin: 'center center',
          }}
          aria-hidden="true"
        />

        {/* ------------------------------------------------------------------- */}
        {/* LAYER 4: PARTICLES CANVAS OVERLAY (z-5)                             */}
        {/* ------------------------------------------------------------------- */}
        <canvas
          ref={refs.canvasRef}
          className="moon-portal-canvas absolute inset-0 pointer-events-none z-[5] w-full h-full"
          aria-hidden="true"
        />

        {/* ------------------------------------------------------------------- */}
        {/* LAYER 5: SCROLL TO EXPLORE CUE (z-6)                                */}
        {/* ------------------------------------------------------------------- */}
        <div
          ref={refs.scrollCueRef}
          className="moon-portal-scroll-cue absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-[6] select-none"
          aria-hidden="true"
        >
          <span className="text-[10px] font-bold tracking-[0.28em] text-[#b9afb2] uppercase font-['Cinzel',serif]">
            SCROLL TO EXPLORE
          </span>
          <div className="w-[1px] h-9 bg-white/20 relative overflow-hidden">
            <div
              ref={refs.scrollCueLineRef}
              className="absolute top-0 left-0 w-full h-full bg-[#ff4a50] origin-top shadow-[0_0_8px_#ff4a50]"
              style={{ transform: 'scaleY(0)' }}
            />
          </div>
        </div>
      </div>

      {/* Reduced Motion Fallback Static Banner */}
      {isReducedMotion && (
        <div className="sr-only">
          Reduced motion enabled. The portal transition animation is disabled.
        </div>
      )}
    </div>
  )
}

export default MoonPortalHero
