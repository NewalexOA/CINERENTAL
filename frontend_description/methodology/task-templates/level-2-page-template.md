# LEVEL 2 TASK TEMPLATE: PAGE ANALYSIS

## 🎯 TASK OBJECTIVE

**Goal:** Analyze a specific page's functionality, data operations, and user interactions.

**Focus:** FUNCTIONALITY, NOT DESIGN - describe what the page does, not how it looks.

## 📋 TASK SPECIFICATION

### Input Data Required

- Page template file: `/frontend/templates/{page_name}.html`
- Associated JavaScript file: `/frontend/static/js/{page_name}.js`
- Page URL for Playwright testing: `http://localhost:8000/{page_path}`

### Expected Analysis Areas

#### 1. Page Purpose and Context

- Business purpose and target users
- Place in overall application workflow
- Dependencies on other pages/systems

#### 2. Data Operations

- What data is displayed and from where
- CRUD operations available on this page
- Data validation rules and constraints
- API endpoints used by this page

#### 3. User Interactions

- Available user actions (buttons, forms, links)
- Interactive elements and their behaviors
- Form submissions and data entry
- Navigation options to/from this page

#### 4. Functional States

- Loading states and data fetching
- Error states and error handling
- Empty states (no data scenarios)
- Success states and confirmations

### 🔍 MANDATORY PLAYWRIGHT RESEARCH

**CRITICAL:** Use MCP Playwright to interactively explore the page:

#### Research Steps

1. **Page Access:**

   ```bash
   # Ensure application is running
   # Open {PAGE_URL} in Playwright browser
   ```

2. **Interactive Testing:**
   - Load the page and observe initial state
   - Test all clickable elements (buttons, links, tabs)
   - Fill out and submit any forms present
   - Use search/filter functionality if available
   - Test pagination or data loading if present

3. **State Documentation:**
   - Capture loading states and spinners
   - Trigger and document error scenarios
   - Test empty data states
   - Record success confirmations

4. **API Monitoring:**
   - Monitor Network tab during all interactions
   - Document all API calls made by the page
   - Record request parameters and response formats
   - Note error handling for failed requests

5. **User Flow Testing:**
   - Test complete user workflows on this page
   - Navigate to/from related pages
   - Test integration with other system components

### ❌ WHAT NOT TO DESCRIBE

**DO NOT focus on:**

- Page layout and visual structure
- Colors, fonts, and styling details
- Bootstrap component usage
- Responsive design behavior
- Visual animations or effects
- Exact positioning of elements

### ✅ WHAT TO DESCRIBE

**FOCUS ON:**

- What business operations the page enables
- Data sources and destinations
- User actions and their results
- API integrations and data flow
- Validation rules and error handling
- Navigation patterns and workflow integration

## 📊 EXPECTED OUTPUT FORMAT

Create file: `tasks/level-2-pages/TASK-{NUMBER}-{page-name}-analysis.md`

### Output Structure

```markdown
# TASK-{NUMBER}: {Page Name} Page Analysis

## Page Overview
**Business Purpose:** [What business need this page serves]
**Target Users:** [Who uses this page and why]
**Page URL:** `{page_url}`
**Template File:** `{template_path}`
**JavaScript File:** `{js_path}`

## Core Functionality

### Data Display
- **Primary Data:** [What main data is shown]
- **Data Source:** [API endpoints or data sources]
- **Data Structure:** [Key data fields and relationships]

### User Operations
#### [Operation Name] (e.g., Create Equipment)
- **Purpose:** [What this operation accomplishes]
- **User Actions:** [Step-by-step user actions required]
- **API Integration:** [API calls made during operation]
- **Validation:** [Data validation rules enforced]
- **Success State:** [What happens when successful]
- **Error Handling:** [How errors are handled and displayed]

### Interactive Elements
#### [Element Name] (e.g., Search Bar)
- **Functionality:** [What this element does]
- **Behavior:** [How it responds to user input]
- **API Calls:** [What requests it triggers]
- **States:** [Different states it can be in]

## Page States

### Loading States
[How the page behaves during data loading]

### Error States
[How errors are displayed and handled]

### Empty States
[What happens when no data is available]

### Success States
[Confirmation messages and success indicators]

## API Integration

### Endpoints Used
1. **{Method} {Endpoint}**
   - **Purpose:** [What this call does]
   - **Parameters:** [Required parameters]
   - **Response:** [Expected response format]
   - **Error Handling:** [How errors are processed]

### Data Flow
[How data moves through the page]

## Navigation and Integration

### Page Entry Points
[How users arrive at this page]

### Exit Points
[Where users can navigate from this page]

### Integration with Other Components
[How this page works with other system parts]

## Playwright Research Results

### Interactive Testing Notes
[Key findings from hands-on testing]

### API Monitoring Results
[Network activity observations]

### User Flow Validation
[Confirmed workflows and edge cases]

### Screenshots References
[List of key screenshots taken]
```

## ✅ ACCEPTANCE CRITERIA

- [ ] Page analyzed through complete Playwright interaction
- [ ] All user operations tested and documented
- [ ] API calls monitored and catalogued
- [ ] All functional states identified and tested
- [ ] Navigation patterns documented
- [ ] Error scenarios tested and documented
- [ ] Output follows exact format requirements
- [ ] Focus maintained on FUNCTIONALITY, not design
- [ ] Based on observed behavior, not code assumptions

## 📝 COMPLETION CHECKLIST

- [ ] Page loaded successfully in Playwright
- [ ] All interactive elements tested
- [ ] Forms submitted with various data scenarios
- [ ] API calls monitored and documented
- [ ] Error states triggered and documented
- [ ] Navigation paths tested
- [ ] Analysis documented in required format
- [ ] Screenshots captured for reference
