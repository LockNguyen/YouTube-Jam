<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useSongValidation } from '@/composables/useSongValidation'
import { submitSong } from '@/services/queue.api'
import { extractVideoId } from '@/utils/youtubeUrl'
import { useGuestProfileStore } from '@/stores/guestProfile.store'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'

const store = useQueueStore()
const profileStore = useGuestProfileStore()

const isSubmitting = ref(false)
const successMessage = ref<string | null>(null)
const submitError = ref<string | null>(null)

const { url, error, isValid, validate, clear } = useSongValidation()

/** Check if this video is already in the queue */
const isDuplicate = computed(() => {
  const videoId = extractVideoId(url.value)
  if (!videoId) return false
  return store.queuedSongs.some((s) => s.videoId === videoId)
})

async function handleSubmit() {
  submitError.value = null
  successMessage.value = null

  if (!validate()) return

  if (!profileStore.profile) {
    submitError.value = 'Guest profile missing'
    isSubmitting.value = false
    return
  }

  isSubmitting.value = true
  try {
    const res = await submitSong({
      youtubeUrl: url.value,
      guestId: profileStore.profile.guestId,
      name: profileStore.profile.name,
      color: profileStore.profile.color,
    })
    
    if (res.ok) {
      successMessage.value = 'Song added to the queue!'
      clear()
    } else {
      submitError.value = res.error ?? 'Failed to add song. Please try again.'
    }
  } catch {
    submitError.value = 'Network error. Please check your connection.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="fade-in">
    <div class="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--background-elevated))] p-4">
      <h2 class="mb-3 text-sm font-semibold text-[hsl(var(--foreground))]">Add a Song</h2>

      <form id="song-submit-form" @submit.prevent="handleSubmit" class="flex gap-2">
        <Input
          id="youtube-url-input"
          v-model="url"
          type="url"
          placeholder="Paste a YouTube link…"
          :disabled="isSubmitting"
          class="flex-1"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <Button
          id="submit-song-button"
          type="submit"
          :disabled="isSubmitting"
          size="default"
        >
          <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span v-else>Add</span>
        </Button>
      </form>

      <!-- Duplicate warning -->
      <p
        v-if="isDuplicate && !error"
        class="mt-2 text-xs text-yellow-400"
      >
        ⚠️ This song is already in the queue
      </p>

      <!-- Validation error -->
      <p v-if="error" class="mt-2 text-xs text-red-400">{{ error }}</p>

      <!-- Submit error -->
      <p v-if="submitError" class="mt-2 text-xs text-red-400">{{ submitError }}</p>

      <!-- Success -->
      <p v-if="successMessage" class="mt-2 text-xs text-green-400">✓ {{ successMessage }}</p>
    </div>
  </div>
</template>
