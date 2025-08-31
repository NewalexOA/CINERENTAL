# CINERENTAL Subagent Task Formulations

**Generated**: 2025-08-28
**Purpose**: Ready-to-use task formulations for Claude Code subagents
**Usage**: Copy and paste into new Claude Code sessions

---

## 🚀 Quick Start - Priority Tasks

### 🔥 Critical Priority

#### Universal Cart Deep Dive (Most Complex)

```text
Use Task tool with frontend-developer agent to perform complete analysis of Universal Cart system in CINERENTAL.

Task: Task 5.1: Universal Cart UX Deep Dive

Analyze:
- Files: /frontend/static/js/universal-cart/ (all files)
- Test URL: localhost:8000/projects/54 (embedded mode), localhost:8000/equipment (floating mode)

Analysis focus:
- Dual-mode architecture (embedded vs floating) and auto-detection
- Cross-page persistence through localStorage
- Integration with multiple sources (scanner, search, catalog)
- Quantity management and equipment date customization
- Bulk operations and workflow efficiency
- All integration points with other systems

Deliverables:
- Complete UX specification for Universal Cart
- Design for dual-mode interaction
- Requirements for cross-page persistence
- Workflow integration documentation
- Vue3 with Pinia implementation strategy

After completion, update Task 5.1 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

#### Project Detail with Embedded Cart

```text
Use Task tool with frontend-developer agent to analyze the most complex project page.

Task: Task 3.2: Project Detail & Equipment Management UX Analysis

Analyze:
- Files: /frontend/templates/projects/view.html, /frontend/static/js/projects-view.js, /frontend/static/js/universal-cart/
- Test URL: localhost:8000/projects/54 (54+ equipment items)

Analysis focus:
- Universal Cart in embedded mode with 54+ equipment items
- Equipment addition workflow and user expectations
- Inline date editing patterns
- Quantity management UX (plus and minus buttons)
- Equipment search within project context
- Status updates and project lifecycle management
- Notes and collaboration functions

Deliverables:
- Project page UX specification
- Universal Cart requirements for Vue3
- Equipment management workflow documentation
- Inline editing patterns

After completion, update Task 3.2 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

---

## 🏗️ Foundation Tasks

### Navigation System Analysis

```text
Use Task tool with frontend-developer agent to analyze global navigation.

Task: Task 1.1: Navigation System UX Analysis

Analyze:
- Files: /frontend/templates/base.html, /frontend/static/js/main.js
- Test URL: localhost:8000 (all pages)

Analysis focus:
- Top-level navigation structure and user mental model
- Quick action usage patterns and their utilization
- Breadcrumb navigation implementation
- Responsive navigation behavior on mobile
- Global scanner button functionality and user expectations

Deliverables:
- Navigation UX specification document
- User workflow map
- Vue3 navigation component design recommendations

After completion, update Task 1.1 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

### Equipment List Analysis (845 items)

```text
Use Task tool with frontend-developer agent to analyze equipment catalog.

Task: Task 2.1: Equipment List Page UX Analysis

Analyze:
- Files: /frontend/templates/equipment/list.html, /frontend/static/js/equipment-list.js
- Test URL: localhost:8000/equipment (845 items, 43 pages)

Analysis focus:
- Advanced search and filtering UX patterns
- User preferences for table vs card view
- Pagination behavior and user expectations (845 items, 43 pages)
- Equipment status indicators and user understanding
- Quick action buttons and their usage contexts
- Equipment addition modal workflow

Deliverables:
- Equipment catalog UX specification
- Search and filtering interaction patterns
- Vue3 pagination UX requirements
- Modal workflow documentation

After completion, update Task 2.1 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

---

## 🔧 Technical Component Analysis

### HID Scanner Integration

```text
Use Task tool with scanner agent to analyze HID scanner integration.

Task: Task HS-1: Scanner Hardware Integration Analysis

Analyze:
- Files: /frontend/static/js/scanner.js, /frontend/static/js/main.js, /frontend/static/js/project/equipment/scanner.js
- Test URL: localhost:8000/scanner

Analysis focus:
- Keyboard events capture and processing
- Barcode validation and parsing logic
- Auto-start/stop scanner functionality
- Equipment detection and error handling
- Cross-browser compatibility patterns
- Security considerations for keyboard access

Deliverables:
- HID integration technical specification
- Keyboard event processing patterns
- Vue3 composable design for scanner integration
- Error handling and fallback strategies
- Browser compatibility requirements

After completion, update Task HS-1 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

### Universal Cart Core Engine

```text
Use Task tool with architect agent to analyze Universal Cart core.

Task: Task UC-1: Universal Cart Core Engine Analysis

Analyze:
- Files: /frontend/static/js/universal-cart/core/universal-cart.js, /frontend/static/js/universal-cart/core/cart-storage.js, /frontend/static/js/universal-cart/config/cart-configs.js

Analysis focus:
- Item addition, removal, and modification workflow
- Quantity management and validation logic
- Date customization for each equipment item
- Storage persistence patterns and data structure
- Event emission and listener patterns
- Configuration system for different page contexts

Deliverables:
- Universal Cart business logic specification
- Data structure and state management documentation
- Event system architecture design
- Pinia store architecture recommendations for Vue3
- Component composition strategy

After completion, update Task UC-1 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

### Advanced Pagination System

```text
Use Task tool with architect agent to analyze advanced pagination system.

Task: Task AP-1: Pagination Engine Analysis

Analyze:
- Files: /frontend/static/js/utils/pagination.js, /frontend/static/js/equipment-list.js, /frontend/static/js/projects-list.js

Analysis focus:
- Pagination state management and calculations
- Page size handling and user preferences
- API integration patterns for paginated data
- URL synchronization and browser history
- Performance optimization for large datasets (845+ items)
- Error handling and loading states

Deliverables:
- Pagination system technical specification
- State management patterns documentation
- Vue3 API integration design
- Performance optimization strategies
- URL routing integration patterns

After completion, update Task AP-1 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

---

## 🔍 Architecture Analysis

### State Management Analysis

```text
Use Task tool with architect agent to analyze current state management patterns.

Task: Task SM-1: Current State Management Analysis

Analyze:
- Files: /frontend/static/js/utils/common.js, /frontend/static/js/main.js, all localStorage patterns in modules

Analysis focus:
- Global state management patterns
- localStorage usage and data persistence
- Cross-page data exchange mechanisms
- User session management and preferences
- Server state synchronization
- Error state handling and recovery

Deliverables:
- Current state management documentation
- Data flow map between components
- Persistence strategy documentation
- Pinia store architecture design for Vue3
- State synchronization patterns

After completion, update Task SM-1 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

### API Integration Patterns

```text
Use Task tool with scanner agent to analyze API integration patterns.

Task: Task SM-2: API Integration Patterns Analysis

Analyze:
- Files: /frontend/static/js/utils/api.js, /frontend/openapi_backend.json, all API usage in JavaScript modules

Analysis focus:
- API client implementation and configuration
- Request/response patterns and error handling
- Data transformation and validation
- Caching and optimization strategies
- Real-time data updates and polling
- Authentication and authorization patterns

Deliverables:
- API integration specification
- Error handling and retry patterns
- Data transformation documentation
- Vue3 composable design for API integration
- Caching and optimization strategies

After completion, update Task SM-2 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

---

## 📱 UX & Performance Analysis

### Scanner Interface Workflow

```text
Use Task tool with frontend-developer agent to analyze scanner interface.

Task: Task 4.1: Scanner Interface UX Analysis

Analyze:
- Files: /frontend/templates/scanner.html, /frontend/static/js/scanner.js, /frontend/static/js/scan-storage.js
- Test URL: localhost:8000/scanner

Analysis focus:
- User experience of HID scanner integration
- Session creation and management workflow
- Real-time scanning feedback and user expectations
- Equipment addition confirmation patterns
- Server synchronization user experience
- Session-to-project conversion workflow

Deliverables:
- Scanner interface UX specification
- Session management user workflow
- Vue3 HID integration requirements
- Real-time feedback patterns

After completion, update Task 4.1 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

### Performance Critical Path Analysis

```text
Use Task tool with architect agent to analyze performance critical paths.

Task: Task PO-1: Performance Critical Path Analysis

Analyze:
- Focus: processing large datasets in equipment and project lists, real-time search and filtering implementation, Universal Cart performance patterns, scanner integration performance

Analysis focus:
- Large dataset rendering and virtualization needs
- Search and filtering performance with large datasets (845+ items)
- Memory usage patterns and optimization
- DOM manipulation performance
- Event processing optimization
- Bundle size and loading performance

Deliverables:
- Performance analysis report
- Optimization opportunities documentation
- Vue3 performance implementation strategy
- Virtualization requirements specification
- Bundle optimization recommendations

After completion, update Task PO-1 status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

---

## 📋 Task Execution Instructions

### Standard Task Format

```text
Use Task tool with {agent-name} agent to execute {task-name}.

Task: {task-id}: {task-title}

Analyze:
- Files: {file-paths}
- Test URL: {test-urls}

Analysis focus:
- {focus-point-1}
- {focus-point-2}
- {focus-point-3}

Deliverables:
- {expected-output-1}
- {expected-output-2}
- {expected-output-3}

After completion, update {task-id} status in /frontend-vue3/DOCS/TASK_PROGRESS.md to 🟢 Completed and add link to result.
```

### Agent Selection Guide

- **frontend-developer**: UI/UX analysis, component interactions, user workflows
- **scanner**: Code structure analysis, file scanning, pattern identification
- **architect**: System architecture, integration patterns, performance analysis
- **worker**: Implementation tasks, specific code changes
- **general-purpose**: Complex multi-faceted tasks requiring various skills

### Result File Naming Convention

```text
/frontend-vue3/DOCS/results/task-{id}-{short-name}.md

Examples:
- task-1.1-navigation-ux-analysis.md
- task-uc-1-universal-cart-core-analysis.md
- task-hs-1-hid-scanner-integration-analysis.md
```

### Status Update Format

When completing a task, update TASK_PROGRESS.md:

```markdown
- **Status**: 🟢 Completed
- **Completed**: 2025-08-28
- **Results**: [Link to result file](./results/task-x.x-name.md)
- **Notes**: Brief completion summary
```

---

## 🎯 Recommended Execution Order

### Week 1: Foundation

    1. Task 1.1: Navigation System (frontend-developer)
    2. Task 5.1: Universal Cart Deep Dive (frontend-developer)
    3. Task 3.2: Project Detail Analysis (frontend-developer)

### Week 2: Core Components

    4. Task 2.1: Equipment List Analysis (frontend-developer)
    5. Task UC-1: Universal Cart Core Engine (architect)
    6. Task HS-1: Scanner Hardware Integration (scanner)

### Week 3: Technical Analysis

    7. Task SM-1: State Management Analysis (architect)
    8. Task SM-2: API Integration Analysis (scanner)
    9. Task AP-1: Pagination Engine Analysis (architect)

### Week 4: Remaining Tasks

    10. Complete remaining UX analysis tasks
    11. Complete remaining component analysis tasks
    12. Performance and optimization analysis

---

*Copy and paste these formulations into new Claude Code sessions to execute tasks with specialized subagents. Each task includes complete context and will update progress tracking automatically.*
