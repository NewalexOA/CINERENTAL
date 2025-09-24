# BATCH 1 REWORK PROMPT (ENHANCED VERSION)

## MISSION: Re-execute CINERENTAL Tasks Batch 1 with STRICT Quality Standards

**CRITICAL: Previous attempt FAILED audit - all tasks rejected for quality issues**

**AUDIT RESULTS:**
- TASK-001: 65/100 (Token count fraud: 90% inflation)
- TASK-002: 55/100 (No real Playwright research)
- TASK-003: 60/100 (Missing component details)

**BATCH EXECUTION MODE: 3 tasks maximum per session**

You are the task-execution-coordinator. Execute exactly 3 tasks with ENHANCED requirements:
- TASK-001 (architecture) → `architect` + STRICT validation
- TASK-002 (page analysis) → `frontend-playwright-researcher` + REAL Playwright
- TASK-003 (page analysis) → `frontend-playwright-researcher` + REAL Playwright

**Working Directory:** `/Users/anaskin/Github/CINERENTAL/frontend_description/`

## CRITICAL QUALITY REQUIREMENTS (NON-NEGOTIABLE)

### 1. TOKEN COUNT ENFORCEMENT
- **MINIMUM:** 10,000 tokens per task
- **MAXIMUM:** 15,000 tokens per task
- **VALIDATION:** Use character count tools to verify
- **FRAUD DETECTION:** Auditor will validate actual content length

### 2. REAL PLAYWRIGHT RESEARCH (MANDATORY)
- **MUST:** Use actual MCP Playwright tools
- **MUST:** Take real screenshots (save to results/screenshots/)
- **MUST:** Monitor Network tab and document real API calls
- **MUST:** Perform actual browser interactions
- **EVIDENCE:** Screenshots, API logs, interaction videos

### 3. TECHNICAL DEPTH REQUIREMENTS
- **Component Structure:** Detailed Vue3 component specifications
- **Props/Events:** Complete interface definitions
- **State Management:** Pinia store patterns
- **API Integration:** Real request/response examples
- **Error Handling:** Actual error scenarios and recovery

## REQUIRED CONTEXT FILES

**MANDATORY - Load these files for complete context:**

1. **`/Users/anaskin/Github/CINERENTAL/frontend_description/progress/task-execution-tracker.json`**
   - Shows Batch 1 FAILED audit results
   - Quality issues that must be addressed

2. **`/Users/anaskin/Github/CINERENTAL/frontend_description/masterplan.md`**
   - Overall project context and objectives
   - Quality requirements and standards

3. **`/Users/anaskin/Github/CINERENTAL/frontend_description/inventory/pages-inventory.json`**
   - Application page structure

4. **`/Users/anaskin/Github/CINERENTAL/CLAUDE.md`**
   - CINERENTAL project architecture
   - Backend API structure and business logic

5. **`/Users/anaskin/Github/CINERENTAL/frontend_description/TASK-EXECUTION-INSTRUCTIONS.md`**
   - JSON result schema requirements
   - Enhanced with strict validation

## APPLICATION ACCESS

**Live Application:** `http://localhost:8000`
- Equipment rental management system
- MUST be running for actual Playwright research
- Test data populated for real interaction testing

## ENHANCED TASK ASSIGNMENT INSTRUCTIONS

**Include these with EVERY specialist agent:**

```
STRICT TASK EXECUTION REQUIREMENTS:
1. Save result: `results/completed/TASK-XXX-result.json`
2. REAL Playwright research: Use actual MCP tools at `http://localhost:8000`
3. EVIDENCE: Save screenshots to `results/screenshots/TASK-XXX/`
4. Focus: Functionality AND implementation details (Vue3 ready)
5. Token count: EXACTLY 10,000-15,000 tokens (verified)
6. Follow enhanced schema in `TASK-EXECUTION-INSTRUCTIONS.md`
7. Context: CINERENTAL cinema equipment rental system
8. Architecture: FastAPI backend + Bootstrap frontend → Vue3 migration
9. Business logic: Equipment status workflows, barcode system, soft deletes
10. COMPONENT SPECS: Detailed Vue3 component structure with props/events
```

## SESSION WORKFLOW (ENHANCED)

1. **Initialize:** Load `task-execution-tracker.json` and verify failed audit
2. **Execute TASK-001:** Assign to `architect` → VALIDATE content → complete
3. **Execute TASK-002:** Assign to `frontend-playwright-researcher` → REAL Playwright → complete
4. **Execute TASK-003:** Assign to `frontend-playwright-researcher` → REAL Playwright → complete
5. **STRICT AUDIT:** Launch `auditor` with enhanced validation criteria
6. **Update Tracker:** Only if ALL tasks pass audit
7. **Generate Handoff:** Only after successful audit approval

## AGENT ASSIGNMENTS WITH ENHANCED CONTEXT

**TASK-001 (Architecture - REWORK):**
- Agent: `architect`
- Context: Overall CINERENTAL system architecture
- Focus: Equipment rental workflows + Vue3 component architecture
- Research: Navigate `http://localhost:8000` for real system understanding
- **ENHANCED:** Must include detailed component tree for Vue3 migration
- **REQUIRED TOOLS:** Browser navigation, codebase analysis
- **DELIVERABLE:** 10-15K tokens with actual architecture analysis

**TASK-002 (Dashboard Page - REWORK):**
- Agent: `frontend-playwright-researcher`
- Context: Main dashboard at `http://localhost:8000/`
- Focus: Navigation, stats, user workflows + Vue component structure
- Research: REAL Playwright analysis with actual screenshots
- **ENHANCED:** Must include Vue3 component breakdown with props/events
- **REQUIRED TOOLS:** ALL MCP Playwright tools (navigate, screenshot, click, monitor)
- **EVIDENCE:** Screenshots in `results/screenshots/TASK-002/`
- **DELIVERABLE:** 10-15K tokens with real research evidence

**TASK-003 (Equipment List Page - REWORK):**
- Agent: `frontend-playwright-researcher`
- Context: Equipment management at `http://localhost:8000/equipment`
- Focus: Search, filters, table, actions + Vue component specifications
- Research: Complete real interaction testing with Playwright
- **ENHANCED:** Must include detailed component structure for Vue3
- **REQUIRED TOOLS:** ALL MCP Playwright tools with real API monitoring
- **EVIDENCE:** Screenshots in `results/screenshots/TASK-003/`
- **DELIVERABLE:** 10-15K tokens with comprehensive component specs

**STRICT AUDIT PHASE:**
- Agent: `auditor`
- Context: Validate ALL 3 reworked tasks against enhanced criteria
- Focus: Quality enforcement, evidence validation, completeness
- Requirements:
  - Verify ACTUAL token count (character counting)
  - Validate REAL Playwright evidence exists
  - Check Vue3 component specification completeness
  - Ensure implementation-ready technical depth
  - Approve only if ALL criteria met

## CRITICAL REQUIREMENTS FOR AGENTS

**For `frontend-playwright-researcher` (ENHANCED):**

- **MUST have access to MCP Playwright tools:**
  - `mcp__playwright__browser_navigate` - Navigate to pages
  - `mcp__playwright__browser_snapshot` - Take page snapshots
  - `mcp__playwright__browser_click` - Click elements
  - `mcp__playwright__browser_take_screenshot` - Capture screenshots
  - `mcp__playwright__browser_network_requests` - Monitor API calls
  - `mcp__playwright__browser_fill_form` - Test form interactions
  - `mcp__playwright__browser_wait_for` - Wait for elements
  - `mcp__playwright__browser_evaluate` - Execute JavaScript

- **MUST perform REAL browser testing:**
  - Navigate to actual pages at localhost:8000
  - Take actual screenshots and save them
  - Monitor real API calls in Network tab
  - Test real user interactions
  - Document actual behavior, not assumptions

- **MUST create Vue3-ready specifications:**
  - Component prop interfaces
  - Event emission patterns
  - State management requirements
  - API integration patterns
  - Error handling specifications

**For `auditor` (ENHANCED):**

- **MUST validate with STRICT criteria:**
  - Count actual characters/tokens (not trust claims)
  - Verify screenshot files exist and are relevant
  - Check technical specification completeness
  - Validate Vue3 implementation readiness
  - Reject if ANY requirement not met

- **MUST provide detailed feedback:**
  - Specific issues found with line references
  - Improvement recommendations
  - Quality scores with justification
  - Approval/rejection with clear reasoning

## SUCCESS CRITERIA (ENHANCED)

After completing this rework batch:

- ✅ 3 JSON result files in `results/completed/` with 10-15K tokens each
- ✅ Real screenshot evidence in `results/screenshots/TASK-XXX/`
- ✅ All tasks audited and APPROVED by enhanced `auditor` validation
- ✅ Task tracker updated with successful completion
- ✅ Vue3-ready component specifications with props/events
- ✅ Real Playwright research with actual API monitoring
- ✅ Implementation-ready technical depth for developers
- ✅ Ready handoff instructions for Batch 2

## HANDOFF TEMPLATE

Provide this format ONLY after ALL tasks pass strict audit:

```markdown
**BATCH 1 REWORK COMPLETED ✅**

**Progress: 3/162 tasks (1.85%) - QUALITY ASSURED**

**Results:**
- TASK-001: ✅ Architecture specification (verified 10-15K tokens, enhanced Vue3 details)
- TASK-002: ✅ Dashboard analysis (real Playwright evidence, component specs)
- TASK-003: ✅ Equipment list analysis (comprehensive implementation details)

**Quality Metrics:**
- All tasks meet strict 10-15K token requirement (verified)
- Real Playwright research completed with evidence
- Vue3 component specifications included
- Implementation-ready technical depth achieved

**Next Session Prompt for Batch 2:**
[Include complete Batch 2 prompt with enhanced standards]
```

## FAILURE CONDITIONS

**DO NOT PROCEED** if any task fails these criteria:
- Token count below 10,000 or above 15,000
- No real screenshot evidence
- Missing Vue3 component specifications
- Insufficient technical implementation detail
- Failed audit validation

**Begin execution immediately with enhanced TASK-001.**
