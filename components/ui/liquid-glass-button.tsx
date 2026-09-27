"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const liquidButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e31b23]/70 disabled:pointer-events-none disabled:opacity-50",
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
}

export function LiquidButton({ className, variant, size, asChild = false, children, ...props }: LiquidButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp className={cn(liquidButtonVariants({ variant, size, className: cn("group", className) }))} {...props}>
      <span className="absolute inset-0 overflow-hidden rounded-full bg-gradient-to-br from-white/20 via-white/[0.04] to-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_0_28px_rgba(227,27,35,0.18)]" aria-hidden="true" />
      <span className="absolute -inset-x-8 top-0 h-full -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden="true" />
      <span className="relative z-10">{children}</span>
    </Comp>
  )
}

export { liquidButtonVariants }

