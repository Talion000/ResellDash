import { useState, useEffect, useRef } from 'react'
import { STATUTS } from '../lib/utils'
import { supabase } from '../lib/supabase'

export default function ItemModal({ item, categories, onSave, onClose }) {
  const isEdit = !!item?.id
  const [form, setForm] = useState({
    nom: '', categorie: categories[0]?.name || '', taille_ref: '',
    prix_achat: '', date_achat: '', plateforme_achat: '',
    prix_vente: '', date_vente: '', statut: 'En stock', notes: '',
    image_url: null,
    ...item
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState(item?.image_url || null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (item) {
      setForm(f => ({ ...f, ...item }))
      setImagePreview(item.image_url || null)
    }
  }, [item])

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v }
    // Auto-statut Vendu si prix de vente renseigné
    if (k === 'prix_vente' && v && parseFloat(v) > 0) {
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
      image_url: form.image_url || null,
    }
    const { error: err } = await onSave(data)
    if (err) setError(err.message)
    else onClose()
    setLoading(false)
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{isEdit ? "Modifier l'item" : 'Ajouter un item'}</div>
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

            {/* Image upload */}
            <div className="form-group full">
              <label className="form-label">Image</label>
              {imagePreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={imagePreview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '0.5px solid var(--brd2)' }} />
                  <button type="button" className="btn-ghost" style={{ color: 'var(--red)' }} onClick={removeImage}>Supprimer</button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '1px dashed var(--brd2)', borderRadius: 8, padding: '16px',
                    textAlign: 'center', cursor: 'pointer', color: 'var(--mut)', fontSize: 12,
                    transition: 'border-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--g)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--brd2)'}
                >
                  {uploading ? 'Upload en cours...' : '📷 Cliquer pour ajouter une image'}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
            </div>
          </div>

          {error && (
            <div style={{ fontSize: '12px', color: 'var(--red)', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '10px 12px', marginTop: '14px' }}>
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={loading || uploading}>
              {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
