<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import AppShell from '@/components/common/AppShell.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import NowPlayingCard from '@/components/guest/NowPlayingCard.vue'
import SongSubmitForm from '@/components/guest/SongSubmitForm.vue'
import UpcomingQueue from '@/components/guest/UpcomingQueue.vue'
import GuestProfileGate from '@/components/guest/GuestProfileGate.vue'
import GuestProfileMenu from '@/components/common/GuestProfileMenu.vue'
import { useGuestProfileStore } from '@/stores/guestProfile.store'

const props = defineProps<{
  roomId: string
}>()

const store = useQueueStore()
const profileStore = useGuestProfileStore()

onMounted(() => {
  store.subscribe(props.roomId)
})

onUnmounted(() => {
  store.unsubscribe()
})
</script>

<template>
  <GuestProfileGate v-if="!profileStore.hasCompleteProfile" />
  
  <AppShell v-else>
    <template #header-right>
      <GuestProfileMenu />
    </template>

    <div class="flex flex-col gap-5">
      <LoadingState v-if="store.isLoading" message="Connecting to queue…" />

      <template v-else>
        <!-- Database Connection Error Banner -->
        <div v-if="store.error" class="rounded-[var(--radius)] border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p class="text-sm font-semibold text-red-400">Database Connection Error</p>
          <p class="mt-1 text-xs text-red-400/80">{{ store.error }}</p>
          <p class="mt-2 text-[10px] text-zinc-400">
            Please verify that your Firebase Database Security Rules permit read access to the "/rooms" path.
          </p>
        </div>

        <NowPlayingCard />
        <SongSubmitForm />
        <UpcomingQueue />
      </template>
    </div>
  </AppShell>
</template>
