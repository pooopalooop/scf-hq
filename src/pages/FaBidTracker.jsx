import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { useTeamCapState, useTeamRoster } from '../hooks/useTeamData'
import { supabase, isConfigured } from '../lib/supabase'
import { useGlobalSport } from '../lib/sportContext'
import { SPORT_CONFIG, calcFaMinimum } from '../lib/constants'
import SportTabs from '../components/SportTabs'

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
        <button
          onClick={() => onOutbid(bid)}
          className="font-mono text-[10px] font-semibold tracking-wider uppercase py-1.5 px-3 rounded-sm cursor-pointer border border-accent bg-transparent text-accent hover:bg-[rgba(245,166,35,0.1)] transition-colors"
        >
          Outbid
        </button>
      )}
    </div>
  )
}

function ActiveBidsTab({ sport, onOutbid }) {
  const [now, setNow] = useState(Date.now())

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const { data: bids, isLoading } = useQuery({
    queryKey: ['fa_bids', 'active', sport],
    queryFn: async () => {
      if (!isConfigured) return []
      const { data, error } = await supabase
        .from('fa_bids')
        .select('*, teams:bidding_team_id(name)')
        .eq('sport', sport)
        .in('status', ['active'])
        .order('expires_at', { ascending: true })
      if (error) throw error
      return data
    },
    refetchInterval: 30000,
  })

  // Realtime subscription
  useEffect(() => {
    if (!isConfigured) return
    const channel = supabase
      .channel('fa_bids_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fa_bids' }, () => {
        // Refetch on any change
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (isLoading) {
    return <div className="text-txt3 text-center py-8 font-mono text-[11px]">Loading bids...</div>
  }

  if (!bids?.length) {
    return (
      <div className="text-txt3 text-center py-12 font-mono text-[11px]">
        No active bids for {sport.toUpperCase()}
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

function SubmitBidTab({ sport, prefillBid }) {
  const { team } = useAuth()
  const { data: capStates } = useTeamCapState(team?.id)
  const { data: allContracts } = useTeamRoster(team?.id)
  const queryClient = useQueryClient()

  const [playerName, setPlayerName] = useState(prefillBid?.player_name || '')
  const [salary, setSalary] = useState(prefillBid ? '' : '')
  const [years, setYears] = useState(1)
  const [correspondingMove, setCorrespondingMove] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualPos, setManualPos] = useState('')
  const [manualTeam, setManualTeam] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(null)

  const capState = capStates?.find(cs => cs.sport === sport)
  const sportContracts = allContracts?.filter(c => c.sport === sport && c.status === 'active') || []
  const config = SPORT_CONFIG[sport]

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
    rosterSpot: rosterUsed < rosterLimit ? 'pass' : (correspondingMove ? 'pass' : 'fail'),
    bidValid: salaryNum > 0 && years >= 1 && years <= 3 ? 'pass' : 'pending',
    wholeNumber: salaryNum > 0 ? (Number.isInteger(parseFloat(salary)) ? 'pass' : 'fail') : 'pending',
  }
  const canSubmit = Object.values(checks).every(v => v === 'pass') && playerName.trim()

  // Player search
  async function handleSearch(query) {
    setPlayerName(query)
    if (query.length < 2) { setShowDropdown(false); return }

    if (sport === 'mlb') {
      try {
        const res = await fetch(`/api/mlb/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        const people = (data.people || []).slice(0, 8).map(p => ({
          name: p.fullName,
          pos: p.primaryPosition?.abbreviation || '—',
          team: p.currentTeam?.name || '—',
          level: p.sport?.name || 'MLB',
        }))
        setSearchResults(people)
        if (people.length === 0) setManualMode(true)
      } catch {
        setSearchResults([])
        setManualMode(true)
      }
    } else {
      // Search existing players in Supabase
      if (!isConfigured) { setSearchResults([]); setShowDropdown(true); return }
      const { data } = await supabase
        .from('players')
        .select('name, position, real_world_team')
        .eq('sport', sport)
        .ilike('name', `%${query}%`)
        .limit(8)
      setSearchResults((data || []).map(p => ({ name: p.name, pos: p.position, team: p.real_world_team })))
    }
    setShowDropdown(true)
  }

  function selectResult(r) {
    setPlayerName(r.name)
    setShowDropdown(false)
    setManualMode(false)
  }

  const submitBid = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase
        .from('fa_bids')
        .insert({
          player_name: playerName,
          sport,
          bidding_team_id: team.id,
          salary: salaryNum,
          years: parseInt(years),
          expires_at: expiresAt,
          status: 'active',
          corresponding_move: correspondingMove || null,
        })

      if (error) throw error

      // Log transaction
      await supabase.from('transactions').insert({
        type: 'fa_bid',
        team_id: team.id,
        sport,
        notes: `FA bid: ${playerName} $${salaryNum}/${years}yr`,
      })
    },
    onSuccess: () => {
      setSubmitSuccess({ player: playerName, salary: salaryNum, years })
      setPlayerName('')
      setSalary('')
      setYears(1)
      setCorrespondingMove('')
      queryClient.invalidateQueries({ queryKey: ['fa_bids'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  return (
    <div>
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
          <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-4 pb-2.5 border-b border-border">
            {prefillBid ? 'Your Bid' : 'Submit New Bid'}
          </div>

          {/* Player Search */}
          <div className="mb-3">
            <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">Player</label>
            <div className="relative">
              <input
                type="text"
                value={playerName}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Search player name..."
                className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent transition-colors"
              />
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border2 rounded-sm shadow-lg z-10 max-h-[200px] overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectResult(r)}
                      className="w-full text-left px-3 py-2 hover:bg-surface2 cursor-pointer flex justify-between items-center border-b border-border last:border-b-0"
                    >
                      <div>
                        <div className="text-[13px] text-txt font-medium">{r.name}</div>
                        <div className="text-[11px] text-txt3">{r.team}</div>
                      </div>
                      <span className="font-mono text-[10px] text-txt3">{r.pos}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              <select
                value={years}
                onChange={e => setYears(parseInt(e.target.value))}
                className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent cursor-pointer"
              >
                <option value={1}>1 Year</option>
                <option value={2}>2 Years</option>
                <option value={3}>3 Years</option>
              </select>
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
            <button
              onClick={() => submitBid.mutate()}
              disabled={!canSubmit || submitBid.isPending}
              className="font-mono text-[12px] font-semibold tracking-wider uppercase py-2.5 px-6 rounded-sm cursor-pointer border-none bg-accent text-black hover:bg-accent2 transition-colors disabled:bg-surface3 disabled:text-txt3 disabled:cursor-not-allowed"
            >
              {submitBid.isPending ? 'Submitting...' : 'Submit Bid'}
            </button>
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
            <button onClick={() => setSubmitSuccess(null)}
              className="font-mono text-[12px] font-semibold tracking-wider uppercase py-2.5 px-6 rounded-sm cursor-pointer border-none bg-accent text-black hover:bg-accent2 transition-colors">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FaBidTrackerPage() {
  const { globalSport: sport } = useGlobalSport()
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
        <ActiveBidsTab sport={sport} onOutbid={handleOutbid} />
      )}
      {activeTab === 'submit' && (
        <SubmitBidTab sport={sport} prefillBid={outbidTarget} />
      )}
    </div>
  )
}
