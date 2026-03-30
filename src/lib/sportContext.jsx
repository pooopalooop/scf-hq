import { createContext, useContext, useState } from 'react'

const SportContext = createContext(null)

export function SportProvider({ children }) {
  const [globalSport, setGlobalSport] = useState(() => {
    return localStorage.getItem('scfhq_sport') || 'all'
  })

  const [lastIndividualSport, setLastIndividualSport] = useState(() => {
    return localStorage.getItem('scfhq_last_sport') || 'nfl'
  })

  function setSport(sport) {
    setGlobalSport(sport)
    localStorage.setItem('scfhq_sport', sport)
    if (sport !== 'all') {
      setLastIndividualSport(sport)
      localStorage.setItem('scfhq_last_sport', sport)
    }
  }

  return (
    <SportContext.Provider value={{ globalSport, setGlobalSport: setSport, lastIndividualSport }}>
      {children}
    </SportContext.Provider>
  )
}

export function useGlobalSport() {
  const ctx = useContext(SportContext)
  if (!ctx) throw new Error('useGlobalSport must be used within SportProvider')
  return ctx
}

// For pages that need a specific sport (My Roster, FA Bids, Make a Move, etc.)
// Returns lastIndividualSport when globalSport is 'all'
export function useActiveSport() {
  const { globalSport, lastIndividualSport } = useGlobalSport()
  return globalSport === 'all' ? lastIndividualSport : globalSport
}
