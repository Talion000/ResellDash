import { useState } from 'react'
import { fmtEur, lotAchatTotal, lotVenteTotal, lotProfit, lotNbVendus, lotValeurStock } from '../lib/utils'
import { useItemsContext } from '../hooks/ItemsContext'
import ItemModal from './ItemModal'

const STATUT_COLORS = {
  'Vendu':     { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  'Hold':      { bg: 'rgba(251,191,36,0.12)', color: '#f59e0b' },
  'Remboursé': { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  'En stock':  { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  'Acheté':    { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
}

function statusBadge(statut) {
  const s = STATUT_COLORS[statut] || { bg: 'rgba(136,136,136,0.12)', color: '#888' }
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6, background: s.bg, color: s.color }}>
      {statut}
    </span>
  )
}

export default function FicheModal({ nomArticle, lots, categories, onClose }) {
  const { ventesUnitaires, addItem, updateItem, deleteItem } = useItemsContext()
  const [editLot, setEditLot] = useState(null) // item en cours d'édition
  const [showAddLot, setShowAddLot] = useState(false)
  const [expandedLot, setExpandedLot] = useState(null)

  // KPIs globaux sur tous les lots
  const totalInvesti = lots.reduce((s, i) => s + lotAchatTotal(i), 0)
  const totalVente = lots.reduce((s, i) => {
    const v = lotVenteTotal(i, ventesUnitaires)
    return s + (v || 0)
  }, 0)
  const totalProfit = lots.reduce((s, i) => {
    const p = lotProfit(i, ventesUnitaires)
    return s + (p || 0)
  }, 0)
  const totalUnites = lots.reduce((s, i) => s + (i.quantite_mode ? (i.quantite_total || 1) : 1), 0)
  const totalVendus = lots.reduce((s, i) => s + lotNbVendus(i, ventesUnitaires), 0)
  const totalStock = lots.reduce((s, i) => s + lotValeurStock(i, ventesUnitaires), 0)

  const handleSaveLot = async (data) => {
    if (editLot?.id) {
      const r = await updateItem(editLot.id, data)
      setEditLot(null)
      return r
    }
    const r = await addItem({ ...data, nom: nomArticle.toUpperCase() })
    setShowAddLot(false)
    return r
  }

  const handleDeleteLot = async (item) => {
    if (!window.confirm(`Supprimer ce lot (${item.quantite_mode ? item.quantite_total + ' × ' : ''}${fmtEur(item.prix_achat)}) ?`)) return
    await deleteItem(item.id)
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500 }}>{nomArticle}</div>
            <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 3 }}>
              {lots.length} lot{lots.length > 1 ? 's' : ''} · {totalUnites} unités
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
          {[
            { label: 'Investi', val: fmtEur(totalInvesti), color: 'var(--b)' },
            { label: 'CA généré', val: totalVente > 0 ? fmtEur(totalVente) : '—', color: 'var(--g)' },
            { label: 'Bénéfice', val: totalVente > 0 ? (totalProfit >= 0 ? '+' : '') + fmtEur(totalProfit) : '—', color: totalProfit >= 0 ? 'var(--g)' : 'var(--red)' },
            { label: `${totalVendus}V · ${totalUnites - totalVendus}R`, val: fmtEur(totalStock) + ' stock', color: 'var(--text)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--mut)', marginBottom: 3 }}>{k.label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Bouton ajouter lot */}
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}
          onClick={() => { setShowAddLot(true); setEditLot(null) }}>
          + Ajouter un lot
        </button>

        {/* Liste des lots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lots.map(item => {
            const ventes = ventesUnitaires.filter(v => v.item_id === item.id)
            const nbVendus = lotNbVendus(item, ventesUnitaires)
            const qte = item.quantite_mode ? (item.quantite_total || 1) : 1
            const restants = Math.max(0, qte - nbVendus)
            const cout = lotAchatTotal(item)
            const isExpanded = expandedLot === item.id

            return (
              <div key={item.id} style={{ border: '0.5px solid var(--brd2)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Header lot */}
                <div style={{ background: 'var(--bg3)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setExpandedLot(isExpanded ? null : item.id)}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                      {item.quantite_mode ? `${qte} × ${fmtEur(item.prix_achat)}` : fmtEur(item.prix_achat)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--mut)', marginLeft: 10 }}>
                      {item.date_achat ? new Date(item.date_achat).toLocaleDateString('fr-FR') : ''}
                      {item.plateforme_achat ? ` · ${item.plateforme_achat}` : ''}
                    </span>
                    <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                      {statusBadge(item.statut)}
                      {item.quantite_mode && (
                        <span style={{ fontSize: 11, color: 'var(--mut)' }}>
                          {nbVendus} vendu{nbVendus > 1 ? 's' : ''} · {restants} restant{restants > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--mut)' }}>{fmtEur(cout)}</span>
                    <button className="btn-ghost" style={{ fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); setEditLot(item); setShowAddLot(false) }}>✎</button>
                    <button className="btn-ghost" style={{ fontSize: 11, color: 'var(--red)' }}
                      onClick={e => { e.stopPropagation(); handleDeleteLot(item) }}>✕</button>
                    <span style={{ fontSize: 12, color: 'var(--mut)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Détail ventes — visible si expanded */}
                {isExpanded && (
                  <div style={{ padding: '10px 14px' }}>
                    {ventes.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--mut)', textAlign: 'center', padding: '8px 0' }}>
                        Aucune vente — ouvre le lot pour en ajouter
                      </div>
                    ) : (
                      ventes.map((v, idx) => (
                        <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < ventes.length - 1 ? '0.5px solid var(--brd)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {statusBadge(v.statut || 'Vendu')}
                            {v.prix_vente && <span style={{ fontSize: 13, color: 'var(--g)', fontWeight: 500 }}>→ {fmtEur(v.prix_vente)}</span>}
                            {v.date_vente && <span style={{ fontSize: 11, color: 'var(--mut)' }}>{new Date(v.date_vente).toLocaleDateString('fr-FR')}</span>}
                            {v.notes && <span style={{ fontSize: 11, color: 'var(--mut)' }}>{v.notes}</span>}
                          </div>
                          {v.prix_vente && (
                            <span style={{ fontSize: 11, color: v.prix_vente - item.prix_achat >= 0 ? 'var(--g)' : 'var(--red)' }}>
                              {v.prix_vente - item.prix_achat >= 0 ? '+' : ''}{fmtEur(v.prix_vente - item.prix_achat)}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                    {/* Lien pour ouvrir le lot complet */}
                    <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 12 }}
                      onClick={() => setEditLot(item)}>
                      Ouvrir le lot (ajouter ventes / modifier)
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>Fermer</button>
        </div>
      </div>

      {/* ItemModal pour éditer/ajouter un lot */}
      {(editLot || showAddLot) && (
        <ItemModal
          item={editLot}
          categories={categories}
          onSave={handleSaveLot}
          onClose={() => { setEditLot(null); setShowAddLot(false) }}
        />
      )}
    </div>
  )
}
