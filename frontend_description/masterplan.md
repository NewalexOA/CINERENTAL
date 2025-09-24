# MASTER PLAN: Frontend Decomposition for Reengineering

---

## 🚀 AUTOMATIC LAUNCH (MANDATORY READING!)

### ⚠️ FOR ANY AI AGENT RECEIVING THIS MASTER PLAN AS A TASK

**🎯 YOUR ACTIONS:**

1. **DO NOT READ THE ENTIRE DOCUMENT** - it will consume your entire context (1000+ lines)
2. **DO NOT ATTEMPT TO EXECUTE STAGES YOURSELF** - you lack the necessary specialization
3. **IMMEDIATELY DELEGATE** to coordinator:

    ```bash
    Task tool → subagent_type="masterplan-coordinator"
    prompt="Execute the entire CINERENTAL frontend decomposition master plan.
    Start by creating progress/status.json and coordinating all 8 stages."
    ```

4. **COMPLETE YOUR WORK** - the coordinator will take full control of the process

### 🎯 SPECIFICALLY FOR MASTERPLAN-COORDINATOR

If you received this master plan:

**FIRST ACTIONS:**

1. Create `frontend_description/progress/status.json` with STAGE 1 = `"pending"`
2. Launch `Task tool → subagent_type="architect"` for STAGE 1
3. Coordinate all 8 stages according to responsibility table
4. Create stage reports in `progress/stage-N-report.md`

**YOUR ROLE:** You do NOT execute stages yourself - you coordinate specialized subagents

**SIMPLE ALGORITHM:**

1. **STAGE 1:** `Task tool → subagent_type="architect"`
2. **STAGE 2:** `Task tool → subagent_type="scanner"`
3. **STAGES 3-6:** `Task tool → subagent_type="frontend-playwright-researcher"`
4. **STAGE 7:** `Task tool → subagent_type="integration-docs-specialist"`
5. **STAGE 8:** `Task tool → subagent_type="auditor"`

**DON'T READ FURTHER NOW** - just start with STAGE 1!

---

## PROJECT CONTEXT

### About CINERENTAL Application

**CINERENTAL** is a cinematographic equipment rental management system. The application allows:

- Managing equipment catalog (cameras, lenses, lighting equipment)
- Creating filming projects and booking equipment
- Tracking rental and return statuses
- Scanning equipment barcodes
- Managing clients and their documents
- Printing documents and labels

**Users:** Equipment rental company employees (administrators, managers)

### Current Frontend State

**Technology Stack:**

- **Backend:** Python FastAPI (95% ready)
- **Frontend:** Jinja2 HTML templates + vanilla JavaScript + Bootstrap
- **Structure:** Server-side rendering with AJAX for dynamic elements

**File Structure:**

```text
/frontend/
├── templates/           # Jinja2 HTML templates
│   ├── base.html       # Base template with navigation
│   ├── equipment/      # Equipment pages
│   ├── projects/       # Project pages
│   ├── clients/        # Client pages
│   └── ...
└── static/
    ├── js/             # JavaScript modules
    ├── css/            # Bootstrap + custom styles
    └── img/            # Images and icons
```

**Main Application Pages:**

1. **Home** (`/`) - dashboard with statistics
2. **Equipment** (`/equipment`) - catalog with search and filters
3. **Projects** (`/projects`) - filming project management
4. **Clients** (`/clients`) - client database
5. **Bookings** (`/bookings`) - rental management
6. **Categories** (`/categories`) - equipment category hierarchy
7. **Scanner** (`/scanner`) - barcode scanning
8. **Modal Windows** - add/edit forms

### Why Frontend Migration is Needed

**Current Solution Problems:**

- Poor handling of dates and time ranges
- Complexity of maintaining and extending JavaScript code
- Lack of component approach (lots of duplication)
- Slow development of new features
- UX issues on mobile devices
- Difficulty testing frontend logic

**Target Solution:**

- Modern component framework (React/Vue/Next)
- TypeScript for type safety
- Modern build and development tools
- Improved UX while maintaining familiar workflow

### Critical Requirements

**Preserving User Experience:**

- The application is actively used by company employees
- Users are accustomed to the current workflow and element placement
- Cannot radically change the working logic
- **Principle:** "Same UX, but better implemented"

**Functional Completeness:**

- 100% of current functionality must be recreated
- All API integrations must work identically
- All forms, filters, search must work the same way
- All print forms and documents must remain

## DECOMPOSITION PROBLEM

### Why Atomic Decomposition is Needed

**Quality Decomposition Principles:**

- Modern AI has large contexts (128K-200K+ tokens), but large context ≠ quality result
- When analyzing the entire frontend (273 files), AI loses focus on details
- It's difficult to provide quality specifications for "entire equipment page" even with large context
- Independent tasks are needed for parallel work and better quality

**Atomic Approach Advantages:**

- Each task focuses on a specific element (≤15K tokens optimally)
- Possibility of parallel work by multiple agents
- Clear technical specification = quality result
- Ability to validate each component separately
- Better AI focus on specific problem, not attention diffusion

**Why exactly 10-15K tokens?**

- Modern AI (Claude 3.5 Sonnet: 200K, GPT-4: 128K) can process much more
- But analysis quality decreases with too much information volume
- 10-15K tokens = optimal balance between detail and focus
- Sufficient for: HTML template + JS logic + Playwright research + documentation
- AI doesn't lose concentration on key details

### Technical Specification Requirements

**Each task for AI agent must contain:**

- Clear goal and context
- Specific input files for analysis
- Step-by-step instructions
- Expected result format (JSON schema)
- Acceptance criteria

**Independence Principle:**

- Agent must understand the task WITHOUT studying all code
- All necessary data is specified in the task itself
- Task result doesn't depend on other incomplete tasks

### 🚫 CRITICALLY IMPORTANT: Focus ONLY on functionality

**WHAT to describe in tasks:**

- ✅ **Element purpose** - what it's for, what problem it solves
- ✅ **Functionality** - what happens during interaction
- ✅ **Data** - what data it displays, where it gets it from
- ✅ **API integrations** - what requests it sends, with what parameters
- ✅ **Behavior** - how it reacts to user actions
- ✅ **States** - loading, error, success, empty states
- ✅ **Validation** - what data verification rules
- ✅ **Logic** - filtering, sorting, calculation algorithms

**WHAT NOT to describe in tasks:**

- ❌ **Visual design** - colors, fonts, sizes, margins
- ❌ **Element placement** - where it's located (top, bottom, left)
- ❌ **Appearance** - how tables, buttons, forms look
- ❌ **Styling** - CSS classes, Bootstrap components
- ❌ **Animations** - appearance effects, transitions
- ❌ **Responsive behavior** - how it behaves on different screens

**Correct Description Examples:**

✅ **Correct:**

```text
Equipment search bar:
- Purpose: Search by name, description, barcode, serial number
- Behavior: Search launches after 3 characters with 300ms debounce
- API: GET /api/v1/equipment/search?q={query}
- States: idle, typing, loading, error
- Validation: minimum 3 characters
```

❌ **Incorrect:**

```text
Search bar:
- Located at the top of the page
- Has white background and gray border
- Has magnifying glass icon on the right
- Placeholder text is gray
- Border becomes blue on focus
```

**Principle:** Describe "WHAT it does", not "HOW it looks"

### 🔍 RESEARCH METHODOLOGY: Interactive Analysis with Playwright

**MANDATORY for all tasks level 2-4:** Use MCP Playwright for live application research.

**What to do with Playwright:**

- ✅ **Open specific page** in browser
- ✅ **Interact with elements** - click buttons, fill forms, use filters
- ✅ **Track network requests** via DevTools (Network tab)
- ✅ **Observe real-time behavior** - spinners, loading/error states
- ✅ **Test various scenarios** - valid/invalid data, empty states
- ✅ **Take screenshots of key states** for documentation
- ✅ **Check JavaScript errors** in browser console

**Interactive Analysis Advantages:**

- **Real API calls:** See exact URLs, parameters, request headers
- **Actual behavior:** Not assumptions from code, but real operation
- **Hidden functionality:** Discover features not obvious from code
- **UI states:** All variants of loading, error, success, empty states
- **User Flow:** Understanding real user scenarios
- **Validation:** Which checks actually trigger

**Search Bar Research Example:**

```text
1. Open /equipment in browser
2. Find search bar, take screenshot
3. Enter 1 character → record no request
4. Enter 3 characters → see GET /api/v1/equipment/search in Network
5. Record request parameters, debounce time, spinner
6. Enter invalid characters → check validation
7. Clear field → record results reset
8. Test rapid typing → ensure debounce
```

**Result:** Precise technical description based on real behavior

### Current Application Complexity (analysis examples)

To understand the task scale, consider complexity examples:

**Equipment page (`/equipment`):**

- Search bar with debounce and spinner
- Category filters (dropdown from API)
- Status filter (5 status variants)
- Table with 5 columns and action buttons
- Pagination top and bottom (3 page size variants)
- Equipment addition modal (7 fields with validation)
- Barcode printing modal (2 code types with preview)
- Scan session addition modal
- Integration with 6+ API endpoints

**JavaScript file `equipment-list.js`:**

- 1400+ lines of code
- 15+ functions for various operations
- API client with error handling
- Notification system
- Pagination logic
- Form handling and validation

**Projects page (`/projects`):**

- Dual-mode view (table + cards)
- Project name search
- Client filtering (loaded from API)
- Status filtering (4 variants)
- Period filtering (date range picker)
- Card grouping by status in Card View
- Collapsible sections for each status

**Common Modules:**

- Universal Cart System (equipment cart)
- Scanner Integration (barcode handling)
- Notification System (user notifications)
- Print Module (document and label printing)
- API Client (centralized HTTP client)
- Logger System (logging system)

**Scale Assessment:**

- ~273 files in frontend
- ~15-20 main JavaScript modules
- ~40+ API endpoints for integration
- ~10+ modal windows and forms
- ~150+ interactive UI elements

## Overall Project Goal

Create a system of atomic technical specifications for complete description of current CINERENTAL frontend application, to ensure precise recreation of functionality on modern technology (React/Vue/Next).

## Key Decomposition Principles

### 1. Task Atomicity

- Each task focuses on specific element (10-15K tokens optimally)
- One task = one specific component or function
- Independence: task can be completed without studying all code
- Quality over size: better detailed 12K token task than superficial 50K

### 2. Hierarchical Structure

```text
Level 1: Application Architecture (1 task)
Level 2: Pages (8-10 tasks)
Level 3: Page Sections (30-40 tasks)
Level 4: UI Components (80-120 tasks)
Level 5: API Integrations (40-60 tasks)
```

### 3. Specification Standardization

- Unified format for each level
- JSON result schemas
- Clear acceptance criteria
- Machine-readable output data

## File System Structure

```text
frontend_description/
├── masterplan.md                    # This document
├── methodology/
│   ├── task-templates/              # Specification templates for each level
│   └── acceptance-criteria.md       # Quality criteria
├── inventory/
│   ├── pages-inventory.json         # List of all pages
│   ├── components-inventory.json    # List of all components
│   └── api-inventory.json          # List of all API calls
├── tasks/
│   ├── level-1-architecture/        # Architecture level tasks
│   ├── level-2-pages/              # Page level tasks
│   ├── level-3-sections/           # Section level tasks
│   ├── level-4-components/         # Component level tasks
│   └── level-5-api/                # API level tasks
├── results/
│   ├── schemas/                    # JSON result schemas
│   └── completed/                  # Completed tasks
└── progress/
    ├── status.json                 # Overall progress
    └── dependency-map.json         # Task dependencies
```

---

## WORK ENVIRONMENT SETUP

### 📁 Project Working Directory

**IMPORTANT:** All frontend decomposition work is conducted in the `frontend_description/` folder in project root.

**Location:** `/Users/anaskin/Github/CINERENTAL/frontend_description/`

**What should be in this folder:**

- `masterplan.md` - this document with complete instructions
- `methodology/` - specification templates and quality criteria
- `inventory/` - inventory results
- `tasks/` - generated technical specifications
- `progress/` - progress tracking files
- `results/` - JSON schemas and completed tasks

### Technical Requirements for AI Agents

**Application Launch:**

```bash
# In project terminal
cd /Users/anaskin/Github/CINERENTAL
make dev  # Launch in development mode
# Application available at http://localhost:8000
```

**URLs for Playwright Research:**

- Home: `http://localhost:8000/`
- Equipment: `http://localhost:8000/equipment`
- Projects: `http://localhost:8000/projects`
- Clients: `http://localhost:8000/clients`
- Bookings: `http://localhost:8000/bookings`
- Categories: `http://localhost:8000/categories`
- Scanner: `http://localhost:8000/scanner`

**Authentication:** Not required (internal system)

**Test Data:** Database already contains test records for equipment, clients and projects

**Required Tools:**

- MCP Playwright (available in agent)
- Project file system access
- Terminal command execution capability

---

## PROGRESS TRACKING SYSTEM

### Status File: `frontend_description/progress/status.json`

**Progress File Structure:**

```json
{
  "lastUpdated": "2025-01-XX 15:30:00",
  "currentStage": "STAGE-1-INFRASTRUCTURE",
  "completedStages": [],
  "activeAgent": "Claude-Assistant-001",
  "stages": {
    "STAGE-1-INFRASTRUCTURE": {
      "status": "in_progress",
      "startedAt": "2025-01-XX 15:25:00",
      "completedAt": null,
      "agent": "Claude-Assistant-001",
      "outputs": [],
      "nextStage": "STAGE-2-INVENTORY"
    },
    "STAGE-2-INVENTORY": {
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "agent": null,
      "outputs": [],
      "nextStage": "STAGE-3-LEVEL1"
    }
  }
}
```

### Standard Stage Completion Format

**At the end of each stage, agent MUST:**

1. Update `status.json` - mark their stage as `completed`
2. Create report `stage-N-report.md` with results
3. Validate all success criteria
4. Prepare files for next stage

---

## SUBAGENT DISTRIBUTION BY STAGES

### 📊 Responsibility Table

| Stage | Subagent(s) | Specialization |
|------|-------------|---------------|
| **STAGE 1** | `architect` | Infrastructure and template creation |
| **STAGE 2** | `scanner` | Comprehensive codebase inventory |
| **STAGE 3** | `frontend-playwright-researcher` + `masterplan-coordinator` | Architectural tasks with Playwright research |
| **STAGE 4** | `frontend-playwright-researcher` | Page task creation with interactive analysis |
| **STAGE 5** | `frontend-playwright-researcher` | Section decomposition (coordination via masterplan-coordinator) |
| **STAGE 6** | `frontend-playwright-researcher` | Mass component task creation |
| **STAGE 7** | `integration-docs-specialist` + `scanner` | API integrations and documentation |
| **STAGE 8** | `auditor` + `masterplan-coordinator` | Final validation and reporting |

### 🎯 Key Subagent Roles

**Main Executor:** `frontend-playwright-researcher`

- Stages 3-6 (creating all specifications)
- Interactive Playwright research
- Focus on functionality, NOT design
- Creating 10-15K token specifications

**Coordinator:** `masterplan-coordinator`

- Progress management through all stages
- Updating `status.json`
- Creating stage reports
- Delegating tasks to other agents

**Specialized:**

- `architect` - project infrastructure
- `scanner` - inventory and API analysis
- `integration-docs-specialist` - API documentation
- `auditor` - final validation

---

## ALGORITHM FOR NEW AI AGENT

### 🚀 How to Start Work (updated instruction)

**STEP 1: Readiness Check**

```bash
# Check project existence
ls /Users/anaskin/Github/CINERENTAL/frontend_description/

# Check application launch
cd /Users/anaskin/Github/CINERENTAL && make dev
```

**STEP 2: Entry Point Determination**

1. Read file `progress/status.json` (if exists)
2. Find first stage with status `"pending"`
3. Check that previous stages have status `"completed"`
4. **IMPORTANT:** Check if your agent type matches the assigned one for the stage:
   - If you're `masterplan-coordinator` - can coordinate any stage
   - If other type - execute only stages assigned to you
   - On mismatch - delegate control to correct subagent via Task tool
5. Mark yourself as `activeAgent` for selected stage

**STEP 3: Previous Results Validation**

- Check existence of all expected files
- Validate JSON schemas (if applicable)
- On problems - record in report

**STEP 4: Stage Execution**

- Follow specific stage instructions
- Create files according to structure
- Use Playwright for research (stages 2-6)

**STEP 5: Stage Completion**

- Update `status.json`: status to `"completed"`, specify time
- Create report `stage-N-report.md`
- Validate all success criteria
- Prepare next stage (status `"pending"`)

### 📋 Stage Completion Report Template

**File:** `frontend_description/progress/stage-N-report.md`

```markdown
# REPORT: STAGE N - [NAME]

**Agent:** Claude-Assistant-XXX
**Date:** 2025-01-XX 15:30:00
**Execution Time:** 45 minutes

## Completed Tasks
- ✅ Task 1: description
- ✅ Task 2: description
- ✅ Task 3: description

## Created Files
- `/path/to/file1.json` - purpose description
- `/path/to/file2.md` - purpose description

## Success Criteria Validation
- ✅ Criterion 1: completed
- ✅ Criterion 2: completed
- ✅ Criterion 3: completed

## Discovered Issues
- No issues / Problem descriptions

## Next Stage Preparation
- ✅ Status updated in progress/status.json
- ✅ Files ready for next agent
- ✅ Instructions for stage N+1 verified

## Recommendations for Next Agent
[Any important notes or recommendations]
```

---

## STEP-BY-STEP EXECUTION PLAN

### STAGE 1: Infrastructure Setup (1 session)

**🤖 RESPONSIBLE SUBAGENT:** `architect`

**Technical Specification for Subagent:**

🚨 **CRITICALLY IMPORTANT - WORKING DIRECTORY:**

- ALL work performed in: `/Users/anaskin/Github/CINERENTAL/frontend_description/`
- DO NOT create files in project root
- ALL paths relative to `frontend_description/`

**Goal:** Create file structure and basic templates for systematic work.

**Actions:**

1. Create directories according to structure above in `frontend_description/`
2. Create 5 specification templates (one for each level)
   - **CRITICALLY IMPORTANT:** Include "functionality, NOT design" principle in each template
   - **MANDATORY:** Add instructions for using MCP Playwright for interactive research
   - Add clear instructions on WHAT to describe and WHAT NOT to describe
3. Create JSON schemas for results of each level
4. Create progress file with task tracking

**Result:** Ready infrastructure for task creation

**Success Criteria:**

- ✅ All folders created
- ✅ Specification templates ready and tested on 1 example
- ✅ Each template has "Playwright research" section with detailed instructions
- ✅ Templates contain clear boundaries "WHAT to describe / WHAT NOT to describe"
- ✅ JSON schemas validate
- ✅ File `progress/status.json` created and initialized

**Stage Completion:**

1. Update `status.json`: `STAGE-1-INFRASTRUCTURE` → `"completed"`
2. Create report `stage-1-report.md`
3. Prepare `STAGE-2-INVENTORY` → `"pending"`

---

### STAGE 2: Application Inventory (1 session)

**🤖 RESPONSIBLE SUBAGENT:** `scanner`

**Technical Specification for Subagent:**

🚨 **CRITICALLY IMPORTANT - WORKING DIRECTORY:**

- ALL work performed in: `/Users/anaskin/Github/CINERENTAL/frontend_description/`
- Save results in: `frontend_description/inventory/`
- Reports in: `frontend_description/progress/`

**Goal:** Create complete list of all application elements.

**Input Data:**

- `/frontend/templates/` - all HTML templates
- `/frontend/static/js/` - all JavaScript files
- Navigation from `base.html`

**Actions:**

1. Scan all HTML templates → `pages-inventory.json`
2. Analyze JavaScript files → `components-inventory.json`
3. Identify all API endpoints → `api-inventory.json`
4. Count total number of future tasks

**Result:** 3 JSON files with complete inventory

**Success Criteria:**

- ✅ All pages accounted for (expected 8-10)
- ✅ All major components found (expected 80-120)
- ✅ All API calls documented (expected 40-60)

**Stage Completion:**

1. Update `status.json`: `STAGE-2-INVENTORY` → `"completed"`
2. Create report `stage-2-report.md`
3. Prepare `STAGE-3-LEVEL1` → `"pending"`

---

### STAGE 3: Level 1 Task Creation (1 session)

**🤖 RESPONSIBLE SUBAGENT:** `frontend-playwright-researcher` + `masterplan-coordinator`

**Technical Specification for Subagents:**

🚨 **CRITICALLY IMPORTANT - WORKING DIRECTORY:**

- ALL work performed in: `/Users/anaskin/Github/CINERENTAL/frontend_description/`
- Template: `frontend_description/methodology/task-templates/level-1-architecture-template.md`
- Result: `frontend_description/tasks/level-1-architecture/TASK-001-app-architecture.md`
- Reports in: `frontend_description/progress/`

**Goal:** Create single architecture level task.

**Actions:**

1. Use Level-1 template
2. Fill with specific data from inventory
3. Define main user flows using Playwright navigation research
4. Save as `TASK-001-app-architecture.md`

**Result:** 1 ready task for AI agent

**Stage Completion:**

1. Update `status.json`: `STAGE-3-LEVEL1` → `"completed"`
2. Create report `stage-3-report.md`
3. Prepare `STAGE-4-LEVEL2` → `"pending"`

---

### STAGE 4: Level 2 Task Creation (1 session)

**🤖 RESPONSIBLE SUBAGENT:** `frontend-playwright-researcher`

**Technical Specification for Subagent:**

🚨 **CRITICALLY IMPORTANT - WORKING DIRECTORY:**

- ALL work performed in: `/Users/anaskin/Github/CINERENTAL/frontend_description/`
- Template: `frontend_description/methodology/task-templates/level-2-page-template.md`
- Results: `frontend_description/tasks/level-2-pages/`
- Reports in: `frontend_description/progress/`

**Goal:** Create tasks for analyzing each page.

**Input Data:** `pages-inventory.json`

**Actions:**

1. Create separate task for each page
2. Use Level-2 template with mandatory Playwright research instructions
3. Specify concrete files for analysis AND URLs for browser opening
4. Define page relationships through interactive navigation

**Result:** 8-10 ready tasks (`TASK-002` to `TASK-011`)

**Stage Completion:**

1. Update `status.json`: `STAGE-4-LEVEL2` → `"completed"`
2. Create report `stage-4-report.md`
3. Prepare `STAGE-5-LEVEL3` → `"pending"`

---

### STAGE 5: Level 3 Task Creation (2-3 sessions)

**🤖 RESPONSIBLE SUBAGENT:** `frontend-playwright-researcher` (coordination via `masterplan-coordinator`)

**Technical Specification for Subagent:**

**Goal:** Decompose each page into functional sections.

**Approach:** 2-3 pages per session to avoid context overflow

**Actions:**

1. Take page from `pages-inventory.json`
2. Study corresponding HTML template + **interactively research via Playwright**
3. Identify logical sections (header, filters, table, footer) through interaction with live page
4. Create separate task for each section with Playwright testing instructions

**Result:** 30-40 section level tasks

**Stage Completion:**

1. Update `status.json`: `STAGE-5-LEVEL3` → `"completed"`
2. Create report `stage-5-report.md`
3. Prepare `STAGE-6-LEVEL4` → `"pending"`

---

### STAGE 6: Level 4 Task Creation (4-5 sessions)

**🤖 RESPONSIBLE SUBAGENT:** `frontend-playwright-researcher` (mass creation, coordination via `masterplan-coordinator`)

**Technical Specification for Subagent:**

**Goal:** Create tasks for each UI component.

**Approach:** By sections, analyze components within each section through interactive testing

**Mandatory:** Each component task must include detailed Playwright research instructions:

- How to find element on page
- What actions to perform with it
- What states to check
- What API requests to track

**Result:** 80-120 component level tasks

**Stage Completion:**

1. Update `status.json`: `STAGE-6-LEVEL4` → `"completed"`
2. Create report `stage-6-report.md`
3. Prepare `STAGE-7-LEVEL5` → `"pending"`

---

### STAGE 7: Level 5 Task Creation (2-3 sessions)

**🤖 RESPONSIBLE SUBAGENT:** `integration-docs-specialist` + `scanner`

**Technical Specification for Subagents:**

**Goal:** Document all API integrations.

**Input Data:**

- `api-inventory.json`
- JavaScript files with API calls
- Backend OpenAPI schema: `/frontend/openapi_backend.json`

**Result:** 40-60 tasks for API integrations

**Stage Completion:**

1. Update `status.json`: `STAGE-7-LEVEL5` → `"completed"`
2. Create report `stage-7-report.md`
3. Prepare `STAGE-8-VALIDATION` → `"pending"`

---

### STAGE 8: Validation and Finalization (1 session)

**🤖 RESPONSIBLE SUBAGENT:** `auditor` + `masterplan-coordinator`

**Technical Specification for Subagents:**

**Goal:** Check completeness and quality of created tasks.

**Actions:**

1. Check that all elements from inventory are covered by tasks
2. Validate several tasks of different levels
3. Create dependency map between tasks
4. Prepare final report

**Stage Completion:**

1. Update `status.json`: `STAGE-8-VALIDATION` → `"completed"`
2. Create final report `stage-8-final-report.md`
3. Mark entire project as completed

---

## AI Context Management

### Strategy for Working within Context Window

1. **One stage = one session** with AI agent
2. **State preservation** in files between sessions
3. **Context loading** only necessary for current stage
4. **Result validation** of each stage before proceeding to next

### Session Start Template

```text
Load:
- masterplan.md (this document)
- progress/status.json (current progress)
- Files specific to current stage
```

---

## Overall Project Quality Criteria

### Coverage Completeness

- ✅ 100% of application pages described
- ✅ 100% of interactive elements documented
- ✅ 100% of API calls described

### Task Quality

- ✅ Each task completable in 30-60 minutes (including Playwright research)
- ✅ Each task has clear acceptance criteria
- ✅ Task results in machine-readable format
- ✅ **Focus ONLY on functionality, NOT on design**
- ✅ Description of "WHAT it does", not "HOW it looks"
- ✅ **Mandatory interactive research via MCP Playwright**
- ✅ Based on real behavior, not code assumptions
- ✅ Optimal size 10-15K tokens for maximum focus

### Result Applicability

- ✅ Specifications understandable to any developer
- ✅ Sufficient details for precise implementation
- ✅ Preserved fundamental UX flow

---

## EXPECTED DECOMPOSITION RESULTS

### What we get after completing all stages

**1. Complete catalog of technical specifications (150+ tasks):**

```text
/tasks/
├── TASK-001-app-architecture.md           # Overall architecture
├── TASK-002-equipment-page-analysis.md    # Equipment page analysis
├── TASK-010-equipment-search-section.md   # Equipment search section
├── TASK-025-search-input-component.md     # Search input component
├── TASK-087-equipment-search-api.md       # Equipment search API
└── ...
```

**2. JSON schemas for each level:**

- `architecture-schema.json` - entire application structure
- `page-schema.json` - page descriptions
- `section-schema.json` - section descriptions
- `component-schema.json` - UI component descriptions
- `api-schema.json` - API integration descriptions

**3. Dependency Map:**

- Component dependency map
- Implementation priorities
- Critical development path

### How to use results

**For Frontend Developer:**

1. Take level 4 task (component)
2. Read specification (5-10 minutes)
3. **Open page in Playwright** and interactively study component (15-20 minutes)
4. Analyze specified code files (10-15 minutes)
5. Create React/Vue component based on real behavior (30-60 minutes)
6. Write tests according to acceptance criteria

**For Product Owner:**

- Functionality completeness validation
- Sprint planning by priorities
- Original UX compliance control

**For QA:**

- Ready test cases from acceptance criteria
- Understanding expected behavior of each element
- Component-based regression testing

### Specification Usage Example

**TASK-025: Equipment Search Bar**

```text
Developer receives:

FUNCTIONALITY:
→ Purpose (search by name, description, barcode)
→ Behavior (300ms debounce, minimum 3 characters, loading spinner)
→ API endpoint (/api/v1/equipment/search?q={query})
→ Component states (idle, typing, loading, error, empty)
→ Validation (minimum characters, special character handling)
→ Events (onInput, onFocus, onClear)

PLAYWRIGHT RESEARCH:
→ Open /equipment in browser
→ Find search bar by ID #searchInput
→ Test input of 1, 2, 3 characters
→ Track Network requests in DevTools
→ Record exact debounce time
→ Check spinner and loading states
→ Test invalid characters and clearing
→ Take screenshots of key states

Does NOT receive:
✗ How component looks
✗ Where it's positioned
✗ What colors and fonts it has

Result: Ready React component with precise behavior in 1-1.5 hours
```

### Advantages of This Approach

**Development Speed:**

- Parallel work of 5-10 developers
- Each takes independent task
- No need to study entire codebase

**Implementation Quality:**

- Detailed requirements based on real behavior eliminate misunderstanding
- Interactive research via Playwright ensures 100% description accuracy
- Acceptance criteria based on actual behavior, not assumptions
- JSON schemas enable automatic validation
- State screenshots serve as visual documentation

**Project Manageability:**

- Clear progress (completed N of M tasks)
- Ability to replan priorities
- Easy work distribution in team

**Documentation:**

- Complete technical description of entire frontend
- Knowledge base for new developers
- Foundation for future refactoring

---

## NEXT STEPS

### For New AI Agent

**STEP 1: Preparation**

1. Read this master plan completely (understand context)
2. Check working directory availability: `ls /Users/anaskin/Github/CINERENTAL/frontend_description/`
3. Launch application: `cd /Users/anaskin/Github/CINERENTAL && make dev`

**STEP 2: Entry Point Determination**

1. Read file `frontend_description/progress/status.json` (if exists)
2. If file doesn't exist - start with STAGE 1
3. If file exists - find first stage with status `"pending"`

**STEP 3: Stage Execution**

1. Follow selected stage instructions
2. Use Playwright for research (stages 2-6)
3. Create files according to structure

**STEP 4: Completion**

1. Update `status.json` - mark stage as `"completed"`
2. Create report `stage-N-report.md`
3. Prepare next stage

### System Readiness with Subagents

**✅ FULLY READY** master plan with assigned subagents:

**Process Automation:**

- Each stage has assigned subagent
- `masterplan-coordinator` coordinates process and delegates tasks
- `frontend-playwright-researcher` - main executor for specification creation
- Support for parallel work on stages 5-6

**Quality Decomposition:**

- Specialized agents for each task
- 10-15K tokens optimal detail level
- Mandatory Playwright research
- Focus on functionality, NOT design

**Complete Coverage:**

- Progress tracking system via `status.json`
- Standard stage reports
- Automatic task delegation to correct agents

---

## 🚨 CRITICAL CHECKS FOR SUCCESSFUL EXECUTION

### ⚠️ Mandatory Prerequisites

**1. Application must work:**

```bash
cd /Users/anaskin/Github/CINERENTAL && make dev
# Check: http://localhost:8000 opens
```

**2. Project structure ready:**

```bash
ls /Users/anaskin/Github/CINERENTAL/frontend_description/
# Folder should exist or will be created in STAGE 1
```

**3. All subagents available:**

- ✅ `architect` - infrastructure creation
- ✅ `scanner` - codebase analysis
- ✅ `frontend-playwright-researcher` - Playwright research
- ✅ `integration-docs-specialist` - API documentation
- ✅ `auditor` - final validation

### 🛑 What to do with problems

**Agent not responding:**

- Wait 2-3 minutes
- Repeat Task tool with same prompt
- Record problem in stage report

**Execution errors:**

- DO NOT try to fix yourself
- Pass Task tool to next suitable agent
- Document all problems

**Progress loss:**

- Check `progress/status.json`
- Restore from last successful stage
- Never skip stages

---

**🎯 SUMMARY:** Master plan ready for automatic execution!

**Next action:** Launch `masterplan-coordinator` to orchestrate all 8 stages.
