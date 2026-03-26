import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, userId, email } = req.body

  try {
    if (action === 'approve') {
      await supabase.from('pending_users').update({ status: 'approved' }).eq('user_id', userId)
      return res.status(200).json({ success: true })
    }

    if (action === 'reject') {
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('pending_users').delete().eq('user_id', userId)
      return res.status(200).json({ success: true })
    }

    if (action === 'list') {
      const { data } = await supabase.from('pending_users').select('*').order('created_at', { ascending: false })
      return res.status(200).json({ users: data || [] })
    }

    if (action === 'register') {
      await supabase.from('pending_users').upsert({ user_id: userId, email, status: 'pending' })
      return res.status(200).json({ success: true })
    }

    if (action === 'check') {
      // Check if user is approved
      const { data } = await supabase.from('pending_users').select('status').eq('user_id', userId).single()
      return res.status(200).json({ status: data?.status || 'pending' })
    }

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
