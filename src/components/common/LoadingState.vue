<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
  message?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('flex flex-col items-center justify-center gap-3 py-12', props.class)">
    <div class="relative h-8 w-8">
      <div
        class="absolute inset-0 rounded-full border-2 border-[hsl(var(--border))] border-t-[hsl(var(--primary))] animate-spin"
      />
    </div>
    <p v-if="message" class="text-xs text-[hsl(var(--foreground-muted))]">{{ message }}</p>
  </div>
</template>
