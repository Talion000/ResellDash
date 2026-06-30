import { useState, useEffect, useRef } from 'react'
import { useItemsContext } from '../hooks/ItemsContext'

// Compresse une image avant upload (même logique que ScanModal)
function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 1600
        let w = img.width, h = img.height
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function PreuveModal({ item, venteUnitaireId = null, venteLabel, onClose }) {
  const { getPreuve, savePreuve, deletePreuve, uploadPreuvePhoto, getPreuvePhotoUrl, deletePreuvePhoto } = useItemsContext()

  const [acheteur, setAcheteur] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState([]) // [{ path, url }]
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    const existing = getPreuve(item.id, venteUnitaireId)
    if (existing) {
      setAcheteur(existing.acheteur || '')
      setNotes(existing.notes || '')
      loadPhotoUrls(existing.photos || [])
    }
  }, [])

  const loadPhotoUrls = async (paths) => {
    const withUrls = await Promise.all(paths.map(async p => ({ path: p, url: await getPreuvePhotoUrl(p) })))
    setPhotos(withUrls)
  }

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    setError('')
    for (const file of files) {
      try {
        const blob = await compressImage(file)
        const { path, error: err } = await uploadPreuvePhoto(blob, item.id, venteUnitaireId)
        if (err) { setError("Erreur lors de l'envoi d'une photo."); continue }
        const url = await getPreuvePhotoUrl(path)
        setPhotos(prev => [...prev, { path, url }])
      } catch {
        setError("Erreur lors de l'envoi d'une photo.")
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const removePhoto = async (path) => {
    setPhotos(prev => prev.filter(p => p.path !== path))
    await deletePreuvePhoto(path)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await savePreuve({
      itemId: item.id,
      venteUnitaireId,
      acheteur,
      notes,
      photos: photos.map(p => p.path),
    })
    setSaving(false)
    if (err) { setError("Impossible d'enregistrer."); return }
    onClose()
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Supprimer cette preuve et toutes ses photos ?')) return
    const existing = getPreuve(item.id, venteUnitaireId)
    await Promise.all(photos.map(p => deletePreuvePhoto(p.path)))
    if (existing) await deletePreuve(existing.id)
    onClose()
  }

  const hasExisting = !!getPreuve(item.id, venteUnitaireId)

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="modal-title" style={{ margin: 0 }}>📸 Preuve de vente</div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 20 }}>
          {item.nom}{venteLabel ? ` · ${venteLabel}` : ''}
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group full">
            <label className="form-label">Nom de l'acheteur</label>
            <input className="form-input" value={acheteur} onChange={e => setAcheteur(e.target.value)} placeholder="Pseudo Vinted, prénom, etc." />
          </div>
          <div className="form-group full">
            <label className="form-label">Notes (optionnel)</label>
            <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Numéro de suivi, remarque..." />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Photos (colis, bordereau...)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8, marginBottom: 10 }}>
            {photos.map(p => (
              <div key={p.path} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '0.5px solid var(--brd2)' }}>
                {p.url
                  ? <img src={p.url} alt="preuve" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mut)', fontSize: 10 }}>...</div>
                }
                <button onClick={() => removePhoto(p.path)}
                  style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              </div>
            ))}
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              style={{ aspectRatio: '1', borderRadius: 8, border: '1.5px dashed var(--brd2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'default' : 'pointer', color: 'var(--mut)', gap: 2 }}>
              <span style={{ fontSize: 20 }}>{uploading ? '⏳' : '+'}</span>
              <span style={{ fontSize: 9 }}>{uploading ? 'Envoi...' : 'Ajouter'}</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display: 'none' }} onChange={handleFiles} />
          <div style={{ fontSize: 11, color: 'var(--mut)' }}>Tu peux ajouter plusieurs photos (colis fermé, étiquette, bordereau de dépôt...).</div>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '10px 12px' }}>
            {error}
          </div>
        )}

        <div className="modal-actions" style={{ justifyContent: hasExisting ? 'space-between' : 'flex-end' }}>
          {hasExisting && (
            <button className="btn-ghost" onClick={handleDeleteAll} style={{ color: 'var(--red)' }}>Supprimer la preuve</button>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || uploading}>
              {saving ? 'Enregistrement...' : '✓ Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
