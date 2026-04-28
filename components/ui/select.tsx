import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <div className="relative inline-block w-full">
    <select
      className={cn(
        'flex h-11 w-full appearance-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]',
        className
      )}
      style={{
        borderColor: 'var(--border-color)',
        background: 'var(--surface-primary)',
        color: 'var(--text-primary)',
      }}
      ref={ref}
      {...props}
    />
    <ChevronDown className="absolute right-3 top-3 h-5 w-5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
  </div>
))
Select.displayName = 'Select'

export { Select }
