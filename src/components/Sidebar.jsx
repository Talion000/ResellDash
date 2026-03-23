import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useItemsContext } from '../hooks/ItemsContext'

const ADMIN_EMAILS = ['plainite000@gmail.com']
const CAT_COLORS = ['#a855f7', '#f59e0b', '#ec4899', '#14b8a6', '#3b82f6', '#f97316', '#22c55e']

export default function Sidebar() {
  const { signOut, user } = useAuth()
  const { categories, addCategory } = useItemsContext()
  const navigate = useNavigate()
  const [showCatForm, setShowCatForm] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(CAT_COLORS[0])
  const isAdmin = ADMIN_EMAILS.includes(user?.email)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleAddCat = async (e) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    await addCategory(newCatName.trim(), newCatColor)
    setNewCatName(''); setShowCatForm(false)
  }

  const navStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '9px',
    padding: '8px 16px', fontSize: '12px', cursor: 'pointer',
    borderLeft: `2px solid ${isActive ? 'var(--g)' : 'transparent'}`,
    background: isActive ? 'var(--bg3)' : 'transparent',
    color: isActive ? 'var(--text)' : 'var(--mut)',
    transition: 'all 0.15s', textDecoration: 'none',
  })

  return (
    <div style={{ width: '210px', minWidth: '210px', background: 'var(--bg2)', borderRight: '0.5px solid var(--brd2)', display: 'flex', flexDirection: 'column', padding: '16px 0', height: '100vh', overflowY: 'auto' }}>
      <div style={{ fontSize: '18px', fontWeight: '500', padding: '0 16px 22px', letterSpacing: '-0.5px' }}>
        Resell<span style={{ color: 'var(--g)' }}>.</span>
      </div>

      <div style={{ fontSize: '10px', color: 'var(--mut2)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 16px 6px' }}>Menu</div>

      <NavLink to="/" end style={navStyle}><IconGrid /> Dashboard</NavLink>
      <NavLink to="/stock" style={navStyle}><IconList /> Stock</NavLink>
      <NavLink to="/ventes" style={navStyle}><IconChart /> Ventes</NavLink>
      <NavLink to="/recap" style={navStyle}><IconDoc /> Récap fiscal</NavLink>
      {isAdmin && <NavLink to="/admin" style={navStyle}><IconAdmin /> Admin</NavLink>}

      <div style={{ fontSize: '10px', color: 'var(--mut2)', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 16px 6px' }}>Catégories</div>

      {categories.map(cat => (
        <NavLink key={cat.id} to={`/stock?cat=${encodeURIComponent(cat.name)}`} style={navStyle}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
          {cat.name}
        </NavLink>
      ))}

      {showCatForm ? (
        <form onSubmit={handleAddCat} style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input className="form-input" style={{ fontSize: '12px', padding: '6px 10px' }} placeholder="Nom catégorie"
            value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CAT_COLORS.map(c => (
              <div key={c} onClick={() => setNewCatColor(c)}
                style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: newCatColor === c ? '2px solid #fff' : '2px solid transparent' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '6px' }}>OK</button>
            <button type="button" className="btn-secondary" style={{ flex: 1, padding: '6px' }} onClick={() => setShowCatForm(false)}>✕</button>
          </div>
        </form>
      ) : (
        <div onClick={() => setShowCatForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '12px', color: 'var(--mut2)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--mut)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--mut2)'}>
          + Nouvelle catégorie
        </div>
      )}

      <div style={{ marginTop: 'auto', padding: '0 16px 8px' }}>
        <div style={{ borderTop: '0.5px solid var(--brd)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', color: 'var(--mut2)', padding: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
          <button onClick={handleSignOut} className="btn-ghost" style={{ width: '100%', textAlign: 'left' }}>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

const IconGrid = () => <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
const IconList = () => <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h8v2H2z"/></svg>
const IconChart = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16"><polyline points="1,11 5,7 9,9 15,3"/></svg>
const IconDoc = () => <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm1 3v1h8V5H4zm0 3v1h8V8H4zm0 3v1h5v-1H4z"/></svg>
const IconAdmin = () => <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a3 3 0 110 6A3 3 0 018 1zm0 8c-3.3 0-6 1.3-6 3v1h12v-1c0-1.7-2.7-3-6-3z"/></svg>
