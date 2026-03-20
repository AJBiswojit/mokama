import { AlertCircle, XCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../api/AuthContext'

/**
 * Shows a banner based on account approval status.
 * Place at top of Overview in Worker and Employer dashboards.
 */
export default function StatusBanner() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user || user.status === 'approved' || !user.status) return null

  if (user.status === 'rejected') {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
        <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-red-400 text-sm">Account Rejected</div>
          <div className="text-xs text-red-400/70 mt-0.5">
            Your account has been rejected by our team. Please contact{' '}
            <a href="mailto:support@mokama.in" className="underline">support@mokama.in</a>{' '}
            for more information.
          </div>
        </div>
      </div>
    )
  }

  if (user.status === 'pending') {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
        <Clock size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-amber-400 text-sm">Account Under Review</div>
          <div className="text-xs text-amber-400/70 mt-0.5">
            Your account is being reviewed by our team. Job posting and hiring features
            will be unlocked once approved. You can still complete your profile.
          </div>
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
            bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Pending
          </span>
        </div>
      </div>
    )
  }

  return null
}
