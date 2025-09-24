# LEVEL 1 TASK TEMPLATE: APPLICATION ARCHITECTURE

## 🎯 TASK OBJECTIVE

**Goal:** Analyze the overall application architecture, main user flows, and global patterns.

**Focus:** FUNCTIONALITY, NOT DESIGN - describe what the application does, not how it looks.

## 📋 TASK SPECIFICATION

### Input Data Required

- Complete pages inventory from `inventory/pages-inventory.json`
- Navigation structure from `/frontend/templates/base.html`
- Main JavaScript modules from `/frontend/static/js/`
- Application URLs and routing patterns

### Expected Analysis Areas

#### 1. Application Structure

- Main functional areas (equipment, projects, clients, bookings, etc.)
- User authentication and session management
- Global navigation patterns and menu structure
- Page relationships and workflows

#### 2. Core Functionality Patterns

- CRUD operations (Create, Read, Update, Delete)
- Search and filtering mechanisms
- Pagination and data loading patterns
- Form validation and submission workflows

#### 3. Integration Points

- API endpoint patterns and conventions
- Data flow between pages
- State management approaches
- Error handling and notification systems

#### 4. User Workflows

- Primary user journeys (equipment rental process)
- Secondary workflows (client management, reporting)
- Administrative functions and settings

### 🔍 MANDATORY PLAYWRIGHT RESEARCH

**CRITICAL:** Use MCP Playwright to interactively explore the application:

#### Research Steps

1. **Launch Application:**

   ```bash
   cd /Users/anaskin/Github/CINERENTAL && make dev
   # Open http://localhost:8000 in Playwright
   ```

2. **Navigate All Main Pages:**
   - Home (`/`) - capture main dashboard functionality
   - Equipment (`/equipment`) - explore catalog and management
   - Projects (`/projects`) - analyze project workflows
   - Clients (`/clients`) - study client management
   - Bookings (`/bookings`) - understand rental processes
   - Categories (`/categories`) - examine hierarchy management
   - Scanner (`/scanner`) - test barcode functionality

3. **Document User Flows:**
   - Record navigation paths between pages
   - Test primary actions (create, edit, search, filter)
   - Observe state changes and data loading
   - Take screenshots of key functional states

4. **API Pattern Analysis:**
   - Monitor Network tab during interactions
   - Document request/response patterns
   - Record error handling behaviors
   - Note loading states and indicators

### ❌ WHAT NOT TO DESCRIBE

**DO NOT focus on:**

- Visual design elements (colors, fonts, styling)
- Layout and positioning
- Bootstrap components and CSS classes
- Responsive behavior
- Animations or visual effects

### ✅ WHAT TO DESCRIBE

**FOCUS ON:**

- Functional purpose of each page
- Data operations and business logic
- User interaction patterns
- API integration approaches
- Navigation and workflow patterns
- State management and error handling

## 📊 EXPECTED OUTPUT FORMAT

Create file: `tasks/level-1-architecture/TASK-001-app-architecture.md`

### Output Structure

```markdown
# TASK-001: CINERENTAL Application Architecture Analysis

## Application Overview
[Describe main purpose and user types]

## Functional Areas
### [Area Name] (e.g., Equipment Management)
- **Purpose:** [What business problem it solves]
- **Key Operations:** [CRUD operations, search, etc.]
- **User Actions:** [What users can do]
- **API Patterns:** [Request patterns observed]

## Global Patterns
### Navigation Structure
[Describe menu structure and page relationships]

### Data Management Patterns
[Common CRUD patterns, API conventions]

### User Interaction Patterns
[Forms, modals, search, pagination]

## Technical Architecture
### Frontend Structure
[JavaScript modules, dependencies]

### API Integration
[Endpoint patterns, authentication, error handling]

### State Management
[How data flows between pages]

## User Workflows
### Primary Workflows
1. **Equipment Rental Process:** [Step-by-step functional description]
2. **Project Management:** [Workflow description]

### Secondary Workflows
[Administrative tasks, reporting, etc.]

## Cross-Page Integration Points
[How different areas work together]

## Playwright Research Notes
### Navigation Testing Results
[Key findings from interactive exploration]

### API Pattern Observations
[Network monitoring results]

### User Flow Validation
[Confirmed workflows and processes]
```

## ✅ ACCEPTANCE CRITERIA

- [ ] All main pages analyzed through Playwright interaction
- [ ] Primary user workflows documented with functional focus
- [ ] API patterns identified and documented
- [ ] Navigation structure mapped
- [ ] Cross-page integrations identified
- [ ] Output follows exact JSON schema format
- [ ] Focus maintained on FUNCTIONALITY, not design
- [ ] Based on real behavior observed via Playwright, not code assumptions

## 📝 COMPLETION CHECKLIST

- [ ] Application launched and accessible via Playwright
- [ ] All main pages visited and tested interactively
- [ ] Network requests monitored and documented
- [ ] User flows tested end-to-end
- [ ] Architecture analysis completed
- [ ] Output file created with complete analysis
- [ ] Playwright screenshots taken for key states
- [ ] Task ready for next stage consumption
