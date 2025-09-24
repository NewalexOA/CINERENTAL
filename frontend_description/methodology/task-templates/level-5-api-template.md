# LEVEL 5 TASK TEMPLATE: API INTEGRATION ANALYSIS

## 🎯 TASK OBJECTIVE

**Goal:** Analyze a specific API endpoint integration, its usage patterns, and frontend implementation.

**Focus:** FUNCTIONALITY, NOT DESIGN - describe what the API integration does, not how it appears visually.

## 📋 TASK SPECIFICATION

### Input Data Required

- API endpoint URL and method
- Frontend components/pages that use this API
- JavaScript functions that call this endpoint
- Backend OpenAPI schema reference (if available)

### Expected Analysis Areas

#### 1. API Endpoint Purpose and Context

- Business function this endpoint serves
- Frontend features that depend on this endpoint
- User workflows that trigger this API call
- Integration with other API endpoints

#### 2. Request/Response Patterns

- Request structure and parameters
- Response format and data structure
- Authentication and authorization requirements
- Error response formats and codes

#### 3. Frontend Integration

- Where and how API is called in frontend code
- Data transformation before/after API calls
- Error handling and user feedback
- Loading states and user experience

#### 4. Data Flow and State Management

- How API data flows through frontend
- State management patterns used
- Data caching and persistence
- Update patterns and data synchronization

### 🔍 MANDATORY PLAYWRIGHT RESEARCH

**CRITICAL:** Use MCP Playwright to observe API behavior in live application:

#### Research Steps

1. **Setup Monitoring:**

   ```bash
   # Open relevant page(s) in Playwright
   # Enable Network tab monitoring
   # Focus on specific API endpoint calls
   ```

2. **API Call Triggering:**
   - Identify all user actions that trigger this API
   - Test different parameter combinations
   - Trigger API calls with various data inputs
   - Test API calls in different application states

3. **Request Analysis:**
   - Monitor exact request parameters sent
   - Observe request headers and authentication
   - Document request timing and frequency
   - Test request validation and constraints

4. **Response Handling:**
   - Monitor response formats and data structure
   - Observe how frontend processes responses
   - Test different response scenarios
   - Document response validation and error handling

5. **Error Scenario Testing:**
   - Trigger various error conditions
   - Test network failure scenarios
   - Test server error responses
   - Observe error handling and user feedback

6. **Performance Testing:**
   - Monitor API response times
   - Test API behavior under different loads
   - Observe caching behavior
   - Test concurrent API calls

7. **Integration Testing:**
   - Test API integration with other endpoints
   - Verify data consistency across API calls
   - Test API calls in different user contexts
   - Validate API call sequences and dependencies

### ❌ WHAT NOT TO DESCRIBE

**DO NOT focus on:**

- UI elements that display API data
- Visual formatting of API responses
- Styling of loading or error states
- Layout of data presentation
- Visual feedback mechanisms
- Design patterns for data display

### ✅ WHAT TO DESCRIBE

**FOCUS ON:**

- What business operation the API enables
- Request/response data structures
- Error handling and validation logic
- Data transformation and processing
- State management and data flow
- Performance characteristics and constraints

## 📊 EXPECTED OUTPUT FORMAT

Create file: `tasks/level-5-api/TASK-{NUMBER}-{api-name}-integration.md`

### Output Structure

```markdown
# TASK-{NUMBER}: {API Endpoint} Integration Analysis

## API Integration Overview
**Endpoint:** `{METHOD} {endpoint_url}`
**Business Purpose:** [What business function this API enables]
**Frontend Usage:** [Which frontend components/pages use this API]
**User Actions:** [What user actions trigger this API call]

## API Specification

### Request Structure
**Method:** {HTTP_METHOD}
**Endpoint:** `{endpoint_url}`
**Content-Type:** `{content_type}`

#### Parameters
**Path Parameters:**
- `{param_name}`: [Description and validation rules]

**Query Parameters:**
- `{param_name}`: [Description, type, required/optional]

**Request Body:**
```json
{
  "field_name": "field_description_and_type",
  "field_name2": "field_description_and_type"
}
```

#### Authentication

**Auth Type:** [Bearer token, session, etc.]
**Headers Required:** [List of required headers]
**Permissions:** [What user permissions are needed]

### Response Structure

#### Success Response (200/201)

```json
{
  "field_name": "field_description_and_type",
  "field_name2": "field_description_and_type"
}
```

#### Error Responses

**400 Bad Request:**

```json
{
  "error": "error_description",
  "details": "validation_details"
}
```

**401 Unauthorized:**
[Description of unauthorized response]

**404 Not Found:**
[Description of not found response]

**500 Server Error:**
[Description of server error response]

## Frontend Integration

### API Call Implementation

**Location:** [Which JavaScript files contain API calls]
**Function/Method:** [Specific functions that call this API]
**Call Pattern:** [How the API is called - direct fetch, through service, etc.]

#### Request Building

**Parameter Assembly:** [How request parameters are built]
**Data Validation:** [Frontend validation before API call]
**Header Construction:** [How request headers are built]

#### Response Processing

**Data Extraction:** [How response data is extracted]
**Data Transformation:** [Any data transformation applied]
**State Updates:** [How response updates application state]

### Error Handling

#### Network Errors

**Detection:** [How network errors are detected]
**User Feedback:** [How network errors are communicated to user]
**Recovery:** [How user can recover from network errors]

#### Server Errors

**Error Processing:** [How server errors are processed]
**Error Display:** [How errors are shown to user]
**Error Recovery:** [Recovery mechanisms for server errors]

#### Validation Errors

**Validation Feedback:** [How validation errors are displayed]
**Field-Level Errors:** [How specific field errors are handled]
**Error Correction:** [How user can correct validation errors]

### Loading States

#### Request Initialization

**Loading Indicators:** [How loading state is triggered]
**User Interface Changes:** [What happens to UI during loading]
**User Restrictions:** [What user cannot do during loading]

#### Loading Duration

**Expected Duration:** [Typical API response time]
**Timeout Handling:** [How timeouts are handled]
**Progress Indication:** [How progress is communicated]

## Data Flow Patterns

### Input Data Flow

**Data Sources:** [Where request data comes from]
**Data Assembly:** [How request data is assembled]
**Data Validation:** [Validation applied before sending]

### Output Data Flow

**Response Processing:** [How response data is processed]
**State Updates:** [What application state is updated]
**UI Updates:** [How UI is updated with response data]
**Data Persistence:** [How response data is stored/cached]

### Data Synchronization

**Cache Updates:** [How cached data is updated]
**Related Data Updates:** [How related data is synchronized]
**Optimistic Updates:** [Any optimistic update patterns]

## API Usage Patterns

### Call Triggers

1. **[Trigger Type]:** [Description of what triggers API call]
2. **[Another Trigger]:** [Description of another trigger condition]

### Call Frequency

**Usage Patterns:** [How often this API is called]
**Caching Strategy:** [How responses are cached]
**Rate Limiting:** [Any rate limiting considerations]

### Batch Operations

**Bulk Requests:** [If API supports bulk operations]
**Transaction Patterns:** [If API is part of transaction sequences]
**Dependency Chains:** [Dependencies on other API calls]

## Performance Characteristics

### Response Times

**Typical Response Time:** [Average response time observed]
**Performance Factors:** [Factors that affect performance]
**Performance Optimizations:** [Any optimizations implemented]

### Resource Usage

**Data Transfer:** [Amount of data transferred]
**Request Overhead:** [Request/response overhead]
**Caching Benefits:** [Benefits of caching strategy]

### Scalability Considerations

**Load Characteristics:** [How API behaves under load]
**Concurrent Requests:** [Handling of concurrent requests]
**Resource Limitations:** [Any resource limitations observed]

## Integration Dependencies

### Prerequisite APIs

**Required Calls:** [API calls that must happen before this one]
**Data Dependencies:** [Data that must be available]
**State Requirements:** [Application state requirements]

### Downstream Effects

**Dependent Operations:** [Operations that depend on this API]
**State Changes:** [How this API affects global state]
**UI Updates:** [UI components affected by this API]

### Error Propagation

**Error Impact:** [How API errors affect other operations]
**Error Recovery:** [Recovery from API failures]
**Fallback Strategies:** [Fallback strategies when API fails]

## Playwright Research Results

### API Monitoring Results

**Request Patterns:** [Observed request patterns and timing]
**Response Analysis:** [Analysis of response formats and data]
**Error Testing Results:** [Results of error condition testing]

### Performance Observations

**Response Times:** [Measured response times under different conditions]
**Network Behavior:** [Network activity patterns observed]
**Caching Behavior:** [Caching behavior observations]

### Integration Testing Results

**Sequential API Calls:** [How API integrates with other calls]
**State Management:** [How API calls affect application state]
**Error Handling Validation:** [Validation of error handling implementations]

### User Experience Impact

**Loading Experience:** [Impact on user experience during API calls]
**Error Experience:** [User experience during error conditions]
**Performance Impact:** [Impact on overall application performance]

### Edge Case Findings

**Boundary Conditions:** [API behavior at limits and boundaries]
**Concurrent Access:** [Behavior during concurrent access]
**Error Recovery:** [Effectiveness of error recovery mechanisms]

## ✅ ACCEPTANCE CRITERIA

- [ ] API endpoint analyzed through comprehensive Playwright monitoring
- [ ] All request/response patterns documented with real examples
- [ ] Error scenarios tested and documented
- [ ] Frontend integration patterns identified and documented
- [ ] Data flow and state management patterns analyzed
- [ ] Performance characteristics measured and documented
- [ ] Integration dependencies identified and verified
- [ ] Output follows exact format requirements
- [ ] Focus maintained on FUNCTIONALITY, not visual presentation
- [ ] Based on observed API behavior, not code assumptions alone

## 📝 COMPLETION CHECKLIST

- [ ] API endpoint identified and accessed
- [ ] All API call triggers tested
- [ ] Request/response monitoring completed
- [ ] Error scenarios triggered and documented
- [ ] Performance measurements taken
- [ ] Integration patterns verified
- [ ] Data flow analyzed and documented
- [ ] Analysis documented in required format
- [ ] API behavior screenshots/evidence captured
- [ ] Frontend integration validated through testing
