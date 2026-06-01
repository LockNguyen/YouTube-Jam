<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
  icon?: string
  title?: string
  description?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('flex flex-col items-center justify-center gap-3 py-12 text-center', props.class)">
    <div class="text-5xl opacity-30">
      <slot name="icon">🎵</slot>
    </div>
    <div>
      <p class="text-sm font-medium text-[hsl(var(--foreground-muted))]">
        <slot name="title">{{ title ?? 'Nothing here yet' }}</slot>
      </p>
      <p v-if="description" class="mt-1 text-xs text-[hsl(var(--foreground-subtle))]">
        {{ description }}
      </p>
    </div>
  </div>
</template>
