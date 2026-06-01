<script setup lang="ts">
import { ref } from 'vue'
import { useHostActions } from '@/composables/useHostActions'
import Button from '@/components/ui/Button.vue'

interface Props {
  isPlaying?: boolean
  isQueueVisible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
  isQueueVisible: false,
})

const emit = defineEmits<{
  play: []
  pause: []
  restart: []
  'toggle-queue': []
}>()

const { skip, previous, clearQueue, isLoading, lastError, setPerformanceMode } = useHostActions()

const isSkipping = ref(false)
const isGoingBack = ref(false)

async function handleSkip() {
  isSkipping.value = true
  await skip()
  isSkipping.value = false
}

async function handlePrevious() {
  isGoingBack.value = true
  await previous()
  isGoingBack.value = false
}

async function handleClear() {
  if (!confirm('Clear all upcoming songs from the queue?')) return
  await clearQueue()
}

import { useQueueStore } from '@/stores/queue.store'
const queueStore = useQueueStore()

async function togglePerformanceMode() {
  const nextMode = !queueStore.performanceMode
  await setPerformanceMode(nextMode)
}
</script>

<template>
  <div class="glass-heavy rounded-[var(--radius-lg)] px-4 py-3">
    <!-- Error display -->
    <p v-if="lastError" class="mb-2 text-center text-xs text-red-400">{{ lastError }}</p>

    <div class="flex items-center justify-between gap-2">
      <!-- Left: Previous + Restart -->
      <div class="flex items-center gap-1">
        <Button
          id="host-previous-btn"
          variant="ghost"
          size="icon"
          title="Previous song"
          :disabled="isLoading || isGoingBack"
          @click="handlePrevious"
        >
          <span class="text-lg">⏮</span>
        </Button>

        <Button
          id="host-restart-btn"
          variant="ghost"
          size="icon"
          title="Restart"
          @click="emit('restart')"
        >
          <span class="text-lg">🔄</span>
        </Button>
      </div>

      <!-- Center: Play / Pause -->
      <Button
        id="host-playpause-btn"
        size="lg"
        class="h-12 w-12 rounded-full"
        :title="props.isPlaying ? 'Pause' : 'Play'"
        @click="props.isPlaying ? emit('pause') : emit('play')"
      >
        <span class="text-xl">{{ props.isPlaying ? '⏸' : '▶️' }}</span>
      </Button>

      <!-- Right: Skip + Queue toggle -->
      <div class="flex items-center gap-1">
        <Button
          id="host-skip-btn"
          variant="ghost"
          size="icon"
          title="Skip"
          :disabled="isLoading || isSkipping"
          @click="handleSkip"
        >
          <span class="text-lg">⏭</span>
        </Button>

        <Button
          id="host-queue-toggle-btn"
          variant="ghost"
          size="icon"
          :title="props.isQueueVisible ? 'Hide queue' : 'Show queue'"
          @click="emit('toggle-queue')"
        >
          <span class="text-lg">{{ props.isQueueVisible ? '📋' : '📋' }}</span>
        </Button>

        <Button
          id="host-clear-btn"
          variant="ghost"
          size="icon"
          title="Clear queue"
          :disabled="isLoading"
          @click="handleClear"
        >
          <span class="text-lg">🗑</span>
        </Button>

        <Button
          id="host-perf-toggle-btn"
          variant="outline"
          size="sm"
          class="ml-2 gap-2 border-[hsl(var(--border))] hover:bg-white/10"
          :class="queueStore.performanceMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30' : ''"
          title="Toggle Performance Mode"
          :disabled="isLoading"
          @click="togglePerformanceMode"
        >
          ✨ Performance Mode
        </Button>
      </div>
    </div>
  </div>
</template>
