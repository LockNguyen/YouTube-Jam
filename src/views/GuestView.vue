<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useQueueStore } from '@/stores/queue.store'
import AppShell from '@/components/common/AppShell.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import NowPlayingCard from '@/components/guest/NowPlayingCard.vue'
import SongSubmitForm from '@/components/guest/SongSubmitForm.vue'
import UpcomingQueue from '@/components/guest/UpcomingQueue.vue'

const store = useQueueStore()

onMounted(() => {
  store.subscribe()
})

onUnmounted(() => {
  store.unsubscribe()
})
</script>

<template>
  <AppShell>
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
