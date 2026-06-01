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

export async function submitSong(payload: SubmitSongPayload): Promise<ApiResponse> {
  return post('submitSong', { youtubeUrl: payload.youtubeUrl, submittedBy: payload.submittedBy })
}

// ─── Host actions ────────────────────────────────────────────────────────────

export async function skipSong(hostKey: string): Promise<ApiResponse> {
  return post('skipSong', {}, hostKey)
}

export async function previousSong(hostKey: string): Promise<ApiResponse> {
  return post('previousSong', {}, hostKey)
}

export async function deleteSong(hostKey: string, songId: string): Promise<ApiResponse> {
  return post('deleteSong', { songId }, hostKey)
}

export async function clearQueue(hostKey: string): Promise<ApiResponse> {
  return post('clearQueue', {}, hostKey)
}

export async function reorderQueue(
  hostKey: string,
  songId: string,
  direction: ReorderDirection,
): Promise<ApiResponse> {
  return post('reorderQueue', { songId, direction }, hostKey)
}

export async function setNowPlaying(hostKey: string, songId: string | null): Promise<ApiResponse> {
  return post('setNowPlaying', { songId }, hostKey)
}
