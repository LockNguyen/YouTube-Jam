import { ref, onUnmounted } from 'vue'

// ─── Minimal YouTube IFrame API type declarations ────────────────────────────
// These match the subset of the API that we actually use.

interface YTPlayerVars {
  autoplay?: 0 | 1
  controls?: 0 | 1 | 2
  modestbranding?: 0 | 1
  rel?: 0 | 1
  showinfo?: 0 | 1
  iv_load_policy?: 1 | 3
  fs?: 0 | 1
  disablekb?: 0 | 1
  playsinline?: 0 | 1
}

interface YTPlayerEvent {
  target: YTPlayerInstance
  data: number
}

interface YTPlayerInstance {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  loadVideoById(videoId: string): void
  getPlayerState(): number
  getDuration(): number
  getCurrentTime(): number
  setVolume(volume: number): void
  getVolume(): number
  destroy(): void
}

interface YTPlayerOptions {
  width?: string | number
  height?: string | number
  playerVars?: YTPlayerVars
  events?: {
    onReady?: (event: YTPlayerEvent) => void
    onStateChange?: (event: YTPlayerEvent) => void
    onError?: (event: YTPlayerEvent) => void
  }
}

const PlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, options: YTPlayerOptions) => YTPlayerInstance
      PlayerState: typeof PlayerState
    }
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

// ─── API loading ─────────────────────────────────────────────────────────────

let apiLoaded = false
let apiLoading = false
const apiReadyCallbacks: (() => void)[] = []

function loadYouTubeApi(): Promise<void> {
  if (apiLoaded) return Promise.resolve()
  if (apiLoading) {
    return new Promise((resolve) => {
      apiReadyCallbacks.push(resolve)
    })
  }

  apiLoading = true
  return new Promise((resolve) => {
    apiReadyCallbacks.push(resolve)

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true
      apiLoading = false
      apiReadyCallbacks.forEach((cb) => cb())
      apiReadyCallbacks.length = 0
    }

    document.head.appendChild(tag)
  })
}

// ─── Composable ───────────────────────────────────────────────────────────────

export interface UseYouTubePlayerOptions {
  onEnded?: () => void
  onError?: (event: YTPlayerEvent) => void
  onStateChange?: (event: YTPlayerEvent) => void
}

export function useYouTubePlayer(options: UseYouTubePlayerOptions = {}) {
  const isReady = ref(false)
  const isPlaying = ref(false)
  const playerState = ref<number>(-1)

  let player: YTPlayerInstance | null = null

  async function init(elementId: string) {
    await loadYouTubeApi()

    player = new window.YT.Player(elementId, {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        fs: 0,
        disablekb: 1,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          isReady.value = true
        },
        onStateChange: (event: YTPlayerEvent) => {
          playerState.value = event.data
          isPlaying.value = event.data === PlayerState.PLAYING

          options.onStateChange?.(event)

          if (event.data === PlayerState.ENDED) {
            options.onEnded?.()
          }
        },
        onError: (event: YTPlayerEvent) => {
          options.onError?.(event)
        },
      },
    })
  }

  function loadVideo(videoId: string) {
    if (!player || !isReady.value) return
    player.loadVideoById(videoId)
  }

  function play() {
    player?.playVideo()
  }

  function pause() {
    player?.pauseVideo()
  }

  function restart() {
    player?.seekTo(0, true)
    player?.playVideo()
  }

  function getState(): number {
    return player?.getPlayerState() ?? -1
  }

   function getDuration(): number {
    return player?.getDuration() ?? 0
  }

  function getCurrentTime(): number {
    return player?.getCurrentTime() ?? 0
  }

  function seekTo(seconds: number) {
    player?.seekTo(seconds, true)
  }

  function getVolume(): number {
    return player?.getVolume() ?? 100
  }

  function setVolume(volume: number) {
    player?.setVolume(volume)
  }

  function destroy() {
    if (player) {
      player.destroy()
      player = null
      isReady.value = false
    }
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    isReady,
    isPlaying,
    playerState,
    init,
    loadVideo,
    play,
    pause,
    restart,
    getState,
    getDuration,
    getCurrentTime,
    seekTo,
    getVolume,
    setVolume,
    destroy,
  }
}
