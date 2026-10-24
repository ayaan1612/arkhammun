import React from "react"
import { cn } from "@/lib/utils"

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
}

/**
 * Shared layout container for Arkham MUN
 * - Max-width: 1560px centered with mx-auto
 * - Fluid side padding: clamp(16px, 4vw, 72px)
 * - Under 640px: 16px padding and full width
 */
export function Container({
  as: Component = "div",
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <Component className={cn("container-x", className)} {...props}>
      {children}
    </Component>
  )
}

export default Container
