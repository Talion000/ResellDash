import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useItemsContext } from '../hooks/ItemsContext'
import ItemModal from '../components/ItemModal'
import { profit, rendement, fmtEur, fmtPct, daysSince, catBadgeClass, statusClass } from '../lib/utils'

export default function Stock() {
  const { items, categories, addItem, updateItem, deleteItem, duplicateItem } = useItemsContext()
  const [searchParams] = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState(searchParams.get('cat') || '')
  const [filterSt, setFilterSt] = useState('En stock')
  const [filterPf, setFilterPf] = useState('')
  const [filterTaille, setFilterTaille] = useState('')
  const [sortBy, setSortBy] = useState('date_achat')
  const [sortDir, setSortDir] = useState('desc')

  const plateformes = useMemo(() => [...new Set(items.map(i => i.plateforme_achat).filter(Boolean))], [items])
  const tailles = useMemo(() => [...new Set(items.map(i => i.taille_ref).filter(Boolean))].sort(), [items])

  const filtered = useMemo(() => {
    let list = items.filter(i => {
      if (search && !i.nom.toLowerCase().includes(search.toLowerCase()) && !(i.taille_ref || '').toLowerCase().includes(search.toLowerCase())) return false
      if (filterCat && i.categorie !== filterCat) return false
      if (filterSt && i.statut !== filterSt) return false
      if (filterPf && i.plateforme_achat !== filterPf) return false
      if (filterTaille && i.taille_ref !== filterTaille) return false
      return true
    })
    list = [...list].sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy]
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string') va = va.toLowerCase(), vb = (vb || '').toLowerCase()
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
    return list
  }, [items, search, filterCat, filterSt, filterPf, filterTaille, sortBy, sortDir])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortTh = ({ col, label }) => (
    <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  const handleSave = async (data) => {
    if (editItem?.id) return updateItem(editItem.id, data)
    return addItem(data)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer "${item.nom}" ?`)) return
    await deleteItem(item.id)
  }

  const stockCount = items.filter(i => i.statut === 'En stock').length
  const totalValeur = items.filter(i => i.statut !== 'Vendu').reduce((s, i) => s + (i.prix_achat || 0), 0)
  const alertCount = items.filter(i => i.statut !== 'Vendu' && daysSince(i.date_achat) > 90).length

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px' }}>Stock</div>
          <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 3 }}>
            {stockCount} items · Valeur : {fmtEur(totalValeur)}
            {alertCount > 0 && <span style={{ color: 'var(--o)', marginLeft: 8 }}>· ⚠ {alertCount} item{alertCount > 1 ? 's' : ''} +90j</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg2)', border: '0.5px solid var(--brd2)', borderRadius: 8, padding: '7px 12px', width: 200 }}>
            <SearchIcon />
            <input style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, width: '100%' }}
              placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowModal(true) }}>+ Ajouter</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { val: filterCat, set: setFilterCat, opts: categories.map(c => c.name), placeholder: 'Toutes catégories' },
          { val: filterSt, set: setFilterSt, opts: ['En stock', 'Vendu', 'Réservé', 'En livraison'], placeholder: 'Tous statuts' },
          { val: filterPf, set: setFilterPf, opts: plateformes, placeholder: 'Toutes plateformes' },
          { val: filterTaille, set: setFilterTaille, opts: tailles, placeholder: 'Toutes tailles' },
        ].map((f, i) => (
          <select key={i} className="form-input" style={{ padding: '5px 10px', fontSize: 11, borderRadius: 20, width: 'auto' }}
            value={f.val} onChange={e => f.set(e.target.value)}>
            <option value="">{f.placeholder}</option>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {(filterCat || filterSt !== 'En stock' || filterPf || filterTaille || search) && (
          <button className="btn-ghost" onClick={() => { setFilterCat(''); setFilterSt('En stock'); setFilterPf(''); setFilterTaille(''); setSearch('') }}>
            Réinitialiser
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <SortTh col="nom" label="Item" />
              <th>Catégorie</th>
              <th>Taille/Réf</th>
              <SortTh col="prix_achat" label="Achat" />
              <SortTh col="prix_vente" label="Vente" />
              <SortTh col="prix_achat" label="Profit" />
              <th>ROI</th>
              <SortTh col="date_achat" label="Date achat" />
              <th>Plateforme</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11}>
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
              return (
                <tr key={item.id} onClick={() => { setEditItem(item); setShowModal(true) }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.nom}</div>
                    {isOld && <div style={{ fontSize: 10, color: 'var(--o)' }}>⚠ {days}j en stock</div>}
                    {item.notes && <div style={{ fontSize: 10, color: 'var(--mut)' }}>{item.notes}</div>}
                  </td>
                  <td><span className={`badge ${catBadgeClass(item.categorie)}`}>{item.categorie}</span></td>
                  <td style={{ color: 'var(--mut)' }}>{item.taille_ref || '—'}</td>
                  <td>{fmtEur(item.prix_achat)}</td>
                  <td>{item.prix_vente ? fmtEur(item.prix_vente) : <span style={{ color: 'var(--mut2)' }}>—</span>}</td>
                  <td>{p != null ? <span className={p >= 0 ? 'profit-pos' : 'profit-neg'}>{p >= 0 ? '+' : ''}{fmtEur(p)}</span> : <span style={{ color: 'var(--mut2)' }}>—</span>}</td>
                  <td>{r != null ? <span className={r >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(r)}</span> : <span style={{ color: 'var(--mut2)' }}>—</span>}</td>
                  <td style={{ color: 'var(--mut)' }}>{item.date_achat ? new Date(item.date_achat).toLocaleDateString('fr-FR') : '—'}</td>
                  <td style={{ color: 'var(--mut)' }}>{item.plateforme_achat || '—'}</td>
                  <td><span className={`status-badge ${statusClass(item.statut)}`}>{item.statut}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn-ghost" title="Dupliquer" onClick={() => duplicateItem(item)} style={{ marginRight: 4 }}>⧉</button>
                    <button className="btn-ghost" onClick={() => handleDelete(item)} style={{ color: 'var(--red)' }}>✕</button>
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
