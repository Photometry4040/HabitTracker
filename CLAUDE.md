# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Setup:** `npm install` → copy `.env.example` to `.env` (add Supabase credentials) → `npm run dev`

**Key Points:**
- All reads: `src/lib/database-new.js` (direct DB queries)
- All writes: `src/lib/dual-write.js` (via Edge Function)
- Main state: `App.jsx` (no external state management)
- RLS enabled on all tables (user isolation at DB level)
- Monday-only week start dates (enforced by CHECK constraint)

**Current Status:** Phase 5.5 Complete - All features operational (Goals, Mandala 9/27/81, Weaknesses, Weekly Planner, Templates)

## Project Overview

**Habit Tracker for Kids** - React + Vite web app for parents and children to track daily habits using color-coded system (green/yellow/red) with Supabase backend.

**Key Features:** Auth, multi-child tracking, weekly periods, color-coded evaluation, dashboards (Comparison/Trends/Insights/Monthly), PWA, Discord notifications, badges, Learning Mode (Goals, Mandala Charts, Weaknesses, Rewards, Weekly Planner)

## Database Schema

**Core Tables:**
- `children` (user_id, name, theme)
- `weeks` (child_id, week_start_date, reflection, reward)
- `habits` (week_id, name, display_order)
- `habit_records` (habit_id, record_date, status)
- `habit_templates` (user_id, child_id, name, description, habits, is_default)

**Learning Mode Tables:**
- `goals` - Hierarchical goals (parent_goal_id, depth, ICE scoring)
- `mandala_charts` - Metadata (9/27/81 support, max_level)
- `mandala_nodes` - Normalized 3-level hierarchy (81 support)
- `weaknesses` - Weakness tracking with retry/badges
- `reward_definitions`, `progress_events`, `rewards_ledger` - Reward system
- `weekly_plans`, `daily_plan_items`, `weekly_plan_templates` - Weekly planner

**Key Constraints:**
- Week start date MUST be Monday (CHECK constraint)
- Foreign keys ensure referential integrity
- RLS enabled on all tables (user isolation at DB level)

## Data Flow Architecture

```
Frontend (React)
    ↓
Read: database-new.js → Supabase (direct queries)
    ↓
Write: dual-write.js → Edge Function → Supabase
    ↓
Idempotency: idempotency_log table
```

**Critical Files:**
1. `src/lib/auth.js` - Supabase Auth (login, signup, logout, session)
2. `src/lib/database-new.js` - Read: `loadWeekDataNew()`, `loadAllChildrenNew()`, `loadChildWeeksNew()`, `loadChildMultipleWeeksNew()`
3. `src/lib/dual-write.js` - Write: `createWeekDualWrite()`, `updateHabitRecordDualWrite()`, `deleteWeekDualWrite()`
4. `src/lib/templates.js` - Template CRUD: create, get, update, delete, getDefault, setDefault
5. `supabase/functions/dual-write-habit/index.ts` - Edge Function (new_only mode, idempotency)
6. `App.jsx` - Main state: `habits`, `reflection`, `reward`, `selectedChild`, `weekPeriod`
   - **4-View System**: showDashboard / showTemplateManager / showLearningMode / default (Habit Tracker)
   - **Manual save model** (no auto-save)

**Component Architecture:**
- `Dashboard/` - 4 views: Comparison, Trend, SelfAwareness, Monthly
- `hooks/useDashboardData.ts` - React Query hooks (direct DB, Edge Function bypassed)
- **Template System**: `TemplateManager.jsx`, `TemplatePreview.jsx`, `hooks/useTemplate.js`
- **Learning Mode**: `Goals/GoalsManager.jsx`, `Mandala/MandalaChart.jsx`, `Weaknesses/WeaknessLogger.jsx`
- **Weekly Planner**: `WeeklyPlannerManager.jsx`, `DailyTaskCalendar.jsx`, `WeeklyPlanEditor.jsx`, `WeeklyPlanTemplateManager.jsx`
- `lib/learning-mode.js` (29 functions), `lib/weekly-planner.js` (22 functions), `lib/mandala-expansion.js` (9 functions)

## Migration History (All Complete)

- **Phase 0-2**: Schema design, Edge Function, frontend migration (completed)
- **Phase 3**: OLD SCHEMA removed, Edge Function simplified to `new_only` (2025-10-18)
- **Phase 4**: Dashboard aggregation, React Query v5, 4 dashboard types (2025-10-19)
- **Phase 5.1**: Goals, Mandala 9/27, Weaknesses, Rewards (completed)
- **Phase 5.2**: Weekly Planner (3 tables, 22 API functions, 3 components) (2025-10-26)
- **Phase 5.3**: Advanced reward triggers (streak_21, habit_mastery, etc.) (2025-10-29)
- **Phase 5.4**: 81-cell Mandala expansion (mandala_nodes table, 3-level hierarchy) (2025-10-29)
- **Phase 5.5**: Weekly Planner Template Manager (2025-10-30)
- **Cleanup**: OLD SCHEMA dropped, backup preserved in `backups/` (2025-10-30)

See `docs/` folder for detailed migration documentation.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (localhost:5173)
npm run build        # Production build
npm run lint         # Lint code
```

**Environment:** `.env` requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Database:** Run migrations in `supabase/migrations/` in order. Key ranges: 001-014 (core), 20251024_001-010 (Phase 5).

**Edge Function Deploy:** `supabase functions deploy dual-write-habit`

## Key Design Patterns

### Weekly Data Structure
```
children → weeks (Monday constraint) → habits → habit_records
```
- `weekStartDate` auto-adjusts to Monday → stored as `week_start_date`
- UseEffect watches `weekStartDate` changes to auto-load week data

### Edge Function Pattern
- Idempotency via `X-Idempotency-Key` header + `idempotency_log` table
- All operations wrapped in try/catch with HTTP status codes

### Overwrite Confirmation
- Saving to existing week shows confirmation modal (`pendingSaveData` + `showOverwriteConfirm`)
- Dashboard mode bypasses confirmations

## Important Implementation Notes

### UUID vs Name Confusion (CRITICAL)

**Problem:** Passing child/week **name** instead of **UUID** to components/API
**Symptom:** `invalid input syntax for type uuid: "아빠"`

**Rule:** All foreign key references MUST use UUIDs, not names
- `childId={currentChildId}` (UUID) / `weekId={currentWeekId}` (UUID)
- `selectedChild` is for **display only** (name string)

**Pattern in App.jsx:**
```javascript
const [selectedChild, setSelectedChild] = useState('') // Name for display
const [currentChildId, setCurrentChildId] = useState(null) // UUID for DB
const [currentWeekId, setCurrentWeekId] = useState(null) // UUID for DB

const data = await loadChildData(childName, weekStartDate)
if (data) {
  setCurrentChildId(data.child_id) // Store UUID
  setCurrentWeekId(data.id) // Store UUID
}
```

**Checklist for new components:**
- [ ] `childId`/`weekId` props must be UUIDs, not names/dates
- [ ] Database queries use UUIDs in WHERE clause
- [ ] Parent component has UUID state variables
- [ ] `database-new.js` returns UUIDs in response

**Migration verification:** Never assume migrations auto-apply. Check Supabase Dashboard SQL Editor to confirm.

### Environment Variables
- MUST be set in Netlify dashboard (NOT in `netlify.toml`)
- App validates `VITE_SUPABASE_URL` format at startup

### Data Loading & Write Operations
- Changing `weekStartDate` auto-loads data; confirmation if unsaved data exists
- ALL writes go through Edge Function via `dual-write.js` (no direct DB writes)
- Idempotency ensures safe retries

### Authentication
- All DB operations check auth first; failure returns to login screen
- Session managed by Supabase Auth with auto token refresh

### Responsive Design
- Mobile: Card-based (stacked) / Desktop: Table layout
- Breakpoint: `md` (768px) - use Tailwind's `hidden md:block`

### Trend Chart (Recharts)
- MUST use `ComposedChart` (not AreaChart/LineChart alone) for data with gaps
- MUST use custom dot renderer for isolated data points visibility
- `connectNulls={false}` to show intentional gaps
- See `src/components/Dashboard/TrendDashboard/TrendChart.jsx` for implementation

### Dashboard Data Fetching
- All 4 dashboards use direct DB queries with React Query v5 (Edge Function bypassed for stability)
- Hooks: `useComparisonData`, `useTrendData`, `useInsights`, `useMonthlyStats`
- React Query v5: `gcTime`, auto-refetch on focus, `useInvalidateDashboardQueries()`
- See `src/hooks/useDashboardData.ts`

### Working with Supabase
- Always use helpers in `database-new.js`, `dual-write.js`, `auth.js` (never import supabase client directly)
- Use `.maybeSingle()` instead of `.single()` (avoids 406 errors)
- All async with try/catch; errors to console, user-facing via alerts

### Styling
- Tailwind CSS with HSL CSS variables (`tailwind.config.js`)
- Path alias: `@/` → `./src/` (vite.config.js)
- Traffic light buttons: `getColorClass(color)`

## Deployment

### Netlify
Build: `npm run build` → Publish: `dist` → Node 18 → Env vars in dashboard only

### Edge Functions
- `dual-write-habit`: Operational (write operations)
- `dashboard-aggregation`: Deployed but bypassed (500 errors, using direct DB queries)
- `send-discord-notification`: Operational

## Tech Stack

React 18 + Vite 4 | Tailwind CSS 3.3 | Lucide React | Recharts 3.1 | Supabase (PostgreSQL + Auth + Edge Functions) | React Query v5 | XLSX | Discord webhook | Deno (Edge Runtime)

## Known Issues

### Edge Function 500 Error (Active)
- `dashboard-aggregation` returns 500 in production (likely views/permissions issue)
- All dashboards use direct DB queries as workaround
- See `EDGE_FUNCTION_500_FIX.md`

### Future Enhancements
- Debug and restore `dashboard-aggregation` Edge Function
- Real-time updates with Supabase Realtime
- Multi-language support (i18n)

## Documentation

See `docs/` folder: `INDEX.md` (navigation), `00-overview/` (status/plans), `01-architecture/` (current), `03-deployment/` (guides)
