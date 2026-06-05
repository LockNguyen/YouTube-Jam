import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchSkipSegments } from '../services/sponsorBlock'

describe('sponsorBlock service', () => {
  const fetchSpy = vi.spyOn(global, 'fetch')

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('queries SponsorBlock API and maps segments on 200 success', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [
        { segment: [0, 10], category: 'sponsor' },
        { segment: [150, 160], category: 'selfpromo' },
      ],
    } as Response)

    const segments = await fetchSkipSegments('dQw4w9WgXcQ')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://sponsor.ajay.app/api/skipSegments?videoID=dQw4w9WgXcQ'),
      expect.any(Object),
    )
    expect(segments).toEqual([
      [0, 10],
      [150, 160],
    ])
  })

  it('returns empty array on 404 response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response)

    const segments = await fetchSkipSegments('noSegmentsId')
    expect(segments).toEqual([])
  })

  it('returns empty array on fetch network failure/exception', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network disconnected'))

    const segments = await fetchSkipSegments('networkErrorId')
    expect(segments).toEqual([])
  })
})
