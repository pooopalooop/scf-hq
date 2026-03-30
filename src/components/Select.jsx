// Props: value, onChange, options [{value, label, sublabel}], placeholder, disabled, disabledMessage
// Always dark surface, amber focus border, IBM Plex Sans, no empty selectable option
export default function Select({ value, onChange, options = [], placeholder, disabled, disabledMessage, className = '' }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className={`
          w-full bg-surface2 border text-txt px-3 py-2.5 rounded-sm font-body text-[13px]
          outline-none transition-colors appearance-none cursor-pointer
          disabled:cursor-not-allowed disabled:text-txt3
          focus:border-accent hover:border-border
          ${value ? 'border-border2' : 'border-border2 text-txt3'}
          ${className}
        `}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {options.length === 0 && (
          <option value="" disabled>{disabledMessage || 'No options available'}</option>
        )}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-txt3">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  )
}
