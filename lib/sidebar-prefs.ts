"use client"

import { useCallback, useEffect, useState } from "react"

// Preferências da barra lateral, persistidas no navegador (localStorage).
// - favorites: lista de hrefs de módulos fixados, na ordem em que foram fixados.
// - openGroups: mapa label-do-grupo -> aberto/fechado. Ausente = aberto (default).

const FAV_KEY = "fp-sidebar-favorites"
const GROUPS_KEY = "fp-sidebar-groups"

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignora quotas/modo privado */
  }
}

export interface SidebarPrefs {
  ready: boolean
  favorites: string[]
  isFavorite: (href: string) => boolean
  toggleFavorite: (href: string) => void
  isGroupOpen: (label: string) => boolean
  toggleGroup: (label: string) => void
}

export function useSidebarPrefs(): SidebarPrefs {
  const [favorites, setFavorites] = useState<string[]>([])
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [ready, setReady] = useState(false)

  // Carrega uma vez no mount (evita mismatch de hidratação: SSR e o primeiro
  // render do cliente usam os defaults vazios; só depois lemos o localStorage).
  useEffect(() => {
    setFavorites(readJSON<string[]>(FAV_KEY, []))
    setOpenGroups(readJSON<Record<string, boolean>>(GROUPS_KEY, {}))
    setReady(true)
  }, [])

  const toggleFavorite = useCallback((href: string) => {
    setFavorites((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
      writeJSON(FAV_KEY, next)
      return next
    })
  }, [])

  const isFavorite = useCallback((href: string) => favorites.includes(href), [favorites])

  const isGroupOpen = useCallback(
    (label: string) => openGroups[label] !== false, // ausente => aberto
    [openGroups],
  )

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((prev) => {
      const currentlyOpen = prev[label] !== false
      const next = { ...prev, [label]: !currentlyOpen }
      writeJSON(GROUPS_KEY, next)
      return next
    })
  }, [])

  return { ready, favorites, isFavorite, toggleFavorite, isGroupOpen, toggleGroup }
}
