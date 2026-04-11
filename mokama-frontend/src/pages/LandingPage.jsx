import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu, X, ChevronDown, HardHat, Building2, Shield,
  CheckCircle, Users, Briefcase, Star, MapPin, Phone,
  Mail, Hammer, Wrench, Zap, Tractor, Package, PaintBucket,
  Landmark, Factory, Truck, TreePine, ClipboardList,
  ArrowRight, BadgeCheck, Lock, IndianRupee, HeartHandshake,
  ShoppingBag,
} from 'lucide-react'

// ─── Nav Dropdown ─────────────────────────────────────────────────────────────
function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const enter = () => { clearTimeout(timer.current); setOpen(true) }
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 150) }

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#e0e0e0] rounded-lg hover:text-[#ff2400] transition-colors">
        {label} <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="absolute -top-2 left-0 right-0 h-3 bg-transparent" />
          {items.map(item => (
            <Link key={item.label} to={item.href}
              className="flex items-center gap-3 px-4 py-3 text-sm text-[#a3a3a3] hover:bg-[#1e1e1e] hover:text-[#ff2400] transition-colors border-b border-[#1e1e1e] last:border-0">
              {item.icon}<span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '26+', label: 'Worker Types', sub: 'Skilled trades listed' },
  { value: '36', label: 'States & UTs', sub: 'Pan-India coverage' },
  { value: '800+', label: 'Districts', sub: 'Geo data mapped' },
  { value: '100%', label: 'Free to Join', sub: 'No commission ever' },
]

// ─── How It Works ─────────────────────────────────────────────────────────────
const WORKER_STEPS = [
  { icon: Users, n: '01', t: 'Register Free', d: 'Sign up with your mobile number. Fill your trade, location and get verified with OTP.' },
  { icon: Bell, n: '02', t: 'Get Job Alerts', d: 'Receive instant alerts when a nearby employer posts a job matching your skill.' },
  { icon: IndianRupee, n: '03', t: 'Work & Get Paid', d: 'Accept the request, do the work, confirm payment safely through the platform.' },
]
const EMPLOYER_STEPS = [
  { icon: ClipboardList, n: '01', t: 'Post a Job', d: 'Register as Individual or Organisation. Post your job with trade, wage and location.' },
  { icon: HardHat, n: '02', t: 'Find Workers', d: 'Browse verified workers nearby filtered by trade, block and Honour Score.' },
  { icon: BadgeCheck, n: '03', t: 'Hire & Pay', d: 'Send a request, confirm work started and completed, then confirm payment.' },
]

// ─── Worker types ─────────────────────────────────────────────────────────────
const WORKER_TYPES = [
  { icon: Hammer, label: 'Mason', sub: 'Construction & Building' },
  { icon: Wrench, label: 'Plumber', sub: 'Water & Pipe Work' },
  { icon: Zap, label: 'Electrician', sub: 'Electrical Work' },
  { icon: PaintBucket, label: 'Painter', sub: 'Surface & Wall Work' },
  { icon: Tractor, label: 'Farm Worker', sub: 'Agricultural Labour' },
  { icon: Package, label: 'Helper', sub: 'General Labour' },
  { icon: Truck, label: 'Driver', sub: 'Transport & Delivery' },
  { icon: TreePine, label: 'Gardener', sub: 'Horticulture Work' },
]

// ─── Employer types ───────────────────────────────────────────────────────────
const EMPLOYER_TYPES = [
  { icon: Building2, label: 'Home Owner', sub: 'House repair & maintenance' },
  { icon: Tractor, label: 'Farmer', sub: 'Paddy, vegetable, dairy' },
  { icon: Factory, label: 'Industry / Mill', sub: 'Brick kiln, sawmill, crusher' },
  { icon: ShoppingBag, label: 'Small Shop Owner', sub: 'Grocery Shop & General Store' },
  { icon: Package, label: 'Printing / Packaging Unit', sub: 'Printing, Lable Packing' },
  { icon: Landmark, label: 'Panchayat / Govt', sub: 'MGNREGA, drainage, roads' },
  { icon: Briefcase, label: 'Contractor', sub: 'Construction, civil work' },
  { icon: HeartHandshake, label: 'NGO / Institution', sub: 'Community & social work' },

]

// ─── Trust features ───────────────────────────────────────────────────────────
const TRUST_FEATURES = [
  { icon: Star, title: 'Honour Score System', desc: 'Every user has a live trust score out of 100 — built through real work behaviour, not self-reported ratings.' },
  { icon: Lock, title: 'OTP Verified Profiles', desc: 'All workers and employers verify through email OTP. Every account is real — no fake profiles.' },
  { icon: IndianRupee, title: 'Transparent Payment', desc: 'Payment is confirmed by both worker and employer on the platform. No cash confusion, no disputes.' },
  { icon: Shield, title: 'Admin Oversight', desc: 'Dedicated admin team monitors the platform, resolves disputes and keeps bad actors out.' },
]

// Bell icon workaround (not in Lucide default export)
function Bell({ size = 16, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('worker') // 'worker' | 'employer'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0] font-sans">

      {/* ══════════════════════════ NAVBAR ══════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/96 backdrop-blur-xl border-b border-[#1e1e1e]">
        {/* Top notice bar */}
        <div className="bg-[#ff2400] text-white text-center py-3 px-4 text-xs font-semibold tracking-wide">
          Made for People of India — India First · Free Platform
        </div>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="MoKama" className="h-10 w-auto" />
            <div>
              <div className="font-bold text-base text-white leading-none tracking-tight">MoKama</div>
              <div className="text-[10px] text-[#ff2400] font-semibold hidden sm:block tracking-wider">Taking work to its destination</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {[['Home', '#'], ['How It Works', '#how'], ['About', '#about'], ['Contact', '#contact']].map(([l, h]) => (
              <a key={l} href={h} className="text-sm font-medium text-[#a3a3a3] hover:text-white px-3 py-2 rounded-xl hover:bg-[#1a1a1a] transition-all">{l}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-1">
            <NavDropdown label="Sign Up" items={[
              { label: 'Worker', href: '/worker/register', icon: <HardHat size={14} className="text-[#ff2400]" /> },
              { label: 'Employer', href: '/employer/register', icon: <Building2 size={14} className="text-[#ff2400]" /> },
            ]} />
            <NavDropdown label="Log In" items={[
              { label: 'Worker', href: '/worker/login', icon: <HardHat size={14} className="text-[#ff2400]" /> },
              { label: 'Employer', href: '/employer/login', icon: <Building2 size={14} className="text-[#ff2400]" /> },
              { label: 'Admin', href: '/admin/login', icon: <Shield size={14} className="text-[#a3a3a3]" /> },
            ]} />
          </div>

          <button className="md:hidden p-2 rounded-xl hover:bg-[#1a1a1a] transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-[#1e1e1e] bg-[#0d0d0d] px-4 py-4 space-y-2">
            {[['Home', '#'], ['How It Works', '#how'], ['About', '#about'], ['Contact', '#contact']].map(([l, h]) => (
              <a key={l} href={h}
                className="block py-2.5 px-3 text-sm text-[#a3a3a3] hover:text-white rounded-xl hover:bg-[#1a1a1a]"
                onClick={() => setMobileOpen(false)}>{l}</a>
            ))}
            <hr className="border-[#1e1e1e] !my-3" />
            <div className="grid grid-cols-2 gap-2">
              <Link to="/worker/register" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 py-3 bg-[#ff2400] text-white font-bold rounded-xl text-sm">
                <HardHat size={14} /> Worker Sign Up
              </Link>
              <Link to="/employer/register" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 py-3 bg-[#141414] border border-[#2a2a2a] text-white font-semibold rounded-xl text-sm">
                <Building2 size={14} /> Employer Sign Up
              </Link>
              <Link to="/worker/login" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center py-2.5 bg-[#141414] border border-[#2a2a2a] text-[#a3a3a3] rounded-xl text-xs">
                Worker Login
              </Link>
              <Link to="/employer/login" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center py-2.5 bg-[#141414] border border-[#2a2a2a] text-[#a3a3a3] rounded-xl text-xs">
                Employer Login
              </Link>
            </div>
            <Link to="/admin/login" onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-xs text-[#6b6b6b] border border-[#1e1e1e] rounded-xl">
              <Shield size={12} /> Admin Login
            </Link>
          </div>
        )}
      </header>

      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <section className="relative overflow-hidden px-4 pt-16 pb-12">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-[#ff2400]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#ff2400]/4 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-5 px-2">
            <div className="inline-flex flex-wrap justify-center items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#ff2400]/10 border border-[#ff2400]/30 text-[#ff2400] rounded-full text-[10px] sm:text-xs font-bold tracking-wide text-center">
              <MapPin size={10} className="sm:w-[11px] sm:h-[11px]" />
              <span>
                India's First Daily Wage Platform for Rural & Semi-Urban Workers
              </span>
            </div>
          </div>
          <div>
            <Link to="/" className="flex justify-center items-center gap-2.5 shrink-0">
              <img src="/logo.png" className="h-[90px] w-[160px]" />
            </Link>
          </div>
          <div className="text-center text-[8px] text-white font-normal mb-2">TAKING WORK TO ITS DESTINATION</div>

          {/* Main headline */}
          <div className="text-center max-w-4xl mx-auto mb-6">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Finding work is now{' '}
              <span className="relative inline-block">
                <span className="text-[#ff2400]">More easy</span>
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#ff2400]/40 rounded-full" />
              </span>
            </h1>
            <p className="text-[#a3a3a3] text-lg sm:text-xl mb-2 leading-relaxed">
              MoKama connects <strong className="text-[#ff2400]">daily wage workers</strong> with <strong className="text-[#ff2400]">trusted employers</strong> across rural and semi-urban India
            </p>
            <p className="text-[#6b6b6b] text-sm">Transparently · Without Middlemen · 100% Free</p>
          </div>

          {/* Two CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link to="/worker/register"
              className="group flex items-center gap-3 px-7 py-4 bg-[#ff2400] hover:bg-[#ff0200] text-white font-bold rounded-2xl text-base transition-all active:scale-95 shadow-xl shadow-[#ff2400]/25 w-full sm:w-auto justify-center">
              <HardHat size={18} />
              <div className="text-left">
                <div>I am a Worker</div>
                <div className="text-xs text-white/70 font-normal">Register Free →</div>
              </div>
            </Link>
            <Link to="/employer/register"
              className="group flex items-center gap-3 px-7 py-4 bg-[#141414] border-2 border-[#2a2a2a] hover:border-[#ff2400]/50 hover:bg-[#ff2400]/5 text-white font-bold rounded-2xl text-base transition-all active:scale-95 w-full sm:w-auto justify-center">
              <Building2 size={18} className="text-[#ff2400]" />
              <div className="text-left">
                <div>I Need Workers</div>
                <div className="text-xs text-[#6b6b6b] font-normal">Post a Job Free →</div>
              </div>
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {STATS.map((s, i) => (
              <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-2xl px-4 py-4 text-center">
                <div className="text-2xl font-black text-[#ff2400]">{s.value}</div>
                <div className="text-white text-xs font-bold mt-0.5">{s.label}</div>
                <div className="text-[#4a4a4a] text-xs mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ WHO IS IT FOR ══════════════════════════ */}
      <section className="py-16 bg-[#0d0d0d] px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#ff2400] uppercase tracking-widest mb-2">Who Is MoKama For?</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Built for India's Hands-On Workforce</h2>
            <p className="text-[#6b6b6b] text-sm mt-2">From skilled tradespeople to rural employers — MoKama is your platform</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Workers */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1e1e1e]">
                <div className="w-11 h-11 bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-2xl flex items-center justify-center">
                  <HardHat size={20} className="text-[#ff2400]" />
                </div>
                <div>
                  <div className="text-base font-extrabold text-white">Daily Wage Workers</div>
                  <div className="text-[#6b6b6b] text-xs">Find jobs near you — fast and free</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {WORKER_TYPES.map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-3 p-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl hover:border-[#ff2400]/25 transition-colors">
                    <div className="w-8 h-8 bg-[#ff2400]/10 rounded-lg flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-[#ff2400]" />
                    </div>
                    <div>
                      <div className="text-white text-xs font-semibold">{label}</div>
                      <div className="text-[#4a4a4a] text-xs hidden sm:block">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <span className="text-xs text-[#6b6b6b]">+ 18 more trades registered on MoKama</span>
              </div>
              <Link to="/worker/register"
                className="mt-5 flex items-center justify-center gap-2 w-full py-3 bg-[#ff2400] hover:bg-[#ff3a1a] text-white font-bold rounded-xl text-sm transition-all active:scale-95">
                Register as Worker <ArrowRight size={15} />
              </Link>
              <Link to="/worker/login"
                className="mt-5 flex items-center justify-center gap-2 w-full py-3 bg-[#141414] border border-[#ff2400]/30 hover:bg-[#ff2400]/10 text-[#ff2400] font-bold rounded-xl text-sm transition-all active:scale-95">
                Login as Worker <ArrowRight size={15} />
              </Link>
            </div>

            {/* Employers */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1e1e1e]">
                <div className="w-11 h-11 bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-2xl flex items-center justify-center">
                  <Building2 size={20} className="text-[#ff2400]" />
                </div>
                <div>
                  <div className="text-base font-extrabold text-white">Employers & Contractors</div>
                  <div className="text-[#6b6b6b] text-xs">Post jobs — find verified workers instantly</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {EMPLOYER_TYPES.map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-3 p-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl hover:border-[#ff2400]/25 transition-colors">
                    <div className="w-8 h-8 bg-[#ff2400]/10 rounded-lg flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-[#ff2400]" />
                    </div>
                    <div>
                      <div className="text-white text-xs font-semibold">{label}</div>
                      <div className="text-[#4a4a4a] text-xs hidden sm:block">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <span className="text-xs text-[#6b6b6b]">Individual & Organisation registration available</span>
              </div>
              <Link to="/employer/register"
                className="mt-5 flex items-center justify-center gap-2 w-full py-3 bg-[#141414] border border-[#ff2400]/30 hover:bg-[#ff2400]/10 text-[#ff2400] font-bold rounded-xl text-sm transition-all active:scale-95">
                Register as Employer <ArrowRight size={15} />
              </Link>
              <Link to="/employer/login"
                className="mt-5 flex items-center justify-center gap-2 w-full py-3 bg-[#ff2400] hover:bg-[#ff3a1a] text-white font-bold rounded-xl text-sm transition-all active:scale-95">
                Login as Employer <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ HOW IT WORKS ══════════════════════════ */}
      <section id="how" className="py-16 bg-[#0a0a0a] px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#ff2400] uppercase tracking-widest mb-2">Simple Process</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">How MoKama Works</h2>
            <p className="text-[#6b6b6b] mt-2 text-sm">3 simple steps — no training required</p>
          </div>

          {/* Tab switcher */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center bg-[#111] border border-[#1e1e1e] rounded-2xl p-1 gap-1">
              <button
                onClick={() => setActiveTab('worker')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'worker'
                  ? 'bg-[#ff2400] text-white shadow-lg shadow-[#ff2400]/20'
                  : 'text-[#6b6b6b] hover:text-white'
                  }`}>
                <HardHat size={15} /> I am a Worker
              </button>
              <button
                onClick={() => setActiveTab('employer')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'employer'
                  ? 'bg-[#ff2400] text-white shadow-lg shadow-[#ff2400]/20'
                  : 'text-[#6b6b6b] hover:text-white'
                  }`}>
                <Building2 size={15} /> I Need Workers
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(activeTab === 'worker' ? WORKER_STEPS : EMPLOYER_STEPS).map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="relative bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 hover:border-[#ff2400]/30 transition-all">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-[#ff2400]" />
                    </div>
                    <div className="text-3xl font-black text-[#1e1e1e] leading-none pt-1">{s.n}</div>
                  </div>
                  <div className="font-bold text-white text-base mb-2">{s.t}</div>
                  <div className="text-sm text-[#6b6b6b] leading-relaxed">{s.d}</div>
                  {i < 2 && (
                    <div className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-full items-center justify-center z-10">
                      <ArrowRight size={12} className="text-[#ff2400]" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ TRUST / WHY MOKAMA ══════════════════════════ */}
      <section id="about" className="py-16 bg-[#0d0d0d] px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#ff2400] uppercase tracking-widest mb-2">Why MoKama?</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Built on Real Trust</h2>
            <p className="text-[#6b6b6b] text-sm mt-2">Not just another app — a platform built for the ground realities of rural India</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {TRUST_FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex gap-4 bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 hover:border-[#ff2400]/25 transition-all">
                <div className="w-10 h-10 bg-[#ff2400]/10 border border-[#ff2400]/15 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={18} className="text-[#ff2400]" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm mb-1">{title}</div>
                  <p className="text-xs text-[#6b6b6b] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Honour Score explainer */}
          <div className="bg-[#111] border border-[#ff2400]/20 rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-xl flex items-center justify-center">
                <Star size={18} className="text-[#ff2400] fill-[#ff2400]" />
              </div>
              <div>
                <div className="font-bold text-white text-base">What is the Honour Score?</div>
                <div className="text-xs text-[#6b6b6b]">MoKama's trust rating system</div>
              </div>
            </div>
            <p className="text-sm text-[#a3a3a3] leading-relaxed mb-5">
              Every worker and employer on MoKama has a score out of 100. It goes up when you complete jobs, respond on time and pay promptly. It goes down if you ignore requests or delay payment. A higher score means more trust and more opportunities.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { r: '85–100', l: 'Excellent', c: 'text-emerald-400', b: 'bg-emerald-500/8 border-emerald-500/20' },
                { r: '70–84', l: 'Good', c: 'text-lime-400', b: 'bg-lime-500/8 border-lime-500/20' },
                { r: '50–69', l: 'Average', c: 'text-amber-400', b: 'bg-amber-500/8 border-amber-500/20' },
                { r: '0–49', l: 'Poor', c: 'text-red-400', b: 'bg-red-500/8 border-red-500/20' },
              ].map(s => (
                <div key={s.r} className={`border rounded-2xl px-3 py-4 text-center ${s.b}`}>
                  <div className={`text-lg font-black ${s.c}`}>{s.r}</div>
                  <div className={`text-xs font-bold mt-0.5 ${s.c}`}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ FINAL CTA ══════════════════════════ */}
      <section className="py-20 bg-[#0a0a0a] px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#ff2400]/6 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff2400]/10 border border-[#ff2400]/20 text-[#ff2400] rounded-full text-xs font-bold mb-6">
            <CheckCircle size={11} /> 100% Free — No Registration Fee — No Commission
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
            Start from Today
          </h2>
          <p className="text-[#a3a3a3] text-base mb-1">Your next job — or your next worker — is waiting on MoKama.</p>
          <p className="text-[#6b6b6b] text-sm mb-10">Join India's growing daily wage community. Completely free, always.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Link to="/worker/register"
              className="flex items-center justify-center gap-3 px-6 py-5 bg-[#ff2400] hover:bg-[#ff3a1a] text-white font-bold rounded-2xl text-base transition-all active:scale-95 shadow-xl shadow-[#ff2400]/20">
              <HardHat size={20} />
              <div className="text-left">
                <div>I am a Worker</div>
                <div className="text-xs text-white/70 font-normal">Register Free in 2 minutes</div>
              </div>
            </Link>
            <Link to="/employer/register"
              className="flex items-center justify-center gap-3 px-6 py-5 bg-[#141414] border-2 border-[#ff2400]/30 hover:border-[#ff2400]/60 hover:bg-[#ff2400]/5 text-white font-bold rounded-2xl text-base transition-all active:scale-95">
              <Building2 size={20} className="text-[#ff2400]" />
              <div className="text-left">
                <div>I Need Workers</div>
                <div className="text-xs text-[#6b6b6b] font-normal">Post your first job free</div>
              </div>
            </Link>
          </div>

          <p className="text-xs text-[#4a4a4a]">
            Already registered?{' '}
            <Link to="/worker/login" className="text-[#ff2400] hover:underline">Worker Login</Link>
            {' '}·{' '}
            <Link to="/employer/login" className="text-[#ff2400] hover:underline">Employer Login</Link>
          </p>
        </div>
      </section>

      {/* ══════════════════════════ FOOTER ══════════════════════════ */}
      <footer id="contact" className="bg-[#070707] border-t border-[#141414] text-[#6b6b6b] py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">

            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo.png" alt="MoKama" className="h-10 w-auto" />
                <div>
                  <div className="font-bold text-lg text-white">MoKama</div>
                </div>
              </div>
              <p className="text-xs leading-relaxed mb-3">
                Connecting India's daily wage workforce with dignity, trust and transparency. Built for rural and semi-urban India.
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <MapPin size={11} className="text-[#ff2400]" />
                <span>Odisha, India</span>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-10 gap-y-6 text-sm w-full md:w-auto">
              <div>
                <div className="text-white font-semibold mb-3 text-sm">Workers</div>
                <div className="space-y-2">
                  <div><Link to="/worker/register" className="hover:text-[#ff2400] transition-colors text-xs">Register</Link></div>
                  <div><Link to="/worker/login" className="hover:text-[#ff2400] transition-colors text-xs">Login</Link></div>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-3 text-sm">Employers</div>
                <div className="space-y-2">
                  <div><Link to="/employer/register" className="hover:text-[#ff2400] transition-colors text-xs">Register</Link></div>
                  <div><Link to="/employer/login" className="hover:text-[#ff2400] transition-colors text-xs">Login</Link></div>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-3 text-sm">Platform</div>
                <div className="space-y-2">
                  <div><a href="#about" className="hover:text-[#ff2400] transition-colors text-xs">About Us</a></div>
                  <div><a href="#how" className="hover:text-[#ff2400] transition-colors text-xs">How It Works</a></div>
                  <div><a href="#about" className="hover:text-[#ff2400] transition-colors text-xs">Honour Score</a></div>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-3 text-sm">Contact</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Mail size={10} className="text-[#ff2400] shrink-0" />
                    <span>support@mokama.in</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Phone size={10} className="text-[#ff2400] shrink-0" />
                    <span>WhatsApp Support</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <MapPin size={10} className="text-[#ff2400] shrink-0" />
                    <span>Odisha, India</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-[#141414] mb-6" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span>© 2026 MoKama — All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span className="text-[#ff2400] font-bold">काम को मुकाम तक</span>
              <span className="text-[#2a2a2a]">|</span>
              <span className="text-[#ff2400] font-semibold">Taking Work to its Destination</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
