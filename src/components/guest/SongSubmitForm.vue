<script setup lang="ts">
import { ref } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useSongValidation } from '@/composables/useSongValidation'
import { submitSong, searchAlternatives } from '@/services/queue.api'
import { extractVideoId } from '@/utils/youtubeUrl'
import { useGuestProfileStore } from '@/stores/guestProfile.store'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import DiscoveryHubModal from '@/components/guest/DiscoveryHubModal.vue'

const store = useQueueStore()
const profileStore = useGuestProfileStore()

const isSubmitting = ref(false)
const successMessage = ref<string | null>(null)
const submitError = ref<string | null>(null)

const { url, error, validate, clear } = useSongValidation()

// Modal stack state
const activeModal = ref<'typeUrl' | 'warning' | null>(null)
const showDiscovery = ref(false)

// Warning/Alternatives state
const modalStep = ref<'options' | 'alternatives'>('options')
const isLoadingAlternatives = ref(false)
const alternatives = ref<Array<{ videoId: string; title: string; thumbnailUrl: string }>>([])
const blockedVideoId = ref('')
const blockedVideoTitle = ref('')
const blockedVideoThumbnail = ref('')

function openTypeUrlModal() {
  url.value = ''
  error.value = null
  submitError.value = null
  successMessage.value = null
  activeModal.value = 'typeUrl'
}


async function handleSubmitUrl() {
  submitError.value = null
  successMessage.value = null
  error.value = null

  if (!validate()) return

  if (!profileStore.profile) {
    submitError.value = 'Guest profile missing'
    return
  }

  isSubmitting.value = true
  try {
    const videoId = extractVideoId(url.value)
    if (!videoId) {
      error.value = 'Invalid YouTube URL'
      isSubmitting.value = false
      return
    }

    // Check embeddability via oEmbed
    const infoUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    let isEmbeddable = true
    let info = null

    try {
      const oembedRes = await fetch(infoUrl)
      if (oembedRes.status === 401) {
        isEmbeddable = false
      } else if (oembedRes.ok) {
        const data = await oembedRes.json()
        info = {
          title: data.title,
          thumbnailUrl: data.thumbnail_url,
        }
      }
    } catch {
      // Ignore network errors, assume embeddable
    }

    if (!isEmbeddable) {
      blockedVideoId.value = videoId
      blockedVideoTitle.value = info?.title || 'Unknown Song'
      blockedVideoThumbnail.value = info?.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      activeModal.value = 'warning'
      modalStep.value = 'options'

      isLoadingAlternatives.value = true
      alternatives.value = []
      searchAlternatives(videoId)
        .then((res) => {
          if (res.ok && res.data) {
            alternatives.value = res.data.alternatives
          }
        })
        .catch((err) => {
          console.error('Failed to search alternatives:', err)
        })
        .finally(() => {
          isLoadingAlternatives.value = false
        })

      isSubmitting.value = false
      return
    }

    // Submit normally
    activeModal.value = null
    const res = await submitSong({
      youtubeUrl: url.value,
      guestId: profileStore.profile.guestId,
      name: profileStore.profile.name,
      color: profileStore.profile.color,
      roomId: store.roomId ?? 'default',
      token: profileStore.profile.token ?? '',
      title: info?.title ?? 'Unknown Song',
      thumbnailUrl: info?.thumbnailUrl ?? null,
      isNonEmbeddable: false,
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

function handleOption2() {
  activeModal.value = 'typeUrl'
  url.value = ''
}

function handleBackWarning() {
  if (modalStep.value === 'alternatives') {
    modalStep.value = 'options'
  } else {
    handleOption2()
  }
}

async function handleOption3() {
  submitError.value = null
  successMessage.value = null
  activeModal.value = null
  isSubmitting.value = true

  try {
    const res = await submitSong({
      youtubeUrl: `https://www.youtube.com/watch?v=${blockedVideoId.value}`,
      guestId: profileStore.profile!.guestId,
      name: profileStore.profile!.name,
      color: profileStore.profile!.color,
      roomId: store.roomId ?? 'default',
      token: profileStore.profile!.token ?? '',
      title: blockedVideoTitle.value,
      thumbnailUrl: blockedVideoThumbnail.value || null,
      isNonEmbeddable: true,
    })

    if (res.ok) {
      successMessage.value = 'Song added to the queue (Must play on YouTube)!'
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

async function selectAlternative(alt: { videoId: string; title: string; thumbnailUrl: string }) {
  submitError.value = null
  successMessage.value = null
  activeModal.value = null
  isSubmitting.value = true

  try {
    const res = await submitSong({
      youtubeUrl: `https://www.youtube.com/watch?v=${alt.videoId}`,
      guestId: profileStore.profile!.guestId,
      name: profileStore.profile!.name,
      color: profileStore.profile!.color,
      roomId: store.roomId ?? 'default',
      token: profileStore.profile!.token ?? '',
      title: alt.title,
      thumbnailUrl: alt.thumbnailUrl,
      isNonEmbeddable: false,
    })

    if (res.ok) {
      successMessage.value = 'Alternative version added to the queue!'
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
      <h2 class="mb-4 text-sm font-semibold text-[hsl(var(--foreground))]">Add a Song</h2>

      <!-- Split Options -->
      <div class="flex gap-3">
        <button
          @click="showDiscovery = true"
          class="flex-1 rounded-xl border border-purple-500/20 bg-purple-500/5 py-4 px-4 text-center transition-all hover:bg-purple-500/10 hover:border-purple-500/40 group active:scale-[0.98] cursor-pointer"
        >
          <span class="block text-2xl mb-1.5">✨</span>
          <span class="block text-xs font-bold text-white group-hover:text-purple-300">Discovery Hub</span>
        </button>

        <button
          @click="openTypeUrlModal"
          class="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/40 py-4 px-4 text-center transition-all hover:bg-zinc-800 hover:border-zinc-700 group active:scale-[0.98] cursor-pointer"
        >
          <span class="block text-2xl mb-1.5">🔗</span>
          <span class="block text-xs font-bold text-white group-hover:text-zinc-300">Type URL</span>
        </button>
      </div>

      <!-- Submit error -->
      <p v-if="submitError" class="mt-3 text-xs text-red-400">{{ submitError }}</p>

      <!-- Success -->
      <p v-if="successMessage" class="mt-3 text-xs text-green-400">✓ {{ successMessage }}</p>
    </div>



    <!-- Type URL Modal -->
    <Teleport to="body">
      <div
        v-if="activeModal === 'typeUrl'"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
      >
        <div
          class="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-all duration-300"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 p-5">
            <div>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span>🔗</span> Enter YouTube URL
              </h3>
              <p class="mt-1 text-sm text-zinc-400">Paste a YouTube video link to add it</p>
            </div>
            <button
              @click="activeModal = null"
              class="h-8 w-8 text-zinc-400 hover:text-white transition rounded-full hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Content -->
          <form @submit.prevent="handleSubmitUrl" class="p-6 space-y-4">
            <div class="space-y-2">
              <label class="text-xs font-bold uppercase tracking-wider text-zinc-400">YouTube Link</label>
              <Input
                v-slot="inputProps"
                v-model="url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                required
                autocomplete="off"
                class="w-full"
              />
              <p v-if="error" class="text-xs text-red-400 mt-1">{{ error }}</p>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="activeModal = null"
                class="flex-1 rounded-lg bg-zinc-800 py-2.5 px-4 text-xs font-bold text-white hover:bg-zinc-750 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="flex-1 rounded-lg bg-purple-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-purple-500 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span v-else>Submit</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Warning Modal -->
    <Teleport to="body">
      <div
        v-if="activeModal === 'warning'"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
      >
        <div
          class="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-all duration-300"
        >
          <!-- Title Header -->
          <div class="border-b border-zinc-800 bg-zinc-950/50 p-5 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="text-yellow-500">⚠️</span> Embedding Blocked
              </h3>
              <p class="mt-1 text-sm text-zinc-400">
                This video cannot be played directly on this site.
              </p>
            </div>
            <button
              @click="activeModal = null"
              class="h-8 w-8 text-zinc-400 hover:text-white transition rounded-full hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Content Area -->
          <div class="p-6">
            <!-- Step 1: Options List -->
            <div v-if="modalStep === 'options'" class="space-y-4">
              <button
                @click="modalStep = 'alternatives'"
                class="w-full rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-left transition-all hover:bg-purple-500/10 hover:border-purple-500/40 group cursor-pointer"
              >
                <div class="flex items-start gap-3">
                  <span class="text-xl">✨</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-white group-hover:text-purple-300 truncate">
                      Option 1: Play alternative versions
                    </div>
                    <div class="text-xs text-zinc-400 mt-0.5">
                      (Recommended) We'll search for working embeddable versions.
                    </div>
                  </div>
                </div>
              </button>

              <button
                @click="handleOption2"
                class="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-left transition-all hover:bg-zinc-850 hover:border-zinc-700 group cursor-pointer"
              >
                <div class="flex items-start gap-3">
                  <span class="text-xl">↩</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-white group-hover:text-zinc-300 truncate">
                      Option 2: Back to previous view
                    </div>
                    <div class="text-xs text-zinc-400 mt-0.5">
                      Return to searching or URL input.
                    </div>
                  </div>
                </div>
              </button>

              <button
                @click="handleOption3"
                class="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-left transition-all hover:bg-red-950/20 hover:border-red-900/40 group cursor-pointer"
              >
                <div class="flex items-start gap-3">
                  <span class="text-xl">📺</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-white group-hover:text-red-400 truncate">
                      Option 3: Proceed anyway
                    </div>
                    <div class="text-xs text-zinc-400 mt-0.5">
                      Submit this song; the host will view it on YouTube.
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <!-- Step 2: Alternatives Detail View -->
            <div v-else-if="modalStep === 'alternatives'" class="space-y-4">
              <div class="flex items-center justify-between mb-2">
                <button
                  @click="handleBackWarning"
                  class="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <span>←</span> Back
                </button>
                <span class="text-xs text-zinc-500 font-medium">Alternative Karaoke Tracks</span>
              </div>

              <!-- Loading alternatives -->
              <div
                v-if="isLoadingAlternatives"
                class="py-8 flex flex-col items-center justify-center gap-3 text-zinc-400"
              >
                <div class="h-6 w-6 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
                <p class="text-xs font-medium">Searching for alternatives...</p>
              </div>

              <!-- No alternatives found -->
              <div
                v-else-if="alternatives.length === 0"
                class="py-6 text-center text-zinc-400 space-y-4"
              >
                <p class="text-sm">No embeddable alternatives found.</p>
                <div class="flex gap-2">
                  <button
                    @click="handleOption2"
                    class="flex-1 rounded-lg bg-zinc-800 py-2 px-3 text-xs font-bold text-white hover:bg-zinc-700 transition cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    @click="handleOption3"
                    class="flex-1 rounded-lg bg-red-900/40 py-2 px-3 text-xs font-bold text-white hover:bg-red-900/60 border border-red-500/30 transition cursor-pointer"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>

              <!-- Alternatives List -->
              <div v-else class="max-h-60 overflow-y-auto space-y-3 pr-1">
                <div
                  v-for="alt in alternatives"
                  :key="alt.videoId"
                  class="flex items-center gap-3 rounded-lg border border-zinc-850 bg-zinc-950/50 p-2 hover:border-zinc-700 transition"
                >
                  <img
                    :src="alt.thumbnailUrl"
                    class="h-10 w-16 rounded object-cover bg-zinc-900 flex-shrink-0"
                    alt="Thumbnail"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-white truncate leading-tight">
                      {{ alt.title }}
                    </div>
                    <div class="flex gap-2 mt-1">
                      <a
                        :href="'https://www.youtube.com/watch?v=' + alt.videoId"
                        target="_blank"
                        class="text-[10px] text-purple-400 hover:underline font-semibold"
                      >
                        Preview ↗
                      </a>
                    </div>
                  </div>
                  <button
                    @click="selectAlternative(alt)"
                    class="rounded bg-purple-600 px-2 py-1 text-xs font-bold text-white hover:bg-purple-500 transition flex-shrink-0 cursor-pointer"
                  >
                    Select
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Discovery Hub Modal -->
    <DiscoveryHubModal
      v-if="showDiscovery"
      :isOpen="showDiscovery"
      @close="showDiscovery = false"
    />
  </div>
</template>
