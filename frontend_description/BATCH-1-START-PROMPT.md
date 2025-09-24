# BATCH 1 EXECUTION PROMPT (COMPLETE VERSION)

## MISSION: Execute CINERENTAL Tasks Batch 1 (TASK-001, TASK-002, TASK-003)

**BATCH EXECUTION MODE: 3 tasks maximum per session to prevent context overflow**

You are the task-execution-coordinator. Execute exactly 3 tasks in this session:
- TASK-001 (architecture) → `architect`
- TASK-002 (page analysis) → `frontend-playwright-researcher`
- TASK-003 (page analysis) → `frontend-playwright-researcher`

**Working Directory:** `/Users/anaskin/Github/CINERENTAL/frontend_description/`

## REQUIRED CONTEXT FILES

**MANDATORY - Load these files for complete context:**

1. **`/Users/anaskin/Github/CINERENTAL/frontend_description/progress/task-execution-tracker.json`**
   - Current task statuses and batch tracking
   - Agent workload distribution
   - Audit tracking system

2. **`/Users/anaskin/Github/CINERENTAL/frontend_description/masterplan.md`**
   - Overall project context and objectives
   - Task creation methodology and standards
   - Quality requirements (10-15K tokens, functionality focus)

3. **`/Users/anaskin/Github/CINERENTAL/frontend_description/inventory/pages-inventory.json`**
   - Application page structure
   - Navigation and user flows

4. **`/Users/anaskin/Github/CINERENTAL/CLAUDE.md`**
   - CINERENTAL project architecture
   - Backend API structure and business logic
   - Technology stack and patterns

5. **`/Users/anaskin/Github/CINERENTAL/frontend_description/TASK-EXECUTION-INSTRUCTIONS.md`**
   - JSON result schema requirements
   - Playwright research methodology
   - Quality standards and token requirements

## APPLICATION ACCESS

**Live Application:** `http://localhost:8000`
- Equipment rental management system
- Available for Playwright research
- Test data populated for analysis

## MANDATORY TASK ASSIGNMENT INSTRUCTIONS

**Include these with EVERY specialist agent:**

```
TASK EXECUTION REQUIREMENTS:
1. Save result: `results/completed/TASK-XXX-result.json`
2. Playwright research: Test at `http://localhost:8000`
3. Focus: Functionality only (WHAT it does, NOT HOW it looks)
4. Token count: 10,000-15,000 tokens
5. Follow schema in `TASK-EXECUTION-INSTRUCTIONS.md`
6. Context: CINERENTAL cinema equipment rental system
7. Architecture: FastAPI backend + Bootstrap frontend → Vue3 migration
8. Business logic: Equipment status workflows, barcode system, soft deletes
```

## SESSION WORKFLOW

1. **Initialize:** Load `task-execution-tracker.json` and verify context
2. **Execute TASK-001:** Assign to `architect` with full instructions → complete task
3. **Execute TASK-002:** Assign to `frontend-playwright-researcher` → complete task
4. **Execute TASK-003:** Assign to `frontend-playwright-researcher` → complete task
5. **Audit Phase:** Launch `auditor` agent to validate all 3 completed tasks
6. **Update Tracker:** Mark currentBatch = 2, add batch 1 to completedBatches
7. **Generate Handoff:** Provide instructions for Batch 2 in new session

## AGENT ASSIGNMENTS WITH CONTEXT

**TASK-001 (Architecture):**
- Agent: `architect` (global)
- Context: Overall CINERENTAL system architecture
- Focus: Equipment rental workflows, user roles, system components
- Research: Navigate `http://localhost:8000` to understand system structure

**TASK-002 (Dashboard Page):**
- Agent: `frontend-playwright-researcher` (local)
- Context: Main dashboard at `http://localhost:8000/`
- Focus: Navigation, stats, user workflows
- Research: Full Playwright analysis of dashboard functionality
- **Required Tools:** MCP Playwright (browser navigation, screenshots, interaction testing)

**TASK-003 (Equipment List Page):**
- Agent: `frontend-playwright-researcher` (local)
- Context: Equipment management at `http://localhost:8000/equipment`
- Focus: Search, filters, table, actions, pagination
- Research: Complete interaction testing with Playwright
- **Required Tools:** MCP Playwright (browser navigation, screenshots, interaction testing)

**AUDIT PHASE:**
- Agent: `auditor`
- Context: Validate all 3 completed task results
- Focus: Quality check, completeness verification, token count validation
- Requirements:
  - Verify JSON schema compliance
  - Check 10-15K token requirement
  - Validate Playwright research completion
  - Ensure functionality focus (not design)
  - Approve or request revisions

## SUCCESS CRITERIA

After completing this batch:
- 3 JSON result files in `results/completed/`
- All tasks audited and approved by `auditor` agent
- Task tracker updated with batch completion and audit results
- All tasks meet 10-15K token requirement
- Functionality-focused specifications (not design)
- Playwright research completed with screenshots and API monitoring
- Ready handoff instructions for Batch 2

## CRITICAL REQUIREMENTS FOR AGENTS

**For `frontend-playwright-researcher`:**
- MUST have access to MCP Playwright tools:
  - `mcp__playwright__browser_navigate` - Navigate to pages
  - `mcp__playwright__browser_snapshot` - Take page snapshots
  - `mcp__playwright__browser_click` - Click elements
  - `mcp__playwright__browser_take_screenshot` - Capture screenshots
  - `mcp__playwright__browser_network_requests` - Monitor API calls
  - `mcp__playwright__browser_fill_form` - Test form interactions
- MUST perform actual browser testing, not just code analysis
- MUST document real behavior from browser interactions

**For `auditor`:**
- MUST validate each task result against schema
- MUST check token count compliance (10-15K tokens)
- MUST verify Playwright research was actually conducted
- MUST ensure functionality focus over design details
- MUST approve/reject each task with quality scores

## HANDOFF TEMPLATE

Provide this format after completing all 3 tasks:

```
**BATCH 1 COMPLETED ✅**

**Progress: 3/162 tasks (1.85%)**

**Results:**
- TASK-001: ✅ Architecture specification
- TASK-002: ✅ Dashboard page analysis
- TASK-003: ✅ Equipment list analysis

**Next Session Prompt for Batch 2:**
[Include complete Batch 2 prompt with context files]
```

Begin execution immediately with TASK-001.
