<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
  variant?: 'default' | 'outline'
  color?: 'purple' | 'pink' | 'green' | 'yellow' | 'red' | 'blue'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  color: 'purple',
})

const colorMap = {
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  pink: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
}
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
        colorMap[color],
        props.class,
      )
    "
  >
    <slot />
  </span>
</template>
