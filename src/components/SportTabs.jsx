import { useGlobalSport } from '../lib/sportContext'
import { SPORT_CONFIG } from '../lib/constants'

// This component now just displays the current sport — selection happens in the Header
export default function SportTabs({ activeSport: overrideSport, onSelect }) {
  const { globalSport } = useGlobalSport()
  const sport = overrideSport || globalSport
  const config = SPORT_CONFIG[sport]

  // If a parent still passes onSelect, render the dropdown for that page's override
  if (onSelect) {
    return (
      <div className="mb-6">
        <select
          value={sport}
          onChange={e => onSelect(e.target.value)}
          className="bg-surface2 border border-border2 font-mono text-[12px] font-semibold tracking-wider uppercase px-4 py-2 rounded-sm cursor-pointer outline-none transition-colors focus:border-accent"
          style={{
            color: `var(--color-${sport})`,
            borderColor: `color-mix(in srgb, var(--color-${sport}) 40%, transparent)`,
            background: `color-mix(in srgb, var(--color-${sport}) 8%, var(--color-surface2))`,
          }}
        >
          {['nfl', 'nba', 'mlb'].map(s => (
            <option key={s} value={s} className="bg-surface2 text-txt">
              {SPORT_CONFIG[s].label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  // Default: just show the sport badge (selection is in the header)
  return (
    <div className="mb-6">
      <span
        className="font-mono text-[12px] font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm border inline-block"
        style={{
          color: `var(--color-${sport})`,
          borderColor: `color-mix(in srgb, var(--color-${sport}) 40%, transparent)`,
          background: `color-mix(in srgb, var(--color-${sport}) 8%, transparent)`,
        }}
      >
        {config.label}
      </span>
    </div>
  )
}
