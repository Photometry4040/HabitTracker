# Documentation Reorganization Plan

> Agent 4 - Documentation Maintainer
> Date: 2025-10-13
> Version: 1.0

---

## Executive Summary

This document outlines the plan for reorganizing the docs/ folder structure based on a comprehensive analysis of all 44 markdown files. The goal is to improve discoverability, reduce redundancy, and maintain a cleaner documentation architecture.

---

## Current State Analysis

### Total Files: 44 markdown files
- Root level: 11 files
- Subdirectories: 33 files across 7 folders

### Folder Structure (Current)
```
docs/
├── 00-overview/          (3 files) - Technical specifications
├── 01-architecture/      (3 files) - Architecture designs
├── 02-active/            (8 files) - Active development work
├── 03-deployment/        (3 files) - Deployment guides
├── 04-completed/         (12 files) - Archived completed work
├── 05-reviews/           (2 files) - Weekly reviews
├── 06-future/            (2 files) - Future plans
└── (root)                (11 files) - Various documentation
```

---

## Issues Identified

### 1. Duplicate Content

**Issue**: DB_MIGRATION_PLAN_V1_OLD.md vs DB_MIGRATION_PLAN_V2.md
- **Location**: `docs/00-overview/`
- **Problem**: V1 is outdated (Big Bang approach), V2 is current (Strangler Fig)
- **Recommendation**: ARCHIVE V1 to `04-completed/phase0/`
- **Action**: Move `DB_MIGRATION_PLAN_V1_OLD.md` → `04-completed/phase0/DB_MIGRATION_PLAN_V1_OLD.md`

**Issue**: STATISTICS_ROADMAP.md vs STATISTICS_IMPLEMENTATION.md
- **Location**: `docs/` (root level)
- **Problem**: Both cover statistics, but IMPLEMENTATION is the detailed version
- **Recommendation**: Keep ROADMAP for high-level overview, IMPLEMENTATION for details
- **Action**: No change needed, but add cross-references

### 2. Misplaced Files

**Issue**: Root-level files should be categorized
- Files at root: 11 files covering various topics
- **Recommendation**: Move to appropriate subdirectories

**Proposed Moves:**
```
DISCORD_BOT_SPEC.md       → 02-active/ (Agent 1 is working on this)
DISCORD_NOTIFICATIONS.md  → 01-architecture/ (Implementation complete)
DISCORD_STRATEGY.md       → 00-overview/ (Strategic document)
STATISTICS_ROADMAP.md     → 02-active/ (Agent 2 is working on this)
STATISTICS_IMPLEMENTATION.md → 02-active/ (Day 1 complete)
TEMPLATE_SYSTEM_SPEC.md   → 02-active/ (Agent 3 is working on this)
TEMPLATE_SYSTEM_USAGE.md  → 02-active/ (Usage guide)
PARALLEL_DEV_PLAN.md      → 00-overview/ (Strategic planning)
DAY_1_BRIEFING.md         → 02-active/ (Active work)
PROJECT_STATUS.md         → (Keep at root - quick access)
GIT_WORKFLOW.md           → (Keep at root - quick access)
AGENT3_COMPLETION_REPORT.md → 04-completed/ (Agent 3 completion)
```

### 3. Naming Inconsistencies

**Issue**: Mixed naming conventions
- Some files use UPPERCASE (e.g., `PHASE_2_PLAN.md`)
- Some files use lowercase (e.g., `phase0/`)
- Some files use Korean (e.g., `데이터_로딩_문제_해결_완료.md`)

**Recommendation**: Accept current state (no renames for now)
- Renaming files breaks Git history and existing links
- Document naming convention for future files

### 4. Outdated Content

**Files to Review for Currency:**
1. `02-active/WORKSPACE_ORGANIZATION.md` - Check if still relevant
2. `05-reviews/WEEK1_REVIEW.md` - Consider moving to 04-completed
3. `05-reviews/WEEK2_PLAN.md` - Check if still active
4. `04-completed/phase1/PHASE_1_완료_보고서.md` - Should reference new parallel dev

---

## Reorganization Plan

### Phase 1: Immediate Actions (Today - DO NOT DELETE)

**1. Document Audit**
- [x] Read all files in docs/
- [x] Identify duplicates
- [x] Identify misplaced files
- [x] Create this reorganization plan

**2. Create Missing Documentation**
- [ ] `AGENT_PROGRESS_TRACKER.md` (tracking agent work)
- [ ] `CODEBASE_STRUCTURE.md` (code architecture)
- [ ] Enhanced `tests/integration/README.md`

**3. Update CHANGELOG.md**
- [ ] Add agent contribution guidelines
- [ ] Add examples for each change type

### Phase 2: Gradual Migration (Next 3 Days)

**Day 2 (10/15):**
- Move `DISCORD_STRATEGY.md` → `00-overview/`
- Move `PARALLEL_DEV_PLAN.md` → `00-overview/`
- Move `DISCORD_BOT_SPEC.md` → `02-active/`
- Update README.md links

**Day 3 (10/16):**
- Move statistics-related docs → `02-active/`
- Move template-related docs → `02-active/`
- Move `AGENT3_COMPLETION_REPORT.md` → `04-completed/`
- Update README.md links

**Day 4 (10/17):**
- Move `DB_MIGRATION_PLAN_V1_OLD.md` → `04-completed/phase0/`
- Review and update cross-references
- Update all broken links

### Phase 3: Cleanup (Day 8)

**After Parallel Dev Completes:**
- Move completed agent docs to `04-completed/`
- Create new `05-reviews/WEEK3_REVIEW.md`
- Archive old weekly plans

---

## Proposed Final Structure

```
docs/
├── README.md                          # Documentation index (keep updated)
├── PROJECT_STATUS.md                  # Quick project status (root access)
├── GIT_WORKFLOW.md                    # Git guidelines (root access)
│
├── 00-overview/                       # Strategic & specs
│   ├── TECH_SPEC.md
│   ├── DB_MIGRATION_PLAN_V2.md
│   ├── DISCORD_STRATEGY.md            # MOVED from root
│   └── PARALLEL_DEV_PLAN.md           # MOVED from root
│
├── 01-architecture/                   # Design documents
│   ├── PHASE_2_ARCHITECTURE.md
│   ├── REACT_QUERY_CONVENTIONS.md
│   ├── REALTIME_STRATEGY.md
│   └── DISCORD_NOTIFICATIONS.md       # MOVED from root (implementation)
│
├── 02-active/                         # Current work
│   ├── PHASE_2_INDEX.md
│   ├── PHASE_2_PLAN.md
│   ├── PHASE_2_SUMMARY.md
│   ├── PHASE_2_DAY_2_COMPLETE.md
│   ├── PHASE_2_DAY_2_TEST_GUIDE.md
│   ├── BACKFILL_STATUS.md
│   ├── MANUAL_DEPLOYMENT_REQUIRED.md
│   ├── WORKSPACE_ORGANIZATION.md
│   ├── DAY_1_BRIEFING.md              # MOVED from root
│   ├── DISCORD_BOT_SPEC.md            # MOVED from root (Agent 1)
│   ├── STATISTICS_ROADMAP.md          # MOVED from root (Agent 2)
│   ├── STATISTICS_IMPLEMENTATION.md   # MOVED from root (Agent 2)
│   ├── TEMPLATE_SYSTEM_SPEC.md        # MOVED from root (Agent 3)
│   └── TEMPLATE_SYSTEM_USAGE.md       # MOVED from root (Agent 3)
│
├── 03-deployment/                     # Deployment guides
│   ├── DAY_1_2_DEPLOYMENT_GUIDE.md
│   ├── DEPLOY_MIGRATION_013.md
│   └── MIGRATION_USER_SETUP.md
│
├── 04-completed/                      # Archived work
│   ├── phase0/
│   │   ├── PHASE0_RETROSPECTIVE.md
│   │   ├── PHASE_0_PROGRESS.md
│   │   ├── PHASE_0_TODO.md
│   │   ├── CHILDREN_TABLE_DDL_SUMMARY.md
│   │   └── DB_MIGRATION_PLAN_V1_OLD.md # MOVED from 00-overview
│   ├── phase1/
│   │   ├── PHASE1_DAY1_COMPLETE.md
│   │   ├── PHASE_1_TODO.md
│   │   └── PHASE_1_완료_보고서.md
│   ├── issues/
│   │   ├── 데이터_로딩_문제_해결_가이드.md
│   │   └── 데이터_로딩_문제_해결_완료.md
│   ├── setup/
│   │   ├── MCP_SETUP_COMPLETE.md
│   │   └── MCP_SETUP_GUIDE.md
│   └── AGENT3_COMPLETION_REPORT.md    # MOVED from root
│
├── 05-reviews/                        # Weekly retrospectives
│   ├── WEEK1_REVIEW.md
│   └── WEEK2_PLAN.md
│
└── 06-future/                         # Future roadmap
    ├── HOOKS_ROADMAP.md
    └── ORCHESTRATION_PLAN.md
```

---

## File Management Guidelines

### For All Agents

**When Creating New Docs:**
1. Use descriptive, consistent naming (UPPERCASE for specs, lowercase for folders)
2. Place in appropriate folder:
   - Active work → `02-active/`
   - Completed work → `04-completed/`
   - Architecture → `01-architecture/`
   - Strategic plans → `00-overview/`
3. Update `docs/README.md` with new file link
4. Add entry to CHANGELOG.md

**When Moving Docs:**
1. Update all cross-references
2. Update `docs/README.md`
3. Test all links
4. Commit with clear message: `[Agent 4] docs: Move [file] to [location]`

**When Archiving Docs:**
1. Move to appropriate `04-completed/` subfolder
2. Add "ARCHIVED" note at top of file
3. Update README.md
4. Keep file for historical reference (do not delete)

---

## Link Maintenance

### Cross-Reference Strategy

All documentation should use relative links:
```markdown
Good:
[DB Migration Plan](00-overview/DB_MIGRATION_PLAN_V2.md)

Bad:
[DB Migration Plan](/docs/00-overview/DB_MIGRATION_PLAN_V2.md)
```

### Automated Link Checking

**Future Enhancement:**
- Add script to check for broken links
- Run during CI/CD pipeline
- Alert on broken references

---

## Metrics for Success

### Current State
- Total files: 44
- Root-level files: 11 (too many)
- Properly organized: ~70%
- Duplicate content: 2 instances

### Target State (After Reorganization)
- Total files: 47+ (new docs added)
- Root-level files: 3 (README, PROJECT_STATUS, GIT_WORKFLOW)
- Properly organized: 95%
- Duplicate content: 0

### Quality Indicators
- All links working: 100%
- All agent specs in 02-active: 100%
- Completed work archived: 100%
- README.md up-to-date: 100%

---

## Risks & Mitigation

### Risk 1: Breaking Existing Links
**Mitigation**:
- Update all cross-references immediately after moving files
- Test all links before committing
- Keep git history intact (use `git mv`)

### Risk 2: Agent Confusion
**Mitigation**:
- Announce moves in daily sync meetings
- Update DAY_1_BRIEFING.md with new file locations
- Keep this reorganization plan visible

### Risk 3: Merge Conflicts
**Mitigation**:
- Coordinate moves with agents via Slack
- Do moves during low-activity periods (evenings)
- Use atomic commits (one file move per commit)

---

## Approval & Execution

**Reviewed By**: PM Agent (pending)
**Approved By**: PM Agent (pending)
**Execution Start**: Day 2 (2025-10-15)
**Execution Complete**: Day 4 (2025-10-17)

---

## Appendix: File List by Status

### Files to Keep at Root (3)
1. README.md
2. PROJECT_STATUS.md
3. GIT_WORKFLOW.md

### Files to Move (8)
1. DISCORD_STRATEGY.md → 00-overview/
2. PARALLEL_DEV_PLAN.md → 00-overview/
3. DISCORD_BOT_SPEC.md → 02-active/
4. DISCORD_NOTIFICATIONS.md → 01-architecture/
5. STATISTICS_ROADMAP.md → 02-active/
6. STATISTICS_IMPLEMENTATION.md → 02-active/
7. TEMPLATE_SYSTEM_SPEC.md → 02-active/
8. TEMPLATE_SYSTEM_USAGE.md → 02-active/
9. DAY_1_BRIEFING.md → 02-active/
10. AGENT3_COMPLETION_REPORT.md → 04-completed/
11. DB_MIGRATION_PLAN_V1_OLD.md → 04-completed/phase0/

### Files to Create (3)
1. AGENT_PROGRESS_TRACKER.md
2. CODEBASE_STRUCTURE.md
3. DOCS_REORGANIZATION_PLAN.md (this file)

---

**Last Updated**: 2025-10-13
**Next Review**: Day 8 (after parallel dev completes)
**Maintained By**: Agent 4 - Documentation Maintainer
