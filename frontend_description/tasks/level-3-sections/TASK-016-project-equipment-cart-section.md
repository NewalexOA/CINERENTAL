# TASK-016: Project Equipment Cart Section Analysis

## Section Overview

**Parent Page:** Project Detail/View Page
**Section Purpose:** Universal cart integration for equipment selection, management, and booking within project context
**Page URL:** `http://localhost:8000/projects/{id}`
**Section Location:** Embedded cart section within project page, or floating cart overlay depending on page configuration

## 🔍 MANDATORY PLAYWRIGHT RESEARCH

**CRITICAL:** Use MCP Playwright to interactively test the project equipment cart section:

### Research Steps

1. **Section Location:**

   ```bash
   # Open project detail page in Playwright
   # Identify universal cart section (embedded mode with #universalCartContainer)
   # Test both embedded and floating cart modes if applicable
   # Locate cart toggle, item display area, and cart actions
   ```

2. **Functional Testing:**
   - Add equipment items to cart using search/scanner integration
   - Test cart item quantity modification (increase/decrease)
   - Remove items from cart using delete/remove buttons
   - Test cart persistence during page navigation
   - Use bulk cart operations (clear all, select all)
   - Test cart checkout process to add items to project
   - Verify cart integration with barcode scanner
   - Test cart capacity limits and validation

3. **State Observation:**
   - Document empty cart state with guidance messaging
   - Observe cart loading states during operations
   - Record cart error states (API failures, validation errors)
   - Test cart full/capacity limit states
   - Observe cart success states after operations

4. **Integration Testing:**
   - Test cart integration with equipment search functionality
   - Verify cart sync with project equipment list
   - Test cart interaction with barcode scanner
   - Check cart behavior during project equipment changes
   - Test cart state preservation during browser refresh

5. **API Monitoring:**
   - Monitor cart operation API calls (add, remove, update)
   - Document cart checkout API integration with project
   - Record cart persistence API calls
   - Track equipment availability checking from cart

6. **Edge Case Testing:**
   - Test cart with unavailable equipment items
   - Test cart with equipment that becomes unavailable
   - Test cart during network connectivity issues
   - Test cart with very large quantities or item counts

## Section Functionality

### Core Operations

#### Equipment Addition Operation

- **Purpose:** Add equipment items to the cart for later booking to the project
- **User Interaction:** Equipment selected from search results, scanner input, or direct addition
- **Processing Logic:** Equipment validated for availability, added to cart with default quantity, cart state updated
- **Output/Result:** Equipment item appears in cart list, cart item count updated, availability status checked

#### Quantity Management Operation

- **Purpose:** Adjust quantities of equipment items already in the cart
- **User Interaction:** Use quantity controls (+ / - buttons) or direct input to modify item quantities
- **Processing Logic:** Quantity validation against availability, cart item updated, total calculation refreshed
- **Output/Result:** Updated quantity displayed, cart totals recalculated, availability status re-checked

#### Item Removal Operation

- **Purpose:** Remove unwanted equipment items from the cart
- **User Interaction:** Click remove button on individual items or use bulk removal actions
- **Processing Logic:** Item removed from cart state, cart totals recalculated, item availability released
- **Output/Result:** Item disappears from cart, cart count updated, empty cart state if no items remain

#### Cart Checkout Operation

- **Purpose:** Transfer all cart items to the project as booked equipment
- **User Interaction:** Click checkout/book button to confirm addition of all cart items to project
- **Processing Logic:** Availability final check, equipment booking API calls, cart cleared on success
- **Output/Result:** Equipment added to project booking list, cart cleared, confirmation message displayed

### Interactive Elements

#### Cart Item List

- **Function:** Display all equipment items currently in cart with quantities and details
- **Input:** Visual display of cart contents, item interactions for quantity/removal
- **Behavior:** Scrollable list, item details display, quantity controls per item
- **Validation:** Item availability validation, quantity limit checking
- **Feedback:** Visual availability indicators, quantity validation messages

#### Quantity Controls

- **Function:** Increment/decrement quantity controls for each cart item
- **Input:** Click + / - buttons or direct numeric input in quantity field
- **Behavior:** Immediate quantity update, real-time validation, disable controls at limits
- **Validation:** Minimum quantity (1), maximum availability limits, numeric input validation
- **Feedback:** Disabled button states, validation error messages, availability warnings

#### Remove Item Buttons

- **Function:** Individual item removal from cart
- **Input:** Click X or remove button on specific cart items
- **Behavior:** Immediate item removal, cart recalculation, confirmation if configured
- **Validation:** No validation required for removal
- **Feedback:** Smooth item removal animation, cart count update

#### Cart Actions Panel

- **Function:** Bulk cart operations and checkout controls
- **Input:** Click actions like Clear All, Check Availability, Checkout
- **Behavior:** Bulk operations with confirmation, checkout process initiation
- **Validation:** Cart content validation, availability checking before checkout
- **Feedback:** Operation confirmations, loading states, success/error messaging

#### Cart Toggle/Visibility Controls

- **Function:** Show/hide cart in floating mode, expand/collapse in embedded mode
- **Input:** Click cart toggle button or close button
- **Behavior:** Smooth cart visibility transitions, state preservation
- **Validation:** No validation required
- **Feedback:** Toggle button state changes, visual transition effects

### Data Integration

- **Data Sources:** Universal cart API, equipment availability API, project booking API
- **API Endpoints:**
  - Cart management endpoints (add, remove, update, clear)
  - `GET /api/v1/equipment/available` for availability checking
  - `POST /api/v1/projects/{id}/equipment` for checkout process
- **Data Processing:** Cart item validation, availability checking, quantity calculations
- **Data Output:** Cart data for checkout, equipment IDs for project booking

## Section States

### Empty State

Cart displays "no items" message with guidance for adding equipment, cart actions disabled

### Populated State

Cart shows equipment items with quantities, all cart actions enabled, checkout button available

### Loading State

Cart shows loading indicators during operations, buttons disabled during API calls

### Error State

Cart displays error messages for failed operations, retry options provided

### Checkout State

Cart shows checkout progress, items being processed, success confirmation on completion

### Availability Warning State

Cart displays warnings for items with availability conflicts, resolution guidance provided

## API Integration Details

### Section-Specific API Calls

1. **Universal Cart API Endpoints**
   - **Trigger:** All cart operations (add, remove, update quantities)
   - **Parameters:**
     - `item_id`: Equipment ID for cart operations
     - `quantity`: Item quantity for addition/updates
     - `project_id`: Current project context for availability checking
   - **Response Handling:** Cart state updated, UI refreshed with new cart contents
   - **Error Handling:** Operation errors displayed with retry options

2. **GET /api/v1/equipment/available**
   - **Trigger:** Cart item addition, quantity changes, availability checks
   - **Parameters:** Equipment IDs, project date range for availability context
   - **Response Handling:** Availability status updated in cart item display
   - **Error Handling:** Availability warnings displayed, items flagged as unavailable

3. **POST /api/v1/projects/{id}/equipment**
   - **Trigger:** Cart checkout operation
   - **Parameters:** Equipment IDs and quantities from cart, project booking dates
   - **Response Handling:** Equipment added to project, cart cleared, success confirmation
   - **Error Handling:** Checkout failures displayed with detailed error messages

### Data Flow

Equipment selection → Cart addition → Availability validation → Quantity management → Checkout → Project booking

## Integration with Page

- **Dependencies:** Requires project context for availability checking, integrates with equipment search
- **Effects:** Cart checkout updates project equipment list, affects equipment availability
- **Communication:** Receives equipment from search/scanner, sends booking data to project

## User Interaction Patterns

### Primary User Flow

1. User searches for equipment or scans barcodes to find items
2. Equipment items added to cart with default quantities
3. User reviews cart contents and adjusts quantities as needed
4. User checks equipment availability and resolves any conflicts
5. User proceeds to checkout to book all cart items to project

### Alternative Flows

- Bulk addition: User adds multiple equipment items rapidly via scanner
- Quantity planning: User adds items then carefully adjusts quantities based on needs
- Availability management: User resolves availability conflicts before checkout
- Cart persistence: User builds cart over multiple sessions, cart state preserved

### Error Recovery

- Addition failures: User gets clear error messages and can retry
- Availability conflicts: User can modify quantities or remove items
- Checkout failures: User gets detailed failure reasons and resolution steps
- Network issues: Cart operations queue and retry when connection restored

## Playwright Research Results

### Functional Testing Notes

- Cart should provide smooth user experience with immediate feedback
- Quantity controls should be responsive and validate input in real-time
- Cart persistence should work reliably across page navigation
- Checkout process should provide clear progress indication

### State Transition Testing

- Test empty → populated → checkout → empty state cycle
- Verify proper state management during network interruptions
- Test cart state preservation during page refresh
- Verify error state recovery to normal operation

### Integration Testing Results

- Cart should integrate seamlessly with equipment search functionality
- Scanner integration should add items to cart immediately
- Cart checkout should properly update project equipment list
- Availability checking should be accurate and real-time

### Edge Case Findings

- Large cart sizes should be handled efficiently without performance issues
- Unavailable items should be clearly marked with resolution guidance
- Network failures should queue operations and retry appropriately
- Cart limits should be clearly communicated and enforced

### API Monitoring Results

- Cart operations should be optimized to minimize API calls
- Availability checking should be efficient and cached when possible
- Checkout operations should be atomic to prevent partial failures
- Error responses should provide actionable feedback for users

### Screenshot References

- Empty cart state: Clean interface with guidance for adding equipment
- Populated cart: Cart with multiple items showing quantities and details
- Loading state: Cart operations with loading indicators and disabled controls
- Error state: Cart with error messaging and retry options
- Checkout state: Cart showing checkout progress and completion confirmation
