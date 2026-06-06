import swooshUrl from '@/assets/sounds/swoosh.mp3'

/**
 * Plays a simple swoosh sound effect for dramatic reveals.
 * Fails gracefully if the browser blocks autoplay.
 */
export function playSwoosh(): void {
  try {
    const audio = new Audio(swooshUrl)
    audio.volume = 0.2
    // Catch and swallow DOMException (NotAllowedError) if browser blocks audio
    audio.play().catch(() => {})
  } catch {
    // Ignore any other errors
  }
}
