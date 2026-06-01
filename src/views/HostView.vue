<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useHostActions } from '@/composables/useHostActions'
import HostPlayer from '@/components/host/HostPlayer.vue'
import HostControls from '@/components/host/HostControls.vue'
import HostQueueOverlay from '@/components/host/HostQueueOverlay.vue'

const store = useQueueStore()
const { isAuthorized } = useHostActions()

const playerRef = ref<InstanceType<typeof HostPlayer> | null>(null)
const isQueueVisible = ref(false)
const isControlsVisible = ref(true)
let idleTimeout: ReturnType<typeof setTimeout> | null = null

function handleMouseMove() {
  isControlsVisible.value = true
  if (idleTimeout) clearTimeout(idleTimeout)
  idleTimeout = setTimeout(() => {
    // Don't hide if the queue is open, as they might be reading it
    if (!isQueueVisible.value) {
      isControlsVisible.value = false
    }
  }, 3000)
}

onMounted(() => {
  store.subscribe()
  window.addEventListener('mousemove', handleMouseMove)
  handleMouseMove()
})

onUnmounted(() => {
  store.unsubscribe()
  window.removeEventListener('mousemove', handleMouseMove)
  if (idleTimeout) clearTimeout(idleTimeout)
})

function handlePlay() {
  playerRef.value?.play()
}

function handlePause() {
  playerRef.value?.pause()
}

function handleRestart() {
  playerRef.value?.restart()
}

function toggleQueue() {
  isQueueVisible.value = !isQueueVisible.value
}
</script>

<template>
  <!-- Unauthorized state -->
  <div
    v-if="!isAuthorized"
    class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black px-6 text-center"
  >
    <span class="text-6xl">🔒</span>
    <h1 class="text-xl font-semibold text-white">Host Access Required</h1>
    <p class="max-w-xs text-sm text-white/50">
      Open the host page with your access key:
      <br />
      <code class="mt-2 block rounded bg-white/10 px-2 py-1 text-xs font-mono text-white/70">
        /host?key=YOUR_HOST_SECRET
      </code>
    </p>
  </div>

  <!-- Host layout -->
  <div 
    v-else 
    class="relative flex h-dvh w-full flex-col overflow-hidden bg-black transition-cursor duration-500"
    :class="{ 'cursor-none': !isControlsVisible }"
  >
    <!-- Full-screen player -->
    <div class="absolute inset-0">
      <HostPlayer ref="playerRef" />
    </div>

    <!-- Invisible overlay to catch mouse movement when controls are hidden. 
         Because the YouTube iframe consumes mouse events, we need this layer 
         on top to detect when the user moves the mouse again. -->
    <div
      v-if="!isControlsVisible"
      class="absolute inset-0 z-10"
      @mousemove="handleMouseMove"
    ></div>

    <!-- Queue overlay (glassmorphism panel) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-x-full"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-full"
    >
      <div
        v-if="isQueueVisible"
        class="absolute right-4 top-4 bottom-24 w-80 z-20"
      >
        <HostQueueOverlay @close="isQueueVisible = false" />
      </div>
    </Transition>

    <!-- Floating controls bar -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-8"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-500 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-8"
    >
      <div v-show="isControlsVisible" class="absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
        <HostControls
          :is-playing="playerRef?.isPlaying ?? false"
          :is-queue-visible="isQueueVisible"
          @play="handlePlay"
          @pause="handlePause"
          @restart="handleRestart"
          @toggle-queue="toggleQueue"
        />
      </div>
    </Transition>
  </div>
</template>
