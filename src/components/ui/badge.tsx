import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Status kelulusan (5 keadaan) — dibezakan ikut fill/border, bukan
        // hue baharu (rujuk design system BLPP, kekang 3 hue tetap).
        draft: "border-status-draft-border bg-transparent text-status-draft-fg",
        pending: "border-status-pending-border bg-card text-status-pending-fg",
        approved:
          "border-status-approved-border bg-status-approved-bg text-status-approved-fg",
        rejected:
          "border-status-rejected-border bg-status-rejected-bg text-status-rejected-fg",
        waitlisted:
          "border-status-waitlisted-border bg-status-waitlisted-bg text-status-waitlisted-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
