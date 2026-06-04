import { adminDb } from './firebaseAdmin'
import type { Song, SongStatus, QueueState } from '../../src/types/song'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): number {
  return Date.now()
}

async function getAllSongs(roomId: string): Promise<Song[]> {
  const snap = await adminDb.ref(`rooms/${roomId}/songs`).once('value')
  if (!snap.exists()) return []
  const raw = snap.val() as Record<string, Omit<Song, 'id'>>
  return Object.entries(raw)
    .map(([id, data]) => ({ id, ...data }))
    .filter((s) => typeof s.order === 'number' && !isNaN(s.order) && s.videoId)
}

// ─── Queue service ────────────────────────────────────────────────────────────

export async function addSong(
  roomId: string,
  videoId: string,
  title: string | null,
  thumbnailUrl: string | null,
  guestId: string,
  name: string,
  color: string,
): Promise<string> {
  const songsRef = adminDb.ref(`rooms/${roomId}/songs`)
  const newSongRef = songsRef.push()
  const id = newSongRef.key!

  const song: Omit<Song, 'id'> = {
    videoId,
    title,
    thumbnailUrl,
    status: 'queued',
    order: 0, // set dynamically inside transaction
    submittedAt: now(),
    submittedByGuestId: guestId,
    submittedByName: name,
    submittedByColor: color,
    startedAt: null,
    endedAt: null,
    deletedAt: null,
  }

  await songsRef.transaction((currentSongs) => {
    const raw = currentSongs || {}
    const songsList = Object.entries(raw).map(([songId, data]) => ({ id: songId, ...(data as any) }))
    const active = songsList.filter((s) => s.status === 'queued' || s.status === 'playing')
    const orders = active.map((s) => Number(s.order)).filter((o) => !isNaN(o))
    const maxOrder = orders.length > 0 ? Math.max(...orders) : 0

    song.order = maxOrder + 1000
    raw[id] = song
    return raw
  })

  return id
}

export async function performSkip(roomId: string): Promise<{ nextSongId: string | null }> {
  const roomRef = adminDb.ref(`rooms/${roomId}`)
  let nextId: string | null = null

  await roomRef.transaction((currentRoom) => {
    if (!currentRoom) return {}

    const songsRaw = currentRoom.songs || {}
    const stateRaw = currentRoom.state || {}
    const currentId = stateRaw.currentSongId

    // 1. Skip current song
    if (currentId && songsRaw[currentId]) {
      songsRaw[currentId].status = 'skipped'
      songsRaw[currentId].endedAt = now()
    }

    // 2. Find next queued song
    const songsList = Object.entries(songsRaw).map(([id, data]) => ({ id, ...(data as any) }))
    const queued = songsList
      .filter((s) => s.status === 'queued')
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    
    const next = queued[0] ?? null
    nextId = next?.id ?? null

    // 3. Set next song playing
    if (nextId && songsRaw[nextId]) {
      songsRaw[nextId].status = 'playing'
      songsRaw[nextId].startedAt = now()
    }

    // 4. Update state
    stateRaw.currentSongId = nextId
    stateRaw.updatedAt = now()

    currentRoom.songs = songsRaw
    currentRoom.state = stateRaw
    return currentRoom
  })

  return { nextSongId: nextId }
}

export async function performPrevious(roomId: string): Promise<{ previousSongId: string | null }> {
  const roomRef = adminDb.ref(`rooms/${roomId}`)
  let prevId: string | null = null

  await roomRef.transaction((currentRoom) => {
    if (!currentRoom) return {}

    const songsRaw = currentRoom.songs || {}
    const stateRaw = currentRoom.state || {}
    const currentId = stateRaw.currentSongId

    const songsList = Object.entries(songsRaw).map(([id, data]) => ({ id, ...(data as any) }))
    const history = songsList
      .filter((s) => s.status === 'played' || s.status === 'skipped')
      .sort((a, b) => Number(b.endedAt || 0) - Number(a.endedAt || 0))
    
    const previous = history[0] ?? null
    if (!previous) return // Abort: no previous history

    prevId = previous.id

    // Put current song back in queue at the front
    if (currentId && songsRaw[currentId]) {
      const queued = songsList.filter((s) => s.status === 'queued')
      const orders = queued.map((s) => Number(s.order)).filter((o) => !isNaN(o))
      const minOrder = orders.length > 0 ? Math.min(...orders) : 1000
      
      songsRaw[currentId].status = 'queued'
      songsRaw[currentId].startedAt = null
      songsRaw[currentId].endedAt = null
      songsRaw[currentId].order = minOrder - 1000
    }

    // Set previous song as playing
    songsRaw[previous.id].status = 'playing'
    songsRaw[previous.id].startedAt = now()
    songsRaw[previous.id].endedAt = null

    stateRaw.currentSongId = previous.id
    stateRaw.updatedAt = now()

    currentRoom.songs = songsRaw
    currentRoom.state = stateRaw
    return currentRoom
  })

  return { previousSongId: prevId }
}

export async function performDelete(
  roomId: string,
  songId: string,
  guestId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const roomRef = adminDb.ref(`rooms/${roomId}`)
  let result = { ok: true, error: '' }

  await roomRef.transaction((currentRoom) => {
    if (!currentRoom) return {}

    const songsRaw = currentRoom.songs || {}
    const stateRaw = currentRoom.state || {}
    const song = songsRaw[songId]

    if (!song) {
      result = { ok: false, error: 'Song not found' }
      return
    }

    // Guest ownership checks
    if (guestId) {
      if (song.submittedByGuestId !== guestId) {
        result = { ok: false, error: 'Cannot delete someone else’s song' }
        return
      }
      if (song.status !== 'queued') {
        result = { ok: false, error: 'Guests can only delete queued songs' }
        return
      }
    }

    const isCurrentSong = stateRaw.currentSongId === songId

    song.status = 'deleted'
    song.deletedAt = now()

    if (isCurrentSong) {
      const songsList = Object.entries(songsRaw).map(([id, data]) => ({ id, ...(data as any) }))
      const queued = songsList
        .filter((s) => s.status === 'queued' && s.id !== songId)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      
      const next = queued[0] ?? null
      
      if (next) {
        songsRaw[next.id].status = 'playing'
        songsRaw[next.id].startedAt = now()
      }
      stateRaw.currentSongId = next?.id ?? null
      stateRaw.updatedAt = now()
    }

    currentRoom.songs = songsRaw
    currentRoom.state = stateRaw
    return currentRoom
  })

  if (!result.ok) return result
  return { ok: true }
}

export async function performSetNowPlaying(roomId: string, songId: string | null): Promise<void> {
  const roomRef = adminDb.ref(`rooms/${roomId}`)

  await roomRef.transaction((currentRoom) => {
    if (!currentRoom) return {}

    const songsRaw = currentRoom.songs || {}
    const stateRaw = currentRoom.state || {}
    const currentId = stateRaw.currentSongId

    // Transition previous song to played
    if (currentId && songsRaw[currentId] && songsRaw[currentId].status === 'playing') {
      songsRaw[currentId].status = 'played'
      songsRaw[currentId].endedAt = now()
    }

    const songsList = Object.entries(songsRaw).map(([id, data]) => ({ id, ...(data as any) }))
    const queued = songsList.filter((s) => s.status === 'queued')
    const next = queued.find((s) => s.id === songId) ?? null

    stateRaw.currentSongId = next?.id ?? null
    stateRaw.updatedAt = now()

    if (next && songsRaw[next.id]) {
      songsRaw[next.id].status = 'playing'
      songsRaw[next.id].startedAt = now()
    }

    currentRoom.songs = songsRaw
    currentRoom.state = stateRaw
    return currentRoom
  })
}

export async function setPerformanceMode(roomId: string, enabled: boolean): Promise<void> {
  await adminDb.ref(`rooms/${roomId}/state`).update({
    performanceMode: enabled,
    updatedAt: now(),
  })
}

export async function performClearQueue(roomId: string): Promise<void> {
  const songsRef = adminDb.ref(`rooms/${roomId}/songs`)

  await songsRef.transaction((currentSongs) => {
    if (!currentSongs) return {}

    for (const id of Object.keys(currentSongs)) {
      if (currentSongs[id].status === 'queued') {
        currentSongs[id].status = 'deleted'
        currentSongs[id].deletedAt = now()
      }
    }
    return currentSongs
  })
}

export async function performReorder(
  roomId: string,
  songId: string,
  direction: 'up' | 'down' | 'top' | 'bottom',
  guestId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const roomRef = adminDb.ref(`rooms/${roomId}`)
  let result = { ok: true, error: '' }

  await roomRef.transaction((currentRoom) => {
    if (!currentRoom) return {}

    const songsRaw = currentRoom.songs || {}
    const songsList = Object.entries(songsRaw).map(([id, data]) => ({ id, ...(data as any) }))
    const targetSong = songsRaw[songId]

    if (!targetSong) {
      result = { ok: false, error: 'Song not found' }
      return
    }

    // Guest ownership checks for reordering
    if (guestId && targetSong.submittedByGuestId !== guestId) {
      result = { ok: false, error: 'Cannot reorder someone else’s song' }
      return
    }

    const queued = songsList
      .filter((s) => s.status === 'queued')
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))

    const idx = queued.findIndex((s) => s.id === songId)
    if (idx === -1) {
      result = { ok: false, error: 'Song is not in the queue' }
      return
    }

    const curr = queued[idx]!

    if (direction === 'up' && idx > 0) {
      const prev = queued[idx - 1]!
      const temp = curr.order
      songsRaw[curr.id].order = prev.order
      songsRaw[prev.id].order = temp
    } else if (direction === 'down' && idx < queued.length - 1) {
      const next = queued[idx + 1]!
      const temp = curr.order
      songsRaw[curr.id].order = next.order
      songsRaw[next.id].order = temp
    } else if (direction === 'top' && idx > 0) {
      const first = queued[0]!
      songsRaw[curr.id].order = first.order - 1000
    } else if (direction === 'bottom' && idx < queued.length - 1) {
      const last = queued[queued.length - 1]!
      songsRaw[curr.id].order = last.order + 1000
    }

    currentRoom.songs = songsRaw
    return currentRoom
  })

  if (!result.ok) return result
  return { ok: true }
}
