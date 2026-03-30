import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase'

const AuthContext = createContext(null)

// Demo team for development without Supabase
const DEMO_TEAM = {
  id: 'demo-team-id',
  name: 'Dallas',
  owner_email: 'demo@scfhq.dev',
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [team, setTeam] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadUserTeam(session.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadUserTeam(session.user)
      else {
        setTeam(null)
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserTeam(user) {
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_email', user.email)
        .single()

      setTeam(teamData)

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      setUserRole(roleData?.role || 'owner')
    } catch (err) {
      console.error('Error loading user team:', err)
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    if (!isConfigured) {
      // Demo mode — skip OAuth
      setDemoMode(true)
      setSession({ user: { email: DEMO_TEAM.owner_email } })
      setTeam(DEMO_TEAM)
      setUserRole('commissioner')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) console.error('Login error:', error)
  }

  async function signInWithEmail(email, password) {
    if (!isConfigured) {
      setDemoMode(true)
      setSession({ user: { email } })
      setTeam(DEMO_TEAM)
      setUserRole('commissioner')
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUpWithEmail(email, password) {
    if (!isConfigured) {
      return signInWithEmail(email, password)
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin }
    })
    return { error }
  }

  async function signOut() {
    if (demoMode) {
      setDemoMode(false)
      setSession(null)
      setTeam(null)
      setUserRole(null)
      return
    }
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    team,
    userRole,
    isCommissioner: userRole === 'commissioner',
    loading,
    demoMode,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
