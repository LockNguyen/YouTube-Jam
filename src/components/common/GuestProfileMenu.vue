<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGuestProfileStore } from '@/stores/guestProfile.store'
import { useQueueStore } from '@/stores/queue.store'
import { GUEST_COLORS } from '@/constants/guestColors'
import { Check } from 'lucide-vue-next'

const profileStore = useGuestProfileStore()
const queueStore = useQueueStore()

const isOpen = ref(false)
const editName = ref('')

function openMenu() {
  editName.value = profileStore.profile?.name || ''
  isOpen.value = true
}

function closeMenu() {
  isOpen.value = false
}

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

function updateColor(color: string) {
  if (takenColors.value.has(color)) return
  if (!editName.value.trim()) return
  profileStore.updateProfile(editName.value.trim(), color)
}

function updateName() {
  if (!editName.value.trim()) return
  if (!profileStore.profile?.color) return
  profileStore.updateProfile(editName.value.trim(), profileStore.profile.color)
  closeMenu()
}
</script>

<template>
  <div class="relative inline-block text-left" v-if="profileStore.hasCompleteProfile">
    <!-- Trigger -->
    <button
      @click="isOpen ? closeMenu() : openMenu()"
      class="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 py-1.5 pl-3 pr-1.5 text-sm font-medium text-white shadow-sm backdrop-blur-md transition hover:bg-zinc-800"
    >
      <span class="truncate max-w-[100px]">{{ profileStore.profile?.name }}</span>
      <span
        class="h-6 w-6 rounded-full"
        :style="{ backgroundColor: profileStore.profile?.color }"
      ></span>
    </button>

    <!-- Backdrop -->
    <div v-if="isOpen" @click="closeMenu" class="fixed inset-0 z-40 cursor-default"></div>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
    >
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-zinc-100">Your Identity</h3>
        <button @click="closeMenu" class="text-zinc-500 hover:text-zinc-300">✕</button>
      </div>

      <div class="space-y-4">
        <!-- Name edit -->
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1">Name</label>
          <div class="flex gap-2">
            <input
              v-model="editName"
              type="text"
              class="block w-full rounded-md border-0 bg-zinc-800/50 py-1.5 px-3 text-sm text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-white"
              @keyup.enter="updateName"
            />
            <button
              @click="updateName"
              class="rounded-md bg-white px-2 py-1.5 text-black hover:bg-zinc-200"
            >
              <Check class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Color edit -->
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-2">Color</label>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="color in GUEST_COLORS"
              :key="color"
              type="button"
              :disabled="takenColors.has(color)"
              @click="updateColor(color)"
              class="relative aspect-square rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-20 disabled:hover:scale-100 hover:scale-110"
              :class="{
                'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110': profileStore.profile?.color === color,
                'cursor-not-allowed': takenColors.has(color)
              }"
              :style="{ backgroundColor: color }"
            ></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
