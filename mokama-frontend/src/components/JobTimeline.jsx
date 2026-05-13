import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const EVENT_CONFIG = {
  booking_confirmed:       { label: 'Booking Confirmed',        color: 'bg-blue-500',    icon: '📋' },
  booking_auto_confirmed:  { label: 'Booking Auto-Confirmed',   color: 'bg-blue-400',    icon: '🤖' },
  arrival_marked:          { label: 'Worker Arrived',           color: 'bg-violet-500',  icon: '📍' },
  arrival_confirmed:       { label: 'Arrival Confirmed',        color: 'bg-emerald-500', icon: '✅' },
  arrival_auto_confirmed:  { label: 'Arrival Auto-Confirmed',   color: 'bg-emerald-400', icon: '🤖' },
  suspicious_arrival:      { label: 'Arrival Flagged',          color: 'bg-amber-500',   icon: '⚠️' },
  day_completed:           { label: 'Day Marked Complete',      color: 'bg-emerald-500', icon: '✅' },
  day_auto_completed:      { label: 'Day Auto-Completed',       color: 'bg-emerald-400', icon: '🤖' },
  daily_pay_released:      { label: 'Daily Pay Released',       color: 'bg-[#ff2400]',   icon: '💰' },
  daily_pay_confirmed:     { label: 'Daily Pay Confirmed',      color: 'bg-emerald-500', icon: '💰' },
  hours_approved:          { label: 'Hours Approved',           color: 'bg-emerald-500', icon: '⏱️' },
  hours_auto_approved:     { label: 'Hours Auto-Approved',      color: 'bg-emerald-400', icon: '🤖' },
  payment_released:        { label: 'Payment Released',         color: 'bg-[#ff2400]',   icon: '💳' },
  payment_confirmed:       { label: 'Payment Confirmed',        color: 'bg-emerald-500', icon: '✅' },
  payment_auto_confirmed:  { label: 'Payment Auto-Confirmed',   color: 'bg-emerald-400', icon: '🤖' },
  dispute_raised:          { label: 'Dispute Raised',           color: 'bg-red-500',     icon: '⚖️' },
  dispute_resolved:        { label: 'Dispute Resolved',         color: 'bg-blue-500',    icon: '⚖️' },
  dispute_escalated:       { label: 'Dispute Escalated',        color: 'bg-red-600',     icon: '🚨' },
  no_show:                 { label: 'No-Show Recorded',         color: 'bg-red-500',     icon: '🚫' },
  job_completed:           { label: 'Job Completed',            color: 'bg-emerald-500', icon: '🎉' },
  job_cancelled:           { label: 'Job Cancelled',            color: 'bg-[#3a3a3a]',   icon: '❌' },
}

function fmt(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' })
    + ' · ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
}

export default function JobTimeline({ timeline = [], className = '' }) {
  const [open, setOpen] = useState(false)
  if (!timeline?.length) return null

  const preview = timeline.slice(-2)
  const shown   = open ? [...timeline].reverse() : [...preview].reverse()

  return (
    <div className={`rounded-xl border border-[#1e1e1e] bg-[#0a0a0a] overflow-hidden ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-[#3a3a3a] hover:text-[#555] transition-colors">
        <span className="uppercase tracking-wider">Job Timeline · {timeline.length} events</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      <div className="px-4 pb-3 space-y-2">
        {shown.map((event, i) => {
          const cfg = EVENT_CONFIG[event.event] || { label: event.event, color: 'bg-[#333]', icon: '•' }
          const isAuto = event.actor === 'system' || event.event?.includes('auto')
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0 pt-0.5">
                <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
                {i < shown.length - 1 && <div className="w-px flex-1 bg-[#1a1a1a] mt-1" style={{ minHeight: 16 }} />}
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-white">{cfg.icon} {cfg.label}</span>
                  {isAuto && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#444] font-semibold">
                      AUTO
                    </span>
                  )}
                </div>
                {event.note && <div className="text-xs text-[#3a3a3a] mt-0.5 truncate">{event.note}</div>}
                <div className="text-[10px] text-[#2a2a2a] mt-0.5">{fmt(event.ts)} · {event.actorName || event.actor}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
