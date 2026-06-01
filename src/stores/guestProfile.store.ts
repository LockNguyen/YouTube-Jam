import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GuestProfile } from '@/types/song'
import { getLocalProfile, saveLocalProfile } from '@/services/guestProfile.local'

export const useGuestProfileStore = defineStore('guestProfile', () => {
  const profile = ref<GuestProfile | null>(getLocalProfile())

  const hasCompleteProfile = computed(() => {
    return (
      profile.value !== null &&
      profile.value.name.trim().length > 0 &&
      profile.value.color.trim().length > 0
    )
  })

  function updateProfile(name: string, color: string) {
    profile.value = saveLocalProfile(name, color)
  }

  return {
    profile,
    hasCompleteProfile,
    updateProfile,
  }
})
