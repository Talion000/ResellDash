import Imap from 'imap'
import { simpleParser } from 'mailparser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Mots-clés pour détecter le statut
const STATUS_KEYWORDS = {
  'Acheté': [
    'confirmation de commande', 'commande confirmée', 'votre commande a été',
    'order confirmation', 'merci pour votre commande', 'commande reçue',
    'votre commande est enregistrée'
  ],
  'En livraison': [
    'expédié', 'en transit', 'en cours de livraison', 'votre colis est en route',
    'votre colis est en transit', 'mise à jour du suivi', 'pris en charge',
    'shipped', 'dispatched', 'on its way', 'votre commande est en cours',
    'mise à jour de votre commande', 'votre commande a été expédiée'
  ],
  'En stock': [
    'livré', 'delivered', 'colis remis', 'votre colis a été livré',
    'livraison effectuée', 'remis à', 'déposé'
  ]
}

// Plateformes connues
const PLATFORMS = [
  'zalando', 'amazon', 'snkrs', 'nike', 'adidas', 'fnac', 'zara',
  'uniqlo', 'asos', 'footlocker', 'size', 'footdistrict', 'bstn',
  'svd', 'ticketmaster', 'vinted', 'stockx', 'klekt'
]

function detectStatus(subject, text) {
  const content = (subject + ' ' + text).toLowerCase()
  for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
    if (keywords.some(k => content.includes(k))) return status
  }
  return null
}

function detectPlatform(from, subject) {
  const content = (from + ' ' + subject).toLowerCase()
  return PLATFORMS.find(p => content.includes(p)) || null
}

function extractOrderInfo(subject, text) {
  // Extract order number
  const orderMatch = text.match(/(?:commande|order|n°|#)\s*([A-Z0-9\-]{6,20})/i)
  const orderNum = orderMatch ? orderMatch[1] : null

  // Extract price
  const priceMatch = text.match(/(\d+[,.]?\d*)\s*€/)
  const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null

  return { orderNum, price }
}

async function fetchEmails(config) {
  return new Promise((resolve, reject) => {
    const imap = new Imap(config)
    const results = []

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) { imap.end(); return resolve([]) }

        // Search emails from last 4 hours
        const since = new Date(Date.now() - 4 * 60 * 60 * 1000)
        imap.search([['SINCE', since]], (err, uids) => {
          if (err || !uids.length) { imap.end(); return resolve([]) }

          const fetch = imap.fetch(uids.slice(-50), { bodies: '' })
          const promises = []

          fetch.on('message', (msg) => {
            promises.push(new Promise(res => {
              let buffer = ''
              msg.on('body', (stream) => {
                stream.on('data', chunk => buffer += chunk.toString('utf8'))
                stream.once('end', async () => {
                  try {
                    const parsed = await simpleParser(buffer)
                    res({
                      subject: parsed.subject || '',
                      from: parsed.from?.text || '',
                      text: parsed.text || '',
                      date: parsed.date || new Date(),
                    })
                  } catch { res(null) }
                })
              })
            }))
          })

          fetch.once('end', async () => {
            const emails = (await Promise.all(promises)).filter(Boolean)
            imap.end()
            resolve(emails)
          })
        })
      })
    })

    imap.once('error', () => { resolve([]) })
    imap.connect()
  })
}

async function processEmails(emails, userId) {
  const updates = []

  for (const email of emails) {
    const status = detectStatus(email.subject, email.text)
    if (!status) continue

    const platform = detectPlatform(email.from, email.subject)
    const { orderNum, price } = extractOrderInfo(email.subject, email.text)

    // Try to find matching item in DB
    let query = supabase.from('items').select('*').eq('user_id', userId)
    if (platform) query = query.ilike('plateforme_achat', `%${platform}%`)

    const { data: items } = await query
      .not('statut', 'eq', 'Vendu')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!items?.length) continue

    // Find best match by platform and recent date
    const match = items[0]

    // Only update if status is "more advanced"
    const statusOrder = ['Acheté', 'En livraison', 'En stock', 'Vendu']
    const currentIdx = statusOrder.indexOf(match.statut)
    const newIdx = statusOrder.indexOf(status)

    if (newIdx > currentIdx) {
      updates.push({
        id: match.id,
        old_status: match.statut,
        new_status: status,
        platform,
        subject: email.subject,
      })
      await supabase.from('items').update({ statut: status }).eq('id', match.id)
    }
  }

  return updates
}

export default async function handler(req, res) {
  // Allow cron job or manual trigger
  const authHeader = req.headers.authorization
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const gmailEmail = process.env.GMAIL_EMAIL
    const gmailPass = process.env.GMAIL_PASSWORD_APP
    const icloudEmail = process.env.ICLOUD_EMAIL
    const icloudPass = process.env.ICLOUD_PASSWORD_APP

    if (!gmailEmail || !gmailPass) {
      return res.status(400).json({ error: 'Gmail credentials manquantes' })
    }

    // Get all users to process
    const { data: users } = await supabase.auth.admin.listUsers()
    if (!users?.users?.length) return res.status(200).json({ message: 'No users' })

    const allUpdates = []

    for (const user of users.users) {
      // Fetch Gmail
      const gmailEmails = await fetchEmails({
        user: gmailEmail,
        password: gmailPass,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      })

      const gmailUpdates = await processEmails(gmailEmails, user.id)
      allUpdates.push(...gmailUpdates)

      // Fetch iCloud if configured
      if (icloudEmail && icloudPass) {
        const icloudEmails = await fetchEmails({
          user: icloudEmail,
          password: icloudPass,
          host: 'imap.mail.me.com',
          port: 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false }
        })
        const icloudUpdates = await processEmails(icloudEmails, user.id)
        allUpdates.push(...icloudUpdates)
      }
    }

    return res.status(200).json({
      success: true,
      updates: allUpdates.length,
      details: allUpdates
    })

  } catch (e) {
    console.error('Email check error:', e)
    return res.status(500).json({ error: e.message })
  }
}
