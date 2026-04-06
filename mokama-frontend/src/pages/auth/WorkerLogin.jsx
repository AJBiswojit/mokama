import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../api/AuthContext'
import { api } from '../../api/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail } from 'lucide-react'

export default function WorkerLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [phase, setPhase] = useState('mobile')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile))
      return toast.error('Enter a valid 10-digit Indian mobile number')
    setLoading(true)
    try {
      const res = await api.post('/auth/worker/login', { mobile })
      setMaskedEmail(res.data.email || '')
      setDevOtp(res.data.devOtp || '')
      toast.success('OTP sent to your registered email!')
      setPhase('otp')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter valid 6-digit OTP')
    setLoading(true)
    try {
      const res = await api.post('/auth/worker/login/verify', { mobile, otp })
      login(res.data.token, { ...res.data.user, role: 'worker' }, res.data.refreshToken)
      toast.success('Welcome back!')
      navigate('/worker/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      const res = await api.post('/auth/worker/login', { mobile })
      setDevOtp(res.data.devOtp || '')
      toast.success('OTP resent!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-4 flex items-center gap-3">
        <Link to="/" className="p-2 hover:bg-[#1a1a1a] rounded-xl">
          <ArrowLeft size={18} className="text-[#a3a3a3]" />
        </Link>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MoKama" className="h-10 w-10" />
          <span className="font-bold text-white">MoKama</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <img src="/logo.png" alt="MoKama" className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Worker Login</h1>
            <p className="text-[#6b6b6b] text-sm mt-1">Enter your mobile number to receive an email OTP</p>
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6">
            {phase === 'mobile' ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Mobile Number</label>
                  <div className="flex gap-2">
                    <span className="input w-16 text-center bg-[#1a1a1a] text-[#a3a3a3] shrink-0">+91</span>
                    <input className="input flex-1" placeholder="10-digit number" maxLength={10}
                      value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
                  </div>
                  <p className="text-xs text-[#6b6b6b] mt-1">OTP will be sent to your registered email</p>
                </div>
                <button className="btn-primary w-full justify-center shadow-glow"
                  onClick={handleSendOTP} disabled={loading}>
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Send OTP to Email
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[#6b6b6b]">
                  OTP sent to <span className="text-white font-medium">{maskedEmail}</span>
                </p>
                <div className="p-3 bg-[#f97316]/10 border border-[#f97316]/20 rounded-xl text-sm text-[#f97316] flex items-center gap-2">
                  <Mail size={14} /> Check your email inbox (and spam folder)
                </div>
                {devOtp && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 font-mono">
                    🔧 Dev OTP: <strong>{devOtp}</strong>
                  </div>
                )}
                <input className="input text-center text-2xl tracking-[0.5em] font-bold"
                  maxLength={6} placeholder="••••••"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
                <button className="btn-primary w-full justify-center shadow-glow"
                  onClick={handleVerify} disabled={loading}>
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Verify &amp; Login
                </button>
                <button className="btn-ghost w-full justify-center text-[#6b6b6b] text-xs"
                  onClick={handleResend} disabled={loading}>
                  Resend OTP
                </button>
                <button className="btn-ghost w-full justify-center"
                  onClick={() => { setPhase('mobile'); setOtp(''); setDevOtp('') }}>
                  Change mobile number
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-[#6b6b6b] mt-6">
            New here?{' '}
            <Link to="/worker/register" className="text-[#f97316] font-semibold hover:underline">Register as Worker</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
