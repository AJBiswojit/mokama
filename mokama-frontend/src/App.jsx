import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './api/AuthContext'

// Pages
import LandingPage from './pages/LandingPage'
import WorkerRegister from './pages/auth/WorkerRegister'
import EmployerRegister from './pages/auth/EmployerRegister'
import WorkerLogin from './pages/auth/WorkerLogin'
import EmployerLogin from './pages/auth/EmployerLogin'
import AdminLogin from './pages/auth/AdminLogin'

// Dashboards
import WorkerDashboard from './pages/dashboard/WorkerDashboard'
import EmployerDashboard from './pages/dashboard/EmployerDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
  if (!user) return <Navigate to="/" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'Sora, sans-serif', fontSize: '14px', borderRadius: '12px', background: '#1a1a1a', color: '#f0f0f0', border: '1px solid #2a2a2a' }
        }} />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/worker/register" element={<WorkerRegister />} />
          <Route path="/employer/register" element={<EmployerRegister />} />
          <Route path="/worker/login" element={<WorkerLogin />} />
          <Route path="/employer/login" element={<EmployerLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/worker/dashboard/*" element={
            <ProtectedRoute role="worker"><WorkerDashboard /></ProtectedRoute>
          } />
          <Route path="/employer/dashboard/*" element={
            <ProtectedRoute role="employer"><EmployerDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/dashboard/*" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
