<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
  placeholder?: string
  modelValue?: string
  type?: string
  disabled?: boolean
  id?: string
  autocomplete?: string
  autocorrect?: string
  autocapitalize?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <input
    :id="props.id"
    :type="props.type"
    :value="props.modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :autocomplete="props.autocomplete"
    :autocorrect="props.autocorrect"
    :autocapitalize="props.autocapitalize"
    :class="
      cn(
        'flex h-10 w-full rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
        props.class,
      )
    "
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
