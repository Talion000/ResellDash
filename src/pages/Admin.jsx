import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

const ADMIN_EMAILS = ['plainite000@gmail.com']

export default function Admin() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  if (!user || !ADMIN_EMAILS.includes(user.email)) return <Navigate to="/" replace />

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all users
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_SERVICE_KEY || '',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''}`,
        }
      })
      const data = await res.json()
      if (data.users) setUsers(data.users)

      // Fetch pending users
      const pendingRes = await fetch('/api/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' })
      })
      const pendingData = await pendingRes.json()
      setPending(pendingData.users || [])
    } catch (e) {
      setError('Erreur de chargement')
    }
    setLoading(false)
  }

  const handleApprove = async (userId) => {
    await fetch('/api/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', userId })
    })
    setPending(prev => prev.map(u => u.user_id === userId ? { ...u, status: 'approved' } : u))
  }

  const handleReject = async (userId, email) => {
    if (!window.confirm(`Supprimer le compte "${email}" ?`)) return
    await fetch('/api/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', userId })
    })
    setPending(prev => prev.filter(u => u.user_id !== userId))
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  const pendingOnly = pending.filter(p => p.status === 'pending')

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 24 }}>Administration</div>

      {/* Comptes en attente */}
      {pendingOnly.length > 0 && (
        <div style={{ background: 'rgba(249,115,22,0.07)', border: '0.5px solid rgba(249,115,22,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--o)', marginBottom: 14 }}>
            🔔 {pendingOnly.length} compte{pendingOnly.length > 1 ? 's' : ''} en attente de validation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingOnly.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.email}</div>
                  <div style={{ fontSize: 11, color: 'var(--mut)' }}>Inscrit le {new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => handleApprove(p.user_id)}>
                  ✓ Valider
                </button>
                <button className="btn-ghost" style={{ color: 'var(--red)', fontSize: 12 }} onClick={() => handleReject(p.user_id, p.email)}>
                  ✕ Refuser
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {/* Tous les comptes */}
      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Comptes inscrits</div>
          <div style={{ fontSize: 12, color: 'var(--mut)' }}>{users.length} utilisateur(s)</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Statut</th>
              <th>Inscrit le</th>
              <th>Dernière connexion</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--mut)' }}>Chargement...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><p>Aucun utilisateur trouvé.</p></div></td></tr>
            ) : users.map(u => {
              const pendingEntry = pending.find(p => p.user_id === u.id)
              const isApproved = ADMIN_EMAILS.includes(u.email) || pendingEntry?.status === 'approved'
              const isPending = pendingEntry?.status === 'pending'
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.email}</td>
                  <td>
                    {ADMIN_EMAILS.includes(u.email)
                      ? <span className="badge badge-blue">Admin</span>
                      : isPending
                      ? <span className="badge" style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--o)' }}>En attente</span>
                      : isApproved
                      ? <span className="badge badge-green">Validé</span>
                      : <span className="badge badge-gray">—</span>
                    }
                  </td>
                  <td style={{ color: 'var(--mut)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                  <td style={{ color: 'var(--mut)' }}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR') : '—'}</td>
                  <td>
                    {!ADMIN_EMAILS.includes(u.email) && (
                      <button className="btn-ghost" style={{ color: 'var(--red)' }} onClick={() => handleReject(u.id, u.email)}>
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
