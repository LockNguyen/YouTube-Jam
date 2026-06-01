<script setup lang="ts">
import { computed } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import Badge from '@/components/ui/Badge.vue'

const store = useQueueStore()

const current = computed(() => store.currentSong)
const next = computed(() => store.nextSong)
</script>

<template>
  <div class="fade-in">
    <!-- Nothing playing -->
    <div
      v-if="!current"
      class="flex items-center gap-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--background-elevated))] p-4"
    >
      <div
        class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--background-overlay))] text-2xl"
      >
        🎤
      </div>
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-[hsl(var(--foreground-subtle))]">
          Now Playing
        </p>
        <p class="mt-1 text-sm text-[hsl(var(--foreground-muted))]">Waiting for the first song…</p>
      </div>
    </div>

    <!-- Currently playing -->
    <div
      v-else
      class="relative overflow-hidden rounded-[var(--radius)] border border-purple-500/30 bg-[hsl(var(--background-elevated))] pulse-glow"
    >
      <!-- Thumbnail background blur -->
      <div
        v-if="current.thumbnailUrl"
        class="absolute inset-0 scale-110 opacity-10 blur-xl"
        :style="{ backgroundImage: `url(${current.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
      />

      <div class="relative flex items-center gap-4 p-4">
        <!-- Thumbnail -->
        <div class="relative flex-shrink-0">
          <img
            v-if="current.thumbnailUrl"
            :src="current.thumbnailUrl"
            :alt="current.title ?? 'Now Playing'"
            class="h-16 w-24 rounded-lg object-cover"
          />
          <div
            v-else
            class="flex h-16 w-24 items-center justify-center rounded-lg bg-[hsl(var(--background-overlay))] text-2xl"
          >
            🎵
          </div>
          <!-- Playing indicator -->
          <div class="absolute -bottom-1 -right-1 flex gap-0.5 rounded-full bg-purple-600 px-1.5 py-1">
            <span class="h-2 w-0.5 animate-bounce rounded-full bg-white" style="animation-delay: 0ms" />
            <span class="h-2 w-0.5 animate-bounce rounded-full bg-white" style="animation-delay: 150ms" />
            <span class="h-2 w-0.5 animate-bounce rounded-full bg-white" style="animation-delay: 300ms" />
          </div>
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <Badge color="purple">Now Playing</Badge>
          </div>
          <p class="mt-1.5 truncate text-sm font-semibold text-[hsl(var(--foreground))]">
            {{ current.title ?? 'Unknown Song' }}
          </p>
          <p v-if="next" class="mt-1 truncate text-xs text-[hsl(var(--foreground-muted))]">
            Up next: {{ next.title ?? 'Unknown Song' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
