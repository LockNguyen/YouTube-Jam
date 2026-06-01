import { adminDb } from './firebaseAdmin'
import type { Song, SongStatus, QueueState } from '../../src/types/song'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): number {
  return Date.now()
}

async function getAllSongs(): Promise<Song[]> {
  const snap = await adminDb.ref('songs').once('value')
  if (!snap.exists()) return []
  const raw = snap.val() as Record<string, Omit<Song, 'id'>>
  return Object.entries(raw).map(([id, data]) => ({ id, ...data }))
}

async function getState(): Promise<QueueState | null> {
  const snap = await adminDb.ref('state').once('value')
  return snap.exists() ? (snap.val() as QueueState) : null
}

// ─── Queue service ────────────────────────────────────────────────────────────

export async function addSong(
  videoId: string,
  title: string | null,
  thumbnailUrl: string | null,
  submittedBy: string | null,
): Promise<string> {
  const songs = await getAllSongs()
  const queued = songs.filter((s) => s.status === 'queued' || s.status === 'playing')
  const maxOrder = queued.length > 0 ? Math.max(...queued.map((s) => s.order)) : 0

  const newRef = adminDb.ref('songs').push()
  const id = newRef.key!

  const song: Omit<Song, 'id'> = {
    videoId,
    title,
    thumbnailUrl,
    status: 'queued',
    order: maxOrder + 1000,
    submittedAt: now(),
    submittedBy,
    startedAt: null,
    endedAt: null,
    deletedAt: null,
  }

  await newRef.set(song)
  return id
}

export async function getNextQueuedSong(excludeId?: string): Promise<Song | null> {
  const songs = await getAllSongs()
  const queued = songs
    .filter((s) => s.status === 'queued' && s.id !== excludeId)
    .sort((a, b) => a.order - b.order)
  return queued[0] ?? null
}

export async function getPreviousSong(): Promise<Song | null> {
  const songs = await getAllSongs()
  const history = songs
    .filter((s) => s.status === 'played' || s.status === 'skipped')
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
  return history[0] ?? null
}

export async function markSongAs(
  songId: string,
  status: SongStatus,
  extra: Partial<Song> = {},
): Promise<void> {
  const updates: Partial<Song> = { status, ...extra }
  await adminDb.ref(`songs/${songId}`).update(updates)
}

export async function setCurrentSong(songId: string | null): Promise<void> {
  const state: QueueState = {
    currentSongId: songId,
    updatedAt: now(),
  }
  await adminDb.ref('state').set(state)
}

export async function performSkip(): Promise<{ nextSongId: string | null }> {
  const state = await getState()
  const currentId = state?.currentSongId

  if (currentId) {
    await markSongAs(currentId, 'skipped', { endedAt: now() })
  }

  const next = await getNextQueuedSong()
  const nextId = next?.id ?? null

  if (nextId) {
    await markSongAs(nextId, 'playing', { startedAt: now() })
  }

  await setCurrentSong(nextId)
  return { nextSongId: nextId }
}

export async function performPrevious(): Promise<{ previousSongId: string | null }> {
  const state = await getState()
  const currentId = state?.currentSongId

  const previous = await getPreviousSong()
  if (!previous) return { previousSongId: null }

  if (currentId) {
    const songs = await getAllSongs()
    const queued = songs.filter((s) => s.status === 'queued')
    const minOrder = queued.length > 0 ? Math.min(...queued.map((s) => s.order)) : 1000
    await markSongAs(currentId, 'queued', {
      startedAt: null,
      endedAt: null,
      order: minOrder - 1000,
    })
  }

  await markSongAs(previous.id, 'playing', { startedAt: now(), endedAt: null })
  await setCurrentSong(previous.id)

  return { previousSongId: previous.id }
}

export async function performDelete(songId: string): Promise<void> {
  const state = await getState()
  const isCurrentSong = state?.currentSongId === songId

  await markSongAs(songId, 'deleted', { deletedAt: now() })

  if (isCurrentSong) {
    const next = await getNextQueuedSong(songId)
    if (next) {
      await markSongAs(next.id, 'playing', { startedAt: now() })
    }
    await setCurrentSong(next?.id ?? null)
  }
}

export async function performSetNowPlaying(songId: string | null): Promise<void> {
  const state = await getState()
  const currentId = state?.currentSongId

  if (currentId && currentId !== songId) {
    await markSongAs(currentId, 'played', { endedAt: now() })
  }

  if (songId) {
    await markSongAs(songId, 'playing', { startedAt: now() })
  }

  await setCurrentSong(songId)
}

export async function performClearQueue(): Promise<void> {
  const songs = await getAllSongs()
  const queued = songs.filter((s) => s.status === 'queued')

  for (const song of queued) {
    await adminDb.ref(`songs/${song.id}`).update({ status: 'deleted', deletedAt: now() })
  }
}

export async function performReorder(
  songId: string,
  direction: 'up' | 'down' | 'top' | 'bottom',
): Promise<void> {
  const songs = await getAllSongs()
  const queued = songs.filter((s) => s.status === 'queued').sort((a, b) => a.order - b.order)
  const idx = queued.findIndex((s) => s.id === songId)
  if (idx === -1) return

  const curr = queued[idx]
  if (!curr) return

  if (direction === 'up' && idx > 0) {
    const prev = queued[idx - 1]
    if (!prev) return
    await adminDb.ref(`songs/${curr.id}`).update({ order: prev.order })
    await adminDb.ref(`songs/${prev.id}`).update({ order: curr.order })
  } else if (direction === 'down' && idx < queued.length - 1) {
    const next = queued[idx + 1]
    if (!next) return
    await adminDb.ref(`songs/${curr.id}`).update({ order: next.order })
    await adminDb.ref(`songs/${next.id}`).update({ order: curr.order })
  } else if (direction === 'top' && idx > 0) {
    const first = queued[0]
    if (!first) return
    await adminDb.ref(`songs/${curr.id}`).update({ order: first.order - 1000 })
  } else if (direction === 'bottom' && idx < queued.length - 1) {
    const last = queued[queued.length - 1]
    if (!last) return
    await adminDb.ref(`songs/${curr.id}`).update({ order: last.order + 1000 })
  }
}
