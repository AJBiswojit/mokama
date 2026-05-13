import CountdownTimer from './CountdownTimer'
import { AlertCircle, Clock, CheckCircle, Shield } from 'lucide-react'

const ACTION_LABELS = {
  confirm_booking:         { employer: 'Confirm this booking',           worker:   'Waiting for employer to confirm booking' },
  mark_arrived:            { worker:   'Mark your arrival at the site',  employer: 'Waiting for worker to arrive' },
  confirm_arrival:         { employer: 'Confirm worker has arrived',     worker:   'Waiting for employer to confirm your arrival' },
  mark_day_complete:       { employer: 'Mark today complete & release pay', worker: 'Waiting for employer to log today' },
  confirm_day_pay:         { worker:   'Confirm you received today\'s payment', employer: 'Waiting for worker to confirm daily payment' },
  approve_hours:           { employer: 'Review and approve work hours',  worker:   'Waiting for employer to approve hours' },
  confirm_payment:         { worker:   'Confirm you received the payment', employer: 'Waiting for worker to confirm payment' },
  resolve_dispute:         { admin:    'Dispute under admin review',     employer: 'Dispute under admin review', worker: 'Dispute under admin review' },
  review_suspicious_arrival: { admin:  'Arrival being verified',        employer: 'Worker arrival under verification', worker: 'Your arrival is being verified' },
}

const AUTO_LABELS = {
  auto_confirm_booking:   'Booking will auto-confirm',
  auto_no_show:           'Will be marked as no-show',
  auto_confirm_arrival:   'Arrival will auto-confirm',
  auto_complete_day:      'Day will auto-complete & pay released',
  auto_approve_hours:     'Hours will be auto-approved & payment released',
  auto_confirm_payment:   'Payment will be auto-confirmed',
  escalate_dispute:       'Dispute will be escalated to admin',
}

export default function PendingActionBanner({ pendingAction, role, jobId, className = '' }) {
  if (!pendingAction?.waitingFor || !pendingAction?.actionType) return null

  const { waitingFor, actionType, deadline, autoResolution } = pendingAction
  const isMyTurn   = waitingFor === role
  const actionText = ACTION_LABELS[actionType]?.[role] || ACTION_LABELS[actionType]?.[waitingFor] || actionType
  const autoText   = AUTO_LABELS[autoResolution]

  const baseStyle = isMyTurn
    ? 'bg-[#ff2400]/8 border-[#ff2400]/25 text-[#ff5533]'
    : 'bg-[#1a1a1a]  border-[#2a2a2a]   text-[#6b6b6b]'

  const Icon = isMyTurn ? AlertCircle : Clock

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${baseStyle} ${className}`}>
      <Icon size={15} className={`shrink-0 mt-0.5 ${isMyTurn ? 'text-[#ff2400]' : 'text-[#3a3a3a]'}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${isMyTurn ? 'text-white' : 'text-[#6b6b6b]'}`}>
          {actionText}
        </div>
        {autoText && deadline && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-[#3a3a3a]">{autoText} in</span>
            <CountdownTimer deadline={deadline} />
          </div>
        )}
        {!deadline && autoText && (
          <div className="text-xs text-[#3a3a3a] mt-1">{autoText}</div>
        )}
      </div>
      {isMyTurn && (
        <div className="shrink-0">
          <span className="text-[10px] font-bold text-[#ff2400] uppercase tracking-wider px-2 py-1
                           bg-[#ff2400]/10 rounded-lg border border-[#ff2400]/20">
            Your Turn
          </span>
        </div>
      )}
    </div>
  )
}
