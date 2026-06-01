<script setup lang="ts">
import Button from '@/components/ui/Button.vue'

interface Props {
  songTitle: string
  performerName: string
  isRunning: boolean
  isDimmed: boolean
  isTitleVisible: boolean
  isArtistVisible: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  skip: []
}>()
</script>

<template>
  <div
    v-if="isRunning"
    class="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center transition-all duration-1500 ease-in-out"
    :class="[
      isDimmed ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent',
    ]"
  >
    <!-- Reveal Text -->
    <div class="flex flex-col items-center justify-center px-8 text-center max-w-3/4">
      <h2
        class="text-4xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] md:text-6xl transition-all duration-1500 ease-in-out"
        :class="isTitleVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-200 opacity-0 blur-lg translate-y-8'"
      >
        {{ songTitle }}
      </h2>
      <p
        class="absolute text-4xl font-medium text-zinc-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] md:text-6xl transition-all duration-1000 ease-in-out"
        :class="isArtistVisible ? 'scale-100 opacity-100 tracking-normal' : 'scale-200 opacity-0 tracking-widest'"
      >
        By <span class="text-purple-400">{{ performerName }}</span>
      </p>
    </div>

    <!-- Skip Button -->
    <div
      class="pointer-events-auto absolute bottom-8 right-8 transition-opacity duration-1000"
      :class="isTitleVisible ? 'opacity-100' : 'opacity-0'"
    >
      <Button
        variant="outline"
        size="sm"
        class="border-white/20 bg-black/50 text-white/70 hover:bg-white/10 hover:text-white"
        @click="emit('skip')"
      >
        Skip Intro
      </Button>
    </div>
  </div>
</template>
