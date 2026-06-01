<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxHeight: '400px',
})
</script>

<template>
  <div
    :class="cn('overflow-y-auto overflow-x-hidden', props.class)"
    :style="{ maxHeight: maxHeight }"
  >
    <slot />
  </div>
</template>
