'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { arkham } from '@/lib/arkham-data'
import { ShieldAlert } from 'lucide-react'

export type TransitionType = 'register' | 'dashboard' | 'logout' | 'dashboard-back' | 'login'

export interface GoOptions {
  type: TransitionType
  href?: string
  action?: () => Promise<any> | any
  originEl?: HTMLElement | null
  originRect?: DOMRect | null
  sessionExpired?: boolean
  label?: string
  loadingText?: string
  redirectTo?: string
  targetUrl?: string
  onLogout?: () => Promise<void> | void
}

// ---------------------------------------------------------------------------
// Module-level Transition Store
// ---------------------------------------------------------------------------
interface TransitionStoreState {
  activeTransition: TransitionType | null
  isTransitioning: boolean
  announcement: string
  errorToast: string | null
}

let storeState: TransitionStoreState = {
  activeTransition: null,
  isTransitioning: false,
  announcement: '',
  errorToast: null,
}

const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {}
  })
}

export function subscribeTransitionStore(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getTransitionSnapshot(): TransitionStoreState {
  return storeState
}

function updateStore(partial: Partial<TransitionStoreState>) {
  storeState = { ...storeState, ...partial }
  emitChange()
}

// Global auth logout function registered from AuthProvider
let globalAuthLogout: (() => void) | null = null

export function registerAuthLogout(fn: () => void) {
  globalAuthLogout = fn
}

// Global router ref so transitions can navigate from module-level go()
let moduleRouter: any = null
let modulePathname = ''
let pendingRouteResolve: (() => void) | null = null

export function setModuleRouter(router: any, pathname: string) {
  moduleRouter = router
  modulePathname = pathname
  if (pendingRouteResolve) {
    const r = pendingRouteResolve
    pendingRouteResolve = null
    r()
  }
}

// Canvas Bat definition
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

// Global active DOM overlay handlers
interface TransitionDOMHandlers {
  startRegisterExpand: (cx: number, cy: number, maxR: number) => Promise<void>
  shrinkRegisterCircle: (cx: number, cy: number, maxR: number) => Promise<void>
  revealCenterHole: (duration?: number) => Promise<void>
  showRegisterBadge: (label: string) => void
  hideRegisterBadge: () => void

  startDashboardSlide: (isBack: boolean, targetUrl: string) => Promise<void>

  spawnLogoutBats: (cx: number, cy: number) => void
  closeLogoutEclipse: () => Promise<void>
  showLogoutBadge: (label: string) => void
  reopenLogoutHole: () => Promise<void>

  cleanupAll: () => void
}

let activeHandlers: TransitionDOMHandlers | null = null

export function registerTransitionHandlers(handlers: TransitionDOMHandlers) {
  activeHandlers = handlers
  return () => {
    if (activeHandlers === handlers) {
      activeHandlers = null
    }
  }
}

// ---------------------------------------------------------------------------
// Main Transition Orchestrator: go()
// ---------------------------------------------------------------------------
export async function go(options: GoOptions): Promise<boolean> {
  const {
    type,
    href,
    action,
    originEl,
    originRect,
    sessionExpired,
    label,
    redirectTo,
    targetUrl,
    onLogout,
  } = options

  if (storeState.isTransitioning) {
    return false
  }

  const router = moduleRouter
  const finalTarget = href || targetUrl || (type === 'logout' ? '/login' : type === 'login' ? '/dashboard' : '/register')
  const finalAction = action || onLogout

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  updateStore({
    activeTransition: type,
    isTransitioning: true,
    errorToast: null,
  })

  // Calculate origin coordinates
  let cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 0
  let cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 0

  if (originRect) {
    cx = originRect.left + originRect.width / 2
    cy = originRect.top + originRect.height / 2
  } else if (originEl && typeof window !== 'undefined') {
    const rect = originEl.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      cx = rect.left + rect.width / 2
      cy = rect.top + rect.height / 2
    }
  }

  const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800
  const maxR = Math.hypot(Math.max(cx, winW - cx), Math.max(cy, winH - cy)) + 40

  // -------------------------------------------------------------------------
  // REDUCED MOTION FALLBACK: 300ms Clean Crossfade
  // -------------------------------------------------------------------------
  if (prefersReducedMotion) {
    updateStore({
      announcement:
        type === 'logout' ? 'Signing out' : type === 'login' ? 'Signing in' : 'Navigating',
    })

    const contentEl = document.getElementById('page-transition-content')
    if (contentEl) {
      contentEl.style.transition = 'opacity 150ms ease'
      contentEl.style.opacity = '0'
    }

    try {
      if (finalAction) await finalAction()
      if (type === 'logout') {
        router?.replace('/login')
        router?.refresh()
      } else if (finalTarget) {
        router?.push(finalTarget)
      }
      await new Promise((r) => setTimeout(r, 160))
    } catch {
      // ignore
    } finally {
      if (contentEl) {
        contentEl.style.opacity = '1'
        setTimeout(() => {
          contentEl.style.transition = ''
          updateStore({ activeTransition: null, isTransitioning: false })
        }, 150)
      } else {
        updateStore({ activeTransition: null, isTransitioning: false })
      }
    }
    return true
  }

  // -------------------------------------------------------------------------
  // 1. LOGOUT TRANSITION
  // -------------------------------------------------------------------------
  if (type === 'logout') {
    updateStore({ announcement: sessionExpired ? 'Session ended' : 'Signing out' })

    // Safety 4s timer: never leave screen stuck
    let timedOut = false
    const safetyTimer = setTimeout(() => {
      timedOut = true
      activeHandlers?.cleanupAll()
      const content = document.getElementById('page-transition-content')
      if (content) content.classList.remove('page-dissolving')
      sessionStorage.removeItem('arkham:tx')
      updateStore({
        activeTransition: null,
        isTransitioning: false,
        errorToast: "Couldn't sign out. Please try again.",
      })
    }, 4000)

    try {
      // a. Micro-interaction delay & launch bats
      if (!sessionExpired && activeHandlers) {
        activeHandlers.spawnLogoutBats(cx, cy)
      }

      // b. Dissolve inner page wrapper (900ms)
      const content = document.getElementById('page-transition-content')
      if (content) {
        content.classList.add('page-dissolving')
      }

      // Wait 900ms for dissolve
      await new Promise((r) => setTimeout(r, 900))
      if (timedOut) return false

      // c. Close eclipse to full dark (800ms)
      if (activeHandlers) {
        await activeHandlers.closeLogoutEclipse()
      }
      if (timedOut) return false

      // d. Fully covered: show badge with logo & text
      const badgeText = label || (sessionExpired ? 'SESSION ENDED' : 'SIGNED OUT')
      if (activeHandlers) {
        activeHandlers.showLogoutBadge(badgeText)
      }

      // Store reload survival marker before executing action
      try {
        sessionStorage.setItem('arkham:tx', 'logout-reveal')
      } catch {}

      // Always remove auth token from storage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('arkham_auth_token')
          sessionStorage.removeItem('arkham_auth_token')
        } catch {}
      }

      // Await sign-out action
      if (finalAction) {
        try {
          await finalAction()
        } catch (e) {
          console.warn('Logout action failed:', e)
        }
      }

      // Invoke registered AuthProvider logout to reset React auth state
      if (globalAuthLogout) {
        try {
          globalAuthLogout()
        } catch {}
      }

      // Navigate to login
      if (router) {
        router.replace('/login')
        router.refresh()
      }

      // Wait until route renders (pathname check + 2 rAF ticks)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise((r) => setTimeout(r, 200))
      if (timedOut) return false

      // e. Reopen eclipse hole (950ms)
      if (activeHandlers) {
        await activeHandlers.reopenLogoutHole()
      }

      // f. Cleanup & focus h1
      clearTimeout(safetyTimer)
      try {
        sessionStorage.removeItem('arkham:tx')
      } catch {}

      if (content) {
        content.classList.remove('page-dissolving')
      }
      activeHandlers?.cleanupAll()

      const heading = document.querySelector('h1') as HTMLElement | null
      if (heading) {
        heading.setAttribute('tabindex', '-1')
        heading.focus()
      }

      updateStore({ activeTransition: null, isTransitioning: false })
      return true
    } catch (err) {
      clearTimeout(safetyTimer)
      activeHandlers?.cleanupAll()
      const content = document.getElementById('page-transition-content')
      if (content) content.classList.remove('page-dissolving')
      try {
        sessionStorage.removeItem('arkham:tx')
      } catch {}

      updateStore({
        activeTransition: null,
        isTransitioning: false,
        errorToast: "Couldn't sign out. Please try again.",
      })
      return false
    }
  }

  // -------------------------------------------------------------------------
  // 2. LOGIN & SIGNUP (REGISTER WITH ACTION) TRANSITIONS
  // -------------------------------------------------------------------------
  if (type === 'login' || (type === 'register' && finalAction)) {
    const isRegister = type === 'register'
    updateStore({ announcement: isRegister ? 'Creating account' : 'Signing in' })

    // 260ms loading state micro-interaction delay
    await new Promise((r) => setTimeout(r, 260))

    // Expand red circle from button origin (650ms)
    if (activeHandlers) {
      await activeHandlers.startRegisterExpand(cx, cy, maxR)
    }

    // Fully covered: show logo heartbeat and badge
    const badgeText = label || (isRegister ? 'CREATING ACCOUNT' : 'WELCOME BACK')
    if (activeHandlers) {
      activeHandlers.showRegisterBadge(badgeText)
    }

    // Safety timeout (6s)
    let timedOut = false
    const safetyTimer = setTimeout(() => {
      timedOut = true
    }, 6000)

    let actionSucceeded = false
    let actionError: any = null

    try {
      if (finalAction) {
        await finalAction()
      }
      actionSucceeded = !timedOut
    } catch (err) {
      actionSucceeded = false
      actionError = err
    } finally {
      clearTimeout(safetyTimer)
    }

    if (!actionSucceeded) {
      // -----------------------------------------------------------------------
      // FAILURE CASE: Shrink red circle back into button (500ms) + Form Shake
      // -----------------------------------------------------------------------
      if (activeHandlers) {
        activeHandlers.hideRegisterBadge()
        await activeHandlers.shrinkRegisterCircle(cx, cy, maxR)
        activeHandlers.cleanupAll()
      }

      // Shake form horizontally
      const formEl = originEl?.closest('form') || document.querySelector('form')
      if (formEl) {
        formEl.classList.add('form-shake')
        setTimeout(() => {
          formEl.classList.remove('form-shake')
        }, 450)
      }

      updateStore({ activeTransition: null, isTransitioning: false })
      if (actionError) throw actionError
      return false
    }

    // -------------------------------------------------------------------------
    // SUCCESS CASE: Navigate, wait route render, and reveal with growing center hole (750ms)
    // -------------------------------------------------------------------------
    const destination = redirectTo || finalTarget || '/dashboard'
    if (router) {
      router.replace(destination)
      router.refresh()
    }

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    await new Promise((r) => setTimeout(r, 250))

    if (activeHandlers) {
      activeHandlers.hideRegisterBadge()
      await activeHandlers.revealCenterHole(750)
      activeHandlers.cleanupAll()
    }

    const heading = document.querySelector('h1') as HTMLElement | null
    if (heading) {
      heading.setAttribute('tabindex', '-1')
      heading.focus()
    }

    updateStore({ activeTransition: null, isTransitioning: false })
    return true
  }

  // -------------------------------------------------------------------------
  // 3. REGISTER LINK NAVIGATION (NO ACTION)
  // -------------------------------------------------------------------------
  if (type === 'register') {
    updateStore({ announcement: 'Opening registration' })

    await new Promise((r) => setTimeout(r, 260))

    if (activeHandlers) {
      await activeHandlers.startRegisterExpand(cx, cy, maxR)
    }

    if (router) {
      router.push(finalTarget)
    }

    if (activeHandlers) {
      activeHandlers.showRegisterBadge('REGISTRATION')
    }

    await new Promise((r) => setTimeout(r, 420))

    if (activeHandlers) {
      activeHandlers.hideRegisterBadge()
      await activeHandlers.revealCenterHole(750)
      activeHandlers.cleanupAll()
    }

    const heading = document.querySelector('h1') as HTMLElement | null
    if (heading) {
      heading.setAttribute('tabindex', '-1')
      heading.focus()
    }

    updateStore({ activeTransition: null, isTransitioning: false })
    return true
  }

  // -------------------------------------------------------------------------
  // 4. DASHBOARD / DASHBOARD-BACK SLIDE
  // -------------------------------------------------------------------------
  if (type === 'dashboard' || type === 'dashboard-back') {
    const isBack = type === 'dashboard-back'
    updateStore({
      announcement: isBack ? 'Returning to home' : 'Opening dashboard',
    })

    document.documentElement.dataset.transition = isBack ? 'from-dashboard' : 'to-dashboard'

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      try {
        ;(document as any).startViewTransition(async () => {
          router?.push(finalTarget)
          await new Promise((res) => setTimeout(res, 250))
        })
        setTimeout(() => {
          activeHandlers?.cleanupAll()
          updateStore({ activeTransition: null, isTransitioning: false })
        }, 800)
        return true
      } catch {}
    }

    if (activeHandlers) {
      await activeHandlers.startDashboardSlide(isBack, finalTarget)
      activeHandlers.cleanupAll()
    } else {
      router?.push(finalTarget)
    }

    updateStore({ activeTransition: null, isTransitioning: false })
    return true
  }

  return false
}

// ---------------------------------------------------------------------------
// Hook: useTransitionNav
// ---------------------------------------------------------------------------
export function useTransitionNav() {
  const store = useSyncExternalStore(
    subscribeTransitionStore,
    getTransitionSnapshot,
    () => ({
      activeTransition: null,
      isTransitioning: false,
      announcement: '',
      errorToast: null,
    })
  )

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setModuleRouter(router, pathname)
  }, [router, pathname])

  const prefetch = useCallback(
    (href: string) => {
      try {
        router.prefetch(href)
      } catch {}
    },
    [router]
  )

  const triggerTransition = useCallback(
    (type: TransitionType, options: any = {}) => {
      return go({ type, ...options })
    },
    []
  )

  return {
    go,
    activeTransition: store.activeTransition,
    isTransitioning: store.isTransitioning,
    prefetch,
    triggerTransition,
  }
}

// ---------------------------------------------------------------------------
// Component: TransitionButton
// ---------------------------------------------------------------------------
export function TransitionButton({
  type = 'logout',
  href,
  action,
  label,
  loadingText,
  sessionExpired,
  redirectTo,
  children,
  className = '',
  onClick,
  disabled,
  style,
  ...props
}: {
  type: TransitionType
  href?: string
  action?: () => Promise<any> | any
  label?: string
  loadingText?: string
  sessionExpired?: boolean
  redirectTo?: string
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  style?: React.CSSProperties
  [key: string]: any
}) {
  const { go: executeGo, activeTransition } = useTransitionNav()
  const isLoading = activeTransition === type
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading || disabled) return

    const rect = e.currentTarget.getBoundingClientRect()
    const rx = e.clientX - rect.left
    const ry = e.clientY - rect.top
    setRipples((prev) => [...prev, { x: rx, y: ry, id: Date.now() }])
    setTimeout(() => setRipples((prev) => prev.slice(1)), 600)

    if (onClick) onClick(e)

    await executeGo({
      type,
      href,
      action,
      originEl: e.currentTarget,
      originRect: rect,
      sessionExpired,
      label,
      loadingText,
      redirectTo,
    })
  }

  const defaultLoadingText =
    loadingText ||
    (type === 'logout'
      ? 'Signing out…'
      : type === 'login'
      ? 'Signing in…'
      : type === 'register'
      ? 'Creating account…'
      : 'Loading…')

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={isLoading || disabled}
      className={`arkham-interactive-btn ${className} ${isLoading ? 'is-loading pointer-events-none opacity-90' : ''}`}
      style={{ ...style, pointerEvents: isLoading ? 'none' : undefined }}
      data-transition={type}
    >
      <span className="arkham-btn-sheen" aria-hidden="true" />
      {ripples.map((r) => (
        <span
          key={r.id}
          className="arkham-btn-ripple"
          style={{ left: `${r.x}px`, top: `${r.y}px` }}
          aria-hidden="true"
        />
      ))}
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>{defaultLoadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component: PageTransitionContentWrapper
// Wraps inner children in layout; receives .page-dissolving during logout
// ---------------------------------------------------------------------------
export function PageTransitionContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div id="page-transition-content" style={{ minHeight: '100vh' }}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component: PageTransitionOverlay
// Sits outside AuthProvider; never unmounts on route or auth changes
// ---------------------------------------------------------------------------
export function PageTransitionOverlay() {
  const store = useSyncExternalStore(
    subscribeTransitionStore,
    getTransitionSnapshot,
    () => ({
      activeTransition: null,
      isTransitioning: false,
      announcement: '',
      errorToast: null,
    })
  )

  const router = useRouter()
  const pathname = usePathname()

  // Overlay elements
  const registerOverlayRef = useRef<HTMLDivElement>(null)
  const registerRingRef = useRef<HTMLDivElement>(null)
  const registerBadgeRef = useRef<HTMLDivElement>(null)
  const registerLabelRef = useRef<HTMLSpanElement>(null)

  const dashboardSlideRef = useRef<HTMLDivElement>(null)

  const logoutOverlayRef = useRef<HTMLDivElement>(null)
  const logoutEclipseRingRef = useRef<HTMLDivElement>(null)
  const logoutBadgeRef = useRef<HTMLDivElement>(null)
  const logoutLabelRef = useRef<HTMLSpanElement>(null)
  const logoutCanvasRef = useRef<HTMLCanvasElement>(null)

  const rafIdRef = useRef<number | null>(null)
  const batSpriteRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    setModuleRouter(router, pathname)
  }, [router, pathname])

  const cleanupAll = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)

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
      const ctx = logoutCanvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, logoutCanvasRef.current.width, logoutCanvasRef.current.height)
    }
    document.documentElement.removeAttribute('data-transition')
  }, [])

  // Register Handlers with Module Orchestrator
  useEffect(() => {
    batSpriteRef.current = createBatSpriteCanvas()

    const unregister = registerTransitionHandlers({
      startRegisterExpand: (cx, cy, maxR) => {
        return new Promise((resolve) => {
          const overlay = registerOverlayRef.current
          const ring = registerRingRef.current
          if (!overlay || !ring) return resolve()

          overlay.style.display = 'flex'
          ring.style.display = 'block'
          ring.style.opacity = '1'

          const startTime = performance.now()
          const expandDuration = 650

          const animate = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(1, elapsed / expandDuration)
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const r = ease * maxR

            overlay.style.clipPath = `circle(${r.toFixed(1)}px at ${cx}px ${cy}px)`
            ring.style.width = `${(r * 2).toFixed(1)}px`
            ring.style.height = `${(r * 2).toFixed(1)}px`
            ring.style.left = `${cx}px`
            ring.style.top = `${cy}px`

            if (t < 1) {
              rafIdRef.current = requestAnimationFrame(animate)
            } else {
              ring.style.display = 'none'
              resolve()
            }
          }
          rafIdRef.current = requestAnimationFrame(animate)
        })
      },

      shrinkRegisterCircle: (cx, cy, maxR) => {
        return new Promise((resolve) => {
          const overlay = registerOverlayRef.current
          const ring = registerRingRef.current
          if (!overlay || !ring) return resolve()

          ring.style.display = 'block'
          ring.style.opacity = '1'
          const startTime = performance.now()
          const duration = 500

          const animate = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(1, elapsed / duration)
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const r = (1 - ease) * maxR

            overlay.style.clipPath = `circle(${r.toFixed(1)}px at ${cx}px ${cy}px)`
            ring.style.width = `${(r * 2).toFixed(1)}px`
            ring.style.height = `${(r * 2).toFixed(1)}px`
            ring.style.left = `${cx}px`
            ring.style.top = `${cy}px`

            if (t < 1) {
              rafIdRef.current = requestAnimationFrame(animate)
            } else {
              overlay.style.display = 'none'
              ring.style.display = 'none'
              resolve()
            }
          }
          rafIdRef.current = requestAnimationFrame(animate)
        })
      },

      revealCenterHole: (duration = 750) => {
        return new Promise((resolve) => {
          const overlay = registerOverlayRef.current
          const ring = registerRingRef.current
          if (!overlay || !ring) return resolve()

          const winW = window.innerWidth
          const winH = window.innerHeight
          const centerMaxR = Math.hypot(winW, winH) / 2 + 60

          ring.style.display = 'block'
          ring.style.left = '50%'
          ring.style.top = '50%'

          const startTime = performance.now()

          const animate = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(1, elapsed / duration)
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const hr = ease * centerMaxR

            overlay.style.maskImage = `radial-gradient(circle at 50% 50%, transparent ${hr.toFixed(1)}px, #000 ${(hr + 2).toFixed(1)}px)`
            overlay.style.webkitMaskImage = `radial-gradient(circle at 50% 50%, transparent ${hr.toFixed(1)}px, #000 ${(hr + 2).toFixed(1)}px)`

            ring.style.width = `${(hr * 2).toFixed(1)}px`
            ring.style.height = `${(hr * 2).toFixed(1)}px`
            ring.style.opacity = `${(1 - t).toFixed(2)}`

            if (t < 1) {
              rafIdRef.current = requestAnimationFrame(animate)
            } else {
              overlay.style.display = 'none'
              ring.style.display = 'none'
              resolve()
            }
          }
          rafIdRef.current = requestAnimationFrame(animate)
        })
      },

      showRegisterBadge: (lbl: string) => {
        if (registerBadgeRef.current && registerLabelRef.current) {
          registerLabelRef.current.textContent = lbl
          registerBadgeRef.current.style.display = 'flex'
        }
      },

      hideRegisterBadge: () => {
        if (registerBadgeRef.current) {
          registerBadgeRef.current.style.display = 'none'
        }
      },

      startDashboardSlide: (isBack: boolean, targetUrl: string) => {
        return new Promise((resolve) => {
          const slide = dashboardSlideRef.current
          if (!slide) {
            router.push(targetUrl)
            return resolve()
          }

          slide.style.display = 'block'
          slide.style.transition = 'transform 750ms cubic-bezier(0.7, 0, 0.2, 1)'

          if (isBack) {
            slide.style.transform = 'translateX(0%)'
            void slide.offsetWidth
            router.push(targetUrl)
            slide.style.transform = 'translateX(100%)'
            setTimeout(resolve, 760)
          } else {
            slide.style.transform = 'translateX(100%)'
            void slide.offsetWidth
            slide.style.transform = 'translateX(0%)'

            setTimeout(() => {
              router.push(targetUrl)
              setTimeout(() => {
                slide.style.transform = 'translateX(-100%)'
                setTimeout(resolve, 760)
              }, 200)
            }, 500)
          }
        })
      },

      spawnLogoutBats: (cx: number, cy: number) => {
        const canvas = logoutCanvasRef.current
        if (!canvas) return

        const winW = window.innerWidth
        const winH = window.innerHeight

        canvas.style.display = 'block'
        canvas.width = Math.floor(winW * 1.5)
        canvas.height = Math.floor(winH * 1.5)
        canvas.style.width = `${winW}px`
        canvas.style.height = `${winH}px`
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.scale(1.5, 1.5)

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
          } else {
            canvas.style.display = 'none'
          }
        }
        rafIdRef.current = requestAnimationFrame(renderBats)
      },

      closeLogoutEclipse: () => {
        return new Promise((resolve) => {
          const overlay = logoutOverlayRef.current
          const ring = logoutEclipseRingRef.current
          if (!overlay || !ring) return resolve()

          const winW = window.innerWidth
          const winH = window.innerHeight
          const centerMaxR = Math.hypot(winW, winH) / 2 + 60

          overlay.style.display = 'flex'
          ring.style.display = 'block'
          ring.style.opacity = '1'

          const duration = 800
          const startTime = performance.now()

          const animate = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(1, elapsed / duration)
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const r = (1 - ease) * centerMaxR

            overlay.style.maskImage = `radial-gradient(circle at 50% 50%, #000 ${r.toFixed(1)}px, transparent ${(r + 2).toFixed(1)}px)`
            overlay.style.webkitMaskImage = `radial-gradient(circle at 50% 50%, #000 ${r.toFixed(1)}px, transparent ${(r + 2).toFixed(1)}px)`

            ring.style.width = `${(r * 2).toFixed(1)}px`
            ring.style.height = `${(r * 2).toFixed(1)}px`

            if (t < 1) {
              rafIdRef.current = requestAnimationFrame(animate)
            } else {
              overlay.style.maskImage = 'none'
              overlay.style.webkitMaskImage = 'none'
              ring.style.display = 'none'
              resolve()
            }
          }
          rafIdRef.current = requestAnimationFrame(animate)
        })
      },

      showLogoutBadge: (lbl: string) => {
        if (logoutBadgeRef.current && logoutLabelRef.current) {
          logoutLabelRef.current.textContent = lbl
          logoutBadgeRef.current.style.display = 'flex'
        }
      },

      reopenLogoutHole: () => {
        return new Promise((resolve) => {
          const overlay = logoutOverlayRef.current
          const ring = logoutEclipseRingRef.current
          const badge = logoutBadgeRef.current
          if (!overlay || !ring) return resolve()

          if (badge) badge.style.display = 'none'

          const winW = window.innerWidth
          const winH = window.innerHeight
          const centerMaxR = Math.hypot(winW, winH) / 2 + 60

          ring.style.display = 'block'
          ring.style.left = '50%'
          ring.style.top = '50%'

          const duration = 950
          const startTime = performance.now()

          const animate = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(1, elapsed / duration)
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const rr = ease * centerMaxR

            overlay.style.maskImage = `radial-gradient(circle at 50% 50%, transparent ${rr.toFixed(1)}px, #000 ${(rr + 2).toFixed(1)}px)`
            overlay.style.webkitMaskImage = `radial-gradient(circle at 50% 50%, transparent ${rr.toFixed(1)}px, #000 ${(rr + 2).toFixed(1)}px)`

            ring.style.width = `${(rr * 2).toFixed(1)}px`
            ring.style.height = `${(rr * 2).toFixed(1)}px`
            ring.style.opacity = `${(1 - t).toFixed(2)}`

            if (t < 1) {
              rafIdRef.current = requestAnimationFrame(animate)
            } else {
              overlay.style.display = 'none'
              ring.style.display = 'none'
              resolve()
            }
          }
          rafIdRef.current = requestAnimationFrame(animate)
        })
      },

      cleanupAll,
    })

    return () => {
      unregister()
      cleanupAll()
    }
  }, [cleanupAll, router])

  // -------------------------------------------------------------------------
  // Hard Reload Survival Hydration: Check sessionStorage 'arkham:tx'
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (sessionStorage.getItem('arkham:tx') === 'logout-reveal') {
        sessionStorage.removeItem('arkham:tx')

        const overlay = logoutOverlayRef.current
        const ring = logoutEclipseRingRef.current
        if (overlay && ring) {
          overlay.style.display = 'flex'
          ring.style.display = 'block'
          document.documentElement.classList.remove('tx-cover')

          const winW = window.innerWidth
          const winH = window.innerHeight
          const centerMaxR = Math.hypot(winW, winH) / 2 + 60
          const startTime = performance.now()
          const duration = 950

          const animate = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(1, elapsed / duration)
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const rr = ease * centerMaxR

            overlay.style.maskImage = `radial-gradient(circle at 50% 50%, transparent ${rr.toFixed(1)}px, #000 ${(rr + 2).toFixed(1)}px)`
            overlay.style.webkitMaskImage = `radial-gradient(circle at 50% 50%, transparent ${rr.toFixed(1)}px, #000 ${(rr + 2).toFixed(1)}px)`

            ring.style.width = `${(rr * 2).toFixed(1)}px`
            ring.style.height = `${(rr * 2).toFixed(1)}px`
            ring.style.opacity = `${(1 - t).toFixed(2)}`

            if (t < 1) {
              requestAnimationFrame(animate)
            } else {
              overlay.style.display = 'none'
              ring.style.display = 'none'
              const heading = document.querySelector('h1') as HTMLElement | null
              if (heading) {
                heading.setAttribute('tabindex', '-1')
                heading.focus()
              }
            }
          }
          requestAnimationFrame(animate)
        } else {
          document.documentElement.classList.remove('tx-cover')
        }
      }
    } catch {}
  }, [])

  // -------------------------------------------------------------------------
  // Event Delegation for [data-transition]
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleDelegatedClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return
      const target = (e.target as HTMLElement).closest('[data-transition]') as HTMLElement | null
      if (!target) return

      // If the button has an internal React onClick or is a TransitionButton, it will handle itself
      // This is a safety catch for any standard HTML button / link with data-transition attribute
      if (target.dataset.delegatedHandled === 'true') return
      target.dataset.delegatedHandled = 'true'
      setTimeout(() => {
        delete target.dataset.delegatedHandled
      }, 100)

      const type = target.getAttribute('data-transition') as TransitionType
      if (!type) return

      const href = target.getAttribute('data-href') || (target as HTMLAnchorElement).href || undefined
      go({
        type,
        href,
        originEl: target,
      })
    }

    document.addEventListener('click', handleDelegatedClick, false)
    return () => {
      document.removeEventListener('click', handleDelegatedClick, false)
    }
  }, [])

  return (
    <>
      {/* Accessible screen reader announcement */}
      <div aria-live="assertive" className="sr-only">
        {store.announcement}
      </div>

      {/* 1. Register & Login Expanding Circle & Center Hole Reveal Overlay */}
      <div
        ref={registerOverlayRef}
        className="page-trans-register-overlay"
        aria-hidden="true"
        style={{ display: 'none' }}
      >
        <div ref={registerRingRef} className="page-trans-register-ring" />
        <div ref={registerBadgeRef} className="page-trans-badge" style={{ display: 'none' }}>
          <img src={arkham.logo} alt="" className="page-trans-logo" />
          <span ref={registerLabelRef} className="page-trans-label">
            REGISTRATION
          </span>
        </div>
      </div>

      {/* 2. Dashboard Slide Fallback Overlay */}
      <div
        ref={dashboardSlideRef}
        className="page-trans-dashboard-slide"
        aria-hidden="true"
        style={{ display: 'none' }}
      />

      {/* 3. Logout Bat Canvas Overlay */}
      <canvas
        ref={logoutCanvasRef}
        className="page-trans-canvas"
        aria-hidden="true"
        style={{ display: 'none' }}
      />

      {/* 4. Logout Eclipse & Reopen Overlay */}
      <div
        ref={logoutOverlayRef}
        className="page-trans-logout-overlay"
        aria-hidden="true"
        style={{ display: 'none' }}
      >
        <div ref={logoutEclipseRingRef} className="page-trans-eclipse-ring" />
        <div ref={logoutBadgeRef} className="page-trans-badge" style={{ display: 'none' }}>
          <img src={arkham.logo} alt="" className="page-trans-logo" />
          <span ref={logoutLabelRef} className="page-trans-label">
            SIGNED OUT
          </span>
        </div>
      </div>

      {/* 5. Error Toast banner (e.g. Couldn't sign out) */}
      {store.errorToast && (
        <div
          role="alert"
          className="page-trans-toast"
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            background: 'rgba(22, 6, 8, 0.96)',
            border: '1px solid rgba(227, 38, 46, 0.6)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(227, 38, 46, 0.3)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <ShieldAlert size={18} style={{ color: '#e3262e' }} />
          <span>{store.errorToast}</span>
        </div>
      )}
    </>
  )
}

// Backwards compatibility export
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <PageTransitionContentWrapper>{children}</PageTransitionContentWrapper>
}
