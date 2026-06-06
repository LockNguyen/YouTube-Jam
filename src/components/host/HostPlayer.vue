<script setup lang="ts">
import { watch, onMounted, onUnmounted, ref } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useHostActions } from '@/composables/useHostActions'
import { useYouTubePlayer } from '@/composables/useYoutubePlayer'
import { usePerformanceIntro } from '@/composables/usePerformanceIntro'
import { fetchSkipSegments } from '@/services/sponsorBlock'
import EmptyState from '@/components/common/EmptyState.vue'
import PerformanceIntroOverlay from '@/components/host/PerformanceIntroOverlay.vue'

const store = useQueueStore()
const hostActions = useHostActions()
const { setNowPlaying, skip } = hostActions

const PLAYER_ID = 'yt-player'
const hasPlaybackError = ref(false)

// SponsorBlock state variables
const rawSegments = ref<[number, number][]>([])
const songEndLimit = ref<number | null>(null)
const showSkipNotice = ref(false)
const skipNoticeText = ref('')

// Auto-open countdown redirect state
const isAutoOpening = ref(false)
const isPopupBlocked = ref(false)
const isSettingNextSong = ref(false)
const secondsLeft = ref(2)
const countdownInterval = ref<number | null>(null)
const redirectTimeout = ref<number | null>(null)

const ytPlayer = useYouTubePlayer({
  async onEnded() {
    // Auto-advance: mark next queued song as now playing
    const next = store.nextSong
    await setNowPlaying(next?.id ?? null)
  },
  onError(event) {
    console.error('[YouTube Player] Error:', event)
    hasPlaybackError.value = true
  },
  onStateChange(event) {
    handlePlaybackStateChange(event.data)
  },
})

const { isReady, isPlaying, init, loadVideo, play, pause, restart, getDuration, getCurrentTime, seekTo } = ytPlayer
const { introState, songStartOffset, startIntro, skipIntro, stopIntro } = usePerformanceIntro(ytPlayer)

// Expose controls to parent via defineExpose
defineExpose({ play, pause, restart, isPlaying, isReady })

const lastIntroSongId = ref<string | null>(null)
let segmentsProcessed = false
let endSkipTimeout: number | null = null
let skipNoticeTimeout: number | null = null

function clearEndSkipTimeout() {
  if (endSkipTimeout) {
    clearTimeout(endSkipTimeout)
    endSkipTimeout = null
  }
}

function processSegments() {
  if (segmentsProcessed) return
  const duration = getDuration()
  if (duration <= 0) return // Wait until video duration metadata is loaded

  segmentsProcessed = true
  if (rawSegments.value.length === 0) return

  // Filter segments: must strictly be at the start (<= 15s duration) or at the end (<= 60s duration)
  const valid = rawSegments.value.filter(([start, end]) => {
    const len = end - start
    const isStart = start <= 3
    const isEnd = (duration - end) <= 3 || end >= duration

    if (isStart) {
      return len <= 15
    }
    if (isEnd) {
      return len <= 60
    }
    return false
  })

  // Start Skip
  const startSeg = valid.find(([start]) => start <= 3)
  if (startSeg) {
    songStartOffset.value = startSeg[1]
  } else {
    songStartOffset.value = 0
  }

  // End Skip
  const endSeg = valid.find(([, end]) => (duration - end) <= 3 || end >= duration)
  if (endSeg) {
    songEndLimit.value = endSeg[0]
  } else {
    songEndLimit.value = null
  }
}

function triggerSkipNotice(text: string) {
  if (skipNoticeTimeout) {
    clearTimeout(skipNoticeTimeout)
  }
  skipNoticeText.value = text
  showSkipNotice.value = true
  skipNoticeTimeout = window.setTimeout(() => {
    showSkipNotice.value = false
  }, 2500)
}

function handlePlaybackStateChange(state: number) {
  // If the intro is running, do not apply skips or schedule timeouts
  if (introState.value.isRunning) return

  clearEndSkipTimeout()

  const PlayerState = {
    PLAYING: 1,
    PAUSED: 2,
  }

  if (state === PlayerState.PLAYING) {
    processSegments()

    const currentTime = getCurrentTime()

    // 1. Check Start Skip
    if (currentTime < songStartOffset.value) {
      seekTo(songStartOffset.value)
      triggerSkipNotice('Skipped intro ad')

      if (songEndLimit.value !== null) {
        scheduleEndTimeout(songStartOffset.value, songEndLimit.value)
      }
      return
    }

    // 2. Check and schedule End Skip
    if (songEndLimit.value !== null) {
      if (currentTime >= songEndLimit.value) {
        const duration = getDuration()
        seekTo(duration)
        triggerSkipNotice('Skipped outro ad')
      } else {
        scheduleEndTimeout(currentTime, songEndLimit.value)
      }
    }
  }
}

function scheduleEndTimeout(current: number, endLimit: number) {
  clearEndSkipTimeout()
  const remainingMs = (endLimit - current) * 1000
  if (remainingMs <= 0) return

  endSkipTimeout = window.setTimeout(() => {
    const duration = getDuration()
    seekTo(duration)
    triggerSkipNotice('Skipped outro ad')
  }, remainingMs)
}

function handleSkipIntro() {
  if (store.currentSong?.isNonEmbeddable) {
    const youtubeUrl = `https://www.youtube.com/watch?v=${store.currentSong.videoId}`
    let win: Window | null = null
    let blocked = false
    try {
      win = window.open(youtubeUrl, '_blank')
      if (!win || win.closed || typeof win.closed === 'undefined') {
        blocked = true
      }
    } catch (e) {
      // If cross-origin security throws, the window was successfully opened
      blocked = false
    }

    cancelRedirect()
    skipIntro()
    isAutoOpening.value = false
    isPopupBlocked.value = blocked
    hasPlaybackError.value = true
  } else {
    skipIntro()
  }
}

async function handleManualSkip() {
  await skip()
}

// Redirect controller logic
function startRedirectCountdown() {
  cancelRedirect()
  if (!store.currentSong) return

  isAutoOpening.value = true
  secondsLeft.value = 2
  isPopupBlocked.value = false

  const youtubeUrl = `https://www.youtube.com/watch?v=${store.currentSong.videoId}`

  countdownInterval.value = window.setInterval(() => {
    secondsLeft.value -= 1
    if (secondsLeft.value <= 0) {
      if (countdownInterval.value) {
        clearInterval(countdownInterval.value)
        countdownInterval.value = null
      }
    }
  }, 1000)

  redirectTimeout.value = window.setTimeout(() => {
    let win: Window | null = null
    let blocked = false
    try {
      win = window.open(youtubeUrl, '_blank')
      if (!win || win.closed || typeof win.closed === 'undefined') {
        blocked = true
      }
    } catch (e) {
      // If cross-origin security throws, the window was successfully opened
      blocked = false
    }

    isAutoOpening.value = false
    isPopupBlocked.value = blocked
    hasPlaybackError.value = true // Show manual fallback overlay after redirect
  }, 2000)
}

function cancelRedirect() {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }
  if (redirectTimeout.value) {
    clearTimeout(redirectTimeout.value)
    redirectTimeout.value = null
  }
  isAutoOpening.value = false
}

function handleCancelRedirect() {
  cancelRedirect()
  hasPlaybackError.value = true
}

// Watch running intro states to transition to redirect for non-embeddable songs
watch(
  () => introState.value.isRunning,
  (isRunning, wasRunning) => {
    if (wasRunning && !isRunning && store.currentSong?.isNonEmbeddable && !hasPlaybackError.value) {
      startRedirectCountdown()
    }
  }
)

// Load video and optionally run intro when currentSong changes
watch(
  () => store.currentSongId,
  (newSongId) => {
    hasPlaybackError.value = false
    isPopupBlocked.value = false
    rawSegments.value = []
    songStartOffset.value = 0
    songEndLimit.value = null
    segmentsProcessed = false
    clearEndSkipTimeout()
    showSkipNotice.value = false
    cancelRedirect()

    if (!newSongId) {
      stopIntro()
      return
    }

    const song = store.currentSong
    if (!song) return

    if (song.isNonEmbeddable) {
      // Pause/stop current playback if any
      try {
        pause()
      } catch {}

      if (store.performanceMode && newSongId !== lastIntroSongId.value) {
        lastIntroSongId.value = newSongId
        startIntro(newSongId, 0)
      } else {
        stopIntro()
        startRedirectCountdown()
      }
      return
    }

    if (!isReady.value) return

    // Lazy load SponsorBlock segments in the background
    fetchSkipSegments(song.videoId).then((segments) => {
      rawSegments.value = segments
      processSegments()
    })

    loadVideo(song.videoId)

    if (store.performanceMode && newSongId !== lastIntroSongId.value) {
      lastIntroSongId.value = newSongId
      startIntro(newSongId, songStartOffset.value)
    } else {
      stopIntro()
    }
  },
)

// Also watch isReady — load initial song once player is ready
watch(isReady, (ready) => {
  if (ready && store.currentSongId) {
    const song = store.currentSong
    if (song) {
      hasPlaybackError.value = false
      rawSegments.value = []
      songStartOffset.value = 0
      songEndLimit.value = null
      segmentsProcessed = false
      clearEndSkipTimeout()
      showSkipNotice.value = false
      cancelRedirect()

      if (song.isNonEmbeddable) {
        try {
          pause()
        } catch {}

        if (store.performanceMode && store.currentSongId !== lastIntroSongId.value) {
          lastIntroSongId.value = store.currentSongId
          startIntro(store.currentSongId, 0)
        } else {
          stopIntro()
          startRedirectCountdown()
        }
        return
      }

      // Lazy load SponsorBlock segments in the background
      fetchSkipSegments(song.videoId).then((segments) => {
        rawSegments.value = segments
        processSegments()
      })

      loadVideo(song.videoId)

      if (store.performanceMode && store.currentSongId !== lastIntroSongId.value) {
        lastIntroSongId.value = store.currentSongId
        startIntro(store.currentSongId, songStartOffset.value)
      } else {
        stopIntro()
      }
    }
  }
})

// Automatically resume playback if there is no current song and a new song is queued
watch(
  () => store.nextSong,
  async (nextSong) => {
    if (!store.currentSongId && nextSong && !isSettingNextSong.value) {
      isSettingNextSong.value = true
      console.log('[HostPlayer] Auto-resuming queue with new song:', nextSong.title)
      try {
        await setNowPlaying(nextSong.id)
      } catch (err) {
        console.error('[HostPlayer] Failed to auto-resume song:', err)
      } finally {
        isSettingNextSong.value = false
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await init(PLAYER_ID)
})

onUnmounted(() => {
  stopIntro()
  clearEndSkipTimeout()
  cancelRedirect()
  if (skipNoticeTimeout) {
    clearTimeout(skipNoticeTimeout)
  }
})
</script>

<template>
  <div class="relative h-full w-full bg-black transition-all duration-25 ease-in-out"
    :class="introState.isZoomed ? 'scale-200 translate-y-1/4' : 'scale-100 translate-y-0 duration-4000'">
    <!-- YouTube player container -->
    <div :id="PLAYER_ID" class="absolute inset-0 h-full w-full" />

    <!-- Auto-open redirect countdown overlay -->
    <div
      v-if="isAutoOpening && store.currentSong"
      class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center"
    >
      <span class="text-5xl animate-bounce">📺</span>
      <h2 class="mt-4 text-xl font-bold text-white">Opening Video on YouTube</h2>
      <p class="mt-2 max-w-sm text-sm text-zinc-400">
        Redirecting in <span class="font-bold text-purple-400">{{ secondsLeft }}</span> second{{ secondsLeft !== 1 ? 's' : '' }}...
      </p>

      <div class="mt-8 relative pointer-events-auto">
        <button
          @click="handleCancelRedirect"
          class="relative overflow-hidden inline-flex h-12 w-48 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-bold text-white hover:bg-zinc-850 hover:border-zinc-700 transition active:scale-95"
        >
          <span class="relative z-10">Cancel</span>
          <!-- Shrinking progress bar background -->
          <div class="absolute bottom-0 left-0 h-1 bg-purple-500/80 animate-progress-shrink" />
        </button>
      </div>
    </div>

    <!-- Playback error fallback overlay -->
    <div
      v-if="hasPlaybackError && store.currentSong && !isAutoOpening"
      class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center"
    >
      <span class="text-5xl">⚠️</span>
      <h2 class="mt-4 text-lg font-semibold text-white">Playback Blocked on YouTube</h2>
      
      <div v-if="isPopupBlocked" class="mt-3 max-w-md rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
        <p class="font-bold mb-1">Pop-up Blocked by Browser</p>
        <p>We tried to open the video in a new tab, but your browser blocked it. Please enable pop-ups for this site, or click the button below to open it manually.</p>
      </div>
      <p v-else class="mt-2 max-w-sm text-xs text-zinc-400">
        This video might have embedding disabled by the publisher, or is unavailable in embeds. Open it directly on YouTube:
      </p>

      <div class="mt-6 flex gap-3 pointer-events-auto">
        <a
          :href="`https://www.youtube.com/watch?v=${store.currentSong.videoId}`"
          target="_blank"
          class="inline-flex h-9 items-center justify-center rounded-md bg-purple-600 px-4 text-xs font-semibold text-white hover:bg-purple-500 transition-colors"
        >
          Open on YouTube ↗
        </a>
        <button
          @click="handleManualSkip"
          class="inline-flex h-9 items-center justify-center rounded-md border border-zinc-700 bg-transparent px-4 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Skip Song
        </button>
      </div>
    </div>

    <!-- Empty state overlay when nothing is playing -->
    <div
      v-if="!store.currentSong && isReady"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80"
    >
      <EmptyState description="Add songs from the guest page to get started">
        <template #icon>🎤</template>
        <template #title>Queue is empty</template>
      </EmptyState>
    </div>

    <!-- Performance Intro Overlay -->
    <PerformanceIntroOverlay
      v-if="store.currentSong"
      :song-title="store.currentSong.title ?? 'Unknown Song'"
      :performer-name="store.currentSong.submittedByName || 'Surprise Performer'"
      :is-running="introState.isRunning"
      :is-dimmed="introState.isDimmed"
      :is-title-visible="introState.isTitleVisible"
      :is-artist-visible="introState.isArtistVisible"
      @skip="handleSkipIntro"
    />

    <!-- SponsorBlock Skip Notice -->
    <div
      v-if="showSkipNotice"
      class="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-zinc-950/90 border border-purple-500/50 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300"
    >
      <span>✨</span>
      <span>{{ skipNoticeText }}</span>
    </div>
  </div>
</template>

<style scoped>
@keyframes progress-shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
.animate-progress-shrink {
  animation: progress-shrink 2s linear forwards;
}
</style>
