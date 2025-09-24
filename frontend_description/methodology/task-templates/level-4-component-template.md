# LEVEL 4 TASK TEMPLATE: UI COMPONENT ANALYSIS

## 🎯 TASK OBJECTIVE

**Goal:** Analyze a specific UI component's functionality, behavior, and interactions.

**Focus:** FUNCTIONALITY, NOT DESIGN - describe what the component does, not how it looks.

## 📋 TASK SPECIFICATION

### Input Data Required

- Component location within page/section
- Parent page URL and section context
- Associated JavaScript functions/methods
- Component-specific API interactions

### Expected Analysis Areas

#### 1. Component Purpose and Context

- Specific user need this component addresses
- Role within parent section/page
- Business value and functional importance
- Dependencies on other components/systems

#### 2. Component Functionality

- Primary operations and capabilities
- User interaction mechanisms
- Data input/output specifications
- Processing and validation logic

#### 3. Component Behavior

- Response patterns to user actions
- State management and transitions
- Event handling and triggers
- Integration with other components

#### 4. Data and API Integration

- Data sources and requirements
- API endpoints specific to component
- Data validation and transformation
- Error handling and recovery

### 🔍 MANDATORY PLAYWRIGHT RESEARCH

**CRITICAL:** Use MCP Playwright to interactively test the component:

#### Research Steps

1. **Component Location:**

   ```bash
   # Open {PARENT_PAGE_URL} in Playwright
   # Navigate to component's parent section
   # Identify specific component element
   ```

2. **Component Interaction Testing:**
   - Test all user interaction methods (click, input, hover, etc.)
   - Try different types of input data
   - Test component with various data states
   - Verify all interactive behaviors

3. **State Testing:**
   - Document default/initial state
   - Test all possible component states
   - Trigger state transitions
   - Observe state persistence and reset

4. **Data Integration Testing:**
   - Test component with different data sets
   - Verify data validation behaviors
   - Test component during data loading
   - Test error scenarios and recovery

5. **API Interaction Testing:**
   - Monitor Network tab during component use
   - Test API calls triggered by component
   - Verify request parameters and responses
   - Test component behavior during API failures

6. **Component Integration Testing:**
   - Test how component affects other page elements
   - Verify component communication with parent section
   - Test component behavior during page state changes
   - Check component behavior with different user permissions

7. **Edge Case Testing:**
   - Test component limits and boundaries
   - Test rapid interactions and race conditions
   - Test component with invalid/malicious input
   - Test component accessibility features

### ❌ WHAT NOT TO DESCRIBE

**DO NOT focus on:**

- Visual appearance and styling
- CSS classes and design implementation
- Colors, fonts, and visual hierarchy
- Layout positioning and spacing
- Visual effects and animations
- Responsive design behavior

### ✅ WHAT TO DESCRIBE

**FOCUS ON:**

- What user problem component solves
- How users interact with component
- What data component processes
- How component communicates with system
- What states component can be in
- How component handles errors and validation

## 📊 EXPECTED OUTPUT FORMAT

Create file: `tasks/level-4-components/TASK-{NUMBER}-{component-name}-component.md`

### Output Structure

```markdown
# TASK-{NUMBER}: {Component Name} Component Analysis

## Component Overview
**Parent Section:** {section_name}
**Parent Page:** {page_name}
**Component Purpose:** [What specific user need this component addresses]
**Page URL:** `{parent_page_url}`
**Component Selector:** [How to find this component in Playwright]

## Component Functionality

### Primary Function
**Purpose:** [What business operation this component enables]
**User Goal:** [What users want to accomplish with this component]
**Input:** [What users provide to component]
**Output:** [What users get from component]

### User Interactions
#### [Interaction Type] (e.g., Text Input, Button Click)
- **Trigger:** [What user action triggers this]
- **Processing:** [What component does when triggered]
- **Feedback:** [How component responds to user]
- **Validation:** [Input validation rules applied]
- **Error Handling:** [How invalid input is handled]

### Component Capabilities
- **[Capability 1]:** [Description of what component can do]
- **[Capability 2]:** [Description of another capability]
- **[Capability 3]:** [Additional functionality]

## Component States

### Default State
**Appearance:** [How component appears initially]
**Behavior:** [Default component behavior]
**Available Actions:** [What user can do in default state]

### Active State
**Trigger:** [What puts component in active state]
**Behavior:** [How component behaves when active]
**User Experience:** [What user experiences in this state]

### Loading State
**Trigger:** [What causes loading state]
**Duration:** [How long loading typically lasts]
**User Feedback:** [How user knows component is loading]
**Restrictions:** [What user cannot do during loading]

### Error State
**Triggers:** [What conditions cause error state]
**Error Types:** [Different types of errors component handles]
**Error Display:** [How errors are communicated to user]
**Recovery:** [How user can recover from errors]

### Success State
**Trigger:** [What causes success state]
**Feedback:** [How success is communicated]
**Next Steps:** [What user can do after success]

### Disabled State
**Conditions:** [When component becomes disabled]
**Behavior:** [How component behaves when disabled]
**Visual Indicators:** [How user knows component is disabled]

## Data Integration

### Data Requirements
**Input Data:** [What data component needs to function]
**Data Format:** [Expected format of input data]
**Data Validation:** [Rules applied to input data]

### Data Processing
**Transformation:** [How component processes input data]
**Calculations:** [Any calculations component performs]
**Filtering:** [Any filtering logic applied]

### Data Output
**Output Format:** [Format of data component produces]
**Output Destination:** [Where processed data goes]
**Output Validation:** [Validation of output data]

## API Integration

### Component-Specific API Calls
1. **{Method} {Endpoint}**
   - **Trigger:** [User action that triggers this API call]
   - **Parameters:** [Data sent with request]
   - **Response Processing:** [How response is handled]
   - **Error Scenarios:** [API error conditions and handling]
   - **Loading Behavior:** [Component behavior during API call]

### API Error Handling
**Network Errors:** [How component handles connectivity issues]
**Server Errors:** [How component handles server-side errors]
**Validation Errors:** [How component handles validation failures]
**Timeout Handling:** [How component handles request timeouts]

## Component Integration

### Parent Integration
**Communication:** [How component communicates with parent section]
**Dependencies:** [What component depends on from parent]
**Events:** [What events component sends to parent]

### Sibling Integration
**Shared State:** [Any state shared with other components]
**Event Communication:** [Events sent to/received from siblings]
**Data Sharing:** [Data shared with other components]

### System Integration
**Global State:** [How component interacts with global application state]
**External Services:** [Integration with external services]
**Browser APIs:** [Browser APIs component uses]

## User Experience Patterns

### Primary User Flow
1. **[Step 1]:** [First user action and component response]
2. **[Step 2]:** [Second user action and component response]
3. **[Step 3]:** [Subsequent steps in typical flow]

### Alternative Flows
**[Alternative Flow Name]:** [Description of alternative user path]
**[Edge Case Flow]:** [Description of edge case user path]

### Error Recovery Flows
**[Error Type]:** [How user recovers from this error type]

## Validation and Constraints

### Input Validation
**[Validation Rule 1]:** [Description of validation rule]
**[Validation Rule 2]:** [Description of another rule]
**Validation Timing:** [When validation occurs]
**Validation Feedback:** [How validation results are shown]

### Business Constraints
**[Constraint 1]:** [Business rule that limits component behavior]
**[Constraint 2]:** [Another business constraint]

### Technical Constraints
**Performance Limits:** [Component performance limitations]
**Browser Compatibility:** [Browser-specific limitations]
**Accessibility Requirements:** [Accessibility features component supports]

## Playwright Research Results

### Interactive Testing Notes
**User Interaction Results:** [Key findings from hands-on testing]
**State Transition Testing:** [How component transitions between states]
**Data Input Testing:** [Results of testing various input types]

### API Monitoring Results
**Network Activity:** [API calls observed during component use]
**Performance Observations:** [API response times and behavior]
**Error Testing Results:** [How component handles API failures]

### Integration Testing Results
**Parent Communication:** [How component communicates with parent]
**Sibling Interaction:** [How component interacts with siblings]
**System Integration:** [How component integrates with broader system]

### Edge Case Findings
**Boundary Testing:** [Component behavior at limits]
**Error Condition Testing:** [Component behavior during errors]
**Race Condition Testing:** [Component behavior during rapid interactions]

### Screenshots and Evidence
**[State Name] Screenshot:** [Reference to screenshot of component state]
**[Interaction Result] Screenshot:** [Reference to interaction result screenshot]
```

## ✅ ACCEPTANCE CRITERIA

- [ ] Component analyzed through comprehensive Playwright interaction
- [ ] All user interaction methods tested
- [ ] All component states identified and tested
- [ ] Component-specific API calls monitored and documented
- [ ] Data validation rules tested and documented
- [ ] Integration with parent section verified
- [ ] Error scenarios tested and recovery documented
- [ ] Edge cases explored and documented
- [ ] Output follows exact format requirements
- [ ] Focus maintained on FUNCTIONALITY, not design
- [ ] Based on observed component behavior, not code assumptions

## 📝 COMPLETION CHECKLIST

- [ ] Component located and isolated for testing
- [ ] All interaction methods tested
- [ ] Various input scenarios tested
- [ ] All component states triggered and documented
- [ ] API calls monitored during component use
- [ ] Integration with parent and siblings tested
- [ ] Error conditions triggered and documented
- [ ] Edge cases tested and documented
- [ ] Analysis documented in required format
- [ ] Component-specific screenshots captured
- [ ] Validation rules tested and confirmed
