import { useToasts } from '../lib/toast'

export default function ToastContainer() {
  const toasts = useToasts()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[150] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`
          bg-surface border rounded px-4 py-2.5 font-mono text-[12px] shadow-lg
          transition-all duration-300 pointer-events-auto
          ${t.type === 'success' ? 'border-l-2 border-l-green border-border text-txt' :
            t.type === 'error' ? 'border-l-2 border-l-red border-border text-txt' :
            'border-l-2 border-l-accent border-border text-txt'}
        `}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
