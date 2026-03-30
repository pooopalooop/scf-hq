import { useState, useMemo, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { useTeamRoster, useTeamCapState } from '../hooks/useTeamData'
import { SPORT_CONFIG } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { useGlobalSport } from '../lib/sportContext'
import SportTabs from '../components/SportTabs'
import Btn from '../components/Btn'

const DESTINATIONS = [
  { id: 'dl', label: 'DL', sub: 'Disabled List', desc: 'Uncapped', uncapped: true },
  { id: 'ir', label: 'IR', sub: 'Injured Reserve', desc: 'Uncapped', uncapped: true },
  { id: 'sspd', label: 'SSPD', sub: 'Suspended Reserve', desc: 'Uncapped', uncapped: true },
  { id: 'minors', label: 'MINORS', sub: 'Minor League', desc: 'Capped' },
]

const STATUS_LABELS = { dl: 'DL', ir: 'IR', sspd: 'SSPD', minors: 'MINORS' }
const STATUS_COLORS = {
  dl: 'bg-[rgba(245,166,35,0.15)] text-accent border-[rgba(245,166,35,0.3)]',
  ir: 'bg-[rgba(239,68,68,0.15)] text-red border-[rgba(239,68,68,0.3)]',
  sspd: 'bg-[rgba(168,85,247,0.15)] text-[#a855f7] border-[rgba(168,85,247,0.3)]',
  minors: 'bg-[rgba(34,197,94,0.15)] text-green border-[rgba(34,197,94,0.3)]',
}

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

function PlayerCard({ contract, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left bg-surface2 border rounded-sm p-2.5 px-3 cursor-pointer transition-all duration-75
        flex items-center justify-between
        ${selected
          ? 'border-accent bg-[rgba(245,166,35,0.08)]'
          : 'border-border2 hover:border-accent hover:bg-surface3'
        }
      `}
    >
      <span className="text-[13px] font-medium text-txt">{contract.players?.name}</span>
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-mono text-[10px] text-txt3">{contract.players?.position}</span>
        <span className="font-mono text-[11px] text-accent font-semibold">${contract.salary}</span>
      </div>
    </button>
  )
}

function DestCard({ dest, slotInfo, selected, onClick }) {
  const slotsText = dest.uncapped
    ? 'UNCAPPED'
    : `${slotInfo.used}/${slotInfo.max}`
  const slotsColor = dest.uncapped
    ? 'text-green'
    : slotInfo.used >= slotInfo.max ? 'text-red' : slotInfo.used >= slotInfo.max - 1 ? 'text-accent' : 'text-green'

  return (
    <button
      onClick={onClick}
      className={`
        bg-surface2 border rounded-sm p-3.5 px-3 cursor-pointer transition-all duration-75 text-center
        ${selected
          ? 'border-accent bg-[rgba(245,166,35,0.08)]'
          : 'border-border2 hover:border-border2 hover:bg-surface3'
        }
      `}
    >
      <div className="font-mono text-[13px] font-semibold text-txt mb-1">{dest.label}</div>
      <div className="text-[11px] text-txt3 leading-tight">{dest.sub}</div>
      <div className={`font-mono text-[10px] mt-1.5 ${slotsColor}`}>{slotsText}</div>
    </button>
  )
}

function ValidationRow({ label, status, detail }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3.5 border-b border-border last:border-b-0 text-[13px]">
      <span className="text-txt2">{label}</span>
      {status === 'pass' && (
        <span className="font-mono text-[11px] text-green flex items-center gap-1">&#10003; {detail || 'Pass'}</span>
      )}
      {status === 'fail' && (
        <span className="font-mono text-[11px] text-red flex items-center gap-1">&#10007; {detail || 'Fail'}</span>
      )}
      {status === 'pending' && (
        <span className="font-mono text-[11px] text-txt3">&mdash;</span>
      )}
    </div>
  )
}

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
              <button
                onClick={() => onActivate(contract)}
                disabled={activating}
                className="font-mono text-[10px] font-semibold tracking-wider uppercase py-1 px-2 rounded-sm cursor-pointer border border-accent bg-transparent text-accent hover:bg-[rgba(245,166,35,0.1)] transition-colors disabled:opacity-50"
              >
                {activating ? '...' : 'Override'}
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onActivate(contract)}
            disabled={activating}
            className="font-mono text-[11px] font-semibold tracking-wider uppercase py-1.5 px-3 rounded-sm border-none bg-green text-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {activating ? '...' : btnLabel}
          </button>
        )}
      </td>
    </tr>
  )
}

export default function DlIrPage({ onNavigate }) {
  const { globalSport: sport } = useGlobalSport()
  const [activeTab, setActiveTab] = useState('place')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedDest, setSelectedDest] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [activatingId, setActivatingId] = useState(null)

  const { team, isCommissioner } = useAuth()
  const { data: allContracts } = useTeamRoster(team?.id)
  const { data: capStates } = useTeamCapState(team?.id)
  const queryClient = useQueryClient()

  const config = SPORT_CONFIG[sport]
  const capState = capStates?.find(cs => cs.sport === sport)

  const activePlayers = useMemo(() =>
    (allContracts || []).filter(c => c.sport === sport && c.status === 'active'),
    [allContracts, sport]
  )

  const reservePlayers = useMemo(() =>
    (allContracts || []).filter(c => c.sport === sport && ['dl', 'ir', 'sspd'].includes(c.status)),
    [allContracts, sport]
  )

  const slotCounts = useMemo(() => {
    const contracts = allContracts?.filter(c => c.sport === sport) || []
    return {
      dl: { used: contracts.filter(c => c.status === 'dl').length, max: Infinity },
      ir: { used: contracts.filter(c => c.status === 'ir').length, max: Infinity },
      sspd: { used: contracts.filter(c => c.status === 'sspd').length, max: Infinity },
      minors: {
        used: contracts.filter(c => c.status === 'minors').length,
        max: config.minorsSlots,
      },
    }
  }, [allContracts, sport, config])

  const validation = useMemo(() => {
    if (!selectedPlayer || !selectedDest) {
      return { slotAvail: 'pending', eligible: 'pending', rosterImpact: 'pending', capImpact: 'pending', canSubmit: false }
    }
    const dest = DESTINATIONS.find(d => d.id === selectedDest)
    const slots = slotCounts[selectedDest]
    const slotAvail = dest.uncapped ? 'pass' : (slots.used < slots.max ? 'pass' : 'fail')

    return {
      slotAvail,
      slotAvailDetail: dest.uncapped ? 'Uncapped' : `${slots.used}/${slots.max} used`,
      eligible: 'pass',
      rosterImpact: 'pass',
      rosterImpactDetail: 'Opens 1 active slot',
      capImpact: 'pass',
      capImpactDetail: 'Salary stays on cap',
      canSubmit: slotAvail !== 'fail',
    }
  }, [selectedPlayer, selectedDest, slotCounts])

  const moveMutation = useMutation({
    mutationFn: async () => {
      const contract = selectedPlayer
      const destId = selectedDest
      const now = new Date().toISOString()

      const { error: updateErr } = await supabase
        .from('contracts')
        .update({ status: destId, placed_at: now, updated_at: now })
        .eq('id', contract.id)

      if (updateErr) throw updateErr

      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          type: `move_to_${destId}`,
          team_id: team.id,
          player_id: contract.player_id,
          sport,
          notes: `${contract.players?.name} moved to ${destId.toUpperCase()}`,
          submitted_by: null,
        })

      if (txErr) throw txErr
    },
    onSuccess: () => {
      setSubmitSuccess({
        player: selectedPlayer.players?.name,
        dest: selectedDest.toUpperCase(),
        type: 'place',
      })
      setSelectedPlayer(null)
      setSelectedDest(null)
      queryClient.invalidateQueries({ queryKey: ['roster'] })
      queryClient.invalidateQueries({ queryKey: ['cap_state'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

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

      if (txErr) throw txErr
    },
    onSuccess: (_, contract) => {
      setActivatingId(null)
      setSubmitSuccess({
        player: contract.players?.name,
        dest: 'ACTIVE',
        type: 'activate',
        fromStatus: contract.status,
      })
      queryClient.invalidateQueries({ queryKey: ['roster'] })
      queryClient.invalidateQueries({ queryKey: ['cap_state'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => setActivatingId(null),
  })

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
            DL / IR / Reserve
          </h1>
          <span className="text-[12px] text-txt2 font-mono">Roster designation moves</span>
        </div>
      </div>

      <SportTabs />

      {/* Inner Tabs */}
      <div className="flex gap-0 mb-6 border-b border-border">
        {[
          { id: 'place', label: 'Place on Reserve' },
          { id: 'activate', label: `Activate / Return${reservePlayers.length > 0 ? ` (${reservePlayers.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-mono text-[11px] tracking-wider uppercase px-4 py-2.5 border-b-2 transition-colors cursor-pointer bg-transparent ${
              activeTab === tab.id
                ? 'border-accent text-txt'
                : 'border-transparent text-txt3 hover:text-txt2'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === Place on Reserve Tab === */}
      {activeTab === 'place' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Player Select */}
          <div className="bg-surface border border-border rounded p-5">
            <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-4 pb-2.5 border-b border-border">
              Select Player
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-[400px] overflow-y-auto">
              {activePlayers.map(c => (
                <PlayerCard
                  key={c.id}
                  contract={c}
                  selected={selectedPlayer?.id === c.id}
                  onClick={() => setSelectedPlayer(c)}
                />
              ))}
              {activePlayers.length === 0 && (
                <div className="col-span-2 text-txt3 text-center py-6 font-mono text-[11px]">
                  No active players
                </div>
              )}
            </div>
          </div>

          {/* Right: Destination + Validation */}
          <div>
            {/* Destination Cards */}
            <div className="bg-surface border border-border rounded p-5 mb-4">
              <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-4 pb-2.5 border-b border-border">
                Destination
              </div>
              <div className="grid grid-cols-4 gap-2">
                {DESTINATIONS.map(dest => (
                  <DestCard
                    key={dest.id}
                    dest={dest}
                    slotInfo={slotCounts[dest.id]}
                    selected={selectedDest === dest.id}
                    onClick={() => setSelectedDest(dest.id)}
                  />
                ))}
              </div>
            </div>

            {/* Info Box */}
            {selectedDest && (
              <div className="bg-surface2 border border-[rgba(245,166,35,0.3)] rounded-sm p-3 mb-4 text-[12px] text-txt2">
                {selectedDest === 'dl' && 'DL is uncapped. Player must remain on DL for 5 full days before activation (Section 11).'}
                {selectedDest === 'ir' && 'IR is uncapped per league rules. Player salary remains on your cap.'}
                {selectedDest === 'sspd' && 'Suspended reserve — uncapped. Requires official league/real-world suspension.'}
                {selectedDest === 'minors' && `Minors slots: ${slotCounts.minors.used}/${slotCounts.minors.max} used. Player salary remains on cap.`}
              </div>
            )}

            {/* Validation Panel */}
            <div className="bg-surface2 border border-border2 rounded-sm overflow-hidden mb-4">
              <div className="font-mono text-[10px] tracking-wider uppercase px-3.5 py-2.5 border-b border-border flex items-center gap-2 text-txt3">
                Validation
              </div>
              <ValidationRow label="Slot available" status={validation.slotAvail} detail={validation.slotAvailDetail} />
              <ValidationRow label="Eligibility" status={validation.eligible} />
              <ValidationRow label="Roster impact" status={validation.rosterImpact} detail={validation.rosterImpactDetail} />
              <ValidationRow label="Cap impact" status={validation.capImpact} detail={validation.capImpactDetail} />
            </div>

            {/* Submit */}
            <div className="flex gap-2.5 justify-end pt-4 border-t border-border">
              <Btn
                variant="secondary"
                onClick={() => { setSelectedPlayer(null); setSelectedDest(null) }}
              >
                Reset
              </Btn>
              <Btn
                variant="primary"
                onClick={() => moveMutation.mutate()}
                disabled={!validation.canSubmit || !selectedPlayer || !selectedDest || moveMutation.isPending}
                loading={moveMutation.isPending}
              >
                Submit Move
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* === Activate / Return Tab === */}
      {activeTab === 'activate' && (
        <div>
          {reservePlayers.length === 0 ? (
            <div className="bg-surface border border-border rounded p-10 text-center">
              <div className="font-mono text-[11px] text-txt3">No players on DL, IR, or SSPD for {sport.toUpperCase()}</div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded overflow-hidden">
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

              {/* Rule summaries */}
              <div className="px-4 py-3 border-t border-border bg-surface2 grid grid-cols-3 gap-4 text-[11px] text-txt3">
                <div><span className="font-mono text-accent font-semibold">DL</span> — 5-day minimum stay before activation (Section 11A)</div>
                <div><span className="font-mono text-red font-semibold">IR</span> — Can activate at any time; typically season-ending</div>
                <div><span className="font-mono text-[#a855f7] font-semibold">SSPD</span> — Activate when suspension ends; commissioner review applies</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Overlay */}
      {submitSuccess && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-[200] flex items-center justify-center"
          onClick={() => setSubmitSuccess(null)}
        >
          <div className="bg-surface border border-green rounded-md p-8 px-10 text-center max-w-[400px] animate-[popIn_0.2s_ease]">
            <div className="text-[36px] mb-3">&#10003;</div>
            <div className="font-condensed text-[20px] font-bold text-green mb-2">
              {submitSuccess.type === 'activate' ? 'Player Activated' : 'Move Submitted'}
            </div>
            <div className="text-[13px] text-txt2 mb-5">
              {submitSuccess.type === 'activate'
                ? `${submitSuccess.player} returned to active roster`
                : `${submitSuccess.player} moved to ${submitSuccess.dest}`
              }
            </div>
            {submitSuccess.fromStatus === 'sspd' && (
              <div className="text-[11px] text-accent font-mono mb-4">
                SSPD return — notify commissioner to confirm
              </div>
            )}
            <div className="flex gap-2.5 justify-center flex-wrap">
              {onNavigate && (
                <>
                  <Btn variant="primary" onClick={() => { setSubmitSuccess(null); onNavigate('my-roster') }}>
                    Back to Roster
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
