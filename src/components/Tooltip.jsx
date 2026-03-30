// Small ⓘ icon with hover tooltip showing rule text
// Props: text (the rule text)
import { useState } from 'react'

export default function Tooltip({ text }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        className="text-txt3 hover:text-txt2 transition-colors cursor-pointer"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={(e) => { e.preventDefault(); setVisible(v => !v) }}
        aria-label="More information"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6.5" stroke="currentColor"/>
          <text x="7" y="11" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="monospace">i</text>
        </svg>
      </button>
      {visible && (
        <div className="absolute bottom-full left-0 mb-2 bg-surface border border-border2 text-txt2 text-[11px] font-mono px-3 py-2 rounded-sm z-50 shadow-lg w-64 leading-relaxed">
          {text}
          <div className="absolute top-full left-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border2" />
        </div>
      )}
    </span>
  )
}
