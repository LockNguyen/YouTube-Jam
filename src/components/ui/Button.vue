<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  type: 'button',
})

const variantClasses = {
  default: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]',
  destructive: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/0.9)]',
  outline: 'border border-[hsl(var(--border))] bg-transparent hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
  ghost: 'hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
  link: 'text-[hsl(var(--primary))] underline-offset-4 hover:underline',
  secondary: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/0.8)]',
}

const sizeClasses = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-8 px-3 text-xs rounded-md',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="
      cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
        variantClasses[variant],
        sizeClasses[size],
        props.class,
      )
    "
  >
    <slot />
  </button>
</template>
