# Integration Tests

> Agent 4 - Documentation Maintainer
> Updated: 2025-10-13
> Purpose: Integration testing for parallel development across 4 agents

---

## Table of Contents
1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Test Scenarios](#test-scenarios)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [CI/CD Integration](#cicd-integration)

---

## Overview

Integration tests ensure that features developed by different agents work correctly together. Unlike unit tests which test individual functions in isolation, integration tests verify:

- **Component interactions**: React components with hooks and state
- **Database operations**: Supabase queries and Edge Functions
- **API integrations**: Discord Bot, Statistics, Template System
- **User workflows**: End-to-end feature flows

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Core testing libraries
npm install --save-dev vitest@1.0.4 --save-exact

# React testing utilities
npm install --save-dev @testing-library/react@14.1.2 --save-exact
npm install --save-dev @testing-library/react-hooks@8.0.1 --save-exact
npm install --save-dev @testing-library/jest-dom@6.1.5 --save-exact
npm install --save-dev @testing-library/user-event@14.5.1 --save-exact

# Mocking utilities
npm install --save-dev @vitest/spy@1.0.4 --save-exact
npm install --save-dev happy-dom@12.10.3 --save-exact
```

### 2. Configure Vitest

Create or update `vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### 3. Create Test Setup File

Create `tests/setup.js`:

```javascript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock environment variables
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
```

### 4. Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:integration": "vitest run tests/integration",
    "test:integration:watch": "vitest tests/integration",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## Test Scenarios

### Day 3: Initial Integration

**Goal**: Verify core components work with database layer

#### Scenario 1: Discord Bot ↔ Database
**Feature**: Discord Bot can fetch habit data from Supabase

**Test Cases:**
```javascript
// tests/integration/discord-database.test.js

describe('Discord Bot <-> Database Integration', () => {
  test('should fetch habit data for /습관조회 command', async () => {
    // Arrange: Setup test data in Supabase
    const mockChildData = {
      name: '지우',
      week_start_date: '2025-10-07'
    };

    // Act: Bot executes command
    const result = await bot.commands.get('습관조회').execute(
      mockInteraction,
      mockChildData
    );

    // Assert: Correct data returned
    expect(result.habits).toHaveLength(5);
    expect(result.success_rate).toBe(85);
  });

  test('should handle database connection errors gracefully', async () => {
    // Arrange: Mock database failure
    vi.spyOn(supabase, 'from').mockRejectedValue(new Error('Connection timeout'));

    // Act & Assert
    await expect(
      bot.commands.get('습관조회').execute(mockInteraction, mockChildData)
    ).rejects.toThrow('데이터를 가져오는 데 실패했습니다');
  });
});
```

#### Scenario 2: Statistics ↔ Dashboard
**Feature**: Dashboard displays calculated statistics

**Test Cases:**
```javascript
// tests/integration/statistics-dashboard.test.js

describe('Statistics <-> Dashboard Integration', () => {
  test('should display weekly statistics in Dashboard', async () => {
    // Arrange
    const { getByTestId } = render(<Dashboard childName="지우" />);

    // Act: Wait for data to load
    await waitFor(() => {
      expect(getByTestId('success-rate')).toBeInTheDocument();
    });

    // Assert
    expect(getByTestId('success-rate')).toHaveTextContent('85%');
    expect(getByTestId('total-habits')).toHaveTextContent('35');
  });

  test('should refresh statistics on data change', async () => {
    // Arrange
    const { getByTestId, rerender } = render(<Dashboard childName="지우" />);

    // Act: Update habit status
    fireEvent.click(getByTestId('habit-1-day-1-button'));

    // Assert: Stats recalculated
    await waitFor(() => {
      expect(getByTestId('success-rate')).toHaveTextContent('86%');
    });
  });
});
```

---

### Day 6: Cross-Feature Integration

**Goal**: Verify features from different agents work together

#### Scenario 3: Discord Bot ↔ Statistics
**Feature**: Bot can request and display statistics

**Test Cases:**
```javascript
// tests/integration/bot-statistics.test.js

describe('Discord Bot <-> Statistics Integration', () => {
  test('Bot /통계 command should fetch and format statistics', async () => {
    // Arrange
    const mockStats = {
      weekly: { success_rate: 85, total: 35 },
      monthly: { success_rate: 82, total: 140 }
    };

    vi.spyOn(statisticsLib, 'calculateWeekStats').mockResolvedValue(mockStats.weekly);

    // Act
    const embed = await bot.commands.get('통계').execute(mockInteraction);

    // Assert
    expect(embed.fields).toContainEqual({
      name: '주간 성공률',
      value: '85%',
      inline: true
    });
  });
});
```

#### Scenario 4: Template UI ↔ Habit Tracker
**Feature**: Creating a week from template populates habits

**Test Cases:**
```javascript
// tests/integration/template-tracker.test.js

describe('Template <-> Habit Tracker Integration', () => {
  test('should create week from template with correct habits', async () => {
    // Arrange
    const template = {
      name: '평일 루틴',
      habits: [
        { name: '아침 (6-9시) 일어나기', time_period: '아침 (6-9시)' },
        { name: '오전 (9-12시) 공부하기', time_period: '오전 (9-12시)' }
      ]
    };

    // Act
    const { getByText, getAllByTestId } = render(<App />);
    fireEvent.click(getByText('템플릿으로 주차 생성'));
    fireEvent.click(getByText('평일 루틴'));

    // Assert
    await waitFor(() => {
      const habitCards = getAllByTestId('habit-card');
      expect(habitCards).toHaveLength(2);
      expect(habitCards[0]).toHaveTextContent('아침 (6-9시) 일어나기');
    });
  });
});
```

---

### Day 8: Full E2E Flow

**Goal**: Complete user workflow testing

#### Scenario 5: End-to-End Habit Tracking Flow
**Feature**: Full workflow from template → habit completion → statistics → Discord notification

**Test Cases:**
```javascript
// tests/integration/e2e-habit-flow.test.js

describe('End-to-End: Habit Tracking Flow', () => {
  test('Complete workflow: Template → Habit → Stats → Discord', async () => {
    // Step 1: Create week from template
    const { getByTestId, getByText } = render(<App />);
    fireEvent.click(getByTestId('create-from-template'));
    await waitFor(() => expect(getByText('평일 루틴')).toBeInTheDocument());

    // Step 2: Mark habit as complete (green)
    fireEvent.click(getByTestId('habit-1-day-1-green'));
    await waitFor(() => {
      expect(getByTestId('habit-1-day-1')).toHaveClass('bg-green-500');
    });

    // Step 3: Save week
    fireEvent.click(getByTestId('save-button'));
    await waitFor(() => {
      expect(getByTestId('save-success-message')).toBeInTheDocument();
    });

    // Step 4: Check statistics updated
    fireEvent.click(getByTestId('dashboard-tab'));
    await waitFor(() => {
      expect(getByTestId('success-rate')).toHaveTextContent('20%'); // 1/5 habits
    });

    // Step 5: Verify Discord notification sent
    expect(discordMock.sendNotification).toHaveBeenCalledWith({
      type: 'habit_check',
      childName: '지우',
      habitName: '아침 (6-9시) 일어나기',
      status: 'green',
      date: expect.any(String)
    });
  });

  test('Error handling: Failed save should rollback changes', async () => {
    // Arrange: Mock save failure
    vi.spyOn(dualWriteFunction, 'invoke').mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(<App />);

    // Act: Try to save
    fireEvent.click(getByTestId('habit-1-day-1-green'));
    fireEvent.click(getByTestId('save-button'));

    // Assert: Error message shown, UI reverted
    await waitFor(() => {
      expect(getByTestId('error-message')).toHaveTextContent('저장에 실패했습니다');
      expect(getByTestId('habit-1-day-1')).not.toHaveClass('bg-green-500');
    });
  });
});
```

---

## Running Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Specific Test File
```bash
npx vitest tests/integration/discord-database.test.js
```

### Watch Mode (Auto-rerun on file changes)
```bash
npm run test:integration:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Interactive UI
```bash
npm run test:ui
```

---

## Writing Tests

### Test Structure

Follow the **AAA Pattern** (Arrange-Act-Assert):

```javascript
test('should do something', async () => {
  // Arrange: Setup test data and mocks
  const mockData = { ... };
  vi.spyOn(module, 'function').mockResolvedValue(mockData);

  // Act: Execute the code being tested
  const result = await functionUnderTest(input);

  // Assert: Verify expected outcome
  expect(result).toEqual(expected);
});
```

### Mocking Supabase

```javascript
// Mock successful query
vi.mock('@/lib/database-new', () => ({
  loadChildWeeks: vi.fn().mockResolvedValue([
    { week_start_date: '2025-10-07', theme: 'Test Week' }
  ])
}));

// Mock query error
vi.mock('@/lib/database-new', () => ({
  loadChildWeeks: vi.fn().mockRejectedValue(new Error('Query failed'))
}));
```

### Mocking Edge Functions

```javascript
import { supabase } from '@/lib/supabase';

vi.spyOn(supabase.functions, 'invoke').mockResolvedValue({
  data: { success: true },
  error: null
});
```

### Async Testing

```javascript
import { waitFor } from '@testing-library/react';

test('should load data asynchronously', async () => {
  const { getByTestId } = render(<Component />);

  // Wait for element to appear
  await waitFor(() => {
    expect(getByTestId('data-loaded')).toBeInTheDocument();
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/integration-tests.yml`:

```yaml
name: Integration Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Test Organization

```
tests/
├── integration/
│   ├── README.md                    (this file)
│   ├── discord-database.test.js     (Agent 1 tests)
│   ├── statistics-dashboard.test.js (Agent 2 tests)
│   ├── template-tracker.test.js     (Agent 3 tests)
│   ├── bot-statistics.test.js       (Cross-feature)
│   └── e2e-habit-flow.test.js       (End-to-end)
├── unit/                            (Unit tests for individual functions)
└── setup.js                         (Global test setup)
```

---

## Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
   - Good: `should display error message when save fails`
   - Bad: `test save`

2. **Isolation**: Each test should be independent
   - Use `beforeEach` to reset state
   - Don't rely on test execution order

3. **Mocking**: Mock external dependencies (Supabase, Discord API)
   - Prevents flaky tests
   - Faster execution
   - No real API calls

4. **Assertions**: Be specific and comprehensive
   - Check not just success, but also error cases
   - Verify UI updates, not just data

5. **Coverage**: Aim for 80%+ coverage of integration points
   - Not 100% (diminishing returns)
   - Focus on critical user workflows

---

## Troubleshooting

### Common Issues

**Issue**: `Error: Cannot find module '@/lib/...'`
- **Fix**: Check `vitest.config.js` alias configuration

**Issue**: `ReferenceError: document is not defined`
- **Fix**: Ensure `environment: 'happy-dom'` in vitest config

**Issue**: Tests timeout
- **Fix**: Increase timeout in test: `test('...', async () => {...}, 10000)`

**Issue**: Mocks not working
- **Fix**: Call `vi.clearAllMocks()` in `beforeEach()`

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Maintained by**: Agent 4 - Documentation Maintainer
**Last Updated**: 2025-10-13
**Next Update**: Day 3 (Add test results)
