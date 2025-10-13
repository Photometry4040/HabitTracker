/**
 * Vitest Global Test Setup
 *
 * This file configures the global test environment for all tests.
 * It sets up mocks, test utilities, and cleanup functions.
 *
 * @see tests/integration/README.md for usage guide
 */

import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// CLEANUP
// ============================================================

/**
 * Cleanup after each test to prevent memory leaks and test interference
 */
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ============================================================
// MOCK: SUPABASE CLIENT
// ============================================================

/**
 * Mock Supabase client to prevent real database calls during tests
 *
 * Usage in tests:
 *   import { supabase } from '@/lib/supabase';
 *   vi.spyOn(supabase.from('children'), 'select').mockResolvedValue({ data: [...], error: null });
 */
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' }
          }
        },
        error: null
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' }, session: {} },
        error: null
      }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { success: true },
        error: null
      })
    }
  }
}));

// ============================================================
// MOCK: ENVIRONMENT VARIABLES
// ============================================================

/**
 * Set test environment variables
 * These are required for app initialization
 */
process.env.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key-1234567890';
process.env.VITE_DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';

// ============================================================
// MOCK: WINDOW OBJECTS
// ============================================================

/**
 * Mock browser APIs not available in test environment
 */

// Mock window.matchMedia (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock IntersectionObserver (used by some UI libraries)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// ============================================================
// CUSTOM MATCHERS
// ============================================================

/**
 * Custom expect matchers for habit tracker specific assertions
 *
 * Example usage:
 *   expect(habit).toHaveValidTimePeriod();
 *   expect(color).toBeHabitColor();
 */

expect.extend({
  toBeHabitColor(received) {
    const validColors = ['green', 'yellow', 'red', ''];
    const pass = validColors.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid habit color`
          : `Expected ${received} to be one of: ${validColors.join(', ')}`
    };
  },

  toHaveValidTimePeriod(received) {
    const validPeriods = [
      '아침 (6-9시)',
      '오전 (9-12시)',
      '오후 (12-18시)',
      '저녁 (18-21시)',
      '밤 (21시-24시)'
    ];
    const pass = validPeriods.includes(received.time_period);
    return {
      pass,
      message: () =>
        pass
          ? `Expected habit not to have valid time period`
          : `Expected habit.time_period to be one of valid periods, got: ${received.time_period}`
    };
  },

  toBeValidWeekPeriod(received) {
    // Format: "2025년 10월 14일 ~ 2025년 10월 20일"
    const regex = /^\d{4}년 \d{1,2}월 \d{1,2}일 ~ \d{4}년 \d{1,2}월 \d{1,2}일$/;
    const pass = regex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid week period format`
          : `Expected ${received} to match Korean week period format`
    };
  }
});

// ============================================================
// TEST UTILITIES
// ============================================================

/**
 * Utility function to create mock habit data
 *
 * @param {Object} overrides - Properties to override in default habit
 * @returns {Object} Mock habit object
 */
export function createMockHabit(overrides = {}) {
  return {
    id: 1,
    name: '아침 먹기',
    time_period: '아침 (6-9시)',
    times: ['', '', '', '', '', '', ''], // 7 days
    ...overrides
  };
}

/**
 * Utility function to create mock child data
 *
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock child object
 */
export function createMockChild(overrides = {}) {
  return {
    id: 1,
    name: '지우',
    user_id: 'test-user-id',
    created_at: '2025-10-14T00:00:00Z',
    ...overrides
  };
}

/**
 * Utility function to create mock week data
 *
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock week object
 */
export function createMockWeek(overrides = {}) {
  return {
    id: 1,
    child_id: 1,
    week_start_date: '2025-10-14',
    week_period: '2025년 10월 14일 ~ 2025년 10월 20일',
    theme: '테스트 주차',
    reflection: '이번 주 반성문',
    reward: '보상',
    created_at: '2025-10-14T00:00:00Z',
    ...overrides
  };
}

/**
 * Wait for a specific condition to be true
 *
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<void>}
 */
export async function waitForCondition(condition, timeout = 5000) {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// ============================================================
// CONSOLE SUPPRESSION
// ============================================================

/**
 * Suppress console.error during tests to reduce noise
 * Errors are still recorded and can be inspected if needed
 */
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

// ============================================================
// READY INDICATOR
// ============================================================

console.log('[Test Setup] Vitest configuration loaded successfully');
console.log('[Test Setup] Supabase client mocked');
console.log('[Test Setup] Custom matchers registered');
console.log('[Test Setup] Test utilities available');
