import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px]',
  {
    variants: {
      variant: {
        default: 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)] focus-visible:ring-[var(--brand-primary)]',
        outline: 'border border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] focus-visible:ring-[var(--brand-primary)]',
        ghost: 'text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] focus-visible:ring-[var(--brand-primary)]',
        secondary: 'bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:opacity-90 focus-visible:ring-[var(--brand-primary)]',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        default: 'px-4 py-2',
        lg: 'px-6 py-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
