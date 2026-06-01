/**
 * Plays a simple swoosh sound effect for dramatic reveals.
 * Fails gracefully if the browser blocks autoplay.
 */
export function playSwoosh(): void {
  try {
    const audio = new Audio('/src/assets/sounds/swoosh.mp3')
    audio.volume = 0.2
    // Catch and swallow DOMException (NotAllowedError) if browser blocks audio
    audio.play().catch(() => {})
  } catch {
    // Ignore any other errors
  }
}
