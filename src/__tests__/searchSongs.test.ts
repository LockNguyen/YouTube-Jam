import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { handler } from '../../netlify/functions/searchSongs'

describe('searchSongs Netlify function', () => {
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
    expect(result!.statusCode).toBe(405)
  })

  it('rejects requests missing query with 400 status', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({}),
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(400)
    expect(JSON.parse(result!.body || '').error).toContain('query is required')
  })

  it('queries official YouTube API when YOUTUBE_API_KEY is configured', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'mock-youtube-key')

    fetchSpy.mockImplementation(async (url: any) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('youtube.com/oembed')) {
        if (urlStr.includes('alt2')) {
          return { status: 401 } as Response // Blocked
        }
        return { status: 200 } as Response // Embeddable
      }

      if (urlStr.includes('googleapis.com/youtube/v3/search')) {
        expect(urlStr).toContain('key=mock-youtube-key')
        expect(urlStr).toContain('q=let%20it%20go%20karaoke')
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
      body: JSON.stringify({ query: 'let it go' }),
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(200)

    const data = JSON.parse(result!.body || '').data
    expect(data.results).toHaveLength(2)
    expect(data.results[0]).toEqual({
      videoId: 'alt1',
      title: 'Let It Go Alt 1',
      thumbnailUrl: 'https://i.ytimg.com/vi/alt1/hqdefault.jpg',
      embeddable: true,
    })
    expect(data.results[1]).toEqual({
      videoId: 'alt2',
      title: 'Let It Go Alt 2',
      thumbnailUrl: 'https://i.ytimg.com/vi/alt2/hqdefault.jpg',
      embeddable: false,
    })
  })

  it('falls back to Invidious search when YOUTUBE_API_KEY is not set', async () => {
    fetchSpy.mockImplementation(async (url: any) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('youtube.com/oembed')) {
        return { status: 200 } as Response
      }

      if (urlStr.includes('/api/v1/search')) {
        expect(urlStr).toContain('q=let%20it%20go%20karaoke')
        return {
          ok: true,
          status: 200,
          json: async () => [
            { videoId: 'alt3', title: 'Let It Go Invidious Alt 3' },
          ],
        } as Response
      }

      return { ok: false, status: 404 } as Response
    })

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ query: 'let it go' }),
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(200)

    const data = JSON.parse(result!.body || '').data
    expect(data.results).toHaveLength(1)
    expect(data.results[0]).toEqual({
      videoId: 'alt3',
      title: 'Let It Go Invidious Alt 3',
      thumbnailUrl: 'https://i.ytimg.com/vi/alt3/hqdefault.jpg',
      embeddable: true,
    })
  })
})
