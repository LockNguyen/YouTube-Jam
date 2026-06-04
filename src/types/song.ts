export type SongStatus = 'queued' | 'playing' | 'played' | 'skipped' | 'deleted'

export interface Song {
  id: string
  videoId: string
  title: string | null
  thumbnailUrl: string | null
  status: SongStatus
  order: number
  submittedAt: number
  submittedByGuestId: string
  submittedByName: string
  submittedByColor: string
  startedAt: number | null
  endedAt: number | null
  deletedAt: number | null
}

export interface GuestProfile {
  guestId: string
  name: string
  color: string
  token?: string
}

export interface QueueState {
  currentSongId: string | null
  updatedAt: number
  performanceMode: boolean
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}
