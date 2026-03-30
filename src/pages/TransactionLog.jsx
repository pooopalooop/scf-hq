import { useQuery } from '@tanstack/react-query'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_TRANSACTIONS } from '../lib/demoData'

export default function TransactionLog() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      if (!isConfigured) return DEMO_TRANSACTIONS

      const { data, error } = await supabase
        .from('transactions')
        .select('*, teams(name), players(name)')
        .order('timestamp', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    },
  })

  const sportColor = {
    nfl: 'var(--color-nfl)',
    nba: 'var(--color-nba)',
    mlb: 'var(--color-mlb)',
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
            Transaction Log
          </h1>
          <span className="text-[12px] text-txt2 font-mono">
            All league moves
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-txt3 text-center py-12 font-mono text-[11px]">Loading...</div>
      ) : !transactions?.length ? (
        <div className="text-txt3 text-center py-12 font-mono text-[11px]">No transactions yet</div>
      ) : (
        <div className="bg-surface border border-border rounded overflow-hidden">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Date', 'Type', 'Team', 'Player', 'Sport', 'Notes'].map(h => (
                  <th key={h} className="font-mono text-[9px] tracking-wider text-txt3 uppercase font-medium text-left py-2 px-3 border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-surface2 border-b border-border last:border-b-0">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-txt3">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-txt2 uppercase">
                    {tx.type}
                  </td>
                  <td className="py-2.5 px-3 text-txt2">{tx.teams?.name || '—'}</td>
                  <td className="py-2.5 px-3 text-txt font-medium">{tx.players?.name || '—'}</td>
                  <td className="py-2.5 px-3">
                    {tx.sport && (
                      <span
                        className="font-mono text-[10px] font-semibold uppercase"
                        style={{ color: sportColor[tx.sport] }}
                      >
                        {tx.sport}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-txt3 text-[12px] max-w-[200px] truncate">
                    {tx.is_manual_entry && (
                      <span className="font-mono text-[9px] text-accent mr-1">[MANUAL]</span>
                    )}
                    {tx.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
