import type { ApiResponse } from '@/types/song'
import type { ReorderDirection, SubmitSongPayload } from '@/types/queue'

// In production + netlify dev, functions are served at /.netlify/functions
// Override with VITE_FUNCTIONS_BASE for other setups
const BASE = import.meta.env.VITE_FUNCTIONS_BASE ?? '/.netlify/functions'

async function post<T>(
  path: string,
  body: Record<string, unknown>,
  hostKey?: string,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (hostKey) {
    headers['x-host-key'] = hostKey
  }

  try {
    const res = await fetch(`${BASE}/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    // Guard against non-JSON responses (e.g. 404 HTML from dev server)
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      if (res.status === 404) {
        return {
          ok: false,
          error:
            'Functions not running. Start the dev server with: npm run dev:netlify',
        }
      }
      return { ok: false, error: `Server error: ${res.status} ${res.statusText}` }
    }

    const data = (await res.json()) as ApiResponse<T>
    return data
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

// ─── Guest actions ──────────────────────────────────────────────────────────

export async function registerGuest(payload: {
  name: string
  color: string
  roomId: string
  guestId?: string
}): Promise<ApiResponse<{ guestId: string; name: string; color: string; roomId: string; token: string }>> {
  return post('registerGuest', payload)
}

export async function submitSong(payload: SubmitSongPayload & { roomId: string; token: string }): Promise<ApiResponse> {
  return post('submitSong', payload as unknown as Record<string, unknown>)
}

export async function deleteSongAsGuest(songId: string, token: string, roomId: string): Promise<ApiResponse> {
  return post('deleteSong', { songId, token, roomId })
}

export async function reorderQueueAsGuest(
  songId: string,
  direction: ReorderDirection,
  token: string,
  roomId: string,
): Promise<ApiResponse> {
  return post('reorderQueue', { songId, direction, token, roomId })
}

// ─── Host actions ────────────────────────────────────────────────────────────

export async function skipSong(hostKey: string, roomId: string): Promise<ApiResponse> {
  return post('skipSong', { roomId }, hostKey)
}

export async function previousSong(hostKey: string, roomId: string): Promise<ApiResponse> {
  return post('previousSong', { roomId }, hostKey)
}

export async function deleteSong(hostKey: string, songId: string, roomId: string): Promise<ApiResponse> {
  return post('deleteSong', { songId, roomId }, hostKey)
}

export async function clearQueue(hostKey: string, roomId: string): Promise<ApiResponse> {
  return post('clearQueue', { roomId }, hostKey)
}

export async function reorderQueue(
  hostKey: string,
  songId: string,
  direction: ReorderDirection,
  roomId: string,
): Promise<ApiResponse> {
  return post('reorderQueue', { songId, direction, roomId }, hostKey)
}

export async function setNowPlaying(hostKey: string, songId: string | null, roomId: string): Promise<ApiResponse> {
  return post('setNowPlaying', { songId, roomId }, hostKey)
}

export async function setPerformanceMode(hostKey: string, enabled: boolean, roomId: string): Promise<ApiResponse> {
  return post('setPerformanceMode', { enabled, roomId }, hostKey)
}
