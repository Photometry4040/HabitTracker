# 📚 API Documentation Index

**Last Updated**: 2025-10-13
**Status**: Day 2 Development

This directory contains comprehensive API documentation for all new features being developed in parallel by our agent team.

---

## 📂 API Documentation Structure

### Core APIs

1. **[Templates API](./templates-api.md)** - Habit Template CRUD Operations
   - Agent: Agent 3 (Template System Developer)
   - Status: ✅ Complete
   - Library: `src/lib/templates.js`
   - Hook: `src/hooks/useTemplate.js`

2. **[Statistics API](./statistics-api.md)** - Statistical Analysis Functions
   - Agent: Agent 2 (Statistics Engineer)
   - Status: ✅ Complete
   - Library: `src/lib/statistics.js`
   - Hook: `src/hooks/useStatistics.js`

3. **[Discord Bot API](./discord-api.md)** - Discord Bot Commands & Events
   - Agent: Agent 1 (Discord Bot Developer)
   - Status: 🔄 In Progress
   - Entry Point: `bot/index.js`
   - Package: `bot/package.json`

---

## 🎯 Quick Reference

### Template Operations

```javascript
import { createTemplate, loadTemplates, applyTemplateToWeek } from '@/lib/templates.js'

// Create a new template
const template = await createTemplate({
  name: "학교 생활 습관",
  habits: [
    { name: "숙제하기", time_period: "저녁", display_order: 1 }
  ]
})

// Load templates
const templates = await loadTemplates({ is_default: true })

// Apply template to week
await applyTemplateToWeek(templateId, childId, weekStartDate)
```

### Statistics Operations

```javascript
import { calculateWeekStats, calculateMonthStats } from '@/lib/statistics.js'

// Get weekly statistics
const weekStats = await calculateWeekStats("지우", "2025-10-07")
// Returns: { success_rate, total_habits, color_distribution, trend }

// Get monthly statistics
const monthStats = await calculateMonthStats("지우", 2025, 10)
// Returns: { weeks: [...], overall_success_rate, trend }
```

### Discord Bot Commands

```javascript
// Slash commands (planned)
/습관조회 [child_name] [week_date]  // View habit data
/습관수정 [child_name] [habit]       // Update habit status
/통계 [child_name] [period]          // View statistics
/알림설정 [settings]                  // Configure notifications
```

---

## 🔧 Implementation Details

### React Query Integration

All new APIs are integrated with React Query for optimal data fetching:

```javascript
// Templates Hook
const { templates, isLoading, createTemplate } = useTemplate()

// Statistics Hook
const { weekStats, monthStats, isLoading } = useStatistics(childName, weekDate)
```

### Error Handling

All APIs follow consistent error handling patterns:

```javascript
try {
  const result = await apiFunction(params)
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw error // Re-throw for React Query error boundaries
}
```

### Authentication

All database operations require Supabase authentication:

```javascript
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  throw new Error('인증되지 않은 사용자입니다.')
}
```

---

## 📖 API Documentation Pages

### 1. Templates API (`templates-api.md`)

**Coverage**:
- `createTemplate(templateData)` - Create new habit template
- `loadTemplates(filters)` - Load templates with filtering
- `updateTemplate(id, updates)` - Update existing template
- `deleteTemplate(id)` - Delete template
- `duplicateTemplate(id, newName)` - Duplicate template
- `applyTemplateToWeek(templateId, childId, weekStartDate)` - Apply template

**Data Structures**:
- Template object schema
- Habit object schema
- Filter options

### 2. Statistics API (`statistics-api.md`)

**Coverage**:
- `calculateWeekStats(childName, weekStartDate)` - Weekly statistics
- `calculateMonthStats(childName, year, month)` - Monthly aggregation
- `calculateSuccessRate(records)` - Success rate calculation
- `calculateTrend(dataPoints)` - Trend analysis
- Helper functions (date handling, color distribution)

**Data Structures**:
- Statistics object schema
- Trend types ('improving', 'declining', 'stable')
- Color distribution format

### 3. Discord Bot API (`discord-api.md`)

**Coverage**:
- Slash command handlers
- Button interaction handlers
- Scheduled tasks (cron jobs)
- Event listeners
- Database integration

**Data Structures**:
- Command options
- Embed formats
- Button components

---

## 🧪 Testing APIs

### Unit Testing

```javascript
// Vitest test example
import { calculateSuccessRate } from '@/lib/statistics.js'

test('calculates success rate correctly', () => {
  const records = [
    { status: 'green' },  // 100%
    { status: 'yellow' }, // 50%
    { status: 'red' }     // 0%
  ]
  const rate = calculateSuccessRate(records)
  expect(rate).toBe(50) // (100 + 50 + 0) / 3 = 50
})
```

### Integration Testing

See `tests/integration/day3-scenarios.md` for comprehensive integration test scenarios.

---

## 🚀 Usage Examples

### Example 1: Create Template and Apply

```javascript
import { createTemplate, applyTemplateToWeek } from '@/lib/templates.js'

// Step 1: Create template
const template = await createTemplate({
  name: "주말 특별 습관",
  description: "주말에만 하는 특별한 습관들",
  habits: [
    { name: "가족 시간", time_period: "오전", display_order: 1 },
    { name: "독서", time_period: "오후", display_order: 2 },
    { name: "운동", time_period: "저녁", display_order: 3 }
  ]
})

// Step 2: Apply to this week
await applyTemplateToWeek(template.id, "child-uuid", "2025-10-07")
```

### Example 2: Get Statistics with Trend

```javascript
import { calculateWeekStats, calculateMonthStats } from '@/lib/statistics.js'

// Get this week's stats
const thisWeek = await calculateWeekStats("지우", "2025-10-07")
console.log(`Success Rate: ${thisWeek.success_rate}%`)
console.log(`Trend: ${thisWeek.trend}`) // 'improving', 'declining', or 'stable'

// Get monthly overview
const monthly = await calculateMonthStats("지우", 2025, 10)
console.log(`Overall Monthly Success: ${monthly.overall_success_rate}%`)
console.log(`Number of weeks tracked: ${monthly.weeks.length}`)
```

### Example 3: Discord Bot Integration

```javascript
// Discord bot command handler (planned)
client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === '통계') {
    const childName = interaction.options.getString('child_name')
    const stats = await calculateWeekStats(childName, getTodayMondayDate())

    await interaction.reply({
      embeds: [{
        title: `${childName}의 이번 주 통계`,
        fields: [
          { name: '성공률', value: `${stats.success_rate}%` },
          { name: '추세', value: stats.trend === 'improving' ? '📈 향상 중' : '📉 하락 중' }
        ]
      }]
    })
  }
})
```

---

## 📊 API Status Matrix

| API Function | Status | Tests | Docs | Ready for Prod |
|-------------|--------|-------|------|----------------|
| `createTemplate()` | ✅ | ⏳ | ✅ | 🔄 |
| `loadTemplates()` | ✅ | ⏳ | ✅ | 🔄 |
| `updateTemplate()` | ✅ | ⏳ | ✅ | 🔄 |
| `deleteTemplate()` | ✅ | ⏳ | ✅ | 🔄 |
| `applyTemplateToWeek()` | ✅ | ⏳ | ✅ | 🔄 |
| `calculateWeekStats()` | ✅ | ⏳ | ✅ | 🔄 |
| `calculateMonthStats()` | ✅ | ⏳ | ✅ | 🔄 |
| Discord Slash Commands | 🔄 | ⏳ | 🔄 | ❌ |

**Legend**: ✅ Complete | 🔄 In Progress | ⏳ Planned | ❌ Not Started

---

## 🔗 Related Documentation

- **[AGENT_PROGRESS.md](../AGENT_PROGRESS.md)** - Overall agent development progress
- **[TEMPLATE_SYSTEM_SPEC.md](../TEMPLATE_SYSTEM_SPEC.md)** - Template system technical specification
- **[GIT_BRANCH_STATUS.md](../GIT_BRANCH_STATUS.md)** - Git branch health status
- **[Main README](../README.md)** - Project documentation index

---

## 📝 Contributing to API Docs

### When Adding New APIs

1. **Create API Documentation File**
   - Follow naming convention: `feature-api.md`
   - Use the template structure from existing files
   - Include code examples

2. **Update This Index**
   - Add to "API Documentation Structure" section
   - Update "Quick Reference" with basic usage
   - Update "API Status Matrix"

3. **Update Tests**
   - Add unit tests to `tests/unit/`
   - Add integration tests to `tests/integration/`
   - Update `tests/integration/day3-scenarios.md`

### Documentation Standards

- **JSDoc Comments**: All functions must have JSDoc
- **Type Information**: Document parameter types and return types
- **Error Cases**: Document all possible errors
- **Examples**: Provide working code examples
- **Edge Cases**: Document edge cases and limitations

---

## 🐛 Known Issues & Limitations

### Templates API
- No template versioning system yet (planned for Phase 3)
- Maximum 50 habits per template (database limit)

### Statistics API
- Historical data limited to existing week records
- Trend calculation requires at least 2 data points
- Success rate calculation doesn't account for habit importance/weight

### Discord Bot API
- Not yet implemented (Day 1-2 in progress)
- Rate limiting not yet configured
- Requires Discord server setup

---

## 📅 Upcoming API Changes

### Week of 2025-10-14
- [ ] Add template versioning
- [ ] Implement statistics caching
- [ ] Complete Discord bot slash commands

### Week of 2025-10-21
- [ ] Add real-time statistics updates
- [ ] Implement template sharing between users
- [ ] Add Discord webhook notifications

---

**Document Owner**: Agent 4 (Documentation Maintainer)
**Last Review**: 2025-10-13
**Next Review**: 2025-10-16
