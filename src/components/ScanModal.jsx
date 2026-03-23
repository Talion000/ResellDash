import { useState, useRef } from 'react'
import { useItemsContext } from '../hooks/ItemsContext'

export default function ScanModal({ onClose }) {
  const { categories, addItem } = useItemsContext()
  const [step, setStep] = useState('upload')
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Compress image before sending
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 1200
        let w = img.width, h = img.height
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        const compressed = canvas.toDataURL('image/jpeg', 0.85)
        setImage(compressed)
        setImageBase64(compressed.split(',')[1])
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const analyze = async () => {
    if (!imageBase64) return
    setStep('analyzing')
    setError('')
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          categories: categories.map(c => c.name)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setResult({ ...data, nom: data.nom ? data.nom.toUpperCase() : data.nom, quantite: data.quantite || 1 })
      setStep('confirm')
    } catch (e) {
      setError(e.message || "Impossible d'analyser l'image.")
      setStep('upload')
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    const itemData = {
      nom: result.nom || 'Article importé',
      categorie: result.categorie || categories[0]?.name || 'Random',
      taille_ref: result.taille_ref || null,
      prix_achat: parseFloat(result.prix_achat) || 0,
      date_achat: result.date_achat || null,
      plateforme_achat: result.plateforme_achat || null,
      statut: 'Acheté',
      notes: null,
      image_url: null,
      quantite_mode: (result.quantite || 1) > 1,
      quantite_total: (result.quantite || 1) > 1 ? result.quantite : 1,
    }
    const { error: err } = await addItem(itemData)
    if (err) { setError(err.message); setSaving(false); return }
    setStep('done')
    setSaving(false)
  }

  const set = (k, v) => setResult(r => ({ ...r, [k]: k === 'nom' ? v.toUpperCase() : v }))

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ margin: 0 }}>📷 Scan rapide</div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {step === 'upload' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 16 }}>
              Prends une capture de ta confirmation de commande — je remplis le formulaire automatiquement.
            </div>
            {image ? (
              <div style={{ marginBottom: 16 }}>
                <img src={image} alt="preview" style={{ width: '100%', borderRadius: 10, border: '0.5px solid var(--brd2)', maxHeight: 220, objectFit: 'cover' }} />
                <button className="btn-ghost" style={{ marginTop: 8, fontSize: 11 }}
                  onClick={() => { setImage(null); setImageBase64(null); if (fileRef.current) fileRef.current.value = '' }}>
                  Changer l'image
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: '1.5px dashed var(--brd2)', borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--g)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--brd2)'}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Ajouter une capture</div>
                <div style={{ fontSize: 11, color: 'var(--mut)' }}>Photo ou screenshot de ta confirmation de commande</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
            {error && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                {error}
              </div>
            )}
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={analyze} disabled={!imageBase64}>
              Analyser la commande →
            </button>
          </div>
        )}

        {step === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Analyse en cours...</div>
            <div style={{ fontSize: 12, color: 'var(--mut)' }}>L'IA lit ta confirmation de commande</div>
          </div>
        )}

        {step === 'confirm' && result && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 16 }}>
              ✅ Infos détectées — vérifie et corrige si besoin avant d'enregistrer.
            </div>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">Nom / Référence</label>
                <input className="form-input" value={result.nom || ''} onChange={e => set('nom', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-input" value={result.categorie || ''} onChange={e => set('categorie', e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Taille / Réf</label>
                <input className="form-input" value={result.taille_ref || ''} onChange={e => set('taille_ref', e.target.value)} placeholder="—" />
              </div>
              <div className="form-group">
                <label className="form-label">Prix unitaire (€)</label>
                <input className="form-input" type="number" step="0.01" value={result.prix_achat || ''} onChange={e => set('prix_achat', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantité</label>
                <input className="form-input" type="number" min="1" value={result.quantite || 1} onChange={e => set('quantite', parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Date d'achat</label>
                <input className="form-input" type="date" value={result.date_achat || ''} onChange={e => set('date_achat', e.target.value)} />
              </div>
              <div className="form-group full">
                <label className="form-label">Plateforme</label>
                <input className="form-input" value={result.plateforme_achat || ''} onChange={e => set('plateforme_achat', e.target.value)} />
              </div>
            </div>
            {error && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                {error}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setStep('upload'); setResult(null) }}>← Recommencer</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : '✓ Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Item ajouté !</div>
            <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 24 }}>{result?.nom} a été ajouté à ton stock.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => { setStep('upload'); setImage(null); setImageBase64(null); setResult(null) }}>
                Scanner une autre
              </button>
              <button className="btn-primary" onClick={onClose}>Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
