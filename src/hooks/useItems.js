import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const DEFAULT_CATEGORIES = [
  { name: 'Sneakers', color: '#3b82f6' },
  { name: 'Pokémon', color: '#f97316' },
  { name: 'Random', color: '#22c55e' },
]

export function useItems() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
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
      // Insert default categories on first login
      const { data: inserted } = await supabase
        .from('categories')
        .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id })))
        .select()
      setCategories(inserted || DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: i, user_id: user.id })))
    } else {
      setCategories(data)
    }
  }, [user])

  useEffect(() => {
    fetchItems()
    fetchCategories()
  }, [fetchItems, fetchCategories])

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
    return addItem({ ...rest, statut: 'En stock', prix_vente: null, date_vente: null })
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

  return {
    items, categories, loading,
    addItem, updateItem, deleteItem, duplicateItem,
    addCategory, fetchItems, fetchCategories
  }
}
