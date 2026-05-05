import { Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/AuthContext'
import { useAuth } from '../../api/AuthContext'
import DashboardLayout, { HonourBadge, StatusBadge } from '../../components/DashboardLayout'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, PlusCircle, Users, Briefcase, Clock,
  User, Bell, CheckCircle, MapPin, IndianRupee, Calendar,
  Search, Star, RefreshCw, Loader, ChevronRight, AlertCircle, Lock
} from 'lucide-react'
import { formatDate, timeAgo } from '../../utils/honour'
import StatusBanner from '../../components/StatusBanner'
import ProfileCompleteness from '../../components/ProfileCompleteness'
import useSocket from '../../socket/useSocket'
import CreateJob from './CreateJob'

const NAV = [
  { href: '/employer/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { href: '/employer/dashboard/create-job', label: 'Create Job', icon: <PlusCircle size={16} /> },
  { href: '/employer/dashboard/workers', label: 'Find Workers', icon: <Users size={16} /> },
  { href: '/employer/dashboard/active-jobs', label: 'Active Jobs', icon: <Briefcase size={16} /> },
  { href: '/employer/dashboard/history', label: 'Job History', icon: <Clock size={16} /> },
  { href: '/employer/dashboard/profile', label: 'Profile', icon: <User size={16} /> },
  { href: '/employer/dashboard/notifications', label: 'Notifications', icon: <Bell size={16} /> },
]

function StatCard({ label, value, icon, color = 'brand' }) {
  const colors = { brand: 'bg-[#ff2400]/10 text-[#ff2400]', amber: 'bg-[#ff2400]/10 text-[#ff3a1a]', violet: 'bg-violet-500/10 text-violet-400', emerald: 'bg-emerald-500/10 text-emerald-400' }
  return (
    <div className="card hover:shadow-card-hover transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <div className="text-2xl font-extrabold text-white">{value ?? '—'}</div>
      <div className="text-sm text-[#6b6b6b] mt-0.5">{label}</div>
    </div>
  )
}

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

/* ─── Overview ─── */
function Overview() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/employer/dashboard')
      .then(r => { setStats(r.data.stats); updateUser({ honourScore: r.data.stats.honourScore }) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  useSocket({
    requestAccepted: (data) => {
      toast.success(`${data.workerName} accepted your job request!`)
      load()
    },
    requestRejected: (data) => {
      toast.error(`${data.workerName} rejected your job request`)
      load()
    },
  })

  if (loading) return <Spinner />
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Hello, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-[#6b6b6b] text-sm mt-1">Manage your jobs and workforce</p>
        </div>
        <button
          className="btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            if (user?.status !== 'approved') {
              toast.error('Your account is pending admin approval. You cannot post jobs yet.')
              return
            }
            navigate('/employer/dashboard/create-job')
          }}
          title={user?.status !== 'approved' ? 'Account not yet approved by admin' : ''}
        >
          <PlusCircle size={16} /> Post a Job
          {user?.status !== 'approved' && (
            <span className="ml-1 text-xs opacity-70">(Pending)</span>
          )}
        </button>
      </div>

      {/* ── Account Status Banner ── */}
      <StatusBanner />

      {/* ── Profile Completeness ── */}
      <ProfileCompleteness user={user} role="employer" />

      <div className="card flex items-center gap-6 bg-[#141414] border border-[#2a2a2a]">
        <HonourBadge score={user?.honourScore} />
        <div>
          <div className="text-sm font-semibold text-[#e0e0e0] mb-1">Your Honour Score</div>
          <div className="text-xs text-[#6b6b6b]">Pay workers on time to maintain a high score</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Jobs" value={stats?.activeJobs} icon={<Briefcase size={18} />} color="brand" />
        <StatCard label="Open Jobs" value={stats?.openJobs} icon={<PlusCircle size={18} />} color="violet" />
        <StatCard label="Completed Jobs" value={stats?.completedJobs} icon={<CheckCircle size={18} />} color="emerald" />
        <StatCard label="Honour Score" value={user?.honourScore} icon={<Star size={18} />} color="amber" />
      </div>
    </div>
  )
}

/* ─── Find Workers ─── */
function FindWorkers() {
  const [workers, setWorkers] = useState([])
  const [workerTypes, setWorkerTypes] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [sendingTo, setSendingTo] = useState(null)
  const [filters, setFilters] = useState({ workerType: '', pincode: '' })
  const [selectedJob, setSelectedJob] = useState('')

  useEffect(() => {
    api.get('/auth/categories').then(r => setWorkerTypes(r.data.workerTypes || []))
    api.get('/jobs/employer?status=OPEN').then(r => setJobs(r.data.jobs || []))
  }, [])

  const search = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(filters).toString()
      const res = await api.get(`/jobs/search-workers?${params}`)
      setWorkers(res.data.workers || [])
    } catch { toast.error('Search failed') }
    finally { setLoading(false) }
  }

  const sendRequest = async (workerId) => {
    if (!selectedJob) return toast.error('Please select a job first')
    setSendingTo(workerId)
    try {
      await api.post('/jobs/send-request', { jobId: selectedJob, workerId })
      toast.success('Job request sent!')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send request') }
    finally { setSendingTo(null) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-extrabold text-white">Find Workers</h1>
      <div className="card space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <select className="input" value={filters.workerType} onChange={e => setFilters(p => ({ ...p, workerType: e.target.value }))}>
            <option value="">All Worker Types</option>
            {workerTypes.map(w => <option key={w._id} value={w.name}>{w.name}</option>)}
          </select>
          <input className="input" placeholder="Pincode (optional)" maxLength={6} value={filters.pincode} onChange={e => setFilters(p => ({ ...p, pincode: e.target.value }))} />
          <button className="btn-primary justify-center" onClick={search} disabled={loading}>
            {loading ? <Loader size={15} className="animate-spin" /> : <Search size={15} />} Search
          </button>
        </div>
        {jobs.length > 0 && (
          <div>
            <label className="label">Select job to send request with</label>
            <select className="input" value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
              <option value="">— Select a job —</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title} (₹{j.wage}/{j.jobType === 'per_hour' ? 'hr' : 'day'})</option>)}
            </select>
          </div>
        )}
      </div>

      {workers.length === 0 && !loading ? (
        <EmptyState icon={<Users size={32} />} title="No workers found" desc="Try different filters or search all worker types" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {workers.map(w => (
            <div key={w._id} className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-xl flex items-center justify-center text-[#ff2400] font-bold text-sm">
                    {w.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{w.name}</div>
                    <div className="text-xs text-[#6b6b6b]">{w.workerTypeName} · {w.experience}yr exp</div>
                  </div>
                </div>
                <HonourBadge score={w.honourScore} small />
              </div>
              <div className="text-xs text-[#4a4a4a] flex items-center gap-2 flex-wrap mb-3">
                <span className="flex items-center gap-1"><MapPin size={11} /> {w.address?.substring(0, 40)}, {w.pincode}</span>
                {w.availabilityStatus && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Available Now
                  </span>
                )}
              </div>
              <button
                onClick={() => sendRequest(w._id)}
                disabled={sendingTo === w._id || !selectedJob}
                className="btn-primary w-full justify-center text-xs py-2">
                {sendingTo === w._id ? <Loader size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                Send Request
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Active Jobs ─── */
function ActiveJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/jobs/employer')
      const active = (res.data.jobs || []).filter(j =>
        !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(j.status)
      )
      setJobs(active)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useSocket({
    requestAccepted:  (d) => { toast.success(`✅ ${d.workerName} accepted: ${d.jobTitle}`);  load() },
    requestRejected:  (d) => { toast.error(`❌ ${d.workerName} rejected: ${d.jobTitle}`);    load() },
    workerArrived:    (d) => { toast.success(`📍 Worker arrived for: ${d.jobTitle}`);          load() },
    dailyPayConfirmed:(d) => {
      toast.success(`💰 Worker confirmed payment for: ${d.jobTitle}`)
      if (d.isCompleted) { toast.success('🎉 Job fully completed!'); }
      load()
    },
    hourlyWorkDone: (d) => {
      toast.success(`🏁 Work done: ${d.actualHours} hrs × ₹${d.wage || ''} = ₹${d.totalAmount}`)
      load()
    },
  })

  const action = async (jobId, endpoint, msg, body = null) => {
    setActing(jobId + endpoint)
    try {
      await api.patch(`/jobs/${jobId}/${endpoint}`, body || {})
      toast.success(msg)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed') }
    finally { setActing(null) }
  }

  const wageLabel = (job) =>
    job.jobType === 'per_hour' ? `₹${job.wage}/hr` : `₹${job.wage}/day`

  if (loading) return <Spinner />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Active Jobs</h1>
        <button onClick={load} className="btn-ghost text-xs"><RefreshCw size={14} /></button>
      </div>
      {jobs.length === 0 ? (
        <EmptyState icon={<Briefcase size={32} />} title="No active jobs" desc="Post a job to get started" />
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job._id} className="card hover:shadow-card-hover transition-all">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-white">{job.title}</span>
                    <StatusBadge status={job.status} />
                    {job.jobType === 'per_hour' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                        ⏱ Hourly
                      </span>
                    )}
                    {job.urgency === 'urgent' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff2400]/10 text-[#ff2400] border border-[#ff2400]/20 font-semibold">
                        🚨 Urgent
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[#6b6b6b] space-y-1">
                    <div className="flex items-center gap-1.5"><IndianRupee size={13} /> {wageLabel(job)}</div>
                    <div className="flex items-center gap-1.5"><MapPin size={13} /> {job.address}{job.district ? `, ${job.district}` : ''}</div>
                    <div className="flex items-center gap-1.5"><Calendar size={13} />
                      {job.jobType === 'per_day'
                        ? `Start: ${formatDate(job.startDate)} · ${job.numberOfDays} day${job.numberOfDays > 1 ? 's' : ''}`
                        : `Date: ${formatDate(job.startDate)} · ~${job.estimatedHours} hr${job.estimatedHours !== 1 ? 's' : ''}`}
                    </div>
                    {job.worker && (
                      <div className="flex items-center gap-1.5">
                        <Users size={13} /> Worker: {job.worker.name}
                        <HonourBadge score={job.worker.honourScore} small />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Per day — work log progress */}
              {job.jobType === 'per_day' && job.workLog?.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e]">
                  <div className="text-xs text-[#555] font-semibold mb-2 uppercase tracking-wider">
                    Daily Progress — {job.totalDaysLogged || 0} of {job.workLog.length} days paid
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.workLog.map((log, i) => (
                      <span key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                        ${log.dayStatus === 'paid'        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                          log.dayStatus === 'completed'   ? 'bg-[#ff2400]/15 text-[#ff2400] border border-[#ff2400]/20' :
                          log.dayStatus === 'in_progress' ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' :
                          log.dayStatus === 'absent'      ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                          'bg-[#1a1a1a] text-[#333] border border-[#222]'}`}>
                        {i + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Per hour — time log */}
              {job.jobType === 'per_hour' && job.timeLog?.startedAt && (
                <div className="mb-4 p-3 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e]">
                  <div className="text-xs text-[#555] font-semibold uppercase tracking-wider mb-1.5">Time Log</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#6b6b6b]">
                    {job.timeLog.startedAt && <span>Started: {new Date(job.timeLog.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                    {job.timeLog.completedAt && <span>Completed: {new Date(job.timeLog.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                    {job.timeLog.approvedHours > 0 && <span className="text-white font-semibold">Approved: {job.timeLog.approvedHours} hrs</span>}
                    {job.timeLog.totalAmount > 0 && <span className="text-[#ff2400] font-semibold">Total: ₹{job.timeLog.totalAmount}</span>}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-[#2a2a2a]">

                {/* ACCEPTED → Confirm Booking */}
                {job.status === 'ACCEPTED' && (
                  <button onClick={() => action(job._id, 'confirm-booking', 'Booking confirmed!')}
                    disabled={!!acting} className="btn-primary text-xs py-2">
                    {acting === job._id + 'confirm-booking' ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Confirm Booking
                  </button>
                )}

                {/* BOOKING_CONFIRMED → waiting for worker to arrive */}
                {job.status === 'BOOKING_CONFIRMED' && (
                  <div className="text-xs text-[#6b6b6b] flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] rounded-xl border border-[#222]">
                    <AlertCircle size={13} /> Waiting for worker to mark arrival
                  </div>
                )}

                {/* ARRIVED → Confirm Arrival */}
                {job.status === 'ARRIVED' && (
                  <button onClick={() => action(job._id, 'confirm-arrival', 'Arrival confirmed! Work in progress.')}
                    disabled={!!acting} className="btn-primary text-xs py-2">
                    {acting === job._id + 'confirm-arrival' ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Confirm Arrival
                    <span className="ml-1 text-white/50">(auto in 30 min)</span>
                  </button>
                )}

                {/* WORK_IN_PROGRESS — per_day → Mark Day Complete */}
                {job.status === 'WORK_IN_PROGRESS' && job.jobType === 'per_day' && (
                  <button onClick={() => action(job._id, 'day-complete', 'Day logged! Daily pay released to worker.')}
                    disabled={!!acting} className="btn-primary text-xs py-2">
                    {acting === job._id + 'day-complete' ? <Loader size={13} className="animate-spin" /> : <IndianRupee size={13} />}
                    Mark Day Complete + Release Pay
                  </button>
                )}

                {/* WORK_DONE — per_hour → Approve Hours */}
                {job.status === 'WORK_DONE' && job.jobType === 'per_hour' && (
                  <button
                    onClick={() => {
                      const hrs = job.timeLog?.approvedHours ||
                        parseFloat(((new Date(job.timeLog?.completedAt) - new Date(job.timeLog?.startedAt)) / 3600000).toFixed(2))
                      const total = (hrs * job.wage).toFixed(2)
                      if (confirm(`Approve ${hrs} hrs × ₹${job.wage}/hr = ₹${total}?
Click OK to release payment.`)) {
                        action(job._id, 'approve-pay', `₹${total} released!`, { approvedHours: hrs })
                      }
                    }}
                    disabled={!!acting} className="btn-primary text-xs py-2">
                    {acting === job._id + 'approve-pay' ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Approve Hours & Release Pay
                  </button>
                )}

                {/* WORK_DONE — per_day last day → waiting for worker */}
                {job.status === 'WORK_DONE' && job.jobType === 'per_day' && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 px-3 py-2 bg-emerald-500/8 rounded-xl border border-emerald-500/20">
                    <CheckCircle size={13} /> All days done — waiting for worker payment confirmations
                  </div>
                )}

                {/* PAYMENT_PENDING → waiting for worker */}
                {job.status === 'PAYMENT_PENDING' && (
                  <div className="text-xs text-[#6b6b6b] flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] rounded-xl border border-[#222]">
                    <AlertCircle size={13} /> Waiting for worker to confirm payment receipt
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

/* ─── History ─── */
function JobHistory() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/jobs/employer?status=COMPLETED')
      .then(r => setJobs(r.data.jobs || []))
      .catch(() => toast.error('Failed'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-extrabold text-white">Job History</h1>
      {jobs.length === 0 ? (
        <EmptyState icon={<Clock size={32} />} title="No completed jobs" desc="" />
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job._id} className="card flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-white">{job.title}</div>
                <div className="text-xs text-[#6b6b6b] mt-0.5 flex items-center gap-3">
                  {job.worker && <span>{job.worker.name}</span>}
                  <span className="flex items-center gap-1"><IndianRupee size={11} />₹{job.wage}/day</span>
                  <span>{formatDate(job.updatedAt)}</span>
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

/* ─── Honour Ring SVG ─── */
function HonourRing({ score = 50, size = 96 }) {
  const r = 38, cx = 48, cy = 48
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const colour = score >= 85 ? '#4ade80' : score >= 70 ? '#a3e635' : score >= 50 ? '#fb923c' : '#f87171'
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e1e1e" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={colour} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 48 48)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="48" y="44" textAnchor="middle" fontSize="18" fontWeight="800" fill={colour}>{score}</text>
      <text x="48" y="58" textAnchor="middle" fontSize="9" fill="#4a4a4a">/100</text>
    </svg>
  )
}

/* ─── Info Row ─── */
function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#1a1a1a] last:border-0">
      {Icon && <Icon size={13} className="text-[#ff2400] mt-0.5 shrink-0" />}
      <div className="flex-1 flex justify-between gap-3 min-w-0">
        <span className="text-xs text-[#4a4a4a] shrink-0">{label}</span>
        <span className="text-sm text-white font-medium text-right capitalize truncate">{value || '—'}</span>
      </div>
    </div>
  )
}

/* ─── Section Block ─── */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1a1a1a]">
        <Icon size={13} className="text-[#ff2400]" />
        <span className="text-xs font-bold text-[#6b6b6b] uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  )
}

/* ─── Profile ─── */
function EmployerProfile() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const isOrg = user?.employerType === 'organisation'

  const [form, setForm] = useState({
    address:             user?.address             || '',
    state:               user?.state               || '',
    district:            user?.district            || '',
    block:               user?.block               || '',
    pincode:             user?.pincode             || '',
    labourCardNumber:    user?.labourCardNumber     || '',
    labourLicenseNumber: user?.labourLicenseNumber  || '',
  })
  const [loading, setLoading]       = useState(false)
  const [honourLogs, setHonourLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Geo
  const [states, setStates]         = useState([])
  const [districts, setDistricts]   = useState([])
  const [blocks, setBlocks]         = useState([])
  const [geoLoading, setGeoLoading] = useState({ states: false, districts: false, blocks: false })

  useEffect(() => {
    api.get('/employer/honour-log')
      .then(r => setHonourLogs(r.data.logs || []))
      .catch(() => {})
      .finally(() => setLogsLoading(false))
  }, [])

  useEffect(() => {
    if (!editing) return
    setGeoLoading(p => ({ ...p, states: true }))
    api.get('/geo/states').then(r => setStates(r.data.states || [])).finally(() => setGeoLoading(p => ({ ...p, states: false })))
  }, [editing])

  useEffect(() => {
    if (!form.state) { setDistricts([]); setBlocks([]); return }
    setGeoLoading(p => ({ ...p, districts: true }))
    setDistricts([]); setBlocks([])
    api.get(`/geo/districts?state=${encodeURIComponent(form.state)}`).then(r => setDistricts(r.data.districts || [])).finally(() => setGeoLoading(p => ({ ...p, districts: false })))
  }, [form.state])

  useEffect(() => {
    if (!form.district) { setBlocks([]); return }
    setGeoLoading(p => ({ ...p, blocks: true }))
    setBlocks([])
    api.get(`/geo/blocks?state=${encodeURIComponent(form.state)}&district=${encodeURIComponent(form.district)}`).then(r => setBlocks(r.data.blocks || [])).finally(() => setGeoLoading(p => ({ ...p, blocks: false })))
  }, [form.district])

  const setField = (k, v) => setForm(p => {
    const next = { ...p, [k]: v }
    if (k === 'state')    { next.district = ''; next.block = '' }
    if (k === 'district') { next.block = '' }
    return next
  })

  const save = async () => {
    setLoading(true)
    try {
      const res = await api.put('/employer/profile', form)
      updateUser(res.data.employer)
      toast.success('Profile updated')
      setEditing(false)
    } catch { toast.error('Update failed') }
    finally { setLoading(false) }
  }

  const fd = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  const honourLabel = (s) => s >= 85 ? 'Excellent' : s >= 70 ? 'Good' : s >= 50 ? 'Average' : 'Poor'
  const honourColor = (s) => s >= 85 ? 'text-emerald-400' : s >= 70 ? 'text-lime-400' : s >= 50 ? 'text-amber-400' : 'text-red-400'

  const lockedFields = isOrg
    ? [['Organisation Name', user?.name], ['Established', fd(user?.establishmentDate)], ['GST Number', user?.gstNumber || 'Not provided']]
    : [['Full Name', user?.name], ["Father's Name", user?.fatherName], ['Gender', user?.gender], ['Date of Birth', fd(user?.dob)]]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">My Profile</h1>
        {!editing
          ? <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>Edit Profile</button>
          : <div className="flex gap-2">
              <button className="btn-primary text-xs py-2" onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
              <button className="btn-ghost text-xs py-2" onClick={() => setEditing(false)}>Cancel</button>
            </div>
        }
      </div>

      {/* ── Two column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: Hero panel ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Avatar + honour ring card */}
          <div className="card text-center py-7 px-4 relative overflow-hidden">
            {/* Subtle glow behind avatar */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 bg-[#ff2400]/5 rounded-full blur-3xl" />
            </div>

            {/* Avatar */}
            <div className="relative inline-flex mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ff2400]/20 to-[#ff2400]/5 border-2 border-[#ff2400]/30 rounded-2xl flex items-center justify-center text-[#ff2400] text-3xl font-black shadow-glow-sm">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              {/* Status dot */}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#111]
                ${user?.status === 'approved' ? 'bg-emerald-400' : user?.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'}`} />
            </div>

            <div className="font-extrabold text-white text-lg leading-tight">{user?.name}</div>
            <div className="text-xs text-[#ff2400] font-semibold mt-0.5 capitalize">{user?.employerType || 'individual'} Employer</div>
            <div className="text-xs text-[#4a4a4a] mt-0.5">+91 {user?.mobile}</div>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-3 border
              ${user?.status === 'approved'  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                user?.status === 'rejected'  ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                               'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${user?.status === 'approved' ? 'bg-emerald-400' : user?.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
              {user?.status === 'approved' ? 'Verified Account' : user?.status === 'rejected' ? 'Account Rejected' : 'Pending Approval'}
            </div>

            {/* Honour ring */}
            <div className="flex flex-col items-center mt-6 pt-5 border-t border-[#1e1e1e]">
              <HonourRing score={user?.honourScore ?? 50} />
              <div className={`text-sm font-bold mt-2 ${honourColor(user?.honourScore ?? 50)}`}>
                {honourLabel(user?.honourScore ?? 50)}
              </div>
              <div className="text-xs text-[#4a4a4a] mt-0.5">Honour Score</div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Jobs Posted',   value: user?.activeJobs    ?? 0, color: 'text-[#ff2400]' },
              { label: 'Completed',     value: user?.completedJobs ?? 0, color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="card text-center py-4">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-[#4a4a4a] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Member since */}
          <div className="card py-3 px-4 flex items-center gap-3">
            <Calendar size={14} className="text-[#ff2400] shrink-0" />
            <div>
              <div className="text-xs text-[#4a4a4a]">Member since</div>
              <div className="text-sm font-semibold text-white">{fd(user?.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Info panels ── */}
        <div className="lg:col-span-2 space-y-4">

          {editing ? (
            /* ═══ EDIT MODE ═══ */
            <>
              {/* Locked identity */}
              <Section title="Identity — Cannot be Changed" icon={Lock}>
                <div className="space-y-1">
                  {lockedFields.map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm py-1.5">
                      <span className="text-[#3a3a3a] text-xs">{k}</span>
                      <span className="text-[#5a5a5a] capitalize text-xs">{v || '—'}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Location fieldset */}
              <Section title="Location Details" icon={MapPin}>
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="label">Address</label>
                    <textarea className="input resize-none min-h-[68px]" value={form.address} onChange={e => setField('address', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <div className="relative">
                      <select className="input bg-[#141414]" value={form.state} onChange={e => setField('state', e.target.value)} disabled={geoLoading.states}>
                        <option value="">{geoLoading.states ? 'Loading…' : 'Select state'}</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {geoLoading.states && <span className="absolute right-3 top-3 text-[#ff2400] text-xs">⟳</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">District</label>
                      <select className="input bg-[#141414]" value={form.district} onChange={e => setField('district', e.target.value)} disabled={!form.state || geoLoading.districts}>
                        <option value="">{geoLoading.districts ? 'Loading…' : form.state ? 'Select district' : 'Select state first'}</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Block</label>
                      <select className="input bg-[#141414]" value={form.block} onChange={e => setField('block', e.target.value)} disabled={!form.district || geoLoading.blocks}>
                        <option value="">{geoLoading.blocks ? 'Loading…' : form.district ? 'Select block' : 'Select district first'}</option>
                        {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">Pincode</label>
                    <input className="input" maxLength={6} value={form.pincode} onChange={e => setField('pincode', e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
              </Section>

              {/* Documents fieldset */}
              <Section title="Documents" icon={Briefcase}>
                <div className="pt-1">
                  {!isOrg ? (
                    <div>
                      <label className="label">Labour Card Number <span className="text-[#2a2a2a] normal-case">(optional)</span></label>
                      <input className="input" placeholder="Govt issued labour card" value={form.labourCardNumber} onChange={e => setField('labourCardNumber', e.target.value)} />
                    </div>
                  ) : (
                    <div>
                      <label className="label">Labour License Number <span className="text-[#2a2a2a] normal-case">(optional)</span></label>
                      <input className="input" placeholder="Govt issued labour license" value={form.labourLicenseNumber} onChange={e => setField('labourLicenseNumber', e.target.value)} />
                    </div>
                  )}
                </div>
              </Section>
            </>
          ) : (
            /* ═══ VIEW MODE ═══ */
            <>
              {/* Identity section */}
              <Section title={isOrg ? 'Organisation Identity' : 'Personal Identity'} icon={User}>
                {isOrg ? (
                  <>
                    <InfoRow icon={Briefcase} label="Org Name"        value={user?.name} />
                    <InfoRow icon={Calendar}  label="Established"     value={fd(user?.establishmentDate)} />
                    <InfoRow icon={Star}      label="GST Number"      value={user?.gstNumber || 'Not provided'} />
                    <InfoRow icon={Briefcase} label="Labour License"  value={user?.labourLicenseNumber || 'Not provided'} />
                  </>
                ) : (
                  <>
                    <InfoRow icon={User}     label="Full Name"        value={user?.name} />
                    <InfoRow icon={User}     label="Father's Name"    value={user?.fatherName} />
                    <InfoRow icon={User}     label="Gender"           value={user?.gender} />
                    <InfoRow icon={Calendar} label="Date of Birth"    value={fd(user?.dob)} />
                    <InfoRow icon={Briefcase}label="Labour Card"      value={user?.labourCardNumber || 'Not provided'} />
                  </>
                )}
              </Section>

              {/* Business section */}
              <Section title="Business Details" icon={Briefcase}>
                <InfoRow icon={Star}     label="Type"        value={isOrg ? 'Organisation' : 'Individual'} />
                <InfoRow icon={Star}     label="Category"    value={user?.employerCategoryName} />
                <InfoRow icon={Star}     label="Subcategory" value={user?.employerSubcategory} />
              </Section>

              {/* Location section */}
              <Section title="Location" icon={MapPin}>
                <InfoRow icon={MapPin} label="Address"  value={user?.address} />
                <InfoRow icon={MapPin} label="State"    value={user?.state} />
                <InfoRow icon={MapPin} label="District" value={user?.district} />
                <InfoRow icon={MapPin} label="Block"    value={user?.block} />
                <InfoRow icon={MapPin} label="Pincode"  value={user?.pincode} />
              </Section>

              {/* Contact */}
              <Section title="Contact" icon={Bell}>
                <InfoRow icon={Bell}   label="Mobile" value={`+91 ${user?.mobile}`} />
                <InfoRow icon={Bell}   label="Email"  value={user?.email} />
              </Section>
            </>
          )}
        </div>
      </div>

      {/* ── Honour Score History — Timeline ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Star size={15} className="text-[#ff2400]" /> Honour Score History
          </h2>
          {honourLogs.length > 0 && (
            <span className="text-xs text-[#4a4a4a]">{honourLogs.length} events</span>
          )}
        </div>

        {logsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#ff2400] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : honourLogs.length === 0 ? (
          <div className="text-center py-10">
            <Star size={28} className="text-[#1e1e1e] mx-auto mb-2" />
            <p className="text-sm text-[#3a3a3a]">No score changes yet</p>
            <p className="text-xs text-[#2a2a2a] mt-1">Complete jobs on time to build your score</p>
          </div>
        ) : (
          /* Timeline */
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[#1e1e1e]" />

            <div className="space-y-1">
              {honourLogs.map((log, i) => {
                const isPos = log.change > 0
                return (
                  <div key={log._id} className={`relative flex items-start gap-4 py-3 px-3 rounded-xl transition-colors
                    ${i % 2 === 0 ? 'hover:bg-[#0e0e0e]' : 'hover:bg-[#0e0e0e]'}`}>

                    {/* Timeline dot */}
                    <div className={`relative z-10 w-10 h-10 rounded-xl border flex flex-col items-center justify-center shrink-0 font-black text-sm
                      ${isPos
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                      {isPos ? '+' : ''}{log.change}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-sm text-[#e0e0e0] font-medium leading-tight">{log.reason}</div>
                      <div className="text-xs text-[#4a4a4a] mt-0.5">{formatDate(log.createdAt)}</div>
                    </div>

                    {/* New score badge */}
                    <div className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg border
                      ${isPos
                        ? 'bg-emerald-500/8 border-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/8 border-red-500/15 text-red-400'}`}>
                      {log.newScore}/100
                    </div>
                  </div>
                )
              })}
            </div>
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
    }).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-extrabold text-white">Notifications</h1>
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={32} />} title="No notifications" desc="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n._id} className={`card py-3.5 px-4 ${!n.isRead ? 'border-brand-200 bg-brand-50/30' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.isRead ? 'bg-brand-500' : 'bg-slate-300'}`} />
                <div>
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

export default function EmployerDashboard() {
  return (
    <DashboardLayout navItems={NAV} role="employer">
      <Routes>
        <Route index element={<Overview />} />
        <Route path="create-job" element={<CreateJob />} />
        <Route path="workers" element={<FindWorkers />} />
        <Route path="active-jobs" element={<ActiveJobs />} />
        <Route path="history" element={<JobHistory />} />
        <Route path="profile" element={<EmployerProfile />} />
        <Route path="notifications" element={<Notifications />} />
      </Routes>
    </DashboardLayout>
  )
}
