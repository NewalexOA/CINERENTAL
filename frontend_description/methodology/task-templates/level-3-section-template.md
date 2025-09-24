# LEVEL 3 TASK TEMPLATE: PAGE SECTION ANALYSIS

## 🎯 TASK OBJECTIVE

**Goal:** Analyze a specific functional section within a page (e.g., search bar, data table, filter panel).

**Focus:** FUNCTIONALITY, NOT DESIGN - describe what the section does, not how it looks.

## 📋 TASK SPECIFICATION

### Input Data Required

- Parent page context and URL
- Section location within page template
- Associated JavaScript functions
- Related API endpoints

### Expected Analysis Areas

#### 1. Section Purpose and Context

- Functional role within the parent page
- Business purpose and user needs served
- Dependencies on other page sections
- Integration with page-level operations

#### 2. Section Functionality

- Specific operations this section enables
- Data input/output mechanisms
- User interaction patterns
- State management within section

#### 3. Data Integration

- Data sources and API connections
- Data transformation and processing
- Validation rules and constraints
- Error handling and feedback

#### 4. User Experience Flow

- User interaction sequence
- Response patterns and feedback
- Integration with overall page workflow
- Edge cases and error scenarios

### 🔍 MANDATORY PLAYWRIGHT RESEARCH

**CRITICAL:** Use MCP Playwright to interactively test the section:

#### Research Steps

1. **Section Location:**

   ```bash
   # Open {PARENT_PAGE_URL} in Playwright
   # Identify and interact specifically with the target section
   ```

2. **Functional Testing:**
   - Test all interactive elements within the section
   - Enter various types of data/input
   - Trigger all available actions and operations
   - Test validation rules and constraints

3. **State Observation:**
   - Document initial/default state
   - Observe loading and processing states
   - Trigger and document error states
   - Record success states and feedback

4. **Integration Testing:**
   - Test how section affects other page parts
   - Verify data flow to/from other sections
   - Test section behavior with various page states
   - Check integration with page-level operations

5. **API Monitoring:**
   - Monitor Network tab for section-specific calls
   - Document request parameters and timing
   - Test API error scenarios
   - Record response handling patterns

6. **Edge Case Testing:**
   - Test with empty/invalid data
   - Test rapid interactions and race conditions
   - Test section behavior with different user permissions
   - Test section during page state changes

### ❌ WHAT NOT TO DESCRIBE

**DO NOT focus on:**

- Visual styling and appearance
- Layout positioning within page
- CSS classes and Bootstrap components
- Colors, fonts, and design elements
- Responsive behavior and breakpoints
- Visual animations and transitions

### ✅ WHAT TO DESCRIBE

**FOCUS ON:**

- What business operation the section enables
- User interactions and their outcomes
- Data processing and validation logic
- API integration and error handling
- State changes and feedback mechanisms
- Integration with other page sections

## 📊 EXPECTED OUTPUT FORMAT

Create file: `tasks/level-3-sections/TASK-{NUMBER}-{section-name}-section.md`

### Output Structure

```markdown
# TASK-{NUMBER}: {Section Name} Section Analysis

## Section Overview
**Parent Page:** {page_name}
**Section Purpose:** [What business function this section serves]
**Page URL:** `{parent_page_url}`
**Section Location:** [How to find this section on the page]

## Section Functionality

### Core Operations
#### [Operation Name] (e.g., Equipment Search)
- **Purpose:** [What this operation accomplishes]
- **User Interaction:** [How users interact with this section]
- **Processing Logic:** [What happens when user interacts]
- **Output/Result:** [What the user gets as result]

### Interactive Elements
#### [Element Name] (e.g., Search Input Field)
- **Function:** [What this element does]
- **Input:** [What user can input]
- **Behavior:** [How element responds]
- **Validation:** [Input validation rules]
- **Feedback:** [User feedback mechanisms]

### Data Integration
- **Data Sources:** [Where section gets its data]
- **API Endpoints:** [Specific APIs used by section]
- **Data Processing:** [How data is transformed/filtered]
- **Data Output:** [How processed data is used]

## Section States

### Default State
[How section appears initially]

### Active State
[Section behavior during user interaction]

### Loading State
[Section behavior during data processing]

### Error State
[How section handles and displays errors]

### Success State
[Section behavior after successful operation]

### Empty State
[Section behavior with no data/results]

## API Integration Details

### Section-Specific API Calls
1. **{Method} {Endpoint}**
   - **Trigger:** [What user action triggers this call]
   - **Parameters:** [Request parameters sent]
   - **Response Handling:** [How response is processed]
   - **Error Handling:** [How API errors are handled]

### Data Flow
[How data flows through this section]

## Integration with Page
- **Dependencies:** [What this section depends on]
- **Effects:** [How this section affects other page parts]
- **Communication:** [How section communicates with page]

## User Interaction Patterns

### Primary User Flow
[Step-by-step description of main user workflow]

### Alternative Flows
[Other ways users might interact with section]

### Error Recovery
[How users recover from errors in this section]

## Playwright Research Results

### Functional Testing Notes
[Key observations from hands-on testing]

### State Transition Testing
[How section behaves during state changes]

### Integration Testing Results
[How section integrates with rest of page]

### Edge Case Findings
[Unusual behaviors or edge cases discovered]

### API Monitoring Results
[Network activity specific to this section]

### Screenshot References
[Key screenshots of section in different states]
```

## ✅ ACCEPTANCE CRITERIA

- [ ] Section analyzed through focused Playwright interaction
- [ ] All interactive elements within section tested
- [ ] Section-specific API calls identified and tested
- [ ] All functional states documented with testing
- [ ] Integration with parent page verified
- [ ] Error scenarios tested and documented
- [ ] Edge cases explored and documented
- [ ] Output follows exact format requirements
- [ ] Focus maintained on FUNCTIONALITY, not design
- [ ] Based on observed section behavior, not assumptions

## 📝 COMPLETION CHECKLIST

- [ ] Section located and isolated for testing
- [ ] All section elements tested interactively
- [ ] Various input scenarios tested
- [ ] State transitions observed and documented
- [ ] API calls monitored and catalogued
- [ ] Integration with page tested
- [ ] Error conditions triggered and documented
- [ ] Analysis documented in required format
- [ ] Section-specific screenshots captured
