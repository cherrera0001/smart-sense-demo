import * as React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={`flex h-10 w-full rounded-lg border border-text-dim bg-ink px-3 py-2 text-sm text-text-on-dark placeholder:text-text-dim-on-dark focus:outline-none focus:ring-2 focus:ring-energy ${className}`}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
