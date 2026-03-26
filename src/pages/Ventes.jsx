import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { useItemsContext } from '../hooks/ItemsContext'
import ItemModal from '../components/ItemModal'
import { profit, rendement, fmtEur, fmtPct, groupByMonth, formatMonth, catBadgeStyle, lotAchatTotal, lotVenteTotal, lotProfit } from '../lib/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const EXCLUDED = ['Remboursé', 'En retour']

export default function Ventes() {
  const [searchParams] = useSearchParams()
  const monthFilter = searchParams.get('month') || ''
  const yearFilter = searchParams.get('year') || ''
  const { items, categories, ventesUnitaires, updateItem, addItem } = useItemsContext()
  const [editItem, setEditItem] = useState(null)
  const [showModal, setShowModal] = useState(false)

  // Items vendus (normaux) + lots avec au moins 1 vente
  const sold = useMemo(() => items.filter(i => {
    if (monthFilter && !i.quantite_mode && !i.date_vente?.startsWith(monthFilter)) return false
    if (yearFilter && !i.quantite_mode && !i.date_vente?.startsWith(yearFilter)) return false
    if (EXCLUDED.includes(i.statut)) return false
    if (i.quantite_mode) return ventesUnitaires.some(v => v.item_id === i.id)
    return i.statut === 'Vendu' && i.prix_vente
  }), [items, ventesUnitaires])

  const totalCA = useMemo(() => sold.reduce((s, i) => {
    const v = i.quantite_mode ? (lotVenteTotal(i, ventesUnitaires) || 0) : (i.prix_vente || 0)
    return s + v
  }, 0), [sold, ventesUnitaires])

  const totalBenef = useMemo(() => sold.reduce((s, i) => {
    const p = i.quantite_mode ? (lotProfit(i, ventesUnitaires) || 0) : (profit(i) || 0)
    return s + p
  }, 0), [sold, ventesUnitaires])

  const totalAchats = useMemo(() => sold.reduce((s, i) => s + lotAchatTotal(i), 0), [sold])

  const avgROI = useMemo(() => {
    const rends = sold.filter(i => !i.quantite_mode).map(i => rendement(i)).filter(r => r != null)
    return rends.length ? rends.reduce((s, r) => s + r, 0) / rends.length : 0
  }, [sold])

  const bestItem = useMemo(() => {
    if (!sold.length) return null
    return sold.reduce((best, i) => {
      const pb = i.quantite_mode ? (lotProfit(i, ventesUnitaires) || 0) : (profit(i) || 0)
      const pc = best.quantite_mode ? (lotProfit(best, ventesUnitaires) || 0) : (profit(best) || 0)
      return pb > pc ? i : best
    }, sold[0])
  }, [sold, ventesUnitaires])

  const worstItem = useMemo(() => {
    if (!sold.length) return null
    return sold.reduce((worst, i) => {
      const pb = i.quantite_mode ? (lotProfit(i, ventesUnitaires) || 0) : (profit(i) || 0)
      const pc = worst.quantite_mode ? (lotProfit(worst, ventesUnitaires) || 0) : (profit(worst) || 0)
      return pb < pc ? i : worst
    }, sold[0])
  }, [sold, ventesUnitaires])

  const monthly = useMemo(() => {
    const grouped = groupByMonth(sold.filter(i => !i.quantite_mode), 'date_vente')
    const achatGrouped = groupByMonth(items.filter(i => i.date_achat), 'date_achat')
    const allKeys = [...new Set([...Object.keys(grouped), ...Object.keys(achatGrouped)])]
      .filter(k => k && k.match(/^\d{4}-\d{2}$/))
      .sort()
    return allKeys.map(k => ({
      key: k,
      label: formatMonth(k),
      ca: grouped[k]?.reduce((s, i) => s + (i.prix_vente || 0), 0) || 0,
      achats: achatGrouped[k]?.reduce((s, i) => s + lotAchatTotal(i), 0) || 0,
      benef: grouped[k]?.reduce((s, i) => s + (profit(i) || 0), 0) || 0,
      nb: grouped[k]?.length || 0,
    }))
  }, [sold, items])

  const pfStats = useMemo(() => {
    const map = {}
    sold.forEach(i => {
      const pf = i.plateforme_achat || 'Inconnu'
      if (!map[pf]) map[pf] = { ca: 0, benef: 0, nb: 0 }
      map[pf].ca += i.quantite_mode ? (lotVenteTotal(i, ventesUnitaires) || 0) : (i.prix_vente || 0)
      map[pf].benef += i.quantite_mode ? (lotProfit(i, ventesUnitaires) || 0) : (profit(i) || 0)
      map[pf].nb++
    })
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, roi: v.ca > 0 ? (v.benef / (v.ca - v.benef)) * 100 : 0 }))
      .sort((a, b) => b.benef - a.benef)
  }, [sold, ventesUnitaires])

  const handleSave = async (data) => {
    if (editItem?.id) return updateItem(editItem.id, data)
    return addItem(data)
  }

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#555', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#555', font: { size: 10 }, callback: v => v + '€' }, grid: { color: 'rgba(255,255,255,0.04)' } }
    }
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px' }}>Ventes</div>
        {(monthFilter || yearFilter) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: 'var(--g)' }}>
              {monthFilter ? new Date(monthFilter + '-01').toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : yearFilter}
            </span>
            <button className="btn-ghost" onClick={() => window.history.back()} style={{ fontSize: 11 }}>← Retour</button>
          </div>
        )}
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">CA total</div>
          <div className="kpi-value" style={{ color: 'var(--g)' }}>{fmtEur(totalCA)}</div>
          <div className="kpi-sub">{sold.reduce((s, i) => s + (i.quantite_mode ? (ventesUnitaires.filter(v => v.item_id === i.id).length) : 1), 0)} ventes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bénéfice net</div>
          <div className="kpi-value" style={{ color: totalBenef >= 0 ? 'var(--g)' : 'var(--red)' }}>
            {totalBenef >= 0 ? '+' : ''}{fmtEur(totalBenef)}
          </div>
          <div className="kpi-sub" style={{ color: avgROI >= 0 ? 'var(--g)' : 'var(--red)' }}>{fmtPct(avgROI)} ROI moyen</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total achats</div>
          <div className="kpi-value" style={{ color: 'var(--b)' }}>{fmtEur(totalAchats)}</div>
          <div className="kpi-sub">investi sur items vendus</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Marge moyenne</div>
          <div className="kpi-value" style={{ color: 'var(--b)' }}>
            {sold.length ? fmtEur(totalBenef / sold.length) : '—'}
          </div>
          <div className="kpi-sub">par item</div>
        </div>
      </div>

      {monthly.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Évolution mensuelle</div>
            <div style={{ fontSize: 11, color: 'var(--mut)', marginBottom: 14 }}>
              {[['#22c55e','CA'],['#3b82f6','Achats'],['#f97316','Bénéfice']].map(([c,l]) => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 12 }}>
                  <span style={{ width: 8, height: 8, background: c, borderRadius: 2, display: 'inline-block' }} /> {l}
                </span>
              ))}
            </div>
            <div style={{ height: 160, position: 'relative' }}>
              <Bar data={{
                labels: monthly.map(m => m.label),
                datasets: [
                  { label: 'CA', data: monthly.map(m => m.ca), backgroundColor: '#22c55e33', borderColor: '#22c55e', borderWidth: 1, borderRadius: 3 },
                  { label: 'Achats', data: monthly.map(m => m.achats), backgroundColor: '#3b82f633', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 3 },
                  { label: 'Bénéfice', data: monthly.map(m => m.benef), backgroundColor: '#f9731633', borderColor: '#f97316', borderWidth: 1, borderRadius: 3 },
                ]
              }} options={barOptions} />
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Top & Flop</div>
            {bestItem && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Meilleur item</div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{bestItem.nom}</div>
                <div className="profit-pos" style={{ fontSize: 13, fontWeight: 500 }}>
                  +{fmtEur(bestItem.quantite_mode ? lotProfit(bestItem, ventesUnitaires) : profit(bestItem))}
                </div>
              </div>
            )}
            {worstItem && worstItem.id !== bestItem?.id && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Pire item</div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{worstItem.nom}</div>
                <div className={profit(worstItem) >= 0 ? 'profit-pos' : 'profit-neg'} style={{ fontSize: 13, fontWeight: 500 }}>
                  {(() => { const p = worstItem.quantite_mode ? lotProfit(worstItem, ventesUnitaires) : profit(worstItem); return (p >= 0 ? '+' : '') + fmtEur(p) })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {pfStats.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Performance par plateforme</div>
          <table style={{ width: '100%' }}>
            <thead>
              <tr><th>Plateforme</th><th>Nb ventes</th><th>CA</th><th>Bénéfice</th><th>ROI</th></tr>
            </thead>
            <tbody>
              {pfStats.map(pf => (
                <tr key={pf.name}>
                  <td style={{ fontWeight: 500 }}>{pf.name}</td>
                  <td style={{ color: 'var(--mut)' }}>{pf.nb}</td>
                  <td style={{ color: 'var(--g)' }}>{fmtEur(pf.ca)}</td>
                  <td><span className={pf.benef >= 0 ? 'profit-pos' : 'profit-neg'}>{pf.benef >= 0 ? '+' : ''}{fmtEur(pf.benef)}</span></td>
                  <td><span className={pf.roi >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(pf.roi)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Historique des ventes</div>
          <div style={{ fontSize: 12, color: 'var(--mut)' }}>{sold.length} ventes</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th><th>Catégorie</th><th>Achat</th>
              <th>Vente</th><th>Profit</th><th>ROI</th>
              <th>Date vente</th><th>Plateforme</th>
            </tr>
          </thead>
          <tbody>
            {sold.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div style={{ fontSize: 20 }}>📈</div>
                  <p>Aucune vente enregistrée pour le moment.</p>
                </div>
              </td></tr>
            ) : [...sold].sort((a, b) => {
              const da = a.quantite_mode ? '' : (a.date_vente || '')
              const db = b.quantite_mode ? '' : (b.date_vente || '')
              return db.localeCompare(da)
            }).map(item => {
              const p = item.quantite_mode ? lotProfit(item, ventesUnitaires) : profit(item)
              const r = item.quantite_mode ? null : rendement(item)
              const achat = lotAchatTotal(item)
              const vente = item.quantite_mode ? lotVenteTotal(item, ventesUnitaires) : item.prix_vente
              return (
                <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => { setEditItem(item); setShowModal(true) }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.nom}</div>
                    {item.quantite_mode && <div style={{ fontSize: 10, color: 'var(--b)' }}>Lot × {item.quantite_total}</div>}
                  </td>
                  <td><span className="badge" style={catBadgeStyle(item.categorie, categories)}>{item.categorie}</span></td>
                  <td style={{ color: 'var(--b)' }}>{fmtEur(achat)}</td>
                  <td style={{ color: 'var(--g)' }}>{vente ? fmtEur(vente) : '—'}</td>
                  <td>{p != null ? <span className={p >= 0 ? 'profit-pos' : 'profit-neg'}>{p >= 0 ? '+' : ''}{fmtEur(p)}</span> : '—'}</td>
                  <td>{r != null ? <span className={r >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(r)}</span> : '—'}</td>
                  <td style={{ color: 'var(--mut)' }}>{item.date_vente ? new Date(item.date_vente).toLocaleDateString('fr-FR') : '—'}</td>
                  <td style={{ color: 'var(--mut)' }}>{item.plateforme_achat || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ItemModal item={editItem} categories={categories} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null) }} />
      )}
    </div>
  )
}
