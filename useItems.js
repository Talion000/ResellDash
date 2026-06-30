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

  useEffect(() => {
    fetchItems()
    fetchCategories()
    fetchVentesUnitaires()
  }, [fetchItems, fetchCategories, fetchVentesUnitaires])

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
    if (!error) setItems(prev => prev.filter(i => i.id !== id))
    return { error }
  }

  const duplicateItem = async (item) => {
    const { id, created_at, updated_at, ...rest } = item
    return addItem({ ...rest, statut: 'En stock', prix_vente: null, date_vente: null, quantite_mode: false, quantite_total: 1 })
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

  const addVenteUnitaire = async (itemId, prixVente, dateVente, notes) => {
    const { data, error } = await supabase
      .from('ventes_unitaires')
      .insert([{ item_id: itemId, user_id: user.id, prix_vente: prixVente, date_vente: dateVente || null, notes: notes || null }])
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

  // ===== Preuves de vente (photos colis/bordereau + acheteur) =====
  const [preuves, setPreuves] = useState([])

  const fetchPreuves = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('preuves_ventes')
      .select('*')
      .eq('user_id', user.id)
    if (data) setPreuves(data)
  }, [user])

  useEffect(() => { fetchPreuves() }, [fetchPreuves])

  const getPreuve = useCallback((itemId, venteUnitaireId = null) =>
    preuves.find(p => p.item_id === itemId && (p.vente_unitaire_id || null) === (venteUnitaireId || null))
  , [preuves])

  const savePreuve = async ({ itemId, venteUnitaireId = null, acheteur, notes, photos }) => {
    const existing = getPreuve(itemId, venteUnitaireId)
    const payload = {
      item_id: itemId,
      vente_unitaire_id: venteUnitaireId || null,
      acheteur: acheteur || null,
      notes: notes || null,
      photos: photos || [],
      user_id: user.id,
    }
    if (existing) {
      const { data, error } = await supabase
        .from('preuves_ventes')
        .update(payload)
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select()
        .single()
      if (!error) setPreuves(prev => prev.map(p => p.id === existing.id ? data : p))
      return { data, error }
    } else {
      const { data, error } = await supabase
        .from('preuves_ventes')
        .insert([payload])
        .select()
        .single()
      if (!error) setPreuves(prev => [...prev, data])
      return { data, error }
    }
  }

  const deletePreuve = async (id) => {
    const { error } = await supabase
      .from('preuves_ventes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) setPreuves(prev => prev.filter(p => p.id !== id))
    return { error }
  }

  const uploadPreuvePhoto = async (file, itemId, venteUnitaireId = null) => {
    const folder = `${user.id}/${itemId}/${venteUnitaireId || 'vente'}`
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const { error } = await supabase.storage.from('preuves').upload(path, file, { contentType: 'image/jpeg' })
    if (error) return { path: null, error }
    return { path, error: null }
  }

  const getPreuvePhotoUrl = async (path) => {
    const { data, error } = await supabase.storage.from('preuves').createSignedUrl(path, 3600)
    if (error) return null
    return data?.signedUrl || null
  }

  const deletePreuvePhoto = async (path) => {
    return supabase.storage.from('preuves').remove([path])
  }

  return {
    items, categories, ventesUnitaires, abonnements, loading,
    addItem, updateItem, deleteItem, duplicateItem,
    addCategory, fetchItems, fetchCategories,
    addVenteUnitaire, updateVenteUnitaire, deleteVenteUnitaire, getVentesForItem,
    addAbonnement, updateAbonnement, deleteAbonnement,
    preuves, fetchPreuves, getPreuve, savePreuve, deletePreuve,
    uploadPreuvePhoto, getPreuvePhotoUrl, deletePreuvePhoto,
  }
}
