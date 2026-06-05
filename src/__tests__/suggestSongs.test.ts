import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { handler } from '../../netlify/functions/suggestSongs'
import { adminDb } from '../../netlify/shared/firebaseAdmin'

vi.mock('../../netlify/shared/firebaseAdmin', () => {
  const mockRef = {
    once: vi.fn()
  }
  return {
    adminDb: {
      ref: vi.fn().mockReturnValue(mockRef)
    }
  }
})

describe('suggestSongs Netlify function', () => {
  const fetchSpy = vi.spyOn(global, 'fetch')

  beforeEach(() => {
    vi.stubEnv('YOUTUBE_API_KEY', '')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects non-POST methods with 405 status', async () => {
    const event = {
      httpMethod: 'GET',
      body: '',
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(405)
  })

  it('rejects requests missing roomId with 400 status', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({}),
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(400)
    expect(JSON.parse(result!.body || '').error).toContain('roomId is required')
  })

  it('queries empty room with popular classics query', async () => {
    // Mock empty room in Firebase
    const mockOnce = vi.fn().mockResolvedValue({
      val: () => null
    })
    vi.spyOn(adminDb, 'ref').mockReturnValue({ once: mockOnce } as any)

    // Mock search fetch and oEmbed checks
    fetchSpy.mockImplementation(async (url: any) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('youtube.com/oembed')) {
        return { status: 200 } as Response
      }
      if (urlStr.includes('/api/v1/search')) {
        expect(urlStr).toContain('q=karaoke%20classics')
        return {
          ok: true,
          status: 200,
          json: async () => [
            { videoId: 'classic1', title: 'Classic Song 1' }
          ]
        } as Response
      }
      return { ok: false, status: 404 } as Response
    })

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ roomId: 'room123' }),
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(200)
    const data = JSON.parse(result!.body || '').data
    expect(data.results).toHaveLength(1)
    expect(data.results[0].videoId).toBe('classic1')
  })

  it('queries non-empty room using latest videoId and filters existing songs', async () => {
    // Mock room with songs in Firebase (latest submitted has highest submittedAt)
    const mockOnce = vi.fn().mockResolvedValue({
      val: () => ({
        songA: { videoId: 'videoA', title: 'Song A', submittedAt: 1000, status: 'played' },
        songB: { videoId: 'videoB', title: 'Song B', submittedAt: 2000, status: 'queued' }
      })
    })
    vi.spyOn(adminDb, 'ref').mockReturnValue({ once: mockOnce } as any)

    // Mock related videos fetch: returns videoB (which already exists and should be filtered) and videoC (new)
    fetchSpy.mockImplementation(async (url: any) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('youtube.com/oembed')) {
        return { status: 200 } as Response
      }
      if (urlStr.includes('/api/v1/videos/videoB')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            recommendedVideos: [
              { videoId: 'videoB', title: 'Song B' },
              { videoId: 'videoC', title: 'Song C' }
            ]
          })
        } as Response
      }
      return { ok: false, status: 404 } as Response
    })

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ roomId: 'room123' }),
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(200)
    const data = JSON.parse(result!.body || '').data
    // videoB should be filtered out because it is already in the room, so only videoC is left
    expect(data.results).toHaveLength(1)
    expect(data.results[0].videoId).toBe('videoC')
    expect(data.results[0].title).toBe('Song C')
  })
})
