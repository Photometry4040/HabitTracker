# Codebase Structure Documentation

> Agent 4 - Documentation Maintainer
> Created: 2025-10-13
> Purpose: Comprehensive guide to project file organization and architecture

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Source Code (`src/`)](#source-code-src)
4. [Components](#components)
5. [Library Modules](#library-modules)
6. [Hooks](#hooks)
7. [Database Schema](#database-schema)
8. [Edge Functions](#edge-functions)
9. [Configuration Files](#configuration-files)
10. [Data Flow](#data-flow)

---

## Project Overview

**Project Name**: Habit Tracker for Kids
**Framework**: React 18 + Vite 4
**Language**: JavaScript (JSX)
**State Management**: React Hooks (useState, useEffect)
**Database**: Supabase (PostgreSQL)
**Styling**: Tailwind CSS 3.3

---

## Directory Structure

```
/Users/jueunlee/project/Habit Tracker Template for Kids with Visual Goals/
├── .claude/                          # Claude Code agent configuration
│   ├── agents/                       # Agent specifications
│   │   ├── discord-bot-dev.md
│   │   ├── doc-maintainer.md
│   │   ├── product-manager.md
│   │   ├── statistics-engineer.md
│   │   ├── template-system-dev.md
│   │   └── README.md
│   └── settings.local.json           # Local Claude settings
│
├── bot/                              # Discord Bot (Agent 1) - NEW
│   ├── commands/                     # Slash command handlers
│   ├── index.js                      # Bot entry point
│   ├── package.json                  # Bot dependencies
│   └── .env                          # Bot configuration
│
├── docs/                             # Project documentation
│   ├── 00-overview/                  # Strategic documents
│   ├── 01-architecture/              # Design documents
│   ├── 02-active/                    # Current work
│   ├── 03-deployment/                # Deployment guides
│   ├── 04-completed/                 # Archived work
│   ├── 05-reviews/                   # Weekly reviews
│   ├── 06-future/                    # Future plans
│   ├── README.md                     # Documentation index
│   ├── PROJECT_STATUS.md             # Current status
│   ├── GIT_WORKFLOW.md               # Git guidelines
│   ├── AGENT_PROGRESS_TRACKER.md     # Agent task tracking
│   ├── CODEBASE_STRUCTURE.md         # This file
│   └── DOCS_REORGANIZATION_PLAN.md   # Doc cleanup plan
│
├── public/                           # Static assets
│   ├── icons/                        # App icons (PWA)
│   ├── favicon.ico
│   └── site.webmanifest
│
├── src/                              # Main source code
│   ├── components/                   # React components
│   │   ├── ui/                       # Reusable UI components
│   │   ├── Auth.jsx                  # Authentication
│   │   ├── ChildSelector.jsx         # Child selection
│   │   ├── Dashboard.jsx             # Statistics dashboard
│   │   └── TemplateManager.jsx       # Template management (NEW)
│   │
│   ├── hooks/                        # Custom React hooks (NEW)
│   │   ├── useStatistics.js          # Statistics data fetching
│   │   └── useTemplate.js            # Template CRUD operations
│   │
│   ├── lib/                          # Library modules
│   │   ├── auth.js                   # Authentication helpers
│   │   ├── database.js               # Old schema operations (LEGACY)
│   │   ├── database-new.js           # New schema operations
│   │   ├── discord.js                # Discord notifications
│   │   ├── dual-write.js             # Dual-write utilities
│   │   ├── security.js               # Security utilities
│   │   ├── statistics.js             # Statistics calculations (NEW)
│   │   ├── supabase.js               # Supabase client initialization
│   │   ├── templates.js              # Template CRUD (NEW)
│   │   └── utils.js                  # General utilities
│   │
│   ├── App.css                       # Global styles
│   ├── App.jsx                       # Main application component (800+ lines)
│   ├── index.css                     # Tailwind imports
│   └── main.jsx                      # React entry point
│
├── supabase/                         # Database migrations
│   └── migrations/                   # SQL migration files
│       ├── 001_initial_schema.sql
│       ├── ...
│       ├── 013_create_idempotency_log.sql
│       ├── 014_create_edge_functions.sql
│       ├── 015_create_stats_weekly_view.sql  # NEW (Agent 2)
│       └── 016_create_stats_monthly_view.sql # NEW (Agent 2)
│
├── tests/                            # Test files
│   ├── integration/                  # Integration tests
│   │   └── README.md                 # Test documentation
│   └── unit/                         # Unit tests (future)
│
├── .env                              # Environment variables (local)
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore patterns
├── CHANGELOG.md                      # Version history
├── CLAUDE.md                         # Claude Code instructions
├── index.html                        # HTML entry point
├── netlify.toml                      # Netlify configuration
├── package.json                      # NPM dependencies
├── package-lock.json                 # Dependency lock file
├── postcss.config.js                 # PostCSS configuration
├── README.md                         # Project README
├── tailwind.config.js                # Tailwind CSS configuration
└── vite.config.js                    # Vite bundler configuration
```

---

## Source Code (`src/`)

### Main Application Flow

```
main.jsx
   │
   └─> App.jsx (Main Component)
        │
        ├─> Auth.jsx (if not logged in)
        │
        └─> Main App UI (if logged in)
            │
            ├─> ChildSelector.jsx (Child + Week selection)
            │
            ├─> Habit Tracker UI (Main view)
            │   ├─> Mobile: Card-based layout
            │   └─> Desktop: Table layout
            │
            ├─> Dashboard.jsx (Statistics view)
            │   ├─> Recharts components
            │   └─> Data export functionality
            │
            └─> TemplateManager.jsx (Template management) [NEW]
                ├─> Template list
                ├─> Create/Edit forms
                └─> Apply to week
```

---

## Components

### Core Components

#### `src/main.jsx`
**Purpose**: React application entry point
**Responsibilities**:
- Renders `<App />` into `#root`
- Sets up React StrictMode
- Imports global styles

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Dependencies**: None (root component)

---

#### `src/App.jsx`
**Purpose**: Main application component (800+ lines)
**Responsibilities**:
- Authentication state management
- Child and week selection
- Habit data CRUD operations
- UI rendering (tracker and dashboard)
- Manual save model (no auto-save)

**Key State Variables**:
```javascript
const [user, setUser] = useState(null)                    // Current user
const [selectedChild, setSelectedChild] = useState('')     // Child name
const [weekStartDate, setWeekStartDate] = useState('')     // Week start
const [weekPeriod, setWeekPeriod] = useState('')          // Display period
const [habits, setHabits] = useState([...])               // Habit array
const [reflection, setReflection] = useState({...})       // Reflection object
const [reward, setReward] = useState('')                  // Reward text
const [mode, setMode] = useState('tracker')               // 'tracker' or 'dashboard'
```

**Key Functions**:
- `saveData()` - Saves habit data via Edge Function (dual-write)
- `loadChildData()` - Loads week data for selected child
- `updateHabitColor()` - Updates habit status (green/yellow/red)
- `resetData()` - Resets to default habit structure

**File Ownership**: Shared (sections owned by different agents)
```javascript
// ============================================================
// STATISTICS SECTION (Agent 2)
// ============================================================
const [showDashboard, setShowDashboard] = useState(false);

// ============================================================
// TEMPLATE SECTION (Agent 3)
// ============================================================
const [showTemplates, setShowTemplates] = useState(false);
```

---

### UI Components

#### `src/components/Auth.jsx`
**Purpose**: Login/signup interface
**Responsibilities**:
- Email/password authentication
- Switch between login and signup modes
- Error message display

**Props**: None (uses callbacks via context)
**Events**:
- `onLogin(user)` - Called after successful login

**Dependencies**:
- `@/lib/auth.js` (signUp, signIn)

---

#### `src/components/ChildSelector.jsx`
**Purpose**: Child and week selection UI
**Responsibilities**:
- Display list of children
- Week navigation (previous/next)
- Date picker for week start

**Props**:
```javascript
{
  children: Array<string>,
  selectedChild: string,
  onSelectChild: (name) => void,
  weekStartDate: string,
  onWeekChange: (date) => void
}
```

**Dependencies**: None (pure UI component)

---

#### `src/components/Dashboard.jsx`
**Purpose**: Statistics visualization
**Responsibilities**:
- Display weekly success rate
- Show habit-by-habit breakdown
- Render Recharts visualizations
- Export data to Excel

**Props**:
```javascript
{
  childName: string,
  weekStartDate: string,
  habits: Array<Habit>
}
```

**Key Features**:
- Bar chart: Daily completion count
- Line chart: Success rate trend
- Pie chart: Habit distribution
- Excel export button

**Dependencies**:
- `recharts` library
- `xlsx` library (for export)
- `@/lib/statistics.js` (NEW - Agent 2)

**File Ownership**: Agent 2 (Statistics Engineer)

---

#### `src/components/TemplateManager.jsx` [NEW]
**Purpose**: Habit template management UI
**Responsibilities**:
- List all templates
- Create new template from current week
- Edit existing template
- Delete template
- Apply template to current week

**Props**:
```javascript
{
  childName: string,
  onApplyTemplate: (template) => void
}
```

**Key Features**:
- Template CRUD operations
- Preview template habits
- One-click apply to week

**Dependencies**:
- `@/lib/templates.js`
- `@/hooks/useTemplate.js`
- React Query (for data fetching)

**File Ownership**: Agent 3 (Template System Developer)

---

### UI Primitives (`src/components/ui/`)

Reusable shadcn-style components:

| Component | File | Purpose | Props |
|-----------|------|---------|-------|
| Button | `button.jsx` | Clickable button with variants | `variant`, `size`, `className`, `children` |
| Card | `card.jsx` | Container with header/content/footer | `className`, `children` |
| Input | `input.jsx` | Text input field | `type`, `value`, `onChange`, `placeholder` |
| Label | `label.jsx` | Form label | `htmlFor`, `children` |
| Textarea | `textarea.jsx` | Multi-line text input | `value`, `onChange`, `rows` |
| Badge | `badge.jsx` | Status badge | `variant`, `children` |

**Design System**: Tailwind CSS with HSL color variables
**Styling**: `@/lib/utils.js` (clsx, tailwind-merge)

---

## Library Modules

### Authentication (`src/lib/auth.js`)

**Purpose**: Supabase Auth operations

**Key Functions**:
```javascript
export async function signUp(email, password)
export async function signIn(email, password)
export async function signOut()
export async function getCurrentUser()
```

**Usage**:
```javascript
import { signIn } from '@/lib/auth';

const user = await signIn('user@example.com', 'password123');
```

**Dependencies**: `@/lib/supabase.js`

---

### Database Operations

#### `src/lib/database.js` (LEGACY)
**Purpose**: Old schema (`habit_tracker` table) operations
**Status**: Maintained for backward compatibility during migration

**Key Functions**:
```javascript
export async function saveChildData(childName, weekPeriod, weekStartDate, theme, habits, reflection, reward)
export async function loadChildData(childName, weekStartDate)
export async function loadAllChildren()
export async function loadChildWeeks(childName)
```

**Note**: Being phased out in favor of `database-new.js`

---

#### `src/lib/database-new.js`
**Purpose**: New schema (7 tables) operations
**Status**: Current (Phase 2 complete)

**Key Functions**:
```javascript
// Child operations
export async function loadChildren()
export async function createChild(name, userId)

// Week operations
export async function loadChildWeeks(childName)
export async function loadWeekData(childName, weekStartDate)

// Habit operations (via Edge Function)
export async function saveHabitData(childName, weekStartDate, habits, reflection, reward)
export async function updateHabitRecord(habitId, recordDate, status)
```

**Edge Function Integration**:
- Uses `dual-write-habit` Edge Function
- Implements idempotency (X-Idempotency-Key header)
- Automatic Monday constraint adjustment

**Dependencies**: `@/lib/supabase.js`, `@/lib/dual-write.js`

---

### Discord Integration (`src/lib/discord.js`)

**Purpose**: Discord Webhook notifications

**Key Functions**:
```javascript
export async function sendHabitCheckNotification(childName, habitName, status, date)
export async function sendWeekSaveNotification(childName, weekPeriod, successRate)
export async function sendGoalAchievementNotification(childName, weekPeriod, successRate)
```

**Edge Function**: `send-discord-notification`

**Notification Types**:
1. `habit_check` - Individual habit status update (🟢🟡🔴)
2. `week_save` - Weekly data save confirmation
3. `week_complete` - Goal achievement (≥80% success rate)

**Dependencies**: `@/lib/supabase.js`

---

### Statistics (`src/lib/statistics.js`) [NEW - Agent 2]

**Purpose**: Habit statistics calculations

**Key Functions**:
```javascript
export async function calculateWeekStats(childName, weekStartDate)
// Returns: { successRate, totalHabits, completedHabits, habitBreakdown, dailyStats }

export async function calculateMonthStats(childName, year, month)
// Returns: { monthlySuccessRate, weekComparison, trendData }

export async function calculateYearStats(childName, year)
// Returns: { yearlySuccessRate, monthlyTrend, milestones }
```

**Database Views** (Materialized):
- `stats_weekly` - Pre-aggregated weekly statistics
- `stats_monthly` - Pre-aggregated monthly statistics

**Performance**: 75% faster than JSONB queries (45ms vs 180ms)

**Dependencies**: `@/lib/supabase.js`

**File Ownership**: Agent 2 (Statistics Engineer)

---

### Templates (`src/lib/templates.js`) [NEW - Agent 3]

**Purpose**: Habit template CRUD operations

**Key Functions**:
```javascript
export async function createTemplate(name, description, habits, childId)
export async function loadTemplates(userId, childId = null)
export async function updateTemplate(templateId, updates)
export async function deleteTemplate(templateId)
export async function applyTemplateToWeek(templateId, weekStartDate)
```

**Data Structure**:
```javascript
{
  id: UUID,
  user_id: UUID,
  child_id: UUID (optional),
  name: string,
  description: string,
  habits: JSONB [{ name, time_period }],
  is_default: boolean,
  created_at: timestamp
}
```

**Dependencies**: `@/lib/supabase.js`

**File Ownership**: Agent 3 (Template System Developer)

---

### Utilities

#### `src/lib/supabase.js`
**Purpose**: Supabase client initialization

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Environment Variables**:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Anonymous API key

---

#### `src/lib/utils.js`
**Purpose**: General utility functions

```javascript
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

**Usage**: Merging Tailwind classes without conflicts

---

#### `src/lib/security.js`
**Purpose**: Security utilities (input validation, sanitization)

**Key Functions**:
```javascript
export function sanitizeInput(input)
export function validateEmail(email)
export function validateDate(dateString)
```

---

## Hooks

### `src/hooks/useStatistics.js` [NEW - Agent 2]

**Purpose**: React Query hooks for statistics data fetching

**Key Hooks**:
```javascript
export function useWeekStats(childName, weekStartDate)
// Returns: { data, isLoading, error, refetch }

export function useMonthStats(childName, year, month)
export function useYearStats(childName, year)
```

**Features**:
- Automatic caching (5 minutes)
- Background refetching
- Optimistic updates
- Error retry (3 attempts)

**Dependencies**:
- `@tanstack/react-query`
- `@/lib/statistics.js`

**File Ownership**: Agent 2

---

### `src/hooks/useTemplate.js` [NEW - Agent 3]

**Purpose**: React Query hooks for template CRUD

**Key Hooks**:
```javascript
export function useTemplates(userId, childId)
// Returns: { data, isLoading, error, refetch }

export function useCreateTemplate()
// Returns: { mutate, isLoading, error }

export function useUpdateTemplate()
export function useDeleteTemplate()
export function useApplyTemplate()
```

**Features**:
- Optimistic UI updates
- Automatic cache invalidation
- Error rollback

**Dependencies**:
- `@tanstack/react-query`
- `@/lib/templates.js`

**File Ownership**: Agent 3

---

## Database Schema

### Current Schema (7 Tables)

```sql
-- 1. children
CREATE TABLE children (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 2. weeks
CREATE TABLE weeks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  child_id UUID REFERENCES children(id),
  week_start_date DATE NOT NULL,  -- Monday
  week_end_date DATE NOT NULL,    -- Sunday
  theme TEXT,
  reflection JSONB DEFAULT '{}',
  reward TEXT,
  template_id UUID REFERENCES habit_templates(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(child_id, week_start_date)
);

-- 3. habits
CREATE TABLE habits (
  id UUID PRIMARY KEY,
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time_period TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP
);

-- 4. habit_records
CREATE TABLE habit_records (
  id UUID PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  status TEXT CHECK (status IN ('green', 'yellow', 'red', 'none')),
  note TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(habit_id, record_date)
);

-- 5. habit_templates
CREATE TABLE habit_templates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  child_id UUID REFERENCES children(id),
  name TEXT NOT NULL,
  description TEXT,
  habits JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 6. notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  from_user_id UUID REFERENCES auth.users(id),
  type TEXT CHECK (type IN ('mention', 'achievement', 'weekly_report', 'chat')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);

-- 7. habit_tracker (LEGACY - for dual-write)
CREATE TABLE habit_tracker (
  id BIGSERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,
  week_period TEXT,
  week_start_date DATE,
  theme TEXT,
  habits JSONB DEFAULT '[]',
  reflection JSONB DEFAULT '{}',
  reward TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Relationships**:
```
auth.users (Supabase Auth)
    ↓
children
    ↓
weeks ←─ habit_templates
    ↓
habits
    ↓
habit_records
```

---

## Edge Functions

### `dual-write-habit`

**Purpose**: Synchronize writes to old and new schemas

**Location**: Supabase Edge Functions

**Actions**:
- `create_week` - Create new week with habits
- `update_habit_record` - Update habit status

**Features**:
- Idempotency (via `idempotency_log` table)
- Automatic Child/Week/Habit creation if not exists
- Monday constraint auto-adjustment
- UPSERT logic (prevents duplicate errors)

**Invocation**:
```javascript
const { data, error } = await supabase.functions.invoke('dual-write-habit', {
  headers: { 'X-Idempotency-Key': `${childName}-${weekStartDate}-${Date.now()}` },
  body: {
    action: 'create_week',
    data: { childName, weekStartDate, theme, habits }
  }
})
```

---

### `send-discord-notification`

**Purpose**: Send notifications to Discord via webhook

**Location**: Supabase Edge Functions

**Notification Types**:
1. `habit_check` - Habit status update
2. `week_save` - Week saved
3. `week_complete` - Goal achieved (≥80%)

**Invocation**:
```javascript
await supabase.functions.invoke('send-discord-notification', {
  body: {
    type: 'habit_check',
    childName: '지우',
    habitName: '아침 일어나기',
    status: 'green',
    date: '2025-10-14'
  }
})
```

---

## Configuration Files

### `vite.config.js`
**Purpose**: Vite bundler configuration

**Key Settings**:
- Path alias: `@` → `./src`
- React plugin
- Build output: `dist/`

---

### `tailwind.config.js`
**Purpose**: Tailwind CSS configuration

**Key Settings**:
- Content paths (for purging unused styles)
- Color palette (HSL variables)
- Custom theme extensions

---

### `package.json`
**Purpose**: NPM package configuration

**Key Scripts**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext js,jsx",
    "test": "vitest",
    "test:integration": "vitest run tests/integration"
  }
}
```

**Dependencies**:
- React 18.2.0
- @supabase/supabase-js 2.38.4
- recharts 3.1.0
- lucide-react (icons)
- tailwindcss 3.3.5

---

## Data Flow

### Habit Tracker Flow

```
User Action (Click color button)
    ↓
App.jsx: updateHabitColor(habitId, dayIndex, color)
    ↓
Update local state: setHabits([...])
    ↓
User clicks "Save" button
    ↓
App.jsx: saveData()
    ↓
src/lib/database-new.js: saveHabitData()
    ↓
Supabase Edge Function: dual-write-habit
    ↓
┌─────────────────────┬─────────────────────┐
│ Old Schema          │ New Schema          │
│ (habit_tracker)     │ (7 tables)          │
│                     │                     │
│ JSONB Update        │ habit_records       │
│                     │ INSERT/UPDATE       │
└─────────────────────┴─────────────────────┘
    ↓
Discord Notification (if enabled)
    ↓
Success / Error message to user
```

### Statistics Flow

```
User navigates to Dashboard
    ↓
Dashboard.jsx: useWeekStats(childName, weekStartDate)
    ↓
src/hooks/useStatistics.js: React Query fetch
    ↓
src/lib/statistics.js: calculateWeekStats()
    ↓
Supabase Query: stats_weekly view
    ↓
Return aggregated data
    ↓
Recharts renders charts
    ↓
User can export to Excel
```

### Template Flow

```
User opens Template Manager
    ↓
TemplateManager.jsx: useTemplates(userId)
    ↓
src/hooks/useTemplate.js: React Query fetch
    ↓
src/lib/templates.js: loadTemplates()
    ↓
Supabase Query: habit_templates table
    ↓
Display template list
    ↓
User clicks "Apply Template"
    ↓
TemplateManager.jsx: useApplyTemplate()
    ↓
src/lib/templates.js: applyTemplateToWeek()
    ↓
Creates week + habits from template
    ↓
App.jsx state updated
    ↓
UI shows new habits
```

---

## File Dependencies

### Dependency Graph

```
main.jsx
  └─> App.jsx
       ├─> Auth.jsx
       │    └─> auth.js
       │         └─> supabase.js
       │
       ├─> ChildSelector.jsx
       │
       ├─> Dashboard.jsx (Agent 2)
       │    ├─> useStatistics.js
       │    │    └─> statistics.js
       │    │         └─> supabase.js
       │    └─> recharts
       │
       ├─> TemplateManager.jsx (Agent 3)
       │    ├─> useTemplate.js
       │    │    └─> templates.js
       │    │         └─> supabase.js
       │    └─> ui components
       │
       ├─> database-new.js
       │    ├─> supabase.js
       │    ├─> dual-write.js
       │    └─> Edge Functions
       │
       ├─> discord.js
       │    └─> supabase.js (Edge Function)
       │
       └─> ui components
            └─> utils.js
```

---

## Naming Conventions

### Files
- **Components**: PascalCase (e.g., `ChildSelector.jsx`)
- **Libraries**: kebab-case (e.g., `database-new.js`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTemplate.js`)
- **Utilities**: kebab-case (e.g., `utils.js`)

### Functions
- **Async functions**: Use `async/await` (not promises)
- **Event handlers**: Prefix with `handle` or `on` (e.g., `handleSubmit`, `onSelectChild`)
- **Database operations**: Use verb + noun (e.g., `loadChildData`, `saveHabitData`)

### Variables
- **State**: Descriptive names (e.g., `selectedChild`, `weekStartDate`)
- **Constants**: UPPERCASE (e.g., `DEFAULT_HABITS`)
- **Booleans**: Prefix with `is`, `has`, `should` (e.g., `isLoading`, `hasError`)

---

## Code Style

### React Patterns

**Hooks Order**:
```javascript
function Component() {
  // 1. State hooks
  const [value, setValue] = useState(initial);

  // 2. Effect hooks
  useEffect(() => { ... }, [deps]);

  // 3. Event handlers
  const handleClick = () => { ... };

  // 4. Render
  return <div>...</div>;
}
```

**Conditional Rendering**:
```javascript
// Good: Early return
if (!user) return <Auth />;

// Good: Ternary for simple cases
{isLoading ? <Spinner /> : <Content />}

// Good: && for single condition
{error && <ErrorMessage />}
```

---

## Testing Structure

```
tests/
├── integration/
│   ├── discord-database.test.js        # Agent 1 + Database
│   ├── statistics-dashboard.test.js    # Agent 2 + UI
│   ├── template-tracker.test.js        # Agent 3 + UI
│   ├── bot-statistics.test.js          # Agent 1 + Agent 2
│   └── e2e-habit-flow.test.js          # Full workflow
│
└── unit/
    ├── lib/
    │   ├── auth.test.js
    │   ├── statistics.test.js
    │   └── templates.test.js
    └── components/
        ├── ChildSelector.test.js
        └── Dashboard.test.js
```

---

## Future Additions

**Planned Directories**:
- `src/contexts/` - React Context providers (if needed)
- `src/types/` - TypeScript type definitions (if migrating to TS)
- `src/constants/` - App-wide constants
- `src/utils/` - More utility functions

**Planned Files**:
- `src/lib/realtime.js` - Supabase Realtime subscriptions
- `src/hooks/useAuth.js` - Authentication hook
- `src/hooks/useHabits.js` - Habit CRUD hook

---

**Maintained By**: Agent 4 - Documentation Maintainer
**Created**: 2025-10-13
**Last Updated**: 2025-10-13
**Next Review**: Day 4 (2025-10-17) - After first integrations
