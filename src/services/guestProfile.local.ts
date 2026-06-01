import type { GuestProfile } from '@/types/song'

const STORAGE_KEY = 'karaoke_guest_profile_v1'

export function getLocalProfile(): GuestProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    
    const parsed = JSON.parse(raw) as Partial<GuestProfile>
    if (!parsed.guestId || !parsed.name || !parsed.color) {
      return null
    }
    
    return parsed as GuestProfile
  } catch {
    return null
  }
}

export function saveLocalProfile(name: string, color: string): GuestProfile {
  const existing = getLocalProfile()
  // Ensure the user keeps the same guestId across browser sessions
  const guestId = existing?.guestId || crypto.randomUUID()
  
  const profile: GuestProfile = { 
    guestId, 
    name: name.trim(), 
    color 
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  return profile
}
