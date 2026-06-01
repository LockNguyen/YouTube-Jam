<script setup lang="ts">
import type { Song } from '@/types/song'
import type { ReorderDirection } from '@/types/queue'
import Button from '@/components/ui/Button.vue'

interface Props {
  song: Song
  position: number
  isFirst?: boolean
  isLast?: boolean
  isDeleting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFirst: false,
  isLast: false,
  isDeleting: false,
})

const emit = defineEmits<{
  delete: [songId: string]
  reorder: [songId: string, direction: ReorderDirection]
}>()
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5">
    <!-- Position -->
    <span class="w-5 flex-shrink-0 text-center text-xs font-medium text-[hsl(var(--foreground-subtle))]">
      {{ position }}
    </span>

    <!-- Thumbnail -->
    <img
      v-if="song.thumbnailUrl"
      :src="song.thumbnailUrl"
      :alt="song.title ?? 'Song'"
      class="h-9 w-14 flex-shrink-0 rounded object-cover"
    />
    <div
      v-else
      class="flex h-9 w-14 flex-shrink-0 items-center justify-center rounded bg-white/10 text-base"
    >
      🎵
    </div>

    <!-- Title -->
    <p class="min-w-0 flex-1 truncate text-xs font-medium text-[hsl(var(--foreground))]">
      {{ song.title ?? 'Unknown Song' }}
    </p>

    <!-- Reorder buttons -->
    <div class="flex flex-shrink-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-xs"
        title="Move to top"
        :disabled="props.isFirst || isDeleting"
        @click="emit('reorder', song.id, 'top')"
      >⤒</Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-xs"
        title="Move up"
        :disabled="props.isFirst || isDeleting"
        @click="emit('reorder', song.id, 'up')"
      >↑</Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-xs"
        title="Move down"
        :disabled="props.isLast || isDeleting"
        @click="emit('reorder', song.id, 'down')"
      >↓</Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-xs"
        title="Move to bottom"
        :disabled="props.isLast || isDeleting"
        @click="emit('reorder', song.id, 'bottom')"
      >⤓</Button>

      <!-- Delete -->
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        title="Delete song"
        :disabled="isDeleting"
        @click="emit('delete', song.id)"
      >✕</Button>
    </div>
  </div>
</template>
