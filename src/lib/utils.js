export function profit(item) {
  if (item.prix_vente == null || item.prix_achat == null) return null
  return item.prix_vente - item.prix_achat
}

export function rendement(item) {
  const p = profit(item)
  if (p == null || !item.prix_achat) return null
  return (p / item.prix_achat) * 100
}

export function fmt(n, decimals = 0) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function fmtEur(n, decimals = 0) {
  if (n == null) return '—'
  return fmt(n, decimals) + ' €'
}

export function fmtPct(n) {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + fmt(n, 1) + '%'
}

export function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

// Couleurs fixes par catégorie par défaut
export const CAT_COLORS_DEFAULT = {
  'Sneakers': '#a855f7',   // violet
  'Pokémon':  '#f59e0b',   // jaune/or
  'Random':   '#ec4899',   // rose
}

export function catColor(cat, categories = []) {
  const found = categories.find(c => c.name === cat)
  if (found) return found.color
  return CAT_COLORS_DEFAULT[cat] || '#888'
}

export function catBadgeStyle(cat, categories = []) {
  const color = catColor(cat, categories)
  return {
    background: color + '22',
    color: color,
  }
}

export function statusClass(statut) {
  const map = {
    'Acheté':       'status-achete',
    'En livraison': 'status-livraison',
    'En stock':     'status-stock',
    'Vendu':        'status-vendu',
    'En retour':    'status-retour',
    'Remboursé':    'status-rembourse',
  }
  return map[statut] || 'status-vendu'
}

export function groupByMonth(items, dateKey = 'date_vente') {
  const months = {}
  items.forEach(item => {
    const d = item[dateKey]
    if (!d) return
    const key = d.substring(0, 7)
    if (!months[key]) months[key] = []
    months[key].push(item)
  })
  return months
}

export function formatMonth(yyyymm) {
  if (!yyyymm || !yyyymm.includes('-')) return '?'
  const [y, m] = yyyymm.split('-')
  const names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const idx = parseInt(m) - 1
  if (idx < 0 || idx > 11 || !y) return '?'
  return names[idx] + ' ' + y.slice(2)
}

export const STATUTS = ['Acheté', 'En livraison', 'En stock', 'Vendu', 'En retour', 'Remboursé']

// Calculs pour les lots (quantite_mode)
export function lotAchatTotal(item) {
  if (!item.quantite_mode) return item.prix_achat
  return (item.prix_achat || 0) * (item.quantite_total || 1)
}

export function lotVenteTotal(item, ventesUnitaires) {
  if (!item.quantite_mode) return item.prix_vente
  const ventes = ventesUnitaires.filter(v => v.item_id === item.id)
  if (ventes.length === 0) return null
  return ventes.reduce((s, v) => s + (v.prix_vente || 0), 0)
}

export function lotProfit(item, ventesUnitaires) {
  const achat = lotAchatTotal(item)
  const vente = lotVenteTotal(item, ventesUnitaires)
  if (vente == null) return null
  return vente - achat
}

export function lotNbVendus(item, ventesUnitaires) {
  if (!item.quantite_mode) return item.statut === 'Vendu' ? 1 : 0
  return ventesUnitaires.filter(v => v.item_id === item.id).length
}

export function lotValeurStock(item, ventesUnitaires) {
  if (!item.quantite_mode) return item.statut !== 'Vendu' ? item.prix_achat : 0
  const vendus = lotNbVendus(item, ventesUnitaires)
  const restants = Math.max(0, (item.quantite_total || 1) - vendus)
  return (item.prix_achat || 0) * restants
}
