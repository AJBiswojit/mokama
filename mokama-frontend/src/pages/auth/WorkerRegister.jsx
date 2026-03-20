import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../api/AuthContext'
import { api } from '../../api/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, CheckCircle, User, MapPin, Wrench, Mail } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Basic Details' },
  { id: 2, label: 'Address' },
  { id: 3, label: 'Work Details' },
  { id: 4, label: 'Verify Email' },
]

export default function WorkerRegister() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState(1)
  const [workerTypes, setWorkerTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [form, setForm] = useState({
    name: '', fatherName: '', gender: '', dob: '',
    mobile: '', email: '',
    address: '', pincode: '',
    workerType: '', experience: '', labourCardNumber: ''
  })

  useEffect(() => {
    api.get('/auth/categories').then(r => setWorkerTypes(r.data.workerTypes || []))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleNext = async () => {
    if (step === 1) {
      if (!form.name || !form.fatherName || !form.gender || !form.dob || !form.mobile || !form.email)
        return toast.error('Please fill all required fields including email')
      if (!/^[6-9]\d{9}$/.test(form.mobile))
        return toast.error('Enter a valid 10-digit Indian mobile number')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return toast.error('Enter a valid email address')
    }
    if (step === 2) {
      if (!form.address || !form.pincode) return toast.error('Please fill address details')
      if (!/^\d{6}$/.test(form.pincode))   return toast.error('Enter valid 6-digit pincode')
    }
    if (step === 3) {
      // Register and send email OTP
      setLoading(true)
      try {
        const res = await api.post('/auth/worker/register', form)
        setDevOtp(res.data.devOtp || '')
        toast.success(`OTP sent to ${form.email}`)
        setStep(4)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Registration failed')
      } finally { setLoading(false) }
      return
    }
    setStep(s => s + 1)
  }

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter valid 6-digit OTP')
    setLoading(true)
    try {
      const res = await api.post('/auth/worker/verify-otp', {
        mobile: form.mobile, otp
      })
      login(res.data.token, { ...res.data.user, role: 'worker' })
      toast.success('Welcome to MoKama!')
      navigate('/worker/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      const res = await api.post('/auth/worker/register', form)
      setDevOtp(res.data.devOtp || '')
      toast.success('OTP resent to your email!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-4 flex items-center gap-3">
        <Link to="/" className="p-2 hover:bg-[#1a1a1a] rounded-xl">
          <ArrowLeft size={18} className="text-[#a3a3a3]" />
        </Link>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MoKama" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-bold text-white">MoKama</span>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-white">Worker Registration</h1>
            <p className="text-[#6b6b6b] text-sm mt-1">Create your account to find daily work</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-8 relative px-2">
            <div className="absolute top-4 left-4 right-4 h-px bg-[#2a2a2a]">
              <div className="h-full bg-[#f97316] transition-all duration-500"
                style={{ width: `${((step-1)/(STEPS.length-1))*100}%` }} />
            </div>
            {STEPS.map(s => (
              <div key={s.id} className="flex flex-col items-center gap-1.5 z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all
                  ${step > s.id  ? 'bg-[#f97316] border-[#f97316] text-white' :
                    step === s.id ? 'bg-[#0a0a0a] border-[#f97316] text-[#f97316]' :
                                   'bg-[#0a0a0a] border-[#2a2a2a] text-[#6b6b6b]'}`}>
                  {step > s.id ? <CheckCircle size={13} /> : s.id}
                </div>
                <span className={`text-xs font-medium hidden sm:block
                  ${step >= s.id ? 'text-[#a3a3a3]' : 'text-[#3a3a3a]'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 animate-slide-up">

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                  <User size={17} className="text-[#f97316]" /> Basic Details
                </h2>
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" placeholder="e.g. Ramesh Kumar"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Father's Name *</label>
                  <input className="input" placeholder="e.g. Suresh Kumar"
                    value={form.fatherName} onChange={e => set('fatherName', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Gender *</label>
                    <select className="input bg-[#141414]" value={form.gender}
                      onChange={e => set('gender', e.target.value)}>
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Date of Birth *</label>
                    <input type="date" className="input"
                      value={form.dob} onChange={e => set('dob', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Mobile Number * <span className="text-[#6b6b6b] text-xs">(used as your ID)</span></label>
                  <div className="flex gap-2">
                    <span className="input w-16 text-center bg-[#1a1a1a] text-[#a3a3a3] shrink-0">+91</span>
                    <input className="input flex-1" placeholder="10-digit number" maxLength={10}
                      value={form.mobile}
                      onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <p className="text-xs text-[#6b6b6b] mt-1">Your mobile is your unique ID — used to identify you</p>
                </div>
                <div>
                  <label className="label">Email Address *</label>
                  <input className="input" type="email" placeholder="your@email.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                  <p className="text-xs text-[#6b6b6b] mt-1">You will log in using your mobile number + email OTP</p>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                  <MapPin size={17} className="text-[#f97316]" /> Address Details
                </h2>
                <div>
                  <label className="label">Full Address *</label>
                  <textarea className="input min-h-[80px] resize-none"
                    placeholder="House no, Street, Village/Town"
                    value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <div>
                  <label className="label">Pincode *</label>
                  <input className="input" placeholder="6-digit pincode" maxLength={6}
                    value={form.pincode}
                    onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                  <Wrench size={17} className="text-[#f97316]" /> Work Details
                </h2>
                <div>
                  <label className="label">Worker Type</label>
                  <select className="input bg-[#141414]" value={form.workerType}
                    onChange={e => set('workerType', e.target.value)}>
                    <option value="">Select your trade</option>
                    {workerTypes.map(w => <option key={w._id} value={w.name}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Experience (years)</label>
                  <input type="number" className="input" placeholder="0" min={0} max={50}
                    value={form.experience} onChange={e => set('experience', e.target.value)} />
                </div>
                <div>
                  <label className="label">Labour Card Number <span className="text-[#3a3a3a]">(optional)</span></label>
                  <input className="input" placeholder="If available"
                    value={form.labourCardNumber}
                    onChange={e => set('labourCardNumber', e.target.value)} />
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                  ⏳ After registration, your account will be reviewed by our team before full access is granted.
                </div>
              </div>
            )}

            {/* Step 4 — Email OTP */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg mb-2 flex items-center gap-2">
                  <Mail size={17} className="text-[#f97316]" /> Verify Email
                </h2>
                <p className="text-sm text-[#6b6b6b]">
                  OTP sent to <span className="text-white font-medium">{form.email}</span>
                </p>
                <div className="p-3 bg-[#f97316]/10 border border-[#f97316]/20 rounded-xl text-sm text-[#f97316] flex items-center gap-2">
                  <Mail size={14} /> Check your email inbox (and spam folder)
                </div>
                {devOtp && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 font-mono">
                    🔧 Dev OTP: <strong>{devOtp}</strong>
                  </div>
                )}
                <div>
                  <label className="label">Enter 6-digit OTP</label>
                  <input
                    className="input text-center text-2xl tracking-[0.5em] font-bold"
                    maxLength={6} placeholder="••••••"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
                </div>
                <button onClick={handleResend} disabled={loading}
                  className="btn-ghost text-xs w-full justify-center text-[#6b6b6b]">
                  Didn't receive? Resend OTP
                </button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-7 pt-5 border-t border-[#2a2a2a]">
              {step > 1 && step < 4
                ? <button className="btn-ghost" onClick={() => setStep(s => s-1)}>
                    <ArrowLeft size={15} /> Back
                  </button>
                : <div />}
              {step < 4
                ? <button className="btn-primary shadow-glow" onClick={handleNext} disabled={loading}>
                    {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {step === 3 ? 'Register & Send OTP' : 'Continue'} <ArrowRight size={15} />
                  </button>
                : <button className="btn-primary shadow-glow" onClick={handleVerify} disabled={loading}>
                    {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Verify &amp; Register
                  </button>}
            </div>
          </div>

          <p className="text-center text-sm text-[#6b6b6b] mt-6">
            Already registered?{' '}
            <Link to="/worker/login" className="text-[#f97316] font-semibold hover:underline">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
