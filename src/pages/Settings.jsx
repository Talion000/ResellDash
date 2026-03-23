import { useState } from 'react'
import { useItemsContext } from '../hooks/ItemsContext'
import { fmtEur } from '../lib/utils'

export default function Settings() {
  const { abonnements, addAbonnement, updateAbonnement, deleteAbonnement } = useItemsContext()
  const [nom, setNom] = useState('')
  const [montant, setMontant] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalCharges = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!nom.trim() || !montant || isNaN(montant)) return setError('Nom et montant requis.')
    setLoading(true); setError('')
    const { error: err } = await addAbonnement(nom.trim(), montant)
    if (err) setError(err.message)
    else { setNom(''); setMontant('') }
    setLoading(false)
  }

  return (
    <div style={{ padding: '20px 28px', maxWidth: 600 }}>
      <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px', marginBottom: 24 }}>Paramètres</div>

      {/* Abonnements */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Charges mensuelles</div>
            <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 3 }}>Abonnements déduits de ton bénéfice net</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--red)' }}>-{fmtEur(totalCharges)}/mois</div>
        </div>

        {/* Liste */}
        {abonnements.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 16 }}>Aucun abonnement ajouté.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {abonnements.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: a.actif ? 'var(--text)' : 'var(--mut)' }}>{a.nom}</div>
                  <div style={{ fontSize: 12, color: 'var(--red)' }}>-{fmtEur(a.montant)}/mois</div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mut)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={a.actif} onChange={e => updateAbonnement(a.id, { actif: e.target.checked })} />
                  Actif
                </label>
                <button className="btn-ghost" style={{ color: 'var(--red)' }}
                  onClick={() => { if (window.confirm(`Supprimer "${a.nom}" ?`)) deleteAbonnement(a.id) }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Formulaire ajout */}
        <form onSubmit={handleAdd}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--mut)' }}>Ajouter un abonnement</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Nom</label>
              <input className="form-input" placeholder="Ex: Antares Bot" value={nom} onChange={e => setNom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Montant (€/mois)</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" style={{ width: 120 }}
                value={montant} onChange={e => setMontant(e.target.value)} />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginBottom: 0 }}>
              {loading ? '...' : '+ Ajouter'}
            </button>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{error}</div>}
        </form>
      </div>
    </div>
  )
}
