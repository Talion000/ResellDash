import { Routes, Route } from 'react-router-dom'
import Sidebar from './Sidebar'
import { ItemsProvider } from '../hooks/ItemsContext'
import Dashboard from '../pages/Dashboard'
import Stock from '../pages/Stock'
import Ventes from '../pages/Ventes'
import Recap from '../pages/Recap'

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
          </Routes>
        </div>
      </div>
    </ItemsProvider>
  )
}
