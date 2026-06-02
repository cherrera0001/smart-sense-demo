'use client'

import * as React from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div onClick={() => onOpenChange(false)} className="absolute inset-0" />
      <div className="relative bg-gradient-to-br from-surface-primary to-surface-secondary rounded-lg p-8 max-w-md w-full mx-4 shadow-xl border border-text-tertiary/15">{children}</div>
    </div>
  )
}

export function DialogClose({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={className || "absolute right-4 top-4 text-text-tertiary hover:text-text-secondary transition-colors"}
    >
      <X className="h-5 w-5" />
    </button>
  )
}
