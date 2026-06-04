import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ref as dbRef, onValue, off } from 'firebase/database'
import { database } from '@/services/firebase.client'
import type { Song, QueueState } from '@/types/song'

export const useQueueStore = defineStore('queue', () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const roomId = ref<string | null>(null)
  const songs = ref<Song[]>([])
  const currentSongId = ref<string | null>(null)
  const performanceMode = ref<boolean>(false)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  // ─── Firebase refs ───────────────────────────────────────────────────────────
  let songsDbRef: any = null
  let stateDbRef: any = null

  // ─── Subscription ───────────────────────────────────────────────────────────
  function subscribe(id: string) {
    if (roomId.value && roomId.value !== id) {
      unsubscribe()
    }
    roomId.value = id
    isLoading.value = true
    error.value = null

    songsDbRef = dbRef(database, `rooms/${id}/songs`)
    stateDbRef = dbRef(database, `rooms/${id}/state`)

    // Listen to all songs
    onValue(
      songsDbRef,
      (snapshot) => {
        isLoading.value = false
        const raw = snapshot.val() as Record<string, Omit<Song, 'id'>> | null
        if (!raw) {
          songs.value = []
          return
        }
        songs.value = Object.entries(raw).map(([id, data]) => ({
          id,
          ...data,
        }))
      },
      (err) => {
        isLoading.value = false
        error.value = err.message
      },
    )

    // Listen to queue state
    onValue(
      stateDbRef,
      (snapshot) => {
        const raw = snapshot.val() as QueueState | null
        currentSongId.value = raw?.currentSongId ?? null
        performanceMode.value = raw?.performanceMode ?? false
      },
      (err) => {
        error.value = err.message
      },
    )
  }

  function unsubscribe() {
    if (songsDbRef) off(songsDbRef)
    if (stateDbRef) off(stateDbRef)
    songsDbRef = null
    stateDbRef = null
    roomId.value = null
  }

  // ─── Computed getters ────────────────────────────────────────────────────────
  const currentSong = computed(() => {
    if (!currentSongId.value) return null
    return songs.value.find((s) => s.id === currentSongId.value) ?? null
  })

  const queuedSongs = computed(() =>
    songs.value.filter((s) => s.status === 'queued').sort((a, b) => a.order - b.order),
  )

  const playedSongs = computed(() => songs.value.filter((s) => s.status === 'played'))

  const skippedSongs = computed(() => songs.value.filter((s) => s.status === 'skipped'))

  /** All played/skipped songs sorted by most recently ended */
  const historySongs = computed(() =>
    [...playedSongs.value, ...skippedSongs.value].sort(
      (a, b) => (b.endedAt ?? b.startedAt ?? 0) - (a.endedAt ?? a.startedAt ?? 0),
    ),
  )

  /** All non-deleted songs in visible order */
  const visibleSongs = computed(() => songs.value.filter((s) => s.status !== 'deleted'))

  const hasQueuedSongs = computed(() => queuedSongs.value.length > 0)

  const nextSong = computed(() => queuedSongs.value[0] ?? null)

  return {
    // state
    roomId,
    songs,
    currentSongId,
    performanceMode,
    isLoading,
    error,
    // actions
    subscribe,
    unsubscribe,
    // getters
    currentSong,
    queuedSongs,
    playedSongs,
    skippedSongs,
    historySongs,
    visibleSongs,
    hasQueuedSongs,
    nextSong,
  }
})
