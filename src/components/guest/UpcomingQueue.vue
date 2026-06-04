<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useGuestProfileStore } from '@/stores/guestProfile.store'
import { deleteSongAsGuest, reorderQueueAsGuest } from '@/services/queue.api'
import type { ReorderDirection } from '@/types/queue'
import EmptyState from '@/components/common/EmptyState.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import QueueSongRow from '@/components/host/QueueSongRow.vue'

const store = useQueueStore()
const profileStore = useGuestProfileStore()
const queued = computed(() => store.queuedSongs)

const processingIds = ref<Set<string>>(new Set())

async function handleDelete(songId: string) {
  if (!profileStore.profile) return
  processingIds.value.add(songId)
  await deleteSongAsGuest(songId, profileStore.profile.token ?? '', store.roomId ?? 'default')
  processingIds.value.delete(songId)
}

async function handleReorder(songId: string, direction: ReorderDirection) {
  if (!profileStore.profile) return
  processingIds.value.add(songId)
  await reorderQueueAsGuest(songId, direction, profileStore.profile.token ?? '', store.roomId ?? 'default')
  processingIds.value.delete(songId)
}
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
          <QueueSongRow
            v-for="(song, index) in queued"
            :key="song.id"
            :song="song"
            :position="index + 1"
            :is-first="index === 0"
            :is-last="index === queued.length - 1"
            :is-deleting="processingIds.has(song.id)"
            :show-reorder="true"
            :show-delete="song.submittedByGuestId === profileStore.profile?.guestId"
            @delete="handleDelete"
            @reorder="handleReorder"
          />
        </ul>
      </ScrollArea>
    </div>
  </div>
</template>
