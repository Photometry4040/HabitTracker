# Changelog

All notable changes to the Habit Tracker for Kids project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Discord Bot with Slash Commands (`/습관조회`, `/습관수정`, `/통계`, `/알림설정`)
- Advanced Statistics (Weekly, Monthly, Yearly analysis)
- Habit Template System (CRUD + UI)
- Automated Reports (Daily & Weekly)

## [0.5.0] - 2025-10-13

### Added
- Discord Webhook notification system (Phase A)
  - Habit check notifications with color emojis (🟢🟡🔴)
  - Weekly save confirmations
  - Goal achievement celebrations (80%+ success rate)
- Edge Function: `send-discord-notification`
- React integration for Discord notifications (`src/lib/discord.js`)
- Product Manager Agent for project coordination
- 8 specialized Agent system (PM + 4 dev agents + 3 infra agents)
- Parallel development plan (18 days → 8 days, 55% reduction)

### Changed
- Updated project documentation with Discord strategy
- Reorganized agent structure in `.claude/agents/`

### Documentation
- Added `DISCORD_NOTIFICATIONS.md` - Discord webhook usage guide
- Added `DISCORD_STRATEGY.md` - Overall Discord integration strategy
- Added `DISCORD_BOT_SPEC.md` - Detailed bot specification
- Added `PARALLEL_DEV_PLAN.md` - Parallel development coordination
- Added `PROJECT_STATUS.md` - Current project status tracking
- Added `.claude/agents/product-manager.md` - PM Agent specification
- Updated `.claude/agents/README.md` with all 8 agents

## [0.4.0] - 2025-10-12

### Added
- Edge Function: `dual-write-habit` (Phase 2 completion)
  - Automatic Child, Week, Habit creation if not exists
  - Monday constraint auto-adjustment
  - UPSERT logic to prevent duplicate errors
- All color buttons working correctly
- Save button with duplicate prevention

### Changed
- Migrated from old schema (`habit_tracker`) to new schema (7 tables)
- Updated all UI buttons to use dual-write Edge Function

### Fixed
- Duplicate key errors when saving multiple times
- Monday constraint violations

## [0.3.0] - 2025-10-11

### Added
- New database schema (7 tables)
  - `children` - Child information
  - `weeks` - Weekly data
  - `habits` - Habit definitions
  - `habit_records` - Habit records (7-day data)
  - `habit_templates` - Habit templates
  - `notifications` - In-app notifications
  - `habit_tracker` - Legacy table (maintained for dual-write)
- Database migration plan (Phase 0-3)
- Edge Functions infrastructure

### Documentation
- `DB_MIGRATION_PLAN_V2.md` - Comprehensive migration strategy
- `TECH_SPEC.md` - Updated technical specification

## [0.2.0] - 2025-09-15

### Added
- PWA support with app icons for all platforms
- Dashboard component with Recharts visualization
- Weekly statistics (success rate, habit-by-habit analysis)
- Data export to Excel functionality
- Print-friendly styles

### Changed
- Improved mobile responsiveness (card-based layout)
- Enhanced color-coded habit evaluation UI

## [0.1.0] - 2025-08-01

### Added
- Initial release of Habit Tracker for Kids
- User authentication with Supabase Auth
- Multi-child habit tracking
- Color-coded habit evaluation (green/yellow/red)
- Weekly period management (Monday-Sunday)
- Cloud storage with Supabase PostgreSQL
- Manual save model (user-triggered save button)

### Features
- Habit CRUD operations
- Week navigation (previous/next)
- Child selector interface
- Responsive design (mobile + desktop)
- Korean language support

### Technical
- React 18 + Vite 4
- Tailwind CSS 3.3
- Supabase (PostgreSQL + Auth)
- Lucide React icons

---

## Version History Summary

| Version | Date | Description |
|---------|------|-------------|
| 0.5.0 | 2025-10-13 | Discord Webhook + Agent System |
| 0.4.0 | 2025-10-12 | Phase 2 - Dual-Write Edge Function |
| 0.3.0 | 2025-10-11 | Phase 0-1 - New Schema + Migration Plan |
| 0.2.0 | 2025-09-15 | Dashboard + PWA Support |
| 0.1.0 | 2025-08-01 | Initial Release |

---

## Change Categories

**Legend:**
- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements
- `Documentation` - Documentation changes
- `Performance` - Performance improvements
- `Refactor` - Code refactoring without functionality changes

---

## Agent Contribution Guidelines

### For All Agents

When making changes to the codebase, update this CHANGELOG.md file in your branch:

**1. Add to [Unreleased] section:**
```markdown
## [Unreleased]

### Added (for Agent X)
- Feature description with technical details
- Use present tense ("Add" not "Added")
- Reference files changed: `src/lib/statistics.js`, `src/hooks/useStatistics.js`

### Changed (for Agent X)
- What was modified and why
```

**2. Use clear, descriptive entries:**
- Good: "Add weekly statistics calculation with Recharts visualization in Dashboard"
- Bad: "Update dashboard"

**3. Include your agent identifier:**
```markdown
### Added (Agent 2 - Statistics)
- Weekly success rate calculation function (`calculateWeekStats`)
- Materialized view: `stats_weekly` for performance optimization
- Recharts components: BarChart, LineChart, PieChart
```

**4. Link related documentation:**
```markdown
### Documentation (Agent 4)
- Added `STATISTICS_ROADMAP.md` - Agent 2 technical spec
- Updated `CODEBASE_STRUCTURE.md` - Added statistics module
- See: [docs/02-active/STATISTICS_ROADMAP.md](docs/02-active/STATISTICS_ROADMAP.md)
```

---

## Commit Message Convention

When committing changes, follow this format:

```
[Agent X] type: Short description (50 chars max)

Detailed description (optional):
- Change 1
- Change 2

Ref: CHANGELOG.md, DOCS_FILE.md
```

**Types:**
- `feat` - New feature (maps to "Added" in CHANGELOG)
- `fix` - Bug fix (maps to "Fixed")
- `docs` - Documentation only (maps to "Documentation")
- `refactor` - Code refactoring (maps to "Refactor")
- `perf` - Performance improvement (maps to "Performance")
- `test` - Adding tests
- `chore` - Build/tool changes

**Examples:**

```
[Agent 1] feat: Discord Bot slash command /습관조회

Implemented habit lookup with interactive embed display
- Added command registration
- Created embed formatter
- Integrated with Supabase queries

Ref: DISCORD_BOT_SPEC.md
```

```
[Agent 2] perf: Optimize statistics queries with materialized views

Created stats_weekly and stats_monthly views
- Reduced query time from 180ms to 45ms (75% improvement)
- Added automatic refresh on data changes
- Indexed by child_id and week_start_date

Ref: STATISTICS_ROADMAP.md, CHANGELOG.md
```

```
[Agent 3] feat: Template CRUD operations

Added create, read, update, delete functions for habit templates
- Function: createTemplate, loadTemplates, updateTemplate, deleteTemplate
- Location: src/lib/templates.js
- Hook: useTemplate with React Query

Ref: TEMPLATE_SYSTEM_SPEC.md
```

```
[Agent 4] docs: Create codebase structure documentation

Documented src/ directory with file purposes and dependencies
- ASCII diagrams for data flow
- Cross-references between modules
- Updated README.md with new docs

Ref: CODEBASE_STRUCTURE.md
```

---

## Version Release Process

**When creating a new version release:**

1. **Move [Unreleased] to versioned section:**
```markdown
## [0.6.0] - 2025-10-21

### Added
(Copy from Unreleased)

### Changed
(Copy from Unreleased)
```

2. **Update Version History Summary table**

3. **Tag in git:**
```bash
git tag -a v0.6.0 -m "Release v0.6.0: Discord Bot + Statistics + Templates"
git push origin v0.6.0
```

4. **Reset [Unreleased] section:**
```markdown
## [Unreleased]

### Planned Features
- (Add next planned features)
```

---

## Example Entries by Agent

### Agent 1: Discord Bot Developer

```markdown
### Added (Agent 1)
- Discord Bot with 4 slash commands (`/습관조회`, `/습관수정`, `/통계`, `/알림설정`)
- Interactive button components for habit status updates
- Automated daily and weekly reports via cron jobs
- Discord server integration with OAuth2

### Documentation (Agent 1)
- Updated `DISCORD_BOT_SPEC.md` with deployment instructions
- Added `bot/README.md` for local development setup
```

### Agent 2: Statistics Engineer

```markdown
### Added (Agent 2)
- Weekly statistics: success rate, habit-by-habit breakdown, best day analysis
- Monthly statistics: trend analysis, month-over-month comparison
- Yearly statistics: annual summary with milestones
- Materialized views: `stats_weekly`, `stats_monthly` for query optimization

### Performance (Agent 2)
- Reduced statistics query time by 75% (180ms → 45ms)
- Implemented automatic view refresh on data changes
- Added composite indexes on frequently joined columns

### Documentation (Agent 2)
- Created `STATISTICS_IMPLEMENTATION.md` with technical details
- Updated `Dashboard.jsx` with inline JSDoc comments
```

### Agent 3: Template System Developer

```markdown
### Added (Agent 3)
- Habit template CRUD operations (`src/lib/templates.js`)
- Template management UI with create, edit, delete flows
- Week creation from template with one-click apply
- React Query integration for optimistic UI updates

### Changed (Agent 3)
- Refactored `App.jsx` to use template hooks (removed direct Supabase calls)
- Updated habit initialization to support template defaults

### Documentation (Agent 3)
- Added `TEMPLATE_SYSTEM_USAGE.md` - User guide
- Created video tutorial: Template feature walkthrough
```

### Agent 4: Documentation Maintainer

```markdown
### Documentation (Agent 4)
- Created `CODEBASE_STRUCTURE.md` - Complete src/ directory documentation
- Created `AGENT_PROGRESS_TRACKER.md` - Agent task tracking table
- Created `DOCS_REORGANIZATION_PLAN.md` - Documentation cleanup plan
- Enhanced `tests/integration/README.md` with detailed test scenarios
- Updated `CHANGELOG.md` with agent contribution guidelines (this file)

### Changed (Agent 4)
- Reorganized docs/ folder (moved 11 files to appropriate subdirectories)
- Fixed 15 broken cross-reference links
- Archived outdated documentation to `04-completed/`
```

---

**Maintained by**: Agent 4 - Documentation Maintainer
**Last Updated**: 2025-10-13
**Next Review**: Day 8 (2025-10-21)
