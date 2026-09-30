import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary",
        solid: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-success/20 text-success",
        destructive: "bg-destructive/20 text-red-300",
        warning: "bg-amber-500/20 text-amber-300",
        outline: "border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
