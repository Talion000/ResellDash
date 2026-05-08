import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const DEFAULT_CATEGORIES = [
  { name: 'Sneakers', color: '#a855f7' },
  { name: 'Pokémon', color: '#f59e0b' },
  { name: 'Random', color: '#ec4899' },
]

export function useItems() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [ventesUnitaires, setVentesUnitaires] = useState([])
  const [achats, setAchats] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setItems(data || [])
    setLoading(false)
  }, [user])

  const fetchCategories = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    if (!data || data.length === 0) {
      const { data: inserted } = await supabase
        .from('categories')
        .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id })))
        .select()
      setCategories(inserted || DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: i, user_id: user.id })))
    } else {
      setCategories(data)
    }
  }, [user])

  const fetchVentesUnitaires = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('ventes_unitaires')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setVentesUnitaires(data)
  }, [user])

  const fetchAchats = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('achats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setAchats(data)
  }, [user])

  useEffect(() => {
    fetchItems()
    fetchCategories()
    fetchVentesUnitaires()
    fetchAchats()
  }, [fetchItems, fetchCategories, fetchVentesUnitaires, fetchAchats])

  const addItem = async (item) => {
    const { data, error } = await supabase
      .from('items')
      .insert([{ ...item, user_id: user.id }])
      .select()
      .single()
    if (!error) {
      setItems(prev => [data, ...prev])
      return { data, error: null }
    }
    return { data: null, error }
  }

  const updateItem = async (id, updates) => {
    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (!error) {
      setItems(prev => prev.map(i => i.id === id ? data : i))
      return { data, error: null }
    }
    return { data: null, error }
  }

  const deleteItem = async (id) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id))
      setAchats(prev => prev.filter(a => a.item_id !== id))
    }
    return { error }
  }

  const duplicateItem = async (item) => {
    const { id, created_at, updated_at, ...rest } = item
    return addItem({ ...rest, statut: 'En stock', prix_vente: null, date_vente: null, quantite_mode: false, quantite_total: 1, fiche_mode: false })
  }

  const addCategory = async (name, color) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, color, user_id: user.id }])
      .select()
      .single()
    if (!error) {
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return { data, error: null }
    }
    return { data: null, error }
  }

  // Ventes unitaires
  const addVenteUnitaire = async (itemId, prixVente, dateVente, notes, achatId = null) => {
    const { data, error } = await supabase
      .from('ventes_unitaires')
      .insert([{
        item_id: itemId,
        user_id: user.id,
        prix_vente: prixVente,
        date_vente: dateVente || null,
        notes: notes || null,
        achat_id: achatId || null,
      }])
      .select()
      .single()
    if (!error) {
      setVentesUnitaires(prev => [data, ...prev])
      return { data, error: null }
    }
    return { data: null, error }
  }

  const updateVenteUnitaire = async (id, updates) => {
    const { data, error } = await supabase
      .from('ventes_unitaires')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (!error) setVentesUnitaires(prev => prev.map(v => v.id === id ? data : v))
    return { data, error }
  }

  const deleteVenteUnitaire = async (id) => {
    const { error } = await supabase
      .from('ventes_unitaires')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) setVentesUnitaires(prev => prev.filter(v => v.id !== id))
    return { error }
  }

  const getVentesForItem = (itemId) => ventesUnitaires.filter(v => v.item_id === itemId)
  const getVentesForAchat = (achatId) => ventesUnitaires.filter(v => v.achat_id === achatId)

  // Achats (fiche_mode)
  const addAchat = async (itemId, { quantite, prix_unitaire, date_achat, plateforme, notes }) => {
    const { data, error } = await supabase
      .from('achats')
      .insert([{
        item_id: itemId,
        user_id: user.id,
        quantite: parseInt(quantite) || 1,
        prix_unitaire: parseFloat(prix_unitaire),
        date_achat: date_achat || null,
        plateforme: plateforme || null,
        notes: notes || null,
      }])
      .select()
      .single()
    if (!error) {
      setAchats(prev => [data, ...prev])
      return { data, error: null }
    }
    return { data: null, error }
  }

  const updateAchat = async (id, updates) => {
    const { data, error } = await supabase
      .from('achats')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (!error) setAchats(prev => prev.map(a => a.id === id ? data : a))
    return { data, error }
  }

  const deleteAchat = async (id) => {
    const { error } = await supabase
      .from('achats')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) setAchats(prev => prev.filter(a => a.id !== id))
    return { error }
  }

  const getAchatsForItem = (itemId) => achats.filter(a => a.item_id === itemId)

  // Abonnements
  const [abonnements, setAbonnements] = useState([])

  const fetchAbonnements = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('abonnements').select('*').eq('user_id', user.id).order('nom')
    if (data) setAbonnements(data)
  }, [user])

  useEffect(() => { fetchAbonnements() }, [fetchAbonnements])

  const addAbonnement = async (nom, montant) => {
    const { data, error } = await supabase
      .from('abonnements')
      .insert([{ nom, montant: parseFloat(montant), user_id: user.id }])
      .select().single()
    if (!error) setAbonnements(prev => [...prev, data].sort((a,b) => a.nom.localeCompare(b.nom)))
    return { data, error }
  }

  const updateAbonnement = async (id, updates) => {
    const { data, error } = await supabase
      .from('abonnements').update(updates).eq('id', id).eq('user_id', user.id).select().single()
    if (!error) setAbonnements(prev => prev.map(a => a.id === id ? data : a))
    return { data, error }
  }

  const deleteAbonnement = async (id) => {
    const { error } = await supabase.from('abonnements').delete().eq('id', id).eq('user_id', user.id)
    if (!error) setAbonnements(prev => prev.filter(a => a.id !== id))
    return { error }
  }

  return {
    items, categories, ventesUnitaires, achats, abonnements, loading,
    addItem, updateItem, deleteItem, duplicateItem,
    addCategory, fetchItems, fetchCategories,
    addVenteUnitaire, updateVenteUnitaire, deleteVenteUnitaire, getVentesForItem, getVentesForAchat,
    addAchat, updateAchat, deleteAchat, getAchatsForItem,
    addAbonnement, updateAbonnement, deleteAbonnement,
  }
}
