import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import ScanModal from './ScanModal'
import ItemModal from './ItemModal'
import { ItemsProvider, useItemsContext } from '../hooks/ItemsContext'
import Dashboard from '../pages/Dashboard'
import Stock from '../pages/Stock'
import Ventes from '../pages/Ventes'
import Recap from '../pages/Recap'
import Admin from '../pages/Admin'
import Settings from '../pages/Settings'

function MobileNav() {
  const [showScan, setShowScan] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const { categories, addItem } = useItemsContext()

  const navBtnStyle = (isActive) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '8px 0', flex: 1, background: 'none', border: 'none',
    color: isActive ? 'var(--g)' : 'var(--mut)', cursor: 'pointer',
    fontSize: 10, fontWeight: isActive ? 600 : 400, transition: 'color 0.15s',
    textDecoration: 'none',
  })

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg2)', borderTop: '0.5px solid var(--brd2)',
        display: 'flex', alignItems: 'center', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <NavLink to="/" end style={({ isActive }) => navBtnStyle(isActive)}>
          <IconGrid /><span>Dashboard</span>
        </NavLink>
        <NavLink to="/stock" style={({ isActive }) => navBtnStyle(isActive)}>
          <IconList /><span>Stock</span>
        </NavLink>
        {/* Bouton Scan central */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => setShowScan(true)} style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--g)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(34,197,94,0.4)', marginBottom: 8,
          }}>
            <span style={{ fontSize: 22 }}>📷</span>
          </button>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ ...navBtnStyle(false), flex: 1 }}>
          <IconPlus /><span>Ajouter</span>
        </button>
        <NavLink to="/settings" style={({ isActive }) => navBtnStyle(isActive)}>
          <IconSettings /><span>Réglages</span>
        </NavLink>
      </div>

      {showScan && <ScanModal onClose={() => setShowScan(false)} />}
      {showAdd && (
        <ItemModal
          item={null}
          categories={categories}
          onSave={addItem}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  )
}

export default function Layout() {
  return (
    <ItemsProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Sidebar — cachée sur mobile */}
        <div className="desktop-only">
          <Sidebar />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }} className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/ventes" element={<Ventes />} />
            <Route path="/recap" element={<Recap />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        {/* Bottom nav — visible uniquement sur mobile */}
        <div className="mobile-only">
          <MobileNav />
        </div>
      </div>
    </ItemsProvider>
  )
}

const IconGrid = () => <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
const IconList = () => <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h8v2H2z"/></svg>
const IconPlus = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
const IconSettings = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/></svg>
