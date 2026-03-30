import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_CONTRACTS, DEMO_CAP_STATES, DEMO_ALL_CAP_STATES } from '../lib/demoData'

export function useTeamContracts(teamId, sport) {
  return useQuery({
    queryKey: ['contracts', teamId, sport],
    queryFn: async () => {
      if (!isConfigured) {
        let data = DEMO_CONTRACTS
        if (sport) data = data.filter(c => c.sport === sport)
        return data
      }

      const query = supabase
        .from('contracts')
        .select('*, players(*)')
        .eq('team_id', teamId)
        .eq('status', 'active')

      if (sport) query.eq('sport', sport)

      const { data, error } = await query.order('salary', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!teamId,
    refetchInterval: 30_000,
  })
}

export function useTeamCapState(teamId) {
  return useQuery({
    queryKey: ['cap_state', teamId],
    queryFn: async () => {
      if (!isConfigured) return DEMO_CAP_STATES

      const { data, error } = await supabase
        .from('cap_state')
        .select('*')
        .eq('team_id', teamId)

      if (error) throw error
      return data
    },
    enabled: !!teamId,
    refetchInterval: 30_000,
  })
}

export function useAllTeamsCapState() {
  return useQuery({
    queryKey: ['all_cap_state'],
    queryFn: async () => {
      if (!isConfigured) return DEMO_ALL_CAP_STATES

      const { data, error } = await supabase
        .from('cap_state')
        .select('*, teams(name)')
        .order('team_id')

      if (error) throw error
      return data
    },
    refetchInterval: 30_000,
  })
}

export function useTeamRoster(teamId) {
  return useQuery({
    queryKey: ['roster', teamId],
    queryFn: async () => {
      if (!isConfigured) return DEMO_CONTRACTS

      const { data, error } = await supabase
        .from('contracts')
        .select('*, players(*)')
        .eq('team_id', teamId)

      if (error) throw error
      return data
    },
    enabled: !!teamId,
    refetchInterval: 30_000,
  })
}

export function useRealtimeRoster(teamId, queryClient) {
  useEffect(() => {
    if (!isConfigured || !teamId) return

    const channel = supabase
      .channel(`roster-realtime-${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contracts', filter: `team_id=eq.${teamId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['contracts', teamId] })
          queryClient.invalidateQueries({ queryKey: ['roster', teamId] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cap_state', filter: `team_id=eq.${teamId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cap_state', teamId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, queryClient])
}
