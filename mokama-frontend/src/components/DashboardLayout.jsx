import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../api/AuthContext'
import { Briefcase, Menu, X, Bell, LogOut, ChevronRight } from 'lucide-react'
import { getHonourLabel } from '../utils/honour'

export function HonourBadge({ score, small }) {
  const { label, color } = getHonourLabel(score ?? 50)
  if (small) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: color + '18', color, border: `1px solid ${color}30` }}>
      ★ {score}
    </span>
  )
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#1e1e1e" strokeWidth="4" />
          <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 - (125.6 * (score ?? 50)) / 100}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color}60)` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{score ?? 50}</span>
        </div>
      </div>
      <div>
        <div className="text-xs text-[#6b6b6b]">Honour Score</div>
        <div className="font-bold text-white">{label}</div>
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  const cfg = {
    OPEN:            { bg: '#1e3a5f22', color: '#60a5fa', border: '#60a5fa30' },
    REQUEST_SENT:    { bg: '#ff240020', color: '#ff3a1a', border: '#ff240030' },
    ACCEPTED:        { bg: '#6366f120', color: '#a5b4fc', border: '#6366f130' },
    WORKING:         { bg: '#22c55e20', color: '#4ade80', border: '#22c55e30' },
    PAYMENT_PENDING: { bg: '#f5a62320', color: '#fbbf24', border: '#f5a62330' },
    COMPLETED:       { bg: '#10b98120', color: '#34d399', border: '#10b98130' },
    CANCELLED:       { bg: '#ef444420', color: '#f87171', border: '#ef444430' },
    EXPIRED:         { bg: '#33333320', color: '#6b7280', border: '#33333340' },
  }
  const c = cfg[status] || cfg.OPEN
  return (
    <span className="badge text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export default function DashboardLayout({ navItems, children, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#1e1e1e]">
        <img src="/logo.png" alt="MoKama" className="h-9 w-18" />
        <span className="font-bold text-lg text-white tracking-tight">MoKama</span>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-xl flex items-center justify-center text-[#ff2400] font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
            <div className="text-xs text-[#6b6b6b] capitalize">{role}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          // Dashboard root (e.g. /worker/dashboard) uses exact match only.
          // Sub-pages (e.g. /worker/dashboard/requests) use startsWith so nested routes stay highlighted.
          const isDashboardRoot = navItems.some(
            other => other.href !== item.href && other.href.startsWith(item.href + '/')
          )
          const active = isDashboardRoot
            ? location.pathname === item.href
            : location.pathname === item.href || location.pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-link ${active ? 'active' : ''}`}>
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={13} className="text-[#ff2400]" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#1e1e1e]">
        <button onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:bg-red-500/10 hover:text-red-300">
          <LogOut size={15} /> Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-[#1a1a1a] shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full shadow-modal flex flex-col animate-slide-up border-r border-[#1e1e1e]">
            <button className="absolute top-4 right-4 p-1.5 hover:bg-[#1e1e1e] rounded-lg z-10"
              onClick={() => setSidebarOpen(false)}>
              <X size={18} className="text-[#a3a3a3]" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <button className="md:hidden p-2 hover:bg-[#1a1a1a] rounded-xl" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} className="text-[#a3a3a3]" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <Link to={`/${role}/dashboard/notifications`}
              className="p-2 hover:bg-[#1a1a1a] rounded-xl text-[#6b6b6b] hover:text-[#ff2400] transition-colors">
              <Bell size={17} />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
