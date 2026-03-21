import { useState, useEffect, useRef } from 'react'
import { STATUTS, fmtEur } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useItemsContext } from '../hooks/ItemsContext'

const DRAFT_KEY = 'resell_item_draft'

export default function ItemModal({ item, categories, onSave, onClose }) {
  const isEdit = !!item?.id
  const { addVenteUnitaire, deleteVenteUnitaire, getVentesForItem } = useItemsContext()

  const defaultForm = {
    nom: '', categorie: categories[0]?.name || '', taille_ref: '',
    prix_achat: '', date_achat: '', plateforme_achat: '',
    prix_vente: '', date_vente: '', statut: 'En stock', notes: '',
    image_url: null, quantite_mode: false, quantite_total: 1,
  }

  const [form, setForm] = useState(() => {
    if (isEdit) return { ...defaultForm, ...item }
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      return draft ? { ...defaultForm, ...JSON.parse(draft) } : defaultForm
    } catch { return defaultForm }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState(item?.image_url || null)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState('infos') // 'infos' | 'ventes'
  const [venteForm, setVenteForm] = useState({ prix: '', date: '', notes: '' })
  const [ventesItem, setVentesItem] = useState(isEdit ? getVentesForItem(item?.id) : [])
  const [addingVente, setAddingVente] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (item) {
      setForm(f => ({ ...f, ...item }))
      setImagePreview(item.image_url || null)
      setVentesItem(getVentesForItem(item.id))
    }
  }, [item])

  useEffect(() => {
    if (!isEdit) {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch {}
    }
  }, [form, isEdit])

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v }
    if (k === 'prix_vente' && v && parseFloat(v) > 0 && !updated.quantite_mode &&
        !['En retour', 'Remboursé'].includes(updated.statut)) {
      updated.statut = 'Vendu'
    }
    return updated
  })

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `items/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('item-images').upload(path, file)
    if (upErr) { setError('Erreur upload image'); setUploading(false); return }
    const { data } = supabase.storage.from('item-images').getPublicUrl(path)
    setForm(f => ({ ...f, image_url: data.publicUrl }))
    setImagePreview(data.publicUrl)
    setUploading(false)
  }

  const removeImage = () => {
    setForm(f => ({ ...f, image_url: null }))
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handle = async (e) => {
    e.preventDefault()
    if (!form.nom.trim()) return setError('Le nom est requis.')
    if (!form.prix_achat || isNaN(form.prix_achat)) return setError("Prix d'achat invalide.")
    setError(''); setLoading(true)
    const data = {
      nom: form.nom.trim(), categorie: form.categorie,
      taille_ref: form.taille_ref || null,
      prix_achat: parseFloat(form.prix_achat),
      date_achat: form.date_achat || null,
      plateforme_achat: form.plateforme_achat || null,
      prix_vente: form.prix_vente ? parseFloat(form.prix_vente) : null,
      date_vente: form.date_vente || null,
      statut: form.statut,
      notes: form.notes || null,
      image_url: form.image_url || null,
      quantite_mode: form.quantite_mode || false,
      quantite_total: form.quantite_mode ? parseInt(form.quantite_total) || 1 : 1,
    }
    const { error: err } = await onSave(data)
    if (err) { setError(err.message); setLoading(false); return }
    if (!isEdit) try { localStorage.removeItem(DRAFT_KEY) } catch {}
    onClose()
    setLoading(false)
  }

  const handleAddVente = async () => {
    if (!venteForm.prix || isNaN(venteForm.prix)) return
    setAddingVente(true)
    const { data, error } = await addVenteUnitaire(item.id, parseFloat(venteForm.prix), venteForm.date || null, venteForm.notes || null)
    if (!error) {
      setVentesItem(prev => [data, ...prev])
      setVenteForm({ prix: '', date: '', notes: '' })
      // Auto update statut if all sold
      const newCount = ventesItem.length + 1
      if (newCount >= form.quantite_total) {
        await onSave({ ...form, statut: 'Vendu', prix_achat: parseFloat(form.prix_achat), quantite_total: parseInt(form.quantite_total) || 1 })
      }
    }
    setAddingVente(false)
  }

  const handleDeleteVente = async (id) => {
    await deleteVenteUnitaire(id)
    setVentesItem(prev => prev.filter(v => v.id !== id))
  }

  const nbVendus = ventesItem.length
  const nbRestants = Math.max(0, (parseInt(form.quantite_total) || 1) - nbVendus)
  const totalVentes = ventesItem.reduce((s, v) => s + v.prix_vente, 0)
  const coutTotal = (parseFloat(form.prix_achat) || 0) * (parseInt(form.quantite_total) || 1)
  const benefTotal = totalVentes - coutTotal

  const tabStyle = (t) => ({
    padding: '6px 16px', fontSize: 13, cursor: 'pointer', borderRadius: 8,
    background: tab === t ? 'var(--bg4)' : 'transparent',
    color: tab === t ? 'var(--text)' : 'var(--mut)',
    border: 'none', transition: 'all 0.15s',
  })

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: form.quantite_mode && isEdit ? 580 : 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div className="modal-title" style={{ margin: 0 }}>{isEdit ? "Modifier l'item" : 'Ajouter un item'}</div>
          {!isEdit && <div style={{ fontSize: 11, color: 'var(--mut)' }}>💾 Brouillon sauvegardé</div>}
        </div>

        {/* Tabs — only show if edit + quantite_mode */}
        {isEdit && form.quantite_mode && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'var(--bg3)', borderRadius: 10, padding: 4 }}>
            <button style={tabStyle('infos')} onClick={() => setTab('infos')}>Infos</button>
            <button style={tabStyle('ventes')} onClick={() => setTab('ventes')}>
              Ventes ({nbVendus}/{form.quantite_total})
            </button>
          </div>
        )}

        {tab === 'infos' && (
          <form onSubmit={handle}>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">Nom / Référence *</label>
                <input className="form-input" placeholder="Ex: ETB EV10..." value={form.nom} onChange={e => set('nom', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-input" value={form.categorie} onChange={e => set('categorie', e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Taille / Réf</label>
                <input className="form-input" placeholder="42, M, FRA-001..." value={form.taille_ref || ''} onChange={e => set('taille_ref', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Prix d'achat unitaire (€) *</label>
                <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.prix_achat || ''} onChange={e => set('prix_achat', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date d'achat</label>
                <input className="form-input" type="date" value={form.date_achat || ''} onChange={e => set('date_achat', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Plateforme d'achat</label>
                <input className="form-input" placeholder="ZAL, SNKRS..." value={form.plateforme_achat || ''} onChange={e => set('plateforme_achat', e.target.value)} />
              </div>

              {/* Quantite mode toggle */}
              <div className="form-group full" style={{ borderTop: '0.5px solid var(--brd)', paddingTop: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.quantite_mode || false} onChange={e => set('quantite_mode', e.target.checked)} />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>Gérer en quantité</span>
                  <span style={{ fontSize: 11, color: 'var(--mut)' }}>— pour les lots (ETB x10, etc.)</span>
                </label>
              </div>

              {form.quantite_mode ? (
                <div className="form-group full">
                  <label className="form-label">Quantité achetée</label>
                  <input className="form-input" type="number" min="1" placeholder="10" value={form.quantite_total || ''} onChange={e => set('quantite_total', e.target.value)} />
                  <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 5 }}>
                    Coût total : <strong style={{ color: 'var(--b)' }}>{fmtEur((parseFloat(form.prix_achat) || 0) * (parseInt(form.quantite_total) || 1))}</strong>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Statut</label>
                    <select className="form-input" value={form.statut} onChange={e => set('statut', e.target.value)}>
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prix de vente (€)</label>
                    <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.prix_vente || ''} onChange={e => set('prix_vente', e.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Date de vente</label>
                    <input className="form-input" type="date" value={form.date_vente || ''} onChange={e => set('date_vente', e.target.value)} />
                  </div>
                </>
              )}

              <div className="form-group full">
                <label className="form-label">Notes</label>
                <input className="form-input" placeholder="Condition, défaut, infos utiles..." value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
              </div>

              <div className="form-group full">
                <label className="form-label">Image</label>
                {imagePreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={imagePreview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '0.5px solid var(--brd2)' }} />
                    <button type="button" className="btn-ghost" style={{ color: 'var(--red)' }} onClick={removeImage}>Supprimer</button>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()}
                    style={{ border: '1px dashed var(--brd2)', borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer', color: 'var(--mut)', fontSize: 12 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--g)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--brd2)'}>
                    {uploading ? 'Upload en cours...' : '📷 Cliquer pour ajouter une image'}
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
              </div>
            </div>

            {error && <div style={{ fontSize: '12px', color: 'var(--red)', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '10px 12px', marginTop: '14px' }}>{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={loading || uploading}>
                {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </form>
        )}

        {tab === 'ventes' && isEdit && (
          <div>
            {/* Infos achat */}
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, display: 'flex', gap: 20 }}>
              <span style={{ color: 'var(--mut)' }}>Achat unitaire : <strong style={{ color: 'var(--b)' }}>{fmtEur(parseFloat(form.prix_achat))}</strong></span>
              <span style={{ color: 'var(--mut)' }}>Coût total : <strong style={{ color: 'var(--b)' }}>{fmtEur(coutTotal)}</strong></span>
              {form.plateforme_achat && <span style={{ color: 'var(--mut)' }}>Plateforme : <strong style={{ color: 'var(--text)' }}>{form.plateforme_achat}</strong></span>}
              {form.date_achat && <span style={{ color: 'var(--mut)' }}>Acheté le : <strong style={{ color: 'var(--text)' }}>{new Date(form.date_achat).toLocaleDateString('fr-FR')}</strong></span>}
            </div>
            {/* Stats rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Vendus', val: `${nbVendus}/${form.quantite_total}`, color: 'var(--g)' },
                { label: 'Restants', val: nbRestants, color: nbRestants === 0 ? 'var(--mut)' : 'var(--o)' },
                { label: 'Bénéfice', val: (benefTotal >= 0 ? '+' : '') + fmtEur(benefTotal), color: benefTotal >= 0 ? 'var(--g)' : 'var(--red)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Add vente form */}
            {nbRestants > 0 && (
              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>+ Enregistrer une vente</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Prix de vente (€) *</label>
                    <input className="form-input" type="number" step="0.01" placeholder="0.00"
                      value={venteForm.prix} onChange={e => setVenteForm(f => ({ ...f, prix: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de vente</label>
                    <input className="form-input" type="date"
                      value={venteForm.date} onChange={e => setVenteForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Notes</label>
                    <input className="form-input" placeholder="Plateforme, acheteur..."
                      value={venteForm.notes} onChange={e => setVenteForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <button className="btn-primary" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                  onClick={handleAddVente} disabled={addingVente || !venteForm.prix}>
                  {addingVente ? 'Enregistrement...' : '+ Vendre 1 unité'}
                </button>
              </div>
            )}

            {/* Liste des ventes */}
            {ventesItem.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--mut)', fontSize: 12 }}>Aucune vente enregistrée</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ventesItem.map((v, i) => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--g)' }}>{fmtEur(v.prix_vente)}</div>
                      {v.date_vente && <div style={{ fontSize: 11, color: 'var(--mut)' }}>{new Date(v.date_vente).toLocaleDateString('fr-FR')}</div>}
                      {v.notes && <div style={{ fontSize: 11, color: 'var(--mut)' }}>{v.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: parseFloat(v.prix_vente) - parseFloat(form.prix_achat) >= 0 ? 'var(--g)' : 'var(--red)' }}>
                        {parseFloat(v.prix_vente) - parseFloat(form.prix_achat) >= 0 ? '+' : ''}{fmtEur(parseFloat(v.prix_vente) - parseFloat(form.prix_achat))}
                      </span>
                      <button className="btn-ghost" style={{ color: 'var(--red)' }} onClick={() => handleDeleteVente(v.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn-secondary" onClick={onClose}>Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
