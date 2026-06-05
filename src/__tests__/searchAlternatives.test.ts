import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { handler } from '../../netlify/functions/searchAlternatives'

describe('searchAlternatives Netlify function', () => {
  const fetchSpy = vi.spyOn(global, 'fetch')

  beforeEach(() => {
    vi.stubEnv('YOUTUBE_API_KEY', '')
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('rejects non-POST methods with 405 status', async () => {
    const event = {
      httpMethod: 'GET',
      body: '',
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result).toBeDefined()
    expect(result!.statusCode).toBe(405)
    expect(JSON.parse(result!.body || '')).toEqual({
      ok: false,
      error: 'Method not allowed',
    })
  })

  it('rejects requests missing videoId with 400 status', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({}),
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(400)
    expect(JSON.parse(result!.body || '').error).toContain('videoId is required')
  })

  it('queries official YouTube API when YOUTUBE_API_KEY is configured', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'mock-youtube-api-key')

    fetchSpy.mockImplementation(async (url: any) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('youtube.com/oembed')) {
        if (urlStr.includes('alt2')) {
          return { status: 401 } as Response // Not embeddable
        }
        return { status: 200 } as Response // Embeddable
      }

      if (urlStr.includes('youtube.com/watch?v=')) {
        return {
          ok: true,
          status: 200,
          text: async () => '<html><head><title>Let It Go [Official Video] - YouTube</title></head></html>',
        } as Response
      }

      if (urlStr.includes('googleapis.com/youtube/v3/search')) {
        expect(urlStr).toContain('key=mock-youtube-api-key')
        expect(urlStr).toContain('q=Let%20It%20Go%20karaoke')
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              { id: { videoId: 'alt1' }, snippet: { title: 'Let It Go Karaoke Alt 1' } },
              { id: { videoId: 'alt2' }, snippet: { title: 'Let It Go Karaoke Alt 2' } },
            ],
          }),
        } as Response
      }

      return { ok: false, status: 404 } as Response
    })

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ videoId: 'original_id' }),
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(200)

    const data = JSON.parse(result!.body || '').data
    expect(data.alternatives).toHaveLength(1)
    expect(data.alternatives[0]).toEqual({
      videoId: 'alt1',
      title: 'Let It Go Alt 1',
      thumbnailUrl: 'https://i.ytimg.com/vi/alt1/hqdefault.jpg',
      embeddable: true,
    })
  })

  it('falls back to Invidious search when YOUTUBE_API_KEY is not set', async () => {
    fetchSpy.mockImplementation(async (url: any) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('youtube.com/oembed')) {
        if (urlStr.includes('alt4')) {
          return { status: 401 } as Response // Not embeddable
        }
        return { status: 200 } as Response // Embeddable
      }

      if (urlStr.includes('youtube.com/watch?v=')) {
        return {
          ok: true,
          status: 200,
          text: async () => '<html><head><title>Let It Go (MV) - YouTube</title></head></html>',
        } as Response
      }

      if (urlStr.includes('/api/v1/search')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { videoId: 'alt3', title: 'Let It Go Invidious Alt 3' },
            { videoId: 'alt4', title: 'Let It Go Invidious Alt 4' },
          ],
        } as Response
      }

      return { ok: false, status: 404 } as Response
    })

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ videoId: 'original_id' }),
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(200)

    const data = JSON.parse(result!.body || '').data
    expect(data.alternatives).toHaveLength(1)
    expect(data.alternatives[0]).toEqual({
      videoId: 'alt3',
      title: 'Let It Go Invidious Alt 3',
      thumbnailUrl: 'https://i.ytimg.com/vi/alt3/hqdefault.jpg',
      embeddable: true,
    })
  })
})
