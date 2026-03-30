import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAllTeamsCapState } from '../hooks/useTeamData'
import { SPORT_CONFIG } from '../lib/constants'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_CONTRACTS } from '../lib/demoData'
import { useGlobalSport } from '../lib/sportContext'

// ── Compact 3-column cap card (used in ALL mode) ────────────────────────────
function SportCapCard({ sport, capStates, onTeamClick, selectedTeam }) {
  const config = SPORT_CONFIG[sport]
  const sportStates = (capStates?.filter(cs => cs.sport === sport) || [])
    .sort((a, b) => (a.teams?.name || '').localeCompare(b.teams?.name || ''))

  return (
    <div className="bg-surface border border-border rounded overflow-hidden">
      <div
        className="font-mono text-[11px] font-semibold tracking-wider uppercase px-3.5 py-2.5 border-b border-border flex justify-between items-center"
        style={{ color: `var(--color-${sport})` }}
      >
        <span>{config.label}</span>
        <span className="text-txt3 font-normal text-[10px]">${config.cap} CAP</span>
      </div>
      {sportStates.map(cs => {
        const remaining = cs.total_cap - cs.spent
        const pct = (cs.spent / cs.total_cap) * 100
        const barColor = pct > 90 ? 'var(--color-red)' : pct > 75 ? 'var(--color-accent)' : `var(--color-${sport})`
        const textColor = remaining < 10 ? 'var(--color-red)' : remaining < 30 ? 'var(--color-accent)' : 'var(--color-txt2)'
        const isSelected = selectedTeam === cs.team_id

        return (
          <button
            key={cs.id}
            onClick={() => onTeamClick(cs.team_id, cs.teams?.name)}
            className={`w-full px-3.5 py-2 border-b border-border last:border-b-0 grid items-center gap-2.5 text-[12px] cursor-pointer transition-colors text-left ${isSelected ? 'bg-surface3' : 'hover:bg-surface2'}`}
            style={{ gridTemplateColumns: '80px 1fr 45px' }}
          >
            <span className={`text-[12px] ${isSelected ? 'text-txt font-medium' : 'text-txt2'}`}>{cs.teams?.name || '—'}</span>
            <div className="bg-surface3 rounded-[1px] h-[5px] overflow-hidden">
              <div className="h-full rounded-[1px] transition-all duration-300" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
            </div>
            <span className="font-mono text-[11px] text-right" style={{ color: textColor }}>${remaining}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Expanded single-sport row (used in NFL/NBA/MLB mode) ────────────────────
function SportCapRowExpanded({ sport, capStates, allContracts, onTeamClick, selectedTeam }) {
  const config = SPORT_CONFIG[sport]
  const sportStates = (capStates?.filter(cs => cs.sport === sport) || [])
    .sort((a, b) => (a.teams?.name || '').localeCompare(b.teams?.name || ''))

  return (
    <div className="bg-surface border border-border rounded overflow-hidden">
      <div
        className="font-mono text-[11px] font-semibold tracking-wider uppercase px-4 py-3 border-b border-border flex justify-between items-center"
        style={{ color: `var(--color-${sport})` }}
      >
        <span>{config.label} — All Teams</span>
        <span className="text-txt3 font-normal text-[10px]">${config.cap} salary cap</span>
      </div>

      <div className="divide-y divide-border">
        {sportStates.map(cs => {
          const remaining = cs.total_cap - cs.spent
          const pct = Math.min((cs.spent / cs.total_cap) * 100, 100)
          const barColor = pct > 90 ? 'var(--color-red)' : pct > 75 ? 'var(--color-accent)' : `var(--color-${sport})`
          const remColor = remaining <= 0 ? 'text-red' : remaining < 20 ? 'text-accent' : 'text-green'
          const isSelected = selectedTeam === cs.team_id

          // Aggregate contracts for this team+sport
          const teamContracts = (allContracts || []).filter(c => c.team_id === cs.team_id && c.sport === sport)
          const active = teamContracts.filter(c => c.status === 'active')
          const dl = teamContracts.filter(c => c.status === 'dl')
          const ir = teamContracts.filter(c => c.status === 'ir')
          const sspd = teamContracts.filter(c => c.status === 'sspd')
          const minors = teamContracts.filter(c => ['minors', 'drafted'].includes(c.status))
          const sum = arr => arr.reduce((t, c) => t + (c.salary || 0), 0)

          const activeSlots = config.activeRoster
          const minorsSlots = (config.minorsSlots || 0) + (config.draftedSlots || 0)

          return (
            <button
              key={cs.id}
              onClick={() => onTeamClick(cs.team_id, cs.teams?.name)}
              className={`w-full px-4 py-3.5 text-left transition-colors cursor-pointer ${isSelected ? 'bg-surface3' : 'hover:bg-surface2'}`}
            >
              <div className="flex items-center gap-4">
                {/* Team name */}
                <span className={`font-medium text-[14px] w-[110px] flex-shrink-0 ${isSelected ? 'text-txt' : 'text-txt2'}`}>
                  {cs.teams?.name || '—'}
                </span>

                {/* Cap bar */}
                <div className="flex-1 min-w-0">
                  <div className="bg-surface3 rounded-sm h-2 overflow-hidden">
                    <div className="h-full rounded-sm transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-mono text-[9px] text-txt3">${cs.spent} spent</span>
                    <span className="font-mono text-[9px] text-txt3">${cs.total_cap} cap</span>
                  </div>
                </div>

                {/* Cap remaining */}
                <div className="text-right w-[60px] flex-shrink-0">
                  <div className={`font-mono text-[14px] font-semibold ${remColor}`}>${remaining}</div>
                  <div className="font-mono text-[9px] text-txt3">remaining</div>
                </div>

                {/* Roster slots */}
                <div className="text-right w-[60px] flex-shrink-0">
                  <div className={`font-mono text-[13px] font-medium ${active.length >= activeSlots ? 'text-red' : 'text-txt2'}`}>
                    {active.length}/{activeSlots}
                  </div>
                  <div className="font-mono text-[9px] text-txt3">active</div>
                </div>

                {/* Salary breakdown */}
                <div className="flex gap-3 flex-shrink-0">
                  <SalaryPill label="Active" value={sum(active)} color="txt2" />
                  {dl.length > 0 && <SalaryPill label={`DL ${dl.length}`} value={sum(dl)} color="accent" />}
                  {ir.length > 0 && <SalaryPill label={`IR ${ir.length}`} value={sum(ir)} color="red" />}
                  {sspd.length > 0 && <SalaryPill label={`SSPD ${sspd.length}`} value={sum(sspd)} color="blue" />}
                  {minors.length > 0 && <SalaryPill label={`Min ${minors.length}/${minorsSlots}`} value={sum(minors)} color="green" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SalaryPill({ label, value, color }) {
  return (
    <div className="text-right hidden lg:block">
      <div className={`font-mono text-[11px] text-${color}`}>${value}</div>
      <div className="font-mono text-[9px] text-txt3">{label}</div>
    </div>
  )
}

const STATUS_BADGES = {
  dl: { label: 'DL', cls: 'bg-[rgba(245,166,35,0.15)] text-accent border-[rgba(245,166,35,0.3)]' },
  ir: { label: 'IR', cls: 'bg-[rgba(239,68,68,0.15)] text-red border-[rgba(239,68,68,0.3)]' },
  sspd: { label: 'SSPD', cls: 'bg-[rgba(59,130,246,0.15)] text-blue border-[rgba(59,130,246,0.3)]' },
  minors: { label: 'MINORS', cls: 'bg-[rgba(34,197,94,0.15)] text-green border-[rgba(34,197,94,0.3)]' },
  drafted: { label: 'DRAFTED', cls: 'bg-[rgba(59,130,246,0.15)] text-blue border-[rgba(59,130,246,0.3)]' },
}

function SportRosterTable({ contracts, sport, capState }) {
  const config = SPORT_CONFIG[sport]
  const active = contracts.filter(c => c.status === 'active').sort((a, b) => b.salary - a.salary)
  const dl = contracts.filter(c => c.status === 'dl')
  const ir = contracts.filter(c => c.status === 'ir')
  const sspd = contracts.filter(c => c.status === 'sspd')
  const minors = contracts.filter(c => c.status === 'minors')
  const drafted = contracts.filter(c => c.status === 'drafted')

  const renderRows = (players) => players.map(c => (
    <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
      <td className="py-1 px-2 text-txt font-medium text-[11px] truncate max-w-[120px]">{c.players?.name}</td>
      <td className="py-1 px-2 font-mono text-[9px] text-txt3">{c.players?.position}</td>
      <td className="py-1 px-2 font-mono text-[10px] text-accent text-right">${c.salary}</td>
      <td className="py-1 px-2 font-mono text-[10px] text-txt3 text-right">{c.year2 ? `$${c.year2}` : '—'}</td>
      <td className="py-1 px-2 font-mono text-[10px] text-txt3 text-right">{c.year3 ? `$${c.year3}` : '—'}</td>
      <td className="py-1 px-2 font-mono text-[10px] text-txt3 text-right">{c.year4 ? `$${c.year4}` : '—'}</td>
    </tr>
  ))

  const renderSection = (label, players, status) => {
    if (players.length === 0) return null
    const badge = STATUS_BADGES[status]
    return (
      <>
        <tr>
          <td colSpan={6} className="pt-2 pb-1 px-2">
            <span className={`font-mono text-[8px] font-semibold tracking-wider uppercase px-1 py-px rounded-sm border ${badge.cls}`}>
              {badge.label}
            </span>
          </td>
        </tr>
        {renderRows(players)}
      </>
    )
  }

  const sum = (arr) => arr.reduce((t, c) => t + (c.salary || 0), 0)
  const activeTotal = sum(active)
  const dlTotal = sum(dl)
  const irTotal = sum(ir)
  const sspdTotal = sum(sspd)
  const minorsTotal = sum(minors)
  const draftedTotal = sum(drafted)
  const grandTotal = activeTotal + dlTotal + irTotal + sspdTotal + minorsTotal + draftedTotal

  const remaining = capState ? capState.total_cap - capState.spent : 0
  const rosterCount = active.length
  const rosterLimit = config.activeRoster
  const minorsLimit = config.minorsSlots
  const draftedLimit = config.draftedSlots || 0

  const summaryRow = (label, value, cls = 'text-txt2') => (
    <div className="flex justify-between py-1 px-2">
      <span className={`text-[10px] ${cls}`}>{label}</span>
      <span className={`font-mono text-[10px] ${cls}`}>${value}</span>
    </div>
  )

  return (
    <div className="bg-surface border border-border rounded overflow-hidden">
      <div
        className="font-mono text-[11px] font-semibold tracking-wider uppercase px-3 py-2 border-b border-border flex justify-between items-center"
        style={{ color: `var(--color-${sport})` }}
      >
        <span>{config.label}</span>
        <span className="text-txt3 font-normal text-[10px]">
          {capState ? `$${capState.spent}/$${capState.total_cap}` : ''}
        </span>
      </div>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-left py-1.5 px-2 border-b border-border">Player</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-left py-1.5 px-2 border-b border-border">Pos</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-right py-1.5 px-2 border-b border-border">'25</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-right py-1.5 px-2 border-b border-border">'26</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-right py-1.5 px-2 border-b border-border">'27</th>
            <th className="font-mono text-[8px] tracking-wider text-txt3 uppercase font-medium text-right py-1.5 px-2 border-b border-border">'28</th>
          </tr>
        </thead>
        <tbody>
          {renderRows(active)}
          {renderSection('DL', dl, 'dl')}
          {renderSection('IR', ir, 'ir')}
          {renderSection('SSPD', sspd, 'sspd')}
          {renderSection('Minors', minors, 'minors')}
          {renderSection('Drafted', drafted, 'drafted')}
        </tbody>
      </table>

      <div className="border-t border-border bg-surface2 px-1 py-2">
        <div className="font-mono text-[8px] tracking-wider text-txt3 uppercase px-2 pb-1.5 mb-1 border-b border-border">
          Salary Breakdown
        </div>
        {summaryRow(`Active Roster (${rosterCount}/${rosterLimit})`, activeTotal)}
        {dlTotal > 0 && summaryRow(`DL (${dl.length})`, dlTotal)}
        {irTotal > 0 && summaryRow(`IR (${ir.length})`, irTotal)}
        {sspdTotal > 0 && summaryRow(`SSPD (${sspd.length})`, sspdTotal)}
        {minorsTotal > 0 && summaryRow(`Minors (${minors.length}/${minorsLimit})`, minorsTotal)}
        {draftedTotal > 0 && summaryRow(`Drafted (${drafted.length}/${draftedLimit})`, draftedTotal)}
        <div className="flex justify-between py-1 px-2 mt-1 border-t border-border">
          <span className="text-[10px] text-txt font-semibold">Total Spent</span>
          <span className="font-mono text-[10px] text-accent font-semibold">${grandTotal}</span>
        </div>
        <div className="flex justify-between py-1 px-2">
          <span className="text-[10px] text-txt font-semibold">Cap Remaining</span>
          <span className={`font-mono text-[10px] font-semibold ${remaining <= 0 ? 'text-red' : remaining < 20 ? 'text-accent' : 'text-green'}`}>
            ${remaining}
          </span>
        </div>
        <div className="flex justify-between py-1 px-2">
          <span className="text-[10px] text-txt3">Salary Cap</span>
          <span className="font-mono text-[10px] text-txt3">${capState?.total_cap || config.cap}</span>
        </div>
        {capState?.amnesty_used && (
          <div className="flex justify-between py-1 px-2">
            <span className="text-[10px] text-txt3">Amnesty</span>
            <span className="font-mono text-[10px] text-accent">USED</span>
          </div>
        )}
      </div>
    </div>
  )
}

function TeamRosterView({ teamId, teamName, capStates, sport }) {
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

  if (isLoading) {
    return <div className="text-txt3 text-center py-8 font-mono text-[11px]">Loading roster...</div>
  }

  const sportsToShow = sport && sport !== 'all' ? [sport] : ['nfl', 'nba', 'mlb']

  return (
    <div>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <h2 className="font-condensed text-[18px] font-bold text-txt">{teamName}</h2>
        <div className="flex gap-2">
          {['nfl', 'nba', 'mlb'].map(s => {
            const cs = capStates?.find(c => c.team_id === teamId && c.sport === s)
            const remaining = cs ? cs.total_cap - cs.spent : 0
            return (
              <span key={s} className="font-mono text-[11px] px-2 py-0.5 rounded-sm border"
                style={{
                  color: `var(--color-${s})`,
                  borderColor: `color-mix(in srgb, var(--color-${s}) 30%, transparent)`,
                  background: `color-mix(in srgb, var(--color-${s}) 6%, transparent)`,
                }}>
                {SPORT_CONFIG[s].label} ${remaining}
              </span>
            )
          })}
        </div>
      </div>

      <div className={`grid gap-3 ${sportsToShow.length === 1 ? 'grid-cols-1 max-w-2xl' : 'grid-cols-3'}`}>
        {sportsToShow.map(s => (
          <SportRosterTable
            key={s}
            contracts={(contracts || []).filter(c => c.sport === s)}
            sport={s}
            capState={capStates?.find(c => c.team_id === teamId && c.sport === s)}
          />
        ))}
      </div>
    </div>
  )
}

export default function LeagueOverview() {
  const { globalSport } = useGlobalSport()
  const { data: capStates, isLoading: capLoading } = useAllTeamsCapState()
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedTeamName, setSelectedTeamName] = useState(null)

  // Fetch all contracts for expanded single-sport view
  const { data: allContracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['all_contracts_overview'],
    queryFn: async () => {
      if (!isConfigured) return DEMO_CONTRACTS
      const { data, error } = await supabase
        .from('contracts')
        .select('*, players(name, position)')
        .order('salary', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: globalSport !== 'all',
  })

  const isLoading = capLoading || (globalSport !== 'all' && contractsLoading)

  // Build unique team list
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

  function handleTeamClick(teamId, teamName) {
    if (selectedTeam === teamId) {
      setSelectedTeam(null)
      setSelectedTeamName(null)
    } else {
      setSelectedTeam(teamId)
      setSelectedTeamName(teamName)
    }
  }

  const isSingleSport = globalSport !== 'all'

  return (
    <div>
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
            League Overview
          </h1>
          <span className="text-[12px] text-txt2 font-mono">
            All 10 Teams &mdash; {isSingleSport ? `${globalSport.toUpperCase()} view` : 'click a team to view full roster'}
          </span>
        </div>
        {/* Team jump dropdown — always visible */}
        <select
          value={selectedTeam || ''}
          onChange={e => {
            const id = e.target.value
            if (!id) { setSelectedTeam(null); setSelectedTeamName(null); return }
            const t = teams.find(t => t.id === id)
            setSelectedTeam(id)
            setSelectedTeamName(t?.name)
          }}
          className="bg-surface2 border border-border2 text-txt font-mono text-[11px] px-3 py-1.5 rounded-sm cursor-pointer outline-none focus:border-accent"
        >
          <option value="">Jump to team</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-txt3 text-center py-12 font-mono text-[11px]">Loading...</div>
      ) : (
        <>
          {isSingleSport ? (
            // Single-sport expanded view
            <div className="mb-6">
              <SportCapRowExpanded
                sport={globalSport}
                capStates={capStates}
                allContracts={allContracts}
                onTeamClick={handleTeamClick}
                selectedTeam={selectedTeam}
              />
            </div>
          ) : (
            // ALL: 3-column compact view
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['nfl', 'nba', 'mlb'].map(sport => (
                <SportCapCard
                  key={sport}
                  sport={sport}
                  capStates={capStates}
                  onTeamClick={handleTeamClick}
                  selectedTeam={selectedTeam}
                />
              ))}
            </div>
          )}

          {/* Team roster detail */}
          {selectedTeam && (
            <TeamRosterView
              teamId={selectedTeam}
              teamName={selectedTeamName}
              capStates={capStates}
              sport={globalSport}
            />
          )}
        </>
      )}
    </div>
  )
}
