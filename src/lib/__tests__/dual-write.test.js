import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing
vi.mock('../supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    }
  }
}))

// Mock import.meta.env
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')

describe('dual-write module', () => {
  let supabase

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../supabase.js')
    supabase = mod.supabase
  })

  describe('generateIdempotencyKey (via createWeekDualWrite)', () => {
    it('throws when user is not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const { createWeekDualWrite } = await import('../dual-write.js')
      await expect(createWeekDualWrite('child', '2025-10-27', [], '', {}, ''))
        .rejects.toThrow('인증되지 않은 사용자입니다.')
    })
  })

  describe('updateHabitRecordDualWrite', () => {
    it('throws when user is not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const { updateHabitRecordDualWrite } = await import('../dual-write.js')
      await expect(updateHabitRecordDualWrite('child', '2025-10-27', 'habit', 0, 'green'))
        .rejects.toThrow('인증되지 않은 사용자입니다.')
    })
  })

  describe('deleteWeekDualWrite', () => {
    it('throws when user is not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const { deleteWeekDualWrite } = await import('../dual-write.js')
      await expect(deleteWeekDualWrite('child', '2025-10-27'))
        .rejects.toThrow('인증되지 않은 사용자입니다.')
    })
  })
})
