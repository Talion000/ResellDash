import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useItemsContext } from '../hooks/ItemsContext'
import ItemModal from '../components/ItemModal'
import { profit, rendement, fmtEur, fmtPct, daysSince, catBadgeStyle, statusClass, STATUTS } from '../lib/utils'

export default function Stock() {
  const { items, categories, loading, addItem, updateItem, deleteItem, duplicateItem } = useItemsContext()
  const [searchParams] = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState(searchParams.get('cat') || '')
  const [filterSt, setFilterSt] = useState(searchParams.get('st') || '')
  const [filterPf, setFilterPf] = useState('')
  const [filterTaille, setFilterTaille] = useState('')
  const [sortBy, setSortBy] = useState('date_achat')
  const [sortDir, setSortDir] = useState('desc')
  const [selected, setSelected] = useState([])
  const [bulkStatut, setBulkStatut] = useState('')

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

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const handleSave = async (data) => {
    if (editItem?.id) return updateItem(editItem.id, data)
    return addItem(data)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer "${item.nom}" ?`)) return
    await deleteItem(item.id)
    setSelected(s => s.filter(id => id !== item.id))
  }

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id])
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(i => i.id))

  const applyBulkStatut = async () => {
    if (!bulkStatut || selected.length === 0) return
    await Promise.all(selected.map(id => updateItem(id, { statut: bulkStatut })))
    setSelected([])
    setBulkStatut('')
  }

  const bulkDelete = async () => {
    if (!window.confirm(`Supprimer ${selected.length} item(s) ?`)) return
    await Promise.all(selected.map(id => deleteItem(id)))
    setSelected([])
  }

  const SortTh = ({ col, children }) => (
    <th onClick={() => handleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {children} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  if (loading) return <div style={{ padding: 40, color: 'var(--mut)' }}>Chargement...</div>

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px' }}>Stock</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg2)', border: '0.5px solid var(--brd2)', borderRadius: 8, padding: '7px 12px', width: 220 }}>
            <SearchIcon />
            <input style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, width: '100%' }}
              placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowModal(true) }}>+ Ajouter</button>
        </div>
      </div>

      {/* Stats rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'En stock', value: items.filter(i => i.statut === 'En stock').length, color: 'var(--g)' },
          { label: 'Réservé / Livraison / Retour', value: items.filter(i => ['Réservé','En livraison','En retour'].includes(i.statut)).length, color: 'var(--o)' },
          { label: 'Valeur totale', value: fmtEur(items.filter(i => i.statut !== 'Vendu').reduce((s,i) => s + (i.prix_achat||0), 0)), color: 'var(--b)' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 20 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 16px', background: 'var(--bg2)', border: '0.5px solid var(--brd2)', borderRadius: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--mut)' }}>{selected.length} item(s) sélectionné(s)</span>
          <select className="form-input" style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
            value={bulkStatut} onChange={e => setBulkStatut(e.target.value)}>
            <option value="">Changer le statut...</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={applyBulkStatut} disabled={!bulkStatut}>Appliquer</button>
          <button className="btn-ghost" style={{ color: 'var(--red)', marginLeft: 'auto' }} onClick={bulkDelete}>Supprimer la sélection</button>
          <button className="btn-ghost" onClick={() => setSelected([])}>Annuler</button>
        </div>
      )}

      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Tous les items</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { val: filterCat, set: setFilterCat, opts: categories.map(c => c.name), placeholder: 'Catégorie' },
              { val: filterSt, set: setFilterSt, opts: STATUTS, placeholder: 'Tous statuts' },
              { val: filterPf, set: setFilterPf, opts: plateformes, placeholder: 'Plateforme' },
              { val: filterTaille, set: setFilterTaille, opts: tailles, placeholder: 'Taille/Réf' },
            ].map((f, i) => (
              <select key={i} className="form-input" style={{ padding: '5px 10px', fontSize: 11, borderRadius: 20, width: 'auto' }}
                value={f.val} onChange={e => f.set(e.target.value)}>
                <option value="">{f.placeholder}</option>
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            {(filterCat || filterSt || filterPf || filterTaille) && (
              <button className="btn-ghost" onClick={() => { setFilterCat(''); setFilterSt(''); setFilterPf(''); setFilterTaille('') }}>Réinitialiser</button>
            )}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll} style={{ cursor: 'pointer' }} />
              </th>
              <th style={{ width: 60 }}>Photo</th>
              <SortTh col="nom">Item</SortTh>
              <SortTh col="categorie">Catégorie</SortTh>
              <th>Taille/Réf</th>
              <SortTh col="prix_achat">Achat</SortTh>
              <SortTh col="prix_vente">Vente</SortTh>
              <th>Profit</th>
              <th>ROI</th>
              <SortTh col="date_achat">Date achat</SortTh>
              <SortTh col="statut">Statut</SortTh>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={12}>
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
              const isSelected = selected.includes(item.id)
              const badgeStyle = catBadgeStyle(item.categorie, categories)
              return (
                <tr key={item.id} style={{ background: isSelected ? 'rgba(34,197,94,0.04)' : undefined, cursor: 'pointer' }} onClick={() => { setEditItem(item); setShowModal(true) }}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td>
                    {item.image_url
                      ? <img src={item.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '0.5px solid var(--brd2)' }} />
                      : <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
                    }
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nom}</div>
                    {item.quantite_mode && <div style={{ fontSize: 10, color: 'var(--b)', marginTop: 2 }}>📦 Lot × {item.quantite_total}</div>}
                    {isOld && <div style={{ fontSize: 10, color: 'var(--o)' }}>⚠ {days}j en stock</div>}
                    {item.notes && <div style={{ fontSize: 10, color: 'var(--mut)' }}>{item.notes}</div>}
                  </td>
                  <td>
                    <span className="badge" style={badgeStyle}>{item.categorie}</span>
                  </td>
                  <td style={{ color: 'var(--mut)' }}>{item.taille_ref || '—'}</td>
                  <td style={{ color: 'var(--b)' }}>{fmtEur(item.prix_achat)}</td>
                  <td style={{ color: item.prix_vente ? 'var(--g)' : 'var(--mut2)' }}>{item.prix_vente ? fmtEur(item.prix_vente) : '—'}</td>
                  <td>{p != null ? <span className={p >= 0 ? 'profit-pos' : 'profit-neg'}>{p >= 0 ? '+' : ''}{fmtEur(p)}</span> : <span style={{ color: 'var(--mut2)' }}>—</span>}</td>
                  <td>{r != null ? <span className={r >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(r)}</span> : <span style={{ color: 'var(--mut2)' }}>—</span>}</td>
                  <td style={{ color: 'var(--mut)' }}>{item.date_achat ? new Date(item.date_achat).toLocaleDateString('fr-FR') : '—'}</td>
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
