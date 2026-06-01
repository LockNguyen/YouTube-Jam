export type { Song, SongStatus, QueueState, ApiResponse } from './song'

export type ReorderDirection = 'up' | 'down' | 'top' | 'bottom'

export interface SubmitSongPayload {
  youtubeUrl: string
  submittedBy: string | null
}

export interface ReorderPayload {
  songId: string
  direction: ReorderDirection
}
