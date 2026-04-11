import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../api/AuthContext'
import { api } from '../../api/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, CheckCircle, User, Briefcase, ShieldCheck, Mail, Loader2 } from 'lucide-react'

// ─── Individual Categories (20) ───────────────────────────────────────────────
const INDIVIDUAL_CATEGORIES = [
  { name: 'Home Owner',               subcategories: ['House Repair', 'Interior Work', 'Cleaning & Maintenance'] },
  { name: 'Farmer (Small)',           subcategories: ['Crop Farming', 'Vegetable Farming', 'Organic Farming'] },
  { name: 'Farmer (Medium)',          subcategories: ['Paddy Farming', 'Cash Crop Farming', 'Mixed Farming'] },
  { name: 'Dairy Farmer',             subcategories: ['Cow Dairy', 'Buffalo Dairy', 'Goat Farming'] },
  { name: 'Poultry Farmer',           subcategories: ['Broiler Farming', 'Layer Farming', 'Duck Farming'] },
  { name: 'Fisherman / Fish Farmer',  subcategories: ['Pond Fishing', 'River Fishing', 'Fish Pond Maintenance'] },
  { name: 'Garden / Horticulture Owner', subcategories: ['Fruit Garden', 'Flower Garden', 'Kitchen Garden'] },
  { name: 'Small Shop Owner',         subcategories: ['Grocery Shop', 'General Store', 'Vegetable Shop'] },
  { name: 'Tea Stall / Hotel Owner',  subcategories: ['Tea Stall', 'Small Dhaba', 'Roadside Food Stall'] },
  { name: 'Transport Owner',          subcategories: ['Auto / Rickshaw Owner', 'Truck Owner', 'Tractor Owner'] },
  { name: 'Petrol Pump Owner',        subcategories: ['Fuel Dispensing', 'Vehicle Servicing', 'Tyre Repair'] },
  { name: 'Livestock Owner',          subcategories: ['Cattle Rearing', 'Sheep / Goat Rearing', 'Pig Farming'] },
  { name: 'Brick Kiln (Individual)',  subcategories: ['Brick Making', 'Moulding', 'Kiln Firing'] },
  { name: 'Orchard Owner',            subcategories: ['Mango Orchard', 'Coconut Farm', 'Banana Plantation'] },
  { name: 'Individual House Builder', subcategories: ['New Construction', 'Renovation', 'Boundary Wall'] },
  { name: 'Private Tutor / School',   subcategories: ['Home Tuition', 'Coaching Centre', 'Skill Classes'] },
  { name: 'Tailoring / Boutique Owner', subcategories: ['Stitching', 'Embroidery', 'Dress Designing'] },
  { name: 'Event / Ceremony Host',    subcategories: ['Wedding', 'Puja / Festival', 'Village Function'] },
  { name: 'Religious Institution (Small)', subcategories: ['Temple', 'Mosque', 'Church / Gurudwara'] },
  { name: 'Individual Warehouse Owner', subcategories: ['Grain Storage', 'Cold Storage Helper', 'Loading Help'] },
]

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Basic Details',    icon: User },
  { id: 2, label: 'Work Details',     icon: Briefcase },
  { id: 3, label: 'Verification',     icon: ShieldCheck },
]

export default function IndividualEmployerRegister() {
  const navigate  = useNavigate()
  const { login } = useAuth()

  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [otpSent, setOtpSent]   = useState(false)
  const [devOtp, setDevOtp]     = useState('')
  const [otp, setOtp]           = useState('')
  const [otpTimer, setOtpTimer] = useState(0)

  // Geo
  const [states, setStates]         = useState([])
  const [districts, setDistricts]   = useState([])
  const [blocks, setBlocks]         = useState([])
  const [geoLoading, setGeoLoading] = useState({ states: false, districts: false, blocks: false })

  const [form, setForm] = useState({
    // Stage 1
    name: '', fatherName: '', gender: '', dob: '',
    address: '', state: '', district: '', block: '', pincode: '',
    // Stage 2
    employerCategory: '', employerSubcategory: '', labourCardNumber: '',
    // Stage 3
    mobile: '', email: '', consent: false,
  })

  const selectedCat   = INDIVIDUAL_CATEGORIES.find(c => c.name === form.employerCategory)
  const subcategories = selectedCat?.subcategories || []

  // Fetch states
  useEffect(() => {
    setGeoLoading(p => ({ ...p, states: true }))
    api.get('/geo/states')
      .then(r => setStates(r.data.states || []))
      .catch(() => toast.error('Failed to load states'))
      .finally(() => setGeoLoading(p => ({ ...p, states: false })))
  }, [])

  // Fetch districts
  useEffect(() => {
    if (!form.state) { setDistricts([]); setBlocks([]); return }
    setGeoLoading(p => ({ ...p, districts: true }))
    setDistricts([]); setBlocks([])
    api.get(`/geo/districts?state=${encodeURIComponent(form.state)}`)
      .then(r => setDistricts(r.data.districts || []))
      .catch(() => toast.error('Failed to load districts'))
      .finally(() => setGeoLoading(p => ({ ...p, districts: false })))
  }, [form.state])

  // Fetch blocks
  useEffect(() => {
    if (!form.district) { setBlocks([]); return }
    setGeoLoading(p => ({ ...p, blocks: true }))
    setBlocks([])
    api.get(`/geo/blocks?state=${encodeURIComponent(form.state)}&district=${encodeURIComponent(form.district)}`)
      .then(r => setBlocks(r.data.blocks || []))
      .catch(() => toast.error('Failed to load blocks'))
      .finally(() => setGeoLoading(p => ({ ...p, blocks: false })))
  }, [form.district])

  // OTP countdown
  useEffect(() => {
    if (otpTimer <= 0) return
    const t = setTimeout(() => setOtpTimer(p => p - 1), 1000)
    return () => clearTimeout(t)
  }, [otpTimer])

  const set = (k, v) => {
    setForm(p => {
      const next = { ...p, [k]: v }
      if (k === 'state')            { next.district = ''; next.block = '' }
      if (k === 'district')         { next.block = '' }
      if (k === 'employerCategory') { next.employerSubcategory = '' }
      return next
    })
  }

  const getAge = dob => {
    if (!dob) return null
    const today = new Date(), birth = new Date(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const validateStage1 = () => {
    if (!form.name.trim())       { toast.error('Full name is required'); return false }
    if (!form.fatherName.trim()) { toast.error("Father's name is required"); return false }
    if (!form.gender)            { toast.error('Please select gender'); return false }
    if (!form.dob)               { toast.error('Date of birth is required'); return false }
    if (getAge(form.dob) < 18)   { toast.error('You must be at least 18 years old to register', { duration: 4000 }); return false }
    if (!form.address.trim())    { toast.error('Address is required'); return false }
    if (!form.state)             { toast.error('Please select your state'); return false }
    if (!form.district)          { toast.error('Please select your district'); return false }
    if (!form.block)             { toast.error('Please select your block'); return false }
    if (!form.pincode)                  { toast.error('Pincode is required'); return false }
    if (!/^\d{6}$/.test(form.pincode)) { toast.error('Enter a valid 6-digit pincode'); return false }
    return true
  }

  const validateStage2 = () => {
    if (!form.employerCategory)    { toast.error('Please select employer category'); return false }
    if (!form.employerSubcategory) { toast.error('Please select employer subcategory'); return false }
    return true
  }

  const validateStage3 = () => {
    if (!form.mobile)                       { toast.error('Mobile number is required'); return false }
    if (!/^[6-9]\d{9}$/.test(form.mobile)) { toast.error('Enter a valid 10-digit Indian mobile number'); return false }
    if (!form.email)                        { toast.error('Email address is required'); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('Enter a valid email address'); return false }
    if (!form.consent) { toast.error('Please accept the Terms & Conditions'); return false }
    return true
  }

  const handleNext = () => {
    if (step === 1 && validateStage1()) setStep(2)
    else if (step === 2 && validateStage2()) setStep(3)
  }

  const buildPayload = () => ({
    name:                form.name.trim(),
    fatherName:          form.fatherName.trim(),
    gender:              form.gender,
    dob:                 form.dob,
    address:             form.address.trim(),
    state:               form.state,
    district:            form.district,
    block:               form.block,
    pincode:             '',
    employerType:        'individual',
    employerCategory:    form.employerCategory,
    employerSubcategory: form.employerSubcategory,
    labourCardNumber:    form.labourCardNumber || '',
    mobile:              form.mobile,
    email:               form.email.trim().toLowerCase(),
  })

  const handleSendOtp = async () => {
    if (!validateStage3()) return
    setLoading(true)
    try {
      const res = await api.post('/auth/employer/register', buildPayload())
      setOtpSent(true); setOtpTimer(60)
      if (res.data.devOtp) setDevOtp(res.data.devOtp)
      toast.success(`OTP sent to ${form.email}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      const res = await api.post('/auth/employer/register', buildPayload())
      setOtpTimer(60)
      if (res.data.devOtp) setDevOtp(res.data.devOtp)
      toast.success('OTP resent!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally { setLoading(false) }
  }

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/employer/verify-otp', { mobile: form.mobile, otp })
      login(res.data.token, { ...res.data.user, role: 'employer' }, res.data.refreshToken)
      toast.success('Welcome to MoKama! 🎉')
      navigate('/employer/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed')
    } finally { setLoading(false) }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/employer/register')} className="p-2 hover:bg-[#1a1a1a] rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-[#a3a3a3]" />
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MoKama" className="h-9 w-18" />
          <span className="font-bold text-white">MoKama</span>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-white">Individual Registration</h1>
            <p className="text-[#6b6b6b] text-sm mt-1">Register as an individual employer</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-8 relative px-2">
            <div className="absolute top-4 left-4 right-4 h-px bg-[#2a2a2a]">
              <div className="h-full bg-[#ff2400] transition-all duration-500"
                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
            </div>
            {STEPS.map(s => {
              const Icon = s.icon
              return (
                <div key={s.id} className="flex flex-col items-center gap-1.5 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                    ${step > s.id  ? 'bg-[#ff2400] border-[#ff2400] text-white' :
                      step === s.id ? 'bg-[#0a0a0a] border-[#ff2400] text-[#ff2400]' :
                                     'bg-[#0a0a0a] border-[#2a2a2a] text-[#6b6b6b]'}`}>
                    {step > s.id ? <CheckCircle size={13} /> : <Icon size={13} />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block
                    ${step >= s.id ? 'text-[#a3a3a3]' : 'text-[#3a3a3a]'}`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 animate-slide-up">

            {/* STAGE 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                  <User size={17} className="text-[#ff2400]" /> Basic Details
                </h2>

                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" placeholder="As per Aadhaar"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>

                <div>
                  <label className="label">Father's Name *</label>
                  <input className="input" placeholder="Father's full name"
                    value={form.fatherName} onChange={e => set('fatherName', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Gender *</label>
                    <select className="input bg-[#141414]" value={form.gender}
                      onChange={e => set('gender', e.target.value)}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Date of Birth *</label>
                    <input type="date" className="input" max={today}
                      value={form.dob} onChange={e => set('dob', e.target.value)} />
                    {form.dob && getAge(form.dob) < 18 && (
                      <p className="text-xs text-red-400 mt-1">🚫 Must be 18+ to register</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Address *</label>
                  <textarea className="input min-h-[72px] resize-none"
                    placeholder="House No., Street, Village/Town"
                    value={form.address} onChange={e => set('address', e.target.value)} />
                </div>

                <div>
                  <label className="label">State *</label>
                  <div className="relative">
                    <select className="input bg-[#141414]" value={form.state}
                      onChange={e => set('state', e.target.value)} disabled={geoLoading.states}>
                      <option value="">{geoLoading.states ? 'Loading...' : 'Select state / UT'}</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {geoLoading.states && <Loader2 size={14} className="absolute right-3 top-3 text-[#ff2400] animate-spin" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">District *</label>
                    <div className="relative">
                      <select className="input bg-[#141414]" value={form.district}
                        onChange={e => set('district', e.target.value)} disabled={!form.state || geoLoading.districts}>
                        <option value="">{geoLoading.districts ? 'Loading...' : form.state ? 'Select district' : 'Select state first'}</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {geoLoading.districts && <Loader2 size={14} className="absolute right-3 top-3 text-[#ff2400] animate-spin" />}
                    </div>
                  </div>
                  <div>
                    <label className="label">Block *</label>
                    <div className="relative">
                      <select className="input bg-[#141414]" value={form.block}
                        onChange={e => set('block', e.target.value)} disabled={!form.district || geoLoading.blocks}>
                        <option value="">{geoLoading.blocks ? 'Loading...' : form.district ? 'Select block' : 'Select district first'}</option>
                        {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      {geoLoading.blocks && <Loader2 size={14} className="absolute right-3 top-3 text-[#ff2400] animate-spin" />}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Pincode *</label>
                  <input className="input" placeholder="6-digit pincode" maxLength={6}
                    value={form.pincode}
                    onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
            )}

            {/* STAGE 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                  <Briefcase size={17} className="text-[#ff2400]" /> Work Details
                </h2>

                <div>
                  <label className="label">Employer Category *</label>
                  <select className="input bg-[#141414]" value={form.employerCategory}
                    onChange={e => set('employerCategory', e.target.value)}>
                    <option value="">Select your category</option>
                    {INDIVIDUAL_CATEGORIES.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Employer Subcategory *</label>
                  <select className="input bg-[#141414]" value={form.employerSubcategory}
                    onChange={e => set('employerSubcategory', e.target.value)}
                    disabled={!form.employerCategory}>
                    <option value="">{form.employerCategory ? 'Select subcategory' : 'Select category first'}</option>
                    {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Job / Labour Card Number <span className="text-[#3a3a3a] text-xs">(optional)</span></label>
                  <input className="input" placeholder="Government-issued labour card (if any)"
                    value={form.labourCardNumber} onChange={e => set('labourCardNumber', e.target.value)} />
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                  ⏳ After registration, your account will be reviewed by our team before full access is granted.
                </div>
              </div>
            )}

            {/* STAGE 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                  <ShieldCheck size={17} className="text-[#ff2400]" /> Verification
                </h2>

                <div>
                  <label className="label">Mobile Number * <span className="text-[#6b6b6b] text-xs">(your unique ID)</span></label>
                  <div className="flex gap-2">
                    <span className="input w-16 text-center bg-[#1a1a1a] text-[#a3a3a3] shrink-0">+91</span>
                    <input className="input flex-1" placeholder="10-digit number" maxLength={10}
                      value={form.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))}
                      disabled={otpSent} />
                  </div>
                  <p className="text-xs text-[#6b6b6b] mt-1">Your mobile number is your unique login ID</p>
                </div>

                <div>
                  <label className="label">Email Address * <span className="text-[#ff2400] text-xs">(OTP will be sent here)</span></label>
                  <input className="input" type="email" placeholder="your@email.com"
                    value={form.email} onChange={e => set('email', e.target.value)}
                    disabled={otpSent} />
                </div>

                <label className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer transition-colors
                  ${form.consent ? 'border-[#ff2400]/40 bg-[#ff2400]/5' : 'border-[#2a2a2a] bg-[#1a1a1a]'}`}>
                  <input type="checkbox" className="mt-0.5 accent-[#ff2400] shrink-0"
                    checked={form.consent} onChange={e => set('consent', e.target.checked)} />
                  <span className="text-xs text-[#a3a3a3] leading-relaxed">
                    I confirm that the information provided is true and agree to abide by the{' '}
                    <span className="text-[#ff2400] underline cursor-pointer">Terms &amp; Conditions</span> of MoKama.
                  </span>
                </label>

                {otpSent && (
                  <>
                    <div className="p-3 bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-xl text-sm text-[#ff2400] flex items-center gap-2">
                      <Mail size={14} /> OTP sent! Check your inbox (and spam folder)
                    </div>
                    {devOtp && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 font-mono">
                        🔧 Dev OTP: <strong>{devOtp}</strong>
                      </div>
                    )}
                    <div>
                      <label className="label">Enter 6-digit OTP</label>
                      <input className="input text-center text-2xl tracking-[0.5em] font-bold"
                        maxLength={6} placeholder="••••••"
                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    <button onClick={handleResend} disabled={otpTimer > 0 || loading}
                      className="btn-ghost text-xs w-full justify-center text-[#6b6b6b] disabled:opacity-40">
                      {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : "Didn't receive? Resend OTP"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-7 pt-5 border-t border-[#2a2a2a]">
              {step > 1
                ? <button className="btn-ghost" onClick={() => { setStep(s => s - 1); setOtpSent(false); setOtp('') }}>
                    <ArrowLeft size={15} /> Back
                  </button>
                : <div />}

              {step < 3 && (
                <button className="btn-primary shadow-glow" onClick={handleNext}>
                  Continue <ArrowRight size={15} />
                </button>
              )}
              {step === 3 && !otpSent && (
                <button className="btn-primary shadow-glow" onClick={handleSendOtp} disabled={loading}>
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Send OTP <ArrowRight size={15} />
                </button>
              )}
              {step === 3 && otpSent && (
                <button className="btn-primary shadow-glow" onClick={handleVerify} disabled={loading}>
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Verify &amp; Register
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-[#6b6b6b] mt-6">
            Already registered?{' '}
            <Link to="/employer/login" className="text-[#ff2400] font-semibold hover:underline">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
