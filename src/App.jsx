import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth'
import { SportProvider } from './lib/sportContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import LeagueOverview from './pages/LeagueOverview'
import TransactionLog from './pages/TransactionLog'
import PlaceholderPage from './pages/PlaceholderPage'
import DlIrPage from './pages/DlIrPage'
import FaBidTrackerPage from './pages/FaBidTracker'
import MinorsPage from './pages/MinorsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

const PLACEHOLDER_PAGES = {
  'fa-calc': { title: 'FA Calculator', description: 'Multi-year bid minimum calculator' },
  'resign': { title: 'Re-sign Calculator', description: 'Offseason contract extensions' },
  'trades': { title: 'Trades', description: 'Trade proposal and validation' },
  'commissioner': { title: 'Commissioner Dashboard', description: 'League administration' },
}

function AppShell() {
  const { loading, session, team } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')

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
    case 'dashboard':
      pageContent = <Dashboard />
      break
    case 'league':
      pageContent = <LeagueOverview />
      break
    case 'transactions':
      pageContent = <TransactionLog />
      break
    case 'dl-ir':
      pageContent = <DlIrPage />
      break
    case 'fa-tracker':
      pageContent = <FaBidTrackerPage />
      break
    case 'minors':
      pageContent = <MinorsPage />
      break
    default: {
      const ph = PLACEHOLDER_PAGES[activePage]
      pageContent = ph
        ? <PlaceholderPage title={ph.title} description={ph.description} />
        : <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <div className="flex" style={{ minHeight: 'calc(100vh - 52px)' }}>
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 p-6 overflow-y-auto">
          {pageContent}
        </main>
      </div>
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
