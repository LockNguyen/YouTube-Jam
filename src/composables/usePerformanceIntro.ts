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

  let originalVolume = 100
  let timeouts: number[] = []

  function clearTimeouts() {
    timeouts.forEach(clearTimeout)
    timeouts = []
  }

  function stopIntro() {
    clearTimeouts()
    if (state.value.isRunning) {
      player.setVolume(originalVolume)
      state.value.isRunning = false
    }
    state.value.isTitleVisible = false
    state.value.isArtistVisible = false
    state.value.isDimmed = false
    state.value.isZoomed = false
    state.value.currentSongId = null
  }

  function skipIntro() {
    if (!state.value.isRunning) return
    stopIntro()
    player.seekTo(0)
    player.play()
  }

  function startIntro(songId: string) {
    clearTimeouts()

    // Store current volume level to restore it later
    originalVolume = player.getVolume()

    // Start video zoomed and muted
    player.setVolume(0)

    state.value = {
      isRunning: true,
      isTitleVisible: false,
      isArtistVisible: false,
      isDimmed: true,
      isZoomed: true,
      currentSongId: songId,
    }

    // Wait for the video iframe to buffer/start before seeking
    timeouts.push(window.setTimeout(() => {
      if (!state.value.isRunning) return

      player.setVolume(originalVolume)
      const duration = player.getDuration()

      if (duration > 0) {
        player.seekTo(Math.max(0, duration * 0.75))
      }
      player.play()

      // 5.0s mark: Zoom out video, apply dimming overlay
      timeouts.push(window.setTimeout(() => {
        if (!state.value.isRunning) return
        state.value.isDimmed = true
        state.value.isZoomed = false
        playSwoosh()

        // 5.5s mark: Fade in title
        timeouts.push(window.setTimeout(() => {
          if (!state.value.isRunning) return
          state.value.isTitleVisible = true
        }, 500))

        // Title swoosh effect
        timeouts.push(window.setTimeout(() => {
          if (!state.value.isRunning) return
          playSwoosh()
        }, 550))

        // 9.3s mark: Switch title to performer name
        timeouts.push(window.setTimeout(() => {
          if (!state.value.isRunning) return
          state.value.isTitleVisible = false
          state.value.isArtistVisible = true
        }, 3800))

        // Performer swoosh effect
        timeouts.push(window.setTimeout(() => {
          if (!state.value.isRunning) return
          playSwoosh()
        }, 3850))

        // 11.3s mark: Hide performer name
        timeouts.push(window.setTimeout(() => {
          if (!state.value.isRunning) return
          state.value.isArtistVisible = false
        }, 5800))

        // Outro swoosh effect
        timeouts.push(window.setTimeout(() => {
          if (!state.value.isRunning) return
          playSwoosh()
        }, 5850))

        // 10.5s mark: Undim screen
        timeouts.push(window.setTimeout(() => {
          if (!state.value.isRunning) return
          state.value.isDimmed = false
        }, 5000))

        // Audio fade calculations proportional to starting volume
        const fade = (ratio: number) => {
          if (!state.value.isRunning) return
          player.setVolume(Math.floor(originalVolume * ratio))
        }

        timeouts.push(window.setTimeout(() => fade(0.80), 5300))
        timeouts.push(window.setTimeout(() => fade(0.50), 5400))
        timeouts.push(window.setTimeout(() => fade(0.30), 5500))
        timeouts.push(window.setTimeout(() => fade(0.20), 5600))
        timeouts.push(window.setTimeout(() => fade(0.15), 5700))
        timeouts.push(window.setTimeout(() => fade(0.10), 5800))
        timeouts.push(window.setTimeout(() => fade(0.05), 5900))
        timeouts.push(window.setTimeout(() => fade(0.00), 6000))

      }, 1000))

      // 12.0s mark: Exit intro and start song
      timeouts.push(window.setTimeout(() => {
        skipIntro()
      }, 6500))

    }, 1000))
  }

  return {
    introState: state,
    startIntro,
    skipIntro,
    stopIntro,
    clearTimeouts,
  }
}
