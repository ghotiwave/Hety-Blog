import { describe, expect, it } from 'vitest'
import { shouldClearStoredSession } from './api'

describe('API session handling', () => {
  it('preserves an existing session after a failed login attempt', () => {
    expect(shouldClearStoredSession(401, '/auth/login')).toBe(false)
  })

  it('clears an expired session when a protected request returns 401', () => {
    expect(shouldClearStoredSession(401, '/auth/me')).toBe(true)
    expect(shouldClearStoredSession(500, '/auth/me')).toBe(false)
  })
})
