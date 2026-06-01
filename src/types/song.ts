export type SongStatus = 'queued' | 'playing' | 'played' | 'skipped' | 'deleted'

export interface Song {
  id: string
  videoId: string
  title: string | null
  thumbnailUrl: string | null
  status: SongStatus
  order: number
  submittedAt: number
  submittedBy: string | null
  startedAt: number | null
  endedAt: number | null
  deletedAt: number | null
}

export interface QueueState {
  currentSongId: string | null
  updatedAt: number
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}
