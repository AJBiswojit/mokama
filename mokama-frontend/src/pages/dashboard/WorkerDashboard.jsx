import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/AuthContext'
import { useAuth } from '../../api/AuthContext'
import DashboardLayout, { HonourBadge, StatusBadge } from '../../components/DashboardLayout'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Inbox, Briefcase, Clock, User, Bell,
  CheckCircle, XCircle, Star, MapPin, Calendar, IndianRupee,
  AlertCircle, RefreshCw, ChevronRight, Loader
} from 'lucide-react'
import { formatDate, timeAgo } from '../../utils/honour'
import StatusBanner from '../../components/StatusBanner'
import ProfileCompleteness from '../../components/ProfileCompleteness'
import useSocket from '../../socket/useSocket'

const NAV = [
  { href: '/worker/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { href: '/worker/dashboard/requests', label: 'Job Requests', icon: <Inbox size={16} /> },
  { href: '/worker/dashboard/active', label: 'Active Work', icon: <Briefcase size={16} /> },
  { href: '/worker/dashboard/history', label: 'Job History', icon: <Clock size={16} /> },
  { href: '/worker/dashboard/profile', label: 'Profile', icon: <User size={16} /> },
  { href: '/worker/dashboard/notifications', label: 'Notifications', icon: <Bell size={16} /> },
]

/* ─── Stat Card ─── */
function StatCard({ label, value, icon, color = 'brand', sub }) {
  const colors = {
    brand: 'bg-[#f97316]/10 text-[#f97316]',
    amber: 'bg-[#f97316]/10 text-[#fb923c]',
    violet: 'bg-violet-500/10 text-violet-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
  }
  return (
    <div className="card hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      </div>
      <div className="text-2xl font-extrabold text-white">{value ?? '—'}</div>
      <div className="text-sm text-[#6b6b6b] mt-0.5">{label}</div>
      {sub && <div className="text-xs text-[#4a4a4a] mt-1">{sub}</div>}
    </div>
  )
}

/* ─── Overview ─── */
function Overview() {
  const { user, updateUser } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/worker/dashboard')
      setStats(res.data.stats)
      updateUser({ honourScore: res.data.stats.honourScore })
    } catch { toast.error('Failed to load dashboard') }
    finally { setLoading(false) }
  }, [])

  useSocket({
    requestReceived: (data) => {
      toast.success(`New job request: ${data.jobTitle}`)
      load() // refresh dashboard stats
    },
  })

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-[#6b6b6b] text-sm mt-1">Here's your work overview</p>
      </div>

      {/* ── Account Status Banner ── */}
      <StatusBanner />

      {/* ── Profile Completeness ── */}
      <ProfileCompleteness user={user} role="worker" />

      {/* ── Availability Toggle — prominent at top of dashboard ── */}
      <AvailabilityToggle hasActiveJob={!!stats?.activeJob} />

      {/* Honour Score */}
      <div className="card flex items-center gap-6 bg-[#141414] border border-[#2a2a2a]">
        <HonourBadge score={user?.honourScore} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#e0e0e0] mb-1">Your Honour Score</div>
          <div className="text-xs text-[#6b6b6b]">Complete jobs and respond quickly to improve your score</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Requests" value={stats?.pendingRequests} icon={<Inbox size={18} />} color="amber" />
        <StatCard label="Completed Jobs" value={stats?.completedJobs} icon={<CheckCircle size={18} />} color="emerald" />
        <StatCard label="Honour Score" value={user?.honourScore} icon={<Star size={18} />} color="amber" />
        <StatCard label="Active Job" value={stats?.activeJob ? 'Yes' : 'None'} icon={<Briefcase size={18} />} color="brand" />
      </div>

      {stats?.activeJob && (
        <div className="card border-l-4 border-[#f97316]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-[#f97316] font-semibold uppercase tracking-wide mb-1">Active Job</div>
              <div className="font-bold text-white text-lg">{stats.activeJob.title}</div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#6b6b6b]">
                <span className="flex items-center gap-1"><Briefcase size={13} /> {stats.activeJob.employer?.name}</span>
                <StatusBadge status={stats.activeJob.status} />
              </div>
            </div>
            <Link to="/worker/dashboard/active" className="btn-ghost text-xs">
              View <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Job Requests ─── */
function JobRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/jobs/worker/requests')
      setRequests(res.data.requests || [])
    } catch { toast.error('Failed to load requests') }
    finally { setLoading(false) }
  }, [])

  useSocket({
    requestReceived: (data) => {
      toast.success(`New request: ${data.jobTitle} — ₹${data.wage}/day`)
      load() // refresh requests list
    },
  })

  useEffect(() => { load() }, [load])

  const act = async (requestId, action) => {
    setActing(requestId + action)
    try {
      await api.patch(`/jobs/request/${requestId}/${action}`)
      toast.success(action === 'accept' ? 'Job accepted!' : 'Job rejected')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed') }
    finally { setActing(null) }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Job Requests</h1>
        <button onClick={load} className="btn-ghost text-xs"><RefreshCw size={14} /></button>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={<Inbox size={32} />} title="No pending requests" desc="New job requests will appear here" />
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const job = req.job
            const expiry = new Date(req.expiresAt)
            const expired = expiry < new Date()
            const minsLeft = Math.max(0, Math.floor((expiry - Date.now()) / 60000))

            return (
              <div key={req._id} className={`card transition-all ${expired ? 'opacity-60' : 'hover:shadow-card-hover'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-bold text-white">{job?.title}</span>
                      <StatusBadge status={job?.status} />
                    </div>
                    <div className="space-y-1.5 text-sm text-[#6b6b6b]">
                      <div className="flex items-center gap-1.5"><Briefcase size={13} /> {job?.employer?.name} · {job?.employer?.employerCategoryName}</div>
                      <div className="flex items-center gap-1.5"><MapPin size={13} /> {job?.address}, {job?.pincode}</div>
                      <div className="flex items-center gap-1.5"><IndianRupee size={13} /> ₹{job?.wage}/day</div>
                      <div className="flex items-center gap-1.5"><Calendar size={13} /> Start: {formatDate(job?.startDate)}</div>
                    </div>
                    <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${expired ? 'text-red-500' : minsLeft < 3 ? 'text-orange-500' : 'text-[#4a4a4a]'}`}>
                      <AlertCircle size={12} />
                      {expired ? 'Request expired' : `Expires in ${minsLeft} min`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-center">
                      <div className="text-xs text-[#4a4a4a] mb-0.5">Employer Score</div>
                      <HonourBadge score={job?.employer?.honourScore} small />
                    </div>
                  </div>
                </div>

                {!expired && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-[#2a2a2a]">
                    <button
                      onClick={() => act(req._id, 'accept')}
                      disabled={!!acting}
                      className="btn-primary flex-1 justify-center">
                      {acting === req._id + 'accept' ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                      Accept
                    </button>
                    <button
                      onClick={() => act(req._id, 'reject')}
                      disabled={!!acting}
                      className="btn-secondary flex-1 justify-center text-red-500 hover:border-red-200">
                      {acting === req._id + 'reject' ? <Loader size={14} className="animate-spin" /> : <XCircle size={15} />}
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Active Work ─── */
function ActiveWork() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Send each status as a separate query param so backend handles it properly
      const res = await api.get('/jobs/worker?status=ACCEPTED,WORKING,PAYMENT_PENDING')
      setJobs(res.data.jobs || [])
    } catch { toast.error('Failed to load active jobs') }
    finally { setLoading(false) }
  }, [])

  useSocket({
    workStarted: (data) => {
      toast.success(`Work started confirmed for: ${data.jobTitle}`)
      setJob(prev => prev ? { ...prev, status: 'WORKING', workStartedAt: data.startedAt } : prev)
    },
    paymentConfirmed: (data) => {
      toast.success(`Payment sent by employer for: ${data.jobTitle}`)
      load() // refresh job
      if (data.isCompleted) {
        toast.success('Job completed! 🎉')
      }
    },
  })

  useEffect(() => { load() }, [load])

  const action = async (jobId, endpoint, msg) => {
    setActing(jobId + endpoint)
    try {
      await api.patch(`/jobs/${jobId}/${endpoint}`)
      toast.success(msg)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed') }
    finally { setActing(null) }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Active Work</h1>
          <p className="text-xs text-[#6b6b6b] mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''} in progress</p>
        </div>
        <button onClick={load} className="btn-ghost p-2" title="Refresh"><RefreshCw size={15} /></button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon={<Briefcase size={32} />} title="No active jobs" desc="Once an employer accepts your acceptance, the job will appear here" />
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job._id} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-[#3a3a3a] transition-all">

              {/* Status colour bar at top */}
              <div className={`h-1 w-full ${job.status === 'ACCEPTED' ? 'bg-violet-500' :
                job.status === 'WORKING' ? 'bg-emerald-500' :
                  job.status === 'PAYMENT_PENDING' ? 'bg-[#f97316]' : 'bg-[#2a2a2a]'
                }`} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-bold text-white text-lg leading-tight">{job.title}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-sm text-[#6b6b6b]">
                      <div className="flex items-center gap-1.5">
                        <Briefcase size={13} className="shrink-0" />
                        <span className="truncate">{job.employer?.name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <IndianRupee size={13} className="shrink-0" />
                        <span>₹{job.wage}/day</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="shrink-0" />
                        <span className="truncate">{job.address}, {job.pincode}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="shrink-0" />
                        <span>Start: {formatDate(job.startDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-[#2a2a2a] mb-4" />

                {/* Status-specific action area */}
                {job.status === 'ACCEPTED' && (
                  <div className="flex items-center gap-3 p-3.5 bg-violet-500/8 border border-violet-500/20 rounded-xl">
                    <div className="w-8 h-8 bg-violet-500/15 rounded-lg flex items-center justify-center shrink-0">
                      <AlertCircle size={15} className="text-violet-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-violet-300">Waiting to Start</div>
                      <div className="text-xs text-violet-400/70 mt-0.5">Employer will confirm when work begins</div>
                    </div>
                  </div>
                )}

                {job.status === 'WORKING' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                      <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
                        <Briefcase size={15} className="text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-emerald-300">Currently Working</div>
                        <div className="text-xs text-emerald-400/70 mt-0.5">Mark complete once you finish the work</div>
                      </div>
                    </div>
                    <button
                      onClick={() => action(job._id, 'complete', 'Work marked as completed!')}
                      disabled={!!acting}
                      className="btn-primary w-full justify-center">
                      {acting === job._id + 'complete' ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                      Mark Work Completed
                    </button>
                  </div>
                )}

                {job.status === 'PAYMENT_PENDING' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3.5 bg-[#f97316]/8 border border-[#f97316]/20 rounded-xl">
                      <div className="w-8 h-8 bg-[#f97316]/15 rounded-lg flex items-center justify-center shrink-0">
                        <IndianRupee size={15} className="text-[#f97316]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#fb923c]">Payment Pending</div>
                        <div className="text-xs text-[#f97316]/70 mt-0.5">
                          {job.paymentConfirmedByEmployer
                            ? 'Employer confirmed payment — please confirm receipt below'
                            : 'Waiting for employer to confirm payment'}
                        </div>
                      </div>
                    </div>
                    {job.paymentConfirmedByEmployer ? (
                      <button
                        onClick={() => action(job._id, 'confirm-payment-received', 'Payment confirmed! Job completed!')}
                        disabled={!!acting}
                        className="btn-primary w-full justify-center"
                        style={{ background: '#059669' }}>
                        {acting === job._id + 'confirm-payment-received' ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                        Confirm Payment Received
                      </button>
                    ) : (
                      <div className="text-xs text-center text-[#4a4a4a] py-1">Employer has been notified</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Job History ─── */
function JobHistory() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/jobs/worker?status=COMPLETED')
      .then(r => setJobs(r.data.jobs || []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-extrabold text-white">Job History</h1>
      {jobs.length === 0 ? (
        <EmptyState icon={<Clock size={32} />} title="No completed jobs" desc="Your finished jobs will appear here" />
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job._id} className="card flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-white">{job.title}</div>
                <div className="text-xs text-[#6b6b6b] mt-0.5 flex items-center gap-3">
                  <span>{job.employer?.name}</span>
                  <span className="flex items-center gap-1"><IndianRupee size={11} />₹{job.wage}/day</span>
                  <span>{formatDate(job.workCompletedAt || job.updatedAt)}</span>
                </div>
              </div>
              <StatusBadge status={job.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Availability Toggle ─── */
function AvailabilityToggle({ hasActiveJob = false }) {
  const { user, updateUser } = useAuth()
  const [available, setAvailable] = useState(user?.availabilityStatus ?? false)
  const [toggling, setToggling] = useState(false)

  // Sync with user context changes (e.g. after job completes)
  useEffect(() => {
    setAvailable(user?.availabilityStatus ?? false)
  }, [user?.availabilityStatus])

  // Blocked if trying to turn ON while job is active
  const isLocked = hasActiveJob && !available

  const toggle = async () => {
    if (isLocked) {
      toast.error('Complete your current job before marking as available')
      return
    }
    setToggling(true)
    try {
      const next = !available
      const res = await api.patch('/worker/availability', { availabilityStatus: next })
      setAvailable(next)
      updateUser({ availabilityStatus: next })
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability')
    }
    finally { setToggling(false) }
  }

  return (
    <div className={`flex items-center justify-between p-5 rounded-2xl border transition-all
      ${hasActiveJob
        ? 'bg-[#141414] border-[#f97316]/20'
        : 'bg-[#141414] border-[#2a2a2a]'}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-300
          ${hasActiveJob ? 'bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]' :
            available ? 'bg-emerald-400 shadow-[0_0_8px_#34d39980]' : 'bg-[#3a3a3a]'}`} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Available for Work</div>
          <div className={`text-xs mt-0.5 transition-colors truncate
            ${hasActiveJob ? 'text-[#f97316]' :
              available ? 'text-emerald-400' : 'text-[#6b6b6b]'}`}>
            {hasActiveJob
              ? 'Locked — complete your active job first'
              : available
                ? 'You are visible to employers'
                : 'You are currently unavailable'}
          </div>
        </div>
      </div>

      {/* Toggle switch */}
      <div className="relative group shrink-0 ml-4">
        <button
          onClick={toggle}
          disabled={toggling || isLocked}
          title={isLocked ? 'Finish your active job to re-enable availability' : ''}
          className={`relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-300 focus:outline-none
            ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            ${available ? 'bg-emerald-500' : 'bg-[#2a2a2a]'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md
            transition-transform duration-300
            ${available ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        {/* Tooltip on hover when locked */}
        {isLocked && (
          <div className="absolute right-0 bottom-8 w-52 bg-[#1e1e1e] border border-[#f97316]/20
            text-xs text-[#f97316] px-3 py-2 rounded-xl shadow-modal
            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            You have an active job. Availability will auto-enable once the job is completed.
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Profile ─── */
function WorkerProfile() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name:     user?.name     || '',
    address:  user?.address  || '',
    state:    user?.state    || '',
    district: user?.district || '',
    block:    user?.block    || '',
    pincode:  user?.pincode  || '',
    experience: user?.experience || 0,
  })
  const [loading, setLoading]   = useState(false)
  const [honourLogs, setHonourLogs]   = useState([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Geo state
  const [states, setStates]         = useState([])
  const [districts, setDistricts]   = useState([])
  const [blocks, setBlocks]         = useState([])
  const [geoLoading, setGeoLoading] = useState({ states: false, districts: false, blocks: false })

  useEffect(() => {
    api.get('/worker/honour-log')
      .then(r => setHonourLogs(r.data.logs || []))
      .catch(() => { })
      .finally(() => setLogsLoading(false))
  }, [])

  // Load states when editing opens
  useEffect(() => {
    if (!editing) return
    setGeoLoading(p => ({ ...p, states: true }))
    api.get('/geo/states')
      .then(r => setStates(r.data.states || []))
      .finally(() => setGeoLoading(p => ({ ...p, states: false })))
  }, [editing])

  // Load districts when state changes
  useEffect(() => {
    if (!form.state) { setDistricts([]); setBlocks([]); return }
    setGeoLoading(p => ({ ...p, districts: true }))
    setDistricts([]); setBlocks([])
    api.get(`/geo/districts?state=${encodeURIComponent(form.state)}`)
      .then(r => setDistricts(r.data.districts || []))
      .finally(() => setGeoLoading(p => ({ ...p, districts: false })))
  }, [form.state])

  // Load blocks when district changes
  useEffect(() => {
    if (!form.district) { setBlocks([]); return }
    setGeoLoading(p => ({ ...p, blocks: true }))
    setBlocks([])
    api.get(`/geo/blocks?state=${encodeURIComponent(form.state)}&district=${encodeURIComponent(form.district)}`)
      .then(r => setBlocks(r.data.blocks || []))
      .finally(() => setGeoLoading(p => ({ ...p, blocks: false })))
  }, [form.district])

  const setField = (k, v) => {
    setForm(p => {
      const next = { ...p, [k]: v }
      if (k === 'state')    { next.district = ''; next.block = '' }
      if (k === 'district') { next.block = '' }
      return next
    })
  }

  const save = async () => {
    setLoading(true)
    try {
      const res = await api.put('/worker/profile', form)
      updateUser(res.data.worker)
      toast.success('Profile updated')
      setEditing(false)
    } catch { toast.error('Update failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">My Profile</h1>
        {!editing && <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>Edit</button>}
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#f97316]/10 border border-[#f97316]/20 rounded-2xl flex items-center justify-center text-[#f97316] text-2xl font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-xl text-white">{user?.name}</div>
            <div className="text-sm text-[#6b6b6b]">+91 {user?.mobile}</div>
            <HonourBadge score={user?.honourScore} small />
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea className="input resize-none min-h-[70px]" value={form.address} onChange={e => setField('address', e.target.value)} />
            </div>

            {/* State */}
            <div>
              <label className="label">State</label>
              <div className="relative">
                <select className="input bg-[#141414]" value={form.state}
                  onChange={e => setField('state', e.target.value)} disabled={geoLoading.states}>
                  <option value="">{geoLoading.states ? 'Loading...' : 'Select state'}</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {geoLoading.states && <span className="absolute right-3 top-3 text-[#f97316] text-xs animate-spin">⟳</span>}
              </div>
            </div>

            {/* District + Block */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">District</label>
                <div className="relative">
                  <select className="input bg-[#141414]" value={form.district}
                    onChange={e => setField('district', e.target.value)} disabled={!form.state || geoLoading.districts}>
                    <option value="">{geoLoading.districts ? 'Loading...' : form.state ? 'Select district' : 'Select state first'}</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Block</label>
                <div className="relative">
                  <select className="input bg-[#141414]" value={form.block}
                    onChange={e => setField('block', e.target.value)} disabled={!form.district || geoLoading.blocks}>
                    <option value="">{geoLoading.blocks ? 'Loading...' : form.district ? 'Select block' : 'Select district first'}</option>
                    {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Pincode</label>
                <input className="input" maxLength={6} value={form.pincode}
                  onChange={e => setField('pincode', e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label className="label">Experience (yrs)</label>
                <input type="number" className="input" value={form.experience}
                  onChange={e => setField('experience', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button className="btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {[
              ['Worker Type',    user?.workerTypeName || '—'],
              ['Experience',     `${user?.experience || 0} years`],
              ['Address',        user?.address || '—'],
              ['State',          user?.state    || '—'],
              ['District',       user?.district || '—'],
              ['Block',          user?.block    || '—'],
              ['Pincode',        user?.pincode  || '—'],
              ['Labour Card',    user?.labourCardNumber || 'Not provided'],
              ['Completed Jobs', user?.completedJobs || 0],
              ['Member Since',   formatDate(user?.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 border-b border-[#2a2a2a] last:border-0">
                <span className="text-[#6b6b6b]">{k}</span>
                <span className="text-white font-medium text-right">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ── Honour Score History ── */}
      <div className="card">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <Star size={16} className="text-[#f97316]" /> Honour Score History
        </h2>
        {logsLoading ? (
          <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" /></div>
        ) : honourLogs.length === 0 ? (
          <div className="text-center py-6 text-[#4a4a4a] text-sm">No score changes yet</div>
        ) : (
          <div className="space-y-2">
            {honourLogs.map(log => (
              <div key={log._id} className="flex items-center justify-between py-2.5 border-b border-[#1e1e1e] last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-10 text-right ${log.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {log.change > 0 ? '+' : ''}{log.change}
                  </span>
                  <div>
                    <div className="text-sm text-[#a3a3a3]">{log.reason}</div>
                    <div className="text-xs text-[#4a4a4a]">{formatDate(log.createdAt)}</div>
                  </div>
                </div>
                <span className="text-xs text-[#6b6b6b] font-mono">{log.newScore}/100</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Notifications ─── */
function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/notifications').then(r => {
      setNotifications(r.data.notifications || [])
      api.patch('/notifications/mark-read').catch(() => { })
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-extrabold text-white">Notifications</h1>
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={32} />} title="No notifications" desc="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n._id} className={`card py-3.5 px-4 ${!n.isRead ? 'border-brand-200 bg-brand-50/30' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.isRead ? 'bg-brand-500' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white">{n.title}</div>
                  <div className="text-sm text-[#6b6b6b] mt-0.5">{n.message}</div>
                  <div className="text-xs text-[#4a4a4a] mt-1">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Helpers ─── */
function Spinner() {
  return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
}

function EmptyState({ icon, title, desc }) {
  return (
    <div className="card text-center py-16">
      <div className="text-[#2a2a2a] flex justify-center mb-3">{icon}</div>
      <div className="font-semibold text-[#e0e0e0]">{title}</div>
      <div className="text-sm text-[#4a4a4a] mt-1">{desc}</div>
    </div>
  )
}

/* ─── Main Dashboard ─── */
export default function WorkerDashboard() {
  return (
    <DashboardLayout navItems={NAV} role="worker">
      <Routes>
        <Route index element={<Overview />} />
        <Route path="requests" element={<JobRequests />} />
        <Route path="active" element={<ActiveWork />} />
        <Route path="history" element={<JobHistory />} />
        <Route path="profile" element={<WorkerProfile />} />
        <Route path="notifications" element={<Notifications />} />
      </Routes>
    </DashboardLayout>
  )
}
