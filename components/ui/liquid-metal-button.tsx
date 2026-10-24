"use client"

import React, { useEffect, useRef, useState, useId } from "react"
import { Sparkles } from "lucide-react"
import {
  ShaderMount,
  liquidMetalFragmentShader,
  getShaderColorFromString,
  emptyPixel,
} from "@paper-design/shaders"
import { cn } from "@/lib/utils"

export type LiquidMetalVariant = "red" | "black"
export type LiquidMetalViewMode = "text" | "icon"

export interface LiquidMetalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  onClick?: () => void
  viewMode?: LiquidMetalViewMode
  variant?: LiquidMetalVariant
  className?: string
}

interface Ripple {
  id: number
  x: number
  y: number
}

/**
 * LiquidMetalButton Component
 *
 * An interactive button featuring WebGL liquid metal fluid shaders,
 * press depth dynamics, hover speed transitions, and click ripple boosts.
 *
 * Variants:
 *  - "black" (default): Black inner pill with deep-to-bright red (#380000 -> #ff1f1a) liquid metal & light gray text.
 *  - "red": Red inner pill (#e5252d -> #8f0510) with near-black chrome (#050505 -> #858589) liquid metal & white text.
 */
export function LiquidMetalButton({
  label = "Liquid Metal",
  onClick,
  viewMode = "text",
  variant = "black",
  className,
  disabled = false,
  ...props
}: LiquidMetalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<ShaderMount | null>(null)
  const isHoveredRef = useRef<boolean>(false)
  const boostTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [isMounted, setIsMounted] = useState<boolean>(false)

  // Determine shader uniform colors according to variant specifications
  const getUniforms = (v: LiquidMetalVariant) => {
    if (v === "red") {
      // RED button with BLACK liquid metal (near-black base #050505 with soft gray highlights #858589)
      return {
        u_colorBack: getShaderColorFromString("#050505"),
        u_colorTint: getShaderColorFromString("#858589"),
        u_softness: 0.22,
        u_repetition: 3.8,
        u_shiftRed: 0.08,
        u_shiftBlue: 0.16,
        u_distortion: 0.18,
        u_contour: 0.25,
        u_angle: 0.0,
        u_shape: 0.0,
        u_isImage: false,
        u_image: emptyPixel,
      }
    }

    // BLACK button with RED liquid metal (deep red #380000 to bright red #ff1f1a)
    return {
      u_colorBack: getShaderColorFromString("#380000"),
      u_colorTint: getShaderColorFromString("#ff1f1a"),
      u_softness: 0.22,
      u_repetition: 3.8,
      u_shiftRed: 0.14,
      u_shiftBlue: 0.22,
      u_distortion: 0.18,
      u_contour: 0.25,
      u_angle: 0.0,
      u_shape: 0.0,
      u_isImage: false,
      u_image: emptyPixel,
    }
  }

  // Initialize WebGL shader mount on client mount
  useEffect(() => {
    setIsMounted(true)
    if (!containerRef.current) return

    try {
      const uniforms = getUniforms(variant)
      const mount = new ShaderMount(
        containerRef.current,
        liquidMetalFragmentShader,
        uniforms,
        { alpha: true, antialias: true },
        0.6 // default resting speed
      )
      mountRef.current = mount

      return () => {
        if (boostTimeoutRef.current) clearTimeout(boostTimeoutRef.current)
        mount.dispose()
        mountRef.current = null
      }
    } catch {
      // Fallback seamlessly if WebGL is unavailable
    }
  }, [])

  // Update uniforms dynamically if variant prop changes
  useEffect(() => {
    if (mountRef.current) {
      mountRef.current.setUniforms(getUniforms(variant))
    }
  }, [variant])

  // Mouse hover speed transitions: 0.6 resting -> 1.0 hover
  const handleMouseEnter = () => {
    isHoveredRef.current = true
    if (mountRef.current && !boostTimeoutRef.current) {
      mountRef.current.setSpeed(1.0)
    }
  }

  const handleMouseLeave = () => {
    isHoveredRef.current = false
    if (mountRef.current && !boostTimeoutRef.current) {
      mountRef.current.setSpeed(0.6)
    }
  }

  // Handle click: speed boost to 2.4 for 300ms + ripple animation
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newRippleId = Date.now() + Math.random()
    setRipples((prev) => [...prev, { id: newRippleId, x, y }])

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRippleId))
    }, 600)

    // Trigger shader boost (2.4 speed for 300ms)
    if (mountRef.current) {
      mountRef.current.setSpeed(2.4)
      if (boostTimeoutRef.current) clearTimeout(boostTimeoutRef.current)
      boostTimeoutRef.current = setTimeout(() => {
        boostTimeoutRef.current = null
        if (mountRef.current) {
          mountRef.current.setSpeed(isHoveredRef.current ? 1.0 : 0.6)
        }
      }, 300)
    }

    onClick?.()
  }

  const isIconOnly = viewMode === "icon"

  return (
    <>
      <style>{`
        @keyframes liquid-metal-ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.75;
          }
          100% {
            transform: translate(-50%, -50%) scale(22);
            opacity: 0;
          }
        }
      `}</style>
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "group relative inline-flex items-center justify-center select-none overflow-hidden rounded-full p-[3px] text-center font-medium",
          "cursor-pointer outline-none transition-all duration-150 ease-out",
          // Press depth dynamics
          "active:translate-y-[1px] active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-50",
          // Sizing: 142x46 px for text mode, 46x46 px for icon mode
          isIconOnly ? "h-[46px] w-[46px] min-w-[46px]" : "h-[46px] w-[142px] min-w-[142px]",
          // Variant outer ring borders & specular lighting
          variant === "red"
            ? "border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.4)]"
            : "border border-[#ff1f1a]/40 shadow-[0_4px_18px_rgba(255,31,26,0.22),inset_0_1px_1.5px_rgba(255,100,100,0.4)]",
          className
        )}
        style={{
          boxSizing: "border-box",
        }}
        aria-label={isIconOnly ? label : undefined}
        {...props}
      >
        {/* Background Liquid Metal Shader Canvas Mount */}
        <div
          ref={containerRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 z-0 h-full w-full rounded-full overflow-hidden",
            // CSS fallback gradient before/if WebGL renders
            variant === "red"
              ? "bg-[radial-gradient(ellipse_at_top,_#262629_0%,_#050505_100%)]"
              : "bg-[radial-gradient(ellipse_at_top,_#ff1f1a_0%,_#380000_100%)]"
          )}
        />

        {/* Specular Glint Highlight on Outer Metal Ring */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 z-[1] rounded-full",
            variant === "red"
              ? "bg-gradient-to-b from-white/30 via-transparent to-black/50"
              : "bg-gradient-to-b from-white/35 via-transparent to-black/60"
          )}
        />

        {/* Inner Pill */}
        <span
          className={cn(
            "relative z-10 flex h-full w-full items-center justify-center rounded-full overflow-hidden transition-all duration-200",
            isIconOnly ? "p-0" : "px-3 py-1.5",
            // Variant-specific inner pill styling
            variant === "red"
              ? "text-white"
              : "text-[#888891] group-hover:text-[#dedee5]"
          )}
          style={{
            background:
              variant === "red"
                ? "linear-gradient(180deg, #e5252d 0%, #8f0510 100%)"
                : "linear-gradient(180deg, #202020 0%, #000000 100%)",
            boxShadow:
              variant === "red"
                ? "inset 0 1px 1px rgba(255, 255, 255, 0.45), inset 0 -1.5px 2px rgba(0, 0, 0, 0.4), 0 2px 5px rgba(0, 0, 0, 0.45)"
                : "inset 0 1px 1px rgba(255, 255, 255, 0.16), inset 0 -1.5px 2px rgba(0, 0, 0, 0.8), 0 2px 5px rgba(0, 0, 0, 0.65)",
          }}
        >
          {/* Ripple Click Elements */}
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: 12,
                height: 12,
                transform: "translate(-50%, -50%)",
                backgroundColor:
                  variant === "red"
                    ? "rgba(255, 255, 255, 0.45)"
                    : "rgba(255, 31, 26, 0.5)",
                animation: "liquid-metal-ripple 600ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
              }}
            />
          ))}

          {/* Button Content */}
          {isIconOnly ? (
            <Sparkles className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide">
              {label}
            </span>
          )}
        </span>
      </button>
    </>
  )
}
export default LiquidMetalButton
