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

const BAT_PATH_STRING =
  "M32 8 L35 14 L40 10 L38 18 C46 12 56 14 62 20 C56 20 52 23 50 28 C46 25 42 26 40 30 C38 27 35 26 32 32 C29 26 26 27 24 30 C22 26 18 25 14 28 C12 23 8 20 2 20 C8 14 18 12 26 18 L24 10 L29 14 Z"

export function HeroLogo({ logoUrl, className = "" }: HeroLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const ringsRef = useRef<SVGSVGElement>(null)
  const diskRef = useRef<HTMLDivElement>(null)
  const baseImgRef = useRef<HTMLImageElement>(null)
  const glitchRedRef = useRef<HTMLImageElement>(null)
  const glitchWhiteRef = useRef<HTMLImageElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  // Mutable state for the single requestAnimationFrame loop (zero React state re-renders)
  const stateRef = useRef<{
    rafId: number | null
    batPath: Path2D | null
    isFinePointer: boolean
    reducedMotion: boolean
    isHovered: boolean
    isGlitching: boolean
    // Screen / logo shake
    shakeTimeRemaining: number
    shakeDuration: number
    shakeIntensity: number
    // Lightning flash boost
    lightningBrightness: number
    // 3D tilt tracking
    tiltTarget: { rotX: number; rotY: number; shiftX: number; shiftY: number; hlX: number; hlY: number }
    tiltCurrent: { rotX: number; rotY: number; shiftX: number; shiftY: number; hlX: number; hlY: number }
    // Particle collections
    bats: Bat[]
    embers: Ember[]
    shockwaves: Shockwave[]
    lightning: LightningBolt | null
    // Canvas dimensions & center in CSS coordinates
    canvasWidth: number
    canvasHeight: number
    centerX: number
    centerY: number
    logoRadius: number
    dpr: number
    // Timers
    batTimer: ReturnType<typeof setTimeout> | null
    lightningTimer: ReturnType<typeof setTimeout> | null
    glitchTimer: ReturnType<typeof setTimeout> | null
    introTimer: ReturnType<typeof setTimeout> | null
    glitchInterval: ReturnType<typeof setInterval> | null
  }>({
    rafId: null,
    batPath: null,
    isFinePointer: true,
    reducedMotion: false,
    isHovered: false,
    isGlitching: false,
    shakeTimeRemaining: 0,
    shakeDuration: 0,
    shakeIntensity: 0,
    lightningBrightness: 1,
    tiltTarget: { rotX: 0, rotY: 0, shiftX: 0, shiftY: 0, hlX: 50, hlY: 50 },
    tiltCurrent: { rotX: 0, rotY: 0, shiftX: 0, shiftY: 0, hlX: 50, hlY: 50 },
    bats: [],
    embers: [],
    shockwaves: [],
    lightning: null,
    canvasWidth: 0,
    canvasHeight: 0,
    centerX: 0,
    centerY: 0,
    logoRadius: 100,
    dpr: 1,
    batTimer: null,
    lightningTimer: null,
    glitchTimer: null,
    introTimer: null,
    glitchInterval: null,
  })

  useEffect(() => {
    const s = stateRef.current

    // Detect environment capabilities
    if (typeof window !== "undefined") {
      s.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      s.isFinePointer = window.matchMedia("(pointer: fine)").matches
      if (typeof Path2D !== "undefined") {
        s.batPath = new Path2D(BAT_PATH_STRING)
      }
    }

    // Helper functions for spawning elements
    const spawnBats = (count: number) => {
      if (s.reducedMotion) return
      const cx = s.centerX
      const cy = s.centerY
      const rLimit = s.logoRadius * 0.72

      for (let i = 0; i < count; i++) {
        // Spawn inside the blood moon
        const spawnAngle = Math.random() * Math.PI * 2
        const spawnDist = Math.random() * rLimit
        const startX = cx + Math.cos(spawnAngle) * spawnDist
        const startY = cy + Math.sin(spawnAngle) * spawnDist

        // Outward velocity with random deviation
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
    }

    const spawnShockwaves = (count: number) => {
      if (s.reducedMotion) return
      const baseR = s.logoRadius * 0.85
      for (let i = 0; i < count; i++) {
        s.shockwaves.push({
          r: baseR - i * 16,
          maxR: baseR * 2.8,
          speed: Math.random() * 3.5 + 4.5,
          alpha: 0.95 - i * 0.12,
          width: 3.5 - i * 0.6,
        })
      }
    }

    const triggerShake = (durationMs: number, intensityPx: number = 8) => {
      if (s.reducedMotion) return
      s.shakeDuration = durationMs
      s.shakeTimeRemaining = durationMs
      s.shakeIntensity = intensityPx
    }

    const triggerFlash = (intensity: number = 0.85) => {
      if (!flashRef.current || s.reducedMotion) return
      flashRef.current.style.opacity = String(intensity)
      setTimeout(() => {
        if (flashRef.current) flashRef.current.style.opacity = "0"
      }, 140)
    }

    const triggerGlitch = () => {
      if (s.reducedMotion || s.isGlitching) return
      s.isGlitching = true
      let elapsed = 0
      const duration = 500 // 0.5s duration per requirements

      if (s.glitchInterval) clearInterval(s.glitchInterval)

      s.glitchInterval = setInterval(() => {
        elapsed += 45
        if (elapsed >= duration) {
          if (s.glitchInterval) clearInterval(s.glitchInterval)
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

        // Random horizontal slices via clip-path inset() with ±10-18px translateX offsets
        const redTop = Math.floor(Math.random() * 75)
        const redHeight = Math.floor(Math.random() * 22 + 8)
        const redBottom = Math.max(0, 100 - redTop - redHeight)
        const redOffset = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 8 + 10)

        const whiteTop = Math.floor(Math.random() * 75)
        const whiteHeight = Math.floor(Math.random() * 20 + 6)
        const whiteBottom = Math.max(0, 100 - whiteTop - whiteHeight)
        const whiteOffset = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 8 + 10)

        // Base jitters 2-4px
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
    }

    const triggerLightning = () => {
      if (s.reducedMotion) return
      const cx = s.centerX
      const cy = s.centerY
      const startX = cx + (Math.random() - 0.5) * 60
      const startY = 0 // top of stage on canvas
      const targetX = cx + (Math.random() - 0.5) * 20
      const targetY = cy - s.logoRadius // top of logo

      // Generate 14-segment jagged bolt
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
        points.push({
          x: bx + nx * displacement,
          y: by + ny * displacement,
        })
      }
      points.push({ x: targetX, y: targetY })

      // Generate 1-2 small branch forks
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

      s.lightning = { points, branches, life: 20, maxLife: 20 }
      s.lightningBrightness = 1.7
      triggerFlash(0.6)

      setTimeout(() => {
        s.lightningBrightness = 1
      }, 140)
    }

    // Scheduling Timers
    const scheduleBatSwarm = () => {
      if (s.reducedMotion) return
      const delay = Math.random() * 5000 + 7000 // 7-12s
      s.batTimer = setTimeout(() => {
        spawnBats(4)
        scheduleBatSwarm()
      }, delay)
    }

    const scheduleLightningStrike = () => {
      if (s.reducedMotion) return
      const delay = Math.random() * 6000 + 9000 // 9-15s
      s.lightningTimer = setTimeout(() => {
        triggerLightning()
        scheduleLightningStrike()
      }, delay)
    }

    const scheduleGlitchCycle = () => {
      if (s.reducedMotion) return
      const delay = Math.random() * 3500 + 4500 // 4.5-8s
      s.glitchTimer = setTimeout(() => {
        triggerGlitch()
        scheduleGlitchCycle()
      }, delay)
    }

    // Canvas Resize Observer / Sizing
    const handleResize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const rect = container.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      s.dpr = dpr

      // Canvas element is 220% of container size to allow bats, shockwaves, and lightning full clearance
      const w = rect.width * 2.2
      const h = rect.height * 2.2

      s.canvasWidth = w
      s.canvasHeight = h
      s.centerX = w / 2
      s.centerY = h / 2
      s.logoRadius = (rect.width * 0.86) / 2 // logo is 86% of the box

      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }

    handleResize()
    window.addEventListener("resize", handleResize, { passive: true })

    // Intro Mount Sequence (1.3s with event at 640ms)
    if (!s.reducedMotion) {
      s.introTimer = setTimeout(() => {
        spawnShockwaves(3)
        triggerShake(550, 9)
        triggerFlash(0.85)
        triggerLightning()
        spawnBats(18)
      }, 640)

      scheduleBatSwarm()
      scheduleLightningStrike()
      scheduleGlitchCycle()
    }

    // Visibility Listener: pause timers when tab is hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (s.batTimer) clearTimeout(s.batTimer)
        if (s.lightningTimer) clearTimeout(s.lightningTimer)
        if (s.glitchTimer) clearTimeout(s.glitchTimer)
      } else if (!s.reducedMotion) {
        scheduleBatSwarm()
        scheduleLightningStrike()
        scheduleGlitchCycle()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Store callbacks for click event on container
    const handleClick = () => {
      if (s.reducedMotion) return
      spawnBats(10)
      spawnShockwaves(2)
      triggerGlitch()
      triggerShake(350, 6)
      triggerFlash(0.4)
    }

    const containerEl = containerRef.current
    if (containerEl) {
      containerEl.addEventListener("click", handleClick)
    }

    // Pointer move / leave for 3D tilt
    const handlePointerMove = (e: PointerEvent) => {
      if (!s.isFinePointer || s.reducedMotion || !containerEl) return
      const rect = containerEl.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const nx = Math.max(-1, Math.min(1, (px - 0.5) * 2))
      const ny = Math.max(-1, Math.min(1, (py - 0.5) * 2))

      s.tiltTarget.rotX = -ny * 16 // rotateX toward cursor up to ±16deg
      s.tiltTarget.rotY = nx * 16  // rotateY toward cursor up to ±16deg
      s.tiltTarget.shiftX = nx * 12 // glow and rings shifted up to 12px for depth
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
      // Reset smoothly on leave
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

    // Master Animation Loop (one requestAnimationFrame loop)
    let lastTime = performance.now()

    const renderLoop = (now: number) => {
      const dt = Math.min(now - lastTime, 50)
      lastTime = now

      if (!s.reducedMotion) {
        // 1. Screen / Logo Shake Decay
        let shakeOffsetX = 0
        let shakeOffsetY = 0
        if (s.shakeTimeRemaining > 0) {
          s.shakeTimeRemaining -= dt
          const factor = Math.max(0, s.shakeTimeRemaining / s.shakeDuration)
          shakeOffsetX = (Math.random() - 0.5) * s.shakeIntensity * factor * 2
          shakeOffsetY = (Math.random() - 0.5) * s.shakeIntensity * factor * 2
        }

        // 2. 3D Tilt Lerp (smooth springy reset)
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
          // Beat 1: scale 1 to 1.12 to 1.02, brightness rises to 1.3
          const p1 = Math.sin((heartT / 0.16) * Math.PI)
          heartScale = 1.0 + 0.12 * p1
          heartBrightness = 1.0 + 0.3 * p1
        } else if (heartT >= 0.18 && heartT < 0.36) {
          // Beat 2: scale 1.02 to 1.18 to 1.0, brightness rises to 1.42
          const p2 = Math.sin(((heartT - 0.18) / 0.18) * Math.PI)
          heartScale = 1.02 + 0.16 * p2
          heartBrightness = 1.05 + 0.37 * p2
        }

        // 4. Float: translateY 0 to -9px with 1.2deg rotation, 6s loop
        const floatT = (now % 6000) / 6000
        const floatY = Math.sin(floatT * Math.PI * 2) * -4.5 - 4.5
        const floatRot = Math.sin(floatT * Math.PI * 2) * 1.2

        // Apply transforms to DOM via refs
        if (diskRef.current) {
          const totalRotX = s.tiltCurrent.rotX
          const totalRotY = s.tiltCurrent.rotY
          const totalRotZ = floatRot
          const brightness = Math.max(1, heartBrightness * s.lightningBrightness)
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

        // 5. Canvas Drawing (Embers, Bats, Shockwaves, Lightning)
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.save()
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.scale(s.dpr, s.dpr)

            const cx = s.centerX
            const cy = s.centerY

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
              ctx.shadowColor = "#e3262e"
              ctx.shadowBlur = 12
              ctx.stroke()
            }

            // B. Lightning Bolt
            if (s.lightning) {
              const lb = s.lightning
              const alpha = lb.life / lb.maxLife

              // Draw glow
              ctx.beginPath()
              for (let i = 0; i < lb.points.length; i++) {
                const pt = lb.points[i]
                if (i === 0) ctx.moveTo(pt.x, pt.y)
                else ctx.lineTo(pt.x, pt.y)
              }
              ctx.strokeStyle = `rgba(255, 42, 53, ${(alpha * 0.9).toFixed(3)})`
              ctx.lineWidth = 5 * alpha
              ctx.shadowColor = "#e3262e"
              ctx.shadowBlur = 18
              ctx.stroke()

              // Draw white core
              ctx.beginPath()
              for (let i = 0; i < lb.points.length; i++) {
                const pt = lb.points[i]
                if (i === 0) ctx.moveTo(pt.x, pt.y)
                else ctx.lineTo(pt.x, pt.y)
              }
              ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`
              ctx.lineWidth = 2 * alpha
              ctx.shadowColor = "#ffffff"
              ctx.shadowBlur = 8
              ctx.stroke()

              // Draw branch forks
              for (const branch of lb.branches) {
                ctx.beginPath()
                for (let i = 0; i < branch.length; i++) {
                  const pt = branch[i]
                  if (i === 0) ctx.moveTo(pt.x, pt.y)
                  else ctx.lineTo(pt.x, pt.y)
                }
                ctx.strokeStyle = `rgba(255, 100, 110, ${(alpha * 0.7).toFixed(3)})`
                ctx.lineWidth = 2 * alpha
                ctx.stroke()
              }

              lb.life--
              if (lb.life <= 0) {
                s.lightning = null
              }
            }

            // C. Embers (up to 220 particles spawned on logo edge with tangential velocity & upward drift)
            const emberSpawns = s.isHovered ? 4 : 1
            if (s.embers.length < 220) {
              for (let k = 0; k < emberSpawns; k++) {
                const theta = Math.random() * Math.PI * 2
                const rad = s.logoRadius * (0.95 + Math.random() * 0.08)
                const ex = cx + Math.cos(theta) * rad
                const ey = cy + Math.sin(theta) * rad
                const tangSpeed = (Math.random() * 1.6 + 0.6) * (Math.random() > 0.5 ? 1 : -1)
                const vx = -Math.sin(theta) * tangSpeed + (Math.random() - 0.5) * 0.6
                const vy = Math.cos(theta) * tangSpeed - (Math.random() * 1.4 + 0.8) // upward drift
                const maxLife = Math.floor(Math.random() * 45 + 35)
                const size = Math.random() * 2.6 + 1.4
                s.embers.push({ x: ex, y: ey, vx, vy, life: maxLife, maxLife, size })
              }
            }

            ctx.globalCompositeOperation = "lighter"
            for (let i = s.embers.length - 1; i >= 0; i--) {
              const e = s.embers[i]
              e.x += e.vx
              e.y += e.vy
              e.vy -= 0.035 // subtle upward acceleration
              e.vx *= 0.985
              e.life--

              if (e.life <= 0) {
                s.embers.splice(i, 1)
                continue
              }

              const prog = e.life / e.maxLife
              const alpha = Math.sin(prog * Math.PI) * 0.88
              const sz = e.size * (0.4 + 0.6 * prog)

              // Soft glow
              ctx.beginPath()
              ctx.arc(e.x, e.y, sz * 2.4, 0, Math.PI * 2)
              ctx.fillStyle = `rgba(229, 37, 45, ${(alpha * 0.35).toFixed(3)})`
              ctx.fill()

              // Bright core
              ctx.beginPath()
              ctx.arc(e.x, e.y, sz, 0, Math.PI * 2)
              ctx.fillStyle = `rgba(255, 185, 80, ${(alpha * 0.85).toFixed(3)})`
              ctx.fill()
            }
            ctx.globalCompositeOperation = "source-over"

            // D. Bats (flapping between 0.55 and 1, sinusoidal steering, heading rotation, fade in over 12 frames)
            if (s.batPath) {
              for (let i = s.bats.length - 1; i >= 0; i--) {
                const bat = s.bats[i]

                // Sinusoidal steering
                bat.steerPhase += bat.steerFreq
                const steerOffset = Math.sin(bat.steerPhase) * bat.steerAmp
                bat.heading += steerOffset

                // Update position
                bat.vx = Math.cos(bat.heading) * bat.speed
                bat.vy = Math.sin(bat.heading) * bat.speed
                bat.x += bat.vx
                bat.y += bat.vy

                // Flap cycle: scales Y between 0.55 and 1.0
                bat.flapPhase += bat.flapSpeed
                const flap = 0.775 + 0.225 * Math.sin(bat.flapPhase)

                bat.age++
                bat.alpha = Math.min(1, bat.age / 12)

                // Remove when outside canvas bounds
                if (bat.x < -60 || bat.x > s.canvasWidth + 60 || bat.y < -60 || bat.y > s.canvasHeight + 60) {
                  s.bats.splice(i, 1)
                  continue
                }

                ctx.save()
                ctx.translate(bat.x, bat.y)
                // In BAT_PATH_STRING, head points UP (-Y). Rotate by heading + PI/2 so head faces movement direction
                ctx.rotate(bat.heading + Math.PI / 2)
                ctx.scale(bat.scale, bat.scale * flap)
                ctx.translate(-32, -20) // center on silhouette centroid

                ctx.shadowColor = "#e5252d"
                ctx.shadowBlur = 10
                ctx.fillStyle = `rgba(229, 37, 45, ${bat.alpha.toFixed(3)})`
                ctx.fill(s.batPath)
                ctx.restore()
              }
            }

            ctx.restore()
          }
        }
      }

      s.rafId = requestAnimationFrame(renderLoop)
    }

    s.rafId = requestAnimationFrame(renderLoop)

    // Cleanup on unmount
    return () => {
      if (s.rafId) cancelAnimationFrame(s.rafId)
      if (s.batTimer) clearTimeout(s.batTimer)
      if (s.lightningTimer) clearTimeout(s.lightningTimer)
      if (s.glitchTimer) clearTimeout(s.glitchTimer)
      if (s.introTimer) clearTimeout(s.introTimer)
      if (s.glitchInterval) clearInterval(s.glitchInterval)
      window.removeEventListener("resize", handleResize)
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
          {/* Base layer */}
          <img
            ref={baseImgRef}
            src={logoUrl}
            alt="Arkham MUN emblem"
            className="hero-logo-layer layer-base"
          />
          {/* Glitch-red layer */}
          <img
            ref={glitchRedRef}
            src={logoUrl}
            alt=""
            aria-hidden="true"
            className="hero-logo-layer layer-glitch-red"
          />
          {/* Glitch-white layer */}
          <img
            ref={glitchWhiteRef}
            src={logoUrl}
            alt=""
            aria-hidden="true"
            className="hero-logo-layer layer-glitch-white"
          />
          {/* 3D tilt moving white highlight (radial-gradient, mix-blend-mode: overlay) */}
          <div ref={highlightRef} className="hero-logo-highlight" aria-hidden="true" />
          {/* Faint horizontal scanline sweep across the logo every 4.2s */}
          <div className="hero-logo-scanline" aria-hidden="true" />
        </div>
      </div>

      {/* 4. Full-size canvas overlay for bats, embers, shockwaves and lightning */}
      <canvas ref={canvasRef} className="hero-logo-canvas" aria-hidden="true" />

      {/* 5. Screen / logo flash overlay */}
      <div ref={flashRef} className="hero-logo-flash" aria-hidden="true" />
    </div>
  )
}
export default HeroLogo
