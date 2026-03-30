import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { supabase, isConfigured } from '../lib/supabase'
import { SPORT_CONFIG } from '../lib/constants'
import { useTeamRoster, useTeamCapState } from '../hooks/useTeamData'
import { SkeletonCard, SkeletonTable } from '../components/Skeleton'

const DL_MIN_MS = 5 * 24 * 60 * 60 * 1000

function msUntilEligible(placedAt) {
  if (!placedAt) return 0
  return Math.max(0, new Date(placedAt).getTime() + DL_MIN_MS - Date.now())
}

function SportBadge({ sport }) {
  return (
    <span
      className="font-mono text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-sm"
      style={{
        color: `var(--color-${sport})`,
        background: `color-mix(in srgb, var(--color-${sport}) 15%, transparent)`,
      }}
    >
      {sport?.toUpperCase()}
    </span>
  )
}

function ActionItem({ borderColor, title, subtitle, sportBadge, action, actionLabel, onAction, loading }) {
  const borderMap = {
    red: 'border-l-red',
    amber: 'border-l-accent',
    green: 'border-l-green',
  }
  return (
    <div className={`bg-surface2 border border-border2 border-l-4 ${borderMap[borderColor] || 'border-l-accent'} rounded-sm p-3.5 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {sportBadge && <SportBadge sport={sportBadge} />}
        <div className="min-w-0">
          <div className="text-[13px] text-txt font-medium truncate">{title}</div>
          {subtitle && <div className="text-[11px] text-txt3 font-mono mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          disabled={loading}
          className="font-mono text-[10px] font-semibold tracking-wider uppercase py-1.5 px-3 rounded-sm border border-border2 bg-surface3 text-txt2 hover:bg-surface hover:text-txt hover:border-accent transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
        >
          {loading ? '...' : actionLabel}
        </button>
      )}
    </div>
  )
}

function MiniCapBar({ sport, capState }) {
  if (!capState) return null
  const remaining = capState.total_cap - capState.spent
  const pct = (capState.spent / capState.total_cap) * 100
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] font-semibold uppercase" style={{ color: `var(--color-${sport})` }}>
          {sport.toUpperCase()}
        </span>
        <span className="font-mono text-[11px] text-txt2">${remaining} left</span>
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
      <div className="font-mono text-[9px] text-txt3 mt-1">${capState.spent} / ${capState.total_cap}</div>
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtCountdown(ms) {
  if (ms <= 0) return 'EXPIRED'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function HomePage({ onNavigate }) {
  const { team } = useAuth()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  // My roster for action items
  const { data: allContracts, isLoading: rosterLoading } = useTeamRoster(team?.id)
  const { data: capStates, isLoading: capLoading } = useTeamCapState(team?.id)

  // Recent transactions
  const { data: recentTx, isLoading: txLoading } = useQuery({
    queryKey: ['transactions_recent'],
    queryFn: async () => {
      if (!isConfigured) return []
      const { data } = await supabase
        .from('transactions')
        .select('*, teams(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
    refetchInterval: 60_000,
  })

  // FA bids — expiring within 24h (league-wide)
  const { data: expiringBids, isLoading: bidsLoading } = useQuery({
    queryKey: ['fa_bids_expiring'],
    queryFn: async () => {
      if (!isConfigured) return []
      const in24h = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      const { data } = await supabase
        .from('fa_bids')
        .select('*, teams:bidding_team_id(name)')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .lte('expires_at', in24h)
        .order('expires_at', { ascending: true })
      return data || []
    },
    refetchInterval: 60_000,
  })

  // My active FA bids
  const { data: myBids } = useQuery({
    queryKey: ['fa_bids_mine', team?.id],
    queryFn: async () => {
      if (!isConfigured || !team?.id) return []
      const { data } = await supabase
        .from('fa_bids')
        .select('*')
        .eq('bidding_team_id', team.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
      return data || []
    },
    enabled: !!team?.id,
    refetchInterval: 60_000,
  })

  // All active bids (to check if outbid)
  const { data: allActiveBids } = useQuery({
    queryKey: ['fa_bids_all_active'],
    queryFn: async () => {
      if (!isConfigured) return []
      const { data } = await supabase
        .from('fa_bids')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
      return data || []
    },
    refetchInterval: 60_000,
  })

  // Compute action items
  const actionItems = useMemo(() => {
    const items = []
    if (!allContracts) return items

    // DL players eligible to activate (5-day minimum passed)
    const dlEligible = allContracts.filter(c =>
      c.status === 'dl' && msUntilEligible(c.placed_at) <= 0
    )
    for (const c of dlEligible) {
      items.push({
        id: `dl-${c.id}`,
        borderColor: 'amber',
        title: `${c.players?.name} — eligible to activate`,
        subtitle: `${c.sport?.toUpperCase()} · DL · $${c.salary}`,
        sportBadge: c.sport,
        actionLabel: 'Activate',
        action: () => onNavigate('make-a-move'),
      })
    }

    // SSPD players where returned_at is set (or suspension has ended) but still sspd
    const sspdReturned = allContracts.filter(c =>
      c.status === 'sspd' && c.returned_at
    )
    for (const c of sspdReturned) {
      items.push({
        id: `sspd-${c.id}`,
        borderColor: 'red',
        title: `${c.players?.name} — suspension ended, needs activation`,
        subtitle: `${c.sport?.toUpperCase()} · SSPD · Returned ${fmtDate(c.returned_at)}`,
        sportBadge: c.sport,
        actionLabel: 'Activate',
        action: () => onNavigate('make-a-move'),
      })
    }

    // FA bids I'm winning that expire within 6 hours
    if (myBids && allActiveBids) {
      for (const bid of myBids) {
        const msLeft = new Date(bid.expires_at).getTime() - now
        if (msLeft > 0 && msLeft <= 6 * 3600000) {
          items.push({
            id: `bid-expiring-${bid.id}`,
            borderColor: 'amber',
            title: `${bid.player_name} — bid expiring soon`,
            subtitle: `${bid.sport?.toUpperCase()} · $${bid.salary} · ${fmtCountdown(msLeft)} remaining`,
            sportBadge: bid.sport,
            actionLabel: 'View',
            action: () => onNavigate('fa-tracker'),
          })
        }
      }

      // FA bids where I was outbid (another team has higher bid on same player)
      for (const myBid of myBids) {
        const higherBids = allActiveBids.filter(b =>
          b.player_name === myBid.player_name &&
          b.sport === myBid.sport &&
          b.bidding_team_id !== team?.id &&
          b.salary > myBid.salary
        )
        if (higherBids.length > 0) {
          items.push({
            id: `outbid-${myBid.id}`,
            borderColor: 'red',
            title: `${myBid.player_name} — you've been outbid`,
            subtitle: `${myBid.sport?.toUpperCase()} · Current high: $${Math.max(...higherBids.map(b => b.salary))}`,
            sportBadge: myBid.sport,
            actionLabel: 'Outbid',
            action: () => onNavigate('fa-tracker'),
          })
        }
      }
    }

    return items
  }, [allContracts, myBids, allActiveBids, now, onNavigate, team?.id])

  const isLoading = rosterLoading || capLoading

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-border">
        <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
          Home
        </h1>
        <span className="text-[12px] text-txt2 font-mono">
          {team?.name || 'League'} · Daily Overview
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left column */}
        <div className="space-y-6">

          {/* Action Required */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-mono text-[11px] tracking-wider uppercase text-txt3">
                Action Required
              </h2>
              {actionItems.length > 0 && (
                <span className="bg-red text-white font-mono text-[10px] font-semibold px-2 py-0.5 rounded-sm">
                  {actionItems.length}
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : actionItems.length === 0 ? (
              <div className="bg-surface border border-border rounded-sm p-4 flex items-center gap-3">
                <span className="text-green text-[20px]">&#10003;</span>
                <span className="font-mono text-[12px] text-txt2">All clear — no action needed</span>
              </div>
            ) : (
              <div className="space-y-2">
                {actionItems.map(item => (
                  <ActionItem
                    key={item.id}
                    borderColor={item.borderColor}
                    title={item.title}
                    subtitle={item.subtitle}
                    sportBadge={item.sportBadge}
                    actionLabel={item.actionLabel}
                    onAction={item.action}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Recent Transactions */}
          <section>
            <h2 className="font-mono text-[11px] tracking-wider uppercase text-txt3 mb-3">
              Recent Transactions
            </h2>
            {txLoading ? (
              <SkeletonTable rows={4} />
            ) : !recentTx?.length ? (
              <div className="text-txt3 font-mono text-[11px] text-center py-6 bg-surface border border-border rounded">No recent transactions</div>
            ) : (
              <div className="bg-surface border border-border rounded overflow-hidden">
                {recentTx.map((tx, i) => (
                  <div key={tx.id || i} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0 hover:bg-surface2">
                    <div className="flex items-center gap-2.5">
                      <SportBadge sport={tx.sport} />
                      <div>
                        <div className="text-[12px] text-txt">{tx.notes || tx.type}</div>
                        <div className="text-[10px] text-txt3 font-mono">{tx.teams?.name}</div>
                      </div>
                    </div>
                    <div className="font-mono text-[10px] text-txt3 flex-shrink-0">
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Expiring Bids */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-mono text-[11px] tracking-wider uppercase text-txt3">
                Bids Expiring (24h)
              </h2>
              {expiringBids?.length > 0 && (
                <button
                  onClick={() => onNavigate('fa-tracker')}
                  className="font-mono text-[10px] text-accent hover:text-txt2 transition-colors cursor-pointer"
                >
                  View All
                </button>
              )}
            </div>
            {bidsLoading ? (
              <SkeletonTable rows={3} />
            ) : !expiringBids?.length ? (
              <div className="text-txt3 font-mono text-[11px] text-center py-4 bg-surface border border-border rounded">No bids expiring in 24 hours</div>
            ) : (
              <div className="bg-surface border border-border rounded overflow-hidden">
                {expiringBids.map(bid => {
                  const ms = new Date(bid.expires_at).getTime() - now
                  const urgent = ms < 2 * 3600000
                  const warning = ms < 8 * 3600000
                  return (
                    <button
                      key={bid.id}
                      onClick={() => onNavigate('fa-tracker')}
                      className="w-full flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0 hover:bg-surface2 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <SportBadge sport={bid.sport} />
                        <div>
                          <div className="text-[12px] text-txt">{bid.player_name}</div>
                          <div className="text-[10px] text-txt3">{bid.teams?.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[12px] text-accent font-semibold">${bid.salary}</div>
                        <div className={`font-mono text-[10px] ${urgent ? 'text-red' : warning ? 'text-accent' : 'text-green'}`}>
                          {fmtCountdown(ms)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Cap Summary */}
          <section>
            <h2 className="font-mono text-[11px] tracking-wider uppercase text-txt3 mb-3">
              My Cap Space
            </h2>
            {capLoading ? (
              <SkeletonCard />
            ) : (
              <div className="bg-surface border border-border rounded p-4 flex flex-col gap-4">
                {['nfl', 'nba', 'mlb'].map(sport => {
                  const cs = capStates?.find(c => c.sport === sport)
                  return <MiniCapBar key={sport} sport={sport} capState={cs} />
                })}
                {!capStates?.length && (
                  <div className="text-txt3 font-mono text-[11px] text-center">No cap data available</div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
