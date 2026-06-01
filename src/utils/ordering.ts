import type { Song } from '@/types/song'
import type { ReorderDirection } from '@/types/queue'

/**
 * Computes new order values for a reorder operation.
 * Returns a map of { songId -> newOrder } for all songs that need updating.
 */
export function computeReorder(
  songs: Song[],
  targetId: string,
  direction: ReorderDirection,
): Record<string, number> {
  const sorted = [...songs].sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex((s) => s.id === targetId)

  if (idx === -1) return {}

  const updates: Record<string, number> = {}

  if (direction === 'up' && idx > 0) {
    const prev = sorted[idx - 1]
    const curr = sorted[idx]
    if (prev && curr) {
      updates[prev.id] = curr.order
      updates[curr.id] = prev.order
    }
  } else if (direction === 'down' && idx < sorted.length - 1) {
    const next = sorted[idx + 1]
    const curr = sorted[idx]
    if (next && curr) {
      updates[next.id] = curr.order
      updates[curr.id] = next.order
    }
  } else if (direction === 'top') {
    const curr = sorted[idx]
    const first = sorted[0]
    if (curr && first && idx > 0) {
      const topOrder = first.order - 1000
      updates[curr.id] = topOrder
    }
  } else if (direction === 'bottom') {
    const curr = sorted[idx]
    const last = sorted[sorted.length - 1]
    if (curr && last && idx < sorted.length - 1) {
      const bottomOrder = last.order + 1000
      updates[curr.id] = bottomOrder
    }
  }

  return updates
}
