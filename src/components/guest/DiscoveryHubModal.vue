<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import { useGuestProfileStore } from '@/stores/guestProfile.store'
import { searchSongs, suggestSongs, submitSong, searchAlternatives } from '@/services/queue.api'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useQueueStore()
const profileStore = useGuestProfileStore()

const searchQuery = ref('')
const items = ref<any[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)
const submitErrorMsg = ref<string | null>(null)

// Pagination state
const nextPageToken = ref<string | undefined>(undefined)
const nextPage = ref<number | undefined>(undefined)
const hasMore = ref(true)

// Warning Modal state (for blocked embeddable songs)
const activeModal = ref<'warning' | null>(null)
const modalStep = ref<'options' | 'alternatives'>('options')
const blockedVideoId = ref('')
const blockedVideoTitle = ref('')
const blockedVideoThumbnail = ref('')
const alternatives = ref<any[]>([])
const isLoadingAlternatives = ref(false)

// Ref for the scrollable container to attach scroll listener
const scrollContainer = ref<HTMLDivElement | null>(null)

// Load suggestions or search results
async function loadData(isInitial = false) {
  if (isLoading.value) return
  if (!isInitial && !hasMore.value) return

  isLoading.value = true
  if (isInitial) {
    errorMsg.value = null
  }

  try {
    const isSearching = searchQuery.value.trim().length > 0
    let res
    if (isSearching) {
      res = await searchSongs(
        searchQuery.value,
        isInitial ? 1 : nextPage.value,
        isInitial ? undefined : nextPageToken.value
      )
    } else {
      res = await suggestSongs(
        store.roomId || 'default',
        isInitial ? 1 : nextPage.value,
        isInitial ? undefined : nextPageToken.value
      )
    }

    if (res.ok && res.data) {
      const newItems = res.data.results
      if (isInitial) {
        items.value = newItems
      } else {
        items.value = [...items.value, ...newItems]
      }

      nextPage.value = res.data.nextPage
      nextPageToken.value = res.data.nextPageToken
      hasMore.value = !!(res.data.nextPage || res.data.nextPageToken) && newItems.length > 0
    } else {
      errorMsg.value = res.error || 'Failed to fetch songs.'
    }
  } catch (err) {
    errorMsg.value = 'Failed to load data. Please check connection.'
  } finally {
    isLoading.value = false
  }
}

// Trigger initial load on mount
onMounted(() => {
  loadData(true)
})

// Watch search query changes to reset pagination and load data when cleared or submitted
function handleSearchSubmit() {
  nextPage.value = undefined
  nextPageToken.value = undefined
  hasMore.value = true
  loadData(true)
}

function handleClearSearch() {
  searchQuery.value = ''
  nextPage.value = undefined
  nextPageToken.value = undefined
  hasMore.value = true
  loadData(true)
}

// Scroll handler for infinite scroll
function handleScroll() {
  const container = scrollContainer.value
  if (!container) return

  const { scrollTop, clientHeight, scrollHeight } = container
  // Load more if scrolled within 50px of the bottom
  if (scrollTop + clientHeight >= scrollHeight - 50) {
    loadData(false)
  }
}

// Watch items list to auto-fill container if loaded items don't overflow the viewport yet
watch(items, () => {
  setTimeout(() => {
    const container = scrollContainer.value
    if (container && hasMore.value && !isLoading.value) {
      if (container.scrollHeight <= container.clientHeight) {
        loadData(false)
      }
    }
  }, 150)
})

// Select song logic
async function handleSelectSong(item: { videoId: string; title: string; thumbnailUrl: string; embeddable: boolean }) {
  if (!item.embeddable) {
    blockedVideoId.value = item.videoId
    blockedVideoTitle.value = item.title
    blockedVideoThumbnail.value = item.thumbnailUrl
    activeModal.value = 'warning'
    modalStep.value = 'options'

    isLoadingAlternatives.value = true
    alternatives.value = []
    try {
      const res = await searchAlternatives(item.videoId)
      if (res.ok && res.data) {
        alternatives.value = res.data.alternatives
      }
    } catch (err) {
      console.error('Failed to search alternatives:', err)
    } finally {
      isLoadingAlternatives.value = false
    }
    return
  }

  submitErrorMsg.value = null
  successMsg.value = null
  isSubmitting.value = true

  try {
    const res = await submitSong({
      youtubeUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
      guestId: profileStore.profile!.guestId,
      name: profileStore.profile!.name,
      color: profileStore.profile!.color,
      roomId: store.roomId ?? 'default',
      token: profileStore.profile!.token ?? '',
      title: item.title,
      thumbnailUrl: item.thumbnailUrl,
      isNonEmbeddable: false,
    })

    if (res.ok) {
      successMsg.value = `"${item.title}" added to queue!`
      setTimeout(() => {
        successMsg.value = null
      }, 3000)
    } else {
      submitErrorMsg.value = res.error ?? 'Failed to add song.'
    }
  } catch (err) {
    submitErrorMsg.value = 'Network error.'
  } finally {
    isSubmitting.value = false
  }
}

// Warning Option 2: Back to browse list
function handleOption2() {
  activeModal.value = null
}

// Warning Option 3: Proceed anyway
async function handleOption3() {
  activeModal.value = null
  isSubmitting.value = true
  submitErrorMsg.value = null
  successMsg.value = null

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
      successMsg.value = `"${blockedVideoTitle.value}" added (Must play on YouTube)!`
      setTimeout(() => {
        successMsg.value = null
      }, 3000)
    } else {
      submitErrorMsg.value = res.error ?? 'Failed to add song.'
    }
  } catch {
    submitErrorMsg.value = 'Network error.'
  } finally {
    isSubmitting.value = false
  }
}

// Select Alternative
async function selectAlternative(alt: { videoId: string; title: string; thumbnailUrl: string }) {
  activeModal.value = null
  isSubmitting.value = true
  submitErrorMsg.value = null
  successMsg.value = null

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
      successMsg.value = `"${alt.title}" added to queue!`
      setTimeout(() => {
        successMsg.value = null
      }, 3000)
    } else {
      submitErrorMsg.value = res.error ?? 'Failed to add song.'
    }
  } catch {
    submitErrorMsg.value = 'Network error.'
  } finally {
    isSubmitting.value = false
  }
}

function handleBackWarning() {
  if (modalStep.value === 'alternatives') {
    modalStep.value = 'options'
  } else {
    handleOption2()
  }
}
</script>

<template>
  <!-- Main Discovery Modal -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/85 p-4 backdrop-blur-sm"
    >
      <div
        class="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-all duration-300 flex flex-col max-h-[85vh]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 p-5">
          <div>
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="text-purple-400">✨</span> Discovery Hub
            </h3>
            <p class="mt-1 text-xs text-zinc-400">Browse recommendations & search popular karaoke tunes</p>
          </div>
          <button
            @click="emit('close')"
            class="h-8 w-8 text-zinc-400 hover:text-white transition rounded-full hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Body Content -->
        <div class="p-6 overflow-y-auto flex-1 flex flex-col min-h-0">
          <!-- Success / Error banners -->
          <div v-if="successMsg" class="mb-4 rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center">
            <p class="text-xs font-semibold text-green-400">{{ successMsg }}</p>
          </div>
          <div v-if="submitErrorMsg" class="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
            <p class="text-xs font-semibold text-red-400">{{ submitErrorMsg }}</p>
          </div>
          <div v-if="errorMsg" class="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
            <p class="text-xs font-semibold text-red-400">{{ errorMsg }}</p>
          </div>

          <!-- Search Form -->
          <form @submit.prevent="handleSearchSubmit" class="flex gap-2 mb-4 flex-shrink-0">
            <Input
              v-slot="inputProps"
              v-model="searchQuery"
              placeholder="Search for karaoke tracks or topics..."
              class="flex-1"
            />
            <Button
              type="submit"
              class="bg-purple-600 hover:bg-purple-500 text-white font-semibold flex-shrink-0"
              :disabled="isLoading && items.length === 0"
            >
              Search
            </Button>
            <Button
              v-if="searchQuery"
              type="button"
              variant="outline"
              @click="handleClearSearch"
              class="flex-shrink-0"
            >
              Clear
            </Button>
          </form>

          <!-- List Section Title -->
          <div class="flex items-center justify-between mb-3 flex-shrink-0">
            <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {{ searchQuery.trim() ? `Search Results for "${searchQuery}"` : 'Suggestions For You' }}
            </span>
          </div>

          <!-- Infinite Scrolling Container -->
          <div
            ref="scrollContainer"
            @scroll="handleScroll"
            class="flex-1 overflow-y-auto space-y-3 pr-1"
          >
            <!-- Initial Loading Spinner -->
            <div
              v-if="isLoading && items.length === 0"
              class="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400"
            >
              <div class="h-8 w-8 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
              <p class="text-xs font-semibold">Loading track recommendations...</p>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="items.length === 0 && !isLoading"
              class="py-12 text-center text-zinc-400 space-y-1"
            >
              <p class="text-sm font-semibold">No tracks found</p>
              <p class="text-xs">Try searching a different keyword or check back later.</p>
            </div>

            <!-- List Items -->
            <template v-else>
              <div
                v-for="item in items"
                :key="item.videoId"
                class="flex items-center gap-3 rounded-xl border border-zinc-850 bg-zinc-950/30 p-2.5 hover:border-zinc-700 transition"
              >
                <!-- Thumbnail -->
                <img
                  :src="item.thumbnailUrl"
                  class="h-12 w-20 rounded-lg object-cover bg-zinc-900 flex-shrink-0"
                  alt="Thumbnail"
                />

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-white truncate leading-tight flex items-center gap-1.5">
                    <span
                      v-if="!item.embeddable"
                      title="Embedding Blocked (Warning: Must play on YouTube)"
                      class="text-yellow-500 flex-shrink-0 cursor-help"
                    >⚠️</span>
                    <span>{{ item.title }}</span>
                  </div>
                  <div class="flex gap-2 mt-1">
                    <a
                      :href="'https://www.youtube.com/watch?v=' + item.videoId"
                      target="_blank"
                      class="text-[10px] text-purple-400 hover:underline font-semibold"
                    >
                      Preview Video ↗
                    </a>
                  </div>
                </div>

                <!-- Action Button -->
                <Button
                  @click="handleSelectSong(item)"
                  size="sm"
                  class="bg-purple-600 hover:bg-purple-500 text-white font-bold flex-shrink-0"
                  :disabled="isSubmitting"
                >
                  Select
                </Button>
              </div>

              <!-- Scrolling Loading Spinner -->
              <div
                v-if="isLoading"
                class="py-4 flex items-center justify-center gap-2 text-zinc-400"
              >
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
                <span class="text-xs font-medium">Fetching more tracks...</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Stacked Warning Modal -->
  <Teleport to="body">
    <div
      v-if="activeModal === 'warning'"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/85 p-4 backdrop-blur-sm"
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
                    Return to the Discovery Hub list.
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
                <Button
                  @click="handleOption2"
                  class="flex-1 rounded-lg bg-zinc-800 py-2 px-3 text-xs font-bold text-white hover:bg-zinc-700 transition cursor-pointer"
                >
                  Go Back
                </Button>
                <Button
                  @click="handleOption3"
                  class="flex-1 rounded-lg bg-red-900/40 py-2 px-3 text-xs font-bold text-white hover:bg-red-900/60 border border-red-500/30 transition cursor-pointer"
                >
                  Proceed Anyway
                </Button>
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
                      Preview Video ↗
                    </a>
                  </div>
                </div>
                <Button
                  @click="selectAlternative(alt)"
                  size="sm"
                  class="bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
                >
                  Select
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
