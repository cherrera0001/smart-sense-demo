import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border', {
  variants: {
    variant: {
      default: 'bg-[var(--surface-secondary)] text-[var(--text-primary)] border-[var(--border-color)]',
      outline: 'bg-transparent text-[var(--text-secondary)] border-[var(--border-color)]',
      secondary: 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]',
      critical: 'bg-[var(--severity-critical-bg)] text-[var(--severity-critical)] border-[var(--severity-critical-ring)]',
      warning: 'bg-[var(--severity-warning-bg)] text-[var(--severity-warning)] border-[var(--severity-warning-ring)]',
      info: 'bg-[var(--severity-info-bg)] text-[var(--severity-info)] border-[var(--severity-info-ring)]',
      success: 'bg-[var(--severity-success-bg)] text-[var(--severity-success)] border-[var(--severity-success-ring)]',
      warn: 'bg-[var(--severity-warning-bg)] text-[var(--severity-warning)] border-[var(--severity-warning-ring)]',
      gold: 'bg-[var(--brand-primary-gradient-from)] text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
))
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
