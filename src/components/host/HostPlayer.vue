<script setup lang="ts">
import { watch, onMounted, onUnmounted, ref } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useHostActions } from '@/composables/useHostActions'
import { useYouTubePlayer } from '@/composables/useYoutubePlayer'
import { usePerformanceIntro } from '@/composables/usePerformanceIntro'
import EmptyState from '@/components/common/EmptyState.vue'
import PerformanceIntroOverlay from '@/components/host/PerformanceIntroOverlay.vue'

const store = useQueueStore()
const hostActions = useHostActions()
const { setNowPlaying, skip } = hostActions

const PLAYER_ID = 'yt-player'
const hasPlaybackError = ref(false)

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
})

const { isReady, isPlaying, init, loadVideo, play, pause, restart } = ytPlayer
const { introState, startIntro, skipIntro, stopIntro } = usePerformanceIntro(ytPlayer)

// Expose controls to parent via defineExpose
defineExpose({ play, pause, restart, isPlaying, isReady })

const lastIntroSongId = ref<string | null>(null)

function handleSkipIntro() {
  skipIntro()
}

async function handleManualSkip() {
  await skip()
}

// Load video and optionally run intro when currentSong changes
watch(
  () => store.currentSongId,
  (newSongId) => {
    hasPlaybackError.value = false
    if (!newSongId) {
      stopIntro()
      return
    }
    if (!isReady.value) return
    const song = store.currentSong
    if (!song) return

    loadVideo(song.videoId)

    if (store.performanceMode && newSongId !== lastIntroSongId.value) {
      lastIntroSongId.value = newSongId
      startIntro(newSongId)
    } else {
      stopIntro()
    }
  },
)

// Also watch isReady — load initial song once player is ready
watch(isReady, (ready) => {
  if (ready && store.currentSongId) {
    hasPlaybackError.value = false
    const song = store.currentSong
    if (song) {
      loadVideo(song.videoId)

      if (store.performanceMode && store.currentSongId !== lastIntroSongId.value) {
        lastIntroSongId.value = store.currentSongId
        startIntro(store.currentSongId)
      } else {
        stopIntro()
      }
    }
  }
})

onMounted(async () => {
  await init(PLAYER_ID)
})

onUnmounted(() => {
  stopIntro()
})
</script>

<template>
  <div class="relative h-full w-full bg-black transition-all duration-1500 ease-in-out"
    :class="introState.isZoomed ? 'scale-200 translate-y-1/4' : 'scale-100 translate-y-0'">
    <!-- YouTube player container -->
    <div :id="PLAYER_ID" class="absolute inset-0 h-full w-full" />

    <!-- Playback error fallback overlay -->
    <div
      v-if="hasPlaybackError && store.currentSong"
      class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center"
    >
      <span class="text-5xl">⚠️</span>
      <h2 class="mt-4 text-lg font-semibold text-white">Playback Blocked on YouTube</h2>
      <p class="mt-2 max-w-sm text-xs text-zinc-400">
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
  </div>
</template>
