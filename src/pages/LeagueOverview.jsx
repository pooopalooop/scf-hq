import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAllTeamsCapState } from '../hooks/useTeamData'
import { SPORT_CONFIG } from '../lib/constants'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_CONTRACTS } from '../lib/demoData'

const SPORTS = ['nfl', 'nba', 'mlb']

const STATUS_BADGES = {
  dl:      { label: 'DL',      cls: 'bg-[rgba(245,166,35,0.15)] text-accent border-[rgba(245,166,35,0.3)]' },
  ir:      { label: 'IR',      cls: 'bg-[rgba(239,68,68,0.15)] text-red border-[rgba(239,68,68,0.3)]' },
  sspd:    { label: 'SSPD',    cls: 'bg-[rgba(59,130,246,0.15)] text-blue border-[rgba(59,130,246,0.3)]' },
  minors:  { label: 'MIN',     cls: 'bg-[rgba(34,197,94,0.15)] text-green border-[rgba(34,197,94,0.3)]' },
  drafted: { label: 'DFT',     cls: 'bg-[rgba(59,130,246,0.15)] text-blue border-[rgba(59,130,246,0.3)]' },
}

// ─── Team detail: full per-sport roster + salary breakdown ───────────────────
function SportDetailTable({ contracts, sport, capState }) {
  const config = SPORT_CONFIG[sport]
  const active  = contracts.filter(c => c.status === 'active').sort((a, b) => b.salary - a.salary)
  const reserve = contracts.filter(c => ['dl','ir','sspd'].includes(c.status))
  const minor   = contracts.filter(c => ['minors','drafted'].includes(c.status))

  const sum = arr => arr.reduce((t, c) => t + (c.salary || 0), 0)
  const activeTotal = sum(active)
  const reserveTotal = sum(reserve)
  const total = sum(contracts.filter(c => !['minors','drafted'].includes(c.status)))
  const remaining = capState ? capState.total_cap - capState.spent : (config.cap - total)

  const renderRow = c => (
    <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
      <td className="py-1 px-2.5 text-[12px] text-txt font-medium truncate max-w-[130px]">{c.players?.name}</td>
      <td className="py-1 px-2 font-mono text-[10px] text-txt3">{c.players?.position}</td>
      <td className="py-1 px-2 text-right">
        {c.status !== 'active' && STATUS_BADGES[c.status] && (
          <span className={`font-mono text-[8px] font-semibold tracking-wider uppercase px-1 py-px rounded-sm border ${STATUS_BADGES[c.status].cls}`}>
            {STATUS_BADGES[c.status].label}
          </span>
        )}
      </td>
      <td className="py-1 px-2 font-mono text-[11px] text-accent text-right">${c.salary}</td>
      <td className="py-1 px-2 font-mono text-[10px] text-txt3 text-right">{c.year2 ? `$${c.year2}` : '—'}</td>
      <td className="py-1 px-2 font-mono text-[10px] text-txt3 text-right">{c.year3 ? `$${c.year3}` : '—'}</td>
      <td className="py-1 px-2 font-mono text-[10px] text-txt3 text-right">{c.year4 ? `$${c.year4}` : '—'}</td>
    </tr>
  )

  return (
    <div className="bg-surface border border-border rounded overflow-hidden">
      {/* Sport header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-mono text-[11px] font-semibold tracking-wider uppercase" style={{ color: `var(--color-${sport})` }}>
          {config.label}
        </span>
        <span className="font-mono text-[10px] text-txt3">
          ${capState?.spent ?? total} / ${capState?.total_cap ?? config.cap}
          <span className={`ml-2 font-semibold ${remaining <= 0 ? 'text-red' : remaining < 20 ? 'text-accent' : 'text-green'}`}>
            ${remaining} left
          </span>
        </span>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-left py-1.5 px-2.5 border-b border-border">Player</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-left py-1.5 px-2 border-b border-border">Pos</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-left py-1.5 px-2 border-b border-border">Status</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-right py-1.5 px-2 border-b border-border">'25</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-right py-1.5 px-2 border-b border-border">'26</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-right py-1.5 px-2 border-b border-border">'27</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-right py-1.5 px-2 border-b border-border">'28</th>
          </tr>
        </thead>
        <tbody>
          {active.map(renderRow)}
          {reserve.map(renderRow)}
          {minor.map(renderRow)}
        </tbody>
      </table>

      {/* Footer totals */}
      <div className="border-t border-border bg-surface2 grid grid-cols-3 divide-x divide-border text-center">
        <div className="py-2">
          <div className="font-mono text-[9px] text-txt3 uppercase tracking-wider mb-0.5">Active ({active.length}/{config.activeRoster})</div>
          <div className="font-mono text-[12px] text-txt font-semibold">${activeTotal}</div>
        </div>
        <div className="py-2">
          <div className="font-mono text-[9px] text-txt3 uppercase tracking-wider mb-0.5">Reserve ({reserve.length})</div>
          <div className="font-mono text-[12px] text-txt font-semibold">${reserveTotal}</div>
        </div>
        <div className="py-2">
          <div className="font-mono text-[9px] text-txt3 uppercase tracking-wider mb-0.5">Cap Left</div>
          <div className={`font-mono text-[12px] font-semibold ${remaining <= 0 ? 'text-red' : remaining < 20 ? 'text-accent' : 'text-green'}`}>
            ${remaining}
          </div>
        </div>
      </div>
    </div>
  )
}

function TeamDetailView({ teamId, teamName, capStates, onClose }) {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['team_roster_all', teamId],
    queryFn: async () => {
      if (!isConfigured) return DEMO_CONTRACTS
      const { data, error } = await supabase
        .from('contracts')
        .select('*, players(name, position)')
        .eq('team_id', teamId)
        .order('salary', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-condensed text-[20px] font-bold text-txt">{teamName}</h2>
        <button
          onClick={onClose}
          className="font-mono text-[10px] tracking-wider uppercase text-txt3 hover:text-txt cursor-pointer bg-transparent border-none px-2 py-1"
        >
          ✕ Close
        </button>
      </div>

      {isLoading ? (
        <div className="text-txt3 text-center py-8 font-mono text-[11px]">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {SPORTS.map(sport => (
            <SportDetailTable
              key={sport}
              contracts={(contracts || []).filter(c => c.sport === sport)}
              sport={sport}
              capState={capStates?.find(c => c.team_id === teamId && c.sport === sport)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main cap table: all teams × all sports ──────────────────────────────────
function CapTable({ capStates, onTeamClick, selectedTeam }) {
  // Build sorted team list
  const teams = []
  const seen = new Set()
  if (capStates) {
    for (const cs of capStates) {
      if (!seen.has(cs.team_id)) {
        seen.add(cs.team_id)
        teams.push({ id: cs.team_id, name: cs.teams?.name })
      }
    }
    teams.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }

  const getCs = (teamId, sport) => capStates?.find(c => c.team_id === teamId && c.sport === sport)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[700px]">
        <thead>
          <tr>
            <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border w-[130px]">
              Team
            </th>
            {SPORTS.map(sport => (
              <th key={sport} colSpan={3}
                className="font-mono text-[9px] tracking-wider uppercase font-semibold text-center py-2 px-2 border-b border-border"
                style={{ color: `var(--color-${sport})` }}
              >
                {SPORT_CONFIG[sport].label} <span className="font-normal text-txt3">(${SPORT_CONFIG[sport].cap})</span>
              </th>
            ))}
          </tr>
          <tr className="bg-surface2">
            <th className="py-1.5 px-3 border-b border-border" />
            {SPORTS.map(sport => (
              <>
                <th key={`${sport}-spent`} className="font-mono text-[8px] text-txt3 uppercase tracking-wider font-medium text-right py-1.5 px-2 border-b border-border">Spent</th>
                <th key={`${sport}-rem`} className="font-mono text-[8px] text-txt3 uppercase tracking-wider font-medium text-right py-1.5 px-2 border-b border-border">Remaining</th>
                <th key={`${sport}-n`} className="font-mono text-[8px] text-txt3 uppercase tracking-wider font-medium text-center py-1.5 px-2 border-b border-border">Roster</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map(team => {
            const isSelected = selectedTeam === team.id
            return (
              <tr
                key={team.id}
                onClick={() => onTeamClick(team.id, team.name)}
                className={`border-b border-border cursor-pointer transition-colors ${isSelected ? 'bg-surface3' : 'hover:bg-surface2'}`}
              >
                <td className={`py-2.5 px-3 text-[13px] font-medium ${isSelected ? 'text-accent' : 'text-txt'}`}>
                  {team.name}
                </td>
                {SPORTS.map(sport => {
                  const cs = getCs(team.id, sport)
                  const cap = cs?.total_cap ?? SPORT_CONFIG[sport].cap
                  const spent = cs?.spent ?? 0
                  const remaining = cap - spent
                  const pct = (spent / cap) * 100
                  const remColor = remaining <= 0 ? 'var(--color-red)' : remaining < 20 ? 'var(--color-accent)' : 'var(--color-green)'
                  return (
                    <>
                      <td key={`${sport}-spent`} className="py-2.5 px-2 font-mono text-[12px] text-txt2 text-right">${spent}</td>
                      <td key={`${sport}-rem`} className="py-2.5 px-2 font-mono text-[12px] text-right font-semibold" style={{ color: remColor }}>
                        ${remaining}
                      </td>
                      <td key={`${sport}-n`} className="py-2.5 px-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full max-w-[40px] bg-surface3 rounded-[1px] h-[3px]">
                            <div className="h-full rounded-[1px]"
                              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: `var(--color-${sport})`, opacity: 0.6 }} />
                          </div>
                          <span className="font-mono text-[9px] text-txt3">{Math.round(pct)}%</span>
                        </div>
                      </td>
                    </>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LeagueOverview() {
  const { data: capStates, isLoading } = useAllTeamsCapState()
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedTeamName, setSelectedTeamName] = useState(null)

  function handleTeamClick(teamId, teamName) {
    if (selectedTeam === teamId) {
      setSelectedTeam(null)
      setSelectedTeamName(null)
    } else {
      setSelectedTeam(teamId)
      setSelectedTeamName(teamName)
      // Scroll to detail panel after a tick
      setTimeout(() => document.getElementById('team-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-border">
        <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
          League Overview
        </h1>
        <span className="text-[12px] text-txt2 font-mono">
          Cap breakdown — click any team for full roster
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-10 bg-surface2 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <CapTable
            capStates={capStates}
            onTeamClick={handleTeamClick}
            selectedTeam={selectedTeam}
          />

          {selectedTeam && (
            <div id="team-detail">
              <TeamDetailView
                teamId={selectedTeam}
                teamName={selectedTeamName}
                capStates={capStates}
                onClose={() => { setSelectedTeam(null); setSelectedTeamName(null) }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
