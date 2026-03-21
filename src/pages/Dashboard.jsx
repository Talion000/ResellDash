import { useState, useMemo } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { useItemsContext } from '../hooks/ItemsContext'
import ItemModal from '../components/ItemModal'
import { profit, rendement, fmtEur, fmtPct, daysSince, catBadgeStyle, catColor, statusClass, groupByMonth, formatMonth, STATUTS } from '../lib/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

export default function Dashboard() {
  const { items, categories, loading, addItem, updateItem, deleteItem, duplicateItem } = useItemsContext()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterSt, setFilterSt] = useState('')
  const [filterPf, setFilterPf] = useState('')

  const soldItems = useMemo(() => items.filter(i => i.statut === 'Vendu' && i.prix_vente), [items])
  const stockItems = useMemo(() => items.filter(i => i.statut !== 'Vendu'), [items])
  const alertItems = useMemo(() => stockItems.filter(i => daysSince(i.date_achat) > 90), [stockItems])

  const totalCA = useMemo(() => soldItems.reduce((s, i) => s + (i.prix_vente || 0), 0), [soldItems])
  const totalBenef = useMemo(() => soldItems.reduce((s, i) => s + (profit(i) || 0), 0), [soldItems])
  const totalStock = useMemo(() => stockItems.reduce((s, i) => s + (i.prix_achat || 0), 0), [stockItems])
  const avgROI = useMemo(() => {
    const rends = soldItems.map(i => rendement(i)).filter(r => r != null)
    return rends.length ? rends.reduce((s, r) => s + r, 0) / rends.length : 0
  }, [soldItems])

  const bestCat = useMemo(() => {
    const map = {}
    soldItems.forEach(i => {
      if (!map[i.categorie]) map[i.categorie] = 0
      map[i.categorie] += profit(i) || 0
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
  }, [soldItems])

  const plateformes = useMemo(() => [...new Set(items.map(i => i.plateforme_achat).filter(Boolean))], [items])

  const monthlyData = useMemo(() => {
    const grouped = groupByMonth(soldItems, 'date_vente')
    const achatGrouped = groupByMonth(items.filter(i => i.date_achat), 'date_achat')
    const allKeys = [...new Set([...Object.keys(grouped), ...Object.keys(achatGrouped)])].sort().slice(-7)
    return {
      labels: allKeys.map(formatMonth),
      ca: allKeys.map(k => grouped[k]?.reduce((s, i) => s + (i.prix_vente || 0), 0) || 0),
      achats: allKeys.map(k => achatGrouped[k]?.reduce((s, i) => s + (i.prix_achat || 0), 0) || 0),
    }
  }, [soldItems, items])

  const catData = useMemo(() => {
    const map = {}
    soldItems.forEach(i => {
      if (!map[i.categorie]) map[i.categorie] = 0
      map[i.categorie] += profit(i) || 0
    })
    const cats = Object.entries(map).filter(([, v]) => v > 0)
    return {
      labels: cats.map(([k]) => k),
      data: cats.map(([, v]) => Math.round(v)),
      colors: cats.map(([k]) => catColor(k, categories)),
    }
  }, [soldItems, categories])

  const filtered = useMemo(() => items.filter(i => {
    if (search && !i.nom.toLowerCase().includes(search.toLowerCase()) && !(i.taille_ref || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && i.categorie !== filterCat) return false
    if (filterSt && i.statut !== filterSt) return false
    if (filterPf && i.plateforme_achat !== filterPf) return false
    return true
  }), [items, search, filterCat, filterSt, filterPf])

  const handleSave = async (data) => {
    if (editItem?.id) return updateItem(editItem.id, data)
    return addItem(data)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer "${item.nom}" ?`)) return
    await deleteItem(item.id)
  }

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#555', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#555', font: { size: 10 }, callback: v => v + '€' }, grid: { color: 'rgba(255,255,255,0.04)' } }
    }
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--mut)' }}>Chargement...</div>

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px' }}>Dashboard</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg2)', border: '0.5px solid var(--brd2)', borderRadius: 8, padding: '7px 12px', width: 220 }}>
            <SearchIcon />
            <input style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, width: '100%' }}
              placeholder="Rechercher un item..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowModal(true) }}>+ Ajouter</button>
        </div>
      </div>

      {alertItems.length > 0 && (
        <div className="alert-banner" style={{ marginBottom: 20 }}>
          <span style={{ color: 'var(--o)', fontSize: 15 }}>⚠</span>
          <span><strong style={{ color: 'var(--o)' }}>{alertItems.length} item{alertItems.length > 1 ? 's' : ''}</strong> en stock depuis plus de 90 jours</span>
        </div>
      )}

      {/* KPIs — vert=benef, bleu=achats, orange=stock */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">CA total</div>
          <div className="kpi-value" style={{ color: 'var(--g)' }}>{fmtEur(totalCA)}</div>
          <div className="kpi-sub">{soldItems.length} ventes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bénéfice net</div>
          <div className="kpi-value" style={{ color: totalBenef >= 0 ? 'var(--g)' : 'var(--red)' }}>
            {totalBenef >= 0 ? '+' : ''}{fmtEur(totalBenef)}
          </div>
          <div className="kpi-sub" style={{ color: avgROI >= 0 ? 'var(--g)' : 'var(--red)' }}>{fmtPct(avgROI)} ROI moyen</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Valeur stock</div>
          <div className="kpi-value" style={{ color: 'var(--o)' }}>{fmtEur(totalStock)}</div>
          <div className="kpi-sub">{stockItems.length} items en cours</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Meilleure cat.</div>
          <div className="kpi-value" style={{ color: catColor(bestCat, categories) }}>{bestCat}</div>
          <div className="kpi-sub" style={{ color: catColor(bestCat, categories) }}>par bénéfice total</div>
        </div>
      </div>

      {monthlyData.labels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Évolution mensuelle</div>
            <div style={{ fontSize: 11, color: 'var(--mut)', marginBottom: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 12 }}>
                <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: 2, display: 'inline-block' }} /> CA / Bénéfice
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: 2, display: 'inline-block' }} /> Achats
              </span>
            </div>
            <div style={{ height: 130, position: 'relative' }}>
              <Bar data={{
                labels: monthlyData.labels,
                datasets: [
                  { label: 'CA', data: monthlyData.ca, backgroundColor: '#22c55e33', borderColor: '#22c55e', borderWidth: 1, borderRadius: 3 },
                  { label: 'Achats', data: monthlyData.achats, backgroundColor: '#3b82f633', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 3 },
                ]
              }} options={barOptions} />
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Par catégorie</div>
            <div style={{ fontSize: 11, color: 'var(--mut)', marginBottom: 14 }}>Bénéfice total</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {catData.data.length > 0 ? (
                <>
                  <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                    <Doughnut data={{ labels: catData.labels, datasets: [{ data: catData.data, backgroundColor: catData.colors, borderWidth: 0, borderRadius: 2 }] }}
                      options={{ cutout: '72%', plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {catData.labels.map((label, i) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--mut)' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: catData.colors[i], flexShrink: 0 }} />
                        {label}
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--g)', marginLeft: 'auto' }}>+{catData.data[i]}€</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{ color: 'var(--mut)', fontSize: 12 }}>Pas encore de données</div>}
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Stock & Historique</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { val: filterCat, set: setFilterCat, opts: categories.map(c => c.name), placeholder: 'Toutes catégories' },
              { val: filterSt, set: setFilterSt, opts: STATUTS, placeholder: 'Tous statuts' },
              { val: filterPf, set: setFilterPf, opts: plateformes, placeholder: 'Toutes plateformes' },
            ].map((f, i) => (
              <select key={i} className="form-input" style={{ padding: '5px 10px', fontSize: 11, borderRadius: 20, width: 'auto' }}
                value={f.val} onChange={e => f.set(e.target.value)}>
                <option value="">{f.placeholder}</option>
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 50 }}>Photo</th>
              <th>Item</th><th>Catégorie</th><th>Taille/Réf</th>
              <th>Achat</th><th>Vente</th><th>Profit</th><th>ROI</th>
              <th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state">
                  <div style={{ fontSize: 20 }}>📦</div>
                  <p>{items.length === 0 ? 'Aucun item. Clique sur "+ Ajouter" !' : 'Aucun résultat.'}</p>
                </div>
              </td></tr>
            ) : filtered.map(item => {
              const p = profit(item)
              const r = rendement(item)
              const days = daysSince(item.date_achat)
              const isOld = item.statut !== 'Vendu' && days > 90
              const badgeStyle = catBadgeStyle(item.categorie, categories)
              return (
                <tr key={item.id} onClick={() => { setEditItem(item); setShowModal(true) }}>
                  <td>
                    {item.image_url
                      ? <img src={item.image_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '0.5px solid var(--brd2)' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
                    }
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nom}</div>
                    {isOld && <div style={{ fontSize: 10, color: 'var(--o)', marginTop: 2 }}>⚠ {days}j en stock</div>}
                    {item.notes && <div style={{ fontSize: 10, color: 'var(--mut)', marginTop: 2 }}>{item.notes}</div>}
                  </td>
                  <td><span className="badge" style={badgeStyle}>{item.categorie}</span></td>
                  <td style={{ color: 'var(--mut)' }}>{item.taille_ref || '—'}</td>
                  <td style={{ color: 'var(--b)' }}>{fmtEur(item.prix_achat)}</td>
                  <td style={{ color: item.prix_vente ? 'var(--g)' : 'var(--mut2)' }}>{item.prix_vente ? fmtEur(item.prix_vente) : '—'}</td>
                  <td>{p != null ? <span className={p >= 0 ? 'profit-pos' : 'profit-neg'}>{p >= 0 ? '+' : ''}{fmtEur(p)}</span> : <span style={{ color: 'var(--mut2)' }}>—</span>}</td>
                  <td>{r != null ? <span className={r >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(r)}</span> : <span style={{ color: 'var(--mut2)' }}>—</span>}</td>
                  <td><span className={`status-badge ${statusClass(item.statut)}`}>{item.statut}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn-ghost" title="Dupliquer" onClick={() => duplicateItem(item)} style={{ marginRight: 4 }}>⧉</button>
                    <button className="btn-ghost" title="Supprimer" onClick={() => handleDelete(item)} style={{ color: 'var(--red)' }}>✕</button>
                  </td>
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

const SearchIcon = () => <svg width="12" height="12" fill="none" stroke="#555" strokeWidth="2" viewBox="0 0 16 16"><circle cx="6" cy="6" r="4"/><line x1="9.5" y1="9.5" x2="14" y2="14"/></svg>
