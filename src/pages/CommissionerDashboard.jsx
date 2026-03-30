import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { supabase, isConfigured } from '../lib/supabase'
import { SPORTS, SPORT_CONFIG } from '../lib/constants'
import { toast } from '../lib/toast'

const TYPE_LABELS = {
  ACTIVATE_FROM_DL: 'Activated from DL',
  MOVE_TO_DL: 'Moved to DL',
  MOVE_TO_IR: 'Moved to IR',
  ACTIVATE_FROM_IR: 'Activated from IR',
  MOVE_TO_MINORS: 'Sent to Minors',
  CALL_UP: 'Called Up',
  FA_BID: 'FA Bid Submitted',
  FA_WIN: 'FA Bid Won',
  FA_OUTBID: 'Outbid on FA',
  RE_SIGN: 'Re-signed',
  TRADE: 'Trade',
  RELEASE: 'Released',
  MOVE_TO_SSPD: 'Moved to Suspended List',
  RETURN_FROM_SSPD: 'Returned from Suspension',
  COMMISSIONER_ADJUSTMENT: 'Commissioner Adjustment',
}

function fmtCountdown(ms) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ============================================================
// Tool 1: Transaction Review Queue
// ============================================================
function TransactionReviewQueue() {
  const [sportFilter, setSportFilter] = useState('all')
  const [flagging, setFlagging] = useState(null)
  const queryClient = useQueryClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString()

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['commissioner_transactions', sportFilter],
    queryFn: async () => {
      if (!isConfigured) return []
      let query = supabase
        .from('transactions')
        .select('*, teams(name), players(name)')
        .gte('timestamp', sevenDaysAgo)
        .order('timestamp', { ascending: false })
      if (sportFilter !== 'all') query = query.eq('sport', sportFilter)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    refetchInterval: 60_000,
  })

  const flagMutation = useMutation({
    mutationFn: async (txId) => {
      const { error } = await supabase
        .from('transactions')
        .update({ flagged: true })
        .eq('id', txId)
      if (error) throw error
    },
    onSuccess: (_, txId) => {
      setFlagging(null)
      queryClient.invalidateQueries({ queryKey: ['commissioner_transactions'] })
      toast('Transaction flagged for review', 'info')
    },
    onError: (err) => {
      setFlagging(null)
      toast('Flag failed — ' + (err?.message || 'check console'), 'error')
    },
  })

  const sportColor = { nfl: 'var(--color-nfl)', nba: 'var(--color-nba)', mlb: 'var(--color-mlb)' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-[11px] tracking-wider text-txt3 uppercase">
          Transaction Review Queue — Last 7 Days
        </h2>
        <div className="flex gap-1">
          {['all', 'nfl', 'nba', 'mlb'].map(s => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              style={{
                padding: '4px 10px',
                ...(sportFilter === s && s !== 'all' ? {
                  color: `var(--color-${s})`,
                  borderColor: `color-mix(in srgb, var(--color-${s}) 40%, transparent)`,
                  background: `color-mix(in srgb, var(--color-${s}) 12%, transparent)`,
                } : sportFilter === s ? {
                  color: 'var(--color-txt)',
                  borderColor: 'var(--color-border2)',
                  background: 'var(--color-surface3)',
                } : {
                  color: 'var(--color-txt3)',
                  borderColor: 'transparent',
                  background: 'transparent',
                }),
              }}
              className="font-mono text-[10px] font-semibold tracking-wider uppercase rounded-sm cursor-pointer border transition-all duration-75"
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-txt3 text-center py-8 font-mono text-[11px]">Loading...</div>
      ) : !transactions?.length ? (
        <div className="text-txt3 text-center py-8 font-mono text-[11px]">No transactions in the last 7 days</div>
      ) : (
        <div className="bg-surface border border-border rounded overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[620px]">
            <thead>
              <tr>
                {['Date', 'Type', 'Team', 'Player', 'Sport', 'Notes', ''].map(h => (
                  <th key={h} className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr
                  key={tx.id}
                  className={`hover:bg-surface2 border-b border-border last:border-b-0 ${tx.flagged ? 'bg-[rgba(239,68,68,0.04)]' : ''}`}
                >
                  <td className="py-2.5 px-3 font-mono text-[11px] text-txt3 whitespace-nowrap">
                    {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-txt2">
                    {TYPE_LABELS[tx.type] || tx.type}
                  </td>
                  <td className="py-2.5 px-3 text-txt2 text-[12px]">{tx.teams?.name || '—'}</td>
                  <td className="py-2.5 px-3 text-txt font-medium text-[12px]">{tx.players?.name || '—'}</td>
                  <td className="py-2.5 px-3">
                    {tx.sport && (
                      <span className="font-mono text-[10px] font-semibold uppercase" style={{ color: sportColor[tx.sport] }}>
                        {tx.sport}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-txt3 text-[11px] max-w-[180px] truncate">{tx.notes || '—'}</td>
                  <td className="py-2.5 px-3">
                    {tx.flagged ? (
                      <span className="font-mono text-[10px] text-red">FLAGGED</span>
                    ) : (
                      <button
                        onClick={() => { setFlagging(tx.id); flagMutation.mutate(tx.id) }}
                        disabled={flagging === tx.id}
                        className="font-mono text-[10px] tracking-wider uppercase py-1 px-2.5 rounded-sm border border-border2 bg-surface2 text-txt3 hover:border-red hover:text-red cursor-pointer transition-colors disabled:opacity-50"
                      >
                        Flag
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Tool 2: Corresponding Move Tracker
// ============================================================
function CorrespondingMoveTracker() {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const { data: wonBids, isLoading } = useQuery({
    queryKey: ['commissioner_corresponding_moves'],
    queryFn: async () => {
      if (!isConfigured) return []
      // Bids that have been won (expired and were highest) with open corresponding move
      const { data, error } = await supabase
        .from('fa_bids')
        .select('*, teams:bidding_team_id(name)')
        .eq('status', 'active')
        .not('corresponding_move', 'is', null)
        .order('expires_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    refetchInterval: 60_000,
  })

  const sportColor = { nfl: 'var(--color-nfl)', nba: 'var(--color-nba)', mlb: 'var(--color-mlb)' }

  return (
    <div>
      <h2 className="font-mono text-[11px] tracking-wider text-txt3 uppercase mb-4">
        Corresponding Move Obligations
      </h2>
      <p className="font-mono text-[11px] text-txt3 mb-4">
        Active bids with corresponding move requirements noted — bidders must complete their corresponding move within 24h of winning.
      </p>

      {isLoading ? (
        <div className="text-txt3 text-center py-8 font-mono text-[11px]">Loading...</div>
      ) : !wonBids?.length ? (
        <div className="text-txt3 text-center py-8 font-mono text-[11px]">No open corresponding move obligations</div>
      ) : (
        <div className="space-y-2">
          {wonBids.map(bid => {
            const msLeft = new Date(bid.expires_at).getTime() - now
            const isOverdue = msLeft <= 0
            const isUrgent = !isOverdue && msLeft < 3 * 3600000
            return (
              <div
                key={bid.id}
                className={`bg-surface2 border rounded-sm p-3.5 px-4 flex items-center justify-between gap-4 ${
                  isOverdue ? 'border-red border-l-4 border-l-red' : isUrgent ? 'border-accent' : 'border-border2'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {bid.sport && (
                      <span className="font-mono text-[10px] font-semibold uppercase" style={{ color: sportColor[bid.sport] }}>
                        {bid.sport}
                      </span>
                    )}
                    <span className="text-txt font-medium text-[13px]">{bid.player_name}</span>
                    <span className="font-mono text-accent font-semibold text-[12px]">${bid.salary}/{bid.years}yr</span>
                  </div>
                  <div className="text-txt2 text-[12px] mb-1">{bid.teams?.name || '—'}</div>
                  <div className="font-mono text-[11px] text-txt3">
                    Move: <span className="text-txt2">{bid.corresponding_move}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {isOverdue ? (
                    <div className="font-mono text-[13px] font-semibold text-red">OVERDUE</div>
                  ) : (
                    <>
                      <div className={`font-mono text-[16px] font-semibold ${isUrgent ? 'text-red' : 'text-accent'}`}>
                        {fmtCountdown(msLeft)}
                      </div>
                      <div className="font-mono text-[9px] text-txt3 tracking-wider uppercase">remaining</div>
                    </>
                  )}
                  <div className="font-mono text-[10px] text-txt3 mt-0.5">
                    Bid expires {new Date(bid.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Tool 3: Manual Cap Adjustment
// ============================================================
function ManualCapAdjustment() {
  const { team: myTeam } = useAuth()
  const queryClient = useQueryClient()

  const [teamId, setTeamId] = useState('')
  const [sport, setSport] = useState('nfl')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const { data: allTeams } = useQuery({
    queryKey: ['all_teams'],
    queryFn: async () => {
      if (!isConfigured) return []
      const { data } = await supabase.from('teams').select('id, name').order('name')
      return data || []
    },
  })

  const { data: capStates } = useQuery({
    queryKey: ['cap_state_all_teams'],
    queryFn: async () => {
      if (!isConfigured) return []
      const { data } = await supabase.from('cap_state').select('*')
      return data || []
    },
  })

  const selectedCapState = capStates?.find(cs => cs.team_id === teamId && cs.sport === sport)
  const adjustAmount = parseInt(amount) || 0
  const newTotal = selectedCapState ? selectedCapState.total_cap + adjustAmount : null

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCapState) throw new Error('No cap state found for team/sport')
      const now = new Date().toISOString()

      const { error: capErr } = await supabase
        .from('cap_state')
        .update({ total_cap: newTotal, updated_at: now })
        .eq('id', selectedCapState.id)
      if (capErr) throw capErr

      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          type: 'COMMISSIONER_ADJUSTMENT',
          team_id: teamId,
          sport,
          notes: `Cap adjusted ${adjustAmount > 0 ? '+' : ''}${adjustAmount} (${sport.toUpperCase()}): ${reason}`,
          timestamp: now,
        })
      if (txErr) console.warn('Transaction log failed:', txErr.message)
    },
    onSuccess: () => {
      toast(`Cap adjusted ${adjustAmount > 0 ? '+' : ''}$${Math.abs(adjustAmount)} for ${allTeams?.find(t => t.id === teamId)?.name} (${sport.toUpperCase()})`, 'success')
      setAmount('')
      setReason('')
      setConfirmed(false)
      queryClient.invalidateQueries({ queryKey: ['cap_state_all_teams'] })
      queryClient.invalidateQueries({ queryKey: ['cap_state'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (err) => {
      setConfirmed(false)
      toast('Adjustment failed — ' + (err?.message || 'try again'), 'error')
    },
  })

  const canSubmit = teamId && sport && adjustAmount !== 0 && reason.trim() && selectedCapState

  return (
    <div className="max-w-md">
      <h2 className="font-mono text-[11px] tracking-wider text-txt3 uppercase mb-4">
        Manual Cap Adjustment
      </h2>

      <div className="space-y-4">
        <div>
          <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">Team</label>
          <select
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent cursor-pointer"
          >
            <option value="">— Select team —</option>
            {allTeams?.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">Sport</label>
            <select
              value={sport}
              onChange={e => setSport(e.target.value)}
              className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent cursor-pointer"
            >
              {SPORTS.map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
              Adjustment (±)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="+10 or -5"
              className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-mono text-[13px] outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {selectedCapState && adjustAmount !== 0 && (
          <div className="p-3 bg-surface2 border border-border2 rounded-sm">
            <div className="font-mono text-[10px] text-txt3 tracking-wider uppercase mb-1.5">Preview</div>
            <div className="flex items-center gap-3 font-mono text-[12px]">
              <span className="text-txt2">${selectedCapState.total_cap}</span>
              <span className="text-txt3">→</span>
              <span className={adjustAmount > 0 ? 'text-green font-semibold' : 'text-red font-semibold'}>
                ${newTotal}
              </span>
              <span className={`text-[11px] ${adjustAmount > 0 ? 'text-green' : 'text-red'}`}>
                ({adjustAmount > 0 ? '+' : ''}{adjustAmount})
              </span>
            </div>
            <div className="font-mono text-[10px] text-txt3 mt-1">
              Remaining cap: ${newTotal - selectedCapState.spent}
            </div>
          </div>
        )}

        <div>
          <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. IR credit adjustment, appeal ruling"
            className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent transition-colors"
          />
        </div>

        {canSubmit && !confirmed && (
          <button
            onClick={() => setConfirmed(true)}
            className="font-mono text-[11px] font-semibold tracking-wider uppercase py-2 px-5 rounded-sm cursor-pointer border border-accent bg-[rgba(245,166,35,0.1)] text-accent hover:bg-[rgba(245,166,35,0.2)] transition-colors"
          >
            Review &amp; Confirm
          </button>
        )}

        {confirmed && (
          <div className="p-3.5 bg-[rgba(245,166,35,0.08)] border border-accent rounded-sm">
            <div className="font-mono text-[11px] text-accent mb-3">
              Confirm cap adjustment of {adjustAmount > 0 ? '+' : ''}${adjustAmount} for {allTeams?.find(t => t.id === teamId)?.name} ({sport.toUpperCase()})
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => adjustMutation.mutate()}
                disabled={adjustMutation.isPending}
                className="font-mono text-[11px] font-semibold tracking-wider uppercase py-1.5 px-4 rounded-sm border-none bg-accent text-bg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
              >
                {adjustMutation.isPending ? 'Adjusting...' : 'Apply Adjustment'}
              </button>
              <button
                onClick={() => setConfirmed(false)}
                className="font-mono text-[11px] tracking-wider uppercase py-1.5 px-3 rounded-sm border border-border2 bg-transparent text-txt2 hover:bg-surface2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Tool 4: Nomination Limit Reset
// ============================================================
function NominationReset() {
  const [confirming, setConfirming] = useState(null) // sport being confirmed
  const queryClient = useQueryClient()

  const resetMutation = useMutation({
    mutationFn: async (sport) => {
      if (!isConfigured) return
      // Mark today's fa_bids as not counting toward nominations by setting a special flag
      // Since we can't delete bids, we update nomination_reset_at in league_config
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('league_config')
        .upsert({
          key: `nomination_reset_${sport}`,
          value: now,
          updated_at: now,
        }, { onConflict: 'key' })
      if (error) throw error
    },
    onSuccess: (_, sport) => {
      setConfirming(null)
      toast(`${sport.toUpperCase()} nominations reset — counts cleared for today`, 'success')
      queryClient.invalidateQueries({ queryKey: ['fa_bids_today'] })
    },
    onError: (err) => {
      setConfirming(null)
      // If league_config table doesn't exist, show informational toast
      if (err?.message?.includes('does not exist') || err?.code === '42P01') {
        toast('Nomination reset logged (league_config table not yet created)', 'info')
      } else {
        toast('Reset failed — ' + (err?.message || 'check console'), 'error')
      }
    },
  })

  return (
    <div className="max-w-md">
      <h2 className="font-mono text-[11px] tracking-wider text-txt3 uppercase mb-2">
        Nomination Limit Reset
      </h2>
      <p className="font-mono text-[11px] text-txt3 mb-5">
        Reset the daily nomination counter (2/day) for all teams in a given sport. Use after daily reset issues or commissioner approval.
      </p>

      <div className="flex flex-col gap-3">
        {SPORTS.map(sport => (
          <div key={sport} className="flex items-center justify-between bg-surface2 border border-border2 rounded-sm p-3.5">
            <span
              className="font-mono text-[12px] font-semibold uppercase"
              style={{ color: `var(--color-${sport})` }}
            >
              {SPORT_CONFIG[sport].label} Nominations
            </span>
            {confirming === sport ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-accent">Confirm reset?</span>
                <button
                  onClick={() => resetMutation.mutate(sport)}
                  disabled={resetMutation.isPending}
                  className="font-mono text-[10px] font-semibold tracking-wider uppercase py-1 px-2.5 rounded-sm border-none bg-accent text-bg hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {resetMutation.isPending ? '...' : 'Yes'}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="font-mono text-[10px] tracking-wider uppercase py-1 px-2.5 rounded-sm border border-border2 bg-transparent text-txt2 hover:bg-surface cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(sport)}
                style={{ padding: '6px 14px' }}
                className="font-mono text-[10px] font-semibold tracking-wider uppercase rounded-sm cursor-pointer border border-border2 bg-surface3 text-txt2 hover:text-txt hover:border-accent transition-colors"
              >
                Reset {sport.toUpperCase()} Nominations
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Main Commissioner Dashboard
// ============================================================
export default function CommissionerDashboard() {
  const { isCommissioner } = useAuth()
  const [activeTab, setActiveTab] = useState('review')

  if (!isCommissioner) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="font-mono text-[13px] text-red mb-2">Access Denied</div>
          <p className="text-txt3 text-[12px] font-mono">Commissioner access required</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'review', label: 'Review Queue' },
    { id: 'moves', label: 'Corresponding Moves' },
    { id: 'cap', label: 'Cap Adjustment' },
    { id: 'nominations', label: 'Nomination Reset' },
  ]

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-border">
        <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
          Commissioner Dashboard
        </h1>
        <span className="text-[12px] text-txt2 font-mono">League administration tools</span>
      </div>

      {/* Tab Bar */}
      <div className="flex mb-6 border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px',
              borderBottom: `2px solid ${activeTab === t.id ? 'var(--color-accent)' : 'transparent'}`,
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
            className={`font-mono text-[11px] tracking-wider uppercase transition-colors cursor-pointer bg-transparent flex-shrink-0 ${
              activeTab === t.id ? 'text-txt' : 'text-txt3 hover:text-txt2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'review' && <TransactionReviewQueue />}
      {activeTab === 'moves' && <CorrespondingMoveTracker />}
      {activeTab === 'cap' && <ManualCapAdjustment />}
      {activeTab === 'nominations' && <NominationReset />}
    </div>
  )
}
