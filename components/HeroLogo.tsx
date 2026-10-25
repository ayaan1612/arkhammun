"use client"

import React, { useEffect, useRef } from "react"

interface HeroLogoProps {
  logoUrl: string
  className?: string
}

interface Bat {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  heading: number
  steerFreq: number
  steerPhase: number
  steerAmp: number
  flapPhase: number
  flapSpeed: number
  scale: number
  age: number
  alpha: number
}

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

interface Shockwave {
  r: number
  maxR: number
  speed: number
  alpha: number
  width: number
}

interface LightningBolt {
  points: { x: number; y: number }[]
  branches: { x: number; y: number }[][]
  life: number
  maxLife: number
}

interface GiantBat {
  active: boolean
  startTime: number
  duration: number
  startX: number
  targetX: number
  baseY: number
  scale: number
  direction: 1 | -1
  triggeredLogoStrike: boolean
}

const BAT_PATH_STRING =
  "M32 8 L35 14 L40 10 L38 18 C46 12 56 14 62 20 C56 20 52 23 50 28 C46 25 42 26 40 30 C38 27 35 26 32 32 C29 26 26 27 24 30 C22 26 18 25 14 28 C12 23 8 20 2 20 C8 14 18 12 26 18 L24 10 L29 14 Z"

// Offscreen sprite generators: pre-render once to avoid shadowBlur, ctx.filter, or createRadialGradient in rAF
function createBatSpriteCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = 96
  canvas.height = 56
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const path = new Path2D(BAT_PATH_STRING)
  ctx.save()
  ctx.translate(48, 28)
  ctx.translate(-32, -20)
  ctx.shadowColor = "#e5252d"
  ctx.shadowBlur = 8
  ctx.fillStyle = "#e5252d"
  ctx.fill(path)
  ctx.restore()
  return canvas
}

function createGiantBatSpriteCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = 120
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const path = new Path2D(BAT_PATH_STRING)
  ctx.save()
  ctx.translate(60, 32)
  ctx.translate(-32, -20)

  // Faint red edge
  ctx.strokeStyle = "rgba(229, 37, 45, 0.65)"
  ctx.lineWidth = 2.5
  ctx.stroke(path)

  // Dark shadow fill
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
  ctx.fill(path)
  ctx.restore()
  return canvas
}

function createEmberSpriteCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, "rgba(255, 220, 120, 1)")
  grad.addColorStop(0.3, "rgba(255, 140, 50, 0.8)")
  grad.addColorStop(0.7, "rgba(229, 37, 45, 0.35)")
  grad.addColorStop(1, "rgba(229, 37, 45, 0)")

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 32, 32)
  return canvas
}

export function HeroLogo({ logoUrl, className = "" }: HeroLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const swayWrapperRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const ringsRef = useRef<SVGSVGElement>(null)
  const diskRef = useRef<HTMLDivElement>(null)
  const baseImgRef = useRef<HTMLImageElement>(null)
  const glitchRedRef = useRef<HTMLImageElement>(null)
  const glitchWhiteRef = useRef<HTMLImageElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  // Single loop guard & timing refs
  const runningRef = useRef(false)
  const rafIdRef = useRef<number | null>(null)
  const timerIdsRef = useRef<(ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>)[]>([])
  const isIntersectingRef = useRef(true)
  const lastClickTimeRef = useRef(0)
  const flashAnimRef = useRef<Animation | null>(null)

  // Pre-rendered offscreen sprite canvases
  const batSpriteRef = useRef<HTMLCanvasElement | null>(null)
  const giantBatSpriteRef = useRef<HTMLCanvasElement | null>(null)
  const emberSpriteRef = useRef<HTMLCanvasElement | null>(null)

  // Cached layout metrics to prevent getBoundingClientRect in rAF
  const metricsRef = useRef({
    canvasWidth: 0,
    canvasHeight: 0,
    centerX: 0,
    centerY: 0,
    logoRadius: 100,
    dpr: 1,
  })

  // Mutable animation state
  const stateRef = useRef<{
    isFinePointer: boolean
    reducedMotion: boolean
    isHovered: boolean
    isGlitching: boolean
    // Screen / logo shake
    shakeTimeRemaining: number
    shakeDuration: number
    shakeIntensity: number
    // Dimming and flash boosts
    dimMultiplier: number
    lightningBrightness: number
    // Sway motion (PART C)
    swayPhase: number
    swaySpeedMultiplier: number
    // 3D tilt tracking
    tiltTarget: { rotX: number; rotY: number; shiftX: number; shiftY: number; hlX: number; hlY: number }
    tiltCurrent: { rotX: number; rotY: number; shiftX: number; shiftY: number; hlX: number; hlY: number }
    // Particle collections with hard caps
    bats: Bat[]
    embers: Ember[]
    shockwaves: Shockwave[]
    lightningBolts: LightningBolt[]
    // Giant shadow bat (PART B)
    giantBat: GiantBat
  }>({
    isFinePointer: true,
    reducedMotion: false,
    isHovered: false,
    isGlitching: false,
    shakeTimeRemaining: 0,
    shakeDuration: 0,
    shakeIntensity: 0,
    dimMultiplier: 1,
    lightningBrightness: 1,
    swayPhase: 0,
    swaySpeedMultiplier: 1,
    tiltTarget: { rotX: 0, rotY: 0, shiftX: 0, shiftY: 0, hlX: 50, hlY: 50 },
    tiltCurrent: { rotX: 0, rotY: 0, shiftX: 0, shiftY: 0, hlX: 50, hlY: 50 },
    bats: [],
    embers: [],
    shockwaves: [],
    lightningBolts: [],
    giantBat: {
      active: false,
      startTime: 0,
      duration: 1200,
      startX: 0,
      targetX: 0,
      baseY: 0,
      scale: 5,
      direction: 1,
      triggeredLogoStrike: false,
    },
  })

  useEffect(() => {
    const s = stateRef.current

    // Environment capabilities
    if (typeof window !== "undefined") {
      s.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      s.isFinePointer = window.matchMedia("(pointer: fine)").matches
      // Generate offscreen sprites once
      batSpriteRef.current = createBatSpriteCanvas()
      giantBatSpriteRef.current = createGiantBatSpriteCanvas()
      emberSpriteRef.current = createEmberSpriteCanvas()
    }

    // Helper: managed timer with automatic cleanup tracking
    const addTimeout = (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
      const id = setTimeout(() => {
        timerIdsRef.current = timerIdsRef.current.filter((t) => t !== id)
        fn()
      }, ms)
      timerIdsRef.current.push(id)
      return id
    }

    // Measure metrics only on mount/resize (zero layout reads in the loop)
    const updateMetrics = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return

      const rect = container.getBoundingClientRect()
      const isMobile = window.innerWidth < 768
      const maxDpr = isMobile ? 1.5 : 2
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)

      const w = rect.width * 2.2
      const h = rect.height * 2.2

      metricsRef.current = {
        canvasWidth: w,
        canvasHeight: h,
        centerX: w / 2,
        centerY: h / 2,
        logoRadius: (rect.width * 0.86) / 2,
        dpr,
      }

      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }

    updateMetrics()

    const resizeObserver = new ResizeObserver(() => updateMetrics())
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null
    const handleScrollEnd = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(updateMetrics, 120)
    }
    window.addEventListener("scroll", handleScrollEnd, { passive: true })

    // Particle spawning with global array caps
    const spawnBats = (count: number) => {
      if (s.reducedMotion) return
      const cx = metricsRef.current.centerX
      const cy = metricsRef.current.centerY
      const rLimit = metricsRef.current.logoRadius * 0.72

      for (let i = 0; i < count; i++) {
        const spawnAngle = Math.random() * Math.PI * 2
        const spawnDist = Math.random() * rLimit
        const startX = cx + Math.cos(spawnAngle) * spawnDist
        const startY = cy + Math.sin(spawnAngle) * spawnDist

        const outAngle = Math.atan2(startY - cy, startX - cx) + (Math.random() - 0.5) * 0.65
        const speed = Math.random() * 2.8 + 2.2
        const vx = Math.cos(outAngle) * speed
        const vy = Math.sin(outAngle) * speed

        s.bats.push({
          x: startX,
          y: startY,
          vx,
          vy,
          speed,
          heading: outAngle,
          steerFreq: Math.random() * 0.08 + 0.04,
          steerPhase: Math.random() * Math.PI * 2,
          steerAmp: Math.random() * 0.04 + 0.02,
          flapPhase: Math.random() * Math.PI * 2,
          flapSpeed: Math.random() * 0.35 + 0.28,
          scale: Math.random() * 0.35 + 0.45,
          age: 0,
          alpha: 0,
        })
      }

      // Hard cap: bats <= 30 (drop oldest)
      if (s.bats.length > 30) {
        s.bats.splice(0, s.bats.length - 30)
      }
    }

    const spawnShockwaves = (count: number) => {
      if (s.reducedMotion) return
      const baseR = metricsRef.current.logoRadius * 0.85
      for (let i = 0; i < count; i++) {
        s.shockwaves.push({
          r: baseR - i * 16,
          maxR: baseR * 2.8,
          speed: Math.random() * 3.5 + 4.5,
          alpha: 0.95 - i * 0.12,
          width: 3.5 - i * 0.6,
        })
      }

      // Hard cap: shockwaves <= 4 (drop oldest)
      if (s.shockwaves.length > 4) {
        s.shockwaves.splice(0, s.shockwaves.length - 4)
      }
    }

    const triggerShake = (durationMs: number, intensityPx: number = 6) => {
      if (s.reducedMotion) return
      s.shakeDuration = durationMs
      s.shakeTimeRemaining = durationMs
      s.shakeIntensity = intensityPx
    }

    // Web Animations API: zero forced reflows
    const triggerFlash = (color = "rgba(229, 37, 45, 0.75)", duration = 150) => {
      if (!flashRef.current || s.reducedMotion) return
      if (flashAnimRef.current) flashAnimRef.current.cancel()
      flashAnimRef.current = flashRef.current.animate(
        [
          {
            opacity: 0.85,
            background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${color} 45%, transparent 75%)`,
          },
          { opacity: 0 },
        ],
        { duration, easing: "ease-out" }
      )
    }

    const triggerGlitch = () => {
      if (s.reducedMotion || s.isGlitching) return
      s.isGlitching = true
      let elapsed = 0
      const duration = 500

      const intervalId = setInterval(() => {
        elapsed += 45
        if (elapsed >= duration) {
          clearInterval(intervalId)
          s.isGlitching = false
          if (glitchRedRef.current) {
            glitchRedRef.current.style.opacity = "0"
            glitchRedRef.current.style.clipPath = "none"
            glitchRedRef.current.style.transform = "none"
          }
          if (glitchWhiteRef.current) {
            glitchWhiteRef.current.style.opacity = "0"
            glitchWhiteRef.current.style.clipPath = "none"
            glitchWhiteRef.current.style.transform = "none"
          }
          if (baseImgRef.current) {
            baseImgRef.current.style.transform = "none"
          }
          return
        }

        const redTop = Math.floor(Math.random() * 75)
        const redHeight = Math.floor(Math.random() * 22 + 8)
        const redBottom = Math.max(0, 100 - redTop - redHeight)
        const redOffset = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 8 + 10)

        const whiteTop = Math.floor(Math.random() * 75)
        const whiteHeight = Math.floor(Math.random() * 20 + 6)
        const whiteBottom = Math.max(0, 100 - whiteTop - whiteHeight)
        const whiteOffset = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 8 + 10)

        const baseJitterX = (Math.random() - 0.5) * (Math.random() * 2 + 2) * 2
        const baseJitterY = (Math.random() - 0.5) * (Math.random() * 2 + 2) * 2

        if (glitchRedRef.current) {
          glitchRedRef.current.style.clipPath = `inset(${redTop}% 0 ${redBottom}% 0)`
          glitchRedRef.current.style.transform = `translateX(${redOffset}px)`
          glitchRedRef.current.style.opacity = "0.92"
        }
        if (glitchWhiteRef.current) {
          glitchWhiteRef.current.style.clipPath = `inset(${whiteTop}% 0 ${whiteBottom}% 0)`
          glitchWhiteRef.current.style.transform = `translateX(${whiteOffset}px)`
          glitchWhiteRef.current.style.opacity = "0.78"
        }
        if (baseImgRef.current) {
          baseImgRef.current.style.transform = `translate(${baseJitterX}px, ${baseJitterY}px)`
        }
      }, 45)

      timerIdsRef.current.push(intervalId)
    }

    const triggerLightning = () => {
      if (s.reducedMotion) return
      const cx = metricsRef.current.centerX
      const cy = metricsRef.current.centerY
      const startX = cx + (Math.random() - 0.5) * 60
      const startY = 0
      const targetX = cx + (Math.random() - 0.5) * 20
      const targetY = cy - metricsRef.current.logoRadius

      const segments = 14
      const points: { x: number; y: number }[] = [{ x: startX, y: startY }]
      const dx = targetX - startX
      const dy = targetY - startY
      const len = Math.hypot(dx, dy)
      const nx = -dy / len
      const ny = dx / len

      for (let i = 1; i < segments; i++) {
        const t = i / segments
        const bx = startX + dx * t
        const by = startY + dy * t
        const displacement = (Math.random() - 0.5) * 36 * Math.sin(t * Math.PI)
        points.push({ x: bx + nx * displacement, y: by + ny * displacement })
      }
      points.push({ x: targetX, y: targetY })

      const branches: { x: number; y: number }[][] = []
      const branchIndices = [4, 9]
      for (const idx of branchIndices) {
        if (points[idx] && Math.random() > 0.25) {
          const bp = points[idx]
          const branch: { x: number; y: number }[] = [bp]
          const branchDirX = nx * (Math.random() > 0.5 ? 1 : -1) + (Math.random() - 0.5) * 0.4
          const branchDirY = 0.8
          let curX = bp.x
          let curY = bp.y
          for (let b = 0; b < 4; b++) {
            curX += branchDirX * 14 + (Math.random() - 0.5) * 8
            curY += branchDirY * 14 + (Math.random() - 0.5) * 8
            branch.push({ x: curX, y: curY })
          }
          branches.push(branch)
        }
      }

      s.lightningBolts.push({ points, branches, life: 20, maxLife: 20 })
      if (s.lightningBolts.length > 2) {
        s.lightningBolts.splice(0, s.lightningBolts.length - 2)
      }

      s.lightningBrightness = 1.7
      triggerFlash("rgba(229, 37, 45, 0.75)", 140)

      addTimeout(() => {
        s.lightningBrightness = 1
      }, 140)
    }

    // PART B: Giant Shadow Bat launch
    const launchGiantBat = () => {
      if (s.reducedMotion || !isIntersectingRef.current || document.hidden) return
      const vw = typeof window !== "undefined" ? window.innerWidth : 1200
      const scale = Math.min(8, Math.max(3, vw / 120))
      const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1
      const totalWidth = 120 * scale

      const startX = direction === 1 ? -totalWidth - 60 : metricsRef.current.canvasWidth + totalWidth + 60
      const targetX = direction === 1 ? metricsRef.current.canvasWidth + totalWidth + 60 : -totalWidth - 60
      const baseY = metricsRef.current.centerY - metricsRef.current.logoRadius * 0.42

      s.giantBat = {
        active: true,
        startTime: performance.now(),
        duration: 1200,
        startX,
        targetX,
        baseY,
        scale,
        direction,
        triggeredLogoStrike: false,
      }
    }

    const scheduleGiantBat = (delay: number) => {
      addTimeout(() => {
        launchGiantBat()
        scheduleGiantBat(Math.random() * 10000 + 15000) // repeat every 15-25s
      }, delay)
    }

    // Scheduling ambient loops
    const scheduleBatSwarm = () => {
      addTimeout(() => {
        spawnBats(4)
        scheduleBatSwarm()
      }, Math.random() * 5000 + 7000)
    }

    const scheduleLightningStrike = () => {
      addTimeout(() => {
        triggerLightning()
        scheduleLightningStrike()
      }, Math.random() * 6000 + 9000)
    }

    const scheduleGlitchCycle = () => {
      addTimeout(() => {
        triggerGlitch()
        scheduleGlitchCycle()
      }, Math.random() * 3500 + 4500)
    }

    // Mount intro sequence: slam at 640ms, giant bat at 700ms
    if (!s.reducedMotion) {
      addTimeout(() => {
        spawnShockwaves(3)
        triggerShake(550, 9)
        triggerFlash("rgba(229, 37, 45, 0.85)", 180)
        triggerLightning()
        spawnBats(18)
      }, 640)

      scheduleGiantBat(700) // PART B: launch 700ms after page opens
      scheduleBatSwarm()
      scheduleLightningStrike()
      scheduleGlitchCycle()
    }

    // PART D.2: Throttled click handling (700ms cooldown, at most 6 bats and 1 shockwave)
    const handleClick = () => {
      if (s.reducedMotion) return
      const now = performance.now()
      if (now - lastClickTimeRef.current < 700) return
      lastClickTimeRef.current = now

      spawnBats(6)
      spawnShockwaves(1)
      triggerGlitch()
      triggerShake(300, 5)
      triggerFlash("rgba(229, 37, 45, 0.5)", 140)
    }

    const containerEl = containerRef.current
    if (containerEl) {
      containerEl.addEventListener("click", handleClick)
    }

    // 3D tilt tracking
    const handlePointerMove = (e: PointerEvent) => {
      if (!s.isFinePointer || s.reducedMotion || !containerEl) return
      const rect = containerEl.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const nx = Math.max(-1, Math.min(1, (px - 0.5) * 2))
      const ny = Math.max(-1, Math.min(1, (py - 0.5) * 2))

      s.tiltTarget.rotX = -ny * 16
      s.tiltTarget.rotY = nx * 16
      s.tiltTarget.shiftX = nx * 12
      s.tiltTarget.shiftY = ny * 12
      s.tiltTarget.hlX = 50 + nx * 35
      s.tiltTarget.hlY = 50 + ny * 35
    }

    const handlePointerEnter = () => {
      s.isHovered = true
      if (containerEl) containerEl.classList.add("is-hovered")
    }

    const handlePointerLeave = () => {
      s.isHovered = false
      if (containerEl) containerEl.classList.remove("is-hovered")
      s.tiltTarget.rotX = 0
      s.tiltTarget.rotY = 0
      s.tiltTarget.shiftX = 0
      s.tiltTarget.shiftY = 0
      s.tiltTarget.hlX = 50
      s.tiltTarget.hlY = 50
    }

    if (containerEl && s.isFinePointer) {
      containerEl.addEventListener("pointermove", handlePointerMove)
      containerEl.addEventListener("pointerenter", handlePointerEnter)
      containerEl.addEventListener("pointerleave", handlePointerLeave)
    }

    // PART D.1: Single Loop Guard with Start / Stop helpers
    let lastTime = performance.now()

    const renderLoop = (now: number) => {
      if (!runningRef.current) return
      const dt = Math.min(now - lastTime, 45)
      lastTime = now

      if (!s.reducedMotion) {
        // 1. Shake decay
        let shakeOffsetX = 0
        let shakeOffsetY = 0
        if (s.shakeTimeRemaining > 0) {
          s.shakeTimeRemaining -= dt
          const factor = Math.max(0, s.shakeTimeRemaining / s.shakeDuration)
          shakeOffsetX = (Math.random() - 0.5) * s.shakeIntensity * factor * 2
          shakeOffsetY = (Math.random() - 0.5) * s.shakeIntensity * factor * 2
        }

        // 2. 3D Tilt Lerp
        s.tiltCurrent.rotX += (s.tiltTarget.rotX - s.tiltCurrent.rotX) * 0.1
        s.tiltCurrent.rotY += (s.tiltTarget.rotY - s.tiltCurrent.rotY) * 0.1
        s.tiltCurrent.shiftX += (s.tiltTarget.shiftX - s.tiltCurrent.shiftX) * 0.1
        s.tiltCurrent.shiftY += (s.tiltTarget.shiftY - s.tiltCurrent.shiftY) * 0.1
        s.tiltCurrent.hlX += (s.tiltTarget.hlX - s.tiltCurrent.hlX) * 0.1
        s.tiltCurrent.hlY += (s.tiltTarget.hlY - s.tiltCurrent.hlY) * 0.1

        // 3. Heartbeat: 3.2s loop with double beat
        const heartT = (now % 3200) / 3200
        let heartScale = 1
        let heartBrightness = 1

        if (heartT >= 0.0 && heartT < 0.16) {
          const p1 = Math.sin((heartT / 0.16) * Math.PI)
          heartScale = 1.0 + 0.12 * p1
          heartBrightness = 1.0 + 0.3 * p1
        } else if (heartT >= 0.18 && heartT < 0.36) {
          const p2 = Math.sin(((heartT - 0.18) / 0.18) * Math.PI)
          heartScale = 1.02 + 0.16 * p2
          heartBrightness = 1.05 + 0.37 * p2
        }

        // 4. Float: translateY 0 to -9px with 1.2deg rotation, 6s loop
        const floatT = (now % 6000) / 6000
        const floatY = Math.sin(floatT * Math.PI * 2) * -4.5 - 4.5
        const floatRot = Math.sin(floatT * Math.PI * 2) * 1.2

        // 5. PART C: Slow sink and rise (9s cycle, down 14px, sideways 4px, halts on hover)
        const targetSwaySpeed = s.isHovered ? 0 : 1
        s.swaySpeedMultiplier += (targetSwaySpeed - s.swaySpeedMultiplier) * 0.08
        s.swayPhase += (dt / 9000) * s.swaySpeedMultiplier
        const swayY = (1 - Math.cos(s.swayPhase * Math.PI * 2)) * 7 // 0 -> 14px -> 0
        const swayX = Math.sin(s.swayPhase * Math.PI * 2) * 4      // ±4px sideways drift

        if (swayWrapperRef.current) {
          swayWrapperRef.current.style.transform = `translate3d(${swayX.toFixed(2)}px, ${swayY.toFixed(2)}px, 0)`
        }

        // Apply transforms to disk and glow
        if (diskRef.current) {
          const totalRotX = s.tiltCurrent.rotX
          const totalRotY = s.tiltCurrent.rotY
          const totalRotZ = floatRot
          const brightness = Math.max(0.3, heartBrightness * s.lightningBrightness * s.dimMultiplier)
          diskRef.current.style.transform = `translate3d(${shakeOffsetX}px, ${floatY + shakeOffsetY}px, 0) rotateX(${totalRotX}deg) rotateY(${totalRotY}deg) rotateZ(${totalRotZ}deg)`
          diskRef.current.style.filter = `brightness(${brightness.toFixed(3)})`
        }

        if (glowRef.current) {
          const glowScale = heartScale * 1.0
          glowRef.current.style.transform = `translate3d(${s.tiltCurrent.shiftX + shakeOffsetX}px, ${s.tiltCurrent.shiftY + floatY + shakeOffsetY}px, 0) scale(${glowScale.toFixed(3)})`
        }

        if (ringsRef.current) {
          ringsRef.current.style.transform = `translate3d(${s.tiltCurrent.shiftX * 0.75 + shakeOffsetX}px, ${s.tiltCurrent.shiftY * 0.75 + floatY + shakeOffsetY}px, 0) rotateX(${s.tiltCurrent.rotX * 0.5}deg) rotateY(${s.tiltCurrent.rotY * 0.5}deg)`
        }

        if (highlightRef.current) {
          highlightRef.current.style.setProperty("--hl-x", `${s.tiltCurrent.hlX.toFixed(1)}%`)
          highlightRef.current.style.setProperty("--hl-y", `${s.tiltCurrent.hlY.toFixed(1)}%`)
        }

        // 6. Canvas Drawing (Using Pre-rendered Sprites with Zero shadowBlur or filter in loop)
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.save()
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.scale(metricsRef.current.dpr, metricsRef.current.dpr)

            const cx = metricsRef.current.centerX
            const cy = metricsRef.current.centerY

            // A. Shockwaves
            for (let i = s.shockwaves.length - 1; i >= 0; i--) {
              const sw = s.shockwaves[i]
              sw.r += sw.speed
              sw.alpha *= 0.94
              if (sw.alpha <= 0.02 || sw.r >= sw.maxR) {
                s.shockwaves.splice(i, 1)
                continue
              }
              ctx.beginPath()
              ctx.arc(cx, cy, sw.r, 0, Math.PI * 2)
              ctx.strokeStyle = `rgba(255, 42, 53, ${sw.alpha.toFixed(3)})`
              ctx.lineWidth = sw.width * sw.alpha
              ctx.stroke()
            }

            // B. Lightning Bolts
            for (let bIdx = s.lightningBolts.length - 1; bIdx >= 0; bIdx--) {
              const lb = s.lightningBolts[bIdx]
              const alpha = lb.life / lb.maxLife

              // Glow pass
              ctx.beginPath()
              for (let i = 0; i < lb.points.length; i++) {
                const pt = lb.points[i]
                if (i === 0) ctx.moveTo(pt.x, pt.y)
                else ctx.lineTo(pt.x, pt.y)
              }
              ctx.strokeStyle = `rgba(255, 42, 53, ${(alpha * 0.85).toFixed(3)})`
              ctx.lineWidth = 4.5 * alpha
              ctx.stroke()

              // Core pass
              ctx.beginPath()
              for (let i = 0; i < lb.points.length; i++) {
                const pt = lb.points[i]
                if (i === 0) ctx.moveTo(pt.x, pt.y)
                else ctx.lineTo(pt.x, pt.y)
              }
              ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`
              ctx.lineWidth = 1.8 * alpha
              ctx.stroke()

              // Branches
              for (const branch of lb.branches) {
                ctx.beginPath()
                for (let i = 0; i < branch.length; i++) {
                  const pt = branch[i]
                  if (i === 0) ctx.moveTo(pt.x, pt.y)
                  else ctx.lineTo(pt.x, pt.y)
                }
                ctx.strokeStyle = `rgba(255, 100, 110, ${(alpha * 0.7).toFixed(3)})`
                ctx.lineWidth = 1.6 * alpha
                ctx.stroke()
              }

              lb.life--
              if (lb.life <= 0) {
                s.lightningBolts.splice(bIdx, 1)
              }
            }

            // C. Embers (up to 120 particles rendered via pre-rendered sprite)
            const emberSpawns = s.isHovered ? 3 : 1
            if (s.embers.length < 120) {
              for (let k = 0; k < emberSpawns; k++) {
                const theta = Math.random() * Math.PI * 2
                const rad = metricsRef.current.logoRadius * (0.95 + Math.random() * 0.08)
                const ex = cx + Math.cos(theta) * rad
                const ey = cy + Math.sin(theta) * rad
                const tangSpeed = (Math.random() * 1.6 + 0.6) * (Math.random() > 0.5 ? 1 : -1)
                const vx = -Math.sin(theta) * tangSpeed + (Math.random() - 0.5) * 0.6
                const vy = Math.cos(theta) * tangSpeed - (Math.random() * 1.4 + 0.8)
                const maxLife = Math.floor(Math.random() * 45 + 35)
                const size = Math.random() * 2.4 + 1.2
                s.embers.push({ x: ex, y: ey, vx, vy, life: maxLife, maxLife, size })
              }
            }

            ctx.globalCompositeOperation = "lighter"
            const emberSprite = emberSpriteRef.current
            for (let i = s.embers.length - 1; i >= 0; i--) {
              const e = s.embers[i]
              e.x += e.vx
              e.y += e.vy
              e.vy -= 0.035
              e.vx *= 0.985
              e.life--

              if (e.life <= 0) {
                s.embers.splice(i, 1)
                continue
              }

              const prog = e.life / e.maxLife
              const alpha = Math.sin(prog * Math.PI) * 0.88
              const sz = e.size * (0.5 + 0.5 * prog) * 3.5

              if (emberSprite) {
                ctx.globalAlpha = alpha
                ctx.drawImage(emberSprite, e.x - sz, e.y - sz, sz * 2, sz * 2)
              }
            }
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"

            // D. Bats (up to 30 bats rendered via pre-rendered sprite)
            const batSprite = batSpriteRef.current
            if (batSprite) {
              for (let i = s.bats.length - 1; i >= 0; i--) {
                const bat = s.bats[i]

                bat.steerPhase += bat.steerFreq
                const steerOffset = Math.sin(bat.steerPhase) * bat.steerAmp
                bat.heading += steerOffset

                bat.vx = Math.cos(bat.heading) * bat.speed
                bat.vy = Math.sin(bat.heading) * bat.speed
                bat.x += bat.vx
                bat.y += bat.vy

                bat.flapPhase += bat.flapSpeed
                const flap = 0.775 + 0.225 * Math.sin(bat.flapPhase)

                bat.age++
                bat.alpha = Math.min(1, bat.age / 12)

                if (
                  bat.x < -60 ||
                  bat.x > metricsRef.current.canvasWidth + 60 ||
                  bat.y < -60 ||
                  bat.y > metricsRef.current.canvasHeight + 60
                ) {
                  s.bats.splice(i, 1)
                  continue
                }

                ctx.save()
                ctx.translate(bat.x, bat.y)
                ctx.rotate(bat.heading + Math.PI / 2)
                ctx.scale(bat.scale, bat.scale * flap)
                ctx.globalAlpha = bat.alpha
                // Draw pre-rendered bat sprite centered at (48, 28)
                ctx.drawImage(batSprite, -48, -28, 96, 56)
                ctx.restore()
              }
              ctx.globalAlpha = 1
            }

            // E. PART B: Giant Shadow Bat Flyover
            if (s.giantBat.active) {
              const gb = s.giantBat
              const elapsed = now - gb.startTime
              const t = Math.min(1, elapsed / gb.duration)
              // Ease-in-out curve
              const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

              const curX = gb.startX + (gb.targetX - gb.startX) * easedT
              const curY = gb.baseY + Math.sin(t * Math.PI * 3) * 18
              const flap = 0.7 + 0.3 * Math.sin(elapsed * 0.025)

              // Check if passing directly over the logo
              if (!gb.triggeredLogoStrike && Math.abs(curX - cx) < 65) {
                gb.triggeredLogoStrike = true
                s.dimMultiplier = 0.35 // Dim logo to brightness(0.35) for 150ms
                triggerFlash("rgba(229, 37, 45, 0.8)", 150)
                triggerShake(300, 3)
                spawnBats(6)

                addTimeout(() => {
                  s.dimMultiplier = 1
                }, 150)
              }

              const giantBatSprite = giantBatSpriteRef.current
              if (giantBatSprite) {
                ctx.save()
                ctx.translate(curX, curY)
                // Heading: direction 1 flies right, direction -1 flies left
                ctx.scale(gb.scale * gb.direction, gb.scale * flap)
                // Draw pre-rendered giant bat sprite centered at (60, 32)
                ctx.drawImage(giantBatSprite, -60, -32, 120, 64)
                ctx.restore()
              }

              if (t >= 1) {
                gb.active = false
              }
            }

            ctx.restore()
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(renderLoop)
    }

    const startLoop = () => {
      if (runningRef.current) return
      runningRef.current = true
      lastTime = performance.now()
      rafIdRef.current = requestAnimationFrame(renderLoop)
    }

    const stopLoop = () => {
      runningRef.current = false
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }

    // PART D.6: IntersectionObserver & Visibility handling
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isIntersectingRef.current = entry.isIntersecting
        if (entry.isIntersecting && !document.hidden) {
          startLoop()
        } else {
          stopLoop()
        }
      },
      { threshold: 0.05 }
    )

    if (containerRef.current) {
      intersectionObserver.observe(containerRef.current)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop()
      } else if (isIntersectingRef.current) {
        startLoop()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Initial loop start
    startLoop()

    // Complete cleanup on unmount
    return () => {
      stopLoop()
      timerIdsRef.current.forEach((t) => {
        clearTimeout(t)
        clearInterval(t)
      })
      timerIdsRef.current = [];
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      window.removeEventListener("scroll", handleScrollEnd)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (containerEl) {
        containerEl.removeEventListener("click", handleClick)
        if (s.isFinePointer) {
          containerEl.removeEventListener("pointermove", handlePointerMove)
          containerEl.removeEventListener("pointerenter", handlePointerEnter)
          containerEl.removeEventListener("pointerleave", handlePointerLeave)
        }
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`hero-emblem hero-logo-box ${className}`}
      aria-label="Arkham MUN animated blood moon emblem"
      role="img"
    >
      {/* PART C: Sway wrapper drifting 14px down/up + 4px sideways drift */}
      <div ref={swayWrapperRef} className="hero-logo-sway-wrapper">
        {/* 1. Glow layer behind the logo (inset -28%, radial red gradient) */}
        <div ref={glowRef} className="hero-logo-glow" aria-hidden="true" />

        {/* 2. Rings SVG (viewBox -100 -100 200 200) */}
        <svg
          ref={ringsRef}
          className="hero-logo-rings"
          viewBox="-100 -100 200 200"
          aria-hidden="true"
        >
          {/* Thin red ring (r97) */}
          <circle className="ring-thin" cx="0" cy="0" r="97" />
          {/* Dashed red ring (r93, rotating 30s) */}
          <circle className="ring-dashed" cx="0" cy="0" r="93" />
          {/* Tick ring (r88, white 35%, rotating other way 22s) */}
          <circle className="ring-ticks" cx="0" cy="0" r="88" />
          {/* Bright red scanning arc (r97, dasharray 70 540, 3.2s rotation, red drop-shadow) */}
          <circle className="ring-scan" cx="0" cy="0" r="97" />
        </svg>

        {/* 3. Intro wrapper & Logo disk with 3 stacked layers (base, glitch-red, glitch-white) */}
        <div className="hero-logo-intro-wrapper">
          <div ref={diskRef} className="hero-logo-disk">
            <img
              ref={baseImgRef}
              src={logoUrl}
              alt="Arkham MUN emblem"
              className="hero-logo-layer layer-base"
            />
            <img
              ref={glitchRedRef}
              src={logoUrl}
              alt=""
              aria-hidden="true"
              className="hero-logo-layer layer-glitch-red"
            />
            <img
              ref={glitchWhiteRef}
              src={logoUrl}
              alt=""
              aria-hidden="true"
              className="hero-logo-layer layer-glitch-white"
            />
            <div ref={highlightRef} className="hero-logo-highlight" aria-hidden="true" />
            <div className="hero-logo-scanline" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* 4. Full-size canvas overlay for bats, embers, shockwaves, lightning and giant shadow bat */}
      <canvas ref={canvasRef} className="hero-logo-canvas" aria-hidden="true" />

      {/* 5. Screen / logo flash overlay */}
      <div ref={flashRef} className="hero-logo-flash" aria-hidden="true" />
    </div>
  )
}
export default HeroLogo
