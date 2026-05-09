import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useItemsContext } from '../hooks/ItemsContext'
import ItemModal from '../components/ItemModal'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { profit, fmtEur, fmtPct, daysSince, catBadgeStyle, catColor, statusClass, lotAchatTotal, lotVenteTotal, lotProfit, lotValeurStock, lotNbVendus, formatMonth } from '../lib/utils'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg3)', border: '0.5px solid var(--brd2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--mut)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name} : {typeof p.value === 'number' && p.name.includes('€') ? fmtEur(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function ArticlePage() {
  const { nom } = useParams()
  const nomDecode = decodeURIComponent(nom)
  const navigate = useNavigate()
  const { items, categories, ventesUnitaires, loading, addItem, updateItem, deleteItem, duplicateItem } = useItemsContext()

  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [sortBy, setSortBy] = useState('date_achat')
  const [sortDir, setSortDir] = useState('desc')
  const [expandedLot, setExpandedLot] = useState(null)

  const lots = useMemo(() =>
    items.filter(i => i.nom.trim().toUpperCase() === nomDecode.trim().toUpperCase())
  , [items, nomDecode])

  const sorted = useMemo(() => {
    return [...lots].sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy]
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string') va = va.toLowerCase(), vb = (vb || '').toLowerCase()
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
  }, [lots, sortBy, sortDir])

  const totalInvesti = useMemo(() => lots.reduce((s, i) => s + lotAchatTotal(i), 0), [lots])
  const totalVente = useMemo(() => lots.reduce((s, i) => s + (lotVenteTotal(i, ventesUnitaires) || 0), 0), [lots, ventesUnitaires])
  const totalProfit = useMemo(() => lots.reduce((s, i) => s + (lotProfit(i, ventesUnitaires) || 0), 0), [lots, ventesUnitaires])
  const totalUnites = useMemo(() => lots.reduce((s, i) => s + (i.quantite_mode ? (i.quantite_total || 1) : 1), 0), [lots])
  const totalVendus = useMemo(() => lots.reduce((s, i) => s + lotNbVendus(i, ventesUnitaires), 0), [lots, ventesUnitaires])
  const totalStock = useMemo(() => lots.reduce((s, i) => s + lotValeurStock(i, ventesUnitaires), 0), [lots, ventesUnitaires])

  // Toutes les ventes de cet article
  const allVentes = useMemo(() => {
    const lotIds = new Set(lots.map(i => i.id))
    return ventesUnitaires.filter(v => lotIds.has(v.item_id))
  }, [lots, ventesUnitaires])

  // Prix moyen de vente
  const prixVenteMoyen = useMemo(() => {
    if (allVentes.length === 0) return null
    return allVentes.reduce((s, v) => s + (v.prix_vente || 0), 0) / allVentes.length
  }, [allVentes])

  // Prix moyen d'achat
  const prixAchatMoyen = useMemo(() => {
    if (totalUnites === 0) return null
    return totalInvesti / totalUnites
  }, [totalInvesti, totalUnites])

  // Données graphique : ventes par mois
  const chartVentes = useMemo(() => {
    const months = {}
    allVentes.forEach(v => {
      if (!v.date_vente) return
      const key = v.date_vente.substring(0, 7)
      if (!months[key]) months[key] = { mois: formatMonth(key), ventes: 0, ca: 0, profit: 0 }
      months[key].ventes++
      months[key].ca += v.prix_vente || 0
    })
    // Ajouter le profit par mois (vente - prix achat moyen)
    Object.values(months).forEach(m => {
      m.profit = prixAchatMoyen ? m.ca - prixAchatMoyen * m.ventes : 0
    })
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v)
  }, [allVentes, prixAchatMoyen])

  // Données graphique : achats par lot
  const chartAchats = useMemo(() => {
    return lots.map(i => ({
      label: (i.date_achat ? new Date(i.date_achat).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }) : '?') + ' · ' + fmtEur(i.prix_achat),
      quantite: i.quantite_mode ? (i.quantite_total || 1) : 1,
      vendus: lotNbVendus(i, ventesUnitaires),
      cout: lotAchatTotal(i),
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [lots, ventesUnitaires])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const handleSave = async (data) => {
    if (editItem?.id) return updateItem(editItem.id, { ...data, nom: nomDecode.toUpperCase() })
    return addItem({ ...data, nom: nomDecode.toUpperCase() })
  }

  const handleDelete = async (item) => {
    if (!window.confirm('Supprimer ce lot ?')) return
    await deleteItem(item.id)
  }

  const categorie = lots[0]?.categorie || ''

  const SortTh = ({ col, children }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(col)}>
      {children}{sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )

  if (loading) return <div style={{ padding: 40, color: 'var(--mut)' }}>Chargement...</div>

  if (lots.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
      <div style={{ color: 'var(--mut)' }}>Article introuvable</div>
      <button className="btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/stock')}>← Retour au stock</button>
    </div>
  )

  return (
    <div style={{ padding: '20px 28px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <button className="btn-ghost" onClick={() => navigate('/stock')} style={{ fontSize: 13 }}>← Stock</button>
            <span style={{ color: 'var(--mut)' }}>/</span>
            <span style={{ fontSize: 13, color: 'var(--mut)' }}>{nomDecode}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px' }}>{nomDecode}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span className="badge" style={catBadgeStyle(categorie, categories)}>{categorie}</span>
            <span style={{ fontSize: 12, color: 'var(--mut)' }}>{lots.length} lot{lots.length > 1 ? 's' : ''} · {totalUnites} unités</span>
            {prixAchatMoyen && <span style={{ fontSize: 12, color: 'var(--mut)' }}>· PA moyen {fmtEur(prixAchatMoyen, 2)}</span>}
            {prixVenteMoyen && <span style={{ fontSize: 12, color: 'var(--g)' }}>· PV moyen {fmtEur(prixVenteMoyen, 2)}</span>}
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
          + Ajouter un lot
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Investi total', val: fmtEur(totalInvesti), sub: `${totalUnites} unités achetées`, color: 'var(--b)' },
          { label: 'CA généré', val: totalVente > 0 ? fmtEur(totalVente) : '—', sub: `${totalVendus} ventes`, color: 'var(--g)' },
          { label: 'Bénéfice net', val: totalVente > 0 ? (totalProfit >= 0 ? '+' : '') + fmtEur(totalProfit) : '—', sub: totalInvesti > 0 && totalVente > 0 ? fmtPct((totalProfit / totalInvesti) * 100) + ' ROI' : '', color: totalProfit >= 0 ? 'var(--g)' : 'var(--red)' },
          { label: 'Valeur stock', val: fmtEur(totalStock), sub: `${totalUnites - totalVendus} unités restantes`, color: 'var(--b)' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      {chartVentes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

          {/* Ventes par mois */}
          <div className="table-container" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Ventes & CA par mois</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartVentes} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--brd)" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'var(--mut)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--mut)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ca" name="CA €" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="profit" name="Profit €" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Unités vendues par mois */}
          <div className="table-container" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Unités vendues par mois</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartVentes}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--brd)" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'var(--mut)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--mut)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line dataKey="ventes" name="Ventes" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

      {/* Tableau lots */}
      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Lots</div>
        </div>
        <table>
          <thead>
            <tr>
              <SortTh col="date_achat">Date achat</SortTh>
              <SortTh col="prix_achat">Prix unitaire</SortTh>
              <th>Quantité</th>
              <th>Coût total</th>
              <SortTh col="plateforme_achat">Plateforme</SortTh>
              <th>Vendus</th>
              <th>Vente totale</th>
              <th>Profit</th>
              <SortTh col="statut">Statut</SortTh>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state"><div style={{ fontSize: 20 }}>📦</div><p>Aucun lot.</p></div>
              </td></tr>
            ) : sorted.map(item => {
              const nbVendus = lotNbVendus(item, ventesUnitaires)
              const qte = item.quantite_mode ? (item.quantite_total || 1) : 1
              const cout = lotAchatTotal(item)
              const vente = lotVenteTotal(item, ventesUnitaires)
              const p = lotProfit(item, ventesUnitaires)
              const days = daysSince(item.date_achat)
              const isOld = !['Vendu','Remboursé','Hold'].includes(item.statut) && days > 90
              const isExpanded = expandedLot === item.id
              const lotVentes = ventesUnitaires.filter(v => v.item_id === item.id)

              return (
                <>
                  <tr key={item.id} style={{ cursor: 'pointer' }}
                    onClick={() => { setEditItem(item); setShowModal(true) }}>
                    <td style={{ color: 'var(--mut)' }}>
                      {item.date_achat ? new Date(item.date_achat).toLocaleDateString('fr-FR') : '—'}
                      {isOld && <div style={{ fontSize: 10, color: 'var(--o)' }}>⚠ {days}j</div>}
                    </td>
                    <td style={{ color: 'var(--b)', fontWeight: 500 }}>{fmtEur(item.prix_achat)}</td>
                    <td style={{ color: 'var(--mut)' }}>× {qte}</td>
                    <td style={{ color: 'var(--b)' }}>{fmtEur(cout)}</td>
                    <td style={{ color: 'var(--mut)' }}>{item.plateforme_achat || '—'}</td>
                    <td>
                      <span style={{ color: nbVendus === qte ? 'var(--g)' : 'var(--mut)' }}>{nbVendus}/{qte}</span>
                    </td>
                    <td style={{ color: 'var(--g)' }}>{vente ? fmtEur(vente) : '—'}</td>
                    <td>
                      {p != null ? <span className={p >= 0 ? 'profit-pos' : 'profit-neg'}>{p >= 0 ? '+' : ''}{fmtEur(p)}</span> : '—'}
                    </td>
                    <td><span className={`status-badge ${statusClass(item.statut)}`}>{item.statut}</span></td>
                    <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button className="btn-ghost" title="Dupliquer" onClick={() => duplicateItem(item)}>⧉</button>
                      <button className="btn-ghost" title="Supprimer" onClick={() => handleDelete(item)} style={{ color: 'var(--red)' }}>✕</button>
                      {lotVentes.length > 0 && (
                        <button className="btn-ghost" title="Voir les ventes"
                          onClick={e => { e.stopPropagation(); setExpandedLot(isExpanded ? null : item.id) }}
                          style={{ color: 'var(--mut)', fontSize: 14 }}>
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Sous-tableau ventes */}
                  {isExpanded && (
                    <tr key={`${item.id}-ventes`}>
                      <td colSpan={10} style={{ padding: 0, background: 'var(--bg3)' }}>
                        <div style={{ padding: '10px 20px 10px 40px' }}>
                          <div style={{ fontSize: 11, color: 'var(--mut)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Transactions ({lotVentes.length})
                          </div>
                          <table style={{ width: '100%', fontSize: 12 }}>
                            <thead>
                              <tr style={{ color: 'var(--mut)' }}>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>#</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Date vente</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Prix vente</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Profit unit.</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lotVentes.map((v, idx) => {
                                const profitUnit = v.prix_vente != null ? v.prix_vente - item.prix_achat : null
                                return (
                                  <tr key={v.id}>
                                    <td style={{ padding: '5px 8px', color: 'var(--mut)' }}>#{idx + 1}</td>
                                    <td style={{ padding: '5px 8px', color: 'var(--mut)' }}>
                                      {v.date_vente ? new Date(v.date_vente).toLocaleDateString('fr-FR') : '—'}
                                    </td>
                                    <td style={{ padding: '5px 8px', color: 'var(--g)', fontWeight: 500 }}>
                                      {v.prix_vente != null ? fmtEur(v.prix_vente) : '—'}
                                    </td>
                                    <td style={{ padding: '5px 8px' }}>
                                      {profitUnit != null
                                        ? <span style={{ color: profitUnit >= 0 ? 'var(--g)' : 'var(--red)' }}>
                                            {profitUnit >= 0 ? '+' : ''}{fmtEur(profitUnit)}
                                          </span>
                                        : '—'}
                                    </td>
                                    <td style={{ padding: '5px 8px', color: 'var(--mut)' }}>{v.notes || '—'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ItemModal
          item={editItem}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null) }}
        />
      )}
    </div>
  )
}
