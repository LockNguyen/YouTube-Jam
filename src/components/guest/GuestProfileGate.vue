<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGuestProfileStore } from '@/stores/guestProfile.store'
import { useQueueStore } from '@/stores/queue.store'
import { GUEST_COLORS } from '@/constants/guestColors'

const profileStore = useGuestProfileStore()
const queueStore = useQueueStore()

const name = ref(profileStore.profile?.name || '')
const selectedColor = ref(profileStore.profile?.color || '')
const isSubmitting = ref(false)

const takenColors = computed(() => {
  const currentGuestId = profileStore.profile?.guestId
  const taken = new Set<string>()
  for (const song of queueStore.visibleSongs) {
    if (song.submittedByGuestId && song.submittedByGuestId !== currentGuestId) {
      if (song.submittedByColor) taken.add(song.submittedByColor)
    }
  }
  return taken
})

const isFormValid = computed(() => {
  return name.value.trim().length > 0 && selectedColor.value !== ''
})

function handleSubmit() {
  if (!isFormValid.value) return
  isSubmitting.value = true
  profileStore.updateProfile(name.value.trim(), selectedColor.value)
  isSubmitting.value = false
}
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 p-4">
    <div class="w-full max-w-md space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-sm">
      <div class="text-center">
        <h2 class="text-2xl font-bold tracking-tight text-zinc-100">Welcome to Karaoke!</h2>
        <p class="mt-2 text-sm text-zinc-400">Please choose a name and color to join the queue.</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label for="name" class="block text-sm font-medium text-zinc-300">Your Name</label>
          <div class="mt-2">
            <input
              id="name"
              v-model="name"
              type="text"
              required
              class="block w-full rounded-md border-0 bg-zinc-800/50 py-2.5 px-3 text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
              placeholder="e.g. Loc Nguyen"
              maxlength="40"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-zinc-300">Pick a Color</label>
          <div class="mt-3 grid grid-cols-5 gap-3">
            <button
              v-for="color in GUEST_COLORS"
              :key="color"
              type="button"
              :disabled="takenColors.has(color)"
              @click="selectedColor = color"
              class="relative aspect-square rounded-full transition-all duration-200 ease-out hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-20 disabled:hover:scale-100"
              :class="{
                'ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110 shadow-lg': selectedColor === color,
                'cursor-not-allowed': takenColors.has(color)
              }"
              :style="{ backgroundColor: color }"
              :title="takenColors.has(color) ? 'Color taken by someone else' : 'Select color'"
            >
              <span v-if="takenColors.has(color)" class="absolute inset-0 flex items-center justify-center">
                <span class="text-black/50 font-bold text-xs">✕</span>
              </span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="!isFormValid || isSubmitting"
          class="flex w-full justify-center rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Join Party
        </button>
      </form>
    </div>
  </div>
</template>
