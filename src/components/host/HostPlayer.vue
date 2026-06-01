<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useHostActions } from '@/composables/useHostActions'
import { useYouTubePlayer } from '@/composables/useYoutubePlayer'
import EmptyState from '@/components/common/EmptyState.vue'

const store = useQueueStore()
const { setNowPlaying } = useHostActions()

const PLAYER_ID = 'yt-player'

const { isReady, isPlaying, init, loadVideo, play, pause, restart } = useYouTubePlayer({
  async onEnded() {
    // Auto-advance: mark next queued song as now playing
    const next = store.nextSong
    await setNowPlaying(next?.id ?? null)
  },
  onError(event) {
    console.error('[YouTube Player] Error:', event)
  },
})

// Expose controls to parent via defineExpose
defineExpose({ play, pause, restart, isPlaying, isReady })

// Load video when currentSong changes
watch(
  () => store.currentSong?.videoId,
  (videoId) => {
    if (videoId && isReady.value) {
      loadVideo(videoId)
    }
  },
)

// Also watch isReady — load initial song once player is ready
watch(isReady, (ready) => {
  if (ready && store.currentSong?.videoId) {
    loadVideo(store.currentSong.videoId)
  }
})

onMounted(async () => {
  await init(PLAYER_ID)
})
</script>

<template>
  <div class="relative h-full w-full bg-black">
    <!-- YouTube player container -->
    <div :id="PLAYER_ID" class="absolute inset-0 h-full w-full" />

    <!-- Empty state overlay when nothing is playing -->
    <div
      v-if="!store.currentSong && isReady"
      class="absolute inset-0 flex flex-col items-center justify-center bg-black/80"
    >
      <EmptyState description="Add songs from the guest page to get started">
        <template #icon>🎤</template>
        <template #title>Queue is empty</template>
      </EmptyState>
    </div>
  </div>
</template>
