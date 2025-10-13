# 🧪 Integration Test Scenarios - Day 3

**Purpose**: Comprehensive integration testing for Agent-developed features
**Test Date**: 2025-10-16 (Day 3)
**Prerequisites**: All Agent branches merged to `main`

---

## 📋 Test Environment Setup

### Required Setup
1. **Database**: Supabase project with all migrations applied
2. **Environment**: `.env` file with valid credentials
3. **Dependencies**: `npm install` completed
4. **Test Data**: Sample children and weeks created

### Test Data Fixtures

**Child 1**: 지우 (Jiwoo)
- ID: `test-child-uuid-1`
- Current week: 2025-10-07 (Monday)

**Child 2**: 민수 (Minsu)
- ID: `test-child-uuid-2`
- Current week: 2025-10-07 (Monday)

**Sample Habits**:
```json
[
  { "name": "양치하기", "time_period": "아침", "display_order": 1 },
  { "name": "운동하기", "time_period": "아침", "display_order": 2 },
  { "name": "숙제하기", "time_period": "오후", "display_order": 3 },
  { "name": "책 읽기", "time_period": "오후", "display_order": 4 },
  { "name": "일기 쓰기", "time_period": "저녁", "display_order": 5 }
]
```

---

## 🎯 Test Scenario 1: Template System End-to-End

### Objective
Test complete template creation, application, and management workflow.

### Steps

**1.1 Create a New Template**
```javascript
// File: tests/integration/template-e2e.test.js
import { createTemplate } from '@/lib/templates.js'

test('User creates a new habit template', async () => {
  const template = await createTemplate({
    name: "학교 생활 습관",
    description: "학교 다니는 날 기본 습관",
    child_id: "test-child-uuid-1",
    is_default: false,
    habits: [
      { name: "아침 운동", time_period: "아침", display_order: 1 },
      { name: "숙제하기", time_period: "오후", display_order: 2 },
      { name: "독서하기", time_period: "저녁", display_order: 3 }
    ]
  })

  expect(template.id).toBeDefined()
  expect(template.name).toBe("학교 생활 습관")
  expect(template.habits).toHaveLength(3)
})
```

**Expected Result**:
- ✅ Template created in database
- ✅ Template ID returned
- ✅ All habits stored correctly
- ✅ `created_at` and `updated_at` timestamps set

**1.2 Load Templates with Filters**
```javascript
test('User loads templates for a child', async () => {
  const templates = await loadTemplates({
    child_id: "test-child-uuid-1",
    include_shared: true
  })

  expect(templates.length).toBeGreaterThan(0)
  expect(templates[0].user_id).toBeDefined()
})
```

**Expected Result**:
- ✅ Returns child-specific templates
- ✅ Includes shared templates (child_id = null)
- ✅ Sorted by creation date (newest first)

**1.3 Apply Template to Week**
```javascript
test('User applies template to current week', async () => {
  const template = await loadTemplates({ is_default: true })

  await applyTemplateToWeek(
    template[0].id,
    "test-child-uuid-1",
    "2025-10-07"
  )

  // Verify habits were created
  const weekData = await loadChildData("지우", "2025-10-07")

  expect(weekData.habits).toHaveLength(template[0].habits.length)
  expect(weekData.habits[0].name).toBe(template[0].habits[0].name)
})
```

**Expected Result**:
- ✅ Creates `habits` records for the week
- ✅ Creates 7 empty `habit_records` per habit
- ✅ Week start date auto-adjusted to Monday
- ✅ Edge Function returns success

**1.4 Update Template**
```javascript
test('User updates template with new habit', async () => {
  const templates = await loadTemplates({ name: "학교 생활 습관" })
  const template = templates[0]

  const newHabits = [
    ...template.habits,
    { name: "정리정돈", time_period: "저녁", display_order: 4 }
  ]

  const updated = await updateTemplate(template.id, { habits: newHabits })

  expect(updated.habits).toHaveLength(4)
  expect(updated.habits[3].name).toBe("정리정돈")
})
```

**Expected Result**:
- ✅ Template updated in database
- ✅ `updated_at` timestamp changed
- ✅ Original `created_at` preserved

**1.5 Duplicate Template**
```javascript
test('User duplicates template for another child', async () => {
  const original = await loadTemplates({ name: "학교 생활 습관" })
  const duplicated = await duplicateTemplate(
    original[0].id,
    "학교 생활 습관 (민수용)"
  )

  expect(duplicated.id).not.toBe(original[0].id)
  expect(duplicated.name).toBe("학교 생활 습관 (민수용)")
  expect(duplicated.habits).toEqual(original[0].habits)
  expect(duplicated.is_default).toBe(false)
})
```

**Expected Result**:
- ✅ New template created with different ID
- ✅ All habits copied
- ✅ `is_default` set to false
- ✅ Same `user_id` as original

**1.6 Delete Template**
```javascript
test('User deletes a template', async () => {
  const templates = await loadTemplates({ name: "학교 생활 습관 (민수용)" })

  await deleteTemplate(templates[0].id)

  // Verify deletion
  const remaining = await loadTemplates({ name: "학교 생활 습관 (민수용)" })
  expect(remaining).toHaveLength(0)
})
```

**Expected Result**:
- ✅ Template deleted from database
- ✅ No error if template already deleted (idempotent)

---

## 📊 Test Scenario 2: Statistics Calculation

### Objective
Test statistical analysis functions with real habit data.

### Steps

**2.1 Setup Test Data**
```javascript
// Create week with mixed habit records
test('Setup: Create test week with habit data', async () => {
  const weekData = {
    child_name: "지우",
    week_start_date: "2025-10-07",
    habits: [
      {
        name: "양치하기",
        times: ["green", "green", "yellow", "green", "green", "", ""]
      },
      {
        name: "숙제하기",
        times: ["green", "yellow", "yellow", "red", "green", "", ""]
      },
      {
        name: "책 읽기",
        times: ["green", "green", "green", "green", "green", "", ""]
      }
    ]
  }

  await saveChildData(weekData)

  // Verify data saved
  const loaded = await loadChildData("지우", "2025-10-07")
  expect(loaded.habits).toHaveLength(3)
})
```

**2.2 Calculate Week Statistics**
```javascript
test('Calculate weekly statistics', async () => {
  const stats = await calculateWeekStats("지우", "2025-10-07")

  // Verify structure
  expect(stats).toHaveProperty('child_name')
  expect(stats).toHaveProperty('week_start_date')
  expect(stats).toHaveProperty('success_rate')
  expect(stats).toHaveProperty('total_habits')
  expect(stats).toHaveProperty('color_distribution')
  expect(stats).toHaveProperty('trend')

  // Verify values
  expect(stats.child_name).toBe("지우")
  expect(stats.success_rate).toBeGreaterThanOrEqual(0)
  expect(stats.success_rate).toBeLessThanOrEqual(100)
  expect(stats.total_habits).toBe(3)

  // Verify trend
  expect(['improving', 'declining', 'stable']).toContain(stats.trend)
})
```

**Expected Result**:
```json
{
  "child_name": "지우",
  "week_start_date": "2025-10-07",
  "success_rate": 83,
  "total_habits": 3,
  "total_records": 15,
  "color_distribution": {
    "green": 11,
    "yellow": 3,
    "red": 1,
    "none": 0
  },
  "trend": "improving",
  "week_period": "2025년 10월 7일 ~ 2025년 10월 13일"
}
```

**Calculation Verification**:
- 11 green × 1.0 = 11.0
- 3 yellow × 0.5 = 1.5
- 1 red × 0.0 = 0.0
- Total: 12.5 / 15 = 0.833 = 83%

**2.3 Calculate Monthly Statistics**
```javascript
test('Calculate monthly statistics', async () => {
  // Create data for multiple weeks in October
  const weeks = [
    "2025-10-07",
    "2025-10-14",
    "2025-10-21",
    "2025-10-28"
  ]

  // Create test data for each week...
  // (omitted for brevity)

  const monthStats = await calculateMonthStats("지우", 2025, 10)

  expect(monthStats.weeks).toHaveLength(4)
  expect(monthStats.overall_success_rate).toBeGreaterThanOrEqual(0)
  expect(monthStats.overall_success_rate).toBeLessThanOrEqual(100)
  expect(monthStats.best_week).toBeDefined()
  expect(monthStats.worst_week).toBeDefined()
  expect(monthStats.trend).toMatch(/improving|declining|stable/)
})
```

**Expected Result**:
```json
{
  "child_name": "지우",
  "year": 2025,
  "month": 10,
  "weeks": [
    { "week_start_date": "2025-10-07", "success_rate": 83 },
    { "week_start_date": "2025-10-14", "success_rate": 78 },
    { "week_start_date": "2025-10-21", "success_rate": 85 },
    { "week_start_date": "2025-10-28", "success_rate": 80 }
  ],
  "overall_success_rate": 81,
  "total_habits": 12,
  "total_records": 60,
  "color_distribution": {
    "green": 45,
    "yellow": 10,
    "red": 3,
    "none": 2
  },
  "trend": "stable",
  "best_week": { "week_start_date": "2025-10-21", "success_rate": 85 },
  "worst_week": { "week_start_date": "2025-10-14", "success_rate": 78 }
}
```

**2.4 Test Trend Detection**
```javascript
describe('Trend detection accuracy', () => {
  test('Detects improving trend', () => {
    const dataPoints = [60, 65, 70, 75, 80, 85]
    const trend = calculateTrend(dataPoints)
    expect(trend).toBe('improving')
  })

  test('Detects declining trend', () => {
    const dataPoints = [85, 80, 75, 70, 65, 60]
    const trend = calculateTrend(dataPoints)
    expect(trend).toBe('declining')
  })

  test('Detects stable trend', () => {
    const dataPoints = [75, 73, 76, 74, 75, 77]
    const trend = calculateTrend(dataPoints)
    expect(trend).toBe('stable')
  })

  test('Returns stable for insufficient data', () => {
    const dataPoints = [75]
    const trend = calculateTrend(dataPoints)
    expect(trend).toBe('stable')
  })
})
```

---

## 🎨 Test Scenario 3: Template + Statistics Integration

### Objective
Test that templates and statistics work together correctly.

### Steps

**3.1 Apply Template and Track Habits**
```javascript
test('Apply template, update habits, calculate statistics', async () => {
  // Step 1: Create and apply template
  const template = await createTemplate({
    name: "통합 테스트 템플릿",
    habits: [
      { name: "습관1", time_period: "아침", display_order: 1 },
      { name: "습관2", time_period: "오후", display_order: 2 }
    ]
  })

  await applyTemplateToWeek(template.id, "test-child-uuid-1", "2025-10-07")

  // Step 2: Update some habit records
  const weekData = await loadChildData("지우", "2025-10-07")
  weekData.habits[0].times = ["green", "green", "yellow", "green", "green", "", ""]
  weekData.habits[1].times = ["yellow", "yellow", "green", "red", "green", "", ""]

  await saveChildData(weekData)

  // Step 3: Calculate statistics
  const stats = await calculateWeekStats("지우", "2025-10-07")

  expect(stats.total_habits).toBe(2)
  expect(stats.success_rate).toBeGreaterThan(0)
})
```

**Expected Result**:
- ✅ Template applied successfully
- ✅ Habits tracked correctly
- ✅ Statistics calculated accurately
- ✅ No data loss or corruption

**3.2 Modify Template and Verify Stats Update**
```javascript
test('Changing template does not affect existing weeks', async () => {
  // Get current stats
  const statsBefore = await calculateWeekStats("지우", "2025-10-07")

  // Update template
  const template = await loadTemplates({ name: "통합 테스트 템플릿" })
  await updateTemplate(template[0].id, {
    habits: [
      ...template[0].habits,
      { name: "습관3", time_period: "저녁", display_order: 3 }
    ]
  })

  // Stats should remain unchanged
  const statsAfter = await calculateWeekStats("지우", "2025-10-07")

  expect(statsAfter.success_rate).toBe(statsBefore.success_rate)
  expect(statsAfter.total_habits).toBe(statsBefore.total_habits)
})
```

**Expected Result**:
- ✅ Template updates don't retroactively affect weeks
- ✅ Statistics remain consistent
- ✅ Only new applications of template use updated habits

---

## 🤖 Test Scenario 4: Discord Bot Integration

### Objective
Test Discord bot's ability to read and update habit data.

### Steps

**4.1 Bot Reads Habit Data**
```javascript
// File: bot/tests/integration.test.js
test('Discord bot fetches habit data', async () => {
  // Simulate slash command
  const childName = "지우"
  const weekDate = "2025-10-07"

  const data = await fetchWeekData(childName, weekDate)

  expect(data).toBeDefined()
  expect(data.habits).toBeInstanceOf(Array)
  expect(data.habits.length).toBeGreaterThan(0)
})
```

**Expected Result**:
- ✅ Bot can query Supabase
- ✅ Returns formatted habit data
- ✅ Handles missing data gracefully

**4.2 Bot Updates Habit Status**
```javascript
test('Discord bot updates habit status via button', async () => {
  // Simulate button interaction
  const habitId = "test-habit-uuid-1"
  const dayIndex = 0 // Monday
  const newStatus = "green"

  await updateHabitStatus(habitId, dayIndex, newStatus)

  // Verify update
  const weekData = await loadChildData("지우", "2025-10-07")
  const habit = weekData.habits.find(h => h.id === habitId)

  expect(habit.times[dayIndex]).toBe("green")
})
```

**Expected Result**:
- ✅ Bot can update habit records
- ✅ Changes reflected in database
- ✅ Changes visible in web app

**4.3 Bot Displays Statistics**
```javascript
test('Discord bot formats statistics for display', async () => {
  const stats = await calculateWeekStats("지우", "2025-10-07")

  const embed = createStatsEmbed(stats)

  expect(embed.title).toContain("지우")
  expect(embed.fields).toBeInstanceOf(Array)
  expect(embed.fields.length).toBeGreaterThan(0)
})
```

**Expected Result**:
- ✅ Statistics formatted as Discord embed
- ✅ Includes success rate, trend, color distribution
- ✅ Visual indicators (emojis) displayed

---

## 🔄 Test Scenario 5: Data Consistency & Edge Cases

### Objective
Test edge cases and data consistency across features.

### Edge Case Tests

**5.1 Empty Week Data**
```javascript
test('Statistics handle week with no data', async () => {
  const stats = await calculateWeekStats("새로운아이", "2025-10-07")

  expect(stats.success_rate).toBe(0)
  expect(stats.total_habits).toBe(0)
  expect(stats.trend).toBe('stable')
})
```

**5.2 Partial Week Data**
```javascript
test('Statistics calculate correctly for partial week', async () => {
  const weekData = {
    child_name: "지우",
    week_start_date: "2025-10-07",
    habits: [
      { name: "습관", times: ["green", "green", "", "", "", "", ""] }
    ]
  }

  await saveChildData(weekData)
  const stats = await calculateWeekStats("지우", "2025-10-07")

  // Only 2 records (first 2 days)
  expect(stats.total_records).toBe(2)
  expect(stats.success_rate).toBe(100)
})
```

**5.3 Date Auto-Adjustment**
```javascript
test('Wednesday date adjusted to Monday', async () => {
  const stats = await calculateWeekStats("지우", "2025-10-09") // Wednesday

  expect(stats.week_start_date).toBe("2025-10-07") // Monday
})
```

**5.4 Concurrent Updates**
```javascript
test('Concurrent template applications don\'t conflict', async () => {
  const template = await loadTemplates({ is_default: true })

  // Apply same template to two children simultaneously
  await Promise.all([
    applyTemplateToWeek(template[0].id, "test-child-uuid-1", "2025-10-07"),
    applyTemplateToWeek(template[0].id, "test-child-uuid-2", "2025-10-07")
  ])

  // Verify both children have data
  const child1 = await loadChildData("지우", "2025-10-07")
  const child2 = await loadChildData("민수", "2025-10-07")

  expect(child1.habits).toBeDefined()
  expect(child2.habits).toBeDefined()
})
```

**5.5 Template with Maximum Habits**
```javascript
test('Template with 50 habits (maximum)', async () => {
  const maxHabits = Array.from({ length: 50 }, (_, i) => ({
    name: `습관 ${i + 1}`,
    time_period: "아침",
    display_order: i + 1
  }))

  const template = await createTemplate({
    name: "최대 습관 템플릿",
    habits: maxHabits
  })

  expect(template.habits).toHaveLength(50)

  // Apply and verify
  await applyTemplateToWeek(template.id, "test-child-uuid-1", "2025-10-07")
  const weekData = await loadChildData("지우", "2025-10-07")

  expect(weekData.habits).toHaveLength(50)
})
```

---

## 📊 Test Results Template

### Test Execution Checklist

- [ ] All dependencies installed
- [ ] Test database setup complete
- [ ] Environment variables configured
- [ ] Sample data loaded

### Test Results

| Scenario | Status | Duration | Notes |
|----------|--------|----------|-------|
| 1. Template E2E | ⏳ | - | - |
| 2. Statistics | ⏳ | - | - |
| 3. Integration | ⏳ | - | - |
| 4. Discord Bot | ⏳ | - | - |
| 5. Edge Cases | ⏳ | - | - |

**Legend**: ✅ Pass | ❌ Fail | ⏳ Pending | ⚠️ Warning

---

## 🐛 Bug Report Template

If any test fails, document using this format:

**Bug ID**: BUG-001
**Test**: Scenario 2.2 - Calculate Week Statistics
**Expected**: `success_rate` should be 83
**Actual**: `success_rate` is 75
**Steps to Reproduce**:
1. Create week with specific habit data
2. Call `calculateWeekStats()`
3. Check `success_rate` value

**Root Cause**: (to be investigated)
**Fix**: (to be implemented)
**Assigned To**: Agent X

---

## 📝 Test Coverage Goals

| Feature | Target Coverage | Current Coverage |
|---------|-----------------|------------------|
| Templates API | 90% | ⏳ TBD |
| Statistics API | 90% | ⏳ TBD |
| Discord Bot | 80% | ⏳ TBD |
| Integration | 85% | ⏳ TBD |

---

**Document Owner**: Agent 4 (Documentation Maintainer)
**Test Lead**: Agent 4
**Review Date**: 2025-10-16 (Day 3)
**Version**: 2.0.0
