import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { supabase, isConfigured } from '../lib/supabase'
import {
  LayoutDashboard, Users, ArrowRightLeft, Clock, Calculator,
  BarChart3, ScrollText, Shield
} from 'lucide-react'

const MY_LEAGUE = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'my-roster', label: 'My Roster', icon: Users },
  { id: 'fa-tracker', label: 'FA Bids', icon: Clock },
  { id: 'make-a-move', label: 'Make a Move', icon: ArrowRightLeft },
  { id: 'calculators', label: 'Calculators', icon: Calculator },
]

const LEAGUE_INFO = [
  { id: 'league', label: 'League Overview', icon: BarChart3 },
  { id: 'transactions', label: 'Transaction Log', icon: ScrollText },
]

const ADMIN = [
  { id: 'commissioner', label: 'Commissioner', icon: Shield, commissionerOnly: true },
]

export default function Sidebar({ activePage, onNavigate }) {
  const { isCommissioner } = useAuth()

  // Active FA bids count for badge
  const { data: activeBidCount = 0 } = useQuery({
    queryKey: ['fa_bids_count'],
    queryFn: async () => {
      if (!isConfigured) return 0
      const { count } = await supabase
        .from('fa_bids')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
      return count || 0
    },
    refetchInterval: 60_000,
  })

  const renderItem = (item) => {
    if (item.commissionerOnly && !isCommissioner) return null
    const Icon = item.icon
    const isActive = activePage === item.id
    const badge = item.id === 'fa-tracker' && activeBidCount > 0 ? activeBidCount : null

    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2 rounded-sm cursor-pointer
          text-[13px] font-medium border border-transparent mb-0.5 relative
          transition-all duration-75
          ${isActive
            ? 'bg-surface3 text-txt border-border2'
            : 'text-txt2 hover:bg-surface2 hover:text-txt'
          }
        `}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-l-sm" />
        )}
        <Icon size={16} className="opacity-70 flex-shrink-0" />
        {item.label}
        {badge !== null && (
          <span className="ml-auto font-mono text-[10px] px-1.5 py-px rounded-sm min-w-[18px] text-center bg-red text-white">
            {badge}
          </span>
        )}
      </button>
    )
  }

  const sections = [
    { label: 'MY LEAGUE', items: MY_LEAGUE },
    { label: 'LEAGUE INFO', items: LEAGUE_INFO },
    { label: 'ADMIN', items: ADMIN },
  ]

  return (
    <nav className="sidebar bg-surface border-r border-border py-4 w-[220px] flex-shrink-0 hidden md:block">
      {sections.map(section => {
        const visibleItems = section.items.filter(
          item => !item.commissionerOnly || isCommissioner
        )
        if (visibleItems.length === 0) return null
        return (
          <div key={section.label} className="px-4 mb-6">
            <div className="font-mono text-[9px] tracking-[0.15em] text-txt3 uppercase mb-2 px-1">
              {section.label}
            </div>
            {visibleItems.map(renderItem)}
          </div>
        )
      })}
    </nav>
  )
}
