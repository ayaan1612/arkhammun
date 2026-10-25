'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface UseMoonPortalOptions {
  /**
   * Height multiplier for the tall scroll wrapper relative to viewport height.
   * Default: 3.2 (meaning 320vh total scroll distance).
   */
  wrapperHeightMultiplier?: number

  /**
   * Lerp smoothing factor for scroll position interpolation (0.01 - 1.0).
   * Lower values = more sluggish/cinematic, higher = snappier.
   * Default: 0.1
   */
  lerpFactor?: number

  /**
   * Enable or disable smooth lerp interpolation on scroll.
   * If false, raw scrollY is used directly without interpolation lag.
   * Default: true
   */
  smoothScroll?: boolean

  /**
   * Number of drifting crimson petals falling in canvas particle system.
   * Default: 26
   */
  petalCount?: number

  /**
   * Maximum simultaneous glowing embers emitting from moon edge.
   * Default: 70
   */
  emberCount?: number

  /**
   * Multiplier for the glowing red portal ring (#portal-ring) box-shadow spread.
   * Default: 1.0
   */
  ringGlowIntensity?: number

  /**
   * Callback fired every frame with current progress p (0..1) and eased progress e (0..1).
   */
  onProgress?: (p: number, e: number) => void
}

export interface MoonPortalRefs {
  wrapperRef: React.RefObject<HTMLDivElement | null>
  pinRef: React.RefObject<HTMLDivElement | null>
  heroRef: React.RefObject<HTMLElement | null>
  nextSectionRef: React.RefObject<HTMLElement | null>
  moonWrapperRef: React.RefObject<HTMLDivElement | null>
  moonArcRef: React.RefObject<SVGCircleElement | null>
  moonDashedRingRef: React.RefObject<SVGCircleElement | null>
  portalRingRef: React.RefObject<HTMLDivElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  progressBarRef: React.RefObject<HTMLDivElement | null>
  scrollCueRef: React.RefObject<HTMLDivElement | null>
  scrollCueLineRef: React.RefObject<HTMLDivElement | null>
  headlineLine1Ref: React.RefObject<HTMLSpanElement | null>
  headlineLine2Ref: React.RefObject<HTMLSpanElement | null>
  headlineLine3Ref: React.RefObject<HTMLSpanElement | null>
  eyebrowRef: React.RefObject<HTMLDivElement | null>
  leadRef: React.RefObject<HTMLParagraphElement | null>
  ctaRef: React.RefObject<HTMLDivElement | null>
  infoItemsRef: React.MutableRefObject<(HTMLDivElement | null)[]>
  hexBgRef: React.RefObject<HTMLDivElement | null>
}

// Mathematical helpers
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

interface PetalParticle {
  x: number
  y: number
  vx: number
  baseVy: number
  size: number
  rotation: number
  rotSpeed: number
  swayAmp: number
  swayFreq: number
  swayPhase: number
  opacity: number
}

interface EmberParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  decay: number
  color: string
}

export function useMoonPortal(options: UseMoonPortalOptions = {}) {
  const {
    wrapperHeightMultiplier = 3.2,
    lerpFactor = 0.1,
    smoothScroll: initialSmoothScroll = true,
    petalCount = 26,
    emberCount = 70,
    ringGlowIntensity = 1.0,
    onProgress,
  } = options

  // Toggle state for smooth scroll lerp
  const [smoothScrollEnabled, setSmoothScrollEnabled] = useState(initialSmoothScroll)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  // DOM element references
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const pinRef = useRef<HTMLDivElement | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)
  const nextSectionRef = useRef<HTMLElement | null>(null)
  const moonWrapperRef = useRef<HTMLDivElement | null>(null)
  const moonArcRef = useRef<SVGCircleElement | null>(null)
  const moonDashedRingRef = useRef<SVGCircleElement | null>(null)
  const portalRingRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const scrollCueRef = useRef<HTMLDivElement | null>(null)
  const scrollCueLineRef = useRef<HTMLDivElement | null>(null)

  // Animated text & UI refs
  const headlineLine1Ref = useRef<HTMLSpanElement | null>(null)
  const headlineLine2Ref = useRef<HTMLSpanElement | null>(null)
  const headlineLine3Ref = useRef<HTMLSpanElement | null>(null)
  const eyebrowRef = useRef<HTMLDivElement | null>(null)
  const leadRef = useRef<HTMLParagraphElement | null>(null)
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const infoItemsRef = useRef<(HTMLDivElement | null)[]>([])
  const hexBgRef = useRef<HTMLDivElement | null>(null)

  // Animation runtime measurements & state (stored in refs to avoid React renders)
  const geoRef = useRef({
    cx: 0,
    cy: 0,
    r0: 0,
    R: 0,
    wrapperTop: 0,
    scrollDistance: 0,
    viewportW: 0,
    viewportH: 0,
  })

  const animRef = useRef({
    targetY: 0,
    smoothedY: 0,
    prevY: 0,
    scrollVelocity: 0,
    arcAngle: 0,
    dashedAngle: 0,
    rafId: 0,
  })

  // Measure moon center, radius, and farthest viewport corner
  const measure = useCallback(() => {
    if (typeof window === 'undefined') return
    const wrapper = wrapperRef.current
    const pin = pinRef.current
    const moon = moonWrapperRef.current
    if (!wrapper || !pin || !moon) return

    const vpW = window.innerWidth
    const vpH = window.innerHeight
    const pinRect = pin.getBoundingClientRect()
    const moonRect = moon.getBoundingClientRect()

    // Center coordinates of the moon relative to the sticky pin element
    const cx = moonRect.left - pinRect.left + moonRect.width / 2
    const cy = moonRect.top - pinRect.top + moonRect.height / 2

    // Radius of the emblem circle (approximately 0.39 x moon wrapper width)
    const r0 = Math.max(30, moonRect.width * 0.39)

    // Farthest viewport corner from moon center + 30px buffer
    const dTL = Math.hypot(cx, cy)
    const dTR = Math.hypot(vpW - cx, cy)
    const dBL = Math.hypot(cx, vpH - cy)
    const dBR = Math.hypot(vpW - cx, vpH - cy)
    const R = Math.max(dTL, dTR, dBL, dBR) + 30

    // Wrapper top coordinate in document
    const wrapperRect = wrapper.getBoundingClientRect()
    const currentScroll = window.scrollY || window.pageYOffset || 0
    const wrapperTop = wrapperRect.top + currentScroll
    const wrapperHeight = wrapperRect.height
    const scrollDistance = Math.max(1, wrapperHeight - vpH)

    geoRef.current = {
      cx,
      cy,
      r0,
      R,
      wrapperTop,
      scrollDistance,
      viewportW: vpW,
      viewportH: vpH,
    }

    // Initialize portal ring initial dimensions
    const portalRing = portalRingRef.current
    if (portalRing) {
      portalRing.style.left = `${(cx - r0).toFixed(1)}px`
      portalRing.style.top = `${(cy - r0).toFixed(1)}px`
      portalRing.style.width = `${(2 * r0).toFixed(1)}px`
      portalRing.style.height = `${(2 * r0).toFixed(1)}px`
    }
  }, [])

  // Listen for reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(media.matches)

    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches)
    if (media.addEventListener) {
      media.addEventListener('change', handler)
      return () => media.removeEventListener('change', handler)
    }
  }, [])

  // Setup listeners for re-measuring on resize, load, and font ready
  useEffect(() => {
    if (typeof window === 'undefined') return

    measure()
    const onResize = () => measure()
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('load', onResize, { passive: true })

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => measure()).catch(() => {})
    }

    const t1 = setTimeout(measure, 150)
    const t2 = setTimeout(measure, 600)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onResize)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [measure])

  // Main Scroll & Animation Loop
  useEffect(() => {
    if (typeof window === 'undefined') return

    const canvas = canvasRef.current
    let ctx: CanvasRenderingContext2D | null = null
    let dpr = 1

    if (canvas) {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      ctx = canvas.getContext('2d')
    }

    // Resize canvas buffer
    const resizeCanvas = () => {
      if (!canvas || !ctx) return
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas, { passive: true })

    // Initialize 26 Drifting Red Petals
    const petals: PetalParticle[] = []
    const vpW = window.innerWidth
    const vpH = window.innerHeight
    for (let i = 0; i < petalCount; i++) {
      petals.push({
        x: Math.random() * vpW,
        y: Math.random() * vpH,
        vx: (Math.random() - 0.5) * 0.6,
        baseVy: Math.random() * 0.9 + 0.6,
        size: Math.random() * 5 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        swayAmp: Math.random() * 0.8 + 0.4,
        swayFreq: Math.random() * 0.025 + 0.015,
        swayPhase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.4 + 0.5,
      })
    }

    // Initialize Embers (max 70)
    const embers: EmberParticle[] = []
    const emberColors = ['#ff4a50', '#ff7043', '#ff9800', '#ff3d00', '#ffc107']

    const spawnEmber = (cx: number, cy: number, r0: number) => {
      if (embers.length >= emberCount) return
      const angle = Math.random() * Math.PI * 2
      const spawnDist = r0 * (1.02 + Math.random() * 0.08)
      const x = cx + Math.cos(angle) * spawnDist
      const y = cy + Math.sin(angle) * spawnDist
      const outwardSpeed = Math.random() * 0.7 + 0.3

      embers.push({
        x,
        y,
        vx: Math.cos(angle) * outwardSpeed + (Math.random() - 0.5) * 0.4,
        vy: Math.sin(angle) * outwardSpeed - (Math.random() * 1.6 + 0.8),
        size: Math.random() * 2.2 + 1.2,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.012,
        color: emberColors[Math.floor(Math.random() * emberColors.length)],
      })
    }

    // Scroll listener captures window.scrollY
    const onScroll = () => {
      animRef.current.targetY = window.scrollY || window.pageYOffset || 0
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    animRef.current.targetY = window.scrollY || window.pageYOffset || 0
    animRef.current.smoothedY = animRef.current.targetY
    animRef.current.prevY = animRef.current.targetY

    let running = true

    // =========================================================================
    // FRAME LOOP
    // =========================================================================
    const tick = () => {
      if (!running) return

      const anim = animRef.current
      const geo = geoRef.current

      // Lerp smooth scrollY or use target directly if toggled off
      if (smoothScrollEnabled) {
        anim.smoothedY += (anim.targetY - anim.smoothedY) * lerpFactor
      } else {
        anim.smoothedY = anim.targetY
      }

      // Calculate instantaneous scroll velocity
      anim.scrollVelocity = Math.abs(anim.targetY - anim.prevY)
      anim.prevY = anim.targetY

      // Calculate normalized progress p in [0, 1]
      const p = clamp(
        (anim.smoothedY - geo.wrapperTop) / (geo.scrollDistance || 1),
        0,
        1
      )

      // Reduced motion bypass
      if (isReducedMotion) {
        if (onProgress) onProgress(p, p)
        anim.rafId = requestAnimationFrame(tick)
        return
      }

      // Cubic ease in-out
      const e = easeInOutCubic(p)

      // Moon portal expansion geometry
      const { cx, cy, r0, R, viewportW } = geo
      const r = r0 + (R - r0) * e
      const s = r0 > 0 ? r / r0 : 1

      // -----------------------------------------------------------------------
      // 1. Next Section Reveal Style Updates
      // -----------------------------------------------------------------------
      const nextEl = nextSectionRef.current
      if (nextEl) {
        const nextOpacity = clamp((p - 0.2) / 0.12, 0, 1)
        const nextScale = 1.12 - 0.12 * e

        nextEl.style.clipPath = `circle(${r.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`
        ;(nextEl.style as any).webkitClipPath = `circle(${r.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`
        nextEl.style.opacity = nextOpacity.toFixed(3)
        nextEl.style.transformOrigin = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`
        nextEl.style.transform = `scale(${nextScale.toFixed(4)})`
        nextEl.style.pointerEvents = p > 0.32 ? 'auto' : 'none'
        nextEl.style.visibility = p > 0.18 ? 'visible' : 'hidden'
      }

      // -----------------------------------------------------------------------
      // 2. Moon Wrapper Transform & Opacity
      // -----------------------------------------------------------------------
      const moonEl = moonWrapperRef.current
      if (moonEl) {
        const moonOpacity = clamp(1 - (p - 0.3) / 0.28, 0, 1)
        moonEl.style.transform = `scale(${s.toFixed(4)})`
        moonEl.style.opacity = moonOpacity.toFixed(3)
        moonEl.style.pointerEvents = p < 0.25 ? 'auto' : 'none'
      }

      // -----------------------------------------------------------------------
      // 3. Moon Rings (Dashed ring rotation + velocity-accelerated scanning arc)
      // -----------------------------------------------------------------------
      anim.dashedAngle = (anim.dashedAngle + 0.22) % 360
      anim.arcAngle += 0.75 + Math.min(anim.scrollVelocity * 0.14, 8)

      if (moonDashedRingRef.current) {
        moonDashedRingRef.current.style.transform = `rotate(${anim.dashedAngle.toFixed(2)}deg)`
      }
      if (moonArcRef.current) {
        moonArcRef.current.style.transform = `rotate(${anim.arcAngle.toFixed(2)}deg)`
      }

      // -----------------------------------------------------------------------
      // 4. Glowing Red Ring (#portal-ring)
      // -----------------------------------------------------------------------
      const ringEl = portalRingRef.current
      if (ringEl) {
        const ringOpacity = p <= 0.02 ? 0 : clamp(1 - (p - 0.55) / 0.4, 0, 1)
        ringEl.style.transform = `scale(${s.toFixed(4)})`
        ringEl.style.opacity = ringOpacity.toFixed(3)
        ringEl.style.boxShadow = `0 0 ${(22 * ringGlowIntensity).toFixed(1)}px rgba(255, 74, 80, 0.85), inset 0 0 ${(14 * ringGlowIntensity).toFixed(1)}px rgba(255, 74, 80, 0.65)`
      }

      // -----------------------------------------------------------------------
      // 5. Headline Text Translation & Opacity
      // -----------------------------------------------------------------------
      const headlineOpacity = clamp(1 - p * 2.6, 0, 1)
      const moveUpY = -e * 40
      const splitX = e * 0.55 * viewportW

      if (headlineLine1Ref.current) {
        headlineLine1Ref.current.style.transform = `translate3d(${(-splitX).toFixed(1)}px, ${moveUpY.toFixed(1)}px, 0)`
        headlineLine1Ref.current.style.opacity = headlineOpacity.toFixed(3)
      }
      if (headlineLine2Ref.current) {
        headlineLine2Ref.current.style.transform = `translate3d(${splitX.toFixed(1)}px, ${moveUpY.toFixed(1)}px, 0)`
        headlineLine2Ref.current.style.opacity = headlineOpacity.toFixed(3)
      }
      if (headlineLine3Ref.current) {
        headlineLine3Ref.current.style.transform = `translate3d(${(-splitX).toFixed(1)}px, ${moveUpY.toFixed(1)}px, 0)`
        headlineLine3Ref.current.style.opacity = headlineOpacity.toFixed(3)
      }

      // -----------------------------------------------------------------------
      // 6. Eyebrow, Lead & CTA Row
      // -----------------------------------------------------------------------
      const uiOpacity = clamp(1 - p * 3, 0, 1)

      if (eyebrowRef.current) {
        eyebrowRef.current.style.opacity = uiOpacity.toFixed(3)
        eyebrowRef.current.style.transform = `translate3d(0, ${(p * 35).toFixed(1)}px, 0)`
      }
      if (leadRef.current) {
        leadRef.current.style.opacity = uiOpacity.toFixed(3)
        leadRef.current.style.transform = `translate3d(0, ${(p * 70).toFixed(1)}px, 0)`
      }
      if (ctaRef.current) {
        ctaRef.current.style.opacity = uiOpacity.toFixed(3)
        ctaRef.current.style.transform = `translate3d(0, ${(p * 90).toFixed(1)}px, 0)`
        ctaRef.current.style.pointerEvents = p < 0.15 ? 'auto' : 'none'
      }

      // -----------------------------------------------------------------------
      // 7. Info Row Items (Date, Venue, Deadline)
      // -----------------------------------------------------------------------
      const infoOpacity = clamp(1 - p * 2.4, 0, 1)
      infoItemsRef.current.forEach((item, idx) => {
        if (!item) return
        const moveDown = p * (60 + idx * 30)
        item.style.opacity = infoOpacity.toFixed(3)
        item.style.transform = `translate3d(0, ${moveDown.toFixed(1)}px, 0)`
      })

      // -----------------------------------------------------------------------
      // 8. Hex-pattern Background
      // -----------------------------------------------------------------------
      if (hexBgRef.current) {
        hexBgRef.current.style.transform = `translate3d(0, ${(p * 60).toFixed(1)}px, 0)`
      }

      // -----------------------------------------------------------------------
      // 9. Scroll Cue
      // -----------------------------------------------------------------------
      if (scrollCueRef.current) {
        const cueOpacity = clamp(1 - p / 0.17, 0, 1)
        scrollCueRef.current.style.opacity = cueOpacity.toFixed(3)
      }
      if (scrollCueLineRef.current) {
        const lineFill = clamp(p / 0.17, 0, 1)
        scrollCueLineRef.current.style.transform = `scaleY(${lineFill.toFixed(3)})`
      }

      // -----------------------------------------------------------------------
      // 10. Top Progress Bar
      // -----------------------------------------------------------------------
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${p.toFixed(4)})`
      }

      // -----------------------------------------------------------------------
      // 11. Canvas Particles (26 Petals & Up to 70 Embers)
      // -----------------------------------------------------------------------
      const particleAlpha = clamp(1 - p * 1.8, 0, 1)
      if (ctx && canvas) {
        if (particleAlpha <= 0) {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        } else {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
          const w = window.innerWidth
          const h = window.innerHeight

          // Draw Drifting Petals
          const scrollBoost = Math.min(anim.scrollVelocity * 0.08, 4)
          for (let i = 0; i < petals.length; i++) {
            const pet = petals[i]
            pet.swayPhase += pet.swayFreq
            pet.x += pet.vx + Math.sin(pet.swayPhase) * pet.swayAmp
            pet.y += pet.baseVy + scrollBoost
            pet.rotation += pet.rotSpeed

            // Wrap off-screen
            if (pet.y > h + 20) {
              pet.y = -20
              pet.x = Math.random() * w
            } else if (pet.x < -20) {
              pet.x = w + 10
            } else if (pet.x > w + 20) {
              pet.x = -10
            }

            ctx.save()
            ctx.translate(pet.x, pet.y)
            ctx.rotate(pet.rotation)
            ctx.globalAlpha = pet.opacity * particleAlpha

            ctx.beginPath()
            ctx.moveTo(0, -pet.size)
            ctx.bezierCurveTo(pet.size * 0.75, -pet.size * 0.4, pet.size * 0.75, pet.size * 0.5, 0, pet.size)
            ctx.bezierCurveTo(-pet.size * 0.75, pet.size * 0.5, -pet.size * 0.75, -pet.size * 0.4, 0, -pet.size)
            ctx.fillStyle = '#e3262e'
            ctx.fill()
            ctx.restore()
          }

          // Spawn Embers from outside moon boundary
          if (p < 0.5 && r0 > 20) {
            spawnEmber(cx, cy, r0)
            if (anim.scrollVelocity > 2) spawnEmber(cx, cy, r0)
          }

          // Render Embers with "lighter" blend mode
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'

          for (let i = embers.length - 1; i >= 0; i--) {
            const emb = embers[i]
            emb.x += emb.vx
            emb.y += emb.vy
            emb.life -= emb.decay

            if (emb.life <= 0 || emb.y < -30) {
              embers.splice(i, 1)
              continue
            }

            ctx.globalAlpha = emb.life * particleAlpha
            ctx.fillStyle = emb.color
            ctx.beginPath()
            ctx.arc(emb.x, emb.y, emb.size * emb.life, 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.restore()
        }
      }

      if (onProgress) {
        onProgress(p, e)
      }

      anim.rafId = requestAnimationFrame(tick)
    }

    animRef.current.rafId = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(animRef.current.rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [
    wrapperHeightMultiplier,
    lerpFactor,
    smoothScrollEnabled,
    petalCount,
    emberCount,
    ringGlowIntensity,
    onProgress,
    isReducedMotion,
  ])

  const toggleSmoothScroll = useCallback(() => {
    setSmoothScrollEnabled((prev) => !prev)
  }, [])

  return {
    refs: {
      wrapperRef,
      pinRef,
      heroRef,
      nextSectionRef,
      moonWrapperRef,
      moonArcRef,
      moonDashedRingRef,
      portalRingRef,
      canvasRef,
      progressBarRef,
      scrollCueRef,
      scrollCueLineRef,
      headlineLine1Ref,
      headlineLine2Ref,
      headlineLine3Ref,
      eyebrowRef,
      leadRef,
      ctaRef,
      infoItemsRef,
      hexBgRef,
    },
    smoothScrollEnabled,
    toggleSmoothScroll,
    isReducedMotion,
    measure,
  }
}
