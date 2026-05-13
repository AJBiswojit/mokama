import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export default function CountdownTimer({ deadline, label = '', onExpire, className = '' }) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (!deadline) return
    const calc = () => {
      const ms = new Date(deadline) - Date.now()
      if (ms <= 0) { setRemaining(null); onExpire?.(); return }
      const totalSecs = Math.floor(ms / 1000)
      const h = Math.floor(totalSecs / 3600)
      const m = Math.floor((totalSecs % 3600) / 60)
      const s = totalSecs % 60
      setRemaining({ ms, h, m, s })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (!deadline || !remaining) return null

  const urgent  = remaining.ms < 30 * 60 * 1000   // < 30 min
  const warning = remaining.ms < 2  * 60 * 60 * 1000 // < 2 hrs

  const color = urgent  ? 'text-red-400   bg-red-500/10   border-red-500/20'
              : warning ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              :           'text-blue-400  bg-blue-500/10  border-blue-500/20'

  const timeStr = remaining.h > 0
    ? `${remaining.h}h ${remaining.m}m`
    : remaining.m > 0
      ? `${remaining.m}m ${remaining.s}s`
      : `${remaining.s}s`

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${color} ${className}`}>
      <Clock size={11} className={urgent ? 'animate-pulse' : ''} />
      {label && <span className="text-inherit/70">{label}</span>}
      {timeStr}
    </span>
  )
}
