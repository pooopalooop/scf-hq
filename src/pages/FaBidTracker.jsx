import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { useTeamCapState, useTeamRoster } from '../hooks/useTeamData'
import { supabase, isConfigured } from '../lib/supabase'
import { useGlobalSport } from '../lib/sportContext'
import { SPORT_CONFIG, calcFaMinimum } from '../lib/constants'
import { toast } from '../lib/toast'
import SportTabs from '../components/SportTabs'
import SearchableSelect from '../components/SearchableSelect'
import Select from '../components/Select'
import Btn from '../components/Btn'

function formatCountdown(msLeft) {
  if (msLeft <= 0) return { text: 'EXPIRED', color: 'text-red' }
  const hours = Math.floor(msLeft / 3600000)
  const mins = Math.floor((msLeft % 3600000) / 60000)
  const secs = Math.floor((msLeft % 60000) / 1000)
  const text = hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`
  const color = hours >= 8 ? 'text-green' : hours >= 3 ? 'text-accent' : 'text-red'
  return { text, color }
}

function BidRow({ bid, now, onOutbid }) {
  const msLeft = new Date(bid.expires_at).getTime() - now
  const { text: countdownText, color: countdownColor } = formatCountdown(msLeft)
  const isExpiring = msLeft > 0 && msLeft < 3 * 3600000

  return (
    <div className={`
      bg-surface2 border border-border2 rounded-sm p-3.5 px-4
      grid items-center gap-4
      ${isExpiring ? 'border-l-[3px] border-l-red' : msLeft > 8 * 3600000 ? 'border-l-[3px] border-l-green' : ''}
    `} style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
      <div>
        <div className="font-medium text-[14px] text-txt">{bid.player_name || '—'}</div>
        <div className="text-[12px] text-txt2 mt-0.5">{bid.teams?.name || '—'}</div>
      </div>
      <div className="font-mono text-[16px] font-semibold text-accent">${bid.salary}</div>
      <div className="font-mono text-[11px] text-txt2">{bid.years}yr</div>
      <div className="text-right">
        <div className={`font-mono text-[16px] font-semibold ${countdownColor}`}>{countdownText}</div>
        <div className="font-mono text-[9px] text-txt3 tracking-wider uppercase">
          {msLeft <= 0 ? 'closed' : 'remaining'}
        </div>
      </div>
      {msLeft > 0 && onOutbid && (
        <Btn variant="secondary" size="sm" onClick={() => onOutbid(bid)}>Outbid</Btn>
      )}
    </div>
  )
}

function ActiveBidsTab({ sport, onOutbid }) {
  const [now, setNow] = useState(Date.now())
  const queryClient = useQueryClient()

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isConfigured) return
    const channel = supabase
      .channel('fa-bids-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fa_bids' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['fa_bids'] })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [queryClient])

  const { data: bids, isLoading } = useQuery({
    queryKey: ['fa_bids', 'active', sport],
    queryFn: async () => {
      if (!isConfigured) return []
      let query = supabase
        .from('fa_bids')
        .select('*, teams:bidding_team_id(name)')
        .in('status', ['active'])
        .order('expires_at', { ascending: true })
      if (sport) query = query.eq('sport', sport)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return <div className="text-txt3 text-center py-8 font-mono text-[11px]">Loading bids...</div>
  }

  if (!bids?.length) {
    return (
      <div className="text-txt3 text-center py-12 font-mono text-[11px]">
        No active bids{sport ? ` for ${sport.toUpperCase()}` : ''}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {bids.map(bid => (
        <BidRow key={bid.id} bid={bid} now={now} onOutbid={onOutbid} />
      ))}
    </div>
  )
}

function SubmitBidTab({ sport, prefillBid, onCancel }) {
  const { team } = useAuth()
  const { data: capStates } = useTeamCapState(team?.id)
  const { data: allContracts } = useTeamRoster(team?.id)
  const queryClient = useQueryClient()

  const [playerName, setPlayerName] = useState(prefillBid?.player_name || '')
  const [salary, setSalary] = useState('')
  const [years, setYears] = useState(1)
  const [correspondingMove, setCorrespondingMove] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [manualPos, setManualPos] = useState('')
  const [manualTeam, setManualTeam] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [touched, setTouched] = useState(!!prefillBid)
  const [nominationError, setNominationError] = useState('')

  const capState = capStates?.find(cs => cs.sport === sport)
  const sportContracts = allContracts?.filter(c => c.sport === sport && c.status === 'active') || []
  const config = SPORT_CONFIG[sport]

  // Fetch today's nomination count (bids created today ET)
  const { data: todayNomCount = 0 } = useQuery({
    queryKey: ['fa_bids_today', team?.id, sport],
    queryFn: async () => {
      if (!isConfigured || !team?.id) return 0
      const todayET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
      todayET.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('fa_bids')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .gte('created_at', todayET.toISOString())
      return count || 0
    },
    enabled: !!team?.id,
    refetchInterval: 60_000,
  })

  // Check if this is a new nomination (no prior active bids from any team on this player)
  async function checkIsNewNomination(pName) {
    if (!isConfigured) return false
    const { count } = await supabase
      .from('fa_bids')
      .select('id', { count: 'exact', head: true })
      .eq('player_name', pName)
      .eq('sport', sport)
      .eq('status', 'active')
    return (count || 0) === 0
  }

  // Calculate minimum bids if outbidding
  const minimums = useMemo(() => {
    if (!prefillBid) return null
    return {
      1: calcFaMinimum(prefillBid.salary, prefillBid.years, 1),
      2: calcFaMinimum(prefillBid.salary, prefillBid.years, 2),
      3: calcFaMinimum(prefillBid.salary, prefillBid.years, 3),
    }
  }, [prefillBid])

  // Validation
  const capRemaining = capState ? capState.total_cap - capState.spent : 0
  const rosterUsed = sportContracts.length
  const rosterLimit = config.activeRoster
  const salaryNum = parseInt(salary) || 0

  const checks = {
    capSpace: salaryNum > 0 ? (salaryNum <= capRemaining ? 'pass' : 'fail') : 'pending',
    rosterSpot: !touched ? 'pending' : (rosterUsed < rosterLimit ? 'pass' : (correspondingMove ? 'pass' : 'fail')),
    bidValid: salaryNum > 0 && years >= 1 && years <= 3 ? 'pass' : 'pending',
    wholeNumber: salaryNum > 0 ? (Number.isInteger(parseFloat(salary)) ? 'pass' : 'fail') : 'pending',
  }
  const canSubmit = Object.values(checks).every(v => v === 'pass') && playerName.trim()

  // Player search — returns SearchableSelect-compatible options
  async function searchPlayers(query) {
    setNominationError('')
    setTouched(true)
    if (sport === 'mlb') {
      try {
        const res = await fetch(`/api/mlb/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        const people = (data.people || []).slice(0, 8)
        if (people.length === 0) setManualMode(true)
        return people.map(p => ({
          value: p.fullName,
          label: p.fullName,
          sublabel: p.currentTeam?.name || '—',
          badge: p.primaryPosition?.abbreviation || '—',
        }))
      } catch {
        setManualMode(true)
        return []
      }
    } else {
      if (!isConfigured) return []
      const { data } = await supabase
        .from('players')
        .select('name, position, real_world_team')
        .eq('sport', sport)
        .ilike('name', `%${query}%`)
        .limit(8)
      return (data || []).map(p => ({
        value: p.name,
        label: p.name,
        sublabel: p.real_world_team || '—',
        badge: p.position || '—',
      }))
    }
  }

  function handlePlayerSelect(opt) {
    setPlayerName(opt?.label ?? '')
    setManualMode(false)
  }

  const submitBid = useMutation({
    mutationFn: async () => {
      setNominationError('')

      // Check nomination limit for new players
      if (!prefillBid) {
        const isNew = await checkIsNewNomination(playerName.trim())
        if (isNew) {
          if (todayNomCount >= 2) {
            throw new Error('Daily nomination limit reached (2/2). Resets at midnight ET.')
          }
        }
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const { error } = await supabase
        .from('fa_bids')
        .insert({
          player_name: playerName,
          sport,
          bidding_team_id: team.id,
          team_id: team.id,
          salary: salaryNum,
          years: parseInt(years),
          expires_at: expiresAt,
          status: 'active',
          corresponding_move: correspondingMove || null,
        })
      if (error) throw error

      await supabase.from('transactions').insert({
        type: 'fa_bid',
        team_id: team.id,
        sport,
        notes: `FA bid: ${playerName} $${salaryNum}/${years}yr`,
      })
    },
    onSuccess: () => {
      const player = playerName
      const sal = salaryNum
      const yrs = years
      setSubmitSuccess({ player, salary: sal, years: yrs })
      setPlayerName('')
      setSalary('')
      setYears(1)
      setCorrespondingMove('')
      queryClient.invalidateQueries({ queryKey: ['fa_bids'] })
      queryClient.invalidateQueries({ queryKey: ['fa_bids_today'] })
      queryClient.invalidateQueries({ queryKey: ['fa_bids_count'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast(`FA bid submitted: ${player} $${sal}/${yrs}yr`, 'success')
    },
    onError: (err) => {
      if (err?.message?.includes('nomination limit')) {
        setNominationError(err.message)
      } else {
        toast('Bid submission failed — ' + (err?.message || 'try again'), 'error')
      }
    },
  })

  return (
    <div>
      {/* Nomination counter */}
      {!prefillBid && (
        <div className="mb-4 flex items-center gap-2">
          <span className="font-mono text-[11px] text-txt2">Nominations today:</span>
          <span className={`font-mono text-[12px] font-semibold ${todayNomCount >= 2 ? 'text-red' : todayNomCount >= 1 ? 'text-accent' : 'text-green'}`}>
            {todayNomCount}/2
          </span>
          {todayNomCount >= 2 && (
            <span className="font-mono text-[10px] text-red">— Daily limit reached. Resets at midnight ET.</span>
          )}
        </div>
      )}

      {nominationError && (
        <div className="mb-4 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-sm px-3 py-2.5">
          <span className="font-mono text-[12px] text-red">{nominationError}</span>
        </div>
      )}

      {/* Current bid info if outbidding */}
      {prefillBid && (
        <div className="bg-surface2 border border-border2 rounded-sm p-3.5 mb-4">
          <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-2">Current High Bid</div>
          <div className="flex items-center gap-4">
            <span className="text-txt font-medium">{prefillBid.player_name}</span>
            <span className="font-mono text-accent font-semibold">${prefillBid.salary}/{prefillBid.years}yr</span>
            <span className="text-txt2 text-[12px]">by {prefillBid.teams?.name}</span>
          </div>
          {minimums && (
            <div className="flex gap-3 mt-2">
              {[1, 2, 3].map(y => (
                <button
                  key={y}
                  onClick={() => { setSalary(String(minimums[y])); setYears(y) }}
                  className="font-mono text-[11px] px-2.5 py-1 rounded-sm border border-border2 bg-surface3 text-txt2 hover:text-txt hover:border-accent cursor-pointer transition-colors"
                >
                  {y}yr: ${minimums[y]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Left: Player + Bid Form */}
        <div className="bg-surface border border-border rounded p-5">
          <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-4 pb-2.5 border-b border-border flex items-center justify-between">
            <span>{prefillBid ? 'Your Bid' : 'Submit New Bid'}</span>
            {onCancel && (
              <Btn variant="ghost" size="sm" onClick={onCancel}>✕</Btn>
            )}
          </div>

          {/* Player Search */}
          <div className="mb-3">
            <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">Player</label>
            <SearchableSelect
              value={playerName}
              onChange={handlePlayerSelect}
              onSearch={searchPlayers}
              placeholder="Search player name..."
            />
            {manualMode && (
              <div className="mt-2 p-2.5 bg-surface3 border border-border2 rounded-sm">
                <div className="font-mono text-[9px] text-accent mb-1.5 uppercase tracking-wider">Manual Entry</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Position" value={manualPos} onChange={e => setManualPos(e.target.value)}
                    className="bg-surface2 border border-border2 text-txt px-2 py-1.5 rounded-sm text-[12px] outline-none focus:border-accent" />
                  <input type="text" placeholder="Team" value={manualTeam} onChange={e => setManualTeam(e.target.value)}
                    className="bg-surface2 border border-border2 text-txt px-2 py-1.5 rounded-sm text-[12px] outline-none focus:border-accent" />
                </div>
              </div>
            )}
          </div>

          {/* Salary + Years */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">Salary ($/yr)</label>
              <input
                type="number"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="$0"
                min="0"
                className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-mono text-[13px] outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">Years</label>
              <Select
                value={years}
                onChange={v => setYears(parseInt(v))}
                options={[
                  { value: 1, label: '1 Year' },
                  { value: 2, label: '2 Years' },
                  { value: 3, label: '3 Years' },
                ]}
              />
            </div>
          </div>

          {/* Corresponding Move */}
          {(checks.capSpace === 'fail' || checks.rosterSpot === 'fail') && (
            <div className="mb-3">
              <label className="font-mono text-[10px] tracking-wider text-accent uppercase block mb-1.5">
                Corresponding Move (Required)
              </label>
              <input
                type="text"
                value={correspondingMove}
                onChange={e => setCorrespondingMove(e.target.value)}
                placeholder="e.g. Drop Player X if bid wins"
                className="w-full bg-surface2 border border-[rgba(245,166,35,0.4)] text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent transition-colors"
              />
            </div>
          )}
        </div>

        {/* Right: Validation + Submit */}
        <div>
          <div className="bg-surface2 border border-border2 rounded-sm overflow-hidden mb-4">
            <div className="font-mono text-[10px] tracking-wider uppercase px-3.5 py-2.5 border-b border-border text-txt3">
              Validation
            </div>
            <div className="flex items-center justify-between py-2.5 px-3.5 border-b border-border text-[13px]">
              <span className="text-txt2">Cap space</span>
              <span className={`font-mono text-[11px] ${checks.capSpace === 'pass' ? 'text-green' : checks.capSpace === 'fail' ? 'text-red' : 'text-txt3'}`}>
                {checks.capSpace === 'pass' ? `✓ $${capRemaining} avail` : checks.capSpace === 'fail' ? `✗ $${salaryNum} > $${capRemaining}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3.5 border-b border-border text-[13px]">
              <span className="text-txt2">Roster spot</span>
              <span className={`font-mono text-[11px] ${checks.rosterSpot === 'pass' ? 'text-green' : 'text-red'}`}>
                {checks.rosterSpot === 'pass' ? `✓ ${rosterUsed}/${rosterLimit}` : `✗ ${rosterUsed}/${rosterLimit} full`}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3.5 border-b border-border text-[13px]">
              <span className="text-txt2">Bid valid</span>
              <span className={`font-mono text-[11px] ${checks.bidValid === 'pass' ? 'text-green' : 'text-txt3'}`}>
                {checks.bidValid === 'pass' ? '✓' : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3.5 text-[13px]">
              <span className="text-txt2">Whole number</span>
              <span className={`font-mono text-[11px] ${checks.wholeNumber === 'pass' ? 'text-green' : checks.wholeNumber === 'fail' ? 'text-red' : 'text-txt3'}`}>
                {checks.wholeNumber === 'pass' ? '✓' : checks.wholeNumber === 'fail' ? '✗ Decimals not allowed' : '—'}
              </span>
            </div>
          </div>

          <div className="flex gap-2.5 justify-end">
            <Btn
              variant="primary"
              onClick={() => submitBid.mutate()}
              disabled={!canSubmit || submitBid.isPending}
              loading={submitBid.isPending}
            >
              Submit Bid
            </Btn>
          </div>
        </div>
      </div>

      {/* Success Overlay */}
      {submitSuccess && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-[200] flex items-center justify-center" onClick={() => setSubmitSuccess(null)}>
          <div className="bg-surface border border-green rounded-md p-8 px-10 text-center max-w-[400px]">
            <div className="text-[36px] mb-3">&#10003;</div>
            <div className="font-condensed text-[20px] font-bold text-green mb-2">Bid Submitted</div>
            <div className="text-[13px] text-txt2 mb-5">
              {submitSuccess.player} — ${submitSuccess.salary}/{submitSuccess.years}yr
            </div>
            <div className="text-[11px] text-txt3 font-mono mb-5">24-hour bid window is now open</div>
            <Btn variant="ghost" onClick={() => setSubmitSuccess(null)}>Done</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FaBidTrackerPage() {
  const { globalSport, lastIndividualSport } = useGlobalSport()
  const sportFilter = globalSport === 'all' ? null : globalSport
  const sport = sportFilter || lastIndividualSport
  const [activeTab, setActiveTab] = useState('active')
  const [outbidTarget, setOutbidTarget] = useState(null)

  function handleOutbid(bid) {
    setOutbidTarget(bid)
    setActiveTab('submit')
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
            FA Bid Tracker
          </h1>
          <span className="text-[12px] text-txt2 font-mono">Live free agency bidding</span>
        </div>
      </div>

      <SportTabs />

      {/* Inner Tabs */}
      <div className="flex gap-1 mb-6">
        {[
          { id: 'active', label: 'Active Bids' },
          { id: 'submit', label: 'Submit Bid' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id === 'active') setOutbidTarget(null) }}
            className={`
              font-mono text-[11px] font-semibold tracking-wider px-4 py-1.5
              rounded-sm cursor-pointer border uppercase transition-all duration-75
              ${activeTab === tab.id
                ? 'bg-surface3 text-txt border-border2'
                : 'bg-surface2 text-txt3 border-border2 hover:text-txt2'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'active' && (
        <ActiveBidsTab sport={sportFilter} onOutbid={handleOutbid} />
      )}
      {activeTab === 'submit' && (
        <SubmitBidTab
          sport={sport}
          prefillBid={outbidTarget}
          onCancel={() => { setActiveTab('active'); setOutbidTarget(null) }}
        />
      )}
    </div>
  )
}
