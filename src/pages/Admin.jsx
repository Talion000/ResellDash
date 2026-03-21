import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

const ADMIN_EMAILS = ['plainite000@gmail.com']
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY

export default function Admin() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  if (!user || !ADMIN_EMAILS.includes(user.email)) return <Navigate to="/" replace />

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erreur')
      setUsers(data.users || [])
    } catch (e) {
      setError('Clé service_role manquante. Ajoute VITE_SUPABASE_SERVICE_KEY dans Vercel.')
    }
    setLoading(false)
  }

  const deleteUser = async (userId, email) => {
    if (!window.confirm(`Supprimer le compte "${email}" ?`)) return
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    })
    if (res.ok) setUsers(u => u.filter(x => x.id !== userId))
    else alert('Erreur lors de la suppression')
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 24 }}>Administration</div>

      <div style={{ background: 'rgba(59,130,246,0.06)', border: '0.5px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'var(--mut)' }}>
        <span style={{ color: 'var(--b)', fontWeight: 500 }}>ℹ Info</span>{'  '}
        Page visible uniquement par les admins listés dans <code>ADMIN_EMAILS</code>.
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Comptes inscrits</div>
          <div style={{ fontSize: 12, color: 'var(--mut)' }}>{users.length} utilisateur(s)</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Inscrit le</th>
              <th>Dernière connexion</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--mut)' }}>Chargement...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state"><p>Aucun utilisateur trouvé.</p></div></td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.email}</td>
                <td style={{ color: 'var(--mut)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                <td style={{ color: 'var(--mut)' }}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR') : '—'}</td>
                <td>
                  {u.email !== user.email && (
                    <button className="btn-ghost" style={{ color: 'var(--red)' }} onClick={() => deleteUser(u.id, u.email)}>
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
