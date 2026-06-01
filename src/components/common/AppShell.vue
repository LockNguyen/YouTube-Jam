<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('flex min-h-dvh flex-col', props.class)">
    <!-- Header -->
    <header class="sticky top-0 z-10 border-b border-[hsl(var(--border))] glass">
      <div class="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <span class="text-xl">🎤</span>
          <h1 class="text-base font-semibold gradient-text">Karaoke Queue</h1>
        </div>
        <slot name="header-right" />
      </div>
    </header>

    <!-- Main content -->
    <main class="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-[hsl(var(--border))] py-4">
      <p class="text-center text-xs text-[hsl(var(--foreground-subtle))]">
        Add a song · Sing along · Have fun
      </p>
    </footer>
  </div>
</template>
