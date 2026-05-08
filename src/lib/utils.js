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

export const CAT_COLORS_DEFAULT = {
  'Sneakers': '#a855f7',
  'Pokémon':  '#f59e0b',
  'Random':   '#ec4899',
}

export function catColor(cat, categories = []) {
  const found = categories.find(c => c.name === cat)
  if (found) return found.color
  return CAT_COLORS_DEFAULT[cat] || '#888'
}

export function catBadgeStyle(cat, categories = []) {
  const color = catColor(cat, categories)
  return { background: color + '22', color }
}

export function statusClass(statut) {
  const map = {
    'Acheté':       'status-achete',
    'En livraison': 'status-livraison',
    'En stock':     'status-stock',
    'Vendu':        'status-vendu',
    'Remboursé':    'status-rembourse',
    'Hold':         'status-hold',
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

export const STATUTS = ['Acheté', 'En livraison', 'En stock', 'Vendu', 'Remboursé', 'Hold']

// ─── Calculs lots (quantite_mode) ─────────────────────────────────────────────

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

// ─── Calculs fiche_mode (multi-achats) ────────────────────────────────────────

// Coût total de tous les achats d'une fiche
export function ficheAchatTotal(itemAchats) {
  return itemAchats.reduce((s, a) => s + (a.prix_unitaire || 0) * (a.quantite || 1), 0)
}

// Total des ventes d'une fiche (via ventes_unitaires liées à ses achats)
export function ficheVenteTotal(itemAchats, ventesUnitaires) {
  const achatIds = new Set(itemAchats.map(a => a.id))
  const ventes = ventesUnitaires.filter(v => achatIds.has(v.achat_id))
  if (ventes.length === 0) return null
  return ventes.reduce((s, v) => s + (v.prix_vente || 0), 0)
}

// Profit total d'une fiche
export function ficheProfit(itemAchats, ventesUnitaires) {
  const achat = ficheAchatTotal(itemAchats)
  const vente = ficheVenteTotal(itemAchats, ventesUnitaires)
  if (vente == null) return null
  return vente - achat
}

// Nombre total d'unités dans une fiche
export function ficheQuantiteTotal(itemAchats) {
  return itemAchats.reduce((s, a) => s + (a.quantite || 1), 0)
}

// Nombre d'unités vendues dans une fiche
export function ficheNbVendus(itemAchats, ventesUnitaires) {
  const achatIds = new Set(itemAchats.map(a => a.id))
  return ventesUnitaires.filter(v => achatIds.has(v.achat_id) && (!v.statut || v.statut === 'Vendu')).length
}

// Nombre d'unités en hold dans une fiche
export function ficheNbHold(itemAchats, ventesUnitaires) {
  const achatIds = new Set(itemAchats.map(a => a.id))
  return ventesUnitaires.filter(v => achatIds.has(v.achat_id) && v.statut === 'Hold').length
}

// Valeur stock restante d'une fiche
export function ficheValeurStock(itemAchats, ventesUnitaires) {
  const achatIds = new Set(itemAchats.map(a => a.id))
  const ventesActives = ventesUnitaires.filter(v => achatIds.has(v.achat_id))
  let stockVal = 0
  for (const achat of itemAchats) {
    const utilisees = ventesActives.filter(v => v.achat_id === achat.id).length
    const restantes = Math.max(0, (achat.quantite || 1) - utilisees)
    stockVal += restantes * (achat.prix_unitaire || 0)
  }
  return stockVal
}

// Ventes d'un achat spécifique
export function ventesForAchat(achatId, ventesUnitaires) {
  return ventesUnitaires.filter(v => v.achat_id === achatId)
}

// Unités restantes (non utilisées) pour un achat
export function achatRestants(achat, ventesUnitaires) {
  const utilisees = ventesUnitaires.filter(v => v.achat_id === achat.id).length
  return Math.max(0, (achat.quantite || 1) - utilisees)
}
