'use client'

import React, { useEffect, useRef, useState } from 'react'
import { arkham } from '@/lib/arkham-data'

const BAT_PATH_STRING =
  'M32 8 L35 14 L40 10 L38 18 C46 12 56 14 62 20 C56 20 52 23 50 28 C46 25 42 26 40 30 C38 27 35 26 32 32 C29 26 26 27 24 30 C22 26 18 25 14 28 C12 23 8 20 2 20 C8 14 18 12 26 18 L24 10 L29 14 Z'

const COMIC_WORDS = [
  'CRASH!',
  'OK.',
  'DRIP DRIP',
  'SWIP',
  'BOOM!',
  'NIGHT.',
  'ABOUT TIME DETECTIVE.',
  'SAVE THE SOUL SOCIETY',
  'WHY SO FAR...',
  'POW!',
  'WHAM!',
  'SHADOWS...',
]

const STATUS_MESSAGES = [
  'GATHERING THE DELEGATES',
  'SHARPENING RESOLUTIONS',
  'LIGHTING THE BAT-SIGNAL',
  'SETTING THE AGENDA',
  'PREPARING THE ROOM FOR DIPLOMACY',
  'SESSION IS OPEN',
]

const KEYFRAMES: [number, number][] = [
  [0, 0],
  [500, 8],
  [950, 9],
  [1750, 34],
  [2150, 35],
  [3250, 67],
  [3650, 68],
  [4550, 91],
  [4950, 92],
  [5500, 100],
]

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

function getSimulatedProgress(elapsed: number): number {
  if (elapsed <= 0) return 0
  if (elapsed >= 5500) return 100

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const [t0, p0] = KEYFRAMES[i]
    const [t1, p1] = KEYFRAMES[i + 1]
    if (elapsed >= t0 && elapsed <= t1) {
      const segT = (elapsed - t0) / (t1 - t0)
      return p0 + (p1 - p0) * smoothstep(segT)
    }
  }
  return 100
}

interface CanvasEmber {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

interface CanvasBat {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  heading: number
  scale: number
  flapPhase: number
  flapSpeed: number
  alpha: number
  age: number
}

interface CanvasShockwave {
  x: number
  y: number
  radius: number
  maxRadius: number
  speed: number
  lineWidth: number
  alpha: number
}

// Pre-render offscreen bat sprite for 60fps performance
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

// Pre-render ember sprite
function createEmberSpriteCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 24
  canvas.height = 24
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const grad = ctx.createRadialGradient(12, 12, 0, 12, 12, 12)
  grad.addColorStop(0, 'rgba(255, 230, 160, 1)')
  grad.addColorStop(0.35, 'rgba(255, 90, 40, 0.85)')
  grad.addColorStop(0.7, 'rgba(227, 38, 46, 0.4)')
  grad.addColorStop(1, 'rgba(227, 38, 46, 0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 24, 24)
  return canvas
}

export function Preloader() {
  const [visible, setVisible] = useState(true)

  // DOM Refs
  const loaderRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoHeartbeatRef = useRef<HTMLDivElement>(null)
  const logoBoxRef = useRef<HTMLDivElement>(null)
  const colorLayerWrapRef = useRef<HTMLDivElement>(null)
  const wordsContainerRef = useRef<HTMLDivElement>(null)
  const lightBeamRef = useRef<HTMLDivElement>(null)
  const statusTextRef = useRef<HTMLSpanElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const progressBarFillRef = useRef<HTMLDivElement>(null)
  const progressHeadDotRef = useRef<HTMLDivElement>(null)
  const flashOverlayRef = useRef<HTMLDivElement>(null)
  const eclipseRingRef = useRef<HTMLDivElement>(null)

  // Runtime State Refs (no React re-renders in rAF)
  const rafIdRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const currentStatusIdxRef = useRef(0)
  const batSpriteRef = useRef<HTMLCanvasElement | null>(null)
  const emberSpriteRef = useRef<HTMLCanvasElement | null>(null)

  // Trigger tracking
  const batBeamTriggeredRef = useRef(false)
  const swarm25TriggeredRef = useRef(false)
  const swarm50TriggeredRef = useRef(false)
  const swarm75TriggeredRef = useRef(false)
  const finaleStartedRef = useRef(false)
  const finaleLungeTriggeredRef = useRef(false)
  const eclipseStartedRef = useRef(false)
  const heroRevealedRef = useRef(false)
  const realReadyRef = useRef(false)

  useEffect(() => {
    // 1. Session Storage & Reload Guard
    const isReload =
      typeof window !== 'undefined' &&
      (performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming)?.type === 'reload'
    const hasLoadedThisSession =
      typeof window !== 'undefined' && sessionStorage.getItem('arkham_session_loaded') === 'true'

    if (hasLoadedThisSession && !isReload) {
      setVisible(false)
      return
    }

    // Set session flag
    try {
      sessionStorage.setItem('arkham_session_loaded', 'true')
    } catch {
      // Ignore if cookies/storage blocked
    }

    // 2. Lock page scroll and mark loader active
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.documentElement.setAttribute('data-preloader-active', 'true')

    // 3. Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      // Reduced motion: simple fade and progress bar over 1.2s, then unlock and remove
      const startTime = performance.now()
      const reducedRaf = () => {
        const now = performance.now()
        const progress = Math.min(1, (now - startTime) / 1200)

        if (progressBarFillRef.current) {
          progressBarFillRef.current.style.width = `${(progress * 100).toFixed(1)}%`
        }
        if (pctRef.current) {
          pctRef.current.textContent = `${Math.round(progress * 100)}%`
        }

        if (progress < 1) {
          requestAnimationFrame(reducedRaf)
        } else {
          if (loaderRef.current) {
            loaderRef.current.style.transition = 'opacity 0.4s ease'
            loaderRef.current.style.opacity = '0'
          }
          window.setTimeout(() => {
            document.documentElement.style.overflow = ''
            document.body.style.overflow = ''
            document.documentElement.removeAttribute('data-preloader-active')
            setVisible(false)
          }, 400)
        }
      }
      requestAnimationFrame(reducedRaf)
      return () => {
        document.documentElement.style.overflow = ''
        document.body.style.overflow = ''
        document.documentElement.removeAttribute('data-preloader-active')
      }
    }

    // 4. Real readiness detection: fonts, hero logo decode, window load
    let readySignalsCount = 0
    const totalSignals = 3
    const checkSignal = () => {
      readySignalsCount++
      if (readySignalsCount >= totalSignals) {
        realReadyRef.current = true
      }
    }

    // Fonts ready
    if (document.fonts?.ready) {
      document.fonts.ready.then(checkSignal).catch(checkSignal)
    } else {
      checkSignal()
    }

    // Hero Logo decode
    const img = new Image()
    img.src = arkham.logo
    if (typeof img.decode === 'function') {
      img.decode().then(checkSignal).catch(checkSignal)
    } else {
      img.onload = checkSignal
      img.onerror = checkSignal
    }

    // Window / DOM ready
    if (document.readyState === 'complete') {
      checkSignal()
    } else {
      window.addEventListener('load', checkSignal, { once: true })
    }

    // 5. Pre-render sprites
    batSpriteRef.current = createBatSpriteCanvas()
    emberSpriteRef.current = createEmberSpriteCanvas()

    // 6. Canvas sizing & Particle systems
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let canvasWidth = window.innerWidth
    let canvasHeight = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const isMobile = window.innerWidth <= 640

    canvas.width = Math.floor(canvasWidth * dpr)
    canvas.height = Math.floor(canvasHeight * dpr)
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`
    ctx.scale(dpr, dpr)

    const handleResize = () => {
      canvasWidth = window.innerWidth
      canvasHeight = window.innerHeight
      canvas.width = Math.floor(canvasWidth * dpr)
      canvas.height = Math.floor(canvasHeight * dpr)
      canvas.style.width = `${canvasWidth}px`
      canvas.style.height = `${canvasHeight}px`
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    window.addEventListener('resize', handleResize)

    const embers: CanvasEmber[] = []
    const bats: CanvasBat[] = []
    const shockwaves: CanvasShockwave[] = []

    const maxEmbers = isMobile ? 30 : 60

    const spawnBatSwarm = (count: number, fromCenter = false) => {
      const actualCount = isMobile ? Math.ceil(count / 2) : count
      const cx = canvasWidth / 2
      const cy = canvasHeight / 2 - 25

      for (let i = 0; i < actualCount; i++) {
        let x: number
        let y: number
        let vx: number
        let vy: number
        let speed: number

        if (fromCenter) {
          // Radiate outward from logo center at finale
          const angle = Math.random() * Math.PI * 2
          speed = Math.random() * 5 + 5.5
          x = cx + Math.cos(angle) * 35
          y = cy + Math.sin(angle) * 35
          vx = Math.cos(angle) * speed
          vy = Math.sin(angle) * speed
        } else {
          // Cross the screen
          const moveRight = Math.random() > 0.5
          x = moveRight ? -40 : canvasWidth + 40
          y = canvasHeight * (0.2 + Math.random() * 0.6)
          speed = Math.random() * 3.5 + 3.8
          vx = moveRight ? speed : -speed
          vy = (Math.random() - 0.5) * 2.2
        }

        const heading = Math.atan2(vy, vx)
        bats.push({
          x,
          y,
          vx,
          vy,
          speed,
          heading,
          scale: Math.random() * 0.28 + 0.38,
          flapPhase: Math.random() * Math.PI * 2,
          flapSpeed: Math.random() * 0.25 + 0.3,
          alpha: 0,
          age: 0,
        })
      }
    }

    // 7. Comic Pop Words Spawn Timer
    let lastWordSpawn = 0
    const spawnComicWord = (now: number) => {
      if (!wordsContainerRef.current) return
      if (now - lastWordSpawn < 520) return
      lastWordSpawn = now

      const container = wordsContainerRef.current
      const maxWords = window.innerWidth < 480 ? 2 : 6
      if (container.children.length >= maxWords) {
        container.removeChild(container.children[0])
      }

      const word = COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)]
      const rot = Math.round((Math.random() - 0.5) * 24) // ±12deg
      const size = Math.floor(Math.random() * 23 + 22) // 22-44px

      // Spawn outside central 48% x 52% area
      const zone = Math.floor(Math.random() * 4)
      let leftPct = 50
      let topPct = 50

      switch (zone) {
        case 0: // Top band
          leftPct = Math.random() * 88 + 6
          topPct = Math.random() * 15 + 6
          break
        case 1: // Bottom band
          leftPct = Math.random() * 88 + 6
          topPct = Math.random() * 14 + 78
          break
        case 2: // Left band
          leftPct = Math.random() * 16 + 6
          topPct = Math.random() * 66 + 16
          break
        case 3: // Right band
        default:
          leftPct = Math.random() * 16 + 76
          topPct = Math.random() * 66 + 16
          break
      }

      const el = document.createElement('span')
      el.className = 'comic-pop-word'
      el.textContent = word
      el.style.left = `${leftPct.toFixed(1)}%`
      el.style.top = `${topPct.toFixed(1)}%`
      el.style.fontSize = `${size}px`
      el.style.setProperty('--rot', `${rot}deg`)

      container.appendChild(el)
      window.setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el)
      }, 1900)
    }

    // 8. Main requestAnimationFrame loop
    runningRef.current = true
    const loopStartTime = performance.now()
    let finaleStartTime = 0
    let eclipseStartTime = 0

    const finishAndCleanup = () => {
      runningRef.current = false
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.removeAttribute('data-preloader-active')
      document.documentElement.classList.remove('reveal-hero')
      setVisible(false)
    }

    const renderLoop = (now: number) => {
      if (!runningRef.current) return

      const elapsed = now - loopStartTime
      const simP = getSimulatedProgress(elapsed)

      // Real progress integration & 8s safety timeout
      let p = simP / 100
      if (elapsed >= 5500 && !realReadyRef.current && elapsed < 8000) {
        p = 0.99
      } else if (elapsed >= 8000 || (elapsed >= 5500 && realReadyRef.current)) {
        p = 1.0
      }

      // 8.1 Blood-Fill Logo: 21 wavy clip-path points & glow
      if (colorLayerWrapRef.current) {
        const t = now * 0.001
        const points: string[] = []
        for (let i = 0; i <= 20; i++) {
          const x = i * 5 // 0% to 100%
          const y = (1 - p) * 104 + Math.sin(x * 0.18 + t * 4) * 2.4
          points.push(`${x}% ${y.toFixed(2)}%`)
        }
        colorLayerWrapRef.current.style.clipPath = `polygon(0% 100%, ${points.join(', ')}, 100% 100%)`
      }

      if (logoBoxRef.current) {
        logoBoxRef.current.style.setProperty('--p', p.toFixed(3))
      }

      // 8.2 Progress Bar Fill & Head Dot
      if (progressBarFillRef.current) {
        progressBarFillRef.current.style.width = `${(p * 100).toFixed(1)}%`
      }
      if (progressHeadDotRef.current) {
        progressHeadDotRef.current.style.left = `${(p * 100).toFixed(1)}%`
      }
      if (pctRef.current) {
        pctRef.current.textContent = `${Math.round(p * 100)}%`
      }

      // 8.3 Bat-Signal Light Beam trigger at 38%
      if (p >= 0.38 && !batBeamTriggeredRef.current) {
        batBeamTriggeredRef.current = true
        if (lightBeamRef.current) {
          lightBeamRef.current.classList.add('is-flickering')
        }
      }

      // 8.4 Bat swarms crossing at 25%, 50%, 75%
      if (p >= 0.25 && !swarm25TriggeredRef.current) {
        swarm25TriggeredRef.current = true
        spawnBatSwarm(6)
      }
      if (p >= 0.5 && !swarm50TriggeredRef.current) {
        swarm50TriggeredRef.current = true
        spawnBatSwarm(9)
      }
      if (p >= 0.75 && !swarm75TriggeredRef.current) {
        swarm75TriggeredRef.current = true
        spawnBatSwarm(12)
      }

      // 8.5 Status text message swaps with 0.35s glitch
      let statusIdx = 0
      if (p >= 0.97) statusIdx = 5
      else if (p >= 0.78) statusIdx = 4
      else if (p >= 0.58) statusIdx = 3
      else if (p >= 0.38) statusIdx = 2
      else if (p >= 0.18) statusIdx = 1

      if (statusIdx !== currentStatusIdxRef.current) {
        currentStatusIdxRef.current = statusIdx
        if (statusTextRef.current) {
          statusTextRef.current.textContent = STATUS_MESSAGES[statusIdx]
          statusTextRef.current.classList.remove('is-glitching')
          void statusTextRef.current.offsetWidth
          statusTextRef.current.classList.add('is-glitching')
        }
      }

      // 8.6 Spawn comic pop words while loading
      if (p < 0.98) {
        spawnComicWord(now)
      }

      // 8.7 Canvas Clearing & Drawing
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      const logoCenterCX = canvasWidth / 2
      const logoCenterCY = canvasHeight / 2 - 25
      const logoRadius = (isMobile ? 55 : 75)

      // Canvas: Embers rising from logo edge
      if (embers.length < maxEmbers && p < 1.0) {
        const theta = Math.random() * Math.PI * 2
        const rad = logoRadius * (0.94 + Math.random() * 0.08)
        const ex = logoCenterCX + Math.cos(theta) * rad
        const ey = logoCenterCY + Math.sin(theta) * rad
        const vx = (Math.random() - 0.5) * 0.7
        const vy = -(Math.random() * 1.5 + 0.8)
        const maxLife = Math.floor(Math.random() * 35 + 30)
        embers.push({ x: ex, y: ey, vx, vy, life: maxLife, maxLife, size: Math.random() * 2 + 1 })
      }

      const emberSprite = emberSpriteRef.current
      if (emberSprite) {
        ctx.globalCompositeOperation = 'lighter'
        for (let i = embers.length - 1; i >= 0; i--) {
          const em = embers[i]
          em.x += em.vx
          em.y += em.vy
          em.vy -= 0.02
          em.life--
          if (em.life <= 0) {
            embers.splice(i, 1)
            continue
          }
          const lifeProgress = em.life / em.maxLife
          const alpha = Math.sin(lifeProgress * Math.PI) * 0.85
          const sz = em.size * (0.6 + 0.4 * lifeProgress) * 3
          ctx.globalAlpha = alpha
          ctx.drawImage(emberSprite, em.x - sz, em.y - sz, sz * 2, sz * 2)
        }
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
      }

      // Canvas: Bats
      const batSprite = batSpriteRef.current
      if (batSprite) {
        for (let i = bats.length - 1; i >= 0; i--) {
          const b = bats[i]
          b.x += b.vx
          b.y += b.vy
          b.flapPhase += b.flapSpeed
          b.age++
          b.alpha = Math.min(1, b.age / 10)

          if (b.x < -70 || b.x > canvasWidth + 70 || b.y < -70 || b.y > canvasHeight + 70) {
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
        ctx.globalAlpha = 1
      }

      // Canvas: Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i]
        sw.radius += sw.speed
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius)

        if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
          shockwaves.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.beginPath()
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(227, 38, 46, ${sw.alpha * 0.85})`
        ctx.lineWidth = sw.lineWidth * sw.alpha
        ctx.shadowColor = '#e3262e'
        ctx.shadowBlur = 12
        ctx.stroke()
        ctx.restore()
      }

      // 8.8 FINALE SEQUENCE AT 100%
      if (p >= 1.0) {
        if (!finaleStartedRef.current) {
          finaleStartedRef.current = true
          finaleStartTime = now
        }

        const finaleElapsed = now - finaleStartTime

        // At +250ms: logo lunges (scale 1 -> 1.5 -> 1), flash, 3 shockwave rings, 24-bat swarm
        if (finaleElapsed >= 250 && !finaleLungeTriggeredRef.current) {
          finaleLungeTriggeredRef.current = true

          if (logoHeartbeatRef.current) {
            logoHeartbeatRef.current.classList.add('is-lunging')
          }
          if (flashOverlayRef.current) {
            flashOverlayRef.current.classList.add('is-flashing')
          }

          // 3 shockwave rings
          const maxR = Math.hypot(canvasWidth, canvasHeight) * 0.65
          shockwaves.push({ x: logoCenterCX, y: logoCenterCY, radius: 10, maxRadius: maxR, speed: 7.5, lineWidth: 3.5, alpha: 1 })
          window.setTimeout(() => {
            shockwaves.push({ x: logoCenterCX, y: logoCenterCY, radius: 10, maxRadius: maxR, speed: 9, lineWidth: 2.8, alpha: 1 })
          }, 80)
          window.setTimeout(() => {
            shockwaves.push({ x: logoCenterCX, y: logoCenterCY, radius: 10, maxRadius: maxR, speed: 10.5, lineWidth: 2, alpha: 1 })
          }, 160)

          // 24-bat swarm bursting outward
          spawnBatSwarm(24, true)
        }

        // At +1000ms: eclipse opens over 1s (ease-in-out)
        if (finaleElapsed >= 1000) {
          if (!eclipseStartedRef.current) {
            eclipseStartedRef.current = true
            eclipseStartTime = now
            if (loaderRef.current) {
              loaderRef.current.classList.add('is-eclipsing')
            }
          }

          const eclipseElapsed = now - eclipseStartTime
          const tEclipse = Math.min(1, eclipseElapsed / 1000)

          // Smooth easeInOutCubic
          const easeR =
            tEclipse < 0.5
              ? 4 * tEclipse * tEclipse * tEclipse
              : 1 - Math.pow(-2 * tEclipse + 2, 3) / 2

          const diagonalHalf = Math.hypot(canvasWidth, canvasHeight) / 2 + 60
          const currentR = easeR * diagonalHalf

          if (loaderRef.current) {
            loaderRef.current.style.setProperty('--r', `${currentR.toFixed(1)}px`)
          }

          // When hole is ~35% open: start hero text reveal
          if (tEclipse >= 0.35 && !heroRevealedRef.current) {
            heroRevealedRef.current = true
            document.documentElement.classList.add('reveal-hero')
            window.dispatchEvent(new CustomEvent('arkham-hero-reveal'))
          }

          // At 1000ms eclipse duration completion: cleanup and remove from DOM
          if (tEclipse >= 1) {
            finishAndCleanup()
            return
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(renderLoop)
    }

    rafIdRef.current = requestAnimationFrame(renderLoop)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.removeAttribute('data-preloader-active')
      document.documentElement.classList.remove('reveal-hero')
    }
  }, [])

  if (!visible) return null

  const titleChars = ['A', 'R', 'K', 'H', 'A', 'M', '\u00A0', 'M', 'U', 'N']

  return (
    <div
      ref={loaderRef}
      className="arkham-loading"
      role="status"
      aria-live="polite"
      aria-label="Loading Arkham MUN"
    >
      {/* 1. Atmospheric Comic Collage Texture */}
      <div className="loading-comic-texture" aria-hidden="true" />

      {/* 2. Diagonal White Streak */}
      <div className="preloader-diagonal-streak" aria-hidden="true" />

      {/* 3. Bat-Signal in Top Right */}
      <div className="preloader-bat-signal" aria-hidden="true">
        <svg
          viewBox="0 0 64 36"
          className="w-10 h-6 text-[#e3262e] fill-current"
          style={{ filter: 'drop-shadow(0 0 10px #e3262e)' }}
        >
          <path d={BAT_PATH_STRING} />
        </svg>
      </div>

      {/* 4. Light Beam from Bat-Signal to Bottom-Left (38%+) */}
      <div ref={lightBeamRef} className="preloader-light-beam" aria-hidden="true" />

      {/* 5. Comic Pop Words Floating Container */}
      <div ref={wordsContainerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-10" />

      {/* 6. Eclipse Edge Glowing Red Ring */}
      <div ref={eclipseRingRef} className="preloader-eclipse-ring" aria-hidden="true" />

      {/* 7. Full-screen Pointer-Events-None Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-20" />

      {/* 8. Tilted Rotating Ellipse Orbits with Animated Sparks */}
      <svg className="loading-orbit-svg" viewBox="-200 -200 400 400" aria-hidden="true">
        <defs>
          <path id="preloader-orbit-1" d="M 0,-165 A 70 165 0 1 0 0,165 A 70 165 0 1 0 0,-165 Z" />
          <path id="preloader-orbit-2" d="M 0,-150 A 60 150 0 1 0 0,150 A 60 150 0 1 0 0,-150 Z" />
          <filter id="preloader-glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="preloader-glow-white" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Orbit 1: rx 70 ry 165 tilted 20deg, 14s clockwise */}
        <g className="preloader-orbit-g1">
          <use
            href="#preloader-orbit-1"
            fill="none"
            stroke="#e3262e"
            strokeWidth="1.2"
            strokeDasharray="6 8"
            strokeOpacity="0.45"
          />
          <circle r="3.5" fill="#e3262e" filter="url(#preloader-glow-red)">
            <animateMotion dur="5s" repeatCount="indefinite">
              <mpath href="#preloader-orbit-1" />
            </animateMotion>
          </circle>
        </g>

        {/* Orbit 2: rx 60 ry 150 tilted -35deg, 20s counter-clockwise */}
        <g className="preloader-orbit-g2">
          <use
            href="#preloader-orbit-2"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
            strokeDasharray="4 7"
            strokeOpacity="0.35"
          />
          <circle r="3" fill="#ffffff" filter="url(#preloader-glow-white)">
            <animateMotion dur="7s" repeatCount="indefinite">
              <mpath href="#preloader-orbit-2" />
            </animateMotion>
          </circle>
        </g>
      </svg>

      {/* 9. Core Center: Double-Layer Blood-Fill Logo, Heartbeat & Staggered Title */}
      <div className="loading-core">
        <div ref={logoHeartbeatRef} className="loading-logo-heartbeat">
          <div ref={logoBoxRef} className="loading-logo-box">
            {/* Grayscale Base Layer */}
            <img
              src={arkham.logo}
              alt="Arkham MUN Logo"
              className="loading-logo-base"
              draggable={false}
            />
            {/* Liquid Blood-fill Color Layer */}
            <div ref={colorLayerWrapRef} className="loading-logo-color-wrap">
              <img
                src={arkham.logo}
                alt=""
                className="loading-logo-color"
                draggable={false}
              />
              <div className="loading-liquid-sheen" />
            </div>
          </div>
        </div>

        {/* Staggered Rise Letters for "ARKHAM MUN" */}
        <span className="loading-title">
          {titleChars.map((char, idx) => (
            <span
              key={idx}
              className="loading-title-letter"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              {char}
            </span>
          ))}
        </span>

        {/* Subtitle */}
        <small className="loading-subtitle">THE NEXT SESSION IS LOADING</small>
      </div>

      {/* 10. Bottom Progress Deck: Status Row + Progress Bar + Leading Edge White Dot */}
      <div className="loading-bottom-deck">
        <div className="loading-status-row">
          <span ref={statusTextRef} className="loading-status-text">
            {STATUS_MESSAGES[0]}
          </span>
          <span ref={pctRef} className="loading-status-pct">
            0%
          </span>
        </div>

        <div className="loading-progress-shell">
          <div ref={progressBarFillRef} className="loading-progress-fill" />
          <div ref={progressHeadDotRef} className="loading-progress-dot" />
        </div>
      </div>

      {/* 11. Red/White Flash Overlay at Finale */}
      <div ref={flashOverlayRef} className="preloader-flash" aria-hidden="true" />
    </div>
  )
}

export const ArkhamLoadingScreen = Preloader
