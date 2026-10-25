"use client"

import * as React from "react"
import Link from "next/link"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useTransitionNav } from "@/components/PageTransition"

const liquidButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e31b23]/70 disabled:pointer-events-none disabled:opacity-50 arkham-interactive-btn",
  {
    variants: {
      variant: {
        default: "text-white hover:scale-[1.03] hover:text-white",
        outline: "border border-white/20 bg-white/[0.06] text-white hover:border-[#e31b23]/60 hover:bg-[#e31b23]/10",
      },
      size: {
        default: "h-11 px-6",
        lg: "h-12 px-8",
        xl: "h-14 px-9 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof liquidButtonVariants> {
  asChild?: boolean
  href?: string
}

export function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  href,
  children,
  onClick,
  ...props
}: LiquidButtonProps) {
  const { activeTransition, triggerTransition, prefetch } = useTransitionNav()
  const isRegister = href === "/register" || href?.startsWith("/register")
  const isLoading = isRegister && activeTransition === "register"
  const buttonRef = React.useRef<HTMLAnchorElement | HTMLButtonElement>(null)

  // Subtle magnetic effect for Register now (moves button up to 8% of cursor offset)
  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isRegister || isLoading) return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) * 0.08
    const dy = (e.clientY - cy) * 0.08
    el.style.transform = `translate3d(${dx.toFixed(2)}px, ${(dy - 2).toFixed(2)}px, 0)`
  }

  const handlePointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    if (!isRegister) return
    e.currentTarget.style.transform = ""
  }

  // Radial ripple on press (20px circle scaled 6x, fading over 0.6s)
  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ripple = document.createElement("span")
    ripple.className = "arkham-btn-ripple"
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    el.appendChild(ripple)

    window.setTimeout(() => {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple)
    }, 600)
  }

  const handleClick = (e: React.MouseEvent<any>) => {
    if (isLoading) {
      e.preventDefault()
      return
    }
    if (isRegister) {
      e.preventDefault()
      const rect = e.currentTarget.getBoundingClientRect()
      triggerTransition("register", { originRect: rect, targetUrl: href })
    }
    if (onClick) onClick(e)
  }

  const content = isLoading ? (
    <>
      <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      <span>Opening…</span>
    </>
  ) : (
    children
  )

  if (href) {
    return (
      <Link
        href={href}
        ref={buttonRef as any}
        className={cn(
          liquidButtonVariants({ variant, size, className: cn("group", className) }),
          isLoading && "is-loading pointer-events-none cursor-default opacity-90"
        )}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onMouseEnter={() => prefetch(href)}
        onFocus={() => prefetch(href)}
        {...(props as any)}
      >
        <span className="absolute inset-0 overflow-hidden rounded-full bg-gradient-to-br from-white/20 via-white/[0.04] to-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_0_28px_rgba(227,27,35,0.18)]" aria-hidden="true" />
        <span className="arkham-btn-sheen" aria-hidden="true" />
        <span className="relative z-10 inline-flex items-center gap-2">{content}</span>
      </Link>
    )
  }

  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={buttonRef as any}
      className={cn(
        liquidButtonVariants({ variant, size, className: cn("group", className) }),
        isLoading && "is-loading pointer-events-none cursor-default opacity-90"
      )}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      {...(props as any)}
    >
      <span className="absolute inset-0 overflow-hidden rounded-full bg-gradient-to-br from-white/20 via-white/[0.04] to-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_0_28px_rgba(227,27,35,0.18)]" aria-hidden="true" />
      <span className="arkham-btn-sheen" aria-hidden="true" />
      <span className="relative z-10 inline-flex items-center gap-2">{content}</span>
    </Comp>
  )
}

export { liquidButtonVariants }
