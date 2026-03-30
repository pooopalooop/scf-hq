import { createContext, useContext, useState } from 'react'

const SportContext = createContext(null)

export function SportProvider({ children }) {
  const [globalSport, setGlobalSport] = useState(() => {
    // Persist selection in localStorage
    return localStorage.getItem('scfhq_sport') || 'nfl'
  })

  function setSport(sport) {
    setGlobalSport(sport)
    localStorage.setItem('scfhq_sport', sport)
  }

  return (
    <SportContext.Provider value={{ globalSport, setGlobalSport: setSport }}>
      {children}
    </SportContext.Provider>
  )
}

export function useGlobalSport() {
  const ctx = useContext(SportContext)
  if (!ctx) throw new Error('useGlobalSport must be used within SportProvider')
  return ctx
}
