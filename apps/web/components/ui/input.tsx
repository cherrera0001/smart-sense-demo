import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-11 w-full rounded-lg border px-3 py-2 text-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]',
      className
    )}
    style={{
      borderColor: 'var(--border-color)',
      background: 'var(--surface-primary)',
      color: 'var(--text-primary)',
      boxShadow: 'none',
    }}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
