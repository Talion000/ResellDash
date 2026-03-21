import { Routes, Route } from 'react-router-dom'
import Sidebar from './Sidebar'
import { ItemsProvider } from '../hooks/ItemsContext'
import Dashboard from '../pages/Dashboard'
import Stock from '../pages/Stock'
import Ventes from '../pages/Ventes'
import Recap from '../pages/Recap'
import Admin from '../pages/Admin'

export default function Layout() {
  return (
    <ItemsProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/ventes" element={<Ventes />} />
            <Route path="/recap" element={<Recap />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </div>
    </ItemsProvider>
  )
}
