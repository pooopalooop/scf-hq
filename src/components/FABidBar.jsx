import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isConfigured } from '../lib/supabase'

export default function FABidBar({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const { data: bids = [] } = useQuery({
    queryKey: ['fa_bids_active'],
    queryFn: async () => {
      if (!isConfigured) return []
      const { data } = await supabase
        .from('fa_bids')
        .select('*, players(name, position), teams:bidding_team_id(name)')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true })
      return data || []
    },
    refetchInterval: 30_000,
  })

  if (bids.length === 0) return null

  const nearest = bids[0]
  const msLeft = nearest ? new Date(nearest.expires_at).getTime() - now : 0

  const fmtMs = (ms) => {
    if (ms <= 0) return 'EXPIRED'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const bidColor = (ms) => {
    if (ms <= 0) return 'text-red'
    if (ms < 2 * 3600000) return 'text-red'
    if (ms < 8 * 3600000) return 'text-accent'
    return 'text-green'
  }

  return (
    <>
      {/* Drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.5)] z-[90]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed bottom-[48px] left-0 right-0 z-[95] bg-surface border-t border-border shadow-2xl max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-mono text-[11px] tracking-wider text-txt3 uppercase">Active FA Bids</span>
            <button onClick={() => setOpen(false)} className="text-txt3 hover:text-txt cursor-pointer text-[18px] leading-none">&times;</button>
          </div>
          {bids.map(bid => {
            const ms = new Date(bid.expires_at).getTime() - now
            const playerName = bid.players?.name || bid.player_name || '—'
            return (
              <button
                key={bid.id}
                onClick={() => { onNavigate('fa-tracker'); setOpen(false) }}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-surface2 cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-sm"
                    style={{
                      color: `var(--color-${bid.sport})`,
                      background: `color-mix(in srgb, var(--color-${bid.sport}) 15%, transparent)`,
                    }}
                  >
                    {bid.sport?.toUpperCase()}
                  </span>
                  <div>
                    <div className="text-[13px] text-txt font-medium">{playerName}</div>
                    <div className="text-[11px] text-txt3">{bid.teams?.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[12px] text-accent font-semibold">${bid.salary}</div>
                  <div className={`font-mono text-[11px] ${bidColor(ms)}`}>{fmtMs(ms)}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Sticky Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] bg-surface border-t border-border px-4 h-[48px] flex items-center justify-between cursor-pointer hover:bg-surface2 transition-colors md:left-[220px]"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="bg-red text-white font-mono text-[10px] font-semibold px-2 py-0.5 rounded-sm">
            {bids.length} BID{bids.length !== 1 ? 'S' : ''}
          </span>
          <span className="font-mono text-[11px] text-txt3 uppercase tracking-wider">
            Next: <span className={`${bidColor(msLeft)} font-semibold`}>{fmtMs(msLeft)}</span>
          </span>
        </div>
        <span className="font-mono text-[10px] text-txt3 uppercase tracking-wider">
          {open ? '▼ Close' : '▲ View All'}
        </span>
      </div>
    </>
  )
}
