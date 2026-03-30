import { useState, useMemo, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { useTeamRoster, useTeamCapState } from '../hooks/useTeamData'
import { SPORT_CONFIG } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { useGlobalSport } from '../lib/sportContext'
import { toast } from '../lib/toast'
import SportTabs from '../components/SportTabs'
import Select from '../components/Select'
import Btn from '../components/Btn'
import SearchableSelect from '../components/SearchableSelect'
import MinorsPage from './MinorsPage'
import PlaceholderPage from './PlaceholderPage'

// 5-day minimum in ms
const DL_MIN_MS = 5 * 24 * 60 * 60 * 1000

function msUntilEligible(placedAt) {
  if (!placedAt) return 0
  return Math.max(0, new Date(placedAt).getTime() + DL_MIN_MS - Date.now())
}

function formatTimeLeft(ms) {
  const days = Math.floor(ms / (24 * 3600 * 1000))
  const hours = Math.floor((ms % (24 * 3600 * 1000)) / 3600_000)
  if (days >= 1) return `${days}d ${hours}h`
  return `${hours}h`
}

const STATUS_LABELS = { dl: 'DL', ir: 'IR', sspd: 'SSPD', minors: 'MINORS' }
const STATUS_COLORS = {
  dl: 'bg-[rgba(245,166,35,0.15)] text-accent border-[rgba(245,166,35,0.3)]',
  ir: 'bg-[rgba(239,68,68,0.15)] text-red border-[rgba(239,68,68,0.3)]',
  sspd: 'bg-[rgba(59,130,246,0.15)] text-blue border-[rgba(59,130,246,0.3)]',
  minors: 'bg-[rgba(34,197,94,0.15)] text-green border-[rgba(34,197,94,0.3)]',
}

const DESTINATIONS = [
  { id: 'dl', label: 'DL — Disabled List', desc: 'Uncapped. 5-day minimum stay (Section 11A).' },
  { id: 'ir', label: 'IR — Injured Reserve', desc: 'Uncapped. Half salary credited back to cap.' },
  { id: 'sspd', label: 'SSPD — Suspended Reserve', desc: 'Uncapped. Requires official suspension.' },
  { id: 'minors', label: 'MINORS — Minor League', desc: 'Salary stays on cap. Counts toward minors slot.' },
]

// ============================================================
// Tab 1: Reserve (Place on Reserve)
// ============================================================
function ReserveTab({ sport, onSuccessSwitch }) {
  const { team } = useAuth()
  const { data: allContracts } = useTeamRoster(team?.id)
  const { data: capStates } = useTeamCapState(team?.id)
  const queryClient = useQueryClient()

  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [selectedDest, setSelectedDest] = useState('')
  const [note, setNote] = useState('')

  const activePlayers = useMemo(() =>
    (allContracts || []).filter(c => (!sport || c.sport === sport) && c.status === 'active')
      .sort((a, b) => (a.players?.name || '').localeCompare(b.players?.name || '')),
    [allContracts, sport]
  )

  const playerOptions = activePlayers.map(c => ({
    value: c.id,
    label: c.players?.name || '—',
    sublabel: `${sport ? '' : c.sport?.toUpperCase() + ' · '}${c.players?.position} — $${c.salary}`,
  }))

  const selectedContract = activePlayers.find(c => c.id === selectedPlayerId)
  // When showing all sports, derive effective sport from selected player
  const effectiveSport = selectedContract?.sport || sport
  const capState = capStates?.find(cs => cs.sport === effectiveSport)

  const destOptions = DESTINATIONS.map(d => ({ value: d.id, label: d.label }))

  const selectedDestInfo = DESTINATIONS.find(d => d.id === selectedDest)

  const irCredit = selectedContract && selectedDest === 'ir'
    ? Math.ceil(selectedContract.salary / 2)
    : null

  const canSubmit = !!selectedPlayerId && !!selectedDest

  const moveMutation = useMutation({
    mutationFn: async () => {
      const contract = selectedContract
      const destId = selectedDest
      const now = new Date().toISOString()

      const { error: updateErr } = await supabase
        .from('contracts')
        .update({ status: destId, placed_at: now, updated_at: now })
        .eq('id', contract.id)
      if (updateErr) throw updateErr

      // Apply IR salary credit: reduce spent by half salary
      if (destId === 'ir' && capState) {
        const credit = Math.ceil(contract.salary / 2)
        await supabase
          .from('cap_state')
          .update({ spent: capState.spent - credit, updated_at: now })
          .eq('team_id', team.id)
          .eq('sport', effectiveSport)
      }

      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          type: `move_to_${destId}`,
          team_id: team.id,
          player_id: contract.player_id,
          sport: effectiveSport,
          notes: note || `${contract.players?.name} moved to ${destId.toUpperCase()}`,
          submitted_by: null,
        })
      if (txErr) console.warn('Transaction log failed (non-blocking):', txErr.message)
    },
    onSuccess: () => {
      const playerName = selectedContract?.players?.name
      const dest = selectedDest.toUpperCase()
      toast(`${playerName} moved to ${dest}`, 'success')
      setSelectedPlayerId('')
      setSelectedDest('')
      setNote('')
      queryClient.invalidateQueries({ queryKey: ['roster'] })
      queryClient.invalidateQueries({ queryKey: ['cap_state'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      // Auto-switch to Activate tab
      onSuccessSwitch()
    },
    onError: (err) => {
      toast('Move failed — ' + (err?.message || 'try again'), 'error')
    },
  })

  return (
    <div className="max-w-xl">
      <div className="space-y-4">
        {/* Player Select */}
        <div>
          <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
            Player
          </label>
          <SearchableSelect
            value={activePlayers.find(c => c.id === selectedPlayerId)?.players?.name ?? ''}
            onChange={opt => setSelectedPlayerId(opt?.value ?? '')}
            options={playerOptions}
            placeholder="Search active roster..."
          />
        </div>

        {/* Destination Select */}
        <div>
          <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
            Destination
          </label>
          <Select
            value={selectedDest}
            onChange={setSelectedDest}
            options={destOptions}
            placeholder="— Select destination —"
          />
          {selectedDestInfo && (
            <p className="font-mono text-[11px] text-txt3 mt-1.5">{selectedDestInfo.desc}</p>
          )}
        </div>

        {/* IR Credit callout */}
        {irCredit !== null && (
          <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-sm px-3 py-2.5">
            <span className="font-mono text-[11px] text-red">
              IR cap credit: half salary (${irCredit}) credited back to your {sport.toUpperCase()} cap
            </span>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Hamstring injury, out 6 weeks"
            className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-2.5 pt-2">
          <Btn
            variant="secondary"
            onClick={() => { setSelectedPlayerId(''); setSelectedDest(''); setNote('') }}
          >
            Reset
          </Btn>
          <Btn
            variant="primary"
            onClick={() => moveMutation.mutate()}
            disabled={!canSubmit || moveMutation.isPending}
            loading={moveMutation.isPending}
          >
            Submit Move
          </Btn>
        </div>

        {activePlayers.length === 0 && (
          <div className="text-txt3 font-mono text-[11px] text-center py-6 bg-surface border border-border rounded">
            No active players for {sport.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Tab 2: Activate (from DlIrPage — exact copy)
// ============================================================
function ReservePlayerRow({ contract, onActivate, activating, isCommissioner }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (contract.status !== 'dl') return
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [contract.status])

  const status = contract.status
  const msLeft = (status === 'dl') ? msUntilEligible(contract.placed_at) : 0
  const locked = msLeft > 0

  const placedDate = contract.placed_at
    ? new Date(contract.placed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  const isSspd = status === 'sspd'
  const btnLabel = isSspd ? 'Mark Returned' : 'Activate'

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-surface2">
      <td className="py-2.5 px-3 text-[13px] text-txt font-medium">{contract.players?.name}</td>
      <td className="py-2.5 px-3 font-mono text-[10px] text-txt3">{contract.players?.position}</td>
      <td className="py-2.5 px-3">
        <span className={`font-mono text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-sm border ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </td>
      <td className="py-2.5 px-3 font-mono text-[11px] text-accent">${contract.salary}</td>
      <td className="py-2.5 px-3 font-mono text-[10px] text-txt3">
        {placedDate || <span className="text-txt3 italic">Unknown</span>}
      </td>
      <td className="py-2.5 px-3 text-right">
        {locked ? (
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[10px] text-txt2">
              Eligible in {formatTimeLeft(msLeft)}
            </span>
            <span className="font-mono text-[9px] text-txt3">5-day DL minimum (Sec. 11)</span>
            {isCommissioner && (
              <Btn variant="secondary" size="sm" onClick={() => onActivate(contract)} disabled={activating} loading={activating}>
                Override
              </Btn>
            )}
          </div>
        ) : (
          <Btn variant="primary" size="sm" onClick={() => onActivate(contract)} disabled={activating} loading={activating}>
            {btnLabel}
          </Btn>
        )}
      </td>
    </tr>
  )
}

function ActivateTab({ sport, highlightId }) {
  const { team, isCommissioner } = useAuth()
  const { data: allContracts } = useTeamRoster(team?.id)
  const queryClient = useQueryClient()
  const [activatingId, setActivatingId] = useState(null)

  const reservePlayers = useMemo(() =>
    (allContracts || []).filter(c => c.sport === sport && ['dl', 'ir', 'sspd'].includes(c.status))
      .sort((a, b) => (a.players?.name || '').localeCompare(b.players?.name || '')),
    [allContracts, sport]
  )

  const activateMutation = useMutation({
    mutationFn: async (contract) => {
      setActivatingId(contract.id)
      const now = new Date().toISOString()
      const fromStatus = contract.status

      const { error: updateErr } = await supabase
        .from('contracts')
        .update({ status: 'active', placed_at: null, updated_at: now })
        .eq('id', contract.id)
      if (updateErr) throw updateErr

      const txType = fromStatus === 'sspd' ? 'return_from_sspd' : `activate_from_${fromStatus}`
      const txNote = fromStatus === 'sspd'
        ? `${contract.players?.name} returned from SSPD — commissioner review may be required`
        : `${contract.players?.name} activated from ${fromStatus.toUpperCase()}`

      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          type: txType,
          team_id: team.id,
          player_id: contract.player_id,
          sport,
          notes: txNote,
        })
      if (txErr) console.warn('Transaction log failed (non-blocking):', txErr.message)

      return contract
    },
    onSuccess: (contract) => {
      setActivatingId(null)
      toast(`${contract.players?.name} activated to active roster`, 'success')
      queryClient.invalidateQueries({ queryKey: ['roster'] })
      queryClient.invalidateQueries({ queryKey: ['cap_state'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => {
      setActivatingId(null)
      toast('Activation failed — try again', 'error')
    },
  })

  return (
    <div>
      {reservePlayers.length === 0 ? (
        <div className="bg-surface border border-border rounded p-10 text-center">
          <div className="font-mono text-[11px] text-txt3">No players on DL, IR, or SSPD for {sport.toUpperCase()}</div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded overflow-x-auto">
          <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase px-4 py-3 border-b border-border flex items-center justify-between">
            <span>Players on Reserve — {sport.toUpperCase()}</span>
            <span className="text-[9px]">Section 11 activation rules enforced</span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3">Player</th>
                <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3">Pos</th>
                <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3">Status</th>
                <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3">Salary</th>
                <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3">Placed On</th>
                <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-right py-2 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {reservePlayers.map(c => (
                <ReservePlayerRow
                  key={c.id}
                  contract={c}
                  onActivate={(contract) => activateMutation.mutate(contract)}
                  activating={activatingId === c.id && activateMutation.isPending}
                  isCommissioner={isCommissioner}
                />
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border bg-surface2 grid grid-cols-3 gap-4 text-[11px] text-txt3">
            <div><span className="font-mono text-accent font-semibold">DL</span> — 5-day minimum stay before activation (Section 11A)</div>
            <div><span className="font-mono text-red font-semibold">IR</span> — Can activate at any time; typically season-ending</div>
            <div><span className="font-mono text-blue font-semibold">SSPD</span> — Activate when suspension ends; commissioner review applies</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Main MakeAMove page
// ============================================================
export default function MakeAMove({ onNavigate }) {
  const { globalSport, lastIndividualSport } = useGlobalSport()
  // null = show all sports in player list (sport derived from selected contract)
  const sportFilter = globalSport === 'all' ? null : globalSport
  // ActivateTab and SportTabs still need a specific sport context
  const sport = sportFilter || lastIndividualSport
  const [activeTab, setActiveTab] = useState('reserve')
  const [highlightId, setHighlightId] = useState(null)

  function handleReserveSuccess() {
    setHighlightId(null)
    setActiveTab('activate')
  }

  const tabs = [
    { id: 'reserve', label: 'Reserve' },
    { id: 'activate', label: 'Activate' },
    { id: 'minors', label: 'Minors' },
    { id: 'resign', label: 'Re-sign' },
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
            Make a Move
          </h1>
          <span className="text-[12px] text-txt2 font-mono">Reserve, activate, minors &amp; re-sign</span>
        </div>
      </div>

      <SportTabs />

      {/* Inner Tabs */}
      <div className="flex mb-6 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--color-accent)' : 'transparent'}`,
              marginBottom: '-1px',
            }}
            className={`font-mono text-[11px] tracking-wider uppercase transition-colors cursor-pointer bg-transparent flex-shrink-0 ${
              activeTab === tab.id
                ? 'text-txt'
                : 'text-txt3 hover:text-txt2'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'reserve' && (
        <ReserveTab sport={sportFilter} onSuccessSwitch={handleReserveSuccess} />
      )}
      {activeTab === 'activate' && (
        <ActivateTab sport={sport} highlightId={highlightId} />
      )}
      {activeTab === 'minors' && (
        <MinorsPage onNavigate={onNavigate} />
      )}
      {activeTab === 'resign' && (
        <PlaceholderPage title="Re-sign Calculator" description="Offseason contract extensions" />
      )}
    </div>
  )
}
