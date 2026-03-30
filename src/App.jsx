import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth'
import { SportProvider } from './lib/sportContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ToastContainer from './components/Toast'
import FABidBar from './components/FABidBar'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import MyRoster from './pages/MyRoster'
import LeagueOverview from './pages/LeagueOverview'
import TransactionLog from './pages/TransactionLog'
import PlaceholderPage from './pages/PlaceholderPage'
import DlIrPage from './pages/DlIrPage'
import FaBidTrackerPage from './pages/FaBidTracker'
import MinorsPage from './pages/MinorsPage'
import MakeAMove from './pages/MakeAMove'
import Calculators from './pages/Calculators'
import {
  LayoutDashboard, Clock, ArrowRightLeft, Menu,
  X, Users, BarChart3, ScrollText, Calculator, Shield
} from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

// Mobile bottom nav tabs (4 primary)
const MOBILE_PRIMARY = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'fa-tracker', label: 'FA Bids', icon: Clock },
  { id: 'make-a-move', label: 'Move', icon: ArrowRightLeft },
  { id: 'more', label: 'More', icon: Menu },
]

const MORE_ITEMS = [
  { id: 'my-roster', label: 'My Roster', icon: Users },
  { id: 'calculators', label: 'Calculators', icon: Calculator },
  { id: 'league', label: 'League Overview', icon: BarChart3 },
  { id: 'transactions', label: 'Transaction Log', icon: ScrollText },
  { id: 'commissioner', label: 'Commissioner', icon: Shield, commissionerOnly: true },
]

function MobileBottomNav({ activePage, onNavigate, isCommissioner }) {
  const [moreOpen, setMoreOpen] = useState(false)

  function navigate(id) {
    setMoreOpen(false)
    onNavigate(id)
  }

  return (
    <>
      {/* More sheet overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.5)] z-[110]"
          onClick={() => setMoreOpen(false)}
        />
      )}
      {moreOpen && (
        <div className="fixed bottom-[56px] left-0 right-0 z-[120] bg-surface border-t border-border shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-mono text-[11px] tracking-wider text-txt3 uppercase">More</span>
            <button onClick={() => setMoreOpen(false)} className="text-txt3 hover:text-txt cursor-pointer text-[20px] leading-none">&times;</button>
          </div>
          <div className="p-2">
            {MORE_ITEMS.filter(item => !item.commissionerOnly || isCommissioner).map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm cursor-pointer transition-colors mb-0.5 ${
                    activePage === item.id
                      ? 'bg-surface3 text-txt'
                      : 'text-txt2 hover:bg-surface2 hover:text-txt'
                  }`}
                >
                  <Icon size={18} className="opacity-70" />
                  <span className="text-[14px] font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-[105] bg-surface border-t border-border flex items-stretch h-[56px] md:hidden">
        {MOBILE_PRIMARY.map(tab => {
          const Icon = tab.icon
          const isActive = tab.id === 'more' ? moreOpen : activePage === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => tab.id === 'more' ? setMoreOpen(v => !v) : navigate(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                isActive ? 'text-accent' : 'text-txt3 hover:text-txt2'
              }`}
            >
              <Icon size={20} />
              <span className="font-mono text-[9px] tracking-wider uppercase">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function AppShell() {
  const { loading, session, team, isCommissioner } = useAuth()
  const [activePage, setActivePage] = useState('home')

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="font-mono text-[11px] text-txt3">Loading...</div>
      </div>
    )
  }

  if (!session) return <LoginPage />

  if (session && !team) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="bg-surface border border-border rounded p-8 text-center max-w-sm">
          <div className="font-mono text-[13px] text-accent mb-2">No Team Found</div>
          <p className="text-txt2 text-[13px] mb-4">
            Your Google account isn't linked to a team yet. Contact the commissioner.
          </p>
          <p className="text-txt3 text-[11px] font-mono">{session.user.email}</p>
        </div>
      </div>
    )
  }

  let pageContent
  switch (activePage) {
    case 'home':
      pageContent = <HomePage onNavigate={setActivePage} />
      break
    case 'my-roster':
      pageContent = <MyRoster />
      break
    case 'fa-tracker':
      pageContent = <FaBidTrackerPage />
      break
    case 'make-a-move':
      pageContent = <MakeAMove onNavigate={setActivePage} />
      break
    case 'calculators':
      pageContent = <Calculators />
      break
    case 'league':
      pageContent = <LeagueOverview />
      break
    case 'transactions':
      pageContent = <TransactionLog />
      break
    case 'dl-ir':
      // Legacy route — redirect to make-a-move
      pageContent = <MakeAMove onNavigate={setActivePage} />
      break
    case 'minors':
      // Legacy route — redirect to make-a-move
      pageContent = <MakeAMove onNavigate={setActivePage} />
      break
    case 'commissioner':
      pageContent = <PlaceholderPage title="Commissioner Dashboard" description="League administration" />
      break
    default:
      pageContent = <HomePage onNavigate={setActivePage} />
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <div className="flex" style={{ minHeight: 'calc(100vh - 52px)' }}>
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 p-6 overflow-y-auto pb-28 md:pb-12">
          {pageContent}
        </main>
      </div>
      <ToastContainer />
      <FABidBar onNavigate={setActivePage} />
      <MobileBottomNav
        activePage={activePage}
        onNavigate={setActivePage}
        isCommissioner={isCommissioner}
      />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SportProvider>
          <AppShell />
        </SportProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
