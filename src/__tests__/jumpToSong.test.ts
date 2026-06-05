import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../../netlify/functions/jumpToSong'
import { performJumpToSong } from '../../netlify/shared/queueService'
import { validateHostKey } from '../../netlify/shared/validation'

vi.mock('../../netlify/shared/queueService', () => ({
  performJumpToSong: vi.fn(),
}))

vi.mock('../../netlify/shared/validation', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../netlify/shared/validation')>()
  return {
    ...original,
    validateHostKey: vi.fn(),
  }
})

describe('jumpToSong Netlify function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-POST requests with 405', async () => {
    const event = {
      httpMethod: 'GET',
      body: '',
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(405)
  })

  it('rejects unauthorized requests with 401', async () => {
    vi.mocked(validateHostKey).mockReturnValue(false)

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ roomId: 'room1', songId: 'song1' }),
      headers: {},
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(401)
  })

  it('invokes performJumpToSong and returns 200 on success', async () => {
    vi.mocked(validateHostKey).mockReturnValue(true)
    vi.mocked(performJumpToSong).mockResolvedValue(undefined)

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ roomId: 'room1', songId: 'song1' }),
      headers: { 'x-host-key': 'secret' },
    } as any

    const result = await handler(event, {} as any, () => {})
    expect(result!.statusCode).toBe(200)
    expect(performJumpToSong).toHaveBeenCalledWith('room1', 'song1')
    expect(JSON.parse(result!.body || '')).toEqual({
      ok: true,
      data: { songId: 'song1' },
    })
  })
})
