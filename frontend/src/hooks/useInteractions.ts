import { useState, useCallback } from 'react'
import type { Interaction } from '../types'

const STORAGE_KEY = 'fukan_interactions'

type InteractionMap = Record<string, Interaction>

function loadFromStorage(): InteractionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToStorage(map: InteractionMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

export function useInteractions() {
  const [interactions, setInteractions] = useState<InteractionMap>(loadFromStorage)

  const getInteraction = useCallback(
    (id: string): Interaction =>
      interactions[id] ?? { liked: false, saved: false, reposted: false, followed: false },
    [interactions]
  )

  const toggle = useCallback(
    (id: string, field: keyof Interaction) => {
      setInteractions((prev) => {
        const current = prev[id] ?? { liked: false, saved: false, reposted: false, followed: false }
        const updated = { ...prev, [id]: { ...current, [field]: !current[field] } }
        saveToStorage(updated)
        return updated
      })
    },
    []
  )

  return {
    getInteraction,
    toggleLike:    (id: string) => toggle(id, 'liked'),
    toggleSave:    (id: string) => toggle(id, 'saved'),
    toggleRepost:  (id: string) => toggle(id, 'reposted'),
    toggleFollow:  (id: string) => toggle(id, 'followed'),
  }
}
