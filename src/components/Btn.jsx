// Props: variant ('primary'|'secondary'|'destructive'|'ghost'), size ('sm'|'md'),
// loading, disabled, disabledReason (tooltip text), onClick, children, className
import { useState } from 'react'

export default function Btn({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  disabledReason,
  onClick,
  children,
  className = '',
  type = 'button',
}) {
  const [showTip, setShowTip] = useState(false)

  const base = 'relative font-mono font-semibold tracking-wider uppercase rounded-sm cursor-pointer transition-colors border-none outline-none flex items-center justify-center gap-2'

  const sizes = {
    sm: 'text-[10px] py-1.5 px-3 min-h-[32px]',
    md: 'text-[12px] py-2.5 px-5 min-h-[40px]',
  }

  const variants = {
    primary: disabled || loading
      ? 'bg-surface3 text-txt3 cursor-not-allowed border border-border2'
      : 'bg-accent text-black hover:bg-accent2 border border-transparent',
    secondary: disabled || loading
      ? 'bg-transparent text-txt3 cursor-not-allowed border border-border2'
      : 'bg-transparent text-txt2 hover:bg-surface2 hover:text-txt border border-border2',
    destructive: disabled || loading
      ? 'bg-transparent text-txt3 cursor-not-allowed border border-border2'
      : 'bg-transparent text-red hover:bg-[rgba(239,68,68,0.08)] border border-red',
    ghost: disabled || loading
      ? 'bg-transparent text-txt3 cursor-not-allowed'
      : 'bg-transparent text-txt2 hover:text-txt border border-transparent',
  }

  return (
    <div className="relative inline-flex">
      <button
        type={type}
        disabled={disabled || loading}
        onClick={!disabled && !loading ? onClick : undefined}
        onMouseEnter={() => (disabled && disabledReason) && setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </>
        ) : children}
      </button>
      {showTip && disabledReason && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface border border-border2 text-txt2 text-[11px] font-mono px-2.5 py-1.5 rounded-sm whitespace-nowrap z-50 shadow-lg">
          {disabledReason}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border2" />
        </div>
      )}
    </div>
  )
}
