import * as React from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <div className="relative inline-block w-full">
    <select
      className={`flex h-10 w-full appearance-none rounded-lg border border-text-dim bg-ink px-3 py-2 text-sm text-text-on-dark focus:outline-none focus:ring-2 focus:ring-energy ${className}`}
      ref={ref}
      {...props}
    />
    <ChevronDown className="absolute right-3 top-2.5 h-5 w-5 text-text-dim pointer-events-none" />
  </div>
))
Select.displayName = 'Select'

export { Select }
