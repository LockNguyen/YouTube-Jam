import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import * as queueApi from '@/services/queue.api'
import type { ReorderDirection } from '@/types/queue'

export function useHostActions() {
  const route = useRoute()

  // Store the host key in memory only — never persisted to localStorage
  const hostKey = computed(() => {
    const key = route.query['key']
    return typeof key === 'string' && key.length > 0 ? key : null
  })

  const isAuthorized = computed(() => hostKey.value !== null)

  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  async function run<T>(fn: (key: string) => Promise<{ ok: boolean; error?: string; data?: T }>) {
    if (!hostKey.value) {
      lastError.value = 'Not authorized'
      return null
    }
    isLoading.value = true
    lastError.value = null
    try {
      const result = await fn(hostKey.value)
      if (!result.ok) {
        lastError.value = result.error ?? 'Unknown error'
        return null
      }
      return result.data ?? null
    } finally {
      isLoading.value = false
    }
  }

  return {
    hostKey,
    isAuthorized,
    isLoading,
    lastError,

    skip: () => run((k) => queueApi.skipSong(k)),
    previous: () => run((k) => queueApi.previousSong(k)),
    clearQueue: () => run((k) => queueApi.clearQueue(k)),
    deleteSong: (songId: string) => run((k) => queueApi.deleteSong(k, songId)),
    reorderSong: (songId: string, direction: ReorderDirection) =>
      run((k) => queueApi.reorderQueue(k, songId, direction)),
    setNowPlaying: (songId: string | null) => run((k) => queueApi.setNowPlaying(k, songId)),
    setPerformanceMode: (enabled: boolean) => run((k) => queueApi.setPerformanceMode(k, enabled)),
  }
}
