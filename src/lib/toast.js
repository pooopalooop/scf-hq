// Simple toast system using a global event emitter pattern
import { useState, useEffect } from 'react'

let listeners = []
let toastId = 0

export function toast(message, type = 'success', duration = 3000) {
  const id = ++toastId
  listeners.forEach(fn => fn({ id, message, type, duration }))
}

export function useToasts() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration)
    }
    listeners.push(handler)
    return () => { listeners = listeners.filter(l => l !== handler) }
  }, [])
  return toasts
}
