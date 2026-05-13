import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/AuthContext'
import toast from 'react-hot-toast'
import {
  Shield, AlertCircle, Clock, CheckCircle,
  ChevronDown, ChevronUp, Loader, RefreshCw, User
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function ageLabel(raisedAt) {
  if (!raisedAt) return ''
  const hrs = Math.floor((Date.now() - new Date(raisedAt)) / 3600000)
  if (hrs < 1)  return 'Just now'
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h ago`
}

// ─── Resolve Modal ────────────────────────────────────────────────────────────
function ResolveModal({ dispute, onClose, onResolved }) {
  const [resolution, setResolution] = useState('neutral')
  const [adminNote,  setAdminNote]  = useState('')
  const [closeAs,    setCloseAs]    = useState('COMPLETED')
  const [loading,    setLoading]    = useState(false)

  const OUTCOMES = [
    {
      value: 'favour_worker',
      label: 'Favour Worker',
      desc:  'Worker was right. Full payment released. Employer −12 pts, Worker +8 pts.',
      color: 'border-emerald-500/40 bg-emerald-500/8',
      active:'text-emerald-400',
    },
    {
      value: 'favour_employer',
      label: 'Favour Employer',
      desc:  'Employer was right. Payment cancelled. Worker −12 pts, Employer +8 pts.',
      color: 'border-red-500/40 bg-red-500/8',
      active:'text-red-400',
    },
    {
      value: 'neutral',
      label: 'Neutral',
      desc:  'Both parties share responsibility. Both −3 pts. Admin decides payment.',
      color: 'border-amber-500/40 bg-amber-500/8',
      active:'text-amber-400',
    },
  ]

  async function submit() {
    if (!adminNote.trim())
      return toast.error('Please add a resolution note')
    setLoading(true)
    try {
      await api.patch(`/disputes/${dispute._id}/resolve`, {
        resolution,
        adminNote: adminNote.trim(),
        closeAs,
      })
      toast.success('Dispute resolved successfully')
      onResolved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve dispute')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#111] border border-[#222] rounded-2xl shadow-2xl animate-scale-in overflow-y-auto max-h-[90vh]">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#ff2400]/10 border border-[#ff2400]/20 flex items-center justify-center shrink-0">
              <Shield size={18} className="text-[#ff2400]" />
            </div>
            <div>
              <h3 className="font-bold text-white">Resolve Dispute</h3>
              <p className="text-xs text-[#555]">{dispute.title}</p>
            </div>
          </div>

          {/* Dispute info */}
          <div className="p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] mb-5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#444]">Raised by</span>
              <span className="text-white font-semibold capitalize">{dispute.disputeRaisedBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#444]">Worker</span>
              <span className="text-white">{dispute.worker?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#444]">Employer</span>
              <span className="text-white">{dispute.employer?.name || '—'}</span>
            </div>
            <div className="pt-1 border-t border-[#1a1a1a]">
              <span className="text-[#444]">Reason: </span>
              <span className="text-[#888] italic">"{dispute.disputeNote}"</span>
            </div>
          </div>

          {/* Outcome selection */}
          <label className="label mb-2 block">Choose Outcome *</label>
          <div className="space-y-2 mb-4">
            {OUTCOMES.map(opt => (
              <button
                key={opt.value} type="button"
                onClick={() => setResolution(opt.value)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all
                  ${resolution === opt.value ? opt.color : 'border-[#1e1e1e] bg-[#0a0a0a] hover:border-[#2a2a2a]'}`}>
                <div className={`text-sm font-bold mb-0.5 ${resolution === opt.value ? opt.active : 'text-white'}`}>
                  {opt.label}
                </div>
                <div className="text-xs text-[#555]">{opt.desc}</div>
              </button>
            ))}
          </div>

          {/* Close as */}
          <div className="mb-4">
            <label className="label">Close Job As</label>
            <div className="grid grid-cols-2 gap-2">
              {[['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']].map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => setCloseAs(val)}
                  className={`py-2 rounded-xl border text-sm font-semibold transition-all
                    ${closeAs === val
                      ? 'border-[#ff2400]/40 bg-[#ff2400]/8 text-[#ff2400]'
                      : 'border-[#1e1e1e] bg-[#0a0a0a] text-[#555] hover:border-[#2a2a2a]'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Admin note */}
          <div className="mb-5">
            <label className="label">Resolution Note *</label>
            <textarea
              className="input resize-none min-h-[80px] text-sm"
              placeholder="Explain your decision clearly — this note is sent to both parties."
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="btn-ghost flex-1 justify-center" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary flex-1 justify-center"
              onClick={submit}
              disabled={loading}>
              {loading
                ? <Loader size={14} className="animate-spin" />
                : <CheckCircle size={14} />}
              Resolve Dispute
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Dispute Detail Card ──────────────────────────────────────────────────────
function DisputeCard({ dispute, onResolve }) {
  const [expanded, setExpanded] = useState(false)
  const ageHrs = dispute.disputeRaisedAt
    ? Math.floor((Date.now() - new Date(dispute.disputeRaisedAt)) / 3600000)
    : 0
  const isCritical = ageHrs >= 72
  const isUrgent   = ageHrs >= 48 && !isCritical

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all
      ${isCritical ? 'border-red-500/30'   :
        isUrgent   ? 'border-amber-500/30' :
                     'border-[#1e1e1e]'}`}>

      {/* Status bar */}
      <div className={`h-1 w-full
        ${isCritical ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-[#ff2400]'}`} />

      <div className="p-4 bg-[#111]">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-white text-sm">{dispute.title}</span>
              {isCritical && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                  🚨 Critical — 72h+
                </span>
              )}
              {isUrgent && !isCritical && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  ⚠ Urgent — 48h+
                </span>
              )}
            </div>
            <div className="text-xs text-[#555]">
              Raised by <span className="text-[#888] font-semibold capitalize">{dispute.disputeRaisedBy}</span>
              {' · '}{ageLabel(dispute.disputeRaisedAt)}
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[#444] hover:text-[#888] transition-colors shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Parties row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { role: 'Worker', data: dispute.worker, color: 'bg-emerald-500' },
            { role: 'Employer', data: dispute.employer, color: 'bg-blue-500' },
          ].map(({ role, data, color }) => (
            <div key={role} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className={`w-6 h-6 rounded-lg ${color}/20 flex items-center justify-center shrink-0`}>
                <User size={12} className={`${color.replace('bg-', 'text-')}`} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-[#444] font-semibold">{role}</div>
                <div className="text-xs text-white font-semibold truncate">{data?.name || '—'}</div>
                <div className="text-[10px] text-[#555]">Score: {data?.honourScore ?? '—'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Dispute reason */}
        <div className="p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] mb-3">
          <div className="text-[10px] text-[#333] font-semibold uppercase tracking-wider mb-1">
            Dispute Reason
          </div>
          <div className="text-xs text-[#777] leading-relaxed italic">
            "{dispute.disputeNote || 'No reason provided'}"
          </div>
        </div>

        {/* Expanded: offence history + timeline */}
        {expanded && (
          <div className="space-y-3 mb-3 animate-fade-in">

            {/* Offence histories */}
            {[
              { label: 'Worker Offence History', data: dispute.workerOffenceHistory },
              { label: 'Employer Offence History', data: dispute.employerOffenceHistory },
            ].map(({ label, data }) => (
              data?.length > 0 && (
                <div key={label} className="p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
                  <div className="text-[10px] text-[#333] font-semibold uppercase tracking-wider mb-2">{label}</div>
                  <div className="space-y-1.5">
                    {data.slice(0, 4).map((o, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-[#555]">{o.offenceType?.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
                            ${o.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                              o.severity === 'minor'   ? 'bg-orange-500/10 text-orange-400' :
                                                         'bg-red-500/10 text-red-400'}`}>
                            {o.severity}
                          </span>
                          <span className="text-[#444]">{o.pointsDelta || 0} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}

            {/* Job timeline */}
            {dispute.timeline?.length > 0 && (
              <div className="p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
                <div className="text-[10px] text-[#333] font-semibold uppercase tracking-wider mb-2">
                  Job Timeline
                </div>
                <div className="space-y-1.5">
                  {[...dispute.timeline].reverse().slice(0, 5).map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#333] mt-1.5 shrink-0" />
                      <div>
                        <span className="text-[#666]">{e.event?.replace(/_/g, ' ')}</span>
                        {e.actor === 'system' && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#333]">AUTO</span>
                        )}
                        <div className="text-[#333] text-[10px]">{fmt(e.ts)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resolve button */}
        <button
          onClick={() => onResolve(dispute)}
          className="btn-primary w-full justify-center text-sm">
          <Shield size={14} /> Resolve This Dispute
        </button>
      </div>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function AdminDisputePanel() {
  const [disputes, setDisputes]   = useState([])
  const [resolved, setResolved]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [tab,      setTab]        = useState('open')
  const [modal,    setModal]      = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [openRes, closedRes] = await Promise.all([
        api.get('/disputes?resolved=false'),
        api.get('/disputes?resolved=true'),
      ])
      setDisputes(openRes.data.disputes || [])
      setResolved(closedRes.data.disputes || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load disputes')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const shown = tab === 'open' ? disputes : resolved

  return (
    <div className="animate-fade-in w-full space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Dispute Management</h1>
          <p className="text-xs text-[#555] mt-0.5">Review and resolve platform disputes</p>
        </div>
        <button onClick={load} className="btn-ghost p-2" title="Refresh">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Open Disputes',
            value:  disputes.length,
            color: 'text-[#ff2400]',
            bg:    'bg-[#ff2400]/8 border-[#ff2400]/20',
          },
          {
            label: 'Critical (72h+)',
            value:  disputes.filter(d =>
              d.disputeRaisedAt &&
              (Date.now() - new Date(d.disputeRaisedAt)) > 72 * 3600000
            ).length,
            color: 'text-red-400',
            bg:    'bg-red-500/8 border-red-500/20',
          },
          {
            label: 'Resolved',
            value:  resolved.length,
            color: 'text-emerald-400',
            bg:    'bg-emerald-500/8 border-emerald-500/20',
          },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`}>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#555] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'open',     label: `Open (${disputes.length})` },
          { key: 'resolved', label: `Resolved (${resolved.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all
              ${tab === t.key
                ? 'bg-[#ff2400]/10 border-[#ff2400]/30 text-[#ff2400]'
                : 'bg-[#0a0a0a] border-[#1a1a1a] text-[#555] hover:border-[#2a2a2a]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#ff2400] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="card text-center py-16">
          <Shield size={32} className="text-[#2a2a2a] mx-auto mb-3" />
          <div className="font-semibold text-[#3a3a3a]">
            {tab === 'open' ? 'No open disputes' : 'No resolved disputes yet'}
          </div>
          <div className="text-xs text-[#2a2a2a] mt-1">
            {tab === 'open' ? 'Disputes raised by users will appear here' : ''}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map(d => (
            <DisputeCard
              key={d._id}
              dispute={d}
              onResolve={tab === 'open' ? setModal : () => {}}
            />
          ))}
        </div>
      )}

      {/* Resolve modal */}
      {modal && (
        <ResolveModal
          dispute={modal}
          onClose={() => setModal(null)}
          onResolved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
