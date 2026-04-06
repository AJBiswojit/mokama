import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Building2, ArrowRight } from 'lucide-react'

export default function EmployerTypeSelect() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">

      {/* Header */}
      <header className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-4 flex items-center gap-3">
        <Link to="/" className="p-2 hover:bg-[#1a1a1a] rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-[#a3a3a3]" />
        </Link>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MoKama" className="h-10 w-10" />
          <span className="font-bold text-white">MoKama</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-extrabold text-white">Register as Employer</h1>
            <p className="text-[#6b6b6b] text-sm mt-2">Choose how you want to hire on MoKama</p>
          </div>

          {/* Cards */}
          <div className="space-y-4">

            {/* Individual */}
            <button
              onClick={() => navigate('/employer/register/individual')}
              className="w-full group bg-[#141414] border border-[#2a2a2a] hover:border-[#f97316] hover:bg-[#f97316]/5 rounded-2xl p-6 text-left transition-all duration-200 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center group-hover:bg-[#f97316]/20 transition-colors">
                    <User size={22} className="text-[#f97316]" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-base">Individual</p>
                    <p className="text-[#6b6b6b] text-xs mt-0.5">Home owner, farmer, shop owner</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-[#3a3a3a] group-hover:text-[#f97316] transition-colors" />
              </div>
            </button>

            {/* Organisation */}
            <button
              onClick={() => navigate('/employer/register/organisation')}
              className="w-full group bg-[#141414] border border-[#2a2a2a] hover:border-[#f97316] hover:bg-[#f97316]/5 rounded-2xl p-6 text-left transition-all duration-200 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center group-hover:bg-[#f97316]/20 transition-colors">
                    <Building2 size={22} className="text-[#f97316]" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-base">Organisation</p>
                    <p className="text-[#6b6b6b] text-xs mt-0.5">Contractor, company, institution, NGO</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-[#3a3a3a] group-hover:text-[#f97316] transition-colors" />
              </div>
            </button>
          </div>

          <p className="text-center text-sm text-[#6b6b6b] mt-8">
            Already registered?{' '}
            <Link to="/employer/login" className="text-[#f97316] font-semibold hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
