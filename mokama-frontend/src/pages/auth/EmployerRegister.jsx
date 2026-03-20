import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../api/AuthContext'
import { api } from '../../api/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, Building, Mail } from 'lucide-react'

export default function EmployerRegister() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [phase, setPhase] = useState('form')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [form, setForm] = useState({
    name: '', mobile: '', email: '',
    address: '', pincode: '', employerCategory: ''
  })

  useEffect(() => {
    api.get('/auth/categories').then(r => setCategories(r.data.employerCategories || []))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleRegister = async () => {
    if (!form.name || !form.mobile || !form.email || !form.address || !form.pincode)
      return toast.error('Please fill all required fields including email')
    if (!/^[6-9]\d{9}$/.test(form.mobile))
      return toast.error('Enter a valid 10-digit Indian mobile number')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return toast.error('Enter a valid email address')
    if (!/^\d{6}$/.test(form.pincode))
      return toast.error('Enter valid 6-digit pincode')

    setLoading(true)
    try {
      const res = await api.post('/auth/employer/register', form)
      setDevOtp(res.data.devOtp || '')
      toast.success(`OTP sent to ${form.email}`)
      setPhase('otp')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter valid 6-digit OTP')
    setLoading(true)
    try {
      const res = await api.post('/auth/employer/verify-otp', {
        mobile: form.mobile, otp
      })
      login(res.data.token, { ...res.data.user, role: 'employer' })
      toast.success('Welcome to MoKama!')
      navigate('/employer/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      const res = await api.post('/auth/employer/register', form)
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
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#f97316]/10 border border-[#f97316]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building size={26} className="text-[#f97316]" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Employer Registration</h1>
            <p className="text-[#6b6b6b] text-sm mt-1">Create your account to post jobs and hire workers</p>
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 animate-slide-up">

            {phase === 'form' ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" placeholder="Your name or organisation"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Mobile Number * <span className="text-[#6b6b6b] text-xs">(your unique ID)</span></label>
                  <div className="flex gap-2">
                    <span className="input w-16 text-center bg-[#1a1a1a] text-[#a3a3a3] shrink-0">+91</span>
                    <input className="input flex-1" placeholder="10-digit number" maxLength={10}
                      value={form.mobile}
                      onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <p className="text-xs text-[#6b6b6b] mt-1">Used to identify you — not for SMS</p>
                </div>
                <div>
                  <label className="label">Email Address *</label>
                  <input className="input" type="email" placeholder="your@email.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="label">Address *</label>
                  <textarea className="input min-h-[80px] resize-none" placeholder="Full address"
                    value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <div>
                  <label className="label">Pincode *</label>
                  <input className="input" placeholder="6-digit pincode" maxLength={6}
                    value={form.pincode}
                    onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} />
                </div>
                <div>
                  <label className="label">Employer Category</label>
                  <select className="input bg-[#141414]" value={form.employerCategory}
                    onChange={e => set('employerCategory', e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                  ⏳ After registration, your account will be reviewed before full access is granted.
                </div>
                <button className="btn-primary w-full justify-center shadow-glow" onClick={handleRegister} disabled={loading}>
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Send OTP
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg flex items-center gap-2">
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
                <input
                  className="input text-center text-2xl tracking-[0.5em] font-bold"
                  maxLength={6} placeholder="••••••"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
                <button className="btn-primary w-full justify-center shadow-glow" onClick={handleVerify} disabled={loading}>
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Verify &amp; Create Account
                </button>
                <button className="btn-ghost w-full justify-center text-[#6b6b6b] text-xs"
                  onClick={handleResend} disabled={loading}>
                  Resend OTP
                </button>
                <button className="btn-ghost w-full justify-center"
                  onClick={() => setPhase('form')}>
                  <ArrowLeft size={13} /> Edit details
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-[#6b6b6b] mt-6">
            Already registered?{' '}
            <Link to="/employer/login" className="text-[#f97316] font-semibold hover:underline">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
