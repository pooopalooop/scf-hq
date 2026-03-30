import { useAuth } from '../lib/auth'
import {
  LayoutDashboard, Users, ArrowRightLeft, Clock, Calculator,
  RefreshCw, UserPlus, GitBranch, Shield, ScrollText
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { id: 'dashboard', label: 'My Team', icon: LayoutDashboard },
      { id: 'league', label: 'League Overview', icon: Users },
      { id: 'transactions', label: 'Transaction Log', icon: ScrollText },
    ]
  },
  {
    label: 'Moves',
    items: [
      { id: 'dl-ir', label: 'DL / IR / Reserve', icon: ArrowRightLeft, badge: null },
      { id: 'fa-tracker', label: 'FA Bid Tracker', icon: Clock, badge: '3', badgeColor: 'red' },
      { id: 'fa-calc', label: 'FA Calculator', icon: Calculator },
      { id: 'resign', label: 'Re-sign', icon: RefreshCw },
      { id: 'minors', label: 'Minors / Drafted', icon: UserPlus },
      { id: 'trades', label: 'Trades', icon: GitBranch },
    ]
  },
  {
    label: 'Admin',
    items: [
      { id: 'commissioner', label: 'Commissioner', icon: Shield, commissionerOnly: true },
    ]
  },
]

export default function Sidebar({ activePage, onNavigate }) {
  const { isCommissioner } = useAuth()

  return (
    <nav className="bg-surface border-r border-border py-4 w-[220px] flex-shrink-0">
      {NAV_SECTIONS.map(section => {
        const visibleItems = section.items.filter(
          item => !item.commissionerOnly || isCommissioner
        )
        if (visibleItems.length === 0) return null

        return (
          <div key={section.label} className="px-4 mb-6">
            <div className="font-mono text-[9px] tracking-[0.15em] text-txt3 uppercase mb-2 px-1">
              {section.label}
            </div>
            {visibleItems.map(item => {
              const Icon = item.icon
              const isActive = activePage === item.id
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
                  {item.badge && (
                    <span className={`
                      ml-auto font-mono text-[10px] px-1.5 py-px rounded-sm min-w-[18px] text-center
                      ${item.badgeColor === 'green' ? 'bg-green-dim text-white' :
                        item.badgeColor === 'yellow' ? 'bg-accent2 text-black' :
                        'bg-red text-white'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}
