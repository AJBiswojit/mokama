import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu, X, ChevronDown, HardHat, Building2, Star, Shield,
  CheckCircle, Users, Briefcase, Zap, ChevronRight
} from 'lucide-react'

function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const enter = () => { clearTimeout(timer.current); setOpen(true) }
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 150) }

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button className="flex items-center gap-1 px-4 py-2 border border-[#2a2a2a] text-sm font-semibold text-white rounded-xl hover:border-[#f97316] hover:text-[#f97316] transition-all bg-[#141414]">
        {label} <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="absolute -top-2 left-0 right-0 h-3 bg-transparent" />
          {items.map(item => (
            <Link key={item.label} to={item.href}
              className="flex items-center gap-3 px-4 py-3 text-sm text-[#a3a3a3] hover:bg-[#1e1e1e] hover:text-[#f97316] transition-colors">
              {item.icon}<span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0] font-sans">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-[#1e1e1e]">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="MoKama" className="h-10 w-18" />
            <div>
              <div className="font-bold text-base text-white leading-none">MoKama</div>
              <div className="text-[10px] text-[#f97316] font-medium hidden sm:block">Kaam Ko Mukam Tak</div>
            </div>
          </Link>

          {/* Desktop center nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {[['Home', '#'], ['About Us', '#about'], ['Contact', '#contact']].map(([l, h]) => (
              <a key={l} href={h} className="text-sm font-medium text-[#a3a3a3] hover:text-white px-3 py-2 rounded-xl hover:bg-[#1a1a1a] transition-all">{l}</a>
            ))}
          </nav>

          {/* Desktop right buttons */}
          <div className="hidden md:flex items-center gap-2">
            <NavDropdown label="Sign Up" items={[
              { label: 'Worker', href: '/worker/register', icon: <HardHat size={14} className="text-[#f97316]" /> },
              { label: 'Employer', href: '/employer/register', icon: <Building2 size={14} className="text-[#f97316]" /> },
            ]} />
            <NavDropdown label="Log In" items={[
              { label: 'Worker', href: '/worker/login', icon: <HardHat size={14} className="text-[#f97316]" /> },
              { label: 'Employer', href: '/employer/login', icon: <Building2 size={14} className="text-[#f97316]" /> },
              { label: 'Admin', href: '/admin/login', icon: <Shield size={14} className="text-violet-400" /> },
            ]} />
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 rounded-xl hover:bg-[#1a1a1a] transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#1e1e1e] bg-[#0d0d0d] px-4 py-4 space-y-2">
            {[['Home', '#'], ['About Us', '#about'], ['Contact', '#contact']].map(([l, h]) => (
              <a key={l} href={h}
                className="block py-2.5 px-3 text-sm text-[#a3a3a3] hover:text-white rounded-xl hover:bg-[#1a1a1a]"
                onClick={() => setMobileOpen(false)}>{l}</a>
            ))}
            <hr className="border-[#1e1e1e] !my-3" />
            <div className="grid grid-cols-2 gap-2">
              <Link to="/worker/register" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#f97316] text-white font-bold rounded-xl text-xs hover:bg-[#fb923c] transition-all">
                <HardHat size={13} /> Worker Sign Up
              </Link>
              <Link to="/employer/register" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#141414] border border-[#2a2a2a] text-white font-semibold rounded-xl text-xs hover:border-[#f97316]/40 transition-all">
                <Building2 size={13} /> Employer Sign Up
              </Link>
              <Link to="/worker/login" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#141414] border border-[#2a2a2a] text-[#a3a3a3] rounded-xl text-xs hover:text-white transition-all">
                Worker Login
              </Link>
              <Link to="/employer/login" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#141414] border border-[#2a2a2a] text-[#a3a3a3] rounded-xl text-xs hover:text-white transition-all">
                Employer Login
              </Link>
            </div>
            <Link to="/admin/login" onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-xs text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/10 transition-all">
              <Shield size={12} /> Admin Login
            </Link>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pt-12 pb-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[350px] bg-[#f97316]/6 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto image-center text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] rounded-full text-xs font-bold mb-5">
            <Zap size={11} /> India's Daily Wage Platform · Free to Join
          </div>
          <div>
            <img src="/logo.png" alt="MoKama" className="inline-flex items-center w-[260px] h-[150px]" />
            <div className="text-[#a3a3a3] text-white mb-5 text-xs">
              TAKING WORK TO ITS DESTINATION
            </div>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Connecting <span className="text-[#f97316]">Workers</span> &{' '}
            <span className="text-[#f97316]">Employers</span> Across India
          </h1>
          <p className="text-[#a3a3a3] text-base sm:text-lg mb-1">
            MoKama connects daily wage workers and employers across rural and semi-urban India
          </p>
          <p className="text-[#6b6b6b] text-sm">Transparently · Reliably · Without Middlemen</p>
        </div>

        {/* ── Two Big Cards ── */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Worker Card */}
          <div className="bg-[#141414] border-2 border-[#2a2a2a] rounded-3xl overflow-hidden hover:border-[#f97316]/40 transition-all duration-300">
            <div className="relative h-52 sm:h-64 bg-gradient-to-br from-[#f97316]/20 via-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
              <div className="text-center px-4">
                <div className="text-7xl sm:text-9xl mb-2 select-none">👷</div>
                <div className="text-[#f97316] font-bold text-base sm:text-lg">Daily Wage Worker</div>
                <div className="text-[#6b6b6b] text-xs sm:text-sm">Mason · Carpenter · Plumber & more</div>
              </div>
              <div className="absolute top-3 right-3 bg-[#0a0a0a]/80 border border-[#f97316]/30 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                <Star size={11} className="text-[#f97316] fill-[#f97316]" />
                <span className="text-xs text-white font-semibold">Verified</span>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2">I am a Worker</h2>
              <p className="text-[#6b6b6b] text-xs sm:text-sm mb-5 leading-relaxed">
                Register your skills, find nearby jobs, get hired by trusted employers and receive fair payment.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/worker/register"
                  className="flex items-center justify-center gap-1.5 py-3 bg-[#f97316] text-white font-bold rounded-xl hover:bg-[#fb923c] active:scale-95 transition-all text-sm shadow-glow">
                  <Users size={14} /> Sign Up
                </Link>
                <Link to="/worker/login"
                  className="flex items-center justify-center gap-1.5 py-3 bg-[#1e1e1e] border border-[#2a2a2a] text-white font-semibold rounded-xl hover:border-[#f97316]/40 hover:text-[#f97316] active:scale-95 transition-all text-sm">
                  Log In
                </Link>
              </div>
            </div>
          </div>

          {/* Employer Card */}
          <div className="bg-[#141414] border-2 border-[#2a2a2a] rounded-3xl overflow-hidden hover:border-violet-500/40 transition-all duration-300">
            <div className="relative h-52 sm:h-64 bg-gradient-to-br from-violet-500/20 via-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
              <div className="text-center px-4">
                <div className="text-7xl sm:text-9xl mb-2 select-none">🏗️</div>
                <div className="text-violet-400 font-bold text-base sm:text-lg">Employer / Contractor</div>
                <div className="text-[#6b6b6b] text-xs sm:text-sm">Construction · Agriculture & more</div>
              </div>
              <div className="absolute top-3 right-3 bg-[#0a0a0a]/80 border border-violet-500/30 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                <CheckCircle size={11} className="text-violet-400" />
                <span className="text-xs text-white font-semibold">Trusted</span>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2">I Need Workers</h2>
              <p className="text-[#6b6b6b] text-xs sm:text-sm mb-5 leading-relaxed">
                Post your job, find verified workers nearby, hire with confidence and confirm payments transparently.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/employer/register"
                  className="flex items-center justify-center gap-1.5 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-500 active:scale-95 transition-all text-sm">
                  <Briefcase size={14} /> Sign Up
                </Link>
                <Link to="/employer/login"
                  className="flex items-center justify-center gap-1.5 py-3 bg-[#1e1e1e] border border-[#2a2a2a] text-white font-semibold rounded-xl hover:border-violet-500/40 hover:text-violet-400 active:scale-95 transition-all text-sm">
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who Can Use ── */}
      <section className="py-14 bg-[#0d0d0d] px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#f97316] uppercase tracking-widest mb-2">Who Can Use MoKama?</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Built for India's Workforce</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Workers */}
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-[#f97316]/10 border-2 border-[#f97316]/30 rounded-2xl flex items-center justify-center text-2xl">👷</div>
                <div>
                  <div className="text-lg font-extrabold text-white">For Workers</div>
                  <div className="text-[#6b6b6b] text-xs">Daily Wage Earners</div>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  ['🔨', 'Mason', 'Construction Worker'],
                  ['🪚', 'Carpenter', 'Wood & Furniture Work'],
                  ['🔧', 'Plumber', 'Water & Pipe Work'],
                  ['⚡', 'Electrician', 'Electrical Work'],
                  ['🌾', 'Farm Worker', 'Agricultural Labour'],
                  ['📦', 'Helper', 'General Labour'],
                ].map(([e, l, d]) => (
                  <div key={l} className="flex items-center gap-3 py-2 border-b border-[#1e1e1e] last:border-0">
                    <span className="text-lg">{e}</span>
                    <div className="min-w-0">
                      <span className="text-white font-semibold text-sm">{l}</span>
                      <span className="text-[#6b6b6b] text-xs ml-1.5 hidden sm:inline">· {d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Employers */}
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-violet-500/10 border-2 border-violet-500/30 rounded-2xl flex items-center justify-center text-2xl">🏗️</div>
                <div>
                  <div className="text-lg font-extrabold text-white">For Employers</div>
                  <div className="text-[#6b6b6b] text-xs">Contractors & Business Owners</div>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  ['🏠', 'House Construction', 'Residential Building'],
                  ['🏢', 'Commercial Projects', 'Office & Buildings'],
                  ['🌾', 'Agricultural Work', 'Farm & Field Labour'],
                  ['🏭', 'Factory Work', 'Industrial Labour'],
                  ['🛣️', 'Road & Civil Work', 'Infrastructure Projects'],
                  ['🔧', 'Home Maintenance', 'Repairs & Upkeep'],
                ].map(([e, l, d]) => (
                  <div key={l} className="flex items-center gap-3 py-2 border-b border-[#1e1e1e] last:border-0">
                    <span className="text-lg">{e}</span>
                    <div className="min-w-0">
                      <span className="text-white font-semibold text-sm">{l}</span>
                      <span className="text-[#6b6b6b] text-xs ml-1.5 hidden sm:inline">· {d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="py-14 bg-[#0a0a0a] px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#f97316] uppercase tracking-widest mb-2">Simple Process</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">How MoKama Works?</h2>
            <p className="text-[#6b6b6b] mt-1 text-sm">Just 3 Easy Steps</p>
          </div>

          {/* Worker Steps */}
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl flex items-center justify-center text-base">👷</div>
              <div className="font-bold text-white text-sm">For Workers</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { n: '1', e: '📱', t: 'Register', d: 'Sign up with your mobile number and email. Verify with OTP.', c: 'bg-[#f97316]' },
                { n: '2', e: '🔔', t: 'Get Notified', d: 'Receive alerts when a nearby job matches your skill and location.', c: 'bg-[#fb923c]' },
                { n: '3', e: '💰', t: 'Work & Get Paid', d: 'Accept the job, complete the work, confirm payment safely on the app.', c: 'bg-[#fbbf24]' },
              ].map((s, i) => (
                <div key={i} className="relative bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5">
                  <div className={`w-7 h-7 ${s.c} rounded-full flex items-center justify-center text-white font-black text-xs mb-3`}>{s.n}</div>
                  <div className="text-2xl mb-2">{s.e}</div>
                  <div className="font-bold text-white text-sm mb-1">{s.t}</div>
                  <div className="text-xs text-[#6b6b6b] leading-relaxed">{s.d}</div>
                  {i < 2 && <div className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-[#f97316] z-10"><ChevronRight size={18} /></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Employer Steps */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-violet-500/10 border border-violet-500/30 rounded-xl flex items-center justify-center text-base">🏗️</div>
              <div className="font-bold text-white text-sm">For Employers</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { n: '1', e: '📝', t: 'Post a Job', d: 'Register and post your job with required trade, wage per day, and location.', c: 'bg-violet-600' },
                { n: '2', e: '🔍', t: 'Find Workers', d: 'Browse verified available workers nearby. Check their honour score.', c: 'bg-violet-500' },
                { n: '3', e: '✅', t: 'Hire & Pay', d: 'Send a job request, confirm work started and completed, then confirm payment.', c: 'bg-violet-400' },
              ].map((s, i) => (
                <div key={i} className="relative bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5">
                  <div className={`w-7 h-7 ${s.c} rounded-full flex items-center justify-center text-white font-black text-xs mb-3`}>{s.n}</div>
                  <div className="text-2xl mb-2">{s.e}</div>
                  <div className="font-bold text-white text-sm mb-1">{s.t}</div>
                  <div className="text-xs text-[#6b6b6b] leading-relaxed">{s.d}</div>
                  {i < 2 && <div className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-violet-400 z-10"><ChevronRight size={18} /></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why MoKama ── */}
      <section id="about" className="py-14 bg-[#0d0d0d] px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#f97316] uppercase tracking-widest mb-2">Why MoKama?</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Built on Trust</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { e: '⭐', t: 'Honour Score', d: 'Every worker and employer has a live trust rating based on their behaviour.' },
              { e: '🔒', t: 'OTP Verified', d: 'All users are verified via email OTP. Every profile is real and authenticated.' },
              { e: '💰', t: 'Safe Payment', d: 'Payment confirmed by both parties — no disputes, no cheating.' },
              { e: '🛡️', t: 'Admin Protection', d: 'Dedicated admin monitors the platform and resolves disputes in real time.' },
            ].map((f, i) => (
              <div key={i} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 text-center hover:border-[#f97316]/25 transition-all">
                <div className="text-3xl sm:text-4xl mb-3">{f.e}</div>
                <div className="font-bold text-white text-xs sm:text-sm mb-1.5">{f.t}</div>
                <p className="text-xs text-[#6b6b6b] leading-relaxed hidden sm:block">{f.d}</p>
              </div>
            ))}
          </div>

          {/* Honour Score explainer */}
          <div className="mt-6 bg-[#141414] border border-[#f97316]/20 rounded-3xl p-5 sm:p-8">
            <div className="text-lg font-bold text-white mb-2">⭐ What is the Honour Score?</div>
            <p className="text-sm text-[#a3a3a3] leading-relaxed mb-5">
              Every worker and employer on MoKama has a score out of 100. It goes up when you do good work and goes down when you behave badly. A higher score means more trust and more opportunities.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { r: '85-100', l: 'Excellent', c: 'text-emerald-400', b: 'bg-emerald-500/10 border-emerald-500/20' },
                { r: '70-84', l: 'Good', c: 'text-lime-400', b: 'bg-lime-500/10 border-lime-500/20' },
                { r: '50-69', l: 'Average', c: 'text-amber-400', b: 'bg-amber-500/10 border-amber-500/20' },
                { r: '0-49', l: 'Poor', c: 'text-red-400', b: 'bg-red-500/10 border-red-500/20' },
              ].map(s => (
                <div key={s.r} className={`border rounded-2xl px-3 py-3 text-center ${s.b}`}>
                  <div className={`text-base font-black ${s.c}`}>{s.r}</div>
                  <div className={`text-xs font-bold ${s.c}`}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 bg-[#0a0a0a] px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-[#f97316]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-xl mx-auto text-center">
          <div className="text-4xl mb-5">🤝</div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-2">Start Your Journey Today</h2>
          <p className="text-[#a3a3a3] text-sm mb-1">Completely Free · No Commission · No Middlemen</p>
          <p className="text-[#6b6b6b] text-xs mb-8">Join thousands of workers and employers on India's most trusted daily wage platform.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <Link to="/worker/register"
              className="flex items-center justify-center gap-3 px-5 py-4 bg-[#f97316] text-white font-bold rounded-2xl hover:bg-[#fb923c] transition-all text-sm">
              <span className="text-xl">👷</span>
              <div className="text-left">
                <div>I am a Worker</div>
                <div className="text-xs text-white/70 font-normal">Register Free</div>
              </div>
            </Link>
            <Link to="/employer/register"
              className="flex items-center justify-center gap-3 px-5 py-4 bg-[#141414] border-2 border-[#f97316]/40 text-white font-bold rounded-2xl hover:bg-[#f97316]/10 transition-all text-sm">
              <span className="text-xl">🏗️</span>
              <div className="text-left">
                <div>I Need Workers</div>
                <div className="text-xs text-[#6b6b6b] font-normal">Register Free</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-[#080808] border-t border-[#1a1a1a] text-[#6b6b6b] py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <img src="/logo.png" alt="MoKama" className="h-9 w-18" />
                <div>
                  <div className="font-bold text-lg text-white">MoKama</div>
                  <div className="text-[10px] text-[#f97316]">Kaam Ko Mukam Tak</div>
                </div>
              </div>
              <p className="text-xs leading-relaxed">Connecting India's daily wage workforce with dignity, trust, and transparency.</p>
              <p className="text-xs mt-1.5">Designed for rural employment support</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 text-sm w-full md:w-auto">
              <div>
                <div className="text-white font-semibold mb-2.5 text-sm">Workers</div>
                <div className="space-y-1.5">
                  <div><Link to="/worker/register" className="hover:text-[#f97316] transition-colors text-xs">Register</Link></div>
                  <div><Link to="/worker/login" className="hover:text-[#f97316] transition-colors text-xs">Login</Link></div>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-2.5 text-sm">Employers</div>
                <div className="space-y-1.5">
                  <div><Link to="/employer/register" className="hover:text-[#f97316] transition-colors text-xs">Register</Link></div>
                  <div><Link to="/employer/login" className="hover:text-[#f97316] transition-colors text-xs">Login</Link></div>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-2.5 text-sm">Legal</div>
                <div className="space-y-1.5">
                  <div><a href="#about" className="hover:text-[#f97316] transition-colors text-xs">About Us</a></div>
                  <div><a href="#" className="hover:text-[#f97316] transition-colors text-xs">Privacy Policy</a></div>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-2.5 text-sm">Contact</div>
                <div className="space-y-1.5">
                  <div className="text-xs">support.mokama@gmail.com</div>
                  <div className="text-xs">Odisha, India</div>
                </div>
              </div>
            </div>
          </div>
          <hr className="border-[#1a1a1a] mb-5" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span>© 2026 MoKama — Kaam Ko Mukam Tak. All rights reserved.</span>
            <span className="text-[#f97316] font-bold italic">"Kaam Ko Mukam Tak"</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
