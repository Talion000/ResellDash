import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'

const ADMIN_EMAILS = ['plainite000@gmail.com']

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const [approved, setApproved] = useState(null)

  useEffect(() => {
    if (!user) return
    if (ADMIN_EMAILS.includes(user.email)) { setApproved(true); return }
    fetch('/api/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check', userId: user.id })
    }).then(r => r.json()).then(d => setApproved(d.status === 'approved'))
    .catch(() => setApproved(true))
  }, [user?.id, user?.email])

  if (loading || (user && approved === null)) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--mut)' }}>
      Chargement...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (!approved) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>Compte en attente de validation</div>
      <div style={{ fontSize: 13, color: 'var(--mut)' }}>L'administrateur va valider ton compte prochainement.</div>
    </div>
  )
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
