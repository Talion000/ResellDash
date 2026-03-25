import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { useItemsContext } from '../hooks/ItemsContext'
import ItemModal from '../components/ItemModal'
import ScanModal from '../components/ScanModal'
import { profit, rendement, fmtEur, fmtPct, daysSince, catBadgeStyle, catColor, statusClass, groupByMonth, formatMonth, STATUTS, lotAchatTotal, lotVenteTotal, lotProfit, lotValeurStock } from '../lib/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const EXCLUDED_STATUTS = ['Remboursé', 'En retour']
const DELAI_RETOUR = 30
const ALERTE_AVANT = 7

export default function Dashboard() {
  const navigate = useNavigate()
  const { items, categories, ventesUnitaires, abonnements, loading, addItem, updateItem, deleteItem, duplicateItem } = useItemsContext()
  const [showModal, setShowModal] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [blurNumbers, setBlurNumbers] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterSt, setFilterSt] = useState('')
  const [filterPf, setFilterPf] = useState('')
  const [sortOrder, setSortOrder] = useState('recent')

  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const kpiItems = useMemo(() => items.filter(i => !filterCat || i.categorie === filterCat), [items, filterCat])
  const kpiItemsMonth = useMemo(() => kpiItems.filter(i => {
    if (i.quantite_mode) return ventesUnitaires.some(v => v.item_id === i.id && (v.date_vente || '').startsWith(currentMonth))
    return i.date_vente?.startsWith(currentMonth)
  }), [kpiItems, ventesUnitaires, currentMonth])
  const stockItems = useMemo(() => kpiItems.filter(i => !['Vendu', ...EXCLUDED_STATUTS].includes(i.statut)), [kpiItems])
  const alertItems = useMemo(() => stockItems.filter(i => daysSince(i.date_achat) > 90), [stockItems])

  // Alertes retour (J-7 avant 30j)
  const alertesRetour = useMemo(() => items.filter(i => {
    if (['Vendu', 'En retour', 'Remboursé'].includes(i.statut)) return false
    if (!i.date_achat) return false
    const days = daysSince(i.date_achat)
    return days >= (DELAI_RETOUR - ALERTE_AVANT) && days < DELAI_RETOUR
  }), [items])

  const totalCA = useMemo(() => {
    // Ventes normales ce mois
    const normal = kpiItems
      .filter(i => !EXCLUDED_STATUTS.includes(i.statut) && !i.quantite_mode && i.date_vente?.startsWith(currentMonth))
      .reduce((s, i) => s + (i.prix_vente || 0), 0)
    // Ventes unitaires des lots ce mois
    const lots = ventesUnitaires
      .filter(v => (v.date_vente || '').startsWith(currentMonth))
      .reduce((s, v) => s + (v.prix_vente || 0), 0)
    return normal + lots
  }, [kpiItems, ventesUnitaires, currentMonth])

  const totalBenef = useMemo(() => {
    // Bénéfice items normaux vendus ce mois
    const normal = kpiItems
      .filter(i => !EXCLUDED_STATUTS.includes(i.statut) && !i.quantite_mode && i.date_vente?.startsWith(currentMonth))
      .reduce((s, i) => s + (profit(i) || 0), 0)
    // Bénéfice ventes unitaires ce mois
    const lots = ventesUnitaires
      .filter(v => (v.date_vente || '').startsWith(currentMonth))
      .reduce((s, v) => {
        const item = kpiItems.find(i => i.id === v.item_id)
        return s + (item ? v.prix_vente - item.prix_achat : 0)
      }, 0)
    return normal + lots
  }, [kpiItems, ventesUnitaires, currentMonth])

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

  const plateformes = useMemo(() => [...new Set(items.map(i => i.plateforme_achat).filter(Boolean))], [items])

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

  const filtered = useMemo(() => items.filter(i => {
    if (search && !i.nom.toLowerCase().includes(search.toLowerCase()) && !(i.taille_ref || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && i.categorie !== filterCat) return false
    if (filterSt && i.statut !== filterSt) return false
    if (filterPf && i.plateforme_achat !== filterPf) return false
    return true
  }).sort((a, b) => {
    const da = a.date_achat || '', db = b.date_achat || ''
    return sortOrder === 'recent' ? db.localeCompare(da) : da.localeCompare(db)
  }), [items, search, filterCat, filterSt, filterPf, sortOrder])

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
            <button
              onClick={e => { e.stopPropagation(); setShowScan(true) }}
              style={{ background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'var(--red)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              📷 Scan rapide
            </button>
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
        <div className="kpi-card">
          <div className="kpi-label">CA — {new Date().toLocaleString('fr-FR', {month: 'long'})}</div>
          <div className="kpi-value" style={{ color: 'var(--g)', filter: blurNumbers ? 'blur(8px)' : 'none', transition: 'filter 0.2s', userSelect: blurNumbers ? 'none' : 'auto' }}>{fmtEur(totalCA)}</div>
          <div className="kpi-sub">{
            kpiItems.filter(i => !i.quantite_mode && i.date_vente?.startsWith(currentMonth)).length
            + ventesUnitaires.filter(v => (v.date_vente || '').startsWith(currentMonth)).length
          } ventes ce mois</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bénéfice — {new Date().toLocaleString('fr-FR', {month: 'long'})}</div>
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

      {/* Table */}
      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Stock & Historique</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-input" style={{ padding: '5px 10px', fontSize: 11, borderRadius: 20, width: 'auto' }}
              value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
              <option value="recent">Plus récent</option>
              <option value="ancien">Plus ancien</option>
            </select>
            {[
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
              const isOld = !['Vendu', ...EXCLUDED_STATUTS].includes(item.statut) && days > 90
              const isRetourAlert = alertesRetour.some(a => a.id === item.id)
              const badgeStyle = catBadgeStyle(item.categorie, categories)
              return (
                <tr key={item.id} onClick={() => { setEditItem(item); setShowModal(true) }} style={{ cursor: 'pointer', background: isRetourAlert ? 'rgba(239,68,68,0.04)' : undefined }}>
                  <td>
                    {item.image_url
                      ? <img src={item.image_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '0.5px solid var(--brd2)' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
                    }
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nom}</div>
                    {item.quantite_mode && <div style={{ fontSize: 10, color: 'var(--b)', marginTop: 2 }}>📦 Lot × {item.quantite_total}</div>}
                    {isOld && <div style={{ fontSize: 10, color: 'var(--o)', marginTop: 2 }}>⚠ {days}j en stock</div>}
                    {isRetourAlert && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2 }}>🔔 Retour dans {DELAI_RETOUR - days}j !</div>}
                    {item.notes && <div style={{ fontSize: 10, color: 'var(--mut)', marginTop: 2 }}>{item.notes}</div>}
                  </td>
                  <td><span className="badge" style={badgeStyle}>{item.categorie}</span></td>
                  <td style={{ color: 'var(--mut)' }}>{item.taille_ref || '—'}</td>
                  <td style={{ color: 'var(--b)' }}>{fmtEur(lotAchatTotal(item))}</td>
                  <td style={{ color: item.quantite_mode ? (lotVenteTotal(item, ventesUnitaires) != null ? 'var(--g)' : 'var(--mut2)') : (item.prix_vente ? 'var(--g)' : 'var(--mut2)') }}>
                    {item.quantite_mode ? (lotVenteTotal(item, ventesUnitaires) != null ? fmtEur(lotVenteTotal(item, ventesUnitaires)) : '—') : (item.prix_vente ? fmtEur(item.prix_vente) : '—')}
                  </td>
                  <td>{(() => { const lp = item.quantite_mode ? lotProfit(item, ventesUnitaires) : p; return lp != null && !EXCLUDED_STATUTS.includes(item.statut) ? <span className={lp >= 0 ? 'profit-pos' : 'profit-neg'}>{lp >= 0 ? '+' : ''}{fmtEur(lp)}</span> : <span style={{ color: 'var(--mut2)' }}>—</span> })()}</td>
                  <td>{r != null && !item.quantite_mode && !EXCLUDED_STATUTS.includes(item.statut) ? <span className={r >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(r)}</span> : <span style={{ color: 'var(--mut2)' }}>—</span>}</td>
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
      {showScan && <ScanModal onClose={() => setShowScan(false)} />}
    </div>
  )
}

const SearchIcon = () => <svg width="12" height="12" fill="none" stroke="#555" strokeWidth="2" viewBox="0 0 16 16"><circle cx="6" cy="6" r="4"/><line x1="9.5" y1="9.5" x2="14" y2="14"/></svg>
