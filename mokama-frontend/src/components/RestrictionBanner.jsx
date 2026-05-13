import { useState, useEffect } from 'react'
import { Shield, X, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../api/AuthContext'

export default function RestrictionBanner({ role }) {
  const [data,    setData]    = useState(null)
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/restrictions/status')
      .then(r => { if (r.data.hasRestrictions) setData(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return null

  const blocked = role === 'worker'
    ? [
        !data.restrictions.canAcceptNewJobs   && 'Accept new job requests',
        !data.restrictions.canReceivePayments && 'Receive payments on other jobs',
      ].filter(Boolean)
    : [
        !data.restrictions.canCreateNewJobs   && 'Post new jobs',
        !data.restrictions.canReleasePayments && 'Release payments on other jobs',
      ].filter(Boolean)

  if (!blocked.length) return null

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 overflow-hidden mb-4">
      <div className="flex items-center gap-3 px-4 py-3">
        <Shield size={15} className="text-amber-400 shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-semibold text-amber-300">Account Restriction Active</span>
          <span className="text-xs text-amber-500/70 ml-2">Due to an open dispute</span>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-amber-500/60 hover:text-amber-400">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-amber-500/10 pt-3 space-y-3">
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">Temporarily blocked</div>
            {blocked.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-amber-500/80 mb-1">
                <X size={11} className="text-amber-500 shrink-0" /> {b}
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e]">
            <div className="text-xs text-[#555]">
              You can still browse, view history, and contact support.
              Restrictions lift automatically once the dispute is resolved.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
