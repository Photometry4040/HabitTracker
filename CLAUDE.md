# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Quick Start for New Contributors

**First Time Setup:**
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and add Supabase credentials
3. Run migrations in `supabase/migrations/` folder in order
4. Start dev server: `npm run dev`

**Key Points to Know:**
- All reads: `src/lib/database-new.js` (direct DB queries)
- All writes: `src/lib/dual-write.js` (via Edge Function)
- Main state: `App.jsx` (no external state management)
- RLS enabled on all tables (user isolation at DB level)
- Monday-only week start dates (enforced by CHECK constraint)

**Current Focus:** Phase 5 Learning Mode (95% complete) - Phase 5.2 Weekly Planner completed!

## Project Overview

This is a **Habit Tracker for Kids** - a visual habit tracking web application built with React + Vite. The app allows parents and children to collaboratively track daily habits using a color-coded system (green/yellow/red) and store data in Supabase with user authentication.

**Key Features:**
- User authentication with Supabase Auth
- Multi-child habit tracking with weekly periods
- Color-coded habit evaluation system (green/yellow/red)
- Data visualization dashboard with Recharts
- Cloud storage with Supabase PostgreSQL
- PWA support with app icons for all platforms
- Discord notifications for habit tracking events
- Achievement badge system
- **Learning Mode** (Phase 5): Goals, Mandala Charts, Weaknesses, Rewards, Weekly Planner

**Project Status:** 🎉 **Phase 5.2 Complete** (95%) - Weekly Planner fully integrated. Goals, Mandala, Weaknesses operational. Template system ready.

**Monitoring Period:** OLD SCHEMA monitoring ended 2025-10-25. `habit_tracker_old` can be safely dropped if no issues detected.

## Current Architecture (Phase 3 Complete - 2025-10-18)

### Database Schema (NEW SCHEMA)

**Core Habit Tracking Tables:**
- `children` - Child profiles (user_id, name, theme)
- `weeks` - Weekly tracking periods (child_id, week_start_date, reflection, reward)
- `habits` - Individual habits (week_id, name, display_order)
- `habit_records` - Daily habit status (habit_id, record_date, status)
- `habit_templates` - Reusable habit templates (user_id, child_id, name, description, habits, is_default)

**Learning Mode Tables (Phase 5):**
- `goals` - Learning goals with hierarchical structure (parent_goal_id, depth, ICE scoring)
- `mandala_charts` - Mandala charts (9칸/27칸 support, 81칸 disabled)
- `weaknesses` - Weakness tracking with retry system and badge rewards
- `reward_definitions` - Reward definitions (badge, sticker, achievement, theme, level_up)
- `progress_events` - Progress event log (goal_completed, weakness_resolved, streaks, etc.)
- `rewards_ledger` - Reward issuance ledger (prevents duplicate rewards)
- `weekly_plans` - Weekly learning plans (child_id, week_id, title, status, goal_targets)
- `daily_plan_items` - Daily tasks (weekly_plan_id, planned_date, task_title, priority, completed)
- `weekly_plan_templates` - Reusable weekly plan templates with usage tracking

**Archived Tables:**
- `habit_tracker_old` - Old denormalized schema (READ-ONLY, archived 2025-10-18)

**Key Constraints:**
- Week start date MUST be Monday (CHECK constraint enforced)
- Foreign keys ensure referential integrity
- **RLS (Row-Level Security) ENABLED** ✅ - User_id isolation enforced at DB level

**Security Status (Phase 3 Security Update - 2025-10-18):**
- ✅ RLS enabled on all core tables (children, weeks, habits, habit_records)
- ✅ RLS enabled on idempotency_log (user_id based isolation)
- ✅ Edge Function extracts user_id from JWT and logs operations
- ✅ Multi-tenant isolation now enforced at database level

### Data Flow Architecture

```
Frontend (React)
    ↓
Read: database-new.js → Supabase (NEW SCHEMA)
    ↓
Write: dual-write.js → Edge Function → Supabase (NEW SCHEMA only)
    ↓
Idempotency: idempotency_log table
```

**Critical Files:**
1. **Authentication Layer** (`src/lib/auth.js`):
   - Handles Supabase Auth (login, signup, logout)
   - Manages user session state
   - All database operations require authenticated user

2. **Database Layer - Read** (`src/lib/database-new.js`):
   - `loadWeekDataNew()` - Loads specific week data for a child
   - `loadAllChildrenNew()` - Lists all children with date ranges
   - `loadChildWeeksNew()` - Gets all weeks for a child
   - `loadChildMultipleWeeksNew()` - Dashboard multi-week data

3. **Database Layer - Write** (`src/lib/dual-write.js`):
   - `createWeekDualWrite()` - Creates/updates week via Edge Function
   - `updateHabitRecordDualWrite()` - Updates single habit record
   - `deleteWeekDualWrite()` - Deletes week data

3.5. **Template System** (`src/lib/templates.js`):
   - `createTemplate()` - Create new habit template
   - `getTemplates()` - Retrieve user's templates
   - `updateTemplate()` - Update existing template
   - `deleteTemplate()` - Delete template
   - `getDefaultTemplate()` - Get user's default template
   - `setDefaultTemplate()` - Set a template as default

4. **Edge Function** (`supabase/functions/dual-write-habit/index.ts`):
   - Handles ALL write operations
   - Mode: `new_only` (writes to NEW SCHEMA only)
   - Idempotency via `idempotency_log` table
   - Operations: create_week, update_habit_record, delete_week

5. **State Management** (`App.jsx`):
   - Main app state lives in `App.jsx` (no external state management)
   - Key state: `habits`, `reflection`, `reward`, `selectedChild`, `weekPeriod`
   - **Manual save model**: User must click save button (no auto-save)
   - **3-View System**: App renders one of three views based on state:
     - `showDashboard = true` → Dashboard view (4 dashboard types)
     - `showTemplateManager = true` → Template Manager view
     - `showLearningMode = true` → Learning Mode view (Goals/Mandala/Weaknesses)
     - All false → Habit Tracker view (default)

6. **Component Architecture**:
   - `App.jsx` - Main component, handles all state and data operations, includes 4 view modes (tracker/dashboard/template/learning)
   - `Auth.jsx` - Login/signup UI
   - `ChildSelector.jsx` - Child selection interface (uses Edge Function for delete)
   - `Dashboard/` - Modular dashboard system with 4 specialized views:
     - `ComparisonDashboard/` - Multi-child comparison with ranking
     - `TrendDashboard/` - Weekly trend analysis with continuous week display
     - `SelfAwarenessDashboard/` - Insights, strengths, weaknesses analysis
     - `MonthlyDashboard/` - Monthly statistics and calendar view
   - `hooks/useDashboardData.ts` - React Query hooks for dashboard data fetching
   - **Template System** (Phase 4.5):
     - `TemplateManager.jsx` - Template CRUD interface with preview
     - `TemplatePreview.jsx` - Visual preview of template habits
     - `lib/templates.js` - Template CRUD operations
     - `hooks/useTemplate.js` - React Query hooks for templates
   - **Learning Mode Components** (Phase 5):
     - `Goals/GoalsManager.jsx` - Goal creation, editing, hierarchical view, ICE scoring
     - `Mandala/MandalaChart.jsx` - 3x3 grid visualization, node editor, goal integration
     - `Weaknesses/WeaknessLogger.jsx` - Weakness tracking, retry system, badges
     - `lib/learning-mode.js` - API layer (29 functions for goals/mandala/weaknesses/rewards)

## Migration History

### Phase 0: Schema Design (Completed)
- ✅ NEW SCHEMA tables created (children, weeks, habits, habit_records)
- ✅ Migration scripts developed
- ✅ Initial backfill completed

### Phase 1: Edge Function (Completed)
- ✅ Dual-write Edge Function developed
- ✅ Idempotency system implemented
- ✅ Error handling and logging

### Phase 2: Frontend Migration (Completed)
- ✅ Read operations migrated to database-new.js
- ✅ Write operations migrated to dual-write.js
- ✅ Dual-write mode validated
- ✅ Discord notifications integrated

### Phase 3: OLD SCHEMA Removal (Completed 2025-10-18)
- ✅ Drift analysis completed (26.5% acceptable drift)
- ✅ Edge Function simplified to `new_only` mode
- ✅ OLD SCHEMA renamed to `habit_tracker_old`
- ✅ Backup created (70.62 KB, 34 records)
- ✅ Monitoring view created (`v_old_schema_status`)
- ✅ Frontend 100% using NEW SCHEMA

**Current Status:**
- OLD SCHEMA: Archived, monitoring for 1 week
- NEW SCHEMA: Primary, fully operational
- Edge Function: new_only mode (640 lines, -35% from dual-write)

### Phase 4: Dashboard Aggregation (100% Complete - 2025-10-19)
- ✅ Edge Function `dashboard-aggregation` deployed to Supabase
- ✅ React Query v5 hooks implemented (`useDashboardData.ts`)
- ✅ 4 Dashboard types: Comparison, Trends, Self-Awareness (Insights), Monthly
- ✅ All bug fixes completed (406 errors, React warnings, type errors)
- ✅ Security Invoker views created (`v_weekly_completion`, `v_daily_completion`, `v_habit_failure_patterns`)
- ✅ Production deployment successful with direct DB queries
- ⚠️ **Temporary**: Edge Function bypassed due to 500 errors (see `EDGE_FUNCTION_500_FIX.md`)
- 📚 **Current Status**: All dashboards operational, using direct database queries for stability

### Phase 5: Learning Mode (95% Complete - 2025-10-26)
**Phase 5.1: Goals, Mandala, Weaknesses (Completed ✅):**
- ✅ Database schema: 10 migrations (goals, mandala_charts, weaknesses, rewards system)
- ✅ Frontend components: GoalsManager, MandalaChart, WeaknessLogger
- ✅ API layer: 29 functions in learning-mode.js
- ✅ Goal-Mandala bidirectional sync with auto-completion
- ✅ Reward system integration (first_mandala, perfect_week events)
- ✅ Mobile UI optimization (40px touch targets, responsive layouts)

**Phase 5.2: Weekly Planner (Completed ✅ - 2025-10-26):**
- ✅ Database schema: 3 tables (weekly_plans, daily_plan_items, weekly_plan_templates)
- ✅ Database views: v_weekly_plan_progress, v_daily_tasks_summary
- ✅ API layer: 22 functions in weekly-planner.js (857 lines)
  - Weekly Plans CRUD (7 functions): create, get, update, delete, complete
  - Daily Tasks CRUD (7 functions): add, get, update, complete, uncomplete, delete
  - Templates CRUD (5 functions): create, get, apply, update, delete
  - Analytics (3 functions): getProgress, getDailySummary, getCompletionStats
- ✅ Frontend components (966 lines total):
  - WeeklyPlannerManager.jsx (360 lines) - Main container with 3 views
  - DailyTaskCalendar.jsx (412 lines) - 7-day calendar with task management
  - WeeklyPlanEditor.jsx (194 lines) - Plan editing and completion form
- ✅ App.jsx integration: currentWeekId state, WeeklyPlanner button, rendering logic
- ✅ Features:
  - 7-day calendar view with daily task tracking
  - Priority system (1-5: 긴급 → 최저)
  - Time estimation and actual time tracking
  - Weekly reflection and completion workflow
  - Progress tracking (total tasks, completed, completion rate, time spent)
  - Template system for reusable weekly plans

**Pending (Phase 5.3+):**
- ⏳ 81칸 Mandala expansion (3-level hierarchy: 9칸 → 27칸 → 81칸)
- ⏳ Advanced reward triggers (streak_21, first_weakness_resolved, etc.)
- ⏳ Template manager UI for Weekly Planner (optional enhancement)

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Run development server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview

# Lint code
npm run lint
```

### Database Commands
```bash
# Analyze drift between schemas (Phase 3 legacy)
node scripts/analyze-drift-details.js

# Check latest save operation
node scripts/check-latest-save.js

# Verify NEW SCHEMA only mode
node scripts/verify-new-schema-only.js

# Verify table rename
node scripts/verify-table-rename.js

# Phase 4: Dashboard data verification
node scripts/check-august-weeks.js
node scripts/verify-week-33-data.js
node scripts/test-real-monthly-data.js
node scripts/verify-chart-rendering.js
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Database Setup (NEW SCHEMA)

**Initial Setup:**
1. Run migrations in `supabase/migrations/` folder in order
2. Latest migration: `20251024_010_phase5_weekly_planner.sql` (Phase 5 complete)

**Key Migrations:**
- `001-011`: Initial NEW SCHEMA setup (Phase 0-3)
- `012`: Enable RLS policies
- `013`: Create indexes for performance
- `014`: Rename OLD SCHEMA to habit_tracker_old
- `20251024_001-010`: Phase 5 Learning Mode (10 migrations)

**Phase 4 Setup (Completed):**
1. **Database Views**: ✅ Created with Security Invoker mode
   - `v_weekly_completion` - Weekly aggregated completion rates
   - `v_daily_completion` - Daily completion tracking
   - `v_habit_failure_patterns` - Pattern analysis for insights
2. **Performance Indexes**: ✅ 4 indexes created for optimized querying
3. **Edge Function**: ✅ `dashboard-aggregation` deployed (currently bypassed)
4. **Dashboard Hooks**: ✅ All using direct DB queries for stability
5. **Detailed Docs**: See `EDGE_FUNCTION_500_FIX.md` for current architecture

## Key Design Patterns

### Weekly Data Structure (NEW SCHEMA)

**Normalized Structure:**
```
children (id, user_id, name, theme)
  ↓ has many
weeks (id, child_id, week_start_date, reflection, reward)
  ↓ has many
habits (id, week_id, name, display_order)
  ↓ has many
habit_records (id, habit_id, record_date, status)
```

**Monday Constraint:**
- All `week_start_date` MUST be Monday
- Frontend auto-adjusts to nearest Monday
- Edge Function enforces Monday constraint

**Date Handling:**
- `weekStartDate` (input) → auto-adjusts to Monday → stored as `week_start_date`
- `week_period` calculated for display: "2025년 7월 21일 ~ 2025년 7월 27일"
- UseEffect watches `weekStartDate` changes to auto-load week data

### Edge Function Pattern

**Idempotency:**
- Every request has unique `X-Idempotency-Key` header
- Logged in `idempotency_log` table
- Prevents duplicate operations

**Error Handling:**
- All operations wrapped in try/catch
- Detailed error logging
- HTTP status codes: 200 (success), 400 (bad request), 500 (server error)

### Overwrite Confirmation
- When saving to existing week, shows confirmation modal
- Uses `pendingSaveData` state and `showOverwriteConfirm` flag
- Dashboard mode bypasses confirmations for cleaner UX

## Important Implementation Notes

### ⚠️ Common Pitfalls & Best Practices

#### 1. UUID vs Name Confusion (CRITICAL)
**Problem:** Passing child/week **name** instead of **UUID** to components/API
**Symptoms:** Error: `invalid input syntax for type uuid: "아빠"`

**Rule:** All foreign key references MUST use UUIDs, not names
- ✅ CORRECT: `childId={currentChildId}` (UUID from database)
- ❌ WRONG: `childId={selectedChild}` (name string like "아빠")
- ✅ CORRECT: `weekId={currentWeekId}` (UUID from database)
- ❌ WRONG: `weekId={weekStartDate}` (date string)

**Solution Pattern:**
```javascript
// App.jsx state management
const [selectedChild, setSelectedChild] = useState('') // Child NAME for display
const [currentChildId, setCurrentChildId] = useState(null) // Child UUID for DB operations
const [currentWeekId, setCurrentWeekId] = useState(null) // Week UUID for DB operations

// Load data and store UUIDs
const data = await loadChildData(childName, weekStartDate)
if (data) {
  setCurrentChildId(data.child_id) // Store UUID
  setCurrentWeekId(data.id) // Store UUID
}

// Pass UUIDs to components
<WeeklyPlannerManager
  childId={currentChildId}  // UUID ✅
  weekId={currentWeekId}    // UUID ✅
  childName={childName}     // Name for display only
/>
```

**Database Layer Pattern:**
```javascript
// database-new.js - ALWAYS return UUIDs
export const loadWeekDataNew = async (childName, weekStartDate) => {
  // ... fetch data
  return {
    id: week.id,           // Week UUID ✅
    child_id: child.id,    // Child UUID ✅
    child_name: childName, // Name for display
    // ... other fields
  }
}
```

**Checklist Before Creating New Components:**
- [ ] Does component accept `childId` prop? → Must be UUID, not name
- [ ] Does component accept `weekId` prop? → Must be UUID, not date
- [ ] Does component query database by child? → Use UUID in WHERE clause
- [ ] Does component create/update records? → Use UUIDs for foreign keys
- [ ] Does state need to store child/week reference? → Store both name (display) and UUID (operations)

#### 2. Data Migration Requirements
When adding new features that reference existing tables:
- Check if parent component has UUID in state
- If not, add UUID state variable
- Update data loading function to return UUID
- Store UUID when data loads
- Pass UUID (not name) to new components

### Environment Variables
- **CRITICAL**: Environment variables MUST be set in deployment platform (Netlify dashboard)
- `netlify.toml` should NOT contain environment variable values (only in dashboard)
- App validates `VITE_SUPABASE_URL` format at startup and shows error screen if invalid

### Data Loading Behavior
- When changing `weekStartDate`, app automatically loads that week's data
- Shows confirmation if current unsaved data exists (only in tracker mode, not dashboard)
- If no data exists for week, resets to default habits (preserves date)
- All reads go through `database-new.js`

### Write Operations
- ALL writes go through Edge Function via `dual-write.js`
- No direct database writes from frontend
- Idempotency ensures safe retries
- Mode: `new_only` (NEW SCHEMA only)

### Authentication Flow
- All database operations check user authentication first
- On auth failure, returns to login screen
- Session managed by Supabase Auth with automatic token refresh
- Logout clears user state and resets all data

### Responsive Design
- Mobile: Card-based layout (stacked vertically)
- Desktop: Table layout with traffic light buttons
- Breakpoint: `md` (768px) - use Tailwind's `hidden md:block` pattern

### RLS Policies
- **Status**: ✅ **ENABLED** (Phase 3 Security Update - 2025-10-18)
- **User Isolation**: All tables enforce `user_id` filtering at database level
- **Policies**: SELECT, INSERT, UPDATE, DELETE for authenticated users only
- **Security**: Each user can only access their own data (enforced by Supabase RLS)
- **idempotency_log**: User-scoped operations logging with RLS protection

**Verification:**
```bash
# Check RLS status for all core tables
node scripts/verify-rls-status.js

# Or manually in Supabase SQL Editor:
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('children', 'weeks', 'habits', 'habit_records', 'idempotency_log')
AND schemaname = 'public';
# Expected: All should show rowsecurity = true
```

## Common Development Patterns

### Adding New Habit Fields
1. Update database schema (create migration)
2. Update Edge Function to handle new field
3. Update `database-new.js` read functions
4. Modify habit rendering in components
5. Test with idempotency

### Working with Supabase
- Always use helper functions in `src/lib/database-new.js`, `src/lib/dual-write.js`, and `src/lib/auth.js`
- Never directly import supabase client in components
- All operations are async - use try/catch blocks
- Error messages go to console, user-facing errors use alerts

### Working with Edge Functions
- **dual-write-habit**: Handles all write operations (create/update/delete weeks and habits)
  - Deploy: `supabase functions deploy dual-write-habit`
  - Test: Check `idempotency_log` table for operation logs
  - Debug: Check Edge Function logs in Supabase dashboard
  - Current version: new_only mode (640 lines)
- **dashboard-aggregation**: Handles dashboard data aggregation (Phase 4)
  - Deploy: `supabase functions deploy dashboard-aggregation`
  - Operations: `comparison`, `trends`, `insights`, `monthly`
  - Uses database views for optimized queries
  - CORS enabled for cross-origin requests

### Styling Approach
- Tailwind CSS with custom CSS variables for theming
- Color system defined in `tailwind.config.js` using HSL variables
- Custom styles in `App.css` for print styles and responsive tweaks
- Traffic light buttons use dynamic classes: `getColorClass(color)`

### Path Aliases
- `@/` resolves to `./src/` (configured in vite.config.js)
- Use for imports: `import { Button } from '@/components/ui/button.jsx'`

### Trend Chart Implementation (Recharts)

**Important Guidelines for Maintaining Data Visibility**

#### Chart Type Selection
- **MUST use ComposedChart** for trend data with potential gaps
- Combines Line + Area components for optimal visualization
- ❌ **DO NOT use AreaChart or LineChart alone** - isolated data points will not display

#### Data Point Visibility (Critical)
All data points must render explicitly with custom dot renderer:

```jsx
<Line
  dataKey="rate"
  dot={(props) => {
    const { cx, cy, value } = props;
    if (value === null || value === undefined) return null;

    return (
      <g>
        {/* Outer white circle for visibility against any background */}
        <circle cx={cx} cy={cy} r={7} fill="#ffffff" stroke="#3B82F6" strokeWidth={2} />
        {/* Inner colored circle - actual data point */}
        <circle cx={cx} cy={cy} r={4} fill="#3B82F6" />
        {/* Special indicator for 100% achievements */}
        {value === 100 && <text x={cx} y={cy - 12}>💯</text>}
      </g>
    );
  }}
  connectNulls={false} // CRITICAL: Keep false to show gaps
/>
```

**Why this matters:**
- With `connectNulls={false}`, lines don't connect across empty weeks
- Without custom dot renderer, isolated points (like Week 33) become invisible
- White outer circle ensures visibility on any background

#### X-Axis Optimization
```jsx
<XAxis
  dataKey="week"
  angle={-45}              // Rotate labels for readability
  textAnchor="end"
  interval={Math.floor(chartData.length / 10)}  // Show ~10 labels max
/>
```

#### Reference Lines
```jsx
<ReferenceLine
  y={80}
  stroke="#10B981"
  strokeDasharray="5 5"
  label={{ value: "목표 80%", position: "right" }}
/>
```

#### Complete Example
```jsx
<ComposedChart data={chartData}>
  {/* Gradient definition */}
  <defs>
    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
    </linearGradient>
  </defs>

  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="week" angle={-45} textAnchor="end" />
  <YAxis domain={[0, 100]} />
  <ReferenceLine y={80} stroke="#10B981" strokeDasharray="5 5" />
  <Tooltip />

  {/* Area for visual effect */}
  <Area
    dataKey="rate"
    fill="url(#colorRate)"
    stroke="none"
    connectNulls={false}
  />

  {/* Line with custom dots - ESSENTIAL */}
  <Line
    dataKey="rate"
    stroke="#3B82F6"
    strokeWidth={2}
    connectNulls={false}
    dot={/* custom dot renderer as shown above */}
  />
</ComposedChart>
```

#### Common Pitfalls to Avoid
- ❌ Using only AreaChart - isolated points won't show
- ❌ Setting `connectNulls={true}` - hides intentional gaps
- ❌ Omitting custom dot renderer - isolated points invisible
- ❌ Not filtering null values in dot renderer - renders empty circles

#### Related Files
- `src/components/Dashboard/TrendDashboard/TrendChart.jsx` - Main implementation
- `src/hooks/useDashboardData.ts` - Data generation with continuous weeks
- `src/lib/weekNumber.js` - ISO week number calculation

**Last Updated**: 2025-10-26 (Phase 5 Learning Mode - Mobile UI Optimized)

### Dashboard Data Fetching Pattern (Phase 4)

**Current Data Fetching (Stable - Direct DB Queries):**
> **Note**: Edge Function temporarily bypassed for stability. All dashboards use direct database queries with React Query v5 for caching and performance.
```typescript
// src/hooks/useDashboardData.ts
export function useComparisonData(userId: string, period: string) {
  return useQuery({
    queryKey: ['comparison', userId, period],
    queryFn: async () => {
      // TEMPORARY FIX: All environments use direct DB queries
      // Bypassing Edge Function due to 500 errors
      // TODO: Restore Edge Function after debugging
      console.log('[Comparison] Attempting to fetch real data (direct DB query)');
      const realData = await generateRealComparisonData(userId, period, customWeekStart);

      if (realData && realData.children && realData.children.length > 0) {
        console.log('[Comparison] ✅ Using real comparison data');
        return realData;
      }

      return null;

      // ORIGINAL CODE (Edge Function - currently disabled):
      // const response = await fetch(DASHBOARD_API_URL, {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     operation: 'comparison',
      //     data: { userId }
      //   })
      // });
      // return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minute cache
  });
}
```

**4 Dashboard Operations (All using Direct DB Queries):**
1. **Comparison**: Compare all children's current week performance
   - Hook: `useComparisonData(userId, period, customWeekStart?)`
   - Returns: Children ranked by completion rate with trend indicators
   - Status: ✅ Real data from NEW SCHEMA
2. **Trends**: Weekly trend analysis for a specific child
   - Hook: `useTrendData(childId, weeks)`
   - Returns: Continuous weekly data (includes empty weeks for chart continuity)
   - Status: ✅ Real data with continuous week generation
3. **Insights**: Self-awareness analysis (strengths, weaknesses, patterns)
   - Hook: `useInsights(childId, weeks)`
   - Returns: Habit-level statistics, day-of-week patterns, feedback
   - Status: ⚠️ Mock data (TODO: Implement real insights from habit_records)
4. **Monthly**: Monthly statistics and calendar view
   - Hook: `useMonthlyStats(childId, year, month)`
   - Returns: Daily/weekly summary, best/worst weeks, month-over-month comparison
   - Status: ✅ Real data from NEW SCHEMA

**React Query Configuration:**
- v5 syntax (`gcTime` instead of `cacheTime`)
- Automatic refetching on window focus
- Cache invalidation hooks available via `useInvalidateDashboardQueries()`
- Error boundaries handle loading/error states in components

## Deployment

### Netlify Deployment
1. Build command: `npm run build`
2. Publish directory: `dist`
3. Node version: 18 (set in netlify.toml)
4. Environment variables: Set in Netlify dashboard (NOT in netlify.toml)
5. Supabase authentication settings must include Netlify URL in redirect URLs

### Edge Function Deployment
**dual-write-habit (Write Operations):**
1. Use Supabase CLI: `supabase functions deploy dual-write-habit`
2. Or deploy via Supabase dashboard
3. Verify deployment in Edge Function logs
4. Test with `scripts/check-edge-function-request.js`

**dashboard-aggregation (Read/Analytics - Phase 4):**
1. Deploy: `supabase functions deploy dashboard-aggregation`
2. **Prerequisites**: Database views must be created first (see `VIEWS_CREATION_MANUAL.md`)
3. Test: Check browser console for Edge Function calls in production
4. Monitor: Supabase Functions dashboard for performance metrics

### GitHub Pages Deployment
- Requires GitHub Actions workflow (see README.md)
- Base path configured in vite.config.js based on `GITHUB_PAGES` env var
- Secrets must be set in GitHub repository settings

## Tech Stack

- **Frontend**: React 18 + Vite 4
- **Styling**: Tailwind CSS 3.3 with custom design system
- **Icons**: Lucide React
- **Charts**: Recharts 3.1
- **Database**: Supabase (PostgreSQL + Auth + Edge Functions)
- **State**: React Hooks (useState, useEffect), React Query for statistics
- **Data Export**: XLSX library for Excel exports (from Dashboard)
- **Notifications**: Discord webhook integration
- **Edge Runtime**: Deno (Supabase Edge Functions)

## File Structure

```
src/
├── lib/
│   ├── supabase.js       # Supabase client initialization
│   ├── auth.js           # Authentication helpers
│   ├── database-new.js   # NEW SCHEMA read operations ⭐
│   ├── dual-write.js     # Edge Function write wrapper ⭐
│   ├── discord.js        # Discord webhook notifications
│   ├── security.js       # Security utilities
│   └── utils.js          # General utilities (clsx, tailwind-merge)
├── components/
│   ├── ui/               # Reusable UI components (shadcn-style)
│   ├── charts/           # Chart components (Recharts)
│   ├── badges/           # Achievement badge system
│   ├── Auth.jsx          # Login/signup component
│   ├── ChildSelector.jsx # Child selection UI
│   ├── Dashboard.jsx     # Data visualization
│   └── MonthlyStats.jsx  # Monthly statistics
├── hooks/
│   └── useStatistics.js  # React Query hooks for stats
├── main.jsx              # React entry point
└── App.jsx               # Main application component (800+ lines)

supabase/
├── functions/
│   ├── dual-write-habit/ # Edge Function (new_only mode) - Write operations ⭐
│   ├── dashboard-aggregation/ # Edge Function - Dashboard analytics (Phase 4) ⭐
│   └── send-discord-notification/ # Discord notification Edge Function
└── migrations/
    └── 001-014_*.sql     # Database migrations (Phase 3 complete)

scripts/                  # Analysis and verification scripts
├── analyze-drift-details.js
├── check-latest-save.js
├── verify-new-schema-only.js
└── verify-table-rename.js

docs/                     # Comprehensive documentation
├── 00-overview/          # Project overview and plans
├── 01-architecture/      # Architecture docs
├── 02-active/            # Active phase documentation
├── 03-deployment/        # Deployment guides
├── 04-completed/         # Completed phase docs
├── 05-reviews/           # Weekly reviews
└── 06-future/            # Future roadmap

backups/                  # Database backups
└── habit_tracker_backup_*.json
```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

- **Quick Start**: See `docs/INDEX.md` for navigation
- **Current Status**: See `docs/00-overview/PROJECT_STATUS.md`
- **Architecture**: See `docs/01-architecture/CURRENT_ARCHITECTURE.md`
- **Migration History**: See `docs/02-active/PHASE_3_FINAL_COMPLETE.md`
- **Deployment**: See `docs/03-deployment/` folder

## Known Issues & Considerations

### Recent Fixes (2025-10-19)

#### ✅ Fixed: Supabase `.single()` 406 Error
- **Issue**: All Supabase queries using `.single()` returned `406 (Not Acceptable)` errors
- **Root Cause**: `.single()` requires `Accept: application/vnd.pgrst.object+json` header, which may not be allowed in some Supabase project configurations
- **Solution**: Replaced all `.single()` with `.maybeSingle()` across the codebase (16 instances)
- **Files Modified**: `useDashboardData.ts`, `ChildSelector.jsx`, `database-new.js`, `templates.js`, `statistics.js`
- **Impact**: All database queries now work correctly without 406 errors
- **Docs**: See `BUGFIX_2025-10-19.md`

#### ✅ Fixed: React Key Prop Warning in TrendChart
- **Issue**: Recharts Line component's custom dot renderer caused "unique key prop" warning
- **Solution**: Added `key={`dot-${payload.date || index}`}` to `<g>` element in dot renderer
- **File Modified**: `src/components/Dashboard/TrendDashboard/TrendChart.jsx:146`
- **Impact**: Console warnings eliminated, chart renders cleanly

#### ✅ Fixed: PostgreSQL ROUND() Type Error
- **Issue**: Views creation failed with `function round(double precision, integer) does not exist`
- **Root Cause**: PostgreSQL ROUND() only accepts `numeric` type, not `float`
- **Solution**: Changed all `::float` to `::numeric` in view definitions
- **Files Modified**: `supabase-views-dashboard.sql`, `SECURITY_INVOKER_VIEWS.sql`
- **Impact**: All 3 views created successfully
- **Docs**: See `FIXED_VIEWS_SQL.md`

#### ✅ Fixed: Security Definer View Warnings
- **Issue**: Supabase Security Advisor flagged 4 views as security risks
- **Root Cause**: Views created with default Security Definer mode bypass RLS
- **Solution**: Recreated all views with `WITH (security_invoker = true)` option
- **File**: `SECURITY_INVOKER_VIEWS.sql`
- **Impact**: RLS now enforced on all views, security warnings resolved

#### ⚠️ Temporary: Edge Function 500 Error Bypass
- **Issue**: `dashboard-aggregation` Edge Function returns 500 errors in production
- **Root Cause**: Unknown (likely database views or permissions issue)
- **Temporary Solution**: All dashboard hooks now use direct DB queries instead of Edge Function
- **Files Modified**: `src/hooks/useDashboardData.ts` (all 4 hooks)
- **Impact**: All dashboards work correctly, but not using optimized Edge Function
- **TODO**: Debug Edge Function, restore original architecture
- **Docs**: See `EDGE_FUNCTION_500_FIX.md`

### Phase 4 Status (100% Complete)
- ✅ **Database Views**: Created with Security Invoker mode
  - `v_weekly_completion` (16 rows)
  - `v_daily_completion` (57 rows)
  - `v_habit_failure_patterns` (186 rows)
- ✅ **Production Deployment**: All dashboards operational
- ✅ **Bug Fixes**: All critical bugs resolved
- ⚠️ **Edge Function**: Temporarily bypassed, using direct DB queries
- 📚 **Documentation**: Complete with troubleshooting guides

### Monitoring Period (Completed 2025-10-25)
- ✅ OLD SCHEMA (`habit_tracker_old`) monitoring period completed
- ✅ No unexpected changes detected via `v_old_schema_status` view
- 💡 Safe to drop `habit_tracker_old` table if desired (backup exists in `backups/` folder)

### Future Enhancements
- Real-time updates with Supabase Realtime
- Habit templates system
- Advanced statistics and analytics
- Multi-language support (i18n)
- Mobile app (React Native)

### Performance Notes
- Bundle size: 759.18 KB (consider code splitting)
- Database queries optimized with indexes
- Edge Function response time: ~200-500ms

## Support & Resources

- **Documentation**: See `docs/` folder
- **Issues**: Check GitHub Issues
- **Migration Plan**: `docs/00-overview/DB_MIGRATION_PLAN_V2.md`
- **Tech Spec**: `docs/00-overview/TECH_SPEC.md`

---

## 🚨 Critical Rules for Claude Code Agents

### Rule #1: UUID vs Name - ALWAYS Check Data Types
**Before writing ANY component that queries the database:**
1. Identify all foreign key references (child_id, week_id, goal_id, etc.)
2. Verify parent component passes UUIDs, not names
3. If UUID state missing → Add it before proceeding
4. Update database read functions to return UUIDs
5. Test with console.log to confirm UUID format

**Auto-Check Pattern:**
```javascript
// When you see this in a new component prop:
childId={selectedChild}  // 🚨 RED FLAG - is selectedChild a UUID or name?

// Always verify in parent component:
console.log('childId type check:', typeof childId, childId)
// Expected: "string" + UUID format "123e4567-e89b-12d3-a456-426614174000"
// Wrong: "string" + name format "아빠"
```

### Rule #2: Database Migration Verification
**After creating migration files:**
1. NEVER assume migration auto-applies
2. Check Supabase Dashboard → SQL Editor
3. Run verification query to confirm tables exist
4. If missing → Manually execute migration SQL
5. Verify views created (check `table_type = 'VIEW'`)

### Rule #3: Component Integration Checklist
**Before declaring "integration complete":**
- [ ] State variables added for all required UUIDs
- [ ] Database functions return all necessary UUIDs
- [ ] Data loading updates all UUID states
- [ ] Component receives correct prop types (UUID not name)
- [ ] Browser console shows no type errors
- [ ] Test with actual user data (not just code review)

---

## 📋 Project Status Summary

**Last Updated**: 2025-10-26 23:45 KST
**Current Phase**: 🎉 **Phase 5.2 Complete (95%)** 🚀
**Latest Commit**: `e3b4131` - Integrate Weekly Planner into App.jsx

### Database Architecture
- **Schema Version**: NEW SCHEMA (v2) + Learning Mode Tables (11 migrations)
- **Total Migrations**: 37 SQL files (core + Phase 5.1 + Phase 5.2)
- **RLS Status**: ✅ Enabled on all tables
- **OLD SCHEMA**: Monitoring completed (2025-10-25), safe to drop

### Edge Functions Status
- **dual-write-habit**: ✅ Operational (new_only mode)
- **dashboard-aggregation**: ⚠️ Deployed but bypassed (stability)
- **send-discord-notification**: ✅ Operational

### Current Architecture Pattern
- **Read Operations**: Direct DB queries via `database-new.js`
- **Write Operations**: Edge Function via `dual-write.js`
- **Dashboard Queries**: Direct DB with React Query v5 (5min cache)
- **State Management**: React Hooks in `App.jsx` (no external store)

### Learning Mode Status (Phase 5)
**Phase 5.1 (Completed ✅):**
- ✅ Goals CRUD with hierarchical structure (6 API functions)
- ✅ Mandala Charts 9칸/27칸 (8 API functions)
- ✅ Weaknesses tracking with retry system (5 API functions)
- ✅ Reward system integration (5 API functions)
- ✅ Goal-Mandala bidirectional sync (5 API functions)
- ✅ Mobile UI optimization (40px touch targets, lg breakpoint)

**Phase 5.2 (Completed ✅):**
- ✅ Weekly Planner database schema (3 tables, 2 views)
- ✅ Weekly Planner API layer (22 functions, 857 lines)
- ✅ Weekly Planner components (3 components, 966 lines)
- ✅ App.jsx integration (currentWeekId state, button, rendering)

### Next Priority Actions
1. **Phase 5.3**: Expand Mandala to 81칸 (3-level hierarchy: 9→27→81)
2. **Phase 5.3**: Add advanced reward triggers (streak_21, first_weakness_resolved)
3. **Optional**: Weekly Planner template manager UI
4. **Optional**: Debug and restore `dashboard-aggregation` Edge Function
5. **Optional**: Drop `habit_tracker_old` table (backup verified)
