import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useItemsContext } from '../hooks/ItemsContext'
import ItemModal from '../components/ItemModal'
import { profit, rendement, fmtEur, fmtPct, daysSince, catBadgeStyle, catColor, statusClass, lotAchatTotal, lotVenteTotal, lotProfit, lotValeurStock, lotNbVendus } from '../lib/utils'

export default function ArticlePage() {
  const { nom } = useParams()
  const nomDecode = decodeURIComponent(nom)
  const navigate = useNavigate()
  const { items, categories, ventesUnitaires, loading, addItem, updateItem, deleteItem, duplicateItem } = useItemsContext()

  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [sortBy, setSortBy] = useState('date_achat')
  const [sortDir, setSortDir] = useState('desc')

  // Tous les lots de cet article
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

  // KPIs globaux
  const totalInvesti = useMemo(() => lots.reduce((s, i) => s + lotAchatTotal(i), 0), [lots])
  const totalVente = useMemo(() => lots.reduce((s, i) => s + (lotVenteTotal(i, ventesUnitaires) || 0), 0), [lots, ventesUnitaires])
  const totalProfit = useMemo(() => lots.reduce((s, i) => s + (lotProfit(i, ventesUnitaires) || 0), 0), [lots, ventesUnitaires])
  const totalUnites = useMemo(() => lots.reduce((s, i) => s + (i.quantite_mode ? (i.quantite_total || 1) : 1), 0), [lots])
  const totalVendus = useMemo(() => lots.reduce((s, i) => s + lotNbVendus(i, ventesUnitaires), 0), [lots, ventesUnitaires])
  const totalStock = useMemo(() => lots.reduce((s, i) => s + lotValeurStock(i, ventesUnitaires), 0), [lots, ventesUnitaires])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const handleSave = async (data) => {
    if (editItem?.id) return updateItem(editItem.id, { ...data, nom: nomDecode.toUpperCase() })
    return addItem({ ...data, nom: nomDecode.toUpperCase() })
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer ce lot ?`)) return
    await deleteItem(item.id)
  }

  const categorie = lots[0]?.categorie || ''
  const color = catColor(categorie, categories)

  const SortTh = ({ col, children }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(col)}>
      {children} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
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
    <div style={{ padding: '20px 28px' }}>

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
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
          + Ajouter un lot
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Investi total</div>
          <div className="kpi-value" style={{ color: 'var(--b)' }}>{fmtEur(totalInvesti)}</div>
          <div className="kpi-sub">{totalUnites} unités achetées</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">CA généré</div>
          <div className="kpi-value" style={{ color: 'var(--g)' }}>{totalVente > 0 ? fmtEur(totalVente) : '—'}</div>
          <div className="kpi-sub">{totalVendus} ventes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bénéfice net</div>
          <div className="kpi-value" style={{ color: totalProfit >= 0 ? 'var(--g)' : 'var(--red)' }}>
            {totalVente > 0 ? (totalProfit >= 0 ? '+' : '') + fmtEur(totalProfit) : '—'}
          </div>
          <div className="kpi-sub">
            {totalInvesti > 0 && totalVente > 0 ? fmtPct((totalProfit / totalInvesti) * 100) + ' ROI' : ''}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Valeur stock</div>
          <div className="kpi-value" style={{ color: 'var(--b)' }}>{fmtEur(totalStock)}</div>
          <div className="kpi-sub">{totalUnites - totalVendus} unités restantes</div>
        </div>
      </div>

      {/* Tableau */}
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
                <div className="empty-state">
                  <div style={{ fontSize: 20 }}>📦</div>
                  <p>Aucun lot.</p>
                </div>
              </td></tr>
            ) : sorted.map(item => {
              const nbVendus = lotNbVendus(item, ventesUnitaires)
              const qte = item.quantite_mode ? (item.quantite_total || 1) : 1
              const cout = lotAchatTotal(item)
              const vente = lotVenteTotal(item, ventesUnitaires)
              const p = lotProfit(item, ventesUnitaires)
              const days = daysSince(item.date_achat)
              const isOld = !['Vendu','Remboursé','Hold'].includes(item.statut) && days > 90

              return (
                <tr key={item.id} style={{ cursor: 'pointer' }}
                  onClick={() => { setEditItem(item); setShowModal(true) }}>
                  <td style={{ color: 'var(--mut)' }}>
                    {item.date_achat ? new Date(item.date_achat).toLocaleDateString('fr-FR') : '—'}
                    {isOld && <div style={{ fontSize: 10, color: 'var(--o)' }}>⚠ {days}j</div>}
                  </td>
                  <td style={{ color: 'var(--b)', fontWeight: 500 }}>{fmtEur(item.prix_achat)}</td>
                  <td style={{ color: 'var(--mut)' }}>
                    {item.quantite_mode ? `× ${qte}` : '× 1'}
                  </td>
                  <td style={{ color: 'var(--b)' }}>{fmtEur(cout)}</td>
                  <td style={{ color: 'var(--mut)' }}>{item.plateforme_achat || '—'}</td>
                  <td>
                    {item.quantite_mode
                      ? <span style={{ color: nbVendus === qte ? 'var(--g)' : 'var(--mut)' }}>{nbVendus}/{qte}</span>
                      : <span style={{ color: item.statut === 'Vendu' ? 'var(--g)' : 'var(--mut)' }}>{item.statut === 'Vendu' ? '1/1' : '0/1'}</span>
                    }
                  </td>
                  <td style={{ color: 'var(--g)' }}>{vente ? fmtEur(vente) : '—'}</td>
                  <td>
                    {p != null
                      ? <span className={p >= 0 ? 'profit-pos' : 'profit-neg'}>{p >= 0 ? '+' : ''}{fmtEur(p)}</span>
                      : '—'}
                  </td>
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
