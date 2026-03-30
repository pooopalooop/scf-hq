import { useState, useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { useTeamRoster } from '../hooks/useTeamData'
import { MLB_ROOKIE_OPTIONS, calcResignSalary } from '../lib/constants'
import SearchableSelect from '../components/SearchableSelect'

// ============================================================
// FA Salary Calculator (Tab 1)
// minimum_bid = ceil(current_bid * factor) + 1
// ============================================================
const FA_FACTORS = { 1: 1.20, 2: 1.30, 3: 1.40, 4: 1.50 }

function calcFaBid(currentBid, years) {
  if (currentBid === 0) return 1
  return Math.ceil(currentBid * FA_FACTORS[years]) + 1
}

function FaCalculator() {
  const [currentBid, setCurrentBid] = useState('')

  const bidNum = parseInt(currentBid) || 0
  const results = [1, 2, 3, 4].map(y => ({ years: y, minimum: calcFaBid(bidNum, y) }))

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
          Current High Bid
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-txt3 text-[13px]">$</span>
          <input
            type="number"
            value={currentBid}
            onChange={e => setCurrentBid(e.target.value)}
            placeholder="0"
            min="0"
            style={{ paddingLeft: '24px' }}
            className="w-full bg-surface2 border border-border2 text-txt py-2.5 pr-3 rounded-sm font-mono text-[13px] outline-none focus:border-accent transition-colors"
          />
        </div>
        <p className="font-mono text-[10px] text-txt3 mt-1.5">
          Enter the current winning bid to see minimum bids needed to outbid
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {results.map(({ years, minimum }) => (
          <div
            key={years}
            className="bg-surface border border-border2 rounded p-4"
          >
            <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-2">
              {years} Year{years > 1 ? 's' : ''}
            </div>
            <div className="font-mono text-[28px] font-semibold text-accent leading-none">
              ${minimum}
            </div>
            <div className="font-mono text-[10px] text-txt3 mt-1.5">
              {bidNum > 0
                ? `×${FA_FACTORS[years].toFixed(2)} + $1`
                : '$0 bid → $1 minimum'
              }
            </div>
          </div>
        ))}
      </div>

      {currentBid && bidNum > 0 && (
        <div className="mt-4 p-3 bg-surface2 border border-border2 rounded-sm">
          <div className="font-mono text-[10px] text-txt3 tracking-wider uppercase mb-1.5">Formula</div>
          <div className="font-mono text-[11px] text-txt2">
            min bid = ceil(${bidNum} × factor) + $1
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Re-sign Calculator (Tab 2)
// ============================================================
function ResignCalculator() {
  const { team } = useAuth()
  const { data: allContracts } = useTeamRoster(team?.id)

  const [salary, setSalary] = useState('')
  const [sport, setSport] = useState('mlb')

  const salaryNum = parseInt(salary) || 0
  const isMLBRookie = sport === 'mlb' && salaryNum === 0

  // Player lookup options — active players for any sport
  const playerOptions = useMemo(() => {
    if (!allContracts) return []
    return allContracts
      .filter(c => c.status === 'active')
      .sort((a, b) => (a.players?.name || '').localeCompare(b.players?.name || ''))
      .map(c => ({
        value: String(c.id),
        label: c.players?.name || '—',
        sublabel: `${c.sport?.toUpperCase()} · ${c.players?.position} — $${c.salary}`,
        _salary: c.salary,
        _sport: c.sport,
      }))
  }, [allContracts])

  function handlePlayerSelect(opt) {
    if (!opt) return
    setSalary(String(opt._salary))
    setSport(opt._sport)
  }

  // Resign results for regular players
  const results = isMLBRookie ? null : [1, 2, 3, 4].map(y => {
    const newSalary = calcResignSalary(salaryNum, y)
    const increase = newSalary - salaryNum
    return { years: y, newSalary, increase }
  })

  // Cheapest option index (for highlighting)
  const cheapestIdx = results ? results.reduce((minI, r, i, arr) => r.newSalary < arr[minI].newSalary ? i : minI, 0) : -1

  return (
    <div className="max-w-lg">
      {/* Player Lookup */}
      <div className="mb-4">
        <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
          Player Lookup (optional)
        </label>
        <SearchableSelect
          value=""
          onChange={handlePlayerSelect}
          options={playerOptions}
          placeholder="Search your active roster..."
          clearable={false}
        />
        <p className="font-mono text-[10px] text-txt3 mt-1.5">
          Select a player to auto-fill salary
        </p>
      </div>

      {/* Manual Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
            Current Salary
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-txt3 text-[13px]">$</span>
            <input
              type="number"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              placeholder="0"
              min="0"
              style={{ paddingLeft: '24px' }}
              className="w-full bg-surface2 border border-border2 text-txt py-2.5 pr-3 rounded-sm font-mono text-[13px] outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
            Sport
          </label>
          <select
            value={sport}
            onChange={e => setSport(e.target.value)}
            className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent cursor-pointer"
          >
            <option value="nfl">NFL</option>
            <option value="nba">NBA</option>
            <option value="mlb">MLB</option>
          </select>
        </div>
      </div>

      {/* MLB Rookie Exception */}
      {isMLBRookie && (
        <div>
          <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-3">
            MLB $0 Rookie — Fixed Options
          </div>
          <div className="space-y-2">
            {MLB_ROOKIE_OPTIONS.map((opt) => (
              <div
                key={opt.label}
                className="bg-surface border border-border2 rounded p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-[11px] font-semibold text-txt mb-1">{opt.label}</div>
                  <div className="font-mono text-[10px] text-txt3">
                    {opt.years.length} year{opt.years.length > 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-right">
                  {opt.years.map((sal, i) => (
                    <div key={i} className="font-mono text-[13px] font-semibold text-accent">
                      ${sal} <span className="text-[10px] text-txt3 font-normal">yr {i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] text-txt3 mt-3">
            MLB $0 rookie contracts use fixed escalating salary schedules per Section 12.
          </p>
        </div>
      )}

      {/* Regular Results */}
      {!isMLBRookie && results && (
        <div>
          <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-3">
            Re-sign Cost by Year Length
          </div>
          <div className="grid grid-cols-2 gap-3">
            {results.map(({ years, newSalary, increase }, i) => {
              const isCheapest = i === cheapestIdx && salary
              return (
                <div
                  key={years}
                  className={`bg-surface rounded p-4 border transition-colors ${
                    isCheapest ? 'border-green' : 'border-border2'
                  }`}
                >
                  {isCheapest && (
                    <div className="font-mono text-[9px] tracking-wider text-green uppercase mb-1.5">
                      ★ Cheapest
                    </div>
                  )}
                  <div className="font-mono text-[10px] tracking-wider text-txt3 uppercase mb-2">
                    {years} Year{years > 1 ? 's' : ''}
                  </div>
                  <div className="font-mono text-[28px] font-semibold text-txt leading-none">
                    ${salary ? newSalary : '—'}
                  </div>
                  {salary && (
                    <div className="font-mono text-[10px] text-txt3 mt-1.5">
                      +${increase} from ${salaryNum}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {salary && (
            <div className="mt-4 p-3 bg-surface2 border border-border2 rounded-sm">
              <div className="font-mono text-[10px] text-txt3 tracking-wider uppercase mb-1.5">Formula</div>
              <div className="font-mono text-[11px] text-txt2">
                {salaryNum < 10
                  ? `Under $10: salary + flat increase ($2/$3/$4/$5 per year length)`
                  : `At/above $10: ceil(salary × 1.20/1.30/1.40/1.50)`
                }
              </div>
            </div>
          )}
        </div>
      )}

      {!salary && !isMLBRookie && (
        <div className="text-txt3 font-mono text-[11px] text-center py-8">
          Enter a salary or select a player to see re-sign costs
        </div>
      )}
    </div>
  )
}

// ============================================================
// Main Calculators Page
// ============================================================
export default function Calculators() {
  const [tab, setTab] = useState('fa')

  const tabs = [
    { id: 'fa', label: 'FA Calculator' },
    { id: 'resign', label: 'Re-sign Calculator' },
  ]

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-border">
        <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
          Calculators
        </h1>
        <span className="text-[12px] text-txt2 font-mono">Salary tools</span>
      </div>

      {/* Tab Bar */}
      <div className="flex mb-6 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              borderBottom: `2px solid ${tab === t.id ? 'var(--color-accent)' : 'transparent'}`,
              marginBottom: '-1px',
            }}
            className={`font-mono text-[11px] tracking-wider uppercase transition-colors cursor-pointer bg-transparent flex-shrink-0 ${
              tab === t.id ? 'text-txt' : 'text-txt3 hover:text-txt2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fa' && <FaCalculator />}
      {tab === 'resign' && <ResignCalculator />}
    </div>
  )
}
