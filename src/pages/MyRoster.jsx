import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { useTeamRoster, useTeamCapState } from '../hooks/useTeamData'
import { SPORT_CONFIG } from '../lib/constants'
import { useActiveSport } from '../lib/sportContext'
import { supabase, isConfigured } from '../lib/supabase'
import { toast } from '../lib/toast'
import SportTabs from '../components/SportTabs'

const STATUS_BADGES = {
  active: { label: 'ACTIVE', className: 'bg-[rgba(148,163,184,0.1)] text-txt2 border border-border2' },
  dl: { label: 'DL', className: 'bg-[rgba(245,166,35,0.15)] text-accent border border-[rgba(245,166,35,0.3)]' },
  ir: { label: 'IR', className: 'bg-[rgba(239,68,68,0.15)] text-red border border-[rgba(239,68,68,0.3)]' },
  sspd: { label: 'SSPD', className: 'bg-[rgba(59,130,246,0.15)] text-blue border border-[rgba(59,130,246,0.3)]' },
  minors: { label: 'MINORS', className: 'bg-[rgba(34,197,94,0.15)] text-green border border-[rgba(34,197,94,0.3)]' },
  drafted: { label: 'DRAFTED', className: 'bg-[rgba(34,197,94,0.15)] text-green border border-[rgba(34,197,94,0.3)]' },
}

function StatusBadge({ status }) {
  const config = STATUS_BADGES[status] || STATUS_BADGES.active
  return (
    <span className={`font-mono text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-sm ${config.className}`}>
      {config.label}
    </span>
  )
}

function CapSummary({ capState, sport }) {
  if (!capState) return null
  const config = SPORT_CONFIG[sport]
  const remaining = capState.total_cap - capState.spent
  const pct = (capState.spent / capState.total_cap) * 100

  return (
    <div className="bg-surface border border-border rounded p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] tracking-wider text-txt3 uppercase">
          {config.label} Cap
        </span>
        <span
          className="font-mono text-sm font-semibold"
          style={{ color: `var(--color-${sport})` }}
        >
          ${remaining} remaining
        </span>
      </div>
      <div className="bg-surface3 rounded-sm h-1.5 overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: pct > 90 ? 'var(--color-red)' : pct > 75 ? 'var(--color-accent)' : `var(--color-${sport})`,
          }}
        />
      </div>
      <div className="flex justify-between mt-2 font-mono text-[10px] text-txt3">
        <span>Spent: ${capState.spent}</span>
        <span>Cap: ${capState.total_cap}</span>
      </div>
    </div>
  )
}

function ReleaseConfirm({ contract, capState, sport, onConfirm, onCancel, isPending }) {
  const halfSalary = Math.ceil(contract.salary / 2)
  const [option, setOption] = useState(null)

  return (
    <td colSpan={8} className="py-3 px-4 bg-[rgba(239,68,68,0.05)] border-l-2 border-l-red">
      <div className="text-[12px] text-txt2 mb-2 font-medium">Release {contract.players?.name}?</div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setOption('half')}
          className={`text-[11px] font-mono px-3 py-1.5 rounded-sm border cursor-pointer transition-colors ${
            option === 'half'
              ? 'border-accent bg-[rgba(245,166,35,0.15)] text-accent'
              : 'border-border2 bg-surface2 text-txt2 hover:border-border'
          }`}
        >
          ½ Salary Back — ${halfSalary} dead money, ${halfSalary} returned to cap
        </button>
        <button
          onClick={() => setOption('full')}
          className={`text-[11px] font-mono px-3 py-1.5 rounded-sm border cursor-pointer transition-colors ${
            option === 'full'
              ? 'border-red bg-[rgba(239,68,68,0.15)] text-red'
              : 'border-border2 bg-surface2 text-txt2 hover:border-border'
          }`}
        >
          Full Buyout — $0 dead money, full ${contract.salary} owed now
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => option && onConfirm(option)}
          disabled={!option || isPending}
          className="font-mono text-[11px] font-semibold tracking-wider uppercase py-1.5 px-4 rounded-sm border-none bg-red text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity"
        >
          {isPending ? 'Releasing...' : 'Confirm Release'}
        </button>
        <button
          onClick={onCancel}
          className="font-mono text-[11px] tracking-wider uppercase py-1.5 px-3 rounded-sm border border-border2 bg-transparent text-txt2 hover:bg-surface2 cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </div>
    </td>
  )
}

function RosterTable({ contracts, sport, team, capState, onCapUpdate }) {
  const [releasingId, setReleasingId] = useState(null)
  const queryClient = useQueryClient()

  const releaseMutation = useMutation({
    mutationFn: async ({ contract, option }) => {
      const now = new Date().toISOString()
      const halfSalary = Math.ceil(contract.salary / 2)

      const { error: updateErr } = await supabase
        .from('contracts')
        .update({ status: 'released', updated_at: now })
        .eq('id', contract.id)
      if (updateErr) throw updateErr

      // Apply cap impact
      if (capState) {
        const capCredit = option === 'half' ? halfSalary : 0
        const newSpent = capState.spent - capCredit
        await supabase
          .from('cap_state')
          .update({ spent: newSpent, updated_at: now })
          .eq('team_id', team.id)
          .eq('sport', sport)
      }

      await supabase.from('transactions').insert({
        type: 'release',
        team_id: team.id,
        player_id: contract.player_id,
        sport,
        notes: `${contract.players?.name} released (${option === 'half' ? 'half salary back' : 'full buyout'})`,
      })

      return { contract, option }
    },
    onSuccess: ({ contract, option }) => {
      setReleasingId(null)
      queryClient.invalidateQueries({ queryKey: ['roster'] })
      queryClient.invalidateQueries({ queryKey: ['cap_state'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      const halfSalary = Math.ceil(contract.salary / 2)
      const msg = option === 'half'
        ? `${contract.players?.name} released — $${halfSalary} returned to cap`
        : `${contract.players?.name} released — full buyout $${contract.salary}`
      toast(msg, 'success')
    },
    onError: () => {
      setReleasingId(null)
      toast('Release failed — try again', 'error')
    },
  })

  if (!contracts || contracts.length === 0) {
    return (
      <div className="text-txt3 text-center py-8 font-mono text-[11px]">
        No players on roster
      </div>
    )
  }

  const active = contracts.filter(c => c.status === 'active')
  const dl = contracts.filter(c => c.status === 'dl')
  const ir = contracts.filter(c => c.status === 'ir')
  const sspd = contracts.filter(c => c.status === 'sspd')
  const minors = contracts.filter(c => c.status === 'minors' || c.status === 'drafted')

  const renderSection = (label, players, showStatus = false, showRelease = false) => {
    if (players.length === 0) return null
    return (
      <>
        {label && (
          <tr>
            <td colSpan={8} className="pt-4 pb-2 px-3">
              <span className="font-mono text-[9px] tracking-wider text-txt3 uppercase">
                {label}
              </span>
            </td>
          </tr>
        )}
        {players.map(contract => (
          <>
            <tr key={contract.id} className="hover:bg-surface2 group">
              <td className="py-2.5 px-3 text-txt font-medium text-[13px]">
                {contract.players?.name || '—'}
              </td>
              <td className="py-2.5 px-3 text-txt2 font-mono text-[11px]">
                {contract.players?.position || '—'}
              </td>
              <td className="py-2.5 px-3">
                {showStatus && <StatusBadge status={contract.status} />}
              </td>
              <td className="py-2.5 px-3 font-mono text-accent font-semibold text-[12px]">
                ${contract.salary}
              </td>
              <td className="py-2.5 px-3 font-mono text-[11px] text-txt3">
                {contract.year2 ? `$${contract.year2}` : '—'}
              </td>
              <td className="py-2.5 px-3 font-mono text-[11px] text-txt3">
                {contract.year3 ? `$${contract.year3}` : '—'}
              </td>
              <td className="py-2.5 px-3 font-mono text-[11px] text-txt3">
                {contract.year4 ? `$${contract.year4}` : '—'}
              </td>
              <td className="py-2.5 px-3 text-right">
                {showRelease && releasingId !== contract.id && (
                  <button
                    onClick={() => setReleasingId(contract.id)}
                    className="font-mono text-[10px] font-semibold tracking-wider uppercase py-1 px-2.5 rounded-sm border border-red bg-transparent text-red hover:bg-[rgba(239,68,68,0.08)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    Release
                  </button>
                )}
              </td>
            </tr>
            {releasingId === contract.id && (
              <tr key={`release-${contract.id}`} className="bg-surface2">
                <ReleaseConfirm
                  contract={contract}
                  capState={capState}
                  sport={sport}
                  isPending={releaseMutation.isPending}
                  onConfirm={(option) => releaseMutation.mutate({ contract, option })}
                  onCancel={() => setReleasingId(null)}
                />
              </tr>
            )}
          </>
        ))}
      </>
    )
  }

  return (
    <div className="bg-surface border border-border rounded overflow-hidden">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">Player</th>
            <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">Pos</th>
            <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">Status</th>
            <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">2025</th>
            <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">2026</th>
            <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">2027</th>
            <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">2028</th>
            <th className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-right py-2 px-3 border-b border-border"></th>
          </tr>
        </thead>
        <tbody>
          {renderSection(null, active, false, true)}
          {renderSection('Disabled List', dl, true)}
          {renderSection('Injured Reserve', ir, true)}
          {renderSection('Suspended', sspd, true)}
          {renderSection(sport === 'mlb' ? 'Minors / Drafted' : 'Minors', minors, true)}
        </tbody>
      </table>
    </div>
  )
}

export default function MyRoster() {
  const activeSport = useActiveSport()
  const { team } = useAuth()
  const { data: allContracts, isLoading } = useTeamRoster(team?.id)
  const { data: capStates } = useTeamCapState(team?.id)

  const sportContracts = allContracts?.filter(c => c.sport === activeSport) || []
  const sportCapState = capStates?.find(cs => cs.sport === activeSport)

  return (
    <div>
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
            {team?.name || 'My Roster'}
          </h1>
          <span className="text-[12px] text-txt2 font-mono">
            Roster &amp; Cap Management
          </span>
        </div>
      </div>

      <SportTabs />

      <CapSummary capState={sportCapState} sport={activeSport} />

      {isLoading ? (
        <div className="text-txt3 text-center py-12 font-mono text-[11px]">Loading roster...</div>
      ) : (
        <RosterTable
          contracts={sportContracts}
          sport={activeSport}
          team={team}
          capState={sportCapState}
        />
      )}
    </div>
  )
}
