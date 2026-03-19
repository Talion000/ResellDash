import { useMemo, useState } from 'react'
import { useItemsContext } from '../hooks/ItemsContext'
import { profit, fmtEur, fmtPct, groupByMonth, formatMonth } from '../lib/utils'

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export default function Recap() {
  const { items } = useItemsContext()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

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

    const totals = months.reduce((t, m) => ({
      achats: t.achats + m.achats,
      ca: t.ca + m.ca,
      benef: t.benef + m.benef,
      nb: t.nb + m.nb,
    }), { achats: 0, ca: 0, benef: 0, nb: 0 })

    const roi = totals.achats > 0 ? (totals.benef / totals.achats) * 100 : 0

    return { months, totals, roi }
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
    const a = document.createElement('a')
    a.href = url; a.download = `resell_recap_${selectedYear}.csv`
    a.click(); URL.revokeObjectURL(url)
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
          <button className="btn-primary" onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Annual KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">CA {selectedYear}</div>
          <div className="kpi-value" style={{ color: 'var(--g)' }}>{fmtEur(yearData.totals.ca)}</div>
          <div className="kpi-sub">{yearData.totals.nb} ventes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bénéfice net</div>
          <div className="kpi-value" style={{ color: yearData.totals.benef >= 0 ? 'var(--g)' : 'var(--red)' }}>
            {yearData.totals.benef >= 0 ? '+' : ''}{fmtEur(yearData.totals.benef)}
          </div>
          <div className="kpi-sub" style={{ color: yearData.roi >= 0 ? 'var(--g)' : 'var(--red)' }}>{fmtPct(yearData.roi)} ROI</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total achats</div>
          <div className="kpi-value" style={{ color: 'var(--o)' }}>{fmtEur(yearData.totals.achats)}</div>
          <div className="kpi-sub">dépenses totales</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bénéfice moyen/mois</div>
          <div className="kpi-value" style={{ color: 'var(--b)' }}>
            {fmtEur(yearData.totals.benef / 12)}
          </div>
          <div className="kpi-sub">sur l'année</div>
        </div>
      </div>

      {/* Déclaration info */}
      <div style={{
        background: 'rgba(59,130,246,0.06)', border: '0.5px solid rgba(59,130,246,0.25)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 12, color: 'var(--mut)'
      }}>
        <span style={{ color: 'var(--b)', fontWeight: 500 }}>ℹ Info déclaration</span>
        {'  '}En France, les revenus de la vente de biens d'occasion sont imposables au-delà de <strong style={{ color: 'var(--text)' }}>5 000 € de ventes annuelles</strong>. 
        Ce récap te donne les chiffres clés à reporter. Consulte un comptable pour ta situation personnelle.
      </div>

      {/* Monthly table */}
      <div className="table-container">
        <div className="table-header">
          <div style={{ fontSize: 14, fontWeight: 500 }}>Détail mensuel {selectedYear}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Mois</th>
              <th>Achats (€)</th>
              <th>CA (€)</th>
              <th>Bénéfice (€)</th>
              <th>ROI</th>
              <th>Nb ventes</th>
            </tr>
          </thead>
          <tbody>
            {yearData.months.map((m, i) => {
              const roi = m.achats > 0 ? (m.benef / m.achats) * 100 : null
              const isEmpty = m.achats === 0 && m.ca === 0
              return (
                <tr key={i} style={{ opacity: isEmpty ? 0.35 : 1 }}>
                  <td style={{ fontWeight: 500 }}>{m.month}</td>
                  <td style={{ color: 'var(--o)' }}>{m.achats > 0 ? fmtEur(m.achats) : '—'}</td>
                  <td style={{ color: 'var(--g)' }}>{m.ca > 0 ? fmtEur(m.ca) : '—'}</td>
                  <td>
                    {m.benef !== 0 ? (
                      <span className={m.benef >= 0 ? 'profit-pos' : 'profit-neg'}>
                        {m.benef >= 0 ? '+' : ''}{fmtEur(m.benef)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {roi != null ? <span className={roi >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(roi)}</span> : '—'}
                  </td>
                  <td style={{ color: 'var(--mut)' }}>{m.nb > 0 ? m.nb : '—'}</td>
                </tr>
              )
            })}
            {/* Total row */}
            <tr style={{ borderTop: '0.5px solid var(--brd2)' }}>
              <td style={{ fontWeight: 600, color: 'var(--text)' }}>TOTAL {selectedYear}</td>
              <td style={{ fontWeight: 600, color: 'var(--o)' }}>{fmtEur(yearData.totals.achats)}</td>
              <td style={{ fontWeight: 600, color: 'var(--g)' }}>{fmtEur(yearData.totals.ca)}</td>
              <td style={{ fontWeight: 600 }}>
                <span className={yearData.totals.benef >= 0 ? 'profit-pos' : 'profit-neg'}>
                  {yearData.totals.benef >= 0 ? '+' : ''}{fmtEur(yearData.totals.benef)}
                </span>
              </td>
              <td style={{ fontWeight: 600 }}>
                <span className={yearData.roi >= 0 ? 'profit-pos' : 'profit-neg'}>{fmtPct(yearData.roi)}</span>
              </td>
              <td style={{ fontWeight: 600, color: 'var(--mut)' }}>{yearData.totals.nb}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
