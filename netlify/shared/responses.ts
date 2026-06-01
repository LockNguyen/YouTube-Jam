import type { ApiResponse } from '../../src/types/song'

export function success<T>(data: T): { statusCode: number; body: string } {
  const response: ApiResponse<T> = { ok: true, data }
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  }
}

export function error(message: string, statusCode = 400): { statusCode: number; body: string } {
  const response: ApiResponse = { ok: false, error: message }
  return {
    statusCode,
    body: JSON.stringify(response),
  }
}

export const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-host-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
