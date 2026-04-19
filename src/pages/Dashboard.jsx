import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { useItemsContext } from '../hooks/ItemsContext'
import ItemModal from '../components/ItemModal'
import ScanModal from '../components/ScanModal'
import { profit, rendement, fmtEur, fmtPct, daysSince, catBadgeStyle, catColor, statusClass, groupByMonth, formatMonth, lotAchatTotal, lotProfit, lotValeurStock } from '../lib/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const EXCLUDED_STATUTS = ['Remboursé']
const DELAI_RETOUR = 30
const ALERTE_AVANT = 7

export default function Dashboard() {
  const navigate = useNavigate()
  const { items, categories, ventesUnitaires, abonnements, loading, addItem, updateItem, deleteItem } = useItemsContext()
  const [showModal, setShowModal] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [blurNumbers, setBlurNumbers] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')



  const currentMonth = new Date().toISOString().slice(0, 7)
  const kpiItems = useMemo(() => items.filter(i => !filterCat || i.categorie === filterCat), [items, filterCat])
  const kpiItemsMonth = useMemo(() => kpiItems.filter(i => {
    if (i.quantite_mode) return ventesUnitaires.some(v => v.item_id === i.id && (v.date_vente || '').startsWith(currentMonth))
    return i.date_vente?.startsWith(currentMonth)
  }), [kpiItems, ventesUnitaires, currentMonth])
  const stockItems = useMemo(() => kpiItems.filter(i => !['Vendu', ...EXCLUDED_STATUTS].includes(i.statut)), [kpiItems])
  const alertItems = useMemo(() => stockItems.filter(i => daysSince(i.date_achat) > 90), [stockItems])

  const alertesRetour = useMemo(() => items.filter(i => {
    if (['Vendu', 'Remboursé', 'Hold'].includes(i.statut)) return false
    if (!i.date_achat) return false
    const days = daysSince(i.date_achat)
    return days >= (DELAI_RETOUR - ALERTE_AVANT) && days < DELAI_RETOUR
  }), [items])

  const currentYear = new Date().getFullYear().toString()

  const totalCA = useMemo(() => {
    const normal = kpiItems
      .filter(i => !EXCLUDED_STATUTS.includes(i.statut) && !i.quantite_mode && i.date_vente?.startsWith(currentYear))
      .reduce((s, i) => s + (i.prix_vente || 0), 0)
    const lots = ventesUnitaires
      .filter(v => (v.date_vente || '').startsWith(currentYear))
      .reduce((s, v) => s + (v.prix_vente || 0), 0)
    return normal + lots
  }, [kpiItems, ventesUnitaires, currentYear])

  const totalBenef = useMemo(() => {
    const normal = kpiItems
      .filter(i => !EXCLUDED_STATUTS.includes(i.statut) && !i.quantite_mode && i.date_vente?.startsWith(currentYear))
      .reduce((s, i) => s + (profit(i) || 0), 0)
    const lots = ventesUnitaires
      .filter(v => (v.date_vente || '').startsWith(currentYear))
      .reduce((s, v) => {
        const item = kpiItems.find(i => i.id === v.item_id)
        return s + (item ? v.prix_vente - item.prix_achat : 0)
      }, 0)
    return normal + lots
  }, [kpiItems, ventesUnitaires, currentYear])

  const totalCharges = useMemo(() => abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0), [abonnements])
  const totalBenefNet = totalBenef - totalCharges

  const totalStock = useMemo(() => stockItems.reduce((s, i) => s + lotValeurStock(i, ventesUnitaires), 0), [stockItems, ventesUnitaires])

  const avgROI = useMemo(() => {
    const rends = kpiItems.filter(i => !EXCLUDED_STATUTS.includes(i.statut) && !i.quantite_mode).map(i => rendement(i)).filter(r => r != null)
    return rends.length ? rends.reduce((s, r) => s + r, 0) / rends.length : 0
  }, [kpiItems])

  const bestCat = useMemo(() => {
    const map = {}
    kpiItems.filter(i => !EXCLUDED_STATUTS.includes(i.statut)).forEach(i => {
      if (!map[i.categorie]) map[i.categorie] = 0
      map[i.categorie] += i.quantite_mode ? (lotProfit(i, ventesUnitaires) || 0) : (profit(i) || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
  }, [kpiItems, ventesUnitaires])

  const top5 = useMemo(() => {
    return items
      .map(i => ({
        ...i,
        _profit: i.quantite_mode ? (lotProfit(i, ventesUnitaires) || 0) : (profit(i) || 0),
        _roi: i.quantite_mode ? null : rendement(i),
      }))
      .filter(i => !EXCLUDED_STATUTS.includes(i.statut) && i._profit !== 0)
      .sort((a, b) => b._profit - a._profit)
      .slice(0, 5)
  }, [items, ventesUnitaires])

  const monthlyData = useMemo(() => {
    const grouped = groupByMonth(kpiItems.filter(i => i.statut === 'Vendu' && !i.quantite_mode && i.prix_vente), 'date_vente')
    const achatGrouped = groupByMonth(kpiItems.filter(i => i.date_achat), 'date_achat')
    const allKeys = [...new Set([...Object.keys(grouped), ...Object.keys(achatGrouped)])]
      .filter(k => k && k.match(/^\d{4}-\d{2}$/))
      .sort().slice(-7)
    return {
      labels: allKeys.map(formatMonth),
      ca: allKeys.map(k => grouped[k]?.reduce((s, i) => s + (i.prix_vente || 0), 0) || 0),
      achats: allKeys.map(k => achatGrouped[k]?.reduce((s, i) => s + lotAchatTotal(i), 0) || 0),
    }
  }, [kpiItems, ventesUnitaires])

  const catData = useMemo(() => {
    const map = {}
    kpiItems.filter(i => !EXCLUDED_STATUTS.includes(i.statut)).forEach(i => {
      if (!map[i.categorie]) map[i.categorie] = 0
      map[i.categorie] += i.quantite_mode ? (lotProfit(i, ventesUnitaires) || 0) : (profit(i) || 0)
    })
    const cats = Object.entries(map).filter(([, v]) => v !== 0)
    return {
      labels: cats.map(([k]) => k),
      data: cats.map(([, v]) => Math.round(v)),
      colors: cats.map(([k]) => catColor(k, categories)),
    }
  }, [kpiItems, ventesUnitaires, categories])




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
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px' }}>Dashboard</div>
          <button onClick={() => setBlurNumbers(b => !b)}
            style={{ background: 'var(--bg2)', border: '0.5px solid var(--brd2)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: blurNumbers ? 'var(--text)' : 'var(--mut)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            title={blurNumbers ? 'Afficher les chiffres' : 'Masquer les chiffres'}>
            {blurNumbers
              ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
            {blurNumbers ? 'Afficher' : 'Masquer'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg2)', border: '0.5px solid var(--brd2)', borderRadius: 8, padding: '7px 12px', width: 220 }}>
            <SearchIcon />
            <input style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, width: '100%' }}
              placeholder="Rechercher un item..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-secondary" onClick={() => setShowScan(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>📷 Scan</button>
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowModal(true) }}>+ Ajouter</button>
        </div>
      </div>

      {/* Filtres catégorie */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', ...categories.map(c => c.name)].map(cat => {
          const isActive = filterCat === cat
          const color = cat ? catColor(cat, categories) : 'var(--text)'
          return (
            <button key={cat || 'all'} onClick={() => setFilterCat(cat)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              background: isActive ? (cat ? color + '22' : 'var(--bg3)') : 'var(--bg2)',
              color: isActive ? (cat ? color : 'var(--text)') : 'var(--mut)',
              border: `0.5px solid ${isActive ? (cat ? color : 'var(--brd2)') : 'var(--brd)'}`,
              transition: 'all 0.15s',
            }}>
              {cat || 'Toutes catégories'}
            </button>
          )
        })}
      </div>

      {/* Alertes retour */}
      {alertesRetour.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.07)', border: '0.5px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 500, color: 'var(--red)' }}>
              🔔 {alertesRetour.length} retour{alertesRetour.length > 1 ? 's' : ''} à effectuer avant la deadline !
            </div>
          </div>
          {alertesRetour.map(item => {
            const days = daysSince(item.date_achat)
            const remaining = DELAI_RETOUR - days
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderTop: '0.5px solid rgba(239,68,68,0.15)', marginTop: 6 }}
                onClick={() => { setEditItem(item); setShowModal(true) }}>
                <span style={{ cursor: 'pointer', color: 'var(--text)', fontWeight: 500 }}>{item.nom}</span>
                <span style={{ color: 'var(--mut)' }}>{item.plateforme_achat || '—'}</span>
                <span style={{ marginLeft: 'auto', color: remaining <= 3 ? 'var(--red)' : 'var(--o)', fontWeight: 500 }}>
                  ⏰ {remaining}j restant{remaining > 1 ? 's' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Alerte stock ancien */}
      {alertItems.length > 0 && (
        <div className="alert-banner" style={{ marginBottom: 20, cursor: 'pointer' }}
          onClick={() => navigate('/stock?alert=90')}>
          <span style={{ color: 'var(--o)', fontSize: 15 }}>⚠</span>
          <span>
            <strong style={{ color: 'var(--o)' }}>{alertItems.length} item{alertItems.length > 1 ? 's' : ''}</strong>
            {' '}en stock depuis plus de 90 jours —{' '}
            <span style={{ color: 'var(--o)', textDecoration: 'underline' }}>voir la liste</span>
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/ventes?year=${currentYear}`)}>
          <div className="kpi-label">CA {currentYear} ↗</div>
          <div className="kpi-value" style={{ color: 'var(--g)', filter: blurNumbers ? 'blur(8px)' : 'none', transition: 'filter 0.2s', userSelect: blurNumbers ? 'none' : 'auto' }}>{fmtEur(totalCA)}</div>
          <div className="kpi-sub">{
            kpiItems.filter(i => !i.quantite_mode && i.date_vente?.startsWith(currentYear)).length
            + ventesUnitaires.filter(v => (v.date_vente || '').startsWith(currentYear)).length
          } ventes {currentYear}</div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/ventes?year=${currentYear}`)}>
          <div className="kpi-label">Bénéfice {currentYear} ↗</div>
          <div className="kpi-value" style={{ color: totalBenef >= 0 ? 'var(--g)' : 'var(--red)', filter: blurNumbers ? 'blur(8px)' : 'none', transition: 'filter 0.2s', userSelect: blurNumbers ? 'none' : 'auto' }}>
            {totalBenef >= 0 ? '+' : ''}{fmtEur(totalBenef)}
          </div>
          {abonnements.length > 0 && (
            <div className="kpi-sub" style={{ color: totalBenefNet >= 0 ? 'var(--g)' : 'var(--red)', filter: blurNumbers ? 'blur(8px)' : 'none', transition: 'filter 0.2s', userSelect: blurNumbers ? 'none' : 'auto' }}>
              Après charges : {totalBenefNet >= 0 ? '+' : ''}{fmtEur(totalBenefNet)}/mois
            </div>
          )}
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/stock?st=En+stock')}>
          <div className="kpi-label">Valeur stock ↗</div>
          <div className="kpi-value" style={{ color: 'var(--o)' }}>{fmtEur(totalStock)}</div>
          <div className="kpi-sub">{stockItems.length} items en cours</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Meilleure cat.</div>
          <div className="kpi-value" style={{ color: catColor(bestCat, categories) }}>{bestCat}</div>
          <div className="kpi-sub" style={{ color: catColor(bestCat, categories) }}>par bénéfice total</div>
        </div>
      </div>

      {/* Charts */}
      {monthlyData.labels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Évolution mensuelle</div>
            <div style={{ fontSize: 11, color: 'var(--mut)', marginBottom: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 12 }}>
                <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: 2, display: 'inline-block' }} /> CA
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
                        <span style={{ fontSize: 12, fontWeight: 500, color: catData.data[i] >= 0 ? 'var(--g)' : 'var(--red)', marginLeft: 'auto' }}>
                          {catData.data[i] >= 0 ? '+' : ''}{catData.data[i]}€
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{ color: 'var(--mut)', fontSize: 12 }}>Pas encore de données</div>}
            </div>
          </div>
        </div>
      )}

      {/* Top 5 items les plus profitables */}
      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>🏆 Top 5 — Items les plus profitables</div>
        </div>
        {top5.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 20 }}>📦</div>
            <p>Pas encore de données de profit.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Catégorie</th>
                <th>Achat</th>
                <th>Profit</th>
                <th>ROI</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((item, idx) => {
                const badgeStyle = catBadgeStyle(item.categorie, categories)
                const roi = item._roi
                return (
                  <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => { setEditItem(item); setShowModal(true) }}>
                    <td>
                      <span style={{
                        fontWeight: 700, fontSize: 13,
                        color: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#cd7c3a' : 'var(--mut)'
                      }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nom}</div>
                      {item.quantite_mode && <div style={{ fontSize: 10, color: 'var(--b)', marginTop: 2 }}>📦 Lot × {item.quantite_total}</div>}
                    </td>
                    <td><span className="badge" style={badgeStyle}>{item.categorie}</span></td>
                    <td style={{ color: 'var(--b)' }}>{fmtEur(lotAchatTotal(item))}</td>
                    <td>
                      <span className={item._profit >= 0 ? 'profit-pos' : 'profit-neg'}>
                        {item._profit >= 0 ? '+' : ''}{fmtEur(item._profit)}
                      </span>
                    </td>
                    <td>
                      {roi != null
                        ? <span className={roi >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(roi)}</span>
                        : <span style={{ color: 'var(--mut2)' }}>—</span>}
                    </td>
                    <td><span className={`status-badge ${statusClass(item.statut)}`}>{item.statut}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <ItemModal item={editItem} categories={categories} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null) }} />
      )}
      {showScan && <ScanModal onClose={() => setShowScan(false)} />}
    </div>
  )
}

const SearchIcon = () => <svg width="12" height="12" fill="none" stroke="#555" strokeWidth="2" viewBox="0 0 16 16"><circle cx="6" cy="6" r="4"/><line x1="9.5" y1="9.5" x2="14" y2="14"/></svg>
