import { useState, useMemo } from 'react'
import { useItemsContext } from '../hooks/ItemsContext'
import PreuveModal from '../components/PreuveModal'
import { catBadgeStyle, fmtEur } from '../lib/utils'

const EXCLUDED = ['Remboursé', 'En retour']

export default function Preuves() {
  const { items, categories, ventesUnitaires, getPreuve } = useItemsContext()
  const [search, setSearch] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [selected, setSelected] = useState(null) // { item, venteUnitaireId, venteLabel }

  // Construit la liste de toutes les ventes (lots unitaires + items simples)
  const rows = useMemo(() => {
    const list = []
    items.forEach(item => {
      if (EXCLUDED.includes(item.statut)) return
      if (item.quantite_mode) {
        ventesUnitaires.filter(v => v.item_id === item.id).forEach((v, idx) => {
          list.push({
            key: v.id,
            item,
            venteUnitaireId: v.id,
            venteLabel: `Unité #${idx + 1}`,
            nom: item.nom,
            categorie: item.categorie,
            prixVente: v.prix_vente,
            dateVente: v.date_vente,
          })
        })
      } else if (item.statut === 'Vendu' && item.prix_vente != null) {
        list.push({
          key: item.id,
          item,
          venteUnitaireId: null,
          venteLabel: null,
          nom: item.nom,
          categorie: item.categorie,
          prixVente: item.prix_vente,
          dateVente: item.date_vente,
        })
      }
    })
    return list.sort((a, b) => (b.dateVente || '').localeCompare(a.dateVente || ''))
  }, [items, ventesUnitaires])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const preuve = getPreuve(r.item.id, r.venteUnitaireId)
      if (onlyMissing && preuve && (preuve.photos?.length > 0)) return false
      if (!search.trim()) return true
      const s = search.trim().toLowerCase()
      return r.nom.toLowerCase().includes(s) || (preuve?.acheteur || '').toLowerCase().includes(s)
    })
  }, [rows, search, onlyMissing, getPreuve])

  const totalAvecPreuve = useMemo(() => rows.filter(r => {
    const p = getPreuve(r.item.id, r.venteUnitaireId)
    return p && p.photos?.length > 0
  }).length, [rows, getPreuve])

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px', marginBottom: 4 }}>Preuves de vente</div>
          <div style={{ fontSize: 12, color: 'var(--mut)' }}>{totalAvecPreuve} / {rows.length} ventes documentées</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="form-input" placeholder="Rechercher (item ou acheteur)..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
          <button className="btn-secondary" onClick={() => setOnlyMissing(m => !m)}
            style={{ background: onlyMissing ? 'rgba(239,68,68,0.1)' : undefined, color: onlyMissing ? 'var(--red)' : undefined }}>
            {onlyMissing ? '✓ ' : ''}Sans preuve uniquement
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Historique des ventes</div>
          <div style={{ fontSize: 12, color: 'var(--mut)' }}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</div>
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Item</th><th>Catégorie</th><th>Vente</th><th>Date</th>
                <th>Acheteur</th><th>Preuve</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div style={{ fontSize: 20 }}>📸</div>
                    <p>{rows.length === 0 ? 'Aucune vente enregistrée pour le moment.' : 'Aucun résultat.'}</p>
                  </div>
                </td></tr>
              ) : filtered.map(row => {
                const preuve = getPreuve(row.item.id, row.venteUnitaireId)
                const nbPhotos = preuve?.photos?.length || 0
                return (
                  <tr key={row.key} style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(row)}>
                    <td>
                      <div style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.nom}</div>
                      {row.venteLabel && <div style={{ fontSize: 10, color: 'var(--b)' }}>{row.venteLabel}</div>}
                    </td>
                    <td><span className="badge" style={catBadgeStyle(row.categorie, categories)}>{row.categorie}</span></td>
                    <td style={{ color: 'var(--g)', whiteSpace: 'nowrap' }}>{fmtEur(row.prixVente)}</td>
                    <td style={{ color: 'var(--mut)', whiteSpace: 'nowrap' }}>{row.dateVente ? new Date(row.dateVente).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ color: 'var(--mut)' }}>{preuve?.acheteur || '—'}</td>
                    <td>
                      {nbPhotos > 0
                        ? <span style={{ fontSize: 11, color: 'var(--g)', background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '3px 10px' }}>✓ {nbPhotos} photo{nbPhotos > 1 ? 's' : ''}</span>
                        : <span style={{ fontSize: 11, color: 'var(--mut)', background: 'var(--bg3)', border: '0.5px solid var(--brd2)', borderRadius: 20, padding: '3px 10px' }}>Sans preuve</span>
                      }
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn-ghost" onClick={() => setSelected(row)}>
                        {nbPhotos > 0 ? 'Voir' : '+ Ajouter'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <PreuveModal
          item={selected.item}
          venteUnitaireId={selected.venteUnitaireId}
          venteLabel={selected.venteLabel}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
