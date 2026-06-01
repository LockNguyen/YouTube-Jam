<script setup lang="ts">
import { watch, onMounted, onUnmounted, ref } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useHostActions } from '@/composables/useHostActions'
import { useYouTubePlayer } from '@/composables/useYoutubePlayer'
import { usePerformanceIntro } from '@/composables/usePerformanceIntro'
import EmptyState from '@/components/common/EmptyState.vue'
import PerformanceIntroOverlay from '@/components/host/PerformanceIntroOverlay.vue'

const store = useQueueStore()
const { setNowPlaying } = useHostActions()

const PLAYER_ID = 'yt-player'

const ytPlayer = useYouTubePlayer({
  async onEnded() {
    // Auto-advance: mark next queued song as now playing
    const next = store.nextSong
    await setNowPlaying(next?.id ?? null)
  },
  onError(event) {
    console.error('[YouTube Player] Error:', event)
  },
})

const { isReady, isPlaying, init, loadVideo, play, pause, restart } = ytPlayer
const { introState, startIntro, skipIntro } = usePerformanceIntro(ytPlayer)

// Expose controls to parent via defineExpose
defineExpose({ play, pause, restart, isPlaying, isReady })

const lastIntroSongId = ref<string | null>(null)

function handleSkipIntro() {
  skipIntro()
}

// Load video and optionally run intro when currentSong changes
watch(
  () => store.currentSongId,
  (newSongId) => {
    if (!newSongId || !isReady.value) return
    const song = store.currentSong
    if (!song) return

    loadVideo(song.videoId)

    if (store.performanceMode && newSongId !== lastIntroSongId.value) {
      lastIntroSongId.value = newSongId
      startIntro(newSongId)
    }
  },
)

// Also watch isReady — load initial song once player is ready
watch(isReady, (ready) => {
  if (ready && store.currentSongId) {
    const song = store.currentSong
    if (song) {
      loadVideo(song.videoId)

      if (store.performanceMode && store.currentSongId !== lastIntroSongId.value) {
        lastIntroSongId.value = store.currentSongId
        startIntro(store.currentSongId)
      }
    }
  }
})

onMounted(async () => {
  await init(PLAYER_ID)
})
</script>

<template>
  <div class="relative h-full w-full bg-black transition-all duration-1000 ease-in-out"
    :class="introState.isZoomed ? 'scale-200 translate-y-1/4' : 'scale-100 translate-y-0'">
    <!-- YouTube player container -->
    <div :id="PLAYER_ID" class="absolute inset-0 h-full w-full" />

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
