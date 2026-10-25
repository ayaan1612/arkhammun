'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { arkham } from '@/lib/arkham-data'

export type TransitionType = 'register' | 'dashboard' | 'logout' | 'dashboard-back'

export interface TransitionOptions {
  originRect?: DOMRect | null
  targetUrl?: string
  onLogout?: () => Promise<void> | void
}

interface PageTransitionContextValue {
  activeTransition: TransitionType | null
  isTransitioning: boolean
  triggerTransition: (type: TransitionType, options?: TransitionOptions) => void
  prefetch: (href: string) => void
}

const PageTransitionContext = createContext<PageTransitionContextValue>({
  activeTransition: null,
  isTransitioning: false,
  triggerTransition: () => {},
  prefetch: () => {},
})

export const useTransitionNav = () => useContext(PageTransitionContext)

const BAT_PATH_STRING =
  'M32 8 L35 14 L40 10 L38 18 C46 12 56 14 62 20 C56 20 52 23 50 28 C46 25 42 26 40 30 C38 27 35 26 32 32 C29 26 26 27 24 30 C22 26 18 25 14 28 C12 23 8 20 2 20 C8 14 18 12 26 18 L24 10 L29 14 Z'

function createBatSpriteCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 72
  canvas.height = 40
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const path = new Path2D(BAT_PATH_STRING)
  ctx.save()
  ctx.translate(36, 20)
  ctx.translate(-32, -20)
  ctx.fillStyle = '#e3262e'
  ctx.shadowColor = '#e3262e'
  ctx.shadowBlur = 6
  ctx.fill(path)
  ctx.restore()
  return canvas
}

interface CanvasBat {
  x: number
  y: number
  vx: number
  vy: number
  scale: number
  flapPhase: number
  flapSpeed: number
  alpha: number
  heading: number
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [activeTransition, setActiveTransition] = useState<TransitionType | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // Overlay DOM element refs
  const registerOverlayRef = useRef<HTMLDivElement>(null)
  const registerRingRef = useRef<HTMLDivElement>(null)
  const registerBadgeRef = useRef<HTMLDivElement>(null)

  const dashboardSlideRef = useRef<HTMLDivElement>(null)

  const logoutOverlayRef = useRef<HTMLDivElement>(null)
  const logoutEclipseRingRef = useRef<HTMLDivElement>(null)
  const logoutBadgeRef = useRef<HTMLDivElement>(null)
  const logoutCanvasRef = useRef<HTMLCanvasElement>(null)

  // Internal runtime refs
  const rafIdRef = useRef<number | null>(null)
  const failSafeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const batSpriteRef = useRef<HTMLCanvasElement | null>(null)
  const runningBatsRef = useRef<CanvasBat[]>([])

  useEffect(() => {
    batSpriteRef.current = createBatSpriteCanvas()
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      if (failSafeTimerRef.current) clearTimeout(failSafeTimerRef.current)
      cleanupAllOverlays()
    }
  }, [])

  const cleanupAllOverlays = useCallback(() => {
    if (registerOverlayRef.current) {
      registerOverlayRef.current.style.display = 'none'
      registerOverlayRef.current.style.clipPath = ''
      registerOverlayRef.current.style.maskImage = ''
      registerOverlayRef.current.style.webkitMaskImage = ''
    }
    if (registerRingRef.current) {
      registerRingRef.current.style.display = 'none'
    }
    if (registerBadgeRef.current) {
      registerBadgeRef.current.style.display = 'none'
    }
    if (dashboardSlideRef.current) {
      dashboardSlideRef.current.style.display = 'none'
      dashboardSlideRef.current.style.transform = ''
    }
    if (logoutOverlayRef.current) {
      logoutOverlayRef.current.style.display = 'none'
      logoutOverlayRef.current.style.maskImage = ''
      logoutOverlayRef.current.style.webkitMaskImage = ''
    }
    if (logoutEclipseRingRef.current) {
      logoutEclipseRingRef.current.style.display = 'none'
    }
    if (logoutBadgeRef.current) {
      logoutBadgeRef.current.style.display = 'none'
    }
    if (logoutCanvasRef.current) {
      logoutCanvasRef.current.style.display = 'none'
    }
    document.documentElement.classList.remove('page-dissolving')
    document.documentElement.removeAttribute('data-transition')
    setActiveTransition(null)
  }, [])

  const prefetch = useCallback(
    (href: string) => {
      try {
        router.prefetch(href)
      } catch {
        // Ignore prefetch error
      }
    },
    [router]
  )

  const triggerTransition = useCallback(
    (type: TransitionType, options: TransitionOptions = {}) => {
      if (activeTransition) return // Already transitioning

      const prefersReducedMotion =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // 4s Safety Fail-Safe: Never leave an overlay stuck on screen
      if (failSafeTimerRef.current) clearTimeout(failSafeTimerRef.current)
      failSafeTimerRef.current = setTimeout(() => {
        cleanupAllOverlays()
      }, 4000)

      setActiveTransition(type)

      // Reduced motion: simple 300ms crossfade
      if (prefersReducedMotion) {
        setAnnouncement(
          type === 'register'
            ? 'Opening registration'
            : type === 'dashboard'
            ? 'Opening dashboard'
            : 'Signing out'
        )
        document.body.style.transition = 'opacity 150ms ease'
        document.body.style.opacity = '0'

        setTimeout(async () => {
          if (type === 'logout') {
            if (options.onLogout) await options.onLogout()
            router.push('/login')
          } else {
            router.push(options.targetUrl || '/')
          }
          setTimeout(() => {
            document.body.style.opacity = '1'
            setTimeout(() => {
              document.body.style.transition = ''
              cleanupAllOverlays()
            }, 150)
          }, 50)
        }, 150)
        return
      }

      // -----------------------------------------------------------------
      // TRANSITION 1: Register now -> /register
      // -----------------------------------------------------------------
      if (type === 'register') {
        setAnnouncement('Opening registration')
        const targetUrl = options.targetUrl || '/register'
        const originRect = options.originRect
        const winW = window.innerWidth
        const winH = window.innerHeight

        const cx = originRect ? originRect.left + originRect.width / 2 : winW / 2
        const cy = originRect ? originRect.top + originRect.height / 2 : winH / 2

        const maxR = Math.hypot(Math.max(cx, winW - cx), Math.max(cy, winH - cy)) + 40

        // 260ms loading state delay before circle expansion begins
        setTimeout(() => {
          const overlay = registerOverlayRef.current
          const ring = registerRingRef.current
          const badge = registerBadgeRef.current
          if (!overlay || !ring || !badge) return

          overlay.style.display = 'flex'
          ring.style.display = 'block'
          badge.style.display = 'none'

          const startTime = performance.now()
          const expandDuration = 650 // 650ms cubic ease in-out

          const animateExpand = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(1, elapsed / expandDuration)
            // Cubic ease in-out
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const r = ease * maxR

            overlay.style.clipPath = `circle(${r.toFixed(1)}px at ${cx}px ${cy}px)`

            ring.style.width = `${(r * 2).toFixed(1)}px`
            ring.style.height = `${(r * 2).toFixed(1)}px`
            ring.style.left = `${cx}px`
            ring.style.top = `${cy}px`

            if (t < 1) {
              rafIdRef.current = requestAnimationFrame(animateExpand)
            } else {
              // Screen is fully covered: Navigate behind cover
              router.push(targetUrl)

              // Show Logo (96px, heartbeat) + "REGISTRATION" for 420ms
              ring.style.display = 'none'
              badge.style.display = 'flex'

              setTimeout(() => {
                // Reveal new page with growing hole from screen center (750ms)
                badge.style.display = 'none'
                ring.style.display = 'block'
                ring.style.left = '50%'
                ring.style.top = '50%'

                const holeStart = performance.now()
                const holeDuration = 750
                const centerMaxR = Math.hypot(winW, winH) / 2 + 60

                const animateHole = (hNow: number) => {
                  const hElapsed = hNow - holeStart
                  const ht = Math.min(1, hElapsed / holeDuration)
                  const hEase = ht < 0.5 ? 4 * ht * ht * ht : 1 - Math.pow(-2 * ht + 2, 3) / 2
                  const hr = hEase * centerMaxR

                  overlay.style.maskImage = `radial-gradient(circle at 50% 50%, transparent ${hr.toFixed(1)}px, #000 ${(hr + 2).toFixed(1)}px)`
                  overlay.style.webkitMaskImage = `radial-gradient(circle at 50% 50%, transparent ${hr.toFixed(1)}px, #000 ${(hr + 2).toFixed(1)}px)`

                  ring.style.width = `${(hr * 2).toFixed(1)}px`
                  ring.style.height = `${(hr * 2).toFixed(1)}px`
                  ring.style.opacity = `${(1 - ht).toFixed(2)}`

                  if (ht < 1) {
                    rafIdRef.current = requestAnimationFrame(animateHole)
                  } else {
                    cleanupAllOverlays()
                  }
                }
                rafIdRef.current = requestAnimationFrame(animateHole)
              }, 420)
            }
          }
          rafIdRef.current = requestAnimationFrame(animateExpand)
        }, 260)
      }

      // -----------------------------------------------------------------
      // TRANSITION 2: Dashboard -> /dashboard (or dashboard-back -> /)
      // -----------------------------------------------------------------
      else if (type === 'dashboard' || type === 'dashboard-back') {
        const isBack = type === 'dashboard-back'
        const targetUrl = options.targetUrl || (isBack ? '/' : '/dashboard')
        setAnnouncement(isBack ? 'Returning to home' : 'Opening dashboard')

        document.documentElement.dataset.transition = isBack ? 'from-dashboard' : 'to-dashboard'

        // Check if View Transitions API is supported
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
          try {
            ;(document as any).startViewTransition(async () => {
              router.push(targetUrl)
              await new Promise((res) => setTimeout(res, 250))
            })
            setTimeout(() => {
              cleanupAllOverlays()
            }, 800)
            return
          } catch {
            // Fall back to CSS slide overlay if startViewTransition throws
          }
        }

        // Fallback slide-over overlay where View Transitions API is unsupported
        const slide = dashboardSlideRef.current
        if (!slide) {
          router.push(targetUrl)
          setTimeout(cleanupAllOverlays, 600)
          return
        }

        slide.style.display = 'block'
        slide.style.transition = 'transform 750ms cubic-bezier(0.7, 0, 0.2, 1)'

        if (isBack) {
          slide.style.transform = 'translateX(0%)'
          void slide.offsetWidth
          router.push(targetUrl)
          slide.style.transform = 'translateX(100%)'
          setTimeout(cleanupAllOverlays, 760)
        } else {
          slide.style.transform = 'translateX(100%)'
          void slide.offsetWidth
          slide.style.transform = 'translateX(0%)'

          setTimeout(() => {
            router.push(targetUrl)
            setTimeout(() => {
              slide.style.transform = 'translateX(-100%)'
              setTimeout(cleanupAllOverlays, 760)
            }, 200)
          }, 500)
        }
      }

      // -----------------------------------------------------------------
      // TRANSITION 3: Logout
      // -----------------------------------------------------------------
      else if (type === 'logout') {
        setAnnouncement('Signing out')
        const originRect = options.originRect
        const winW = window.innerWidth
        const winH = window.innerHeight

        const cx = originRect ? originRect.left + originRect.width / 2 : winW - 80
        const cy = originRect ? originRect.top + originRect.height / 2 : 50

        // Loading state delay: 200ms
        setTimeout(() => {
          // 1. Release 46 bats from button origin on canvas
          const canvas = logoutCanvasRef.current
          const overlay = logoutOverlayRef.current
          const ring = logoutEclipseRingRef.current
          const badge = logoutBadgeRef.current

          if (canvas) {
            canvas.style.display = 'block'
            canvas.width = Math.floor(winW * 1.5)
            canvas.height = Math.floor(winH * 1.5)
            canvas.style.width = `${winW}px`
            canvas.style.height = `${winH}px`
            const ctx = canvas.getContext('2d')
            if (ctx) ctx.scale(1.5, 1.5)

            // Spawn 46 bats
            const bats: CanvasBat[] = []
            for (let i = 0; i < 46; i++) {
              const angle = Math.random() * Math.PI * 2
              const speed = Math.random() * 5 + 4
              bats.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.2,
                scale: Math.random() * 0.28 + 0.35,
                flapPhase: Math.random() * Math.PI * 2,
                flapSpeed: Math.random() * 0.3 + 0.3,
                alpha: 1,
                heading: Math.atan2(Math.sin(angle) * speed - 1.2, Math.cos(angle) * speed),
              })
            }
            runningBatsRef.current = bats

            const batSprite = batSpriteRef.current
            const renderBats = () => {
              if (!ctx || !batSprite) return
              ctx.clearRect(0, 0, winW, winH)

              for (let i = bats.length - 1; i >= 0; i--) {
                const b = bats[i]
                b.x += b.vx
                b.y += b.vy
                b.flapPhase += b.flapSpeed
                b.alpha *= 0.985

                if (b.alpha <= 0.05 || b.x < -80 || b.x > winW + 80 || b.y < -80 || b.y > winH + 80) {
                  bats.splice(i, 1)
                  continue
                }

                const flap = 0.76 + 0.24 * Math.sin(b.flapPhase)
                ctx.save()
                ctx.translate(b.x, b.y)
                ctx.rotate(b.heading + Math.PI / 2)
                ctx.scale(b.scale, b.scale * flap)
                ctx.globalAlpha = b.alpha
                ctx.drawImage(batSprite, -36, -20, 72, 40)
                ctx.restore()
              }

              if (bats.length > 0) {
                rafIdRef.current = requestAnimationFrame(renderBats)
              }
            }
            rafIdRef.current = requestAnimationFrame(renderBats)
          }

          // 2. Page dissolves (opacity 0, blur 8px, grayscale, scale .97 over .9s)
          document.documentElement.classList.add('page-dissolving')

          // 3. At +900ms: close eclipse shrinking to screen center (800ms) with red ring
          setTimeout(() => {
            if (!overlay || !ring || !badge) return
            overlay.style.display = 'flex'
            ring.style.display = 'block'
            badge.style.display = 'none'

            const eclipseDuration = 800
            const eclipseStart = performance.now()
            const centerMaxR = Math.hypot(winW, winH) / 2 + 60

            const animateClose = (now: number) => {
              const elapsed = now - eclipseStart
              const t = Math.min(1, elapsed / eclipseDuration)
              const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
              const r = (1 - ease) * centerMaxR

              overlay.style.maskImage = `radial-gradient(circle at 50% 50%, #000 ${r.toFixed(1)}px, transparent ${(r + 2).toFixed(1)}px)`
              overlay.style.webkitMaskImage = `radial-gradient(circle at 50% 50%, #000 ${r.toFixed(1)}px, transparent ${(r + 2).toFixed(1)}px)`

              ring.style.width = `${(r * 2).toFixed(1)}px`
              ring.style.height = `${(r * 2).toFixed(1)}px`

              if (t < 1) {
                rafIdRef.current = requestAnimationFrame(animateClose)
              } else {
                // 4. Show logo + "SIGNED OUT" for 650ms
                ring.style.display = 'none'
                badge.style.display = 'flex'

                setTimeout(async () => {
                  // 5. Call sign-out & navigate
                  if (options.onLogout) {
                    await options.onLogout()
                  }
                  router.push('/login')

                  // 6. Reopen hole (950ms) on goodbye/login page
                  badge.style.display = 'none'
                  ring.style.display = 'block'
                  document.documentElement.classList.remove('page-dissolving')

                  const reopenDuration = 950
                  const reopenStart = performance.now()

                  const animateReopen = (reNow: number) => {
                    const reElapsed = reNow - reopenStart
                    const rt = Math.min(1, reElapsed / reopenDuration)
                    const reEase = rt < 0.5 ? 4 * rt * rt * rt : 1 - Math.pow(-2 * rt + 2, 3) / 2
                    const rr = reEase * centerMaxR

                    overlay.style.maskImage = `radial-gradient(circle at 50% 50%, transparent ${rr.toFixed(1)}px, #000 ${(rr + 2).toFixed(1)}px)`
                    overlay.style.webkitMaskImage = `radial-gradient(circle at 50% 50%, transparent ${rr.toFixed(1)}px, #000 ${(rr + 2).toFixed(1)}px)`

                    ring.style.width = `${(rr * 2).toFixed(1)}px`
                    ring.style.height = `${(rr * 2).toFixed(1)}px`
                    ring.style.opacity = `${(1 - rt).toFixed(2)}`

                    if (rt < 1) {
                      rafIdRef.current = requestAnimationFrame(animateReopen)
                    } else {
                      cleanupAllOverlays()
                    }
                  }
                  rafIdRef.current = requestAnimationFrame(animateReopen)
                }, 650)
              }
            }
            rafIdRef.current = requestAnimationFrame(animateClose)
          }, 900)
        }, 200)
      }
    },
    [activeTransition, cleanupAllOverlays, prefetch, router]
  )

  return (
    <PageTransitionContext.Provider
      value={{
        activeTransition,
        isTransitioning: activeTransition !== null,
        triggerTransition,
        prefetch,
      }}
    >
      {/* Accessible screen reader live region */}
      <div aria-live="assertive" className="sr-only">
        {announcement}
      </div>

      {children}

      {/* 1. Register Expanding Circle & Center Hole Reveal Overlay */}
      <div ref={registerOverlayRef} className="page-trans-register-overlay" aria-hidden="true" style={{ display: 'none' }}>
        <div ref={registerRingRef} className="page-trans-register-ring" />
        <div ref={registerBadgeRef} className="page-trans-badge">
          <img src={arkham.logo} alt="" className="page-trans-logo" />
          <span className="page-trans-label">REGISTRATION</span>
        </div>
      </div>

      {/* 2. Dashboard Slide Fallback Overlay */}
      <div ref={dashboardSlideRef} className="page-trans-dashboard-slide" aria-hidden="true" style={{ display: 'none' }} />

      {/* 3. Logout Bat Canvas Overlay */}
      <canvas ref={logoutCanvasRef} className="page-trans-canvas" aria-hidden="true" style={{ display: 'none' }} />

      {/* 4. Logout Eclipse & Reopen Overlay */}
      <div ref={logoutOverlayRef} className="page-trans-logout-overlay" aria-hidden="true" style={{ display: 'none' }}>
        <div ref={logoutEclipseRingRef} className="page-trans-eclipse-ring" />
        <div ref={logoutBadgeRef} className="page-trans-badge">
          <img src={arkham.logo} alt="" className="page-trans-logo" />
          <span className="page-trans-label">SIGNED OUT</span>
        </div>
      </div>
    </PageTransitionContext.Provider>
  )
}
