import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/AuthContext'
import { useAuth } from '../../api/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import toast from 'react-hot-toast'
import {
  Briefcase, MapPin, Calendar, ChevronRight, ChevronLeft,
  Clock, IndianRupee, Users, AlertCircle, Loader, CheckCircle,
  LayoutDashboard, PlusCircle, Bell, User
} from 'lucide-react'

// ─── Nav (mirrors EmployerDashboard) ─────────────────────────────────────────
const NAV = [
  { href: '/employer/dashboard',              label: 'Dashboard',     icon: <LayoutDashboard size={16} /> },
  { href: '/employer/dashboard/create-job',   label: 'Create Job',    icon: <PlusCircle size={16} /> },
  { href: '/employer/dashboard/workers',      label: 'Find Workers',  icon: <Users size={16} /> },
  { href: '/employer/dashboard/active-jobs',  label: 'Active Jobs',   icon: <Briefcase size={16} /> },
  { href: '/employer/dashboard/history',      label: 'Job History',   icon: <Clock size={16} /> },
  { href: '/employer/dashboard/profile',      label: 'Profile',       icon: <User size={16} /> },
  { href: '/employer/dashboard/notifications',label: 'Notifications', icon: <Bell size={16} /> },
]

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = ['Job Basics', 'Location', 'Schedule & Pay']

const SHIFT_OPTIONS = [
  { value: 'morning_half', label: 'Morning Half', desc: 'Approx. 6 AM – 12 PM (6 hrs)' },
  { value: 'full_day',     label: 'Full Day',     desc: 'Approx. 8 AM – 5 PM (9 hrs)' },
  { value: 'custom',       label: 'Custom',       desc: 'Set your own start & end time' },
]

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const HOURS_OPTIONS = [
  { value: 1,   label: '1 hour' },
  { value: 1.5, label: '1.5 hours' },
  { value: 2,   label: '2 hours' },
  { value: 3,   label: '3 hours' },
  { value: 4,   label: '4 hours' },
  { value: 5,   label: '5 hours' },
  { value: 6,   label: '6 hours' },
  { value: 8,   label: 'Full Day (8 hrs)' },
]

const REPORT_TIMES = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00']
const ARRIVAL_TIMES = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00',
]

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

function addWorkingDays(startDate, days, workingDays) {
  if (!startDate || !days) return null
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const active = new Set(workingDays.map(d => dayMap[d]))
  const cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)
  let added = 0; let iters = 0
  while (added < days && iters < 120) {
    iters++
    if (active.size === 0 || active.has(cursor.getDay())) added++
    if (added < days) cursor.setDate(cursor.getDate() + 1)
  }
  return cursor.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
            ${i === current
              ? 'bg-[#ff2400]/15 text-[#ff2400] border border-[#ff2400]/30'
              : i < current
                ? 'text-[#22c55e]'
                : 'text-[#3a3a3a]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
              ${i < current ? 'bg-[#22c55e] text-white' : i === current ? 'bg-[#ff2400] text-white' : 'bg-[#222] text-[#555]'}`}>
              {i < current ? <CheckCircle size={12} /> : i + 1}
            </span>
            {step}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-px mx-1 ${i < current ? 'bg-[#22c55e]' : 'bg-[#222]'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[#ff2400]">{icon}</span>
      <h3 className="font-bold text-white text-sm">{title}</h3>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateJob() {
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const [step,     setStep]     = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [workerTypes, setWorkerTypes] = useState([])

  // Geo state
  const [states,    setStates]    = useState([])
  const [districts, setDistricts] = useState([])
  const [blocks,    setBlocks]    = useState([])
  const [geoLoad,   setGeoLoad]   = useState({ states: false, districts: false, blocks: false })

  // Form state
  const [form, setForm] = useState({
    // Step 1
    title:        '',
    workerType:   '',
    workersNeeded: 1,
    description:  '',
    // Step 2
    state:    '', district: '', block: '',
    address:  '', landmark: '', pincode: '',
    // Step 3
    jobType:      'per_day',
    startDate:    '',
    numberOfDays: 1,
    reportTime:   '08:00',
    workShift:    'full_day',
    customShiftStart: '', customShiftEnd: '',
    workingDays:  ['Mon','Tue','Wed','Thu','Fri','Sat'],
    breakIncluded: true,
    arrivalTime:    '09:00',
    estimatedHours: 2,
    flexibility:    'exact',
    wage:         '',
    paymentMode:  'cash',
    urgency:      'normal',
    experienceRequired: 'none',
    genderPreference:   'any',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Load worker types ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/auth/categories')
      .then(r => setWorkerTypes(r.data.workerTypes || []))
      .catch(() => {})
  }, [])

  // ── Geo dropdowns ──────────────────────────────────────────────────────────
  useEffect(() => {
    setGeoLoad(p => ({ ...p, states: true }))
    api.get('/geo/states')
      .then(r => setStates(r.data.states || []))
      .finally(() => setGeoLoad(p => ({ ...p, states: false })))
  }, [])

  useEffect(() => {
    if (!form.state) { setDistricts([]); setBlocks([]); return }
    setGeoLoad(p => ({ ...p, districts: true }))
    set('district', ''); set('block', '')
    api.get(`/geo/districts?state=${encodeURIComponent(form.state)}`)
      .then(r => setDistricts(r.data.districts || []))
      .finally(() => setGeoLoad(p => ({ ...p, districts: false })))
  }, [form.state])

  useEffect(() => {
    if (!form.district) { setBlocks([]); return }
    setGeoLoad(p => ({ ...p, blocks: true }))
    set('block', '')
    api.get(`/geo/blocks?state=${encodeURIComponent(form.state)}&district=${encodeURIComponent(form.district)}`)
      .then(r => setBlocks(r.data.blocks || []))
      .finally(() => setGeoLoad(p => ({ ...p, blocks: false })))
  }, [form.district])

  // ── Approval guard ─────────────────────────────────────────────────────────
  if (user?.status !== 'approved') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="card max-w-md w-full text-center p-10 border border-amber-500/20 bg-amber-500/5">
          <span className="text-5xl mb-4 block">⏳</span>
          <h2 className="text-xl font-extrabold text-white mb-2">Approval Pending</h2>
          <p className="text-[#a3a3a3] text-sm mb-6">
            Your account is under review. You can post jobs once approved.
          </p>
          <button className="btn-ghost w-full justify-center" onClick={() => navigate('/employer/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Validation per step ────────────────────────────────────────────────────
  function validateStep() {
    if (step === 0) {
      if (!form.title.trim()) { toast.error('Job title is required'); return false }
      return true
    }
    if (step === 1) {
      if (!form.state)    { toast.error('Select a state');    return false }
      if (!form.district) { toast.error('Select a district'); return false }
      if (!form.address.trim()) { toast.error('Address is required'); return false }
      if (!form.pincode || form.pincode.length !== 6) { toast.error('Valid 6-digit pincode required'); return false }
      return true
    }
    if (step === 2) {
      if (!form.startDate) { toast.error('Start date is required'); return false }
      if (!form.wage || parseFloat(form.wage) <= 0) {
        toast.error(form.jobType === 'per_hour' ? 'Hourly rate is required' : 'Daily wage is required')
        return false
      }
      if (form.jobType === 'per_day' && form.workingDays.length === 0) {
        toast.error('Select at least one working day')
        return false
      }
      if (form.jobType === 'per_day' && form.workShift === 'custom') {
        if (!form.customShiftStart || !form.customShiftEnd) {
          toast.error('Set custom shift start and end times')
          return false
        }
      }
      return true
    }
    return true
  }

  function nextStep() {
    if (!validateStep()) return
    setStep(s => s + 1)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submit() {
    if (!validateStep()) return
    setLoading(true)
    try {
      await api.post('/jobs/create', {
        ...form,
        workersNeeded:  parseInt(form.workersNeeded) || 1,
        numberOfDays:   parseInt(form.numberOfDays)  || 1,
        estimatedHours: parseFloat(form.estimatedHours) || 0,
        wage:           parseFloat(form.wage),
      })
      toast.success('Job posted successfully!')
      navigate('/employer/dashboard/active-jobs')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post job')
    } finally {
      setLoading(false)
    }
  }

  // ── Computed values ────────────────────────────────────────────────────────
  const endDateLabel = form.jobType === 'per_day' && form.startDate && form.numberOfDays
    ? addWorkingDays(form.startDate, parseInt(form.numberOfDays), form.workingDays)
    : null

  const estimatedTotal = form.wage && form.jobType === 'per_day'
    ? `Est. total: ₹${(parseFloat(form.wage) * parseInt(form.numberOfDays || 1)).toLocaleString('en-IN')}`
    : form.wage && form.jobType === 'per_hour' && form.estimatedHours
      ? `Est. total: ₹${(parseFloat(form.wage) * parseFloat(form.estimatedHours)).toLocaleString('en-IN')}`
      : null

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Job Basics
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <div className="space-y-5 animate-fade-in">
      <SectionTitle icon={<Briefcase size={16} />} title="Job Basics" />

      <div>
        <label className="label">Job Title *</label>
        <input
          className="input" placeholder='e.g. "Need Mason for 3 days"'
          value={form.title} onChange={e => set('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Worker Type</label>
          <select className="input" value={form.workerType} onChange={e => set('workerType', e.target.value)}>
            <option value="">Any / Not specific</option>
            {workerTypes.map(w => <option key={w._id} value={w.name}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Workers Needed</label>
          <input
            type="number" className="input" min={1} max={50}
            value={form.workersNeeded} onChange={e => set('workersNeeded', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Job Description <span className="text-[#3a3a3a] text-xs">(optional)</span></label>
        <textarea
          className="input resize-none min-h-[90px]"
          placeholder="Describe the work in detail — what needs to be done, any special tools needed, etc."
          value={form.description} onChange={e => set('description', e.target.value)}
        />
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Location
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-5 animate-fade-in">
      <SectionTitle icon={<MapPin size={16} />} title="Work Location" />

      {/* State */}
      <div>
        <label className="label">State *</label>
        <select
          className="input" value={form.state}
          onChange={e => set('state', e.target.value)}
          disabled={geoLoad.states}>
          <option value="">{geoLoad.states ? 'Loading...' : 'Select state'}</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* District + Block */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">District *</label>
          <select
            className="input" value={form.district}
            onChange={e => set('district', e.target.value)}
            disabled={!form.state || geoLoad.districts}>
            <option value="">{geoLoad.districts ? 'Loading...' : form.state ? 'Select district' : 'Select state first'}</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Block <span className="text-[#3a3a3a] text-xs">(optional)</span></label>
          <select
            className="input" value={form.block}
            onChange={e => set('block', e.target.value)}
            disabled={!form.district || geoLoad.blocks}>
            <option value="">{geoLoad.blocks ? 'Loading...' : form.district ? 'Select block' : 'Select district first'}</option>
            {blocks.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="label">Full Address *</label>
        <textarea
          className="input resize-none min-h-[70px]"
          placeholder="House no., street, village, town"
          value={form.address} onChange={e => set('address', e.target.value)}
        />
      </div>

      {/* Landmark + Pincode */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Landmark <span className="text-[#3a3a3a] text-xs">(optional)</span></label>
          <input
            className="input" placeholder="Near school, temple, etc."
            value={form.landmark} onChange={e => set('landmark', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Pincode *</label>
          <input
            className="input" maxLength={6} placeholder="6-digit"
            value={form.pincode}
            onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — Schedule & Pay
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <SectionTitle icon={<Calendar size={16} />} title="Schedule & Pay" />

      {/* ── Job Type Toggle ── */}
      <div>
        <label className="label">How will you pay?</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'per_day',  label: 'Per Day',  desc: 'Mason, Labourer, Cook, Guard', icon: '📅' },
            { value: 'per_hour', label: 'Per Hour', desc: 'Electrician, Plumber, Carpenter', icon: '⏱️' },
          ].map(opt => (
            <button
              key={opt.value} type="button"
              onClick={() => set('jobType', opt.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all
                ${form.jobType === opt.value
                  ? 'border-[#ff2400] bg-[#ff2400]/8'
                  : 'border-[#222] bg-[#111] hover:border-[#333]'}`}>
              <div className="text-2xl mb-1">{opt.icon}</div>
              <div className={`font-bold text-sm ${form.jobType === opt.value ? 'text-[#ff2400]' : 'text-white'}`}>
                {opt.label}
              </div>
              <div className="text-xs text-[#555] mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── PER DAY scheduler ── */}
      {form.jobType === 'per_day' && (
        <div className="space-y-5 p-4 rounded-xl border border-[#1e1e1e] bg-[#0e0e0e]">
          <p className="text-xs text-[#555] font-semibold uppercase tracking-wider">Per Day Schedule</p>

          {/* Start date + number of days */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input
                type="date" className="input"
                min={new Date().toISOString().split('T')[0]}
                value={form.startDate} onChange={e => set('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Number of Days</label>
              <input
                type="number" className="input" min={1} max={90}
                value={form.numberOfDays}
                onChange={e => set('numberOfDays', e.target.value)}
              />
            </div>
          </div>

          {/* Auto end date display */}
          {endDateLabel && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#222]">
              <CheckCircle size={14} className="text-[#22c55e] shrink-0" />
              <span className="text-sm text-[#a0a0a0]">
                Work ends on <strong className="text-white">{endDateLabel}</strong>
              </span>
            </div>
          )}

          {/* Working days */}
          <div>
            <label className="label">Working Days</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {WEEK_DAYS.map(day => (
                <button
                  key={day} type="button"
                  onClick={() => {
                    const current = form.workingDays
                    set('workingDays', current.includes(day)
                      ? current.filter(d => d !== day)
                      : [...current, day])
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${form.workingDays.includes(day)
                      ? 'bg-[#ff2400]/15 border-[#ff2400]/40 text-[#ff2400]'
                      : 'bg-[#111] border-[#222] text-[#555] hover:border-[#333]'}`}>
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Report time */}
          <div>
            <label className="label">Report Time (Worker should arrive by)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {REPORT_TIMES.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => set('reportTime', t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${form.reportTime === t
                      ? 'bg-[#ff2400]/15 border-[#ff2400]/40 text-[#ff2400]'
                      : 'bg-[#111] border-[#222] text-[#555] hover:border-[#333]'}`}>
                  {formatTime(t)}
                </button>
              ))}
            </div>
          </div>

          {/* Work shift */}
          <div>
            <label className="label">Work Shift</label>
            <div className="space-y-2 mt-1">
              {SHIFT_OPTIONS.map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => set('workShift', opt.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left
                    ${form.workShift === opt.value
                      ? 'border-[#ff2400]/40 bg-[#ff2400]/8'
                      : 'border-[#1e1e1e] bg-[#111] hover:border-[#2a2a2a]'}`}>
                  <div>
                    <div className={`text-sm font-semibold ${form.workShift === opt.value ? 'text-[#ff2400]' : 'text-white'}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-[#555]">{opt.desc}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0
                    ${form.workShift === opt.value ? 'border-[#ff2400] bg-[#ff2400]' : 'border-[#333]'}`} />
                </button>
              ))}
            </div>

            {/* Custom shift times */}
            {form.workShift === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="label">Start Time</label>
                  <input
                    type="time" className="input"
                    value={form.customShiftStart}
                    onChange={e => set('customShiftStart', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input
                    type="time" className="input"
                    value={form.customShiftEnd}
                    onChange={e => set('customShiftEnd', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Break */}
          <button
            type="button"
            onClick={() => set('breakIncluded', !form.breakIncluded)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border w-full transition-all text-left
              ${form.breakIncluded ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-[#1e1e1e] bg-[#111]'}`}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
              ${form.breakIncluded ? 'border-[#22c55e] bg-[#22c55e]' : 'border-[#333]'}`}>
              {form.breakIncluded && <CheckCircle size={10} className="text-white" />}
            </div>
            <div>
              <div className="text-sm text-white font-medium">1 hour lunch break included</div>
              <div className="text-xs text-[#555]">Workers get a mid-day break</div>
            </div>
          </button>
        </div>
      )}

      {/* ── PER HOUR scheduler ── */}
      {form.jobType === 'per_hour' && (
        <div className="space-y-5 p-4 rounded-xl border border-[#1e1e1e] bg-[#0e0e0e]">
          <p className="text-xs text-[#555] font-semibold uppercase tracking-wider">Hourly Schedule</p>

          {/* Job date */}
          <div>
            <label className="label">Job Date *</label>
            <input
              type="date" className="input"
              min={new Date().toISOString().split('T')[0]}
              value={form.startDate} onChange={e => set('startDate', e.target.value)}
            />
          </div>

          {/* Arrival time */}
          <div>
            <label className="label">Worker Should Arrive By</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ARRIVAL_TIMES.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => set('arrivalTime', t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${form.arrivalTime === t
                      ? 'bg-[#ff2400]/15 border-[#ff2400]/40 text-[#ff2400]'
                      : 'bg-[#111] border-[#222] text-[#555] hover:border-[#333]'}`}>
                  {formatTime(t)}
                </button>
              ))}
            </div>
          </div>

          {/* Estimated duration */}
          <div>
            <label className="label">Estimated Duration</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {HOURS_OPTIONS.map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => set('estimatedHours', opt.value)}
                  className={`py-2 px-2 rounded-xl border text-xs font-semibold transition-all
                    ${form.estimatedHours === opt.value
                      ? 'bg-[#ff2400]/15 border-[#ff2400]/40 text-[#ff2400]'
                      : 'bg-[#111] border-[#222] text-[#555] hover:border-[#333]'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Flexibility */}
          <div>
            <label className="label">Time Flexibility</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {[
                { value: 'exact',    label: 'Exact Time',      desc: 'Worker must arrive on time' },
                { value: 'flexible', label: 'Flexible ±1 hr',  desc: 'Some flexibility allowed' },
              ].map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => set('flexibility', opt.value)}
                  className={`p-3 rounded-xl border text-left transition-all
                    ${form.flexibility === opt.value
                      ? 'border-[#ff2400]/40 bg-[#ff2400]/8'
                      : 'border-[#1e1e1e] bg-[#111] hover:border-[#2a2a2a]'}`}>
                  <div className={`text-xs font-bold ${form.flexibility === opt.value ? 'text-[#ff2400]' : 'text-white'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-[#555] mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Pay ── */}
      <div className="space-y-4">
        <SectionTitle icon={<IndianRupee size={16} />} title="Payment" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">
              {form.jobType === 'per_hour' ? 'Hourly Rate (₹)' : 'Daily Wage (₹)'} *
            </label>
            <input
              type="number" className="input"
              placeholder={form.jobType === 'per_hour' ? 'e.g. 150' : 'e.g. 600'}
              value={form.wage} onChange={e => set('wage', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Est. total */}
        {estimatedTotal && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#222]">
            <IndianRupee size={14} className="text-[#ff2400] shrink-0" />
            <span className="text-sm text-[#a0a0a0]">{estimatedTotal}</span>
          </div>
        )}
      </div>

      {/* ── Requirements ── */}
      <div className="space-y-4">
        <SectionTitle icon={<Users size={16} />} title="Requirements" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Experience Required</label>
            <select className="input" value={form.experienceRequired} onChange={e => set('experienceRequired', e.target.value)}>
              <option value="none">None (freshers ok)</option>
              <option value="1-2years">1–2 years</option>
              <option value="3plus">3+ years</option>
            </select>
          </div>
          <div>
            <label className="label">Gender Preference</label>
            <select className="input" value={form.genderPreference} onChange={e => set('genderPreference', e.target.value)}>
              <option value="any">Any</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="label">Urgency</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'normal', label: 'Normal',  desc: 'Standard listing', icon: '📋' },
              { value: 'urgent', label: 'Urgent',  desc: 'Highlighted to workers', icon: '🚨' },
            ].map(opt => (
              <button
                key={opt.value} type="button"
                onClick={() => set('urgency', opt.value)}
                className={`p-3 rounded-xl border text-left transition-all
                  ${form.urgency === opt.value
                    ? 'border-[#ff2400]/40 bg-[#ff2400]/8'
                    : 'border-[#1e1e1e] bg-[#111] hover:border-[#2a2a2a]'}`}>
                <span className="text-lg">{opt.icon}</span>
                <div className={`text-xs font-bold mt-1 ${form.urgency === opt.value ? 'text-[#ff2400]' : 'text-white'}`}>
                  {opt.label}
                </div>
                <div className="text-xs text-[#555]">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout navItems={NAV} role="employer">
    <div className="animate-fade-in w-full">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-white">Post a New Job</h1>
        <p className="text-[#555] text-sm mt-1">Fill in the details to find the right worker</p>
      </div>

      <StepIndicator current={step} />

      <div className="card space-y-6">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1e1e1e]">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => step === 0 ? navigate('/employer/dashboard') : setStep(s => s - 1)}>
            <ChevronLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={nextStep}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={submit} disabled={loading}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Posting...</>
                : <><CheckCircle size={16} /> Post Job</>}
            </button>
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}
