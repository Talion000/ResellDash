import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { useItemsContext } from '../hooks/ItemsContext'
import { profit, rendement, fmtEur, fmtPct, fmt, groupByMonth, formatMonth, catBadgeClass } from '../lib/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default function Ventes() {
  const { items } = useItemsContext()

  const sold = useMemo(() => items.filter(i => i.statut === 'Vendu' && i.prix_vente), [items])

  const totalCA = useMemo(() => sold.reduce((s, i) => s + i.prix_vente, 0), [sold])
  const totalBenef = useMemo(() => sold.reduce((s, i) => s + (profit(i) || 0), 0), [sold])
  const totalAchats = useMemo(() => sold.reduce((s, i) => s + i.prix_achat, 0), [sold])
  const avgROI = useMemo(() => {
    const rs = sold.map(i => rendement(i)).filter(r => r != null)
    return rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : 0
  }, [sold])

  const bestItem = useMemo(() => {
    if (!sold.length) return null
    return sold.reduce((best, i) => (profit(i) || 0) > (profit(best) || 0) ? i : best, sold[0])
  }, [sold])

  const worstItem = useMemo(() => {
    if (!sold.length) return null
    return sold.reduce((worst, i) => (profit(i) || 0) < (profit(worst) || 0) ? i : worst, sold[0])
  }, [sold])

  const monthly = useMemo(() => {
    const grouped = groupByMonth(sold, 'date_vente')
    const achatGrouped = groupByMonth(items.filter(i => i.date_achat), 'date_achat')
    const allKeys = [...new Set([...Object.keys(grouped), ...Object.keys(achatGrouped)])].sort()
    return allKeys.map(k => ({
      key: k,
      label: formatMonth(k),
      ca: grouped[k]?.reduce((s, i) => s + i.prix_vente, 0) || 0,
      achats: achatGrouped[k]?.reduce((s, i) => s + i.prix_achat, 0) || 0,
      benef: grouped[k]?.reduce((s, i) => s + (profit(i) || 0), 0) || 0,
      nb: grouped[k]?.length || 0,
    }))
  }, [sold, items])

  const pfStats = useMemo(() => {
    const map = {}
    sold.forEach(i => {
      const pf = i.plateforme_achat || 'Inconnu'
      if (!map[pf]) map[pf] = { ca: 0, benef: 0, nb: 0 }
      map[pf].ca += i.prix_vente
      map[pf].benef += profit(i) || 0
      map[pf].nb++
    })
    return Object.entries(map).map(([name, v]) => ({ name, ...v, roi: v.ca > 0 ? (v.benef / (v.ca - v.benef)) * 100 : 0 }))
      .sort((a, b) => b.benef - a.benef)
  }, [sold])

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
      <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px', marginBottom: 24 }}>Ventes</div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">CA total</div>
          <div className="kpi-value" style={{ color: 'var(--g)' }}>{fmtEur(totalCA)}</div>
          <div className="kpi-sub">{sold.length} ventes</div>
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
          <div className="kpi-value" style={{ color: 'var(--o)' }}>{fmtEur(totalAchats)}</div>
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

      {/* Charts */}
      {monthly.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Évolution mensuelle</div>
            <div style={{ fontSize: 11, color: 'var(--mut)', marginBottom: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 12 }}>
                <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: 2, display: 'inline-block' }} /> CA
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 12 }}>
                <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: 2, display: 'inline-block' }} /> Achats
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, background: '#f97316', borderRadius: 2, display: 'inline-block' }} /> Bénéfice
              </span>
            </div>
            <div style={{ height: 160, position: 'relative' }}>
              <Bar
                data={{
                  labels: monthly.map(m => m.label),
                  datasets: [
                    { label: 'CA', data: monthly.map(m => m.ca), backgroundColor: '#22c55e33', borderColor: '#22c55e', borderWidth: 1, borderRadius: 3 },
                    { label: 'Achats', data: monthly.map(m => m.achats), backgroundColor: '#3b82f633', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 3 },
                    { label: 'Bénéfice', data: monthly.map(m => m.benef), backgroundColor: '#f9731633', borderColor: '#f97316', borderWidth: 1, borderRadius: 3 },
                  ]
                }}
                options={barOptions}
              />
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Top & Flop</div>
            {bestItem && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Meilleur item</div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{bestItem.nom}</div>
                <div className="profit-pos" style={{ fontSize: 13, fontWeight: 500 }}>+{fmtEur(profit(bestItem))}</div>
              </div>
            )}
            {worstItem && worstItem.id !== bestItem?.id && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Pire item</div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{worstItem.nom}</div>
                <div className={profit(worstItem) >= 0 ? 'profit-pos' : 'profit-neg'} style={{ fontSize: 13, fontWeight: 500 }}>
                  {profit(worstItem) >= 0 ? '+' : ''}{fmtEur(profit(worstItem))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plateformes stats */}
      {pfStats.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Performance par plateforme</div>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Plateforme</th>
                <th>Nb ventes</th>
                <th>CA</th>
                <th>Bénéfice</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {pfStats.map(pf => (
                <tr key={pf.name}>
                  <td style={{ fontWeight: 500 }}>{pf.name}</td>
                  <td style={{ color: 'var(--mut)' }}>{pf.nb}</td>
                  <td>{fmtEur(pf.ca)}</td>
                  <td>
                    <span className={pf.benef >= 0 ? 'profit-pos' : 'profit-neg'}>
                      {pf.benef >= 0 ? '+' : ''}{fmtEur(pf.benef)}
                    </span>
                  </td>
                  <td>
                    <span className={pf.roi >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(pf.roi)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Historique des ventes */}
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
            ) : [...sold].sort((a, b) => (b.date_vente || '').localeCompare(a.date_vente || '')).map(item => {
              const p = profit(item)
              const r = rendement(item)
              return (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.nom}</td>
                  <td><span className={`badge ${catBadgeClass(item.categorie)}`}>{item.categorie}</span></td>
                  <td>{fmtEur(item.prix_achat)}</td>
                  <td>{fmtEur(item.prix_vente)}</td>
                  <td><span className={p >= 0 ? 'profit-pos' : 'profit-neg'}>{p >= 0 ? '+' : ''}{fmtEur(p)}</span></td>
                  <td><span className={r >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(r)}</span></td>
                  <td style={{ color: 'var(--mut)' }}>{item.date_vente ? new Date(item.date_vente).toLocaleDateString('fr-FR') : '—'}</td>
                  <td style={{ color: 'var(--mut)' }}>{item.plateforme_achat || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
