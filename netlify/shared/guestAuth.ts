import crypto from 'crypto'

const GUEST_SECRET = process.env['GUEST_SECRET'] || process.env['HOST_SECRET'] || 'fallback-karaoke-secret-key-12345!'

export interface GuestPayload {
  guestId: string
  name: string
  color: string
  roomId: string
}

export function signProfile(payload: GuestPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', GUEST_SECRET).update(data).digest('base64url')
  return `${data}.${signature}`
}

export function verifyProfile(token: string, expectedRoomId: string): GuestPayload | null {
  try {
    const [data, signature] = token.split('.')
    if (!data || !signature) return null

    const expectedSignature = crypto.createHmac('sha256', GUEST_SECRET).update(data).digest('base64url')
    if (signature !== expectedSignature) return null

    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as GuestPayload
    
    // Safety verification: Ensure roomId and basic guest fields match
    if (decoded.roomId !== expectedRoomId) return null
    if (!decoded.guestId || !decoded.name || !decoded.color) return null

    return decoded
  } catch {
    return null
  }
}
