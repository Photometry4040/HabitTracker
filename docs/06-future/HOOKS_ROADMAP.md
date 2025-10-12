# Hooks Roadmap - Phase 1 Implementation

**Status**: 📋 Deferred to Phase 1
**Created**: 2025-10-12
**Reference**: User's Proposal #2
**Target Activation**: After Phase 0 completion (Week 14)

---

## Overview

This document outlines the plan to implement automated quality checks via hooks in **Phase 1** of the migration.

### Why Phase 1, Not Phase 0?

**Phase 0 Focus**: Shadow schema creation and backfill
- Minimal application code changes
- Focus on database DDL and migration scripts
- Manual quality checks sufficient for current velocity
- Fast iteration more important than automation

**Phase 1 Focus**: Dual-write implementation + cutover preparation
- Heavy application code changes (React components, database calls)
- More risk of bugs and regressions
- Automated checks prevent broken code from being committed
- Hooks provide safety net for complex changes

---

## Current Project Status

### ✅ Available Tools
- **ESLint**: Configured in package.json
  - File: [package.json](package.json) - `"lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0"`
  - Can be run manually: `npm run lint`

- **Vite Build**: Production build available
  - Command: `npm run build`
  - Validates: Import errors, syntax issues, missing dependencies

### ❌ Missing Tools
- **Prettier**: Not configured
  - Need to add: `.prettierrc`, `.prettierignore`
  - Need to install: `prettier` package

- **TypeScript**: Not used (JavaScript project)
  - Not applicable for this codebase

- **Testing**: No test framework configured
  - No Jest, Vitest, or other test runner
  - Would need to add if testing is desired

---

## Phase 1 Implementation Plan

### Milestone 1: Pre-Commit Hooks (Week 14-15)

#### Goal
Prevent broken code from being committed

#### Implementation Steps

**1. Install Husky** (5 min)
```bash
npm install --save-dev husky
npx husky install
npm pkg set scripts.prepare="husky install"
```

**2. Create Pre-Commit Hook** (10 min)

File: `.husky/pre-commit`
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Lint staged files
echo "  📋 ESLint..."
npm run lint

# Check build
echo "  🏗️  Build check..."
npm run build

echo "✅ Pre-commit checks passed!"
```

**3. Configure Lint-Staged** (10 min)

Install:
```bash
npm install --save-dev lint-staged
```

File: `.lintstagedrc.json`
```json
{
  "*.{js,jsx}": [
    "eslint --fix",
    "git add"
  ]
}
```

Update pre-commit:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run build
```

**Estimated Time**: 25 minutes
**Value**: Catch 90% of common errors before commit

---

### Milestone 2: Add Prettier (Week 15-16)

#### Goal
Consistent code formatting across project

#### Implementation Steps

**1. Install Prettier** (2 min)
```bash
npm install --save-dev prettier
```

**2. Create Prettier Config** (5 min)

File: `.prettierrc`
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "avoid"
}
```

File: `.prettierignore`
```
dist/
node_modules/
.env
*.md
*.json
```

**3. Add Format Script** (1 min)

Update `package.json`:
```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{js,jsx}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx}\""
  }
}
```

**4. Update Lint-Staged** (2 min)

File: `.lintstagedrc.json`
```json
{
  "*.{js,jsx}": [
    "prettier --write",
    "eslint --fix",
    "git add"
  ]
}
```

**5. Format Existing Code** (10 min)
```bash
npm run format
git add .
git commit -m "style: Apply Prettier formatting"
```

**Estimated Time**: 20 minutes
**Value**: No more formatting debates, consistent style

---

### Milestone 3: Claude Code Hooks (Week 16-17) - Experimental

#### Goal
Auto-run checks when Claude modifies code

#### Current Status
- Claude Code supports `.claude/hooks/` directory
- Limited documentation on custom hooks
- `user-prompt-submit-hook` is primary hook type

#### Investigation Required

**Questions to Answer**:
1. Can we create `post-tool-use` hooks that trigger after Edit/Write tools?
2. What's the hook interface/API?
3. Can hooks run async commands (ESLint, Prettier)?
4. How to handle hook failures?

#### Proposed Hook Structure

File: `.claude/hooks/post-tool-use.sh`
```bash
#!/usr/bin/env sh

# Capture tool output
TOOL_NAME=$1
FILE_PATH=$2

# Only run on JS/JSX files
if [[ "$FILE_PATH" =~ \.(js|jsx)$ ]]; then
  echo "🔍 Running quality checks on $FILE_PATH..."

  # Format with Prettier
  npx prettier --write "$FILE_PATH"

  # Lint with ESLint
  npx eslint --fix "$FILE_PATH"

  # Log results
  echo "✅ Checks complete" >> .claude/logs/post-tool-use.log
fi
```

**Fallback**: If Claude Code hooks are too limited, skip this milestone

**Estimated Time**: 2 hours (investigation + implementation)
**Value**: Catch issues immediately as Claude writes code

---

## Original Proposal vs Roadmap

### Original Proposal Elements

1. ✅ **post-tool-use Hook**
   - ESLint execution ✅
   - Prettier formatting ✅
   - TypeScript type check ❌ (Not applicable - JS project)

2. ✅ **pre-commit Hook**
   - Test changed files ⚠️ (No tests currently - could add in Phase 2)
   - Build verification ✅

3. ✅ **Hook Files Location**
   - `.claude/hooks/` directory ✅

4. ✅ **Execution Logs**
   - `.claude/logs/` directory ✅

### Adjustments Made

| Original | Roadmap | Reason |
|----------|---------|--------|
| TypeScript checks | Removed | JavaScript project |
| Test execution | Deferred to Phase 2 | No test framework yet |
| Immediate implementation | Phase 1 | Phase 0 focus on DDL |
| Claude hooks first | Git hooks first | Proven solution first |

---

## Implementation Priority

### High Priority (Must Have)
1. ✅ Husky + pre-commit hooks
2. ✅ ESLint on staged files
3. ✅ Build verification
4. ✅ Prettier formatting

### Medium Priority (Nice to Have)
1. 🟡 Claude Code post-tool-use hooks (if supported)
2. 🟡 Lint-staged optimization
3. 🟡 Pre-push hooks (run full test suite)

### Low Priority (Future)
1. 🔵 Testing framework (Jest/Vitest)
2. 🔵 Coverage thresholds
3. 🔵 Commit message linting (commitlint)

---

## Testing the Hooks

### Validation Checklist

**After Milestone 1** (Pre-Commit Hooks):
- [ ] Commit fails if ESLint errors exist
- [ ] Commit fails if build breaks
- [ ] Can bypass with `--no-verify` flag
- [ ] Hook runs in < 10 seconds

**After Milestone 2** (Prettier):
- [ ] Code auto-formats on commit
- [ ] Consistent style across all files
- [ ] No manual formatting needed
- [ ] Existing code reformatted successfully

**After Milestone 3** (Claude Hooks):
- [ ] File auto-lints after Claude edits
- [ ] File auto-formats after Claude writes
- [ ] Logs capture all executions
- [ ] No performance impact on Claude

---

## Rollback Plan

If hooks cause problems:

### Temporary Disable
```bash
# Disable Husky
npm pkg delete scripts.prepare

# Skip hooks on next commit
git commit --no-verify
```

### Permanent Remove
```bash
# Uninstall Husky
npm uninstall husky
rm -rf .husky

# Uninstall lint-staged
npm uninstall lint-staged
rm .lintstagedrc.json

# Remove Claude hooks
rm -rf .claude/hooks
```

---

## Metrics to Track

After implementation, measure:

1. **Commit Failure Rate**
   - Target: < 5% (hooks catch real issues)
   - Too high: Hooks too strict or buggy
   - Too low: Hooks not catching issues

2. **Hook Execution Time**
   - Target: < 10 seconds for pre-commit
   - Monitor: Build time may increase

3. **Code Quality Improvements**
   - Lint errors in new commits: Should trend to 0
   - Style inconsistencies: Should disappear
   - Build failures: Caught before push

4. **Developer Satisfaction**
   - Are hooks helpful or annoying?
   - Do they prevent real bugs?
   - Should we adjust rules?

---

## Phase Alignment

### Phase 0 (Current - Week 1-14)
- ❌ No hooks (manual checks)
- Focus: Schema creation, backfill
- Quality: Code reviews, verify scripts

### Phase 1 (Week 14-28)
- ✅ Git hooks (Milestone 1 & 2)
- Focus: Dual-write implementation
- Quality: Automated lint + build checks

### Phase 2 (Week 28-42)
- ✅ Testing hooks (if tests added)
- ✅ Claude Code hooks (Milestone 3)
- Focus: Cutover to new schema
- Quality: Full automation

### Phase 3 (Week 42-56)
- ✅ All hooks mature and optimized
- Focus: Old schema cleanup
- Quality: Zero tolerance for regressions

---

## Decision Log

### Decision 1: Phase 1 Activation
**When**: 2025-10-12
**What**: Defer hooks to Phase 1
**Why**: Phase 0 has minimal code changes, manual checks sufficient
**Who**: Based on user's proposal #2

### Decision 2: Git Hooks First
**When**: 2025-10-12
**What**: Implement Husky before Claude hooks
**Why**: Git hooks are proven, Claude hooks are experimental
**Who**: Technical assessment

### Decision 3: Skip TypeScript
**When**: 2025-10-12
**What**: No TypeScript checks in hooks
**Why**: Project uses JavaScript, not TypeScript
**Who**: Project architecture constraint

### Decision 4: Defer Testing
**When**: 2025-10-12
**What**: No test hooks until tests exist
**Why**: No testing framework configured yet
**Who**: Current project status

---

## Next Steps

### Before Phase 1 Starts
1. ✅ Document this roadmap (HOOKS_ROADMAP.md)
2. ✅ Add to ORCHESTRATION_PLAN.md references
3. ✅ Set reminder to review at Phase 0 completion

### At Phase 1 Start (Week 14)
1. Review this roadmap with user
2. Implement Milestone 1 (Husky + pre-commit)
3. Test hooks on first few Phase 1 commits
4. Implement Milestone 2 (Prettier)
5. Monitor effectiveness for 1 week

### Mid-Phase 1 (Week 18-20)
1. Evaluate hook effectiveness
2. Consider Milestone 3 (Claude hooks) if needed
3. Add testing framework if desired
4. Optimize hook performance

---

**Last Updated**: 2025-10-12
**Status**: 📋 Plan Document (Deferred to Phase 1)
**Activation Date**: ~2025-12-24 (Week 14, after Phase 0 complete)
**Owner**: To be reviewed with user at Phase 1 start
