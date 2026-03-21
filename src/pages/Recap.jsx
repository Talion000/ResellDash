import { useMemo, useState, useRef } from 'react'
import { useItemsContext } from '../hooks/ItemsContext'
import { profit, fmtEur, fmtPct } from '../lib/utils'

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function parseDate(str) {
  if (!str || !str.trim()) return null
  const s = str.trim()
  // MM/DD/YYYY (Excel US format from this CSV)
  if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [m, d, y] = s.split('/')
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  // DD/MM/YYYY
  if (s.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
    const [d, m, y] = s.split('/')
    return `20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  // Already YYYY-MM-DD
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.split('T')[0]
  return null
}

function parsePrice(val) {
  if (!val && val !== 0) return null
  const n = parseFloat(String(val).replace(',', '.').replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? null : n
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/[\u0091-\u0097'"\u2018\u2019]/g, "'").replace(/[^a-z0-9 '/éèêàùû°-]/g, ''))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''))
    if (vals.every(v => !v)) continue
    const row = {}
    headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
    rows.push(row)
  }
  return rows
}

function mapRow(row, categorie) {
  const nom = row['nom'] || row['name'] || row['article'] || row['item'] || ''
  const taille = row['size'] || row['taille'] || row["taille/réf"] || row['ref'] || row['référence'] || ''
  const getCol = (row, ...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(rk => rk.replace(/[^a-z0-9]/g,'') === k.replace(/[^a-z0-9]/g,''))
      if (found && row[found]) return row[found]
    }
    return ''
  }
  const prixAchat = parsePrice(getCol(row, "prix d'achat", 'prixdachat', 'achat', 'buy_price'))
  const dateAchat = parseDate(getCol(row, "date d'achat", 'datedachat', 'date achat'))
  const prixVente = parsePrice(getCol(row, 'prix de vente', 'prixdevente', 'vente', 'sell_price'))
  const dateVente = parseDate(getCol(row, 'date de vente', 'datedevente', 'date vente'))
  const pfKey = Object.keys(row).find(k => k.replace(/[^a-z]/g,'').includes('plateformedachat') || k.includes('plateforme')) || ''
  const plateforme = row[pfKey] || ''
  if (!nom || !prixAchat) return null
  return {
    nom, categorie,
    taille_ref: taille || null,
    prix_achat: prixAchat,
    date_achat: dateAchat,
    plateforme_achat: plateforme || null,
    prix_vente: prixVente || null,
    date_vente: dateVente,
    statut: prixVente ? 'Vendu' : 'En stock',
    notes: null, image_url: null,
  }
}

export default function Recap() {
  const { items, categories, addItem } = useItemsContext()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importCategorie, setImportCategorie] = useState(categories[0]?.name || '')
  const [showImportModal, setShowImportModal] = useState(false)
  const [preview, setPreview] = useState([])
  const [parsedRows, setParsedRows] = useState([])
  const fileRef = useRef()

  const years = useMemo(() => {
    const ys = new Set()
    items.forEach(i => {
      if (i.date_achat) ys.add(new Date(i.date_achat).getFullYear())
      if (i.date_vente) ys.add(new Date(i.date_vente).getFullYear())
    })
    ys.add(currentYear)
    return [...ys].sort((a, b) => b - a)
  }, [items, currentYear])

  const yearData = useMemo(() => {
    const sold = items.filter(i => i.statut === 'Vendu' && i.prix_vente && i.date_vente?.startsWith(selectedYear.toString()))
    const bought = items.filter(i => i.date_achat?.startsWith(selectedYear.toString()))
    const months = Array.from({ length: 12 }, (_, idx) => {
      const mm = String(idx + 1).padStart(2, '0')
      const key = `${selectedYear}-${mm}`
      const mSold = sold.filter(i => i.date_vente?.startsWith(key))
      const mBought = bought.filter(i => i.date_achat?.startsWith(key))
      return {
        month: MONTHS_FR[idx],
        achats: mBought.reduce((s, i) => s + i.prix_achat, 0),
        ca: mSold.reduce((s, i) => s + i.prix_vente, 0),
        benef: mSold.reduce((s, i) => s + (profit(i) || 0), 0),
        nb: mSold.length,
      }
    })
    const totals = months.reduce((t, m) => ({ achats: t.achats + m.achats, ca: t.ca + m.ca, benef: t.benef + m.benef, nb: t.nb + m.nb }), { achats: 0, ca: 0, benef: 0, nb: 0 })
    return { months, totals, roi: totals.achats > 0 ? (totals.benef / totals.achats) * 100 : 0 }
  }, [items, selectedYear])

  const exportCSV = () => {
    const rows = [
      ['Mois', 'Achats (€)', 'CA (€)', 'Bénéfice (€)', 'Nb ventes'],
      ...yearData.months.map(m => [m.month, m.achats.toFixed(2), m.ca.toFixed(2), m.benef.toFixed(2), m.nb]),
      ['TOTAL', yearData.totals.achats.toFixed(2), yearData.totals.ca.toFixed(2), yearData.totals.benef.toFixed(2), yearData.totals.nb],
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `resell_recap_${selectedYear}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Try UTF-8 first, fallback to latin-1 for Windows Excel exports
    const tryParse = (text) => {
      const rows = parseCSV(text)
      const mapped = rows.map(r => mapRow(r, importCategorie)).filter(Boolean)
      setParsedRows(mapped)
      setPreview(mapped.slice(0, 5))
      setShowImportModal(true)
    }
    const reader = new FileReader()
    reader.onload = (ev) => tryParse(ev.target.result)
    // Use latin-1 to handle Windows Excel CSV exports
    reader.readAsText(file, 'windows-1252')
  }

  const handleImport = async () => {
    setImporting(true)
    setImportResult(null)
    let success = 0, errors = 0
    for (const row of parsedRows) {
      const { error } = await addItem({ ...row, categorie: importCategorie })
      if (error) errors++; else success++
    }
    setImportResult({ success, errors })
    setImporting(false)
    setShowImportModal(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px' }}>Récap fiscal</div>
          <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 3 }}>Résumé de tes activités par mois et par an</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="form-input" style={{ width: 'auto', padding: '7px 12px' }}
            value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>⬆ Import CSV</button>
          <button className="btn-primary" onClick={exportCSV}>⬇ Export CSV</button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      </div>

      {importResult && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12 }}>
          ✅ <strong style={{ color: 'var(--g)' }}>{importResult.success} items importés</strong>
          {importResult.errors > 0 && <span style={{ color: 'var(--o)' }}> — {importResult.errors} erreurs</span>}
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { label: `CA ${selectedYear}`, val: fmtEur(yearData.totals.ca), sub: `${yearData.totals.nb} ventes`, color: 'var(--g)' },
          { label: 'Bénéfice net', val: (yearData.totals.benef >= 0 ? '+' : '') + fmtEur(yearData.totals.benef), sub: fmtPct(yearData.roi) + ' ROI', color: yearData.totals.benef >= 0 ? 'var(--g)' : 'var(--red)' },
          { label: 'Total achats', val: fmtEur(yearData.totals.achats), sub: 'dépenses totales', color: 'var(--b)' },
          { label: 'Bénéfice moyen/mois', val: fmtEur(yearData.totals.benef / 12), sub: "sur l'année", color: 'var(--b)' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(59,130,246,0.06)', border: '0.5px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 12, color: 'var(--mut)' }}>
        <span style={{ color: 'var(--b)', fontWeight: 500 }}>ℹ Info déclaration</span>
        {'  '}En France, les revenus de la vente sont imposables au-delà de <strong style={{ color: 'var(--text)' }}>5 000 € de ventes annuelles</strong>.
      </div>

      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Détail mensuel {selectedYear}</div>
        </div>
        <table>
          <thead><tr><th>Mois</th><th>Achats (€)</th><th>CA (€)</th><th>Bénéfice (€)</th><th>ROI</th><th>Nb ventes</th></tr></thead>
          <tbody>
            {yearData.months.map((m, i) => {
              const roi = m.achats > 0 ? (m.benef / m.achats) * 100 : null
              const isEmpty = m.achats === 0 && m.ca === 0
              return (
                <tr key={i} style={{ opacity: isEmpty ? 0.35 : 1 }}>
                  <td style={{ fontWeight: 500 }}>{m.month}</td>
                  <td style={{ color: 'var(--b)' }}>{m.achats > 0 ? fmtEur(m.achats) : '—'}</td>
                  <td style={{ color: 'var(--g)' }}>{m.ca > 0 ? fmtEur(m.ca) : '—'}</td>
                  <td>{m.benef !== 0 ? <span className={m.benef >= 0 ? 'profit-pos' : 'profit-neg'}>{m.benef >= 0 ? '+' : ''}{fmtEur(m.benef)}</span> : '—'}</td>
                  <td>{roi != null ? <span className={roi >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(roi)}</span> : '—'}</td>
                  <td style={{ color: 'var(--mut)' }}>{m.nb > 0 ? m.nb : '—'}</td>
                </tr>
              )
            })}
            <tr style={{ borderTop: '0.5px solid var(--brd2)' }}>
              <td style={{ fontWeight: 600 }}>TOTAL {selectedYear}</td>
              <td style={{ fontWeight: 600, color: 'var(--b)' }}>{fmtEur(yearData.totals.achats)}</td>
              <td style={{ fontWeight: 600, color: 'var(--g)' }}>{fmtEur(yearData.totals.ca)}</td>
              <td style={{ fontWeight: 600 }}><span className={yearData.totals.benef >= 0 ? 'profit-pos' : 'profit-neg'}>{yearData.totals.benef >= 0 ? '+' : ''}{fmtEur(yearData.totals.benef)}</span></td>
              <td style={{ fontWeight: 600 }}><span className={yearData.roi >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(yearData.roi)}</span></td>
              <td style={{ fontWeight: 600, color: 'var(--mut)' }}>{yearData.totals.nb}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {showImportModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowImportModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-title">Importer {parsedRows.length} items</div>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Catégorie pour tous les items importés</label>
              <select className="form-input" value={importCategorie} onChange={e => setImportCategorie(e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 10 }}>Aperçu des {Math.min(5, preview.length)} premiers items :</div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%' }}>
                <thead><tr>
                  {['Nom','Achat','Vente','Statut'].map(h => <th key={h} style={{ fontSize: 10, padding: '8px 12px', textAlign: 'left', color: 'var(--mut)', fontWeight: 400 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {preview.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 12, fontSize: 12, color: 'var(--red)' }}>Aucun item reconnu. Vérifie les colonnes de ton CSV.</td></tr>
                  ) : preview.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12, padding: '7px 12px', borderTop: '0.5px solid var(--brd)' }}>{row.nom}</td>
                      <td style={{ fontSize: 12, padding: '7px 12px', borderTop: '0.5px solid var(--brd)', color: 'var(--b)' }}>{fmtEur(row.prix_achat)}</td>
                      <td style={{ fontSize: 12, padding: '7px 12px', borderTop: '0.5px solid var(--brd)', color: 'var(--g)' }}>{row.prix_vente ? fmtEur(row.prix_vente) : '—'}</td>
                      <td style={{ fontSize: 12, padding: '7px 12px', borderTop: '0.5px solid var(--brd)' }}>{row.statut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowImportModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleImport} disabled={importing || parsedRows.length === 0}>
                {importing ? 'Import en cours...' : `Importer ${parsedRows.length} items`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
