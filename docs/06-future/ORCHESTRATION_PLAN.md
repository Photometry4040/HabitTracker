# Orchestration Plan - Phase 0 Day 4+

**Status**: 📋 Plan Document (Not Yet Active)
**Activation**: After Day 3 completes (T0.10 unblocked)
**Created**: 2025-10-12
**Reference**: User's Proposal #1 (수정된 버전)

---

## Overview

Starting from **Day 4** (T0.11+), we will use a structured orchestration workflow to maintain high quality and traceability while moving efficiently.

### Key Principles

1. **Specialized Agent Workflow**: DB Architect → Code Reviewer → Manual Deployment → Verification
2. **Single-Message Efficiency**: Launch multiple agents in parallel when possible
3. **Manual Deployment**: Supabase Dashboard execution (MCP cannot run SQL queries)
4. **Automatic Verification**: Scripts auto-run after deployment
5. **Progress Tracking**: Real-time updates to PHASE_0_PROGRESS.md

---

## Workflow Template

### Step 1: Task Definition (TodoWrite)
- Create detailed todo items for the task
- Mark task as "in_progress" before starting
- Track subtasks if complex

**Example**:
```javascript
TodoWrite([
  {
    content: "Create constraint validation scripts",
    status: "in_progress",
    activeForm: "Creating constraint validation scripts"
  },
  {
    content: "Code review validation scripts",
    status: "pending",
    activeForm: "Reviewing validation scripts"
  },
  {
    content: "Deploy and test validation",
    status: "pending",
    activeForm: "Deploying and testing validation"
  }
])
```

### Step 2: DB Architect Work
- Design DDL, migration scripts, or database changes
- Follow shadow schema principles (Phase 0)
- Use NOT VALID constraints
- Use CONCURRENTLY indexes (with Dashboard-compatible fallback)
- Add source_version tracking where applicable

**Output**: Migration files or scripts in `supabase/migrations/` or `scripts/`

### Step 3: Code Review (Same Message)
- Launch `code-reviewer` agent immediately after DB Architect completes
- Run in **parallel** if possible (same message, multiple Task calls)
- Review for:
  - SQL injection vulnerabilities
  - Index strategy optimization
  - Performance bottlenecks (10x, 100x, 1000x growth)
  - RLS policy security
  - Data model design

**Output**: Approval or recommendations for fixes

### Step 4: Manual Deployment
- User executes SQL in Supabase Dashboard SQL Editor
- Or user runs deployment scripts: `node scripts/xxx.js`
- **Why Manual**: Supabase MCP only supports file creation (push_files), not SQL execution

**Deployment Instructions**:
1. Open: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/sql/new
2. Copy-paste SQL from migration file
3. Execute
4. Report success/errors to Claude

### Step 5: Automatic Verification
- Claude runs verification script automatically
- Script checks: table exists, indexes created, constraints active, record counts
- Report results immediately

**Example**:
```bash
node scripts/verify-xxx.js
```

### Step 6: Update Progress
- Mark todos as completed
- Update PHASE_0_PROGRESS.md with:
  - Task completion timestamp
  - Files created
  - Key features
  - Code review results
  - Deployment status
  - Any blockers encountered

---

## Orchestration Mode: Parallel vs Sequential

### Parallel Agent Launch (Preferred)

When tasks are **independent**, launch agents in **single message**:

```markdown
I'm going to launch DB Architect and Code Reviewer in parallel:

<Task tool call 1: db-architect-agent>
<Task tool call 2: code-reviewer-agent>
```

**When to use**:
- Code review can start on already-completed work
- Multiple independent scripts to create
- Verification + documentation updates

### Sequential Agent Launch

When tasks **depend on previous results**:

```markdown
Step 1: Launch DB Architect
<Task tool call: db-architect-agent>

[Wait for result]

Step 2: Launch Code Reviewer with DB Architect output
<Task tool call: code-reviewer-agent>
```

**When to use**:
- Code review needs completed DDL
- Deployment needs reviewed code
- Verification needs deployed schema

---

## Example: Day 4 Task Execution

### T0.11: Constraint Validation Scripts

**Step 1: Todo Setup**
```javascript
TodoWrite([
  { content: "Create validate-constraints.js script", status: "in_progress", activeForm: "Creating validation script" },
  { content: "Code review validation script", status: "pending", activeForm: "Reviewing validation script" },
  { content: "Run validation on shadow schema", status: "pending", activeForm: "Running validation" }
])
```

**Step 2: DB Architect Work**
- Create `scripts/validate-constraints.js`
- Script checks all NOT VALID constraints
- Script validates data integrity
- Script measures validation time

**Step 3: Code Review (Parallel)**
```markdown
Launching code-reviewer agent to review validate-constraints.js:
<Task tool="code-reviewer">
```

**Step 4: User Executes**
```bash
node scripts/validate-constraints.js
```

**Step 5: Report Results**
```markdown
✅ Validation complete!
- children constraints: VALID
- weeks constraints: VALID
- habits constraints: VALID
...
```

**Step 6: Update Progress**
- Mark todos completed
- Update PHASE_0_PROGRESS.md Day 4 section

---

## Modified Aspects from Original Proposal

### ✅ Accepted from Proposal

1. **Orchestration Mode**: DB Architect → Code Reviewer workflow
2. **Progress Tracking**: Real-time PHASE_0_PROGRESS.md updates
3. **Quality Gates**: Code review before deployment
4. **Traceability**: Each step documented and approved

### ⚠️ Modified from Proposal

1. **MCP Auto-Deployment** → **Manual Deployment**
   - **Original**: "Supabase MCP로 실행"
   - **Modified**: User executes in Dashboard or runs scripts
   - **Reason**: MCP only supports GitHub file operations, not Supabase SQL execution

2. **Approval Gates** → **Streamlined Approval**
   - **Original**: "각 단계마다 결과를 보고하고 다음 단계 진행 전 승인을 받아주세요"
   - **Modified**: Report after each phase, continue unless user stops
   - **Reason**: Balance between thoroughness and velocity

3. **Code Reviewer Timing** → **Parallel When Possible**
   - **Original**: Sequential (Architect completes → then Reviewer)
   - **Modified**: Launch in same message when possible
   - **Reason**: Efficiency - reviewers can work on completed artifacts

---

## Benefits of This Approach

### Quality Assurance
- ✅ Specialized agents for design and review
- ✅ Security vulnerabilities caught before deployment
- ✅ Performance issues predicted early

### Traceability
- ✅ Every decision documented in PHASE_0_PROGRESS.md
- ✅ Code review results preserved
- ✅ Deployment history tracked

### Efficiency
- ✅ Parallel agent launches where possible
- ✅ Automated verification scripts
- ✅ No waiting for unnecessary approvals

### Flexibility
- ✅ User controls deployment timing
- ✅ Can pause between phases
- ✅ Can roll back if issues found

---

## Deferred to Phase 1

### Hooks (from Proposal #2)

**Original Request**:
- post-tool-use Hook (ESLint, Prettier, TypeScript)
- pre-commit Hook (tests, build)

**Decision**: 🟡 Defer to Phase 1

**Reasons**:
1. TypeScript not used in project (JavaScript codebase)
2. Prettier not configured
3. Phase 0 focus: Shadow schema creation (minimal code changes)
4. Manual quality checks sufficient for current velocity

**Phase 1 Plan**:
- Set up Husky for Git hooks
- Configure Prettier for code formatting
- Add pre-commit lint + build checks
- See: HOOKS_ROADMAP.md (to be created)

---

## Activation Checklist

Before activating orchestration mode (Day 4):

- [x] Day 3 backfill scripts completed
- [ ] T0.10 unblocked (user_id provided)
- [ ] Backfill execution successful
- [ ] verify-backfill.js confirms data integrity
- [ ] PHASE_0_PROGRESS.md updated with Day 3 results
- [ ] User confirms ready for Day 4

---

## Quick Reference

### When to Launch DB Architect
- Creating DDL (tables, indexes, constraints)
- Writing migration scripts
- Writing backfill/validation scripts
- Designing database changes

### When to Launch Code Reviewer
- After DB Architect completes DDL
- Before user deploys to Supabase
- To validate security and performance
- To catch design flaws early

### When to Update Progress
- After completing each todo item
- After code review approval
- After successful deployment
- When blockers are encountered
- End of each work session

---

**Last Updated**: 2025-10-12
**Status**: 📋 Ready for Day 4 activation
**Next Review**: After T0.10 completes
