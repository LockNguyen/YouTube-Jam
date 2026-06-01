import { ref } from 'vue'
import { playSwoosh } from '@/services/soundEffects'

export type PerformanceIntroState = {
  isRunning: boolean
  isTitleVisible: boolean
  isArtistVisible: boolean
  isDimmed: boolean
  isZoomed: boolean
  currentSongId: string | null
}

export function usePerformanceIntro(player: {
  getDuration: () => number
  seekTo: (s: number) => void
  getVolume: () => number
  setVolume: (v: number) => void
  play: () => void
  pause: () => void
}) {
  const state = ref<PerformanceIntroState>({
    isRunning: false,
    isTitleVisible: false,
    isArtistVisible: false,
    isDimmed: false,
    isZoomed: false,
    currentSongId: null,
  })

  const originalVolume = 100
  let timeouts: number[] = []

  function clearTimeouts() {
    timeouts.forEach(clearTimeout)
    timeouts = []
  }

  function skipIntro() {
    if (!state.value.isRunning) return
    clearTimeouts()

    // Restore volume and play from start
    player.setVolume(originalVolume)
    player.seekTo(0)
    player.play()

    state.value.isRunning = false
    state.value.isTitleVisible = false
    state.value.isArtistVisible = false
    state.value.isDimmed = false
    state.value.isZoomed = false
  }

  function startIntro(songId: string) {
    clearTimeouts()

    // Start out with the video zoomed in and muted
    player.setVolume(0)

    state.value = {
      isRunning: true,
      isTitleVisible: false,
      isArtistVisible: false,
      isDimmed: true,
      isZoomed: true,
      currentSongId: songId,
    }

    // Wait a brief moment for the video to load before grabbing duration/volume
    // The player should already be loading it via HostPlayer.vue
    timeouts.push(window.setTimeout(() => {
      if (!state.value.isRunning) return


      player.setVolume(30)
      const duration = player.getDuration()

      if (duration > 0) {
        player.seekTo(Math.max(0, duration * 0.75))
      }
      player.play()

      // 5.0s: Fade in dark overlay, lower volume
      timeouts.push(window.setTimeout(() => {
        state.value.isDimmed = true
        state.value.isZoomed = false

        // 5.2s: Reveal title
        timeouts.push(window.setTimeout(() => {
          state.value.isTitleVisible = true
        }, 500))

        // 5.2s: Swoosh
        timeouts.push(window.setTimeout(() => {
          playSwoosh()
        }, 600))

        // 6.2s: Reveal name
        timeouts.push(window.setTimeout(() => {
          state.value.isArtistVisible = true
        }, 1400))

        // 6.2s: Swoosh
        timeouts.push(window.setTimeout(() => {
          playSwoosh()
        }, 1500))

      }, 2000)) // 0.5s initial + 4.5s = 5.0s total

      // 10.0s: End intro, start song
      timeouts.push(window.setTimeout(() => {
        skipIntro()
      }, 5000))

    }, 1000))
  }

  return {
    introState: state,
    startIntro,
    skipIntro,
    clearTimeouts,
  }
}
