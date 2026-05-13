import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/AuthContext'
import { useAuth } from '../../api/AuthContext'
import toast from 'react-hot-toast'
import {
  Shield, AlertCircle, CheckCircle, Clock, ChevronRight,
  Loader, Briefcase, Inbox, Users
} from 'lucide-react'
import { formatDate } from '../../utils/honour'
import CountdownTimer from '../../components/CountdownTimer'


const STATUS_CONFIG = {
  RAISED: { label: 'Under Review', color: 'text-amber-400  bg-amber-500/10  border-amber-500/20' },
  UNDER_REVIEW: { label: 'Under Review', color: 'text-amber-400  bg-amber-500/10  border-amber-500/20' },
  ESCALATED: { label: 'Escalated', color: 'text-red-400    bg-red-500/10    border-red-500/20' },
  RESOLVED: { label: 'Resolved', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  DISMISSED: { label: 'Dismissed', color: 'text-[#555]     bg-[#1a1a1a]     border-[#222]' },
  NONE: { label: 'No Dispute', color: 'text-[#555]     bg-[#1a1a1a]     border-[#222]' },
}

// ─── Raise Dispute Modal ──────────────────────────────────────────────────────
function RaiseDisputeModal({ job, onClose, onSuccess }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!reason.trim()) return toast.error('Please describe the issue')
    if (reason.trim().length < 20) return toast.error('Please provide more detail (at least 20 characters)')
    setLoading(true)
    try {
      await api.post(`/disputes/jobs/${job._id}/raise`, { reason: reason.trim() })
      toast.success('Dispute raised. Admin will review within 72 hours.')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise dispute')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Shield size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Raise a Dispute</h3>
            <p className="text-xs text-[#555]">{job.title}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/6 border border-amber-500/20 mb-4">
          <p className="text-xs text-amber-400/80 leading-relaxed">
            Disputes freeze the job and restrict certain actions for both parties
            until admin resolves it. Use this only for genuine issues.
          </p>
        </div>

        <div className="mb-4">
          <label className="label">Describe the issue *</label>
          <textarea
            className="input resize-none min-h-[110px] text-sm"
            placeholder="Explain what went wrong — e.g. employer refused to pay, worker didn't complete the work, incorrect hours recorded, etc."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="text-xs text-[#333] mt-1 text-right">{reason.length} chars (min 20)</div>
        </div>

        <div className="flex gap-3">
          <button className="btn-ghost flex-1 justify-center" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1 justify-center"
            style={{ background: '#dc2626' }}
            onClick={submit}
            disabled={loading}>
            {loading ? <Loader size={14} className="animate-spin" /> : <Shield size={14} />}
            Raise Dispute
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dispute Card ──────────────────────────────────────────────────────────────
function DisputeCard({ job, role, onRaise }) {
  const ds = job.disputeStatus || 'NONE'
  const cfg = STATUS_CONFIG[ds] || STATUS_CONFIG.NONE
  const canRaise = ['ACTIVE', 'WORK_IN_PROGRESS', 'WORK_DONE', 'PAYMENT_PENDING'].includes(job.status)
    && ds === 'NONE'

  return (
    <div className="card hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-white text-sm">{job.title}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <div className="text-xs text-[#555]">
            {role === 'worker' ? `Employer: ${job.employer?.name}` : `Worker: ${job.worker?.name || 'Unassigned'}`}
            {' · '}{formatDate(job.startDate)}
          </div>
        </div>
      </div>

      {ds !== 'NONE' && (
        <div className="space-y-2 mb-3 p-3 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e]">
          {job.disputeNote && (
            <div>
              <div className="text-[10px] text-[#333] font-semibold uppercase tracking-wider mb-1">Dispute Reason</div>
              <div className="text-xs text-[#666] leading-relaxed">{job.disputeNote}</div>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#333]">Raised {formatDate(job.disputeRaisedAt)}</span>
            {ds === 'RAISED' && job.pendingAction?.deadline && (
              <CountdownTimer deadline={job.pendingAction.deadline} label="Escalates in" />
            )}
          </div>
          {job.disputeResolution && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle size={11} />
              Resolved: {job.disputeResolution.replace(/_/g, ' ')}
            </div>
          )}
        </div>
      )}

      {canRaise && (
        <button
          onClick={() => onRaise(job)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                     border border-red-500/25 text-red-400 text-xs font-semibold
                     hover:bg-red-500/8 transition-all">
          <Shield size={13} /> Raise a Dispute
        </button>
      )}

      {ds === 'RAISED' && (
        <div className="flex items-center gap-2 text-xs text-amber-400/70 mt-2">
          <Clock size={12} /> Under admin review — expected resolution within 72 hours
        </div>
      )}
      {ds === 'ESCALATED' && (
        <div className="flex items-center gap-2 text-xs text-red-400 mt-2">
          <AlertCircle size={12} /> Escalated — admin team has been alerted
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DisputeCenter() {
  const { user } = useAuth()
  const role = user?.role === 'employer' ? 'employer' : 'worker'

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const endpoint = role === 'worker' ? '/jobs/worker' : '/jobs/employer'
      const res = await api.get(endpoint)
      // Show only jobs that have or can have disputes
      const relevant = (res.data.jobs || []).filter(j =>
        ['ACTIVE', 'WORK_IN_PROGRESS', 'WORK_DONE', 'PAYMENT_PENDING', 'DISPUTED', 'COMPLETED'].includes(j.status)
        || j.disputeStatus !== 'NONE'
      )
      setJobs(relevant)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [role])

  useEffect(() => { load() }, [load])

  const active = jobs.filter(j => ['RAISED', 'UNDER_REVIEW', 'ESCALATED'].includes(j.disputeStatus))
  const resolved = jobs.filter(j => ['RESOLVED', 'DISMISSED'].includes(j.disputeStatus))
  const eligible = jobs.filter(j => j.disputeStatus === 'NONE'
    && ['ACTIVE', 'WORK_IN_PROGRESS', 'WORK_DONE', 'PAYMENT_PENDING'].includes(j.status))

  return (
    <div className="animate-fade-in w-full space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Dispute Center</h1>
          <p className="text-sm text-[#555] mt-0.5">Manage and track disputes on your jobs</p>
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-[#111] border border-[#1e1e1e] space-y-2">
        <div className="text-sm font-semibold text-white">How disputes work</div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-[#555]">
          {[
            ['⚖️ Raise', 'If something goes wrong during a job — payment not received, work not done, incorrect hours'],
            ['🔍 Review', 'Admin reviews both sides within 72 hours. Job is frozen — no payments released until resolved'],
            ['✅ Resolve', 'Admin decides outcome. Honour Scores adjusted. Restrictions automatically lifted'],
          ].map(([t, d]) => (
            <div key={t} className="p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className="font-semibold text-white mb-1">{t}</div>
              <div>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#ff2400] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active disputes */}
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Active Disputes ({active.length})
              </h2>
              <div className="space-y-3">
                {active.map(j => (
                  <DisputeCard key={j._id} job={j} role={role} onRaise={setModal} />
                ))}
              </div>
            </div>
          )}

          {/* Eligible for dispute */}
          {eligible.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff2400]" />
                Active Jobs
              </h2>
              <div className="space-y-3">
                {eligible.map(j => (
                  <DisputeCard key={j._id} job={j} role={role} onRaise={setModal} />
                ))}
              </div>
            </div>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Resolved ({resolved.length})
              </h2>
              <div className="space-y-3">
                {resolved.map(j => (
                  <DisputeCard key={j._id} job={j} role={role} onRaise={setModal} />
                ))}
              </div>
            </div>
          )}

          {active.length === 0 && eligible.length === 0 && resolved.length === 0 && (
            <div className="card text-center py-16">
              <Shield size={32} className="text-[#2a2a2a] mx-auto mb-3" />
              <div className="font-semibold text-[#3a3a3a]">No disputes</div>
              <div className="text-xs text-[#2a2a2a] mt-1">Disputes appear here when raised on active jobs</div>
            </div>
          )}
        </div>
      )}
      {modal && (
        <RaiseDisputeModal
          job={modal}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}

