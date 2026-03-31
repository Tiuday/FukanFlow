import { useState, useCallback } from 'react'

const STORAGE_KEY = 'fukan_profile'

export interface Profile {
  avatarSeed: string | null
}

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { avatarSeed: null }
  } catch {
    return { avatarSeed: null }
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(loadProfile)

  const setAvatar = useCallback((seed: string) => {
    setProfile((prev) => {
      const updated = { ...prev, avatarSeed: seed }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  return { profile, setAvatar }
}
