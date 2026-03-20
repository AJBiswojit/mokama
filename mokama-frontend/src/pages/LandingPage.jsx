import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu, X, ChevronDown, Briefcase, Users, Shield, Star,
  MapPin, PhoneCall, CheckCircle, ArrowRight, Zap, Award, ChevronRight
} from 'lucide-react'

function Dropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  const handleMouseEnter = () => {
    // Cancel any pending close
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    // Delay closing so mouse can travel from button to menu
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button className="flex items-center gap-1 text-sm font-medium text-[#a3a3a3] hover:text-[#f97316] transition-colors px-3 py-2 rounded-xl hover:bg-[#1a1a1a]">
        {label} <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 w-44 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-modal overflow-hidden animate-fade-in z-50"
          style={{ paddingTop: '6px', marginTop: '-2px' }}>
          {/* Invisible bridge fills the gap between button and menu */}
          <div className="absolute -top-2 left-0 right-0 h-3 bg-transparent" />
          {items.map(item => (
            <Link key={item.label} to={item.href}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#a3a3a3] hover:bg-[#212121] hover:text-[#f97316] transition-colors">
              {item.icon}{item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0] font-sans">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-[#1e1e1e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="MoKama Logo"
              className="h-10 w-10 rounded-xl object-cover"
              style={{ imageRendering: 'crisp-edges' }} />
            <span className="font-bold text-xl text-white tracking-tight">MoKama</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[['About','#about'],['How It Works','#how'],['Contact','#contact']].map(([l,h]) => (
              <a key={l} href={h} className="text-sm font-medium text-[#a3a3a3] hover:text-[#f97316] px-3 py-2 rounded-xl hover:bg-[#1a1a1a] transition-all">{l}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Dropdown label="Login" items={[
              { label: 'Worker',   href: '/worker/login',   icon: <Users size={13} /> },
              { label: 'Employer', href: '/employer/login', icon: <Briefcase size={13} /> },
              { label: 'Admin',    href: '/admin/login',    icon: <Shield size={13} /> },
            ]} />
            <Dropdown label="Sign Up" items={[
              { label: 'Worker',   href: '/worker/register',   icon: <Users size={13} /> },
              { label: 'Employer', href: '/employer/register', icon: <Briefcase size={13} /> },
            ]} />
          </div>

          <button className="md:hidden p-2 rounded-xl hover:bg-[#1a1a1a]" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-[#1e1e1e] bg-[#0a0a0a] animate-slide-up px-4 py-4 space-y-1">
            {[['About','#about'],['How It Works','#how'],['Contact','#contact']].map(([l,h]) => (
              <a key={l} href={h} className="block py-2.5 px-3 text-sm font-medium text-[#a3a3a3] hover:text-[#f97316] rounded-xl hover:bg-[#1a1a1a]">{l}</a>
            ))}
            <hr className="border-[#1e1e1e] my-2" />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link to="/worker/login"      className="btn-secondary justify-center text-xs py-2">Worker Login</Link>
              <Link to="/employer/login"    className="btn-secondary justify-center text-xs py-2">Employer Login</Link>
              <Link to="/worker/register"   className="btn-primary justify-center text-xs py-2">Worker Sign Up</Link>
              <Link to="/employer/register" className="btn-primary justify-center text-xs py-2">Employer Sign Up</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-24 pb-32">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#f97316]/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-80 h-80 bg-[#f97316]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#f97316]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-14 items-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] rounded-full text-xs font-semibold mb-6">
              <Zap size={11} /> Digital Employment Platform · India
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
              Where Work<br />
              <span className="text-[#f97316]">Meets Trust</span>
            </h1>
            <p className="text-lg text-[#a3a3a3] leading-relaxed mb-8 max-w-lg">
              Connecting daily wage workers and employers across rural and semi-urban India — transparently, reliably, without middlemen.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/worker/register')}
                className="btn-primary px-7 py-3.5 text-base shadow-glow">
                <Users size={18} /> Find Work
              </button>
              <button onClick={() => navigate('/employer/register')}
                className="btn-secondary px-7 py-3.5 text-base">
                <Briefcase size={18} /> Find Workers <ArrowRight size={15} />
              </button>
            </div>
            <div className="flex items-center gap-8 mt-10 pt-8 border-t border-[#1e1e1e]">
              {[['2000+','Workers Registered'],['500+','Employers'],['98%','Satisfaction']].map(([n,l]) => (
                <div key={l}>
                  <div className="text-2xl font-extrabold text-[#f97316]">{n}</div>
                  <div className="text-xs text-[#6b6b6b] mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Logo + floating cards */}
          <div className="relative hidden lg:flex items-center justify-center animate-fade-in">
            <div className="relative w-full max-w-sm flex items-center justify-center">

              {/* Main logo display */}
              <div className="relative">
                <img src="/logo.png" alt="MoKama"
                  className="w-80 h-80 object-contain drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 0 40px rgba(249,115,22,0.15))' }} />

                {/* Subtle orange glow ring */}
                <div className="absolute inset-0 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)' }} />
              </div>

              {/* Floating honour score */}
              <div className="absolute top-4 -right-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 flex items-center gap-3 shadow-card-hover">
                <div className="w-9 h-9 bg-[#f97316]/10 rounded-xl flex items-center justify-center">
                  <Star size={16} className="text-[#f97316] fill-[#f97316]" />
                </div>
                <div>
                  <div className="text-xs text-[#6b6b6b]">Honour Score</div>
                  <div className="font-bold text-white">92 / 100</div>
                </div>
              </div>

              {/* Floating job card */}
              <div className="absolute -bottom-2 -right-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 shadow-card-hover w-52">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-[#f97316]/10 border border-[#f97316]/20 rounded-lg flex items-center justify-center">
                    <Briefcase size={13} className="text-[#f97316]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Mason Required</div>
                    <div className="text-xs text-[#6b6b6b] flex items-center gap-0.5"><MapPin size={9} /> Bhubaneswar</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-[#6b6b6b]">₹650/day</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs border border-emerald-500/20">Open</span>
                </div>
              </div>

              {/* Floating verified */}
              <div className="absolute top-10 -left-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-card-hover">
                <CheckCircle size={16} className="text-[#f97316]" />
                <span className="text-sm font-semibold text-white">OTP Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="py-24 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-bold text-[#f97316] uppercase tracking-[0.2em] mb-3">Simple Process</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">How It Works</h2>
            <p className="mt-3 text-[#6b6b6b] max-w-md mx-auto">Three steps to connect talent with opportunity</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n:'01', icon:<Users size={22} className="text-[#f97316]" />, title:'Worker Registration', desc:'Workers sign up with skills, experience, and location. OTP verification ensures 100% authenticity.' },
              { n:'02', icon:<Briefcase size={22} className="text-[#fb923c]" />, title:'Employer Posts Job', desc:'Employers post jobs with wage, location and requirements. Workers are matched and notified instantly.' },
              { n:'03', icon:<CheckCircle size={22} className="text-[#fbbf24]" />, title:'Work & Payment Done', desc:'Both parties confirm work completion and payment. Honour scores are automatically updated.' },
            ].map((item, i) => (
              <div key={i} className="group bg-[#141414] border border-[#2a2a2a] rounded-2xl p-7 hover:border-[#f97316]/30 hover:shadow-glow transition-all duration-200 relative overflow-hidden">
                <div className="absolute top-4 right-5 text-6xl font-black text-[#1e1e1e] group-hover:text-[#f97316]/5 transition-colors select-none">{item.n}</div>
                <div className="relative">
                  <div className="w-12 h-12 bg-[#f97316]/10 border border-[#f97316]/20 rounded-2xl flex items-center justify-center mb-5">{item.icon}</div>
                  <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-[#6b6b6b] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Features ── */}
      <section id="about" className="py-24 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-bold text-[#f97316] uppercase tracking-[0.2em] mb-3">Why MoKama</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">Built on Trust</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon:<Award size={20} className="text-[#f97316]" />, title:'Honour Score System', desc:'Dynamic trust scores that reward reliable behaviour and penalise dishonesty — for both sides.' },
              { icon:<PhoneCall size={20} className="text-[#fb923c]" />, title:'OTP Verification', desc:'Mobile-number authentication ensures every single user is who they claim to be.' },
              { icon:<CheckCircle size={20} className="text-[#fbbf24]" />, title:'Payment Confirmation', desc:'Double-sided confirmation protects workers from non-payment and employers from disputes.' },
              { icon:<Shield size={20} className="text-[#f0a050]" />, title:'Admin Monitoring', desc:'Real-time oversight with dispute resolution, force-close capabilities, and user controls.' },
            ].map((f, i) => (
              <div key={i} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 hover:border-[#f97316]/25 hover:shadow-glow transition-all duration-200">
                <div className="w-11 h-11 bg-[#f97316]/10 border border-[#f97316]/15 rounded-xl flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-[#6b6b6b] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-[#0d0d0d] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#f97316]/6 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] rounded-full text-xs font-semibold mb-6">
            <Zap size={11} /> Join Today — It's Free
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Start Your Journey Today
          </h2>
          <p className="text-[#a3a3a3] text-lg mb-10 max-w-xl mx-auto">
            Join thousands of workers and employers on India's most trusted daily wage platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/worker/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#f97316] text-white font-bold rounded-xl hover:bg-[#fb923c] transition-all shadow-glow text-base">
              <Users size={18} /> Register as Worker
            </Link>
            <Link to="/employer/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#141414] border border-[#f97316]/30 text-[#f97316] font-bold rounded-xl hover:bg-[#f97316]/10 transition-all text-base">
              <Briefcase size={18} /> Register as Employer <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-[#080808] border-t border-[#1a1a1a] text-[#6b6b6b] py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo.png" alt="MoKama" className="h-10 w-10 rounded-xl object-cover" />
                <span className="font-bold text-xl text-white">MoKama</span>
              </div>
              <p className="text-sm leading-relaxed">Kaam ko Mukam tak — connecting India's workforce with dignity and trust.</p>
            </div>
            <div className="flex flex-wrap gap-x-16 gap-y-6">
              <div>
                <div className="text-white font-semibold mb-3 text-sm">Platform</div>
                <div className="space-y-2 text-sm">
                  <div><Link to="/worker/register" className="hover:text-[#f97316] transition-colors">For Workers</Link></div>
                  <div><Link to="/employer/register" className="hover:text-[#f97316] transition-colors">For Employers</Link></div>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-3 text-sm">Legal</div>
                <div className="space-y-2 text-sm">
                  <div><a href="#" className="hover:text-[#f97316] transition-colors">Terms</a></div>
                  <div><a href="#" className="hover:text-[#f97316] transition-colors">Privacy</a></div>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-3 text-sm">Contact</div>
                <div className="space-y-2 text-sm">
                  <div>hello@mokama.in</div>
                  <div>+91 99999 00000</div>
                </div>
              </div>
            </div>
          </div>
          <hr className="border-[#1a1a1a] my-8" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span>© 2025 MoKama. All rights reserved.</span>
            <span className="text-[#f97316] font-medium italic">"Kaam ko Mukam tak"</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
