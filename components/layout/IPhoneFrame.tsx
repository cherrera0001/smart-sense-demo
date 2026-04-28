'use client'

interface IPhoneFrameProps {
  children: React.ReactNode
  visible: boolean
}

export function IPhoneFrame({ children, visible }: IPhoneFrameProps) {
  if (!visible) {
    return <>{children}</>
  }

  return (
    <div className="mx-auto max-w-[440px] rounded-[40px] border-[12px] border-black bg-black shadow-2xl overflow-hidden">
      {/* Notch */}
      <div className="h-7 bg-black flex justify-center items-center">
        <div className="w-40 h-6 bg-black rounded-b-2xl" />
      </div>
      {/* Content */}
      <div className="w-full bg-ink min-h-screen">{children}</div>
    </div>
  )
}
