import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handle = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError('Email ou mot de passe incorrect.')
    } else {
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else setSuccess('Compte créé ! Vérifie ton email pour confirmer.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '28px', fontWeight: '500', letterSpacing: '-1px', marginBottom: '8px' }}>
            Resell<span style={{ color: 'var(--g)' }}>.</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--mut)' }}>
            {mode === 'login' ? 'Connecte-toi à ton espace' : 'Crée ton compte gratuit'}
          </div>
        </div>

        <div style={{
          background: 'var(--bg2)', border: '0.5px solid var(--brd2)',
          borderRadius: '16px', padding: '28px'
        }}>
          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email" required
                placeholder="ton@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input
                className="form-input"
                type="password" required
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                minLength={6}
              />
            </div>

            {error && (
              <div style={{ fontSize: '12px', color: 'var(--red)', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '10px 12px' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ fontSize: '12px', color: 'var(--g)', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', padding: '10px 12px' }}>
                {success}
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}>
              {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--mut)' }}>
            {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <span
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
              style={{ color: 'var(--g)', cursor: 'pointer' }}
            >
              {mode === 'login' ? "S'inscrire" : 'Se connecter'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
