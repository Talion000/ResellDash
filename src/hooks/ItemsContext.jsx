import { createContext, useContext } from 'react'
import { useItems } from './useItems'

const ItemsContext = createContext(null)

export function ItemsProvider({ children }) {
  const value = useItems()
  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>
}

export function useItemsContext() {
  return useContext(ItemsContext)
}
