import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/AuthContext'
import { useAuth } from '../../api/AuthContext'
import DashboardLayout, { HonourBadge, StatusBadge } from '../../components/DashboardLayout'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Inbox, Briefcase, Clock, User, Bell,
  CheckCircle, XCircle, Star, MapPin, Calendar, IndianRupee,
  AlertCircle, RefreshCw, ChevronRight, Loader, Shield
} from 'lucide-react'
import { formatDate, timeAgo } from '../../utils/honour'
import StatusBanner from '../../components/StatusBanner'
import ProfileCompleteness from '../../components/ProfileCompleteness'
import useSocket from '../../socket/useSocket'
import DisputeCenter from './DisputeCenter'
import CountdownTimer    from '../../components/CountdownTimer'
import PendingActionBanner from '../../components/PendingActionBanner'
import JobTimeline       from '../../components/JobTimeline'
import RestrictionBanner from '../../components/RestrictionBanner'

const NAV = [
  { href: '/worker/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { href: '/worker/dashboard/requests', label: 'Job Requests', icon: <Inbox size={16} /> },
  { href: '/worker/dashboard/active', label: 'Active Work', icon: <Briefcase size={16} /> },
  { href: '/worker/dashboard/history',  label: 'Job History', icon: <Clock size={16} /> },
  { href: '/worker/dashboard/disputes', label: 'Disputes',    icon: <Shield size={16} /> },
  { href: '/worker/dashboard/profile', label: 'Profile', icon: <User size={16} /> },
  { href: '/worker/dashboard/notifications', label: 'Notifications', icon: <Bell size={16} /> },
]

/* ─── Stat Card ─── */
function StatCard({ label, value, icon, color = 'brand', sub }) {
  const colors = {
    brand: 'bg-[#ff2400]/10 text-[#ff2400]',
    amber: 'bg-[#ff2400]/10 text-[#ff3a1a]',
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
        <div className="card border-l-4 border-[#ff2400]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-[#ff2400] font-semibold uppercase tracking-wide mb-1">Active Job</div>
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
      toast.success(`New request: ${data.jobTitle} — ₹${data.wage}/${data.jobType === 'per_hour' ? 'hr' : 'day'}`)
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
                      <div className="flex items-center gap-1.5"><MapPin size={13} /> {job?.address}{job?.district ? `, ${job?.district}` : ''}</div>
                      <div className="flex items-center gap-1.5"><IndianRupee size={13} />
                        <strong className="text-white">₹{job?.wage}/{job?.jobType === 'per_hour' ? 'hr' : 'day'}</strong>
                        {job?.jobType === 'per_hour'
                          ? <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">⏱ Hourly</span>
                          : <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">📅 Per Day</span>
                        }
                      </div>
                      {job?.jobType === 'per_day' && (
                        <div className="flex items-center gap-1.5"><Calendar size={13} />
                          Start: {formatDate(job?.startDate)} · {job?.numberOfDays} day{job?.numberOfDays > 1 ? 's' : ''}
                          {job?.reportTime && <span className="ml-1">· Report by {job?.reportTime}</span>}
                        </div>
                      )}
                      {job?.jobType === 'per_hour' && (
                        <div className="flex items-center gap-1.5"><Calendar size={13} />
                          Date: {formatDate(job?.startDate)} · ~{job?.estimatedHours} hr{job?.estimatedHours !== 1 ? 's' : ''}
                          {job?.arrivalTime && <span className="ml-1">· Arrive by {job?.arrivalTime}</span>}
                        </div>
                      )}
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
  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(
        '/jobs/worker?status=ACCEPTED,BOOKING_CONFIRMED,ARRIVED,ACTIVE,WORK_IN_PROGRESS,WORK_DONE,PAYMENT_PENDING'
      )
      setJobs(res.data.jobs || [])
    } catch { toast.error('Failed to load active jobs') }
    finally { setLoading(false) }
  }, [])

  useSocket({
    bookingConfirmed:      (d) => { toast.success(`📋 Booking confirmed: ${d.jobTitle}`);               load() },
    arrivalConfirmed:      (d) => { toast.success(`✅ Arrival confirmed: ${d.jobTitle}`);               load() },
    dailyPayReleased:      (d) => { toast.success(`💰 ${d.message}`);                                   load() },
    hourlyPaymentReleased: (d) => { toast.success(`💰 ${d.message}`);                                   load() },
    hourlyWorkStarted:     (d) => { load() },
  })

  useEffect(() => { load() }, [load])

  // ── GPS capture ────────────────────────────────────────────────────────────
  async function captureGPS() {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        ()  => resolve(null),
        { timeout: 6000, maximumAge: 0, enableHighAccuracy: true }
      )
    })
  }

  const action = async (jobId, endpoint, msg, body = null) => {
    setActing(jobId + endpoint)
    try {
      // Capture GPS for arrival endpoints
      let payload = body || {}
      if (endpoint === 'arrived') {
        const gps = await captureGPS()
        if (gps) { payload = { ...payload, gpsLat: gps.lat, gpsLng: gps.lng, gpsAccuracy: gps.accuracy } }
      }
      await api.patch(`/jobs/${jobId}/${endpoint}`, payload)
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
          <p className="text-xs text-[#6b6b6b] mt-0.5">{jobs.length} job{jobs.length !== 1 ? "s" : ""} in progress</p>
        </div>
        <button onClick={load} className="btn-ghost p-2" title="Refresh"><RefreshCw size={15} /></button>
      </div>

      <RestrictionBanner role="worker" />

      {jobs.length === 0 ? (
        <EmptyState icon={<Briefcase size={32} />} title="No active jobs" desc="Accepted jobs appear here" />
      ) : (
        <div className="space-y-4">
          {jobs.map(job => {
            const isPerHour = job.jobType === "per_hour"
            const wageLabel = isPerHour ? `₹${job.wage}/hr` : `₹${job.wage}/day`
            const barColor  =
              job.status === "BOOKING_CONFIRMED"                ? "bg-blue-500"    :
              job.status === "ARRIVED"                          ? "bg-violet-500"  :
              ["ACTIVE","WORK_IN_PROGRESS"].includes(job.status)? "bg-emerald-500" :
              job.status === "WORK_DONE"                        ? "bg-amber-500"   :
              job.status === "PAYMENT_PENDING"                  ? "bg-[#ff2400]"   : "bg-[#2a2a2a]"

            return (
              <div key={job._id} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-[#3a3a3a] transition-all">
                <div className={`h-1 w-full ${barColor}`} />
                <div className="p-5">

                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-bold text-white text-lg leading-tight">{job.title}</span>
                        <StatusBadge status={job.status} />
                        {isPerHour
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">⏱ Hourly</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">📅 Per Day</span>
                        }
                        {job.attendanceStatus === "SUSPICIOUS" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">⚠️ Verifying</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-sm text-[#6b6b6b]">
                        <div className="flex items-center gap-1.5"><Briefcase size={13} className="shrink-0" /><span className="truncate">{job.employer?.name || "—"}</span></div>
                        <div className="flex items-center gap-1.5"><IndianRupee size={13} className="shrink-0" /><span className="text-white font-semibold">{wageLabel}</span></div>
                        <div className="flex items-center gap-1.5"><MapPin size={13} className="shrink-0" /><span className="truncate">{job.address}{job.district ? `, ${job.district}` : ""}</span></div>
                        <div className="flex items-center gap-1.5"><Calendar size={13} className="shrink-0" />
                          {isPerHour
                            ? <span>{formatDate(job.startDate)} · Arrive: {job.arrivalTime || "—"}</span>
                            : <span>{formatDate(job.startDate)} · {job.numberOfDays} day{job.numberOfDays > 1 ? "s" : ""} · Report: {job.reportTime || "—"}</span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pending action banner */}
                  {job.pendingAction?.waitingFor && (
                    <PendingActionBanner pendingAction={job.pendingAction} role="worker" jobId={job._id} className="mb-3" />
                  )}

                  <div className="border-t border-[#2a2a2a] mb-4" />

                  {/* ── PER DAY ── */}
                  {!isPerHour && (
                    <>
                      {job.status === "BOOKING_CONFIRMED" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3.5 bg-blue-500/8 border border-blue-500/20 rounded-xl">
                            <Calendar size={15} className="text-blue-400 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-blue-300">Booking Confirmed!</div>
                              <div className="text-xs text-blue-400/70 mt-0.5">
                                Report on {formatDate(job.startDate)} by {job.reportTime || "8:00 AM"}
                                {job.workingDays?.length ? ` · ${job.workingDays.join(", ")}` : ""}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => action(job._id, "arrived", "Arrival marked! Employer notified.")}
                            disabled={!!acting} className="btn-primary w-full justify-center">
                            {acting === job._id + "arrived" ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                            Mark I've Arrived
                          </button>
                        </div>
                      )}

                      {job.status === "ARRIVED" && (
                        <div className="flex items-center gap-3 p-3.5 bg-violet-500/8 border border-violet-500/20 rounded-xl">
                          <AlertCircle size={15} className="text-violet-400 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-violet-300">Arrival Marked ✓</div>
                            <div className="text-xs text-violet-400/70 mt-0.5">Waiting for employer to confirm. Auto-confirms in 30 min.</div>
                          </div>
                        </div>
                      )}

                      {["ACTIVE","WORK_IN_PROGRESS"].includes(job.status) && (
                        <div className="space-y-3">
                          {job.workLog?.length > 0 && (
                            <div className="p-3 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e]">
                              <div className="text-xs text-[#555] font-semibold mb-2 uppercase tracking-wider">
                                Daily Progress — {job.totalDaysLogged || 0} of {job.workLog.length} days paid
                              </div>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {job.workLog.map((log, i) => (
                                  <span key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                                    ${log.dayStatus === "paid"        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                                      log.dayStatus === "completed"   ? "bg-[#ff2400]/15 text-[#ff2400] border border-[#ff2400]/20" :
                                      log.dayStatus === "in_progress" ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" :
                                      log.dayStatus === "suspicious"  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                                      log.dayStatus === "absent"      ? "bg-red-500/15 text-red-400 border border-red-500/20" :
                                      "bg-[#1a1a1a] text-[#333] border border-[#222]"}`}>
                                    {i + 1}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3 p-3.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                            <Briefcase size={15} className="text-emerald-400 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-emerald-300">Work In Progress</div>
                              <div className="text-xs text-emerald-400/70 mt-0.5">Earned so far: ₹{job.totalAmountPaid?.toLocaleString("en-IN") || 0}</div>
                            </div>
                          </div>
                          {job.workLog?.filter(l => l.paymentReleased && !l.paymentConfirmed).map(log => (
                            <button key={log._id}
                              onClick={() => action(job._id, `day-pay/${log._id}/confirm`, `₹${log.payAmount} confirmed!`)}
                              disabled={!!acting} className="btn-primary w-full justify-center" style={{ background: "#059669" }}>
                              {acting === job._id + `day-pay/${log._id}/confirm` ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                              Confirm ₹{log.payAmount} Received — {new Date(log.date).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                            </button>
                          ))}
                          {job.workLog?.some(l => l.dayStatus === "paid") && (
                            <button onClick={() => action(job._id, "arrived", "Arrival marked for today!")}
                              disabled={!!acting} className="btn-secondary w-full justify-center">
                              {acting === job._id + "arrived" ? <Loader size={14} className="animate-spin" /> : <MapPin size={15} />}
                              Mark Arrived — Next Day
                            </button>
                          )}
                        </div>
                      )}

                      {job.status === "WORK_DONE" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3.5 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                            <CheckCircle size={15} className="text-amber-400 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-amber-300">All Days Complete!</div>
                              <div className="text-xs text-amber-400/70 mt-0.5">Total: ₹{job.totalAmountPaid?.toLocaleString("en-IN") || 0} received so far</div>
                            </div>
                          </div>
                          {job.workLog?.filter(l => l.paymentReleased && !l.paymentConfirmed).map(log => (
                            <button key={log._id}
                              onClick={() => action(job._id, `day-pay/${log._id}/confirm`, `₹${log.payAmount} confirmed!`)}
                              disabled={!!acting} className="btn-primary w-full justify-center" style={{ background: "#059669" }}>
                              {acting === job._id + `day-pay/${log._id}/confirm` ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                              Confirm ₹{log.payAmount} Received — {new Date(log.date).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* ── PER HOUR ── */}
                  {isPerHour && (
                    <>
                      {job.status === "BOOKING_CONFIRMED" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3.5 bg-blue-500/8 border border-blue-500/20 rounded-xl">
                            <Clock size={15} className="text-blue-400 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-blue-300">Booking Confirmed!</div>
                              <div className="text-xs text-blue-400/70 mt-0.5">
                                Arrive by {job.arrivalTime || "—"} · Est. {job.estimatedHours} hr{job.estimatedHours !== 1 ? "s" : ""}
                                {job.flexibility === "flexible" ? " (±1 hr)" : " (exact)"}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => action(job._id, "on-the-way", "Employer notified you're on the way!")}
                              disabled={!!acting} className="btn-secondary justify-center text-xs py-2">
                              {acting === job._id + "on-the-way" ? <Loader size={13} className="animate-spin" /> : <MapPin size={13} />}
                              On My Way
                            </button>
                            <button onClick={() => action(job._id, "start-work", "Work started! Clock is running.")}
                              disabled={!!acting} className="btn-primary justify-center text-xs py-2">
                              {acting === job._id + "start-work" ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              Start Work
                            </button>
                          </div>
                        </div>
                      )}

                      {job.status === "ARRIVED" && (
                        <div className="space-y-3">
                          <div className="p-3.5 bg-violet-500/8 border border-violet-500/20 rounded-xl">
                            <div className="text-sm font-semibold text-violet-300">Arrived at site</div>
                          </div>
                          <button onClick={() => action(job._id, "start-work", "Work started! Clock is running.")}
                            disabled={!!acting} className="btn-primary w-full justify-center">
                            {acting === job._id + "start-work" ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                            Start Work — Clock In
                          </button>
                        </div>
                      )}

                      {["ACTIVE","WORK_IN_PROGRESS"].includes(job.status) && (
                        <div className="space-y-3">
                          {job.timeLog?.startedAt && (
                            <div className="p-3 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e]">
                              <div className="text-xs text-[#555] font-semibold uppercase tracking-wider mb-1">Clock Running</div>
                              <div className="text-sm text-white">Started: {new Date(job.timeLog.startedAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}</div>
                              <div className="text-xs text-[#6b6b6b] mt-0.5">Rate: ₹{job.wage}/hr</div>
                            </div>
                          )}
                          <button onClick={() => action(job._id, "complete-work", "Work marked complete! Waiting for employer approval.")}
                            disabled={!!acting} className="btn-primary w-full justify-center">
                            {acting === job._id + "complete-work" ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                            Mark Work Complete — Clock Out
                          </button>
                        </div>
                      )}

                      {job.status === "WORK_DONE" && (
                        <div className="space-y-3">
                          {job.timeLog?.startedAt && job.timeLog?.completedAt && (
                            <div className="p-3 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e]">
                              <div className="text-xs text-[#555] font-semibold uppercase tracking-wider mb-2">Work Summary</div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-[#6b6b6b]">Started:</span> <span className="text-white">{new Date(job.timeLog.startedAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></div>
                                <div><span className="text-[#6b6b6b]">Ended:</span> <span className="text-white">{new Date(job.timeLog.completedAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></div>
                                <div><span className="text-[#6b6b6b]">Hours:</span> <span className="text-white">{parseFloat(((new Date(job.timeLog.completedAt)-new Date(job.timeLog.startedAt))/3600000).toFixed(2))} hrs</span></div>
                                <div><span className="text-[#6b6b6b]">Est. Pay:</span> <span className="text-[#ff2400] font-bold">₹{(parseFloat(((new Date(job.timeLog.completedAt)-new Date(job.timeLog.startedAt))/3600000).toFixed(2))*job.wage).toFixed(0)}</span></div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3 p-3.5 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                            <AlertCircle size={15} className="text-amber-400 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-amber-300">Waiting for Employer</div>
                              <div className="text-xs text-amber-400/70 mt-0.5">Employer is reviewing hours and releasing payment</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {job.status === "PAYMENT_PENDING" && (
                        <div className="space-y-3">
                          {job.timeLog?.totalAmount > 0 && (
                            <div className="p-3 rounded-xl bg-[#0e0e0e] border border-[#1e1e1e]">
                              <div className="text-xs text-[#555] font-semibold uppercase tracking-wider mb-1.5">Payment Details</div>
                              <div className="text-lg font-extrabold text-[#ff2400]">₹{job.timeLog.totalAmount}</div>
                              <div className="text-xs text-[#6b6b6b] mt-0.5">{job.timeLog.approvedHours} hrs × ₹{job.wage}/hr · via {job.paymentMode?.toUpperCase()}</div>
                            </div>
                          )}
                          <button onClick={() => action(job._id, "confirm-hourly-pay", "Payment confirmed! Job completed! 🎉")}
                            disabled={!!acting} className="btn-primary w-full justify-center" style={{ background: "#059669" }}>
                            {acting === job._id + "confirm-hourly-pay" ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                            Confirm Payment Received
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Job Timeline */}
                  {job.timeline?.length > 0 && (
                    <div className="mt-4">
                      <JobTimeline timeline={job.timeline} />
                    </div>
                  )}

                </div>
              </div>
            )
          })}
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

  const isPending  = user?.status !== 'approved'
  // Blocked if trying to turn ON while job is active OR account is pending
  const isLocked = (hasActiveJob && !available) || isPending

  const toggle = async () => {
    if (isPending) {
      toast.error('Your account is pending admin approval')
      return
    }
    if (hasActiveJob && !available) {
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
      ${isPending
        ? 'bg-[#141414] border-amber-500/20'
        : hasActiveJob
          ? 'bg-[#141414] border-[#ff2400]/20'
          : 'bg-[#141414] border-[#2a2a2a]'}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-300
          ${isPending ? 'bg-amber-500' :
            hasActiveJob ? 'bg-[#ff2400] shadow-[0_0_8px_rgba(249,115,22,0.6)]' :
              available ? 'bg-emerald-400 shadow-[0_0_8px_#34d39980]' : 'bg-[#3a3a3a]'}`} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Available for Work</div>
          <div className={`text-xs mt-0.5 transition-colors truncate
            ${isPending ? 'text-amber-400' :
              hasActiveJob ? 'text-[#ff2400]' :
                available ? 'text-emerald-400' : 'text-[#6b6b6b]'}`}>
            {isPending
              ? 'Account pending approval — toggle disabled'
              : hasActiveJob
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
          title={
            isPending ? 'Account not yet approved by admin' :
            isLocked ? 'Finish your active job to re-enable availability' : ''
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-300 focus:outline-none
            ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            ${available && !isPending ? 'bg-emerald-500' : 'bg-[#2a2a2a]'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md
            transition-transform duration-300
            ${available && !isPending ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        {/* Tooltip on hover when locked */}
        {isLocked && (
          <div className="absolute right-0 bottom-8 w-52 bg-[#1e1e1e] border border-[#2a2a2a]
            text-xs text-[#a3a3a3] px-3 py-2 rounded-xl shadow-modal
            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {isPending
              ? 'Your account must be approved by admin before you can set availability.'
              : 'You have an active job. Availability will auto-enable once the job is completed.'}
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
    address:         user?.address         || '',
    state:           user?.state           || '',
    district:        user?.district        || '',
    block:           user?.block           || '',
    pincode:         user?.pincode         || '',
    experience:      user?.experience      || 0,
    labourCardNumber: user?.labourCardNumber || '',
  })
  const [loading, setLoading]         = useState(false)
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

  const formatDob = (dob) => {
    if (!dob) return '—'
    return new Date(dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">My Profile</h1>
        {!editing && <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>Edit</button>}
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-2xl flex items-center justify-center text-[#ff2400] text-2xl font-bold">
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

            {/* ── Locked identity fields ── */}
            <div className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl space-y-2.5">
              <p className="text-xs text-[#4a4a4a] flex items-center gap-1.5">
                🔒 <span>These fields cannot be changed after registration</span>
              </p>
              {[
                ['Full Name',     user?.name       || '—'],
                ["Father's Name", user?.fatherName  || '—'],
                ['Gender',        user?.gender      || '—'],
                ['Date of Birth', formatDob(user?.dob)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-[#4a4a4a]">{k}</span>
                  <span className="text-[#6b6b6b] capitalize">{v}</span>
                </div>
              ))}
            </div>

            {/* ── Editable fields ── */}
            <div>
              <label className="label">Address</label>
              <textarea className="input resize-none min-h-[70px]" value={form.address}
                onChange={e => setField('address', e.target.value)} />
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
                {geoLoading.states && <span className="absolute right-3 top-3 text-[#ff2400] text-xs animate-spin">⟳</span>}
              </div>
            </div>

            {/* District + Block */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">District</label>
                <select className="input bg-[#141414]" value={form.district}
                  onChange={e => setField('district', e.target.value)} disabled={!form.state || geoLoading.districts}>
                  <option value="">{geoLoading.districts ? 'Loading...' : form.state ? 'Select district' : 'Select state first'}</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Block</label>
                <select className="input bg-[#141414]" value={form.block}
                  onChange={e => setField('block', e.target.value)} disabled={!form.district || geoLoading.blocks}>
                  <option value="">{geoLoading.blocks ? 'Loading...' : form.district ? 'Select block' : 'Select district first'}</option>
                  {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
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
                <input type="number" className="input" min={0} max={50} value={form.experience}
                  onChange={e => setField('experience', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Labour Card Number <span className="text-[#3a3a3a] text-xs">(optional)</span></label>
              <input className="input" placeholder="Government-issued labour card (if any)"
                value={form.labourCardNumber}
                onChange={e => setField('labourCardNumber', e.target.value)} />
            </div>

            <div className="flex gap-2 pt-2">
              <button className="btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {[
              ['Full Name',      user?.name           || '—'],
              ["Father's Name",  user?.fatherName      || '—'],
              ['Gender',         user?.gender          || '—'],
              ['Date of Birth',  formatDob(user?.dob)],
              ['Worker Type',    user?.workerTypeName  || '—'],
              ['Experience',     `${user?.experience || 0} years`],
              ['Address',        user?.address         || '—'],
              ['State',          user?.state           || '—'],
              ['District',       user?.district        || '—'],
              ['Block',          user?.block           || '—'],
              ['Pincode',        user?.pincode         || '—'],
              ['Labour Card',    user?.labourCardNumber || 'Not provided'],
              ['Completed Jobs', user?.completedJobs   || 0],
              ['Member Since',   formatDate(user?.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 border-b border-[#2a2a2a] last:border-0">
                <span className="text-[#6b6b6b]">{k}</span>
                <span className="text-white font-medium text-right capitalize">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ── Honour Score History ── */}
      <div className="card">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <Star size={16} className="text-[#ff2400]" /> Honour Score History
        </h2>
        {logsLoading ? (
          <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-[#ff2400] border-t-transparent rounded-full animate-spin" /></div>
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
        <Route path="disputes" element={<DisputeCenter />} />
      </Routes>
    </DashboardLayout>
  )
}
