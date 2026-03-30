import { useAuth } from '../lib/auth'
import { SPORT_CONFIG } from '../lib/constants'
import { useTeamCapState } from '../hooks/useTeamData'
import { useGlobalSport } from '../lib/sportContext'

export default function Header() {
  const { team, signOut, user } = useAuth()
  const { data: capStates } = useTeamCapState(team?.id)
  const { globalSport, setGlobalSport } = useGlobalSport()

  const capBySport = {}
  if (capStates) {
    for (const cs of capStates) {
      capBySport[cs.sport] = cs.total_cap - cs.spent
    }
  }

  return (
    <header className="bg-surface border-b border-border px-6 flex items-center justify-between h-[52px] sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="font-mono font-semibold text-[13px] tracking-wider text-accent uppercase">
          SCF<span className="text-txt3 mx-1.5">/</span>HQ
        </div>
        {team && (
          <div className="font-mono text-[11px] text-txt2 bg-surface3 border border-border2 px-2.5 py-0.5 rounded-sm">
            {team.name}
          </div>
        )}

        {/* Global Sport Selector */}
        <div className="flex gap-1">
          {[
            { id: 'all', label: 'ALL' },
            { id: 'nfl', label: 'NFL' },
            { id: 'nba', label: 'NBA' },
            { id: 'mlb', label: 'MLB' },
          ].map(({ id, label }) => {
            const isActive = globalSport === id
            const isSport = id !== 'all'
            return (
              <button
                key={id}
                onClick={() => setGlobalSport(id)}
                className="font-mono text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-sm cursor-pointer border transition-all duration-75"
                style={isActive ? (isSport ? {
                  color: `var(--color-${id})`,
                  borderColor: `color-mix(in srgb, var(--color-${id}) 50%, transparent)`,
                  background: `color-mix(in srgb, var(--color-${id}) 15%, transparent)`,
                } : {
                  color: 'var(--color-txt)',
                  borderColor: 'var(--color-border2)',
                  background: 'var(--color-surface3)',
                }) : {
                  color: 'var(--color-txt3)',
                  borderColor: 'transparent',
                  background: 'transparent',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
        {['nfl', 'nba', 'mlb'].map(sport => (
          <div
            key={sport}
            className="font-mono text-[11px] px-2.5 py-0.5 rounded-sm border"
            style={{
              color: `var(--color-${sport})`,
              borderColor: `color-mix(in srgb, var(--color-${sport}) 30%, transparent)`,
              background: `color-mix(in srgb, var(--color-${sport}) 6%, transparent)`,
            }}
          >
            {SPORT_CONFIG[sport].label} ${capBySport[sport] ?? '—'}
          </div>
        ))}
        </div>

        {user && (
          <button
            onClick={signOut}
            className="font-mono text-[11px] text-txt3 hover:text-txt2 ml-2 cursor-pointer"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  )
}
