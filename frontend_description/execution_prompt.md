# **MISSION: Execute CINERENTAL Frontend Research Tasks - Batch 1 (TASK-001, TASK-002

  TASK-003)**

  **CRITICAL: Start systematic execution of 162 frontend decomposition tasks**

  You are the task-execution-coordinator. Your mission is to execute exactly 3 tasks in this
  session with STRICT quality requirements:

- TASK-001 (architecture analysis) → assign to `architect`
- TASK-002 (dashboard page analysis) → assign to `frontend-playwright-researcher`
- TASK-003 (equipment list analysis) → assign to `frontend-playwright-researcher`

  **Working Directory:** `/Users/anaskin/Github/CINERENTAL/frontend_description/`

## MANDATORY CONTEXT LOADING

  **FIRST - Load these files for complete understanding:**

  1.

  `/Users/anaskin/Github/CINERENTAL/frontend_description/progress/task-execution-tracker.json`
  2. `/Users/anaskin/Github/CINERENTAL/frontend_description/TASK-EXECUTION-INSTRUCTIONS.md`
  3. `/Users/anaskin/Github/CINERENTAL/frontend_description/BATCH-1-REWORK-PROMPT.md`
  4. `/Users/anaskin/Github/CINERENTAL/CLAUDE.md`

## CRITICAL QUALITY REQUIREMENTS

### 1. TOKEN COUNT ENFORCEMENT

- **MINIMUM:** 10,000 tokens per task result
- **NO MAXIMUM LIMIT:** Comprehensive descriptions are encouraged
- **VALIDATION:** Must be verified by auditor for completeness

### 2. REAL PLAYWRIGHT RESEARCH (MANDATORY)

- **MUST:** Use actual MCP Playwright tools at `http://localhost:8000`
- **MUST:** Take real screenshots and save to `results/screenshots/TASK-XXX/`
- **MUST:** Monitor Network tab for real API calls
- **MUST:** Test actual user interactions
- **EVIDENCE:** Screenshot files must exist as proof

### 3. RESULT FORMAT

  Each task MUST save JSON result to: `results/completed/TASK-XXX-result.json`

## SESSION WORKFLOW

  1. **Load Context:** Read tracker and instruction files
  2. **Execute TASK-001:** Assign to `architect` → wait for completion
  3. **Execute TASK-002:** Assign to `frontend-playwright-researcher` → wait for completion
  4. **Execute TASK-003:** Assign to `frontend-playwright-researcher` → wait for completion
  5. **Audit Phase:** Assign to `auditor` → validate all 3 tasks
  6. **Update Tracker:** Mark batch as completed if audit passes
  7. **Report Results:** Provide completion summary and next batch instructions

## AGENT ASSIGNMENT INSTRUCTIONS

  **For EVERY agent include these requirements:**

  TASK EXECUTION REQUIREMENTS:

  1. Save result: results/completed/TASK-XXX-result.json
  2. Playwright research: Test at <http://localhost:8000> (REAL browser testing)
  3. Screenshots: Save to results/screenshots/TASK-XXX/
  4. Focus: Functionality AND Vue3 implementation details
  5. Token count: MINIMUM 10,000 tokens (comprehensive detail encouraged)
  6. Follow schema in TASK-EXECUTION-INSTRUCTIONS.md
  7. Context: CINERENTAL cinema equipment rental system
  8. Architecture: FastAPI backend + Bootstrap frontend → Vue3 migration

## APPLICATION ACCESS

  **Live Application:** `http://localhost:8000`

- Equipment rental management system
- Must be running for Playwright research
- Test data available for realistic testing

## SUCCESS CRITERIA

  This batch is successful ONLY if:

- ✅ All 3 tasks completed with JSON results
- ✅ All results meet minimum 10K token requirement
- ✅ Real Playwright research evidence exists (screenshots)
- ✅ All tasks pass auditor validation
- ✅ Tracker updated with completion status

## FAILURE CONDITIONS

  **STOP and retry** if:

- Any task has <10K tokens
- No screenshot evidence of Playwright research
- Missing JSON result files
- Auditor rejects any task

## START EXECUTION

  Begin immediately by loading the context files, then execute TASK-001 first.

  **Progress Target:** Complete 3/162 tasks (1.85%) in this session.
