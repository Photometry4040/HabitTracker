# 📊 Statistics API Documentation

**Library**: `src/lib/statistics.js`
**Hook**: `src/hooks/useStatistics.js`
**Developer**: Agent 2 (Statistics Engineer)
**Status**: ✅ Complete (Day 1-2)

---

## 📋 Overview

The Statistics API provides comprehensive statistical analysis for habit tracking data. It calculates success rates, trends, color distributions, and provides aggregated metrics for weekly and monthly periods.

### Key Features
- Weekly success rate calculation
- Monthly aggregated statistics
- Trend analysis (improving/declining/stable)
- Color distribution breakdowns
- Monday-aligned week handling
- Comprehensive error handling

---

## 🔧 Core Functions

### 1. `calculateWeekStats(childName, weekStartDate)`

Calculate comprehensive weekly statistics for a child's habits.

**Signature**:
```javascript
async function calculateWeekStats(
  childName: string,
  weekStartDate: string
): Promise<WeekStats>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `childName` | string | ✅ | Name of the child |
| `weekStartDate` | string (YYYY-MM-DD) | ✅ | Week start date (auto-adjusted to Monday) |

**Returns**: `Promise<WeekStats>`

**WeekStats Object**:
```typescript
interface WeekStats {
  child_name: string
  week_start_date: string       // YYYY-MM-DD (Monday)
  success_rate: number          // 0-100 (percentage)
  total_habits: number          // Total number of habits
  total_records: number         // Total number of records
  color_distribution: {
    green: number               // Count of green records
    yellow: number              // Count of yellow records
    red: number                 // Count of red records
    none: number                // Count of empty records
  }
  trend: 'improving' | 'declining' | 'stable'
  week_period: string           // Display format (Korean)
}
```

**Example**:
```javascript
import { calculateWeekStats } from '@/lib/statistics.js'

const stats = await calculateWeekStats("지우", "2025-10-07")

console.log(`Success Rate: ${stats.success_rate}%`)
console.log(`Total Habits: ${stats.total_habits}`)
console.log(`Green: ${stats.color_distribution.green}`)
console.log(`Trend: ${stats.trend}`)

// Output:
// Success Rate: 75%
// Total Habits: 8
// Green: 12
// Trend: improving
```

**Success Rate Calculation**:
- Green status = 100% (1.0)
- Yellow status = 50% (0.5)
- Red status = 0% (0.0)
- None/empty = 0% (0.0)

Formula: `(sum of weighted statuses / total records) * 100`

**Trend Detection**:
- Compares first half vs second half of week
- `improving`: Recent average > Older average by >5%
- `declining`: Recent average < Older average by >5%
- `stable`: Difference within ±5%

**Errors**:
- Throws if child not found
- Throws if week not found
- Returns empty stats object if no data

---

### 2. `calculateMonthStats(childName, year, month)`

Calculate aggregated monthly statistics across all weeks in a month.

**Signature**:
```javascript
async function calculateMonthStats(
  childName: string,
  year: number,
  month: number
): Promise<MonthStats>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `childName` | string | ✅ | Name of the child |
| `year` | number | ✅ | Year (e.g., 2025) |
| `month` | number | ✅ | Month (1-12) |

**Returns**: `Promise<MonthStats>`

**MonthStats Object**:
```typescript
interface MonthStats {
  child_name: string
  year: number
  month: number
  weeks: WeekStats[]            // Array of weekly stats
  overall_success_rate: number  // 0-100 (average across weeks)
  total_habits: number          // Sum of all habits tracked
  total_records: number         // Sum of all records
  color_distribution: {
    green: number
    yellow: number
    red: number
    none: number
  }
  trend: 'improving' | 'declining' | 'stable'
  best_week: WeekStats | null   // Week with highest success rate
  worst_week: WeekStats | null  // Week with lowest success rate
}
```

**Example**:
```javascript
import { calculateMonthStats } from '@/lib/statistics.js'

const monthStats = await calculateMonthStats("지우", 2025, 10)

console.log(`Overall Success: ${monthStats.overall_success_rate}%`)
console.log(`Number of Weeks: ${monthStats.weeks.length}`)
console.log(`Best Week: ${monthStats.best_week.week_start_date}`)
console.log(`Trend: ${monthStats.trend}`)

// Output:
// Overall Success: 78%
// Number of Weeks: 4
// Best Week: 2025-10-07
// Trend: improving
```

**Aggregation Logic**:
- Fetches all weeks where `week_start_date` falls in the specified month
- Calculates average success rate across all weeks
- Sums up color distributions
- Determines overall trend from weekly success rates
- Identifies best and worst performing weeks

**Errors**:
- Returns empty object if no weeks found in month
- Throws if database query fails

---

### 3. `calculateSuccessRate(records)`

Calculate success rate from an array of habit records.

**Signature**:
```javascript
function calculateSuccessRate(records: HabitRecord[]): number
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `records` | Array<HabitRecord> | ✅ | Array of habit record objects |

**Returns**: `number` - Success rate (0-100)

**Example**:
```javascript
import { calculateSuccessRate } from '@/lib/statistics.js'

const records = [
  { status: 'green' },  // 100%
  { status: 'green' },  // 100%
  { status: 'yellow' }, // 50%
  { status: 'red' }     // 0%
]

const rate = calculateSuccessRate(records)
console.log(rate) // 62 (rounded from 62.5)

// Calculation: (1.0 + 1.0 + 0.5 + 0.0) / 4 = 0.625 = 62.5% → 62%
```

**Notes**:
- Result is rounded to nearest integer
- Returns 0 if records array is empty
- Ignores unknown status values (treats as 0)

---

### 4. `calculateTrend(dataPoints)`

Analyze trend from a series of data points.

**Signature**:
```javascript
function calculateTrend(dataPoints: number[]): 'improving' | 'declining' | 'stable'
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dataPoints` | Array<number> | ✅ | Array of numeric values (e.g., weekly success rates) |

**Returns**: `'improving' | 'declining' | 'stable'`

**Example**:
```javascript
import { calculateTrend } from '@/lib/statistics.js'

// Improving trend
const improvingData = [60, 65, 70, 75, 80, 85]
console.log(calculateTrend(improvingData)) // 'improving'

// Declining trend
const decliningData = [85, 80, 75, 70, 65, 60]
console.log(calculateTrend(decliningData)) // 'declining'

// Stable trend
const stableData = [75, 73, 76, 74, 75, 77]
console.log(calculateTrend(stableData)) // 'stable'
```

**Algorithm**:
1. Split data points in half (older half vs recent half)
2. Calculate average for each half
3. Compare:
   - Difference > 5%: `improving`
   - Difference < -5%: `declining`
   - Difference within ±5%: `stable`

**Notes**:
- Returns `'stable'` if fewer than 2 data points
- Uses 5% threshold as significant change
- Useful for weekly/monthly trend analysis

---

## 🛠️ Helper Functions

### `adjustToMonday(date)`

Adjust any date to the nearest preceding Monday.

**Signature**:
```javascript
function adjustToMonday(date: Date): Date
```

**Example**:
```javascript
const wednesday = new Date('2025-10-09')
const monday = adjustToMonday(wednesday)
console.log(monday) // 2025-10-07 (Monday)
```

### `formatDate(date)`

Format date to YYYY-MM-DD string.

**Signature**:
```javascript
function formatDate(date: Date): string
```

**Example**:
```javascript
const date = new Date('2025-10-09')
const formatted = formatDate(date)
console.log(formatted) // "2025-10-09"
```

### `getColorDistribution(records)`

Get color distribution from habit records.

**Signature**:
```javascript
function getColorDistribution(records: HabitRecord[]): ColorDistribution
```

**Returns**:
```typescript
interface ColorDistribution {
  green: number
  yellow: number
  red: number
  none: number
}
```

---

## 🎣 React Hook: `useStatistics`

The `useStatistics` hook provides React Query integration for statistics.

**Import**:
```javascript
import { useStatistics } from '@/hooks/useStatistics.js'
```

**Usage**:
```javascript
function StatisticsView({ childName, weekDate }) {
  const {
    weekStats,      // WeekStats object
    monthStats,     // MonthStats object
    isLoading,      // Loading state
    error           // Error object
  } = useStatistics(childName, weekDate)

  if (isLoading) return <div>Loading statistics...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Week Stats</h2>
      <p>Success Rate: {weekStats.success_rate}%</p>
      <p>Trend: {weekStats.trend}</p>

      <h2>Month Stats</h2>
      <p>Overall Success: {monthStats.overall_success_rate}%</p>
      <p>Weeks Tracked: {monthStats.weeks.length}</p>
    </div>
  )
}
```

**Hook Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `childName` | string | ✅ | Child's name |
| `weekDate` | string | ✅ | Week start date (YYYY-MM-DD) |

**Returned Values**:

| Property | Type | Description |
|----------|------|-------------|
| `weekStats` | WeekStats \| null | Weekly statistics |
| `monthStats` | MonthStats \| null | Monthly statistics |
| `isLoading` | boolean | Loading state |
| `error` | Error \| null | Error object if any |
| `refetch` | Function | Manual refetch function |

**Auto-refetch**: Statistics automatically refetch when:
- `childName` changes
- `weekDate` changes
- Window regains focus
- Every 5 minutes (staleTime)

---

## 🧪 Testing Examples

### Unit Test Example

```javascript
import { describe, it, expect } from 'vitest'
import { calculateSuccessRate, calculateTrend } from '@/lib/statistics.js'

describe('Statistics API', () => {
  it('calculates success rate correctly', () => {
    const records = [
      { status: 'green' },
      { status: 'yellow' },
      { status: 'red' }
    ]
    expect(calculateSuccessRate(records)).toBe(50)
  })

  it('detects improving trend', () => {
    const dataPoints = [60, 65, 70, 75, 80, 85]
    expect(calculateTrend(dataPoints)).toBe('improving')
  })

  it('detects declining trend', () => {
    const dataPoints = [85, 80, 75, 70, 65, 60]
    expect(calculateTrend(dataPoints)).toBe('declining')
  })

  it('detects stable trend', () => {
    const dataPoints = [75, 73, 76, 74, 75, 77]
    expect(calculateTrend(dataPoints)).toBe('stable')
  })
})
```

### Integration Test Example

```javascript
import { describe, it, expect } from 'vitest'
import { calculateWeekStats, calculateMonthStats } from '@/lib/statistics.js'

describe('Statistics Integration', () => {
  it('fetches week stats from database', async () => {
    const stats = await calculateWeekStats("지우", "2025-10-07")

    expect(stats.child_name).toBe("지우")
    expect(stats.success_rate).toBeGreaterThanOrEqual(0)
    expect(stats.success_rate).toBeLessThanOrEqual(100)
    expect(stats.trend).toMatch(/improving|declining|stable/)
  })

  it('aggregates month stats correctly', async () => {
    const monthStats = await calculateMonthStats("지우", 2025, 10)

    expect(monthStats.weeks.length).toBeGreaterThan(0)
    expect(monthStats.overall_success_rate).toBeGreaterThanOrEqual(0)
    expect(monthStats.best_week).toBeDefined()
  })
})
```

---

## 📊 Usage Patterns

### Pattern 1: Dashboard Display

```javascript
import { calculateWeekStats } from '@/lib/statistics.js'

async function displayDashboard(childName) {
  const thisWeek = await calculateWeekStats(childName, getTodayMondayDate())

  return (
    <div className="dashboard">
      <h1>{childName}의 이번 주</h1>
      <div className="success-rate">
        <span className="value">{thisWeek.success_rate}%</span>
        <span className="trend">{getTrendEmoji(thisWeek.trend)}</span>
      </div>
      <div className="distribution">
        <div className="green">😊 {thisWeek.color_distribution.green}</div>
        <div className="yellow">🤔 {thisWeek.color_distribution.yellow}</div>
        <div className="red">😔 {thisWeek.color_distribution.red}</div>
      </div>
    </div>
  )
}

function getTrendEmoji(trend) {
  if (trend === 'improving') return '📈'
  if (trend === 'declining') return '📉'
  return '➡️'
}
```

### Pattern 2: Monthly Report

```javascript
import { calculateMonthStats } from '@/lib/statistics.js'

async function generateMonthlyReport(childName, year, month) {
  const stats = await calculateMonthStats(childName, year, month)

  console.log(`📊 ${childName}의 ${month}월 리포트`)
  console.log(`평균 성공률: ${stats.overall_success_rate}%`)
  console.log(`최고 주차: ${stats.best_week.week_start_date} (${stats.best_week.success_rate}%)`)
  console.log(`최저 주차: ${stats.worst_week.week_start_date} (${stats.worst_week.success_rate}%)`)
  console.log(`전체 트렌드: ${stats.trend}`)

  return stats
}
```

### Pattern 3: Comparison View

```javascript
import { calculateWeekStats } from '@/lib/statistics.js'

async function compareWeeks(childName, week1Date, week2Date) {
  const [week1, week2] = await Promise.all([
    calculateWeekStats(childName, week1Date),
    calculateWeekStats(childName, week2Date)
  ])

  const improvement = week2.success_rate - week1.success_rate

  return {
    week1,
    week2,
    improvement,
    message: improvement > 0
      ? `${improvement}% 향상되었습니다! 🎉`
      : `${Math.abs(improvement)}% 감소했습니다. 다시 힘내봐요! 💪`
  }
}
```

---

## ⚠️ Important Notes

### Monday Alignment
All week calculations automatically align to Monday:
```javascript
// Any date in the week returns the same Monday
await calculateWeekStats("지우", "2025-10-07") // Monday
await calculateWeekStats("지우", "2025-10-09") // Wednesday → adjusted to 2025-10-07
await calculateWeekStats("지우", "2025-10-13") // Sunday → adjusted to 2025-10-07
```

### Success Rate Rounding
Success rates are always rounded to integers:
```javascript
// 62.5% → 62%
// 87.3% → 87%
// 99.9% → 100%
```

### Empty Data Handling
- Returns `success_rate: 0` if no records found
- Returns `trend: 'stable'` if insufficient data
- Returns empty arrays/objects for missing data

### Performance Considerations
- Week stats query is fast (single week lookup)
- Month stats query fetches multiple weeks (consider caching)
- Use React Query for automatic caching and deduplication

---

## 🔗 Related Documentation

- **[API Index](./README.md)** - All API documentation
- **[AGENT_PROGRESS.md](../AGENT_PROGRESS.md)** - Development progress
- **[Dashboard Component](../../src/components/Dashboard.jsx)** - UI implementation

---

**Last Updated**: 2025-10-13
**Version**: 1.0.0
**Maintainer**: Agent 4
