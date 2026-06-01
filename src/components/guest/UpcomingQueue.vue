<script setup lang="ts">
import { computed } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import EmptyState from '@/components/common/EmptyState.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'

const store = useQueueStore()
const queued = computed(() => store.queuedSongs)
</script>

<template>
  <div class="fade-in">
    <div class="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--background-elevated))]">
      <div class="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
        <h2 class="text-sm font-semibold text-[hsl(var(--foreground))]">Up Next</h2>
        <span
          v-if="queued.length > 0"
          class="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300"
        >
          {{ queued.length }}
        </span>
      </div>

      <EmptyState
        v-if="queued.length === 0"
        description="Be the first to add a song!"
      >
        <template #icon>🎵</template>
        <template #title>Queue is empty</template>
      </EmptyState>

      <ScrollArea v-else max-height="360px">
        <ul class="divide-y divide-[hsl(var(--border))]">
          <li
            v-for="(song, index) in queued"
            :key="song.id"
            class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--background-overlay))]"
          >
            <!-- Position -->
            <span class="w-5 flex-shrink-0 text-center text-xs font-medium text-[hsl(var(--foreground-subtle))]">
              {{ index + 1 }}
            </span>

            <!-- Thumbnail -->
            <img
              v-if="song.thumbnailUrl"
              :src="song.thumbnailUrl"
              :alt="song.title ?? 'Song'"
              class="h-10 w-16 flex-shrink-0 rounded-md object-cover"
            />
            <div
              v-else
              class="flex h-10 w-16 flex-shrink-0 items-center justify-center rounded-md bg-[hsl(var(--background-overlay))] text-lg"
            >
              🎵
            </div>

            <!-- Title -->
            <p class="min-w-0 flex-1 truncate text-sm text-[hsl(var(--foreground))]">
              {{ song.title ?? 'Unknown Song' }}
            </p>
          </li>
        </ul>
      </ScrollArea>
    </div>
  </div>
</template>
