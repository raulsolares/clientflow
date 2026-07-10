import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-gold/30 to-gold/10 ring-1 ring-border/50",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        default: "h-10 w-10",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-gold/10 text-foreground font-medium",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null
  alt?: string
  fallback?: string
}

function Avatar({ className, size, src, alt, fallback, ...props }: AvatarProps) {
  const initials = React.useMemo(() => {
    if (!fallback) return "?"
    return fallback
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [fallback])

  return (
    <div className={cn(avatarVariants({ size }), className)} {...props}>
      {src ? (
        <img
          src={src}
          alt={alt || fallback || "Avatar"}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback to initials on image error
            (e.target as HTMLImageElement).style.display = "none"
          }}
        />
      ) : (
        <div className={cn(avatarFallbackVariants({ size }))}>
          {initials}
        </div>
      )}
    </div>
  )
}
Avatar.displayName = "Avatar"

export { Avatar }
