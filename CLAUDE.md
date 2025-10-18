# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**Project Status:** 🎉 **Phase 3 Complete** - Database migration to NEW SCHEMA finished!

## Current Architecture (Phase 3 Complete - 2025-10-18)

### Database Schema (NEW SCHEMA)

**Active Tables:**
- `children` - Child profiles (user_id, name, theme)
- `weeks` - Weekly tracking periods (child_id, week_start_date, reflection, reward)
- `habits` - Individual habits (week_id, name, display_order)
- `habit_records` - Daily habit status (habit_id, record_date, status)

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

4. **Edge Function** (`supabase/functions/dual-write-habit/index.ts`):
   - Handles ALL write operations
   - Mode: `new_only` (writes to NEW SCHEMA only)
   - Idempotency via `idempotency_log` table
   - Operations: create_week, update_habit_record, delete_week

5. **State Management** (`App.jsx`):
   - Main app state lives in `App.jsx` (no external state management)
   - Key state: `habits`, `reflection`, `reward`, `selectedChild`, `weekPeriod`
   - **Manual save model**: User must click save button (no auto-save)

6. **Component Architecture**:
   - `App.jsx` - Main component, handles all state and data operations
   - `Auth.jsx` - Login/signup UI
   - `ChildSelector.jsx` - Child selection interface (uses Edge Function for delete)
   - `Dashboard.jsx` - Data visualization with Recharts

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
# Analyze drift between schemas
node scripts/analyze-drift-details.js

# Check latest save operation
node scripts/check-latest-save.js

# Verify NEW SCHEMA only mode
node scripts/verify-new-schema-only.js

# Verify table rename
node scripts/verify-table-rename.js
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
2. Latest migration: `014_rename_old_schema.sql` (Phase 3 complete)

**Key Migrations:**
- `001-011`: Initial NEW SCHEMA setup
- `012`: Enable RLS policies
- `013`: Create indexes for performance
- `014`: Rename OLD SCHEMA to habit_tracker_old

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
- Deploy: Use Supabase CLI or dashboard
- Test: Check `idempotency_log` table for operation logs
- Debug: Check Edge Function logs in Supabase dashboard
- Current version: new_only mode (640 lines)

### Styling Approach
- Tailwind CSS with custom CSS variables for theming
- Color system defined in `tailwind.config.js` using HSL variables
- Custom styles in `App.css` for print styles and responsive tweaks
- Traffic light buttons use dynamic classes: `getColorClass(color)`

### Path Aliases
- `@/` resolves to `./src/` (configured in vite.config.js)
- Use for imports: `import { Button } from '@/components/ui/button.jsx'`

## Deployment

### Netlify Deployment
1. Build command: `npm run build`
2. Publish directory: `dist`
3. Node version: 18 (set in netlify.toml)
4. Environment variables: Set in Netlify dashboard (NOT in netlify.toml)
5. Supabase authentication settings must include Netlify URL in redirect URLs

### Edge Function Deployment
1. Use Supabase CLI: `supabase functions deploy dual-write-habit`
2. Or deploy via Supabase dashboard
3. Verify deployment in Edge Function logs
4. Test with `scripts/check-edge-function-request.js`

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
│   ├── dual-write-habit/ # Edge Function (new_only mode) ⭐
│   └── send-discord-notification/ # Discord notification Edge Function
└── migrations/
    └── 001-014_*.sql     # Database migrations

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

### Monitoring Period (Until 2025-10-25)
- OLD SCHEMA (`habit_tracker_old`) is being monitored for 1 week
- Verify no unexpected changes via `v_old_schema_status` view
- After 1 week, can safely drop `habit_tracker_old` if desired

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

**Last Updated**: 2025-10-18
**Phase**: Phase 3 Complete ✅
**Schema Version**: NEW SCHEMA (v2)
**Edge Function Mode**: new_only
