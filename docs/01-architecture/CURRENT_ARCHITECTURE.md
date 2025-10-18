# Current Architecture

**Habit Tracker for Kids** - System Architecture Documentation

**Version**: 2.0 (NEW SCHEMA)
**Last Updated**: 2025-10-18
**Phase**: Phase 3 Complete ✅

---

## 🎯 Architecture Overview

The Habit Tracker for Kids is a **React-based web application** with a **Supabase backend**, designed for tracking children's daily habits using a visual color-coded system. The application uses a **normalized database schema** with **Edge Functions** for data operations and **Row-Level Security** for data isolation.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           React Application (Vite)               │  │
│  │                                                  │  │
│  │  - State Management (React Hooks)              │  │
│  │  - UI Components (Tailwind + shadcn)           │  │
│  │  - Data Visualization (Recharts)               │  │
│  │  - Client Libraries (database-new.js,          │  │
│  │                      dual-write.js)            │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                               │
│                         │ HTTPS                         │
│                         ▼                               │
└─────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌───────────────────┐             ┌──────────────────────┐
│  Supabase Auth    │             │  Edge Functions      │
│                   │             │  (Deno Runtime)      │
│  - Email/Password │             │                      │
│  - JWT Tokens     │             │  dual-write-habit/   │
│  - Session Mgmt   │             │  - create_week       │
└───────────────────┘             │  - update_record     │
        │                         │  - delete_week       │
        │                         │                      │
        │                         │  send-discord-       │
        │                         │  notification/       │
        │                         └──────────────────────┘
        │                                   │
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │  Supabase Database  │
                │  (PostgreSQL)       │
                │                     │
                │  NEW SCHEMA:        │
                │  - children         │
                │  - weeks            │
                │  - habits           │
                │  - habit_records    │
                │  - idempotency_log  │
                │                     │
                │  ARCHIVED:          │
                │  - habit_tracker_   │
                │    old              │
                └─────────────────────┘
```

---

## 📊 Database Schema (NEW SCHEMA v2)

### Entity Relationship Diagram

```
┌──────────────────┐
│    children      │
├──────────────────┤
│ id (PK)          │
│ user_id (FK) ────┼──> auth.users
│ name             │
│ theme            │
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │ 1
         │
         │ has many
         │
         ▼ *
┌──────────────────┐
│      weeks       │
├──────────────────┤
│ id (PK)          │
│ child_id (FK) ───┼──> children.id
│ week_start_date  │ (MUST be Monday)
│ theme            │
│ reflection       │ (JSONB)
│ reward           │
│ source_version   │ ('migration', 'dual_write', 'new_schema_only')
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │ 1
         │
         │ has many
         │
         ▼ *
┌──────────────────┐
│     habits       │
├──────────────────┤
│ id (PK)          │
│ week_id (FK) ────┼──> weeks.id
│ name             │
│ display_order    │
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │ 1
         │
         │ has many
         │
         ▼ *
┌──────────────────┐
│ habit_records    │
├──────────────────┤
│ id (PK)          │
│ habit_id (FK) ───┼──> habits.id
│ record_date      │
│ status           │ ('green', 'yellow', 'red', '')
│ created_at       │
│ updated_at       │
└──────────────────┘
```

### Table Details

#### `children`
**Purpose**: Store child profiles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FOREIGN KEY → auth.users | Parent user |
| name | TEXT | NOT NULL | Child's name |
| theme | TEXT | | Current week theme |
| created_at | TIMESTAMPTZ | NOT NULL | Record creation |
| updated_at | TIMESTAMPTZ | NOT NULL | Last update |

**Indexes**:
- `children_user_id_idx` on (user_id)
- `children_name_idx` on (name)

**RLS Policy**: Users can only access their own children

#### `weeks`
**Purpose**: Store weekly tracking periods

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| child_id | UUID | FOREIGN KEY → children | Owner child |
| week_start_date | DATE | NOT NULL, CHECK (Monday) | Week start (Monday only) |
| theme | TEXT | | Week theme |
| reflection | JSONB | | Weekly reflection data |
| reward | TEXT | | Reward text |
| source_version | TEXT | | Data source tracking |
| created_at | TIMESTAMPTZ | NOT NULL | Record creation |
| updated_at | TIMESTAMPTZ | NOT NULL | Last update |

**Indexes**:
- `weeks_child_id_idx` on (child_id)
- `weeks_week_start_date_idx` on (week_start_date)

**Constraints**:
- `week_start_date_is_monday` CHECK (EXTRACT(DOW FROM week_start_date) = 1)

**RLS Policy**: Users can access via children.user_id

#### `habits`
**Purpose**: Store individual habit definitions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| week_id | UUID | FOREIGN KEY → weeks | Owner week |
| name | TEXT | NOT NULL | Habit name |
| display_order | INTEGER | NOT NULL | Display order (1-5) |
| created_at | TIMESTAMPTZ | NOT NULL | Record creation |
| updated_at | TIMESTAMPTZ | NOT NULL | Last update |

**Indexes**:
- `habits_week_id_idx` on (week_id)
- `habits_display_order_idx` on (display_order)

**RLS Policy**: Users can access via weeks → children.user_id

#### `habit_records`
**Purpose**: Store daily habit status

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| habit_id | UUID | FOREIGN KEY → habits | Owner habit |
| record_date | DATE | NOT NULL | Record date |
| status | TEXT | CHECK IN ('green','yellow','red','') | Traffic light status |
| created_at | TIMESTAMPTZ | NOT NULL | Record creation |
| updated_at | TIMESTAMPTZ | NOT NULL | Last update |

**Indexes**:
- `habit_records_habit_id_idx` on (habit_id)
- `habit_records_record_date_idx` on (record_date)

**Constraints**:
- `habit_records_status_check` CHECK (status IN ('green', 'yellow', 'red', ''))

**RLS Policy**: Users can access via habits → weeks → children.user_id

#### `idempotency_log`
**Purpose**: Prevent duplicate Edge Function operations

| Column | Type | Description |
|--------|------|-------------|
| idempotency_key | TEXT | Unique request key |
| operation | TEXT | Operation type |
| request_data | JSONB | Request payload |
| response_data | JSONB | Response payload |
| status | TEXT | 'success' or 'error' |
| created_at | TIMESTAMPTZ | Log timestamp |

---

## 🔄 Data Flow Architecture

### Read Operations

```
Component
   │
   ├─ loadWeekDataNew(childName, weekStartDate)
   │     │
   │     ▼
   │  database-new.js
   │     │
   │     ├─ 1. Get user_id from auth
   │     ├─ 2. Find child by name
   │     ├─ 3. Find week by date (Monday adjusted)
   │     ├─ 4. Load habits for week
   │     ├─ 5. Load habit_records for each habit
   │     ├─ 6. Transform to frontend format
   │     │
   │     ▼
   │  Supabase Query (NEW SCHEMA)
   │     │
   │     ▼
   │  PostgreSQL
   │     │
   │     ▼
   │  Returns: { child_name, week_period, habits: [...] }
   │
   └─────▶ Component updates state
```

### Write Operations

```
Component (user action)
   │
   ├─ createWeekDualWrite(childName, weekStartDate, habits, ...)
   │     │
   │     ▼
   │  dual-write.js
   │     │
   │     ├─ Generate idempotency key
   │     ├─ Get user session
   │     ├─ Prepare request payload
   │     │
   │     ▼
   │  HTTP POST to Edge Function
   │     │
   │     ▼
   │  Edge Function (dual-write-habit)
   │     │
   │     ├─ Validate JWT
   │     ├─ Check idempotency_log
   │     ├─ Adjust date to Monday
   │     ├─ Find or create child
   │     ├─ Find or create week
   │     ├─ Create habits
   │     ├─ Create habit_records
   │     ├─ Log operation
   │     │
   │     ▼
   │  Supabase Insert (NEW SCHEMA)
   │     │
   │     ▼
   │  PostgreSQL Transaction
   │     │
   │     ▼
   │  Returns: { success: true, week_id: '...' }
   │
   └─────▶ Component receives confirmation
```

### Authentication Flow

```
User enters credentials
   │
   ▼
Auth.jsx
   │
   ├─ signIn(email, password)
   │     │
   │     ▼
   │  auth.js
   │     │
   │     ▼
   │  supabase.auth.signInWithPassword()
   │     │
   │     ▼
   │  Supabase Auth
   │     │
   │     ├─ Verify credentials
   │     ├─ Generate JWT
   │     ├─ Create session
   │     │
   │     ▼
   │  Returns: { user, session }
   │
   ├─ Store user in React state
   ├─ Setup auth state listener
   │
   └─────▶ Navigate to main app
```

---

## 🏛️ Frontend Architecture

### Component Hierarchy

```
App.jsx (Main Container)
├─ Auth.jsx (if not authenticated)
│  ├─ Login Form
│  └─ Signup Form
│
└─ Main App (if authenticated)
   ├─ Header
   │  ├─ Child Name
   │  ├─ Week Date Selector
   │  └─ Logout Button
   │
   ├─ ChildSelector (modal)
   │  ├─ Existing Children List
   │  └─ New Child Form
   │
   ├─ Habit Tracker (default view)
   │  ├─ Desktop Layout (table)
   │  │  ├─ Habit Name Column
   │  │  ├─ 7 Day Columns
   │  │  │  └─ Traffic Light Buttons (green/yellow/red)
   │  │  └─ Actions Column
   │  │
   │  └─ Mobile Layout (cards)
   │     ├─ Habit Card
   │     │  ├─ Habit Name
   │     │  └─ 7 Day Grid
   │     └─ ...
   │
   ├─ Reflection Section
   │  ├─ Best Day Input
   │  ├─ Easiest Habit Input
   │  └─ Next Week Goal Input
   │
   ├─ Reward Input
   │
   ├─ Save Button
   │
   └─ Dashboard (alternate view)
      ├─ Statistics Summary
      │  ├─ Success Rate
      │  ├─ Current Streak
      │  └─ Level Progress
      │
      ├─ Charts
      │  ├─ Weekly Bar Chart
      │  ├─ Success Rate Donut
      │  └─ Monthly Stats
      │
      └─ Badges
         └─ Achievement Badges
```

### State Management

**Location**: `App.jsx` (no external state management)

**Key State Variables**:
```javascript
// Authentication
const [user, setUser] = useState(null)

// Child Selection
const [selectedChild, setSelectedChild] = useState('')
const [showChildSelector, setShowChildSelector] = useState(true)

// Week Data
const [weekStartDate, setWeekStartDate] = useState('')
const [weekPeriod, setWeekPeriod] = useState('')
const [theme, setTheme] = useState('')

// Habits (core data)
const [habits, setHabits] = useState([
  { id: 1, name: '...', times: Array(7).fill('') },
  // ... 5 habits total
])

// Reflection
const [reflection, setReflection] = useState({
  bestDay: '',
  easiestHabit: '',
  nextWeekGoal: ''
})

// Reward
const [reward, setReward] = useState('')

// UI State
const [saving, setSaving] = useState(false)
const [showDashboard, setShowDashboard] = useState(false)
const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
const [pendingSaveData, setPendingSaveData] = useState(null)
```

### Data Libraries

**`src/lib/database-new.js`** (Read Operations):
```javascript
// Load single week
export const loadWeekDataNew = async (childName, weekStartDate)

// Load all children
export const loadAllChildrenNew = async ()

// Load week list for child
export const loadChildWeeksNew = async (childName)

// Load multiple weeks (dashboard)
export const loadChildMultipleWeeksNew = async (childName, weeksCount)
```

**`src/lib/dual-write.js`** (Write Operations):
```javascript
// Create or update week
export async function createWeekDualWrite(
  childName, weekStartDate, habits, theme, reflection, reward
)

// Update single habit record
export async function updateHabitRecordDualWrite(
  childName, weekStartDate, habitName, dayIndex, status
)

// Delete week
export async function deleteWeekDualWrite(childName, weekStartDate)
```

**`src/lib/auth.js`** (Authentication):
```javascript
// Sign in
export const signIn = async (email, password)

// Sign up
export const signUp = async (email, password)

// Sign out
export const signOut = async ()

// Get current user
export const getCurrentUser = async ()

// Listen to auth changes
export const onAuthStateChange = (callback)
```

---

## ⚙️ Backend Architecture

### Edge Functions

**Location**: `supabase/functions/`

#### `dual-write-habit`

**Purpose**: Handle ALL write operations to NEW SCHEMA

**Operations**:
1. **create_week**: Create or update week with habits
2. **update_habit_record**: Update single habit status
3. **delete_week**: Delete week and all related data

**Mode**: `new_only` (Phase 3)

**Flow**:
```typescript
async function handleRequest(req: Request) {
  // 1. Validate JWT
  const user = await validateJWT(req)

  // 2. Parse request
  const { operation, data } = await req.json()

  // 3. Check idempotency
  const idempotencyKey = req.headers.get('X-Idempotency-Key')
  const existing = await checkIdempotency(idempotencyKey)
  if (existing) return existing.response

  // 4. Execute operation
  let result
  switch (operation) {
    case 'create_week':
      result = await createWeekNewSchemaOnly(data)
      break
    case 'update_habit_record':
      result = await updateHabitRecordNewSchemaOnly(data)
      break
    case 'delete_week':
      result = await deleteWeekNewSchemaOnly(data)
      break
  }

  // 5. Log operation
  await logIdempotency(idempotencyKey, operation, data, result)

  // 6. Return response
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

**Error Handling**:
- JWT validation failures → 401
- Invalid operation → 400
- Database errors → 500
- All errors logged with details

#### `send-discord-notification`

**Purpose**: Send Discord webhook notifications

**Events**:
- Habit check completed
- Week saved
- Week completed (all habits checked)

**Payload**:
```typescript
{
  event: 'habit_check' | 'week_save' | 'week_complete',
  child_name: string,
  week_period: string,
  stats: {
    green_count: number,
    yellow_count: number,
    red_count: number,
    success_rate: number
  }
}
```

### Row-Level Security (RLS)

**Status**: Enabled (Phase 2 Day 4)

**Strategy**: User isolation via `user_id`

**Policies**:

```sql
-- children table
CREATE POLICY "Users can CRUD their own children"
  ON children
  FOR ALL
  USING (auth.uid() = user_id);

-- weeks table (via FK to children)
CREATE POLICY "Users can CRUD weeks via children"
  ON weeks
  FOR ALL
  USING (
    child_id IN (
      SELECT id FROM children WHERE user_id = auth.uid()
    )
  );

-- habits table (via FK to weeks → children)
CREATE POLICY "Users can CRUD habits via weeks"
  ON habits
  FOR ALL
  USING (
    week_id IN (
      SELECT w.id FROM weeks w
      JOIN children c ON w.child_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- habit_records table (via FK to habits → weeks → children)
CREATE POLICY "Users can CRUD records via habits"
  ON habit_records
  FOR ALL
  USING (
    habit_id IN (
      SELECT h.id FROM habits h
      JOIN weeks w ON h.week_id = w.id
      JOIN children c ON w.child_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );
```

---

## 🔒 Security Architecture

### Authentication

**Provider**: Supabase Auth
**Method**: Email/Password (JWT-based)

**Token Flow**:
1. User signs in → Supabase generates JWT
2. JWT stored in browser (httpOnly cookie)
3. Frontend includes JWT in Authorization header
4. Backend validates JWT on each request
5. JWT auto-refreshes before expiry

### Authorization

**Strategy**: Row-Level Security (RLS)

**Benefits**:
- Database-level enforcement (cannot bypass)
- Automatic filtering in all queries
- No application-level ACL needed

### Data Protection

**At Rest**:
- Supabase encryption (AES-256)
- Backups encrypted

**In Transit**:
- HTTPS/TLS for all communication
- Secure WebSocket (wss://) for Realtime (future)

**Sensitive Data**:
- No passwords stored (handled by Supabase Auth)
- User data isolated via RLS
- No PII in frontend localStorage

### Edge Function Security

**Validation**:
- JWT required for all operations
- User identity verified
- Input sanitization

**Idempotency**:
- Prevents duplicate operations
- Safe retries on network issues
- Logged for audit trail

---

## 🚀 Deployment Architecture

### Production Environment

```
┌─────────────────────────────────┐
│         Netlify CDN             │
│                                 │
│  - Static hosting               │
│  - Auto SSL (Let's Encrypt)     │
│  - Global CDN                   │
│  - Continuous deployment        │
│                                 │
│  Deployed from: main branch     │
│  Build: npm run build           │
│  Output: dist/                  │
└─────────────────┬───────────────┘
                  │
                  │ HTTPS
                  ▼
         ┌────────────────┐
         │   Supabase     │
         │   Platform     │
         │                │
         │  - Auth        │
         │  - Database    │
         │  - Edge Funcs  │
         │  - Storage     │
         └────────────────┘
```

### Build Process

```bash
# 1. Install dependencies
npm install

# 2. Run build (Vite)
npm run build
# → Outputs to dist/
#    - index.html
#    - assets/index-*.js (759.18 KB)
#    - assets/index-*.css (35.91 KB)

# 3. Deploy to Netlify
# Automatic on git push to main
# Or manual: netlify deploy --prod
```

### Environment Variables

**Set in Netlify Dashboard** (NOT in code):
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

**Validation**: App checks on startup, shows error if invalid

---

## 📈 Performance Architecture

### Frontend Optimization

**Bundle Size**:
- Total: 759.18 KB (223.43 KB gzipped)
- Code splitting: Not yet implemented
- Lazy loading: Not yet implemented

**Caching**:
- Static assets cached by Netlify CDN
- No client-side data caching yet (future: React Query)

**Rendering**:
- React 18 with automatic batching
- Hooks for efficient re-renders
- No unnecessary renders (verified)

### Backend Optimization

**Database**:
- Indexes on all foreign keys
- Index on `week_start_date` for date queries
- Composite indexes for common queries

**Edge Functions**:
- Single transaction per operation
- Minimal data transfer
- Idempotency prevents duplicate work

**Query Patterns**:
- Avoid N+1 queries (use JOINs or batch)
- Limit result sets appropriately
- Use JSONB efficiently

---

## 🔮 Future Architecture Considerations

### Planned Enhancements

1. **Real-time Updates**
   - Supabase Realtime integration
   - Live habit updates across devices
   - Collaborative tracking

2. **Offline Support**
   - Service Worker (PWA)
   - IndexedDB caching
   - Sync on reconnect

3. **Performance**
   - Code splitting by route
   - Lazy load Dashboard charts
   - React Query for server state

4. **Features**
   - Habit templates
   - Advanced analytics
   - Multi-language support (i18n)

### Scalability Considerations

**Current Load**:
- < 100 concurrent users
- < 1000 DB operations/day
- Single-region deployment

**Scale Strategy**:
- Supabase auto-scales DB
- Netlify CDN handles frontend load
- Edge Functions auto-scale
- Consider multi-region if global users

---

## 📚 Related Documentation

- **Quick Start**: [CLAUDE.md](../../CLAUDE.md)
- **Project Status**: [PROJECT_STATUS.md](../00-overview/PROJECT_STATUS.md)
- **Navigation**: [INDEX.md](../INDEX.md)
- **Migration Plan**: [DB_MIGRATION_PLAN_V2.md](../00-overview/DB_MIGRATION_PLAN_V2.md)
- **Tech Spec**: [TECH_SPEC.md](../00-overview/TECH_SPEC.md)

---

**Document Version**: 2.0
**Last Updated**: 2025-10-18
**Status**: Current (Phase 3 Complete)
**Next Review**: After feature additions
