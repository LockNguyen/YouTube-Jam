<script setup lang="ts">
import { ref } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useHostActions } from '@/composables/useHostActions'
import type { ReorderDirection } from '@/types/queue'
import QueueSongRow from './QueueSongRow.vue'
import HistorySongRow from './HistorySongRow.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Separator from '@/components/ui/Separator.vue'

defineEmits<{ close: [] }>()

const store = useQueueStore()
const { deleteSong, reorderSong } = useHostActions()

const deletingIds = ref<Set<string>>(new Set())
const reorderingIds = ref<Set<string>>(new Set())

async function handleDelete(songId: string) {
  deletingIds.value.add(songId)
  await deleteSong(songId)
  deletingIds.value.delete(songId)
}

async function handleReorder(songId: string, direction: ReorderDirection) {
  reorderingIds.value.add(songId)
  await reorderSong(songId, direction)
  reorderingIds.value.delete(songId)
}
</script>

<template>
  <div class="glass-heavy flex h-full flex-col rounded-[var(--radius-lg)] text-[hsl(var(--foreground))]">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <h2 class="text-sm font-semibold">Queue</h2>
      <Button variant="ghost" size="icon" class="h-8 w-8" @click="$emit('close')">✕</Button>
    </div>

    <div class="flex-1 overflow-hidden">
      <ScrollArea max-height="100%">
        <!-- Now Playing -->
        <div v-if="store.currentSong" class="px-3 py-2">
          <p class="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-[hsl(var(--foreground-subtle))]">
            Now Playing
          </p>
          <div class="flex items-center gap-3 rounded-lg bg-purple-500/15 px-3 py-2.5 border border-purple-500/25">
            <img
              v-if="store.currentSong.thumbnailUrl"
              :src="store.currentSong.thumbnailUrl"
              :alt="store.currentSong.title ?? 'Playing'"
              class="h-9 w-14 flex-shrink-0 rounded object-cover"
            />
            <div v-else class="flex h-9 w-14 flex-shrink-0 items-center justify-center rounded bg-white/10 text-base">🎵</div>
            <p class="min-w-0 flex-1 truncate text-xs font-medium">
              {{ store.currentSong.title ?? 'Unknown Song' }}
            </p>
            <Badge color="purple">Playing</Badge>
          </div>
        </div>

        <Separator v-if="store.currentSong && store.queuedSongs.length > 0" />

        <!-- Up Next -->
        <div v-if="store.queuedSongs.length > 0" class="px-3 py-2">
          <p class="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-[hsl(var(--foreground-subtle))]">
            Up Next
            <span class="ml-1 font-normal text-[hsl(var(--foreground-muted))]">({{ store.queuedSongs.length }})</span>
          </p>
          <div class="divide-y divide-white/5">
            <QueueSongRow
              v-for="(song, index) in store.queuedSongs"
              :key="song.id"
              :song="song"
              :position="index + 1"
              :is-first="index === 0"
              :is-last="index === store.queuedSongs.length - 1"
              :is-deleting="deletingIds.has(song.id) || reorderingIds.has(song.id)"
              @delete="handleDelete"
              @reorder="handleReorder"
            />
          </div>
        </div>

        <Separator v-if="store.historySongs.length > 0" />

        <!-- History -->
        <div v-if="store.historySongs.length > 0" class="px-3 py-2">
          <p class="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-[hsl(var(--foreground-subtle))]">
            History
          </p>
          <div class="divide-y divide-white/5">
            <HistorySongRow
              v-for="song in store.historySongs"
              :key="song.id"
              :song="song"
            />
          </div>
        </div>

        <!-- Empty -->
        <div
          v-if="!store.currentSong && store.queuedSongs.length === 0 && store.historySongs.length === 0"
          class="flex flex-col items-center justify-center gap-2 py-12 text-center"
        >
          <span class="text-3xl opacity-30">🎵</span>
          <p class="text-xs text-[hsl(var(--foreground-muted))]">Queue is empty</p>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
