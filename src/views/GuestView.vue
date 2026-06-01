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

const store = useQueueStore()
const profileStore = useGuestProfileStore()

onMounted(() => {
  store.subscribe()
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
        <NowPlayingCard />
        <SongSubmitForm />
        <UpcomingQueue />
      </template>
    </div>
  </AppShell>
</template>
