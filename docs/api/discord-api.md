# 🤖 Discord Bot API Documentation

**Entry Point**: `bot/index.js`
**Package**: `bot/package.json`
**Developer**: Agent 1 (Discord Bot Developer)
**Status**: 🔄 In Progress (Day 2)

---

## 📋 Overview

The Discord Bot provides an interactive interface for kids and parents to track habits directly from Discord. It supports slash commands, button interactions, and automated reporting through scheduled tasks.

### Key Features (Planned)
- Slash commands for viewing and updating habits
- Interactive button components for easy habit updates
- Automated daily and weekly reports
- Real-time notifications
- Statistics visualization in Discord embeds

---

## 🎯 Slash Commands

### 1. `/습관조회` - View Habit Data

View habit tracking data for a child and specific week.

**Usage**:
```
/습관조회 [child_name] [week_date]
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `child_name` | string | ✅ | Name of the child (e.g., "지우") |
| `week_date` | string | ❌ | Week date (YYYY-MM-DD), defaults to current week |

**Example**:
```
/습관조회 지우 2025-10-07
```

**Response Format**:
```
📊 지우의 습관 현황 (2025-10-07 ~ 2025-10-13)

아침 습관:
  ✅ 양치하기: 🟢🟢🟡🔴⚪⚪⚪
  ✅ 운동하기: 🟢🟢🟢🟢🟡⚪⚪

오후 습관:
  ✅ 숙제하기: 🟢🟡🟡🟢🟢⚪⚪
  ✅ 책 읽기: 🟢🟢🟢🟢🟢⚪⚪

저녁 습관:
  ✅ 일기 쓰기: 🟡🟡🟢🟢🟢⚪⚪

📈 이번 주 성공률: 78%
```

**Implementation Status**: 🔄 In Progress

---

### 2. `/습관수정` - Update Habit Status

Update the status of a specific habit with interactive buttons.

**Usage**:
```
/습관수정 [child_name] [habit_name] [day]
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `child_name` | string | ✅ | Name of the child |
| `habit_name` | string | ✅ | Name of the habit (auto-complete) |
| `day` | string | ❌ | Day of week (월/화/수/목/금/토/일), defaults to today |

**Example**:
```
/습관수정 지우 "양치하기" 월
```

**Response** (with buttons):
```
습관: 양치하기
날짜: 2025-10-07 (월요일)
현재 상태: 없음

상태를 선택하세요:
[🟢 완벽!] [🟡 절반] [🔴 못했어요] [⚪ 초기화]
```

**Button Actions**:
- 🟢 **완벽!** - Set status to 'green'
- 🟡 **절반** - Set status to 'yellow'
- 🔴 **못했어요** - Set status to 'red'
- ⚪ **초기화** - Clear status

**After button click**:
```
✅ 업데이트 완료!
양치하기: 없음 → 🟢 완벽!
```

**Implementation Status**: 🔄 Planned

---

### 3. `/통계` - View Statistics

Display statistics and charts for a child's habit tracking.

**Usage**:
```
/통계 [child_name] [period]
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `child_name` | string | ✅ | Name of the child |
| `period` | string | ❌ | 'week' or 'month', defaults to 'week' |

**Example**:
```
/통계 지우 week
```

**Response Format** (Weekly):
```
📊 지우의 이번 주 통계

성공률: 78% 📈
추세: 향상 중 (지난 주 대비 +5%)

색깔 분포:
🟢 완벽: 25개 (60%)
🟡 절반: 10개 (24%)
🔴 못함: 5개 (12%)
⚪ 없음: 2개 (4%)

가장 잘한 습관: 책 읽기 (100%)
개선 필요: 운동하기 (50%)
```

**Response Format** (Monthly):
```
📊 지우의 10월 통계

전체 성공률: 75%
추세: 안정적 ➡️

주차별 성공률:
  1주차 (10/07): 72% 📈
  2주차 (10/14): 78% 📈
  3주차 (10/21): 76% ➡️
  4주차 (10/28): 74% 📉

최고 주차: 2주차 (78%)
최저 주차: 4주차 (74%)
```

**Implementation Status**: 🔄 Planned

---

### 4. `/알림설정` - Configure Notifications

Configure notification preferences for habit reminders and reports.

**Usage**:
```
/알림설정 [type] [enabled] [time]
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | ✅ | 'daily' or 'weekly' |
| `enabled` | boolean | ✅ | true or false |
| `time` | string | ❌ | Time in HH:MM format (24-hour) |

**Example**:
```
/알림설정 daily true 21:00
```

**Response**:
```
✅ 알림 설정 완료!

일일 요약 알림: 활성화 ✅
시간: 매일 오후 9시
채널: #습관-추적기

변경하려면 다시 /알림설정 명령어를 사용하세요.
```

**Notification Types**:
- **Daily Summary**: Sent every day at configured time
- **Weekly Report**: Sent every Sunday at configured time

**Implementation Status**: 🔄 Planned

---

## 🎨 Interactive Components

### Button Components

**Color Selection Buttons**:
```javascript
const row = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('status_green')
      .setLabel('🟢 완벽!')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('status_yellow')
      .setLabel('🟡 절반')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('status_red')
      .setLabel('🔴 못했어요')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('status_clear')
      .setLabel('⚪ 초기화')
      .setStyle(ButtonStyle.Secondary)
  )
```

**Navigation Buttons**:
```javascript
const navRow = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('week_prev')
      .setLabel('◀️ 이전 주')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('week_today')
      .setLabel('📅 이번 주')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('week_next')
      .setLabel('다음 주 ▶️')
      .setStyle(ButtonStyle.Secondary)
  )
```

### Select Menus

**Child Selection**:
```javascript
const childSelect = new StringSelectMenuBuilder()
  .setCustomId('select_child')
  .setPlaceholder('아이를 선택하세요')
  .addOptions([
    {
      label: '지우',
      value: 'child_uuid_1',
      emoji: '👧'
    },
    {
      label: '민수',
      value: 'child_uuid_2',
      emoji: '👦'
    }
  ])
```

**Habit Selection**:
```javascript
const habitSelect = new StringSelectMenuBuilder()
  .setCustomId('select_habit')
  .setPlaceholder('습관을 선택하세요')
  .addOptions(habits.map(habit => ({
    label: habit.name,
    value: habit.id,
    description: habit.time_period
  })))
```

---

## 📅 Scheduled Tasks (Cron Jobs)

### Daily Summary (9 PM)

**Schedule**: `0 21 * * *` (Every day at 9 PM)

**Message Format**:
```
🌙 오늘의 습관 요약 (2025-10-09)

지우:
  완료: 6/8 습관 (75%)
  미완료: 운동하기, 일기 쓰기

민수:
  완료: 5/7 습관 (71%)
  미완료: 숙제하기, 정리정돈

내일도 화이팅! 💪
```

**Implementation**:
```javascript
import cron from 'node-cron'

// Schedule daily summary at 9 PM
cron.schedule('0 21 * * *', async () => {
  const summary = await generateDailySummary()
  await sendToChannel(HABIT_CHANNEL_ID, summary)
})
```

**Implementation Status**: 🔄 Planned

---

### Weekly Report (Sunday 8 PM)

**Schedule**: `0 20 * * 0` (Every Sunday at 8 PM)

**Message Format**:
```
📊 이번 주 습관 리포트 (2025-10-07 ~ 2025-10-13)

지우:
  성공률: 78% 📈 (+5% from last week)
  가장 잘한 습관: 책 읽기 (100%)
  개선 필요: 운동하기 (50%)

민수:
  성공률: 82% 📈 (+3% from last week)
  가장 잘한 습관: 숙제하기 (100%)
  개선 필요: 정리정돈 (57%)

이번 주도 수고했어요! 다음 주도 화이팅! 🎉
```

**Implementation**:
```javascript
// Schedule weekly report on Sunday at 8 PM
cron.schedule('0 20 * * 0', async () => {
  const report = await generateWeeklyReport()
  await sendToChannel(HABIT_CHANNEL_ID, report)
})
```

**Implementation Status**: 🔄 Planned

---

## 🗄️ Database Integration

### Supabase Connection

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role for bot
)
```

### Query Examples

**Fetch Child's Week Data**:
```javascript
async function fetchWeekData(childName, weekStartDate) {
  const { data, error } = await supabase
    .from('weeks')
    .select(`
      *,
      children (name),
      habits (
        *,
        habit_records (*)
      )
    `)
    .eq('children.name', childName)
    .eq('week_start_date', weekStartDate)
    .single()

  if (error) throw error
  return data
}
```

**Update Habit Status**:
```javascript
async function updateHabitStatus(habitId, dayIndex, status) {
  const { data, error } = await supabase
    .from('habit_records')
    .update({ status })
    .eq('habit_id', habitId)
    .eq('day_index', dayIndex)

  if (error) throw error
  return data
}
```

---

## 🔧 Bot Configuration

### Environment Variables

```env
# Discord Bot
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here (optional for dev)

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Notification Settings
HABIT_CHANNEL_ID=channel_id_for_notifications
DAILY_SUMMARY_TIME=21:00
WEEKLY_REPORT_TIME=20:00
WEEKLY_REPORT_DAY=0 (0=Sunday, 1=Monday, etc.)
```

### Bot Initialization

```javascript
import { Client, GatewayIntentBits } from 'discord.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
})

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
  registerCommands()
  scheduleTasks()
})

client.login(process.env.DISCORD_TOKEN)
```

---

## 📦 Dependencies

**Current** (`bot/package.json`):

```json
{
  "dependencies": {
    "discord.js": "^14.14.1",
    "@supabase/supabase-js": "^2.45.0",
    "dotenv": "^16.4.5",
    "node-cron": "^3.0.3"
  }
}
```

**Planned Additions**:
- `canvas` - For generating chart images
- `chartjs-node-canvas` - Chart rendering
- `date-fns` - Date manipulation

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Bot connects to Discord successfully
- [ ] Slash commands register correctly
- [ ] `/습관조회` displays habit data
- [ ] `/습관수정` buttons work properly
- [ ] `/통계` shows correct statistics
- [ ] `/알림설정` saves preferences
- [ ] Daily summary sends at correct time
- [ ] Weekly report sends on Sunday
- [ ] Error messages are user-friendly

### Test Commands

```javascript
// Test database connection
node bot/test-connection.js

// Test slash command registration
node bot/register-commands.js

// Test scheduled task
node bot/test-cron.js
```

---

## ⚠️ Important Notes

### Service Role Key
The bot uses Supabase service role key (not anon key) to bypass RLS policies. **Keep this secret!**

### Rate Limiting
Discord has rate limits:
- 50 requests per second globally
- 5 requests per second per route

Implement queuing for bulk operations.

### Error Handling
Always handle errors gracefully in Discord:

```javascript
try {
  await interaction.reply('Processing...')
  const result = await fetchData()
  await interaction.editReply(result)
} catch (error) {
  console.error('Command error:', error)
  await interaction.editReply('❌ 오류가 발생했습니다. 다시 시도해주세요.')
}
```

### Deployment
Bot will be deployed to Railway.app:
- Auto-restart on crash
- Environment variable management
- Scheduled task support
- Log monitoring

---

## 🔗 Related Documentation

- **[Discord.js Guide](https://discordjs.guide/)** - Official documentation
- **[API Index](./README.md)** - All API documentation
- **[bot/README.md](../../bot/README.md)** - Bot setup guide

---

**Last Updated**: 2025-10-13
**Version**: 0.5.0 (In Development)
**Maintainer**: Agent 4
**Developer**: Agent 1
