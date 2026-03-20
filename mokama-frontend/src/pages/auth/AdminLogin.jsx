import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../api/AuthContext'
import { api } from '../../api/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Shield, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!form.email || !form.password) return toast.error('Fill all fields')
    setLoading(true)
    try {
      const res = await api.post('/auth/admin/login', form)
      login(res.data.token, { ...res.data.user, role: 'admin' })
      toast.success('Admin login successful')
      navigate('/admin/dashboard')
    } catch (err) { toast.error(err.response?.data?.message || 'Login failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-4 flex items-center gap-3">
        <Link to="/" className="p-2 hover:bg-[#1a1a1a] rounded-xl"><ArrowLeft size={18} className="text-[#a3a3a3]" /></Link>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MoKama" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-bold text-white">MoKama</span>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={26} className="text-violet-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Admin Login</h1>
            <p className="text-[#6b6b6b] text-sm mt-1">Restricted access. Authorised personnel only.</p>
          </div>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input" placeholder="admin@mokama.in"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-10"
                  placeholder="Enter password" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-[#a3a3a3]">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="w-full justify-center inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-500 active:scale-95 transition-all text-sm"
              onClick={handleLogin} disabled={loading}>
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Login as Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
