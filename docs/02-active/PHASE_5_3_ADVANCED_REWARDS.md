# Phase 5.3: Advanced Reward Triggers

**Status**: ✅ **Development Complete** (Pending DB Migration)
**Date**: 2025-10-27
**Dependencies**: Phase 5.1 (Reward System), Phase 5.2 (Weekly Planner)

---

## 📋 Overview

Phase 5.3 extends the reward system with 4 new advanced trigger types to enhance user motivation and engagement across different time horizons and achievement types.

**New Triggers Added:**
1. `streak_21` - 21-day habit streak (habit formation milestone)
2. `first_weakness_resolved` - First weakness overcome
3. `habit_mastery` - 30 consecutive green days (true mastery)
4. `weekly_planner_perfect` - 100% weekly plan completion

---

## 🎯 Design Rationale

### 1. `streak_21` - 21-Day Streak Badge
**Scientific Basis**: Based on the "21-day rule" for habit formation
**Reward Type**: Badge
**Trigger**: User completes same habit for 21 consecutive days

**Why 21 days?**
- Popularized by Dr. Maxwell Maltz's research on habit formation
- Provides medium-term milestone between streak_14 and habit_mastery
- Reinforces emerging habits before they're fully automatic

**Implementation**:
```javascript
checkStreak21(childName, habitId, streakDays)
```

---

### 2. `first_weakness_resolved` - Overcoming Badge
**Psychological Basis**: First success creates powerful motivation
**Reward Type**: Badge
**Trigger**: User resolves their first weakness entry

**Why this matters:**
- First victories are psychologically significant
- Builds confidence for tackling future challenges
- Celebrates the courage to identify and address weaknesses

**Implementation**:
```javascript
checkFirstWeaknessResolved(childName)
```

---

### 3. `habit_mastery` - Master Achievement
**Mastery Threshold**: 30 consecutive green days
**Reward Type**: Achievement
**Trigger**: Single habit maintained at "green" level for 30 days

**Why 30 days?**
- Exceeds typical habit formation period
- Demonstrates true commitment and consistency
- Higher bar than streak_21 for exceptional performance

**Implementation**:
```javascript
checkHabitMastery(childName, habitId, greenDays)
```

---

### 4. `weekly_planner_perfect` - Perfect Week Sticker
**Integration Point**: Phase 5.2 Weekly Planner
**Reward Type**: Sticker
**Trigger**: Weekly plan completed at 100% completion rate

**Why this matters:**
- Bridges Learning Mode and Weekly Planner features
- Rewards planning + execution (not just tracking)
- Creates positive feedback loop for using planner

**Implementation**:
```javascript
checkWeeklyPlannerPerfect(childName, weeklyPlanId, completionRate)
```

---

## 🛠️ Technical Implementation

### Database Schema Changes

**Migration**: `20251027_012_phase5_advanced_reward_triggers.sql`

#### Step 1: Update `reward_definitions` CHECK Constraint
```sql
ALTER TABLE reward_definitions
ADD CONSTRAINT reward_definitions_trigger_event_check CHECK (trigger_event IN (
  -- 기존 9개 트리거
  'goal_completed', 'weakness_resolved', 'retry_success',
  'streak_3', 'streak_7', 'streak_14',
  'first_goal', 'first_mandala', 'perfect_week',

  -- 신규 4개 트리거
  'streak_21', 'first_weakness_resolved',
  'habit_mastery', 'weekly_planner_perfect'
));
```

#### Step 2: Update `progress_events` CHECK Constraint
```sql
ALTER TABLE progress_events
ADD CONSTRAINT progress_events_event_type_check CHECK (event_type IN (
  -- 동일한 13개 이벤트 타입
));
```

#### Step 3: Insert Default Reward Definitions
```sql
-- 4개 기본 보상 정의 자동 생성
-- (ON CONFLICT DO NOTHING으로 안전하게 재실행 가능)
```

---

### API Functions (`src/lib/learning-mode.js`)

#### 1. `checkStreak21(childName, habitId, streakDays)`
**Purpose**: Detect and record 21-day streak achievement

**Logic**:
1. Verify `streakDays >= 21`
2. Check if already recorded for this habit
3. Record new `streak_21` progress event
4. Return event or null

**Duplicate Prevention**: Checks `payload->>habit_id` in existing events

---

#### 2. `checkHabitMastery(childName, habitId, greenDays)`
**Purpose**: Detect and record 30-day green mastery

**Logic**:
1. Verify `greenDays >= 30`
2. Check if already recorded for this habit
3. Record new `habit_mastery` progress event
4. Return event or null

**Duplicate Prevention**: Checks `payload->>habit_id` in existing events

---

#### 3. `checkWeeklyPlannerPerfect(childName, weeklyPlanId, completionRate)`
**Purpose**: Detect and record 100% weekly plan completion

**Logic**:
1. Verify `completionRate === 100`
2. Check if already recorded for this plan
3. Record new `weekly_planner_perfect` progress event
4. Return event or null

**Duplicate Prevention**: Checks `payload->>weekly_plan_id` in existing events

---

#### 4. `checkFirstWeaknessResolved(childName)`
**Purpose**: Detect and record first weakness resolution

**Logic**:
1. Count resolved weaknesses for child
2. Trigger only if count === 1 (first resolution)
3. Check if already recorded
4. Record new `first_weakness_resolved` progress event
5. Return event or null

**Duplicate Prevention**: Checks `event_type` + `child_id` combination

---

## 🔗 Integration Points

### Where to Call These Functions

#### 1. `checkStreak21` & `checkHabitMastery`
**Location**: Habit record update handler (App.jsx or dual-write.js)

**Trigger Point**: After updating `habit_records` table

**Pseudo-code**:
```javascript
// After saving habit record
const streakDays = calculateCurrentStreak(habitId)
const greenDays = calculateConsecutiveGreenDays(habitId)

await checkStreak21(childName, habitId, streakDays)
await checkHabitMastery(childName, habitId, greenDays)
```

---

#### 2. `checkWeeklyPlannerPerfect`
**Location**: WeeklyPlannerManager.jsx completion handler

**Trigger Point**: When user marks weekly plan as completed

**Pseudo-code**:
```javascript
// In completeWeeklyPlan function
const stats = await getWeeklyPlanProgress(weeklyPlanId)
if (stats.completion_rate === 100) {
  await checkWeeklyPlannerPerfect(childName, weeklyPlanId, 100)
}
```

---

#### 3. `checkFirstWeaknessResolved`
**Location**: WeaknessLogger.jsx resolve handler

**Trigger Point**: After marking weakness as "resolved"

**Pseudo-code**:
```javascript
// After updating weakness status to 'resolved'
await checkFirstWeaknessResolved(childName)
```

---

## 📊 Expected Payload Formats

### `streak_21` Event
```json
{
  "habit_id": "uuid",
  "streak_count": 21
}
```

### `habit_mastery` Event
```json
{
  "habit_id": "uuid",
  "green_days": 30
}
```

### `weekly_planner_perfect` Event
```json
{
  "weekly_plan_id": "uuid",
  "completion_rate": 100
}
```

### `first_weakness_resolved` Event
```json
{
  "weakness_id": "uuid"
}
```

---

## 🧪 Testing Checklist

### Database Migration
- [ ] Run migration on local Supabase instance
- [ ] Verify CHECK constraints updated (13 trigger types)
- [ ] Verify 4 default rewards inserted
- [ ] Test constraint enforcement (invalid event type rejected)

### API Functions
- [ ] Test `checkStreak21` with 21-day streak
- [ ] Test `checkHabitMastery` with 30 green days
- [ ] Test `checkWeeklyPlannerPerfect` with 100% completion
- [ ] Test `checkFirstWeaknessResolved` after first resolution
- [ ] Verify duplicate prevention (no double rewards)
- [ ] Test idempotency (same trigger called multiple times)

### Integration
- [ ] Integrate `checkStreak21` into habit save flow
- [ ] Integrate `checkHabitMastery` into habit save flow
- [ ] Integrate `checkWeeklyPlannerPerfect` into planner completion
- [ ] Integrate `checkFirstWeaknessResolved` into weakness resolution
- [ ] Verify rewards appear in child's reward list
- [ ] Test notification/display when reward earned

---

## 📈 Metrics to Track

After deployment, monitor:

1. **Trigger Frequency**:
   - How often is each new trigger activated?
   - Which triggers are most/least common?

2. **User Engagement**:
   - Does `weekly_planner_perfect` increase planner usage?
   - Does `streak_21` improve habit consistency?

3. **Completion Rates**:
   - What % of users reach `habit_mastery` (30 days)?
   - What % resolve their first weakness?

4. **Reward Distribution**:
   - Are rewards balanced across trigger types?
   - Any triggers too easy/hard to achieve?

---

## 🚀 Deployment Steps

### 1. Apply Migration (Manual)
```bash
# Copy migration SQL to Supabase SQL Editor
# Execute migration
# Verify with:
SELECT name, trigger_event, description
FROM reward_definitions
WHERE trigger_event IN (
  'streak_21', 'first_weakness_resolved',
  'habit_mastery', 'weekly_planner_perfect'
);
```

### 2. Deploy Frontend Code
```bash
git add .
git commit -m "feat: Add Phase 5.3 advanced reward triggers"
git push origin main
```

### 3. Integrate Trigger Checks
- Add calls to `check*` functions in appropriate handlers
- Test in development environment
- Deploy to production

### 4. Monitor & Iterate
- Check `progress_events` table for new event types
- Monitor `rewards_ledger` for reward issuance
- Adjust trigger thresholds if needed

---

## 🔮 Future Enhancements

### Potential Additional Triggers
1. `streak_100` - Centenarian badge (100-day streak)
2. `all_habits_green` - Perfect day (all habits green)
3. `weekly_improvement` - Week-over-week progress
4. `goal_tree_complete` - Complete goal hierarchy
5. `mandala_81_complete` - Fill entire 81-cell mandala

### Trigger Customization
- Allow parents to define custom trigger thresholds
- Per-child reward preferences (badges vs stickers)
- Age-appropriate trigger difficulty

### Gamification
- Reward tiers (bronze/silver/gold for streaks)
- Combo rewards (multiple triggers in one week)
- Seasonal/special event rewards

---

## 📝 Files Modified

### New Files
- `supabase/migrations/20251027_012_phase5_advanced_reward_triggers.sql` (133 lines)
- `docs/02-active/PHASE_5_3_ADVANCED_REWARDS.md` (this file)

### Modified Files
- `src/lib/learning-mode.js` (+220 lines)
  - Added 4 new exported functions
  - Integrated with existing `createProgressEvent`

### Files to Modify (Integration Pending)
- `App.jsx` - Integrate streak checks in habit save flow
- `src/components/WeeklyPlanner/WeeklyPlannerManager.jsx` - Add perfect week check
- `src/components/Weaknesses/WeaknessLogger.jsx` - Add first resolution check

---

## ✅ Completion Criteria

Phase 5.3 is considered complete when:

1. ✅ **Database**: Migration applied successfully
2. ✅ **API**: 4 new trigger functions implemented and tested
3. ⏳ **Integration**: Trigger checks called from UI components (pending)
4. ⏳ **Testing**: All triggers verified with real data (pending)
5. ⏳ **Documentation**: README and CLAUDE.md updated (in progress)
6. ⏳ **Deployment**: Changes pushed to production (pending)

**Current Status**: Development complete, pending manual migration and integration.

---

## 🎉 Summary

Phase 5.3 adds 4 strategically chosen reward triggers that:
- Span short-term (perfect week) to long-term (mastery) achievements
- Bridge multiple features (habits, weaknesses, weekly planner)
- Provide scientific basis (21-day rule) and psychological validation
- Extend existing reward system without breaking changes

**Total Reward Triggers**: 9 (Phase 5.1) + 4 (Phase 5.3) = **13 triggers**

**Next Steps**: Apply migration manually in Supabase, integrate trigger checks into UI, and test with real user data.
