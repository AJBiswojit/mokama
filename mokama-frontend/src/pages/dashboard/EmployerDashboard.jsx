import { Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/AuthContext'
import { useAuth } from '../../api/AuthContext'
import DashboardLayout, { HonourBadge, StatusBadge } from '../../components/DashboardLayout'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, PlusCircle, Users, Briefcase, Clock,
  User, Bell, CheckCircle, MapPin, IndianRupee, Calendar,
  Search, Star, RefreshCw, Loader, ChevronRight, AlertCircle
} from 'lucide-react'
import { formatDate, timeAgo } from '../../utils/honour'
import StatusBanner from '../../components/StatusBanner'
import ProfileCompleteness from '../../components/ProfileCompleteness'
import useSocket from '../../socket/useSocket'

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
        <button className="btn-primary shrink-0" onClick={() => navigate('/employer/dashboard/create-job')}>
          <PlusCircle size={16} /> Post a Job
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

/* ─── Create Job ─── */
function CreateJob() {
  const navigate = useNavigate()
  const [workerTypes, setWorkerTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', workerType: '', workerTypeName: '', address: '', pincode: '', wage: '', startDate: '', description: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    api.get('/auth/categories').then(r => setWorkerTypes(r.data.workerTypes || []))
  }, [])

  const submit = async () => {
    if (!form.title || !form.address || !form.pincode || !form.wage || !form.startDate) {
      return toast.error('Fill all required fields')
    }
    setLoading(true)
    try {
      await api.post('/jobs/create', { ...form, workerTypeName: form.workerType })
      toast.success('Job posted successfully!')
      navigate('/employer/dashboard/active-jobs')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create job') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-xl font-extrabold text-white">Post a New Job</h1>
      <div className="card space-y-4">
        <div>
          <label className="label">Job Title *</label>
          <input className="input" placeholder="e.g. Need Mason for 3 days" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Worker Type</label>
            <select className="input" value={form.workerType} onChange={e => set('workerType', e.target.value)}>
              <option value="">Any</option>
              {workerTypes.map(w => <option key={w._id} value={w.name}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Daily Wage (₹) *</label>
            <input type="number" className="input" placeholder="e.g. 600" value={form.wage} onChange={e => set('wage', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Address *</label>
          <textarea className="input resize-none min-h-[70px]" placeholder="Work location address" value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Pincode *</label>
            <input className="input" maxLength={6} placeholder="6-digit" value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div>
            <label className="label">Start Date *</label>
            <input type="date" className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input resize-none min-h-[90px]" placeholder="Additional details about the job..." value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <button className="btn-primary w-full justify-center" onClick={submit} disabled={loading}>
          {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          Post Job
        </button>
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
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title} (₹{j.wage}/day)</option>)}
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
      const active = (res.data.jobs || []).filter(j => !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(j.status))
      setJobs(active)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useSocket({
    requestAccepted: (data) => {
      toast.success(`✅ ${data.workerName} accepted: ${data.jobTitle}`)
      load() // refresh jobs list
    },
    requestRejected: (data) => {
      toast.error(`❌ ${data.workerName} rejected: ${data.jobTitle}`)
      load()
    },
    workCompleted: (data) => {
      toast.success(`🏁 Work completed by ${data.workerName}!`)
      // Update job status to PAYMENT_PENDING in UI
      setJobs(prev => prev.map(j =>
        j._id?.toString() === data.jobId?.toString()
          ? { ...j, status: 'PAYMENT_PENDING', workCompletedAt: data.completedAt }
          : j
      ))
    },
    paymentReceived: (data) => {
      toast.success(`✅ ${data.workerName} confirmed payment received`)
      if (data.isCompleted) {
        toast.success('Job fully completed! 🎉')
        load()
      }
    },
  })

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
        <h1 className="text-xl font-extrabold text-white">Active Jobs</h1>
        <button onClick={load} className="btn-ghost text-xs"><RefreshCw size={14} /></button>
      </div>
      {jobs.length === 0 ? (
        <EmptyState icon={<Briefcase size={32} />} title="No active jobs" desc="Post a job to get started" />
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job._id} className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-white">{job.title}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="text-sm text-[#6b6b6b] space-y-1">
                    <div className="flex items-center gap-1.5"><IndianRupee size={13} /> ₹{job.wage}/day</div>
                    <div className="flex items-center gap-1.5"><MapPin size={13} /> {job.address}, {job.pincode}</div>
                    <div className="flex items-center gap-1.5"><Calendar size={13} /> Start: {formatDate(job.startDate)}</div>
                    {job.worker && (
                      <div className="flex items-center gap-1.5"><Users size={13} /> Worker: {job.worker.name}
                        <HonourBadge score={job.worker.honourScore} small /></div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-[#2a2a2a]">
                {job.status === 'ACCEPTED' && (
                  <button onClick={() => action(job._id, 'start', 'Work started!')}
                    disabled={!!acting} className="btn-primary text-xs py-2">
                    {acting === job._id + 'start' ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Confirm Work Started
                  </button>
                )}
                {job.status === 'PAYMENT_PENDING' && !job.paymentConfirmedByEmployer && (
                  <button onClick={() => action(job._id, 'confirm-payment', 'Payment confirmed!')}
                    disabled={!!acting} className="btn-primary text-xs py-2 bg-emerald-600 hover:bg-emerald-700">
                    {acting === job._id + 'confirm-payment' ? <Loader size={13} className="animate-spin" /> : <IndianRupee size={13} />}
                    Confirm Payment Sent
                  </button>
                )}
                {job.status === 'PAYMENT_PENDING' && job.paymentConfirmedByEmployer && (
                  <div className="text-xs text-[#6b6b6b] flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] rounded-lg">
                    <AlertCircle size={13} /> Waiting for worker to confirm receipt
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
    // Individual editable
    labourCardNumber:    user?.labourCardNumber     || '',
    // Organisation editable
    labourLicenseNumber: user?.labourLicenseNumber  || '',
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
    api.get('/employer/honour-log')
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
      const res = await api.put('/employer/profile', form)
      updateUser(res.data.employer)
      toast.success('Profile updated')
      setEditing(false)
    } catch { toast.error('Update failed') }
    finally { setLoading(false) }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // Locked fields differ by type
  const lockedFields = isOrg
    ? [
        ['Organisation Name',   user?.name              || '—'],
        ['Establishment Date',  formatDate(user?.establishmentDate)],
        ['GST Number',          user?.gstNumber          || 'Not provided'],
      ]
    : [
        ['Full Name',           user?.name              || '—'],
        ["Father's Name",       user?.fatherName         || '—'],
        ['Gender',              user?.gender             || '—'],
        ['Date of Birth',       formatDate(user?.dob)],
      ]

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
            <div className="text-xs text-[#ff2400] mt-0.5 capitalize">{user?.employerType || 'individual'} employer</div>
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
              {lockedFields.map(([k, v]) => (
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

            <div>
              <label className="label">Pincode</label>
              <input className="input" maxLength={6} value={form.pincode}
                onChange={e => setField('pincode', e.target.value.replace(/\D/g, ''))} />
            </div>

            {/* Labour card — individual only */}
            {!isOrg && (
              <div>
                <label className="label">Labour Card Number <span className="text-[#3a3a3a] text-xs">(optional)</span></label>
                <input className="input" placeholder="Government-issued labour card (if any)"
                  value={form.labourCardNumber}
                  onChange={e => setField('labourCardNumber', e.target.value)} />
              </div>
            )}

            {/* Labour license — organisation only */}
            {isOrg && (
              <div>
                <label className="label">Labour License Number <span className="text-[#3a3a3a] text-xs">(optional)</span></label>
                <input className="input" placeholder="Govt issued labour license (if any)"
                  value={form.labourLicenseNumber}
                  onChange={e => setField('labourLicenseNumber', e.target.value)} />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button className="btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {[
              ['Type',          isOrg ? 'Organisation' : 'Individual'],
              ['Category',      user?.employerCategoryName || '—'],
              ['Subcategory',   user?.employerSubcategory  || '—'],
              ...(isOrg ? [
                ['Org Name',          user?.name                  || '—'],
                ['Establishment Date',formatDate(user?.establishmentDate)],
                ['GST Number',        user?.gstNumber              || 'Not provided'],
                ['Labour License',    user?.labourLicenseNumber    || 'Not provided'],
              ] : [
                ['Full Name',         user?.name                  || '—'],
                ["Father's Name",     user?.fatherName             || '—'],
                ['Gender',            user?.gender                 || '—'],
                ['Date of Birth',     formatDate(user?.dob)],
                ['Labour Card',       user?.labourCardNumber       || 'Not provided'],
              ]),
              ['Address',       user?.address  || '—'],
              ['State',         user?.state    || '—'],
              ['District',      user?.district || '—'],
              ['Block',         user?.block    || '—'],
              ['Pincode',       user?.pincode  || '—'],
              ['Completed Jobs',user?.completedJobs || 0],
              ['Member Since',  formatDate(user?.createdAt)],
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
