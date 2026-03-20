import { Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/AuthContext'
import DashboardLayout, { HonourBadge, StatusBadge } from '../../components/DashboardLayout'
import Pagination from '../../components/Pagination'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, Briefcase, AlertCircle, Shield,
  TrendingDown, TrendingUp, RefreshCw, Search, XCircle, CheckCircle,
  Loader, Clock, UserCheck, Ban, ChevronRight, Mail, Trash2, RotateCcw, Activity, EyeOff, Eye
} from 'lucide-react'
import { formatDate } from '../../utils/honour'

const NAV = [
  { href: '/admin/dashboard',           label: 'Overview',      icon: <LayoutDashboard size={16} /> },
  { href: '/admin/dashboard/approvals', label: 'Approvals',     icon: <UserCheck size={16} /> },
  { href: '/admin/dashboard/workers',   label: 'Workers',       icon: <Users size={16} /> },
  { href: '/admin/dashboard/employers', label: 'Employers',     icon: <Briefcase size={16} /> },
  { href: '/admin/dashboard/jobs',      label: 'Jobs',          icon: <AlertCircle size={16} /> },
  { href: '/admin/dashboard/deleted',   label: 'Deleted Users', icon: <Trash2 size={16} /> },
  { href: '/admin/dashboard/activity',  label: 'Activity Log',  icon: <Shield size={16} /> },
]

/* ─── Helpers ─── */
function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" /></div>
}
function EmptyState({ icon, text }) {
  return <div className="card text-center py-14"><div className="text-[#2a2a2a] flex justify-center mb-3">{icon}</div><div className="text-[#4a4a4a] text-sm">{text}</div></div>
}
function StatusPill({ status }) {
  const cfg = {
    pending:  { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   icon: <Clock size={10} />,       label: 'Pending' },
    approved: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={10} />, label: 'Approved' },
    rejected: { cls: 'bg-red-500/10 text-red-400 border-red-500/20',         icon: <Ban size={10} />,         label: 'Rejected' },
  }[status] || { cls: 'bg-[#2a2a2a] text-[#6b6b6b] border-[#333]', icon: null, label: status }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

/* ─── Reject Modal ─── */
function RejectModal({ title, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-modal animate-slide-up">
        <h3 className="font-bold text-white text-lg mb-1">{title}</h3>
        <div className="mb-4 mt-3">
          <label className="label">Reason <span className="text-[#4a4a4a]">(optional)</span></label>
          <textarea className="input min-h-[80px] resize-none" placeholder="Enter reason..."
            value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => onConfirm(reason)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/15 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/25 transition-all text-sm"
            disabled={loading}>
            {loading ? <Loader size={14} className="animate-spin" /> : <Ban size={14} />} Confirm
          </button>
          <button onClick={onCancel} className="flex-1 btn-ghost justify-center">Cancel</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Delete Confirm Modal ─── */
function DeleteModal({ name, onConfirm, onCancel, loading }) {
  const [note, setNote] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#141414] border border-red-500/20 rounded-2xl p-6 w-full max-w-md shadow-modal animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Delete Profile</h3>
            <p className="text-xs text-[#6b6b6b] mt-0.5">
              Deleting <span className="text-white">{name}</span>. This is a soft delete — data is preserved.
            </p>
          </div>
        </div>
        <div className="mb-4">
          <label className="label">Reason <span className="text-[#4a4a4a]">(optional)</span></label>
          <textarea className="input min-h-[70px] resize-none" placeholder="Why is this profile being deleted?"
            value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => onConfirm(note)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/15 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/25 transition-all text-sm"
            disabled={loading}>
            {loading ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete Profile
          </button>
          <button onClick={onCancel} className="flex-1 btn-ghost justify-center">Cancel</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Honour Score Controls ─── */
function HonourControls({ userId, userType, currentScore, acting, onPenalize, onIncrease }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onIncrease(userId, userType)}
        disabled={!!acting || currentScore >= 100}
        className="btn-ghost text-xs p-2 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30"
        title="Increase honour +5">
        {acting === userId + 'inc' ? <Loader size={13} className="animate-spin" /> : <TrendingUp size={13} />}
      </button>
      <span className="text-xs text-[#4a4a4a] font-mono w-8 text-center">{currentScore}</span>
      <button onClick={() => onPenalize(userId, userType)}
        disabled={!!acting || currentScore <= 0}
        className="btn-ghost text-xs p-2 text-[#fb923c] hover:bg-[#f97316]/10 disabled:opacity-30"
        title="Penalise honour -5">
        {acting === userId + 'p' ? <Loader size={13} className="animate-spin" /> : <TrendingDown size={13} />}
      </button>
    </div>
  )
}

// ─────────────── Overview ───────────────
function Overview() {
  const [stats, setStats] = useState(null)
  const [pending, setPending] = useState({ workers: 0, employers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/admin/stats'), api.get('/admin/pending-users')])
      .then(([s, p]) => {
        setStats(s.data.stats)
        setPending({ workers: (p.data.workers || []).length, employers: (p.data.employers || []).length })
      })
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const pendingTotal = pending.workers + pending.employers
  const deletedTotal = (stats?.deletedWorkers || 0) + (stats?.deletedEmployers || 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Shield size={22} className="text-violet-400" /> Admin Panel
        </h1>
        <p className="text-[#6b6b6b] text-sm mt-1">Platform overview and controls</p>
      </div>

      {/* Pending alert */}
      {pendingTotal > 0 && (
        <Link to="/admin/dashboard/approvals"
          className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl hover:bg-amber-500/15 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-400">
                {pendingTotal} account{pendingTotal !== 1 ? 's' : ''} waiting for approval
              </div>
              <div className="text-xs text-amber-400/60 mt-0.5">
                {pending.workers} worker{pending.workers !== 1 ? 's' : ''} · {pending.employers} employer{pending.employers !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Deleted alert */}
      {deletedTotal > 0 && (
        <Link to="/admin/dashboard/deleted"
          className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/15 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-red-400">{deletedTotal} deleted profile{deletedTotal !== 1 ? 's' : ''}</div>
              <div className="text-xs text-red-400/60 mt-0.5">{stats?.deletedWorkers} worker{stats?.deletedWorkers !== 1 ? 's' : ''} · {stats?.deletedEmployers} employer{stats?.deletedEmployers !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-red-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Workers',   value: stats?.workers,       color: 'bg-[#f97316]/10 text-[#f97316]',    icon: <Users size={20} /> },
          { label: 'Total Employers', value: stats?.employers,     color: 'bg-violet-500/10 text-violet-400',   icon: <Briefcase size={20} /> },
          { label: 'Total Jobs',      value: stats?.jobs,          color: 'bg-[#f97316]/10 text-[#fb923c]',    icon: <AlertCircle size={20} /> },
          { label: 'Completed Jobs',  value: stats?.completedJobs, color: 'bg-emerald-500/10 text-emerald-400', icon: <CheckCircle size={20} /> },
          { label: 'Active Jobs',     value: stats?.activeJobs,    color: 'bg-sky-500/10 text-sky-400',         icon: <RefreshCw size={20} /> },
        ].map(c => (
          <div key={c.label} className="card hover:shadow-card-hover transition-all">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>{c.icon}</div>
            <div className="text-2xl font-extrabold text-white">{c.value ?? 0}</div>
            <div className="text-xs text-[#6b6b6b] mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────── Approvals ───────────────
function ApprovalsPanel() {
  const [workers, setWorkers]   = useState([])
  const [employers, setEmployers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [tab, setTab] = useState('workers')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/pending-users')
      setWorkers(res.data.workers || [])
      setEmployers(res.data.employers || [])
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load('', 1) }, [])

  const approve = async (id, type) => {
    setActing(id + 'approve')
    try {
      await api.patch(`/admin/users/${type}/${id}/approve`)
      toast.success('Approved!')
      load()
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  const confirmReject = async (reason) => {
    if (!rejectModal) return
    setActing(rejectModal.id + 'reject')
    try {
      await api.patch(`/admin/users/${rejectModal.type}/${rejectModal.id}/reject`, { reason })
      toast.success('Rejected')
      setRejectModal(null)
      load()
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  const list = tab === 'workers' ? workers : employers
  const type = tab === 'workers' ? 'worker' : 'employer'

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <UserCheck size={20} className="text-amber-400" /> Pending Approvals
          </h1>
          <p className="text-xs text-[#6b6b6b] mt-0.5">{workers.length} workers · {employers.length} employers</p>
        </div>
        <button onClick={load} className="btn-ghost p-2"><RefreshCw size={15} /></button>
      </div>
      <div className="flex gap-2 p-1 bg-[#1a1a1a] rounded-xl w-fit">
        {['workers', 'employers'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
              ${tab === t ? 'bg-[#f97316] text-white' : 'text-[#6b6b6b] hover:text-white'}`}>
            {t === 'workers' ? 'Workers' : 'Employers'}
            {(t === 'workers' ? workers : employers).length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {(t === 'workers' ? workers : employers).length}
              </span>
            )}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : list.length === 0
        ? <EmptyState icon={<UserCheck size={32} />} text={`No pending ${tab}`} />
        : (
          <div className="space-y-3">
            {list.map(u => (
              <div key={u._id} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0
                      ${tab === 'workers' ? 'bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316]' : 'bg-violet-500/10 border border-violet-500/20 text-violet-400'}`}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-xs text-[#6b6b6b] flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {u.email && <span className="flex items-center gap-1"><Mail size={11} />{u.email}</span>}
                        <span>+91 {u.mobile}</span>
                        {u.workerTypeName && <span>{u.workerTypeName}</span>}
                        {u.employerCategoryName && <span>{u.employerCategoryName}</span>}
                        <HonourBadge score={u.honourScore} small />
                        <StatusPill status={u.status} />
                      </div>
                      <div className="text-xs text-[#4a4a4a] mt-1">Registered: {formatDate(u.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => approve(u._id, type)} disabled={!!acting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                      {acting === u._id + 'approve' ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />} Approve
                    </button>
                    <button onClick={() => setRejectModal({ id: u._id, type, name: u.name })} disabled={!!acting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50">
                      <Ban size={13} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      {rejectModal && (
        <RejectModal
          title={`Reject ${rejectModal.name}`}
          loading={acting === rejectModal.id + 'reject'}
          onConfirm={confirmReject}
          onCancel={() => setRejectModal(null)} />
      )}
    </div>
  )
}

// ─────────────── Shared User List ───────────────
function UserPanel({ userType }) {
  const isWorker = userType === 'worker'
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [acting, setActing]     = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [page, setPage]         = useState(1)
  const [meta, setMeta]         = useState({ total: 0, totalPages: 1, limit: 15 })

  const apiPath = isWorker ? '/admin/workers' : '/admin/employers'

  const load = useCallback(async (q = '', p = 1) => {
    setLoading(true)
    try {
      const res = await api.get(`${apiPath}?search=${q}&limit=15&page=${p}`)
      setUsers((isWorker ? res.data.workers : res.data.employers) || [])
      setMeta({ total: res.data.total || 0, totalPages: res.data.totalPages || 1, limit: 15 })
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }, [apiPath, isWorker])

  useEffect(() => { load('', 1) }, [])

  const toggle = async (id) => {
    setActing(id + 'toggle')
    try {
      const res = await api.patch(`/admin/users/${userType}/${id}/toggle`)
      toast.success(res.data.message); load(search, page)
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  const penalize = async (id) => {
    setActing(id + 'p')
    try {
      const res = await api.post('/admin/penalize', { userId: id, userType, amount: 5 })
      toast.success(res.data.message); load(search, page)
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  const increase = async (id) => {
    setActing(id + 'inc')
    try {
      const res = await api.post('/admin/increase-honour', { userId: id, userType, amount: 5 })
      toast.success(res.data.message); load(search, page)
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  const toggleAvail = async (id, current) => {
    if (!isWorker) return
    setActing(id + 'av')
    try {
      await api.patch(`/admin/workers/${id}/availability`, { availabilityStatus: !current })
      toast.success('Availability updated'); load(search, page)
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  const approve = async (id) => {
    setActing(id + 'approve')
    try {
      await api.patch(`/admin/users/${userType}/${id}/approve`)
      toast.success('Approved!'); load(search, page)
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  const confirmReject = async (reason) => {
    setActing(rejectModal + 'reject')
    try {
      await api.patch(`/admin/users/${userType}/${rejectModal}/reject`, { reason })
      toast.success('Rejected'); setRejectModal(null); load(search, page)
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  const confirmDelete = async (note) => {
    setActing(deleteModal.id + 'delete')
    try {
      await api.delete(`/admin/users/${userType}/${deleteModal.id}`, { data: { note } })
      toast.success('Profile deleted'); setDeleteModal(null); load(search, page)
    } catch { toast.error('Failed to delete') }
    finally { setActing(null) }
  }

  const borderClass = (u) => {
    if (u.status === 'pending')  return 'border-amber-500/20'
    if (u.status === 'rejected') return 'border-red-500/20'
    return 'border-[#2a2a2a]'
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-extrabold text-white flex-1">{isWorker ? 'Workers' : 'Employers'}</h1>
        <div className="flex gap-2">
          <input className="input w-48 text-xs" placeholder="Search name/mobile/email..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(search, 1) } }} />
          <button className="btn-ghost p-2" onClick={() => { setPage(1); load(search, 1) }}><Search size={16} /></button>
        </div>
      </div>

      {loading ? <Spinner /> : users.length === 0
        ? <EmptyState icon={isWorker ? <Users size={32} /> : <Briefcase size={32} />} text={`No ${isWorker ? 'workers' : 'employers'} found`} />
        : (
          <div className="space-y-3">
            {users.map(u => (
              <div key={u._id} className={`card border ${borderClass(u)}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0
                    ${isWorker ? 'bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316]' : 'bg-violet-500/10 border border-violet-500/20 text-violet-400'}`}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm flex items-center gap-2 flex-wrap">
                      {u.name} <StatusPill status={u.status} />
                      {!u.isActive && <span className="badge bg-red-500/10 text-red-400 border border-red-500/20">Disabled</span>}
                    </div>
                    <div className="text-xs text-[#6b6b6b] flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span>+91 {u.mobile}</span>
                      {u.email && <span className="flex items-center gap-1"><Mail size={10} />{u.email}</span>}
                      <span>{isWorker ? (u.workerTypeName || '—') : (u.employerCategoryName || '—')}</span>
                      {isWorker && u.availabilityStatus && (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {/* Approve/reject for pending */}
                    {u.status === 'pending' && <>
                      <button onClick={() => approve(u._id)} disabled={!!acting}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/20 transition-all">
                        {acting === u._id + 'approve' ? <Loader size={11} className="animate-spin" /> : <CheckCircle size={11} />} Approve
                      </button>
                      <button onClick={() => setRejectModal(u._id)} disabled={!!acting}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-all">
                        <Ban size={11} /> Reject
                      </button>
                    </>}
                    {u.status === 'rejected' && (
                      <button onClick={() => approve(u._id)} disabled={!!acting}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/20 transition-all">
                        {acting === u._id + 'approve' ? <Loader size={11} className="animate-spin" /> : <CheckCircle size={11} />} Re-approve
                      </button>
                    )}
                    {/* Availability (worker only) */}
                    {isWorker && (
                      <button onClick={() => toggleAvail(u._id, u.availabilityStatus)}
                        disabled={acting === u._id + 'av'}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${u.availabilityStatus ? 'bg-emerald-500' : 'bg-[#2a2a2a]'}`}>
                        {acting === u._id + 'av' ? <Loader size={10} className="animate-spin mx-auto text-white" />
                          : <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${u.availabilityStatus ? 'translate-x-4' : 'translate-x-1'}`} />}
                      </button>
                    )}
                    {/* Honour score controls */}
                    <HonourControls
                      userId={u._id} userType={userType}
                      currentScore={u.honourScore} acting={acting}
                      onPenalize={penalize} onIncrease={increase} />
                    {/* Enable/Disable */}
                    <button onClick={() => toggle(u._id)} disabled={acting === u._id + 'toggle'}
                      className={`btn-ghost text-xs p-2 ${u.isActive ? 'text-red-500 hover:bg-red-500/10' : 'text-[#f97316] hover:bg-[#f97316]/10'}`}>
                      {acting === u._id + 'toggle' ? <Loader size={13} className="animate-spin" /> : u.isActive ? <XCircle size={13} /> : <CheckCircle size={13} />}
                    </button>
                    {/* Delete */}
                    <button onClick={() => setDeleteModal({ id: u._id, name: u.name })} disabled={!!acting}
                      className="btn-ghost text-xs p-2 text-red-500 hover:bg-red-500/10" title="Delete profile">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total}
          limit={meta.limit} onPage={(p) => { setPage(p); load(search, p) }} />
      )}

      {rejectModal && (
        <RejectModal title="Reject User" loading={acting === rejectModal + 'reject'}
          onConfirm={confirmReject} onCancel={() => setRejectModal(null)} />
      )}
      {deleteModal && (
        <DeleteModal name={deleteModal.name} loading={acting === deleteModal.id + 'delete'}
          onConfirm={confirmDelete} onCancel={() => setDeleteModal(null)} />
      )}
    </div>
  )
}

// ─────────────── Deleted Users Panel ───────────────
function DeletedPanel() {
  const [workers, setWorkers]     = useState([])
  const [employers, setEmployers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState(null)
  const [tab, setTab]             = useState('workers')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/deleted-users')
      setWorkers(res.data.workers || [])
      setEmployers(res.data.employers || [])
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load('', 1) }, [])

  const restore = async (id, type) => {
    setActing(id + 'restore')
    try {
      await api.patch(`/admin/users/${type}/${id}/restore`)
      toast.success('Profile restored!')
      load()
    } catch { toast.error('Failed to restore') }
    finally { setActing(null) }
  }

  const list = tab === 'workers' ? workers : employers
  const type = tab === 'workers' ? 'worker' : 'employer'

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Trash2 size={20} className="text-red-400" /> Deleted Profiles
          </h1>
          <p className="text-xs text-[#6b6b6b] mt-0.5">
            Soft deleted — data preserved. Can be restored.
          </p>
        </div>
        <button onClick={load} className="btn-ghost p-2"><RefreshCw size={15} /></button>
      </div>

      <div className="flex gap-2 p-1 bg-[#1a1a1a] rounded-xl w-fit">
        {['workers', 'employers'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
              ${tab === t ? 'bg-red-500/80 text-white' : 'text-[#6b6b6b] hover:text-white'}`}>
            {t === 'workers' ? 'Workers' : 'Employers'}
            {(t === 'workers' ? workers : employers).length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {(t === 'workers' ? workers : employers).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : list.length === 0
        ? <EmptyState icon={<Trash2 size={32} />} text={`No deleted ${tab}`} />
        : (
          <div className="space-y-3">
            {list.map(u => (
              <div key={u._id} className="bg-[#141414] border border-red-500/15 rounded-2xl p-5 opacity-80">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400 font-bold text-sm shrink-0">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#a3a3a3] flex items-center gap-2 flex-wrap">
                        {u.name}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-500/10 text-red-400 border-red-500/20">
                          <Trash2 size={10} /> Deleted
                        </span>
                        <StatusPill status={u.status} />
                      </div>
                      <div className="text-xs text-[#6b6b6b] flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        <span>+91 {u.mobile}</span>
                        {u.email && <span className="flex items-center gap-1"><Mail size={10} />{u.email}</span>}
                        <span>{tab === 'workers' ? (u.workerTypeName || '—') : (u.employerCategoryName || '—')}</span>
                        <HonourBadge score={u.honourScore} small />
                      </div>
                      {u.deleteNote && (
                        <div className="text-xs text-red-400/60 mt-1">
                          Reason: {u.deleteNote}
                        </div>
                      )}
                      <div className="text-xs text-[#4a4a4a] mt-0.5">
                        Deleted: {formatDate(u.deletedAt)}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => restore(u._id, type)} disabled={acting === u._id + 'restore'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl hover:bg-emerald-500/20 transition-all shrink-0">
                    {acting === u._id + 'restore' ? <Loader size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

// ─────────────── Jobs Panel ───────────────
function JobsPanel() {
  const [jobs, setJobs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [acting, setActing]     = useState(null)

  const load = useCallback(async (s = '', hidden = false) => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/jobs?status=${s}&limit=50`)
      const all = res.data.jobs || []
      setJobs(hidden ? all : all.filter(j => !j.isHidden))
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load('', 1) }, [])

  const forceClose = async (id) => {
    setActing(id)
    try {
      await api.patch(`/admin/jobs/${id}/force-close`, { note: 'Admin force closed' })
      toast.success('Job force closed'); load(statusFilter, showHidden)
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  const toggleHide = async (id) => {
    setActing(id + 'h')
    try {
      const res = await api.patch(`/admin/jobs/${id}/toggle-hidden`)
      toast.success(res.data.message); load(statusFilter, showHidden)
    } catch { toast.error('Failed') }
    finally { setActing(null) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-extrabold text-white flex-1">All Jobs</h1>
        <select className="input w-44 text-xs" value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); load(e.target.value, showHidden) }}>
          {['', 'OPEN', 'REQUEST_SENT', 'ACCEPTED', 'WORKING', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED']
            .map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <button
          onClick={() => { setShowHidden(h => { load(statusFilter, !h); return !h }) }}
          className={`btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 ${showHidden ? 'text-amber-400' : 'text-[#6b6b6b]'}`}>
          {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          {showHidden ? 'Hide Hidden' : 'Show Hidden'}
        </button>
        <button className="btn-ghost p-2" onClick={() => load(statusFilter, showHidden)}><RefreshCw size={15} /></button>
      </div>
      {loading ? <Spinner /> : jobs.length === 0
        ? <EmptyState icon={<AlertCircle size={32} />} text="No jobs found" />
        : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job._id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-white">{job.title}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="text-xs text-[#6b6b6b] flex flex-wrap gap-3">
                      <span>Employer: {job.employer?.name || '—'}</span>
                      <span>Worker: {job.worker?.name || 'None'}</span>
                      <span>₹{job.wage}/day</span>
                      <span>{job.pincode}</span>
                      <span>{formatDate(job.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {job.isHidden && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-lg">
                        <EyeOff size={11} /> Hidden
                      </span>
                    )}
                    <button onClick={() => toggleHide(job._id)} disabled={!!acting}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0
                        ${job.isHidden
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'}`}>
                      {acting === job._id + 'h' ? <Loader size={13} className="animate-spin" /> : job.isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                      {job.isHidden ? 'Unhide' : 'Hide'}
                    </button>
                    {!['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(job.status) && (
                      <button onClick={() => forceClose(job._id)} disabled={acting === job._id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                        {acting === job._id ? <Loader size={13} className="animate-spin" /> : <XCircle size={13} />} Force Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}


// ─────────────── Activity Log Panel ───────────────
function ActivityLogPanel() {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(1)
  const [total, setTotal]   = useState(0)
  const LIMIT = 20

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/activity-log?limit=${LIMIT}&page=${p}`)
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
    } catch { toast.error('Failed to load activity log') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page])

  const ACTION_STYLE = {
    APPROVED_USER:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: <CheckCircle size={12} /> },
    REJECTED_USER:    { bg: 'bg-red-500/10',     text: 'text-red-400',     icon: <Ban size={12} /> },
    RESTORED_USER:    { bg: 'bg-sky-500/10',     text: 'text-sky-400',     icon: <RotateCcw size={12} /> },
    DELETED_USER:     { bg: 'bg-red-500/10',     text: 'text-red-400',     icon: <Trash2 size={12} /> },
    PENALISED_USER:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   icon: <TrendingDown size={12} /> },
    INCREASED_HONOUR: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: <TrendingUp size={12} /> },
    FORCE_CLOSED_JOB: { bg: 'bg-red-500/10',     text: 'text-red-400',     icon: <XCircle size={12} /> },
    ACTIVATED_USER:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: <CheckCircle size={12} /> },
    DEACTIVATED_USER: { bg: 'bg-[#2a2a2a]',     text: 'text-[#6b6b6b]',   icon: <XCircle size={12} /> },
  }

  const getStyle = (action) =>
    ACTION_STYLE[action] || { bg: 'bg-[#2a2a2a]', text: 'text-[#6b6b6b]', icon: <Activity size={12} /> }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Activity size={20} className="text-violet-400" /> Activity Log
          </h1>
          <p className="text-xs text-[#6b6b6b] mt-0.5">{total} total actions recorded</p>
        </div>
        <button onClick={() => load(page)} className="btn-ghost p-2"><RefreshCw size={15} /></button>
      </div>

      {loading ? <Spinner /> : logs.length === 0
        ? <EmptyState icon={<Activity size={32} />} text="No activity recorded yet" />
        : (
          <>
            <div className="space-y-2">
              {logs.map(log => {
                const style = getStyle(log.action)
                return (
                  <div key={log._id} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-start gap-3">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold shrink-0 border ${style.bg} ${style.text} border-current/20`}>
                      {style.icon}
                      <span className="hidden sm:inline">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">
                        <span className="text-[#f97316]">{log.adminName || 'Admin'}</span>
                        {' → '}
                        <span className="text-[#a3a3a3]">{log.targetName || 'Unknown'}</span>
                        {log.targetType && <span className="text-[#4a4a4a] text-xs"> ({log.targetType})</span>}
                      </div>
                      {log.details && (
                        <div className="text-xs text-[#6b6b6b] mt-0.5 truncate">{log.details}</div>
                      )}
                    </div>
                    <div className="text-xs text-[#4a4a4a] shrink-0 text-right">
                      {new Date(log.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#4a4a4a]">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-30">← Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                    className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-30">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
    </div>
  )
}

// ─────────────── Router ───────────────
export default function AdminDashboard() {
  return (
    <DashboardLayout navItems={NAV} role="admin">
      <Routes>
        <Route index element={<Overview />} />
        <Route path="approvals"  element={<ApprovalsPanel />} />
        <Route path="workers"    element={<UserPanel key="workers"   userType="worker" />} />
        <Route path="employers"  element={<UserPanel key="employers" userType="employer" />} />
        <Route path="jobs"       element={<JobsPanel />} />
        <Route path="deleted"    element={<DeletedPanel />} />
        <Route path="activity"   element={<ActivityLogPanel />} />
      </Routes>
    </DashboardLayout>
  )
}
