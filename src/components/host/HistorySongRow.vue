<script setup lang="ts">
import type { Song } from '@/types/song'
import Badge from '@/components/ui/Badge.vue'

interface Props {
  song: Song
}

defineProps<Props>()

const emit = defineEmits<{
  jump: [songId: string]
}>()
</script>

<template>
  <div
    class="flex items-center gap-3 px-3 py-2.5 opacity-70 hover:opacity-100 hover:bg-white/5 rounded-lg cursor-pointer transition-all"
    @click="emit('jump', song.id)"
  >
    <!-- Thumbnail -->
    <img
      v-if="song.thumbnailUrl"
      :src="song.thumbnailUrl"
      :alt="song.title ?? 'Song'"
      class="h-9 w-14 flex-shrink-0 rounded object-cover grayscale"
    />
    <div
      v-else
      class="flex h-9 w-14 flex-shrink-0 items-center justify-center rounded bg-white/10 text-base"
    >
      🎵
    </div>

    <!-- Title + Status -->
    <div class="min-w-0 flex-1">
      <p class="truncate text-xs font-medium text-[hsl(var(--foreground))]">
        {{ song.title ?? 'Unknown Song' }}
      </p>
    </div>

    <Badge :color="song.status === 'played' ? 'blue' : 'yellow'" class="flex-shrink-0 text-xs">
      {{ song.status === 'played' ? 'Played' : 'Skipped' }}
    </Badge>
  </div>
</template>
