# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Habit Tracker for Kids** - a visual habit tracking web application built with React + Vite. The app allows parents and children to collaboratively track daily habits using a color-coded system (green/yellow/red) and store data in Supabase with user authentication.

**Key Features:**
- User authentication with Supabase Auth
- Multi-child habit tracking with weekly periods
- Color-coded habit evaluation system
- Data visualization dashboard with Recharts
- Cloud storage with Supabase PostgreSQL
- PWA support with app icons for all platforms

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

### Environment Setup
1. Copy `.env.example` to `.env`
2. Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Database Setup
Run these SQL files in Supabase SQL Editor in order:
1. `supabase-schema.sql` - Creates base tables
2. `supabase-security-policy.sql` - Sets up RLS policies

## Architecture

### Core Data Flow
1. **Authentication Layer** (`src/lib/auth.js`):
   - Handles Supabase Auth (login, signup, logout)
   - Manages user session state
   - All database operations require authenticated user

2. **Database Layer** (`src/lib/database.js`):
   - All CRUD operations for habit data
   - Key functions:
     - `saveChildData()` - Saves/overwrites weekly habit data
     - `loadChildData()` - Loads specific week data for a child
     - `loadAllChildren()` - Lists all children with date ranges
     - `loadChildWeeks()` - Gets all weeks for a child

3. **State Management** (`App.jsx`):
   - Main app state lives in `App.jsx` (no external state management)
   - Key state: `habits`, `reflection`, `reward`, `selectedChild`, `weekPeriod`
   - **Manual save model**: User must click save button (no auto-save)

4. **Component Architecture**:
   - `App.jsx` - Main component, handles all state and data operations
   - `Auth.jsx` - Login/signup UI
   - `ChildSelector.jsx` - Child selection interface
   - `Dashboard.jsx` - Data visualization with Recharts
   - `src/components/ui/*` - Reusable UI components (shadcn-style)

### Key Design Patterns

**Weekly Data Structure:**
- Each record is identified by `child_name` + `week_period`
- `week_period` format: "2025년 7월 21일 ~ 2025년 7월 27일"
- `week_start_date` stores ISO date for calculation
- Habits are stored as JSONB array with structure:
  ```javascript
  {
    id: number,
    name: string,
    times: Array(7) // 7-day array of 'green'/'yellow'/'red'/''
  }
  ```

**Overwrite Confirmation:**
- When saving to existing week, shows confirmation modal
- Uses `pendingSaveData` state and `showOverwriteConfirm` flag
- Force save with `saveData(true)` bypasses confirmation

**Date Handling:**
- `weekStartDate` (input) → auto-calculates `weekPeriod` (display)
- UseEffect watches `weekStartDate` changes to auto-load week data
- Week period is Monday-Sunday (7 days)

## Important Implementation Notes

### Environment Variables
- **CRITICAL**: Environment variables MUST be set in deployment platform (Netlify dashboard)
- `netlify.toml` should NOT contain environment variable values (only in dashboard)
- App validates `VITE_SUPABASE_URL` format at startup and shows error screen if invalid

### Data Loading Behavior
- When changing `weekStartDate`, app automatically loads that week's data
- Shows confirmation if current unsaved data exists (only in tracker mode, not dashboard)
- If no data exists for week, resets to default habits (preserves date)
- Dashboard mode bypasses overwrite confirmations for cleaner UX

### Authentication Flow
- All database operations check user authentication first
- On auth failure, returns to login screen
- Session managed by Supabase Auth with automatic token refresh
- Logout clears user state and resets all data

### Responsive Design
- Mobile: Card-based layout (stacked vertically)
- Desktop: Table layout with traffic light buttons
- Breakpoint: `md` (768px) - use Tailwind's `hidden md:block` pattern

### Database Schema Notes
- **Current state**: `user_id` field exists but is commented out in code (temporary)
- RLS policies are permissive during development ("Allow all operations")
- Production should enable proper user_id filtering and stricter RLS
- Table uses JSONB for flexible habit storage (supports dynamic habit lists)

## Common Development Patterns

### Adding New Habit Fields
1. Update default habit structure in `resetData()` functions
2. Modify habit rendering in both mobile and desktop layouts
3. Update `saveChildData()` in database.js if persisting new fields

### Working with Supabase
- Always use helper functions in `src/lib/database.js` and `src/lib/auth.js`
- Never directly import supabase client in components
- All operations are async - use try/catch blocks
- Error messages go to console, user-facing errors use alerts

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

### GitHub Pages Deployment
- Requires GitHub Actions workflow (see README.md)
- Base path configured in vite.config.js based on `GITHUB_PAGES` env var
- Secrets must be set in GitHub repository settings

## Tech Stack
- **Frontend**: React 18 + Vite 4
- **Styling**: Tailwind CSS 3.3 with custom design system
- **Icons**: Lucide React
- **Charts**: Recharts 3.1
- **Database**: Supabase (PostgreSQL + Auth)
- **State**: React Hooks (useState, useEffect)
- **Data Export**: XLSX library for Excel exports (from Dashboard)

## File Structure Highlights
```
src/
├── lib/
│   ├── supabase.js      # Supabase client initialization
│   ├── auth.js          # Authentication helpers
│   ├── database.js      # Database CRUD operations
│   ├── security.js      # Security utilities
│   └── utils.js         # General utilities (clsx, tailwind-merge)
├── components/
│   ├── ui/              # Reusable UI components (shadcn-style)
│   ├── Auth.jsx         # Login/signup component
│   ├── ChildSelector.jsx # Child selection UI
│   └── Dashboard.jsx    # Data visualization
├── main.jsx             # React entry point
└── App.jsx              # Main application component (800+ lines)

public/                  # Static assets and app icons
supabase-*.sql           # Database schema and migration files
```

## Known Issues & Workarounds
- `user_id` filtering temporarily disabled in database operations (commented out)
- RLS policies are permissive for development (needs tightening for production)
- Week period format is Korean text (may need i18n for internationalization)
