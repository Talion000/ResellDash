import { useState, useEffect } from 'react'

const STATUTS = ['En stock', 'En livraison', 'Réservé', 'Vendu']

export default function ItemModal({ item, categories, onSave, onClose }) {
  const isEdit = !!item?.id
  const [form, setForm] = useState({
    nom: '', categorie: categories[0]?.name || '', taille_ref: '',
    prix_achat: '', date_achat: '', plateforme_achat: '',
    prix_vente: '', date_vente: '', statut: 'En stock', notes: '',
    ...item
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) setForm(f => ({ ...f, ...item }))
  }, [item])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = async (e) => {
    e.preventDefault()
    if (!form.nom.trim()) return setError('Le nom est requis.')
    if (!form.prix_achat || isNaN(form.prix_achat)) return setError("Prix d'achat invalide.")
    setError(''); setLoading(true)
    const data = {
      nom: form.nom.trim(),
      categorie: form.categorie,
      taille_ref: form.taille_ref || null,
      prix_achat: parseFloat(form.prix_achat),
      date_achat: form.date_achat || null,
      plateforme_achat: form.plateforme_achat || null,
      prix_vente: form.prix_vente ? parseFloat(form.prix_vente) : null,
      date_vente: form.date_vente || null,
      statut: form.statut,
      notes: form.notes || null,
    }
    const { error: err } = await onSave(data)
    if (err) setError(err.message)
    else onClose()
    setLoading(false)
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{isEdit ? 'Modifier l\'item' : 'Ajouter un item'}</div>
        <form onSubmit={handle}>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Nom / Référence *</label>
              <input className="form-input" placeholder="Ex: Adidas Samba OG..." value={form.nom} onChange={e => set('nom', e.target.value)} required />
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
              <label className="form-label">Prix d'achat (€) *</label>
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
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="Condition, défaut, infos utiles..." value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {error && (
            <div style={{ fontSize: '12px', color: 'var(--red)', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '10px 12px', marginTop: '14px' }}>
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
