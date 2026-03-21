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
  'Sneakers': '#3b82f6',   // bleu
  'Pokémon':  '#f59e0b',   // jaune/or
  'Random':   '#a855f7',   // violet
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
  const [y, m] = yyyymm.split('-')
  const names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  return names[parseInt(m) - 1] + ' ' + y.slice(2)
}

export const STATUTS = ['Acheté', 'En livraison', 'En stock', 'Vendu', 'En retour', 'Remboursé']
