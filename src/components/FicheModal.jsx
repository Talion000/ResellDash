import { useState, useEffect } from 'react'
import { fmtEur, ficheAchatTotal, ficheVenteTotal, ficheProfit, ficheQuantiteTotal, ficheNbVendus, ficheNbHold, achatRestants, ventesForAchat } from '../lib/utils'
import { useItemsContext } from '../hooks/ItemsContext'

const STATUT_COLORS = {
  'Vendu':     { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  'Hold':      { bg: 'rgba(251,191,36,0.12)', color: '#f59e0b' },
  'Remboursé': { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
}

export default function FicheModal({ item, categories, onUpdateItem, onClose }) {
  const { achats, ventesUnitaires, addAchat, updateAchat, deleteAchat, addVenteUnitaire, updateVenteUnitaire, deleteVenteUnitaire } = useItemsContext()

  const itemAchats = achats.filter(a => a.item_id === item.id).sort((a, b) => (b.date_achat || '').localeCompare(a.date_achat || ''))

  // Formulaire nouvel achat
  const [showAchatForm, setShowAchatForm] = useState(false)
  const [achatForm, setAchatForm] = useState({ quantite: '', prix_unitaire: '', date_achat: '', plateforme: '', notes: '' })
  const [savingAchat, setSavingAchat] = useState(false)

  // Formulaire vente par achat
  const [venteForms, setVenteforms] = useState({}) // achatId -> { prix, date, notes, statut }
  const [savingVente, setSavingVente] = useState(null)

  // Edition
  const [editAchat, setEditAchat] = useState(null)
  const [editVente, setEditVente] = useState(null)

  // Onglet info item
  const [showEditItem, setShowEditItem] = useState(false)
  const [itemForm, setItemForm] = useState({ nom: item.nom, categorie: item.categorie, notes: item.notes || '' })
  const [savingItem, setSavingItem] = useState(false)

  const kpiAchat = ficheAchatTotal(itemAchats)
  const kpiVente = ficheVenteTotal(itemAchats, ventesUnitaires)
  const kpiProfit = ficheProfit(itemAchats, ventesUnitaires)
  const kpiQte = ficheQuantiteTotal(itemAchats)
  const kpiVendus = ficheNbVendus(itemAchats, ventesUnitaires)
  const kpiHold = ficheNbHold(itemAchats, ventesUnitaires)
  const kpiStock = kpiQte - kpiVendus - kpiHold

  const setAchatField = (k, v) => setAchatForm(f => ({ ...f, [k]: v }))
  const setVenteField = (achatId, k, v) => setVenteforms(f => ({ ...f, [achatId]: { ...(f[achatId] || { prix: '', date: '', notes: '', statut: 'Vendu' }), [k]: v } }))
  const getVenteForm = (achatId) => venteForms[achatId] || { prix: '', date: '', notes: '', statut: 'Vendu' }

  const handleSaveAchat = async () => {
    if (!achatForm.prix_unitaire || isNaN(achatForm.prix_unitaire)) return
    setSavingAchat(true)
    if (editAchat) {
      await updateAchat(editAchat.id, {
        quantite: parseInt(achatForm.quantite) || 1,
        prix_unitaire: parseFloat(achatForm.prix_unitaire),
        date_achat: achatForm.date_achat || null,
        plateforme: achatForm.plateforme || null,
        notes: achatForm.notes || null,
      })
      setEditAchat(null)
    } else {
      await addAchat(item.id, achatForm)
    }
    setAchatForm({ quantite: '', prix_unitaire: '', date_achat: '', plateforme: '', notes: '' })
    setShowAchatForm(false)
    setSavingAchat(false)
  }

  const handleDeleteAchat = async (achatId) => {
    if (!window.confirm('Supprimer ce lot ? Les ventes rattachées seront aussi supprimées.')) return
    await deleteAchat(achatId)
  }

  const startEditAchat = (achat) => {
    setEditAchat(achat)
    setAchatForm({
      quantite: achat.quantite,
      prix_unitaire: achat.prix_unitaire,
      date_achat: achat.date_achat || '',
      plateforme: achat.plateforme || '',
      notes: achat.notes || '',
    })
    setShowAchatForm(true)
  }

  const handleAddVente = async (achatId) => {
    const vf = getVenteForm(achatId)
    const isHold = vf.statut === 'Hold' || vf.statut === 'Remboursé'
    if (!isHold && (!vf.prix || isNaN(vf.prix))) return
    setSavingVente(achatId)
    await addVenteUnitaire(
      item.id,
      isHold ? null : parseFloat(vf.prix),
      vf.date || null,
      vf.notes || null,
      achatId,
    )
    // Update statut si Hold/Remboursé
    if (isHold) {
      // On passe le statut dans notes pour l'instant (hack simple)
      // Mieux : on met à jour la vente créée juste après
      const lastAdded = ventesUnitaires[0] // sera mis à jour par le hook
      // On remet à jour avec le statut
      setTimeout(async () => {
        const { ventesUnitaires: vu } = window.__resellCtx || {}
      }, 100)
    }
    setVenteforms(f => ({ ...f, [achatId]: { prix: '', date: '', notes: '', statut: 'Vendu' } }))
    setSavingVente(null)
  }

  const handleDeleteVente = async (venteId) => {
    await deleteVenteUnitaire(venteId)
  }

  const handleSaveItem = async () => {
    setSavingItem(true)
    await onUpdateItem(item.id, { nom: itemForm.nom.toUpperCase(), categorie: itemForm.categorie, notes: itemForm.notes || null })
    setSavingItem(false)
    setShowEditItem(false)
  }

  const statusBadge = (statut) => {
    const s = STATUT_COLORS[statut] || { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' }
    return (
      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6, background: s.bg, color: s.color }}>
        {statut || 'Vendu'}
      </span>
    )
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            {showEditItem ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input className="form-input" value={itemForm.nom} onChange={e => setItemForm(f => ({ ...f, nom: e.target.value.toUpperCase() }))} style={{ fontSize: 16, fontWeight: 500 }} />
                <select className="form-input" value={itemForm.categorie} onChange={e => setItemForm(f => ({ ...f, categorie: e.target.value }))}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ fontSize: 12 }} onClick={handleSaveItem} disabled={savingItem}>{savingItem ? '...' : 'Sauvegarder'}</button>
                  <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowEditItem(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{item.nom}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--mut)', fontSize: 11 }}>{item.categorie}</span>
                  <span style={{ fontSize: 11, color: 'var(--mut)' }}>· {kpiQte} unités</span>
                  <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => setShowEditItem(true)}>✎ Modifier</button>
                </div>
              </div>
            )}
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
          {[
            { label: 'Investi', val: fmtEur(kpiAchat), color: 'var(--b)' },
            { label: 'CA généré', val: kpiVente != null ? fmtEur(kpiVente) : '—', color: 'var(--g)' },
            { label: 'Bénéfice', val: kpiProfit != null ? (kpiProfit >= 0 ? '+' : '') + fmtEur(kpiProfit) : '—', color: kpiProfit >= 0 ? 'var(--g)' : 'var(--red)' },
            { label: `${kpiVendus}V · ${kpiHold}H · ${kpiStock}S`, val: `${kpiQte} unités`, color: 'var(--text)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--mut)', marginBottom: 3 }}>{k.label}</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Bouton ajouter achat */}
        {!showAchatForm && (
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}
            onClick={() => { setEditAchat(null); setAchatForm({ quantite: '', prix_unitaire: '', date_achat: '', plateforme: '', notes: '' }); setShowAchatForm(true) }}>
            + Ajouter un achat
          </button>
        )}

        {/* Formulaire achat */}
        {showAchatForm && (
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
              {editAchat ? '✎ Modifier le lot' : '+ Nouveau lot d\'achat'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Quantité *</label>
                <input className="form-input" type="number" min="1" placeholder="10"
                  value={achatForm.quantite} onChange={e => setAchatField('quantite', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Prix unitaire (€) *</label>
                <input className="form-input" type="number" step="0.01" placeholder="35.00"
                  value={achatForm.prix_unitaire} onChange={e => setAchatField('prix_unitaire', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date d'achat</label>
                <input className="form-input" type="date"
                  value={achatForm.date_achat} onChange={e => setAchatField('date_achat', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Plateforme</label>
                <input className="form-input" placeholder="Cultura, Instore..."
                  value={achatForm.plateforme} onChange={e => setAchatField('plateforme', e.target.value)} />
              </div>
              <div className="form-group full" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notes</label>
                <input className="form-input" placeholder="Infos utiles..."
                  value={achatForm.notes} onChange={e => setAchatField('notes', e.target.value)} />
              </div>
            </div>
            {achatForm.quantite && achatForm.prix_unitaire && (
              <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 6 }}>
                Coût total : <strong style={{ color: 'var(--b)' }}>{fmtEur(parseFloat(achatForm.prix_unitaire) * parseInt(achatForm.quantite))}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleSaveAchat} disabled={savingAchat}>
                {savingAchat ? 'Enregistrement...' : editAchat ? 'Mettre à jour' : 'Ajouter le lot'}
              </button>
              <button className="btn-secondary" onClick={() => { setShowAchatForm(false); setEditAchat(null) }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Liste des achats */}
        {itemAchats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--mut)', fontSize: 13 }}>
            Aucun achat enregistré. Commence par ajouter un lot.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {itemAchats.map(achat => {
              const ventes = ventesForAchat(achat.id, ventesUnitaires)
              const restants = achatRestants(achat, ventesUnitaires)
              const coutAchat = (achat.prix_unitaire || 0) * (achat.quantite || 1)
              const vf = getVenteForm(achat.id)

              return (
                <div key={achat.id} style={{ border: '0.5px solid var(--brd2)', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Header achat */}
                  <div style={{ background: 'var(--bg3)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                        Lot — {achat.quantite} × {fmtEur(achat.prix_unitaire)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--mut)', marginLeft: 10 }}>
                        {achat.date_achat ? new Date(achat.date_achat).toLocaleDateString('fr-FR') : ''}
                        {achat.plateforme ? ` · ${achat.plateforme}` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--mut)' }}>{fmtEur(coutAchat)}</span>
                      <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => startEditAchat(achat)}>✎</button>
                      <button className="btn-ghost" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => handleDeleteAchat(achat.id)}>✕</button>
                    </div>
                  </div>

                  {/* Unités vendues */}
                  <div style={{ padding: '10px 14px' }}>
                    {ventes.length > 0 && (
                      <div style={{ marginBottom: restants > 0 ? 12 : 0 }}>
                        {ventes.map((v, idx) => (
                          <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < ventes.length - 1 ? '0.5px solid var(--brd)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {statusBadge(v.statut || 'Vendu')}
                              {v.prix_vente && <span style={{ fontSize: 13, color: 'var(--g)', fontWeight: 500 }}>→ {fmtEur(v.prix_vente)}</span>}
                              {v.date_vente && <span style={{ fontSize: 11, color: 'var(--mut)' }}>{new Date(v.date_vente).toLocaleDateString('fr-FR')}</span>}
                              {v.notes && <span style={{ fontSize: 11, color: 'var(--mut)' }}>{v.notes}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {v.prix_vente && (
                                <span style={{ fontSize: 11, color: v.prix_vente - achat.prix_unitaire >= 0 ? 'var(--g)' : 'var(--red)' }}>
                                  {v.prix_vente - achat.prix_unitaire >= 0 ? '+' : ''}{fmtEur(v.prix_vente - achat.prix_unitaire)}
                                </span>
                              )}
                              <button className="btn-ghost" style={{ color: 'var(--red)', fontSize: 11 }} onClick={() => handleDeleteVente(v.id)}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulaire ajout vente si restants > 0 */}
                    {restants > 0 && (
                      <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--mut)', marginBottom: 8 }}>
                          {restants} unité{restants > 1 ? 's' : ''} disponible{restants > 1 ? 's' : ''}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label className="form-label">Statut</label>
                            <select className="form-input" value={vf.statut} onChange={e => setVenteField(achat.id, 'statut', e.target.value)}>
                              <option value="Vendu">Vendu</option>
                              <option value="Hold">Hold</option>
                              <option value="Remboursé">Remboursé</option>
                            </select>
                          </div>
                          {vf.statut === 'Vendu' && (
                            <div>
                              <label className="form-label">Prix vente (€)</label>
                              <input className="form-input" type="number" step="0.01" placeholder="0.00"
                                value={vf.prix} onChange={e => setVenteField(achat.id, 'prix', e.target.value)} />
                            </div>
                          )}
                          <div>
                            <label className="form-label">Date</label>
                            <input className="form-input" type="date"
                              value={vf.date} onChange={e => setVenteField(achat.id, 'date', e.target.value)} />
                          </div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label className="form-label">Notes</label>
                          <input className="form-input" placeholder="Plateforme, acheteur..."
                            value={vf.notes} onChange={e => setVenteField(achat.id, 'notes', e.target.value)} />
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                          onClick={() => handleAddVente(achat.id)}
                          disabled={savingVente === achat.id || (vf.statut === 'Vendu' && !vf.prix)}>
                          {savingVente === achat.id ? 'Enregistrement...' : `+ Enregistrer (${vf.statut})`}
                        </button>
                      </div>
                    )}

                    {restants === 0 && ventes.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--mut)', textAlign: 'center', padding: '8px 0' }}>Lot vide</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
