# BATCH EXECUTION SYSTEM FOR 162 TASKS

## Problem: Context window overflow after 3-4 tasks

## Solution: Batch execution system with 3 tasks per session

---

## Batch System Overview

### Task Distribution

- **54 batches** with 3 tasks each
- **1 session = 1 batch** (3 tasks + audit)
- After each batch: **new session with clean context**

---

## Batch 1 Prompt (Tasks 1-3)

```markdown
**MISSION: Execute CINERENTAL Tasks Batch 1 (TASK-001, TASK-002, TASK-003)**

**BATCH EXECUTION MODE: 3 tasks maximum per session to prevent context overflow**

You are the task-execution-coordinator. Execute exactly 3 tasks in this session:
- TASK-001 (architecture) → `architect`
- TASK-002 (page analysis) → `frontend-playwright-researcher`
- TASK-003 (page analysis) → `frontend-playwright-researcher`

**Working Directory:** `/Users/anaskin/Github/CINERENTAL/frontend_description/`

**MANDATORY FOR EACH TASK ASSIGNMENT:**
Include these instructions with every specialist agent:

```

TASK EXECUTION REQUIREMENTS:

1. Save result: `results/completed/TASK-XXX-result.json`
2. Playwright research: Test at `http://localhost:8000`
3. Focus: Functionality only (WHAT it does, NOT HOW it looks)
4. Token count: 10,000-15,000 tokens
5. Follow schema in `TASK-EXECUTION-INSTRUCTIONS.md`

```text

**SESSION WORKFLOW:**
1. Load `task-execution-tracker.json`
2. Execute TASK-001 → audit → mark approved
3. Execute TASK-002 → audit → mark approved
4. Execute TASK-003 → audit → mark approved
5. Update tracker: currentBatch = 2, completedBatches = [1]
6. **STOP and provide handoff instructions**
```

---

## Handoff Template (after each batch)

```markdown
**BATCH 1 COMPLETED ✅**

**Results:**
- TASK-001: ✅ Approved (architecture specification created)
- TASK-002: ✅ Approved (page analysis completed)
- TASK-003: ✅ Approved (page analysis completed)

**Files Updated:**
- `task-execution-tracker.json` → currentBatch = 2
- `results/completed/TASK-001-result.json`
- `results/completed/TASK-002-result.json`
- `results/completed/TASK-003-result.json`

**NEXT SESSION INSTRUCTIONS:**
Create new session with this prompt for Batch 2:

"**MISSION: Execute CINERENTAL Tasks Batch 2 (TASK-004, TASK-005, TASK-006)**

Load `/Users/anaskin/Github/CINERENTAL/frontend_description/progress/task-execution-tracker.json` and continue with next 3 tasks..."

**Progress: 3/162 tasks completed (1.85%)**
```

---

## Batch Distribution Table

| Batch | Tasks | Types | Agent Assignment |
|-------|--------|-------|------------------|
| **1** | 001-003 | architecture, page, page | architect, frontend-playwright-researcher |
| **2** | 004-006 | page, page, page | frontend-playwright-researcher |
| **3** | 007-009 | page, page, page | frontend-playwright-researcher |
| **4** | 010-012 | page, page, section | frontend-playwright-researcher |
| **5** | 013-015 | section, section, section | frontend-playwright-researcher |
| ... | ... | ... | ... |
| **54** | 160-162 | section, section | frontend-playwright-researcher |

---

## Generic Batch Prompt Template

```markdown
**MISSION: Execute CINERENTAL Tasks Batch {N} (TASK-{X}, TASK-{Y}, TASK-{Z})**

**Working Directory:** `/Users/anaskin/Github/CINERENTAL/frontend_description/`

**Current Batch:** {N}/54
**Progress:** {completed}/162 tasks completed

**Tasks for this session:**
- TASK-{X} ({type}) → {agent}
- TASK-{Y} ({type}) → {agent}
- TASK-{Z} ({type}) → {agent}

[Include standard execution instructions...]

**After completing all 3 tasks: Update tracker and provide handoff for Batch {N+1}**
```

---

## System Benefits

1. **Context control** - maximum 3 tasks per session
2. **Clear state** - each batch is independent
3. **Easy restart** - simple continuation instructions
4. **Progress tracking** - clear 3/162, 6/162, 9/162...
5. **Flexibility** - can pause and continue anytime

**Ready to use! Start with Batch 1.**
