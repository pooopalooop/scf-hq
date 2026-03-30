import { useState, useMemo, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { useTeamRoster } from '../hooks/useTeamData'
import { supabase, isConfigured } from '../lib/supabase'
import { SPORT_CONFIG, ELIGIBILITY_LIMITS } from '../lib/constants'
import { useGlobalSport } from '../lib/sportContext'
import SportTabs from '../components/SportTabs'
import SearchableSelect from '../components/SearchableSelect'
import Select from '../components/Select'
import Btn from '../components/Btn'

const MINORS_MIN_MS = 5 * 24 * 60 * 60 * 1000

function msUntilCallUpEligible(placedAt) {
  if (!placedAt) return 0
  return Math.max(0, new Date(placedAt).getTime() + MINORS_MIN_MS - Date.now())
}

function formatTimeLeft(ms) {
  const days = Math.floor(ms / (24 * 3600 * 1000))
  const hours = Math.floor((ms % (24 * 3600 * 1000)) / 3600_000)
  if (days >= 1) return `${days}d ${hours}h`
  return `${hours}h`
}

function EligibilityBar({ label, current, limit }) {
  const pct = Math.min(100, Math.round((current / limit) * 100))
  const exceeded = current >= limit
  const warning = pct > 75 && !exceeded
  const color = exceeded ? 'var(--color-red)' : warning ? 'var(--color-accent)' : 'var(--color-green)'
  const textColor = exceeded ? 'text-red' : warning ? 'text-accent' : 'text-txt2'

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-[12px] text-txt2 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 bg-surface3 rounded-[1px] h-2 overflow-hidden">
          <div className="h-full rounded-[1px] transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className={`font-mono text-[11px] w-20 text-right ${textColor}`}>
          {current} / {limit}
        </span>
      </div>
    </div>
  )
}

function EligibilityPanel({ player, sport, stats, loading }) {
  if (loading) {
    return (
      <div className="bg-surface2 border border-border2 rounded-sm p-4">
        <div className="font-mono text-[11px] text-txt3">Loading career stats...</div>
      </div>
    )
  }
  if (!stats) return null

  const limits = ELIGIBILITY_LIMITS[sport]
  let rows = []
  let exceeded = false

  if (sport === 'mlb') {
    const abExc = stats.ab >= limits.ab
    const ipExc = stats.ip >= limits.ip
    exceeded = abExc || ipExc
    rows = [
      { label: 'At Bats', current: stats.ab, limit: limits.ab },
      { label: 'Innings Pitched', current: stats.ip, limit: limits.ip },
    ]
  } else if (sport === 'nfl') {
    const passExc = (stats.pass || 0) >= limits.pass
    const rushExc = (stats.rush || 0) >= limits.rush
    const recExc = (stats.rec || 0) >= limits.rec
    exceeded = passExc || rushExc || recExc
    rows = [
      { label: 'Pass Yards', current: stats.pass || 0, limit: limits.pass },
      { label: 'Rush Yards', current: stats.rush || 0, limit: limits.rush },
      { label: 'Rec Yards', current: stats.rec || 0, limit: limits.rec },
    ]
  } else if (sport === 'nba') {
    const ptsExc = (stats.pts || 0) >= limits.pts
    const rebExc = (stats.reb || 0) >= limits.reb
    const astExc = (stats.ast || 0) >= limits.ast
    exceeded = ptsExc || rebExc || astExc
    rows = [
      { label: 'Points', current: stats.pts || 0, limit: limits.pts },
      { label: 'Rebounds', current: stats.reb || 0, limit: limits.reb },
      { label: 'Assists', current: stats.ast || 0, limit: limits.ast },
    ]
  }

  const maxPct = Math.max(...rows.map(r => Math.round((r.current / r.limit) * 100)))
  const statusText = exceeded ? 'LIMITS EXCEEDED' : maxPct > 75 ? 'NEARING LIMIT' : 'ELIGIBLE'
  const statusColor = exceeded ? 'text-red' : maxPct > 75 ? 'text-accent' : 'text-green'

  return (
    <div className="bg-surface2 border border-border2 rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
        <span className="font-mono text-[10px] tracking-wider text-txt3 uppercase">
          Rookie Eligibility — {player.name}
        </span>
        <span className={`font-mono text-[10px] font-semibold tracking-wider uppercase ${statusColor}`}>
          {statusText}
        </span>
      </div>
      <div className="px-3.5 py-2">
        {rows.map(r => (
          <EligibilityBar key={r.label} {...r} />
        ))}
      </div>
      <div className="px-3.5 py-2 border-t border-border text-[10px] text-txt3 font-mono">
        {sport === 'mlb'
          ? 'Data source: MLB Stats API — career MLB stats only. Minor league AB/IP not counted per league rules.'
          : `Career ${sport.toUpperCase()} stats. Stats exceeding any single threshold = ineligible.`}
      </div>
    </div>
  )
}

function MinorsRosterRow({ contract, onCallUp, callingUp, isCommissioner }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!contract.placed_at || contract.status !== 'minors') return
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [contract.placed_at, contract.status])

  const msLeft = contract.status === 'minors' ? msUntilCallUpEligible(contract.placed_at) : 0
  const locked = msLeft > 0

  return (
    <tr className="hover:bg-surface2 border-b border-border last:border-b-0">
      <td className="py-2 px-3 text-txt font-medium">{contract.players?.name}</td>
      <td className="py-2 px-3 font-mono text-[11px] text-txt3">{contract.players?.position}</td>
      <td className="py-2 px-3">
        <span className={`font-mono text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-sm ${
          contract.status === 'drafted'
            ? 'bg-[rgba(59,130,246,0.15)] text-blue border border-[rgba(59,130,246,0.3)]'
            : 'bg-[rgba(34,197,94,0.15)] text-green border border-[rgba(34,197,94,0.3)]'
        }`}>
          {contract.status}
        </span>
      </td>
      <td className="py-2 px-3 text-right">
        {onCallUp ? (
          locked ? (
            <div className="flex flex-col items-end gap-1">
              <span className="font-mono text-[10px] text-txt2">
                Call up in {formatTimeLeft(msLeft)}
              </span>
              <span className="font-mono text-[9px] text-txt3">5-day minimum (Sec. 13C)</span>
              {isCommissioner && (
                <button
                  onClick={onCallUp}
                  disabled={callingUp}
                  className="font-mono text-[10px] font-semibold tracking-wider uppercase py-1 px-2 rounded-sm cursor-pointer border border-accent bg-transparent text-accent hover:bg-[rgba(245,166,35,0.1)] transition-colors disabled:opacity-50"
                >
                  {callingUp ? '...' : 'Override'}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onCallUp}
              disabled={callingUp}
              className="font-mono text-[10px] font-semibold tracking-wider uppercase py-1 px-2.5 rounded-sm border-none bg-green text-black hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {callingUp ? '...' : 'Call Up'}
            </button>
          )
        ) : (
          <span className="font-mono text-[10px] text-txt3">—</span>
        )}
      </td>
    </tr>
  )
}

export default function MinorsPage({ onNavigate }) {
  const { globalSport: sport } = useGlobalSport()
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [rawResults, setRawResults] = useState([])
  const [playerStats, setPlayerStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [moveType, setMoveType] = useState('minors')
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualPos, setManualPos] = useState('')
  const [manualTeam, setManualTeam] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [callingUpId, setCallingUpId] = useState(null)

  const { team, isCommissioner } = useAuth()
  const { data: allContracts } = useTeamRoster(team?.id)
  const queryClient = useQueryClient()
  const config = SPORT_CONFIG[sport]

  // Current minors/drafted roster
  const minorsRoster = useMemo(() =>
    (allContracts || []).filter(c => c.sport === sport && (c.status === 'minors' || c.status === 'drafted')),
    [allContracts, sport]
  )

  const minorsCount = minorsRoster.filter(c => c.status === 'minors').length
  const draftedCount = minorsRoster.filter(c => c.status === 'drafted').length

  async function searchPlayers(query) {
    setSelectedPlayer(null)
    setPlayerStats(null)
    setManualMode(false)
    if (query.length < 2) return []

    if (sport === 'mlb') {
      try {
        const res = await fetch(`/api/mlb/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        const people = (data.people || []).slice(0, 8).map(p => ({
          id: p.id, name: p.fullName,
          pos: p.primaryPosition?.abbreviation || '—',
          team: p.currentTeam?.name || '—',
          level: p.sport?.name || 'MLB',
          fromApi: true,
        }))
        setRawResults(people)
        if (people.length === 0) setManualMode(true)
        return people.map(p => ({
          value: String(p.id),
          label: p.name,
          sublabel: p.team,
          badge: p.level !== 'Major League Baseball' ? p.level : undefined,
        }))
      } catch {
        setManualMode(true)
        return []
      }
    } else {
      if (!isConfigured) return []
      const { data } = await supabase
        .from('players')
        .select('id, name, position, real_world_team')
        .eq('sport', sport)
        .ilike('name', `%${query}%`)
        .limit(8)
      const people = (data || []).map(p => ({
        id: p.id, name: p.name,
        pos: p.position, team: p.real_world_team,
        fromApi: false,
      }))
      setRawResults(people)
      if (!people.length) setManualMode(true)
      return people.map(p => ({
        value: String(p.id),
        label: p.name,
        sublabel: `${p.real_world_team} · ${p.position}`,
      }))
    }
  }

  function handlePlayerSelect(opt) {
    if (!opt) { setSelectedPlayer(null); setPlayerStats(null); return }
    const player = rawResults.find(p => String(p.id) === opt.value)
    if (player) selectPlayer(player)
  }

  async function selectPlayer(player) {
    setSelectedPlayer(player)
    setManualMode(false)

    // Fetch career stats for eligibility
    if (sport === 'mlb' && player.fromApi && player.id) {
      setStatsLoading(true)
      try {
        const res = await fetch(`/api/mlb/stats/${player.id}`)
        const data = await res.json()
        const stats = { ab: 0, ip: 0 }
        for (const group of (data.stats || [])) {
          const splits = group.splits || []
          if (splits.length === 0) continue
          const s = splits[0].stat
          if (group.group?.displayName === 'hitting') stats.ab = s.atBats || 0
          if (group.group?.displayName === 'pitching') stats.ip = parseFloat(s.inningsPitched || '0') || 0
        }
        setPlayerStats(stats)
      } catch {
        setPlayerStats({ ab: 0, ip: 0 })
      } finally {
        setStatsLoading(false)
      }
    } else {
      // For NFL/NBA or non-API players, set empty stats (eligible by default)
      setPlayerStats(sport === 'nfl' ? { pass: 0, rush: 0, rec: 0 } : sport === 'nba' ? { pts: 0, reb: 0, ast: 0 } : { ab: 0, ip: 0 })
    }
  }

  // Check eligibility
  const isEligible = useMemo(() => {
    if (!playerStats) return null
    const limits = ELIGIBILITY_LIMITS[sport]
    if (sport === 'mlb') return playerStats.ab < limits.ab && playerStats.ip < limits.ip
    if (sport === 'nfl') return (playerStats.pass || 0) < limits.pass && (playerStats.rush || 0) < limits.rush && (playerStats.rec || 0) < limits.rec
    if (sport === 'nba') return (playerStats.pts || 0) < limits.pts && (playerStats.reb || 0) < limits.reb && (playerStats.ast || 0) < limits.ast
    return true
  }, [playerStats, sport])

  // Slot validation
  const slotsAvail = moveType === 'minors'
    ? minorsCount < config.minorsSlots
    : (config.draftedSlots ? draftedCount < config.draftedSlots : true)

  const canSubmit = (selectedPlayer || (manualMode && manualName.trim())) && isEligible !== false && slotsAvail

  const submitMove = useMutation({
    mutationFn: async () => {
      const pName = selectedPlayer?.name || manualName
      const pPos = selectedPlayer?.pos || manualPos
      const pTeam = selectedPlayer?.team || manualTeam
      const isManual = manualMode || !selectedPlayer?.fromApi

      // Insert player if new
      const { data: playerData, error: pErr } = await supabase
        .from('players')
        .insert({
          name: pName,
          position: pPos,
          real_world_team: pTeam,
          sport,
          mlb_stats_api_id: selectedPlayer?.fromApi ? selectedPlayer.id : null,
        })
        .select()
        .single()

      if (pErr) throw pErr

      // Insert contract
      const { error: cErr } = await supabase
        .from('contracts')
        .insert({
          player_id: playerData.id,
          team_id: team.id,
          sport,
          salary: 0,
          status: moveType,
          rookie_contract: true,
          placed_at: new Date().toISOString(),
        })

      if (cErr) throw cErr

      // Insert minors_roster entry
      const { error: mErr } = await supabase
        .from('minors_roster')
        .insert({
          player_id: playerData.id,
          team_id: team.id,
          sport,
          list_type: moveType,
        })

      if (mErr) throw mErr

      // Log transaction
      await supabase.from('transactions').insert({
        type: `minors_${moveType}`,
        team_id: team.id,
        player_id: playerData.id,
        sport,
        notes: `${pName} added to ${moveType} list`,
        is_manual_entry: isManual,
      })
    },
    onSuccess: () => {
      setSubmitSuccess({
        player: selectedPlayer?.name || manualName,
        type: moveType,
      })
      setSelectedPlayer(null)
      setPlayerStats(null)
      setRawResults([])
      setManualMode(false)
      setManualName('')
      setManualPos('')
      setManualTeam('')
      queryClient.invalidateQueries({ queryKey: ['roster'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const callUpMutation = useMutation({
    mutationFn: async (contract) => {
      setCallingUpId(contract.id)
      const now = new Date().toISOString()

      const { error: updateErr } = await supabase
        .from('contracts')
        .update({ status: 'active', placed_at: null, updated_at: now })
        .eq('id', contract.id)

      if (updateErr) throw updateErr

      await supabase.from('transactions').insert({
        type: 'call_up',
        team_id: team.id,
        player_id: contract.player_id,
        sport,
        notes: `${contract.players?.name} called up from minors to active roster`,
      })
    },
    onSuccess: (_, contract) => {
      setCallingUpId(null)
      setSubmitSuccess({ player: contract.players?.name, type: 'callup' })
      queryClient.invalidateQueries({ queryKey: ['roster'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => setCallingUpId(null),
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
            Minors / Drafted
          </h1>
          <span className="text-[12px] text-txt2 font-mono">Minor league and drafted list management</span>
        </div>
      </div>

      <SportTabs />

      {/* Slot Status */}
      <div className="flex gap-3 mb-6">
        <div className="bg-surface border border-border rounded-sm px-4 py-2 flex items-center gap-2">
          <span className="font-mono text-[10px] text-txt3 uppercase tracking-wider">Minors</span>
          <span className={`font-mono text-[12px] font-semibold ${minorsCount >= config.minorsSlots ? 'text-red' : 'text-green'}`}>
            {minorsCount}/{config.minorsSlots}
          </span>
        </div>
        {config.draftedSlots && (
          <div className="bg-surface border border-border rounded-sm px-4 py-2 flex items-center gap-2">
            <span className="font-mono text-[10px] text-txt3 uppercase tracking-wider">Drafted</span>
            <span className={`font-mono text-[12px] font-semibold ${draftedCount >= config.draftedSlots ? 'text-red' : 'text-green'}`}>
              {draftedCount}/{config.draftedSlots}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left: Current Minors Roster */}
        <div className="bg-surface border border-border rounded overflow-hidden">
          <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase px-4 py-3 border-b border-border">
            Current {sport.toUpperCase()} Minors Roster
          </div>
          {minorsRoster.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="font-mono text-[11px] text-txt3 mb-1">No players on minors or drafted list</div>
              <div className="font-mono text-[10px] text-txt3 opacity-60">Add a player using the form →</div>
            </div>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">Player</th>
                  <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">Pos</th>
                  <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">List</th>
                  <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-right py-2 px-3 border-b border-border">Action</th>
                </tr>
              </thead>
              <tbody>
                {minorsRoster.map(c => (
                  <MinorsRosterRow
                    key={c.id}
                    contract={c}
                    onCallUp={c.status === 'minors' ? () => callUpMutation.mutate(c) : null}
                    callingUp={callingUpId === c.id && callUpMutation.isPending}
                    isCommissioner={isCommissioner}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Search + Eligibility + Submit */}
        <div>
          {/* Player Search */}
          <div className="bg-surface border border-border rounded p-5 mb-4">
            <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-4 pb-2.5 border-b border-border">
              Add Player
            </div>
            <div className="mb-3">
              <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
                Search {sport === 'mlb' ? '(MLB Stats API — all levels)' : `(${sport.toUpperCase()} players)`}
              </label>
              <SearchableSelect
                value={selectedPlayer?.name ?? ''}
                onChange={handlePlayerSelect}
                onSearch={searchPlayers}
                placeholder={sport === 'mlb' ? 'Search MLB prospects & players...' : 'Search player name...'}
              />
            </div>

            {/* Manual Entry Fallback */}
            {manualMode && (
              <div className="p-3 bg-surface3 border border-[rgba(245,166,35,0.3)] rounded-sm mb-3">
                <div className="font-mono text-[9px] text-accent mb-2 uppercase tracking-wider">
                  No results — manual entry (commissioner review required)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" placeholder="Player name" value={manualName} onChange={e => setManualName(e.target.value)}
                    className="bg-surface2 border border-border2 text-txt px-2.5 py-1.5 rounded-sm text-[12px] outline-none focus:border-accent" />
                  <input type="text" placeholder="Position" value={manualPos} onChange={e => setManualPos(e.target.value)}
                    className="bg-surface2 border border-border2 text-txt px-2.5 py-1.5 rounded-sm text-[12px] outline-none focus:border-accent" />
                  <input type="text" placeholder="Team" value={manualTeam} onChange={e => setManualTeam(e.target.value)}
                    className="bg-surface2 border border-border2 text-txt px-2.5 py-1.5 rounded-sm text-[12px] outline-none focus:border-accent" />
                </div>
              </div>
            )}

            {/* Move Type */}
            {(selectedPlayer || manualMode) && (
              <div>
                <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">Move Type</label>
                <Select
                  value={moveType}
                  onChange={setMoveType}
                  options={[
                    { value: 'minors', label: 'Add to Minors List' },
                    ...(sport === 'mlb' ? [{ value: 'drafted', label: 'Add to Drafted List' }] : []),
                  ]}
                />
              </div>
            )}
          </div>

          {/* Eligibility Panel */}
          {(selectedPlayer || statsLoading) && (
            <div className="mb-4">
              <EligibilityPanel
                player={selectedPlayer || {}}
                sport={sport}
                stats={playerStats}
                loading={statsLoading}
              />
            </div>
          )}

          {/* Validation */}
          <div className="bg-surface2 border border-border2 rounded-sm overflow-hidden mb-4">
            <div className="font-mono text-[10px] tracking-wider uppercase px-3.5 py-2.5 border-b border-border text-txt3">Validation</div>
            <div className="flex items-center justify-between py-2.5 px-3.5 border-b border-border text-[13px]">
              <span className="text-txt2">Slots available</span>
              <span className={`font-mono text-[11px] ${slotsAvail ? 'text-green' : 'text-red'}`}>
                {slotsAvail ? '✓' : '✗ Full'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3.5 border-b border-border text-[13px]">
              <span className="text-txt2">Rookie eligible</span>
              <span className={`font-mono text-[11px] ${
                isEligible === null ? 'text-txt3' : isEligible ? 'text-green' : 'text-red'
              }`}>
                {isEligible === null ? '—' : isEligible ? '✓ Eligible' : '✗ Limits exceeded'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3.5 text-[13px]">
              <span className="text-txt2">Move valid</span>
              <span className={`font-mono text-[11px] ${canSubmit ? 'text-green' : 'text-txt3'}`}>
                {canSubmit ? '✓' : '—'}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2.5 justify-end">
            <Btn
              variant="primary"
              onClick={() => submitMove.mutate()}
              disabled={!canSubmit || submitMove.isPending}
              loading={submitMove.isPending}
            >
              Submit Move
            </Btn>
          </div>
        </div>
      </div>

      {/* Success Overlay */}
      {submitSuccess && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-[200] flex items-center justify-center" onClick={() => setSubmitSuccess(null)}>
          <div className="bg-surface border border-green rounded-md p-8 px-10 text-center max-w-[400px]">
            <div className="text-[36px] mb-3">&#10003;</div>
            <div className="font-condensed text-[20px] font-bold text-green mb-2">
              {submitSuccess.type === 'callup' ? 'Player Called Up' : 'Move Submitted'}
            </div>
            <div className="text-[13px] text-txt2 mb-5">
              {submitSuccess.type === 'callup'
                ? `${submitSuccess.player} activated to active roster`
                : `${submitSuccess.player} added to ${submitSuccess.type} list`
              }
            </div>
            <div className="flex gap-2.5 justify-center flex-wrap">
              {onNavigate && (
                <>
                  <Btn variant="primary" onClick={() => { setSubmitSuccess(null); onNavigate('my-roster') }}>
                    View My Roster
                  </Btn>
                  <Btn variant="secondary" onClick={() => { setSubmitSuccess(null); onNavigate('transactions') }}>
                    View Transactions
                  </Btn>
                </>
              )}
              <Btn variant="ghost" onClick={() => setSubmitSuccess(null)}>Done</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
