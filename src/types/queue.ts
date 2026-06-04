export type { Song, SongStatus, QueueState, ApiResponse } from './song'

export type ReorderDirection = 'up' | 'down' | 'top' | 'bottom'

export interface SubmitSongPayload {
  youtubeUrl: string
  guestId: string
  name: string
  color: string
  title?: string | null
  thumbnailUrl?: string | null
}

export interface ReorderPayload {
  songId: string
  guestId: string
  direction: ReorderDirection
}
