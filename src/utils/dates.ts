/**
 * Format a Unix timestamp (ms) as a short time string, e.g. "9:45 PM"
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format a Unix timestamp (ms) as a short date+time string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Returns the current Unix timestamp in milliseconds
 */
export function now(): number {
  return Date.now()
}
