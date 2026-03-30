import { useState } from 'react'
import PlaceholderPage from './PlaceholderPage'

export default function Calculators() {
  const [tab, setTab] = useState('fa')
  return (
    <div>
      <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1 pb-4 border-b border-border mb-6">
        Calculators
      </h1>
      <div className="flex gap-0 mb-6 border-b border-border">
        {[{ id: 'fa', label: 'FA Calculator' }, { id: 'resign', label: 'Re-sign Calculator' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`font-mono text-[11px] tracking-wider uppercase px-4 py-2.5 border-b-2 transition-colors cursor-pointer bg-transparent ${tab === t.id ? 'border-accent text-txt' : 'border-transparent text-txt3 hover:text-txt2'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'fa'
        ? <PlaceholderPage title="" description="FA salary calculator coming soon" />
        : <PlaceholderPage title="" description="Re-sign calculator coming soon" />
      }
    </div>
  )
}
