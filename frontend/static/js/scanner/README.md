# Scanner Modules

This folder contains modules for barcode scanner functionality.

## Module Structure

### session-search.js

Module for searching and filtering items within scanning sessions.

**Exported functions:**

- `filterSessionItems(items, query)` - filter items by search query
- `updateSearchCounters(foundCount, totalCount)` - update search counters in UI
- `renderSessionItems(session, itemsToRender, attachItemButtonListeners)` - render session items
- `initSessionSearch(performSearchCallback)` - initialize search functionality
- `performSessionSearch(query, scanStorage, renderCallback)` - perform search operation
- `getCurrentSearchQuery()` - get current search query
- `resetSearchState()` - reset search state

## Planned Modules

During further refactoring of `scanner.js`, the following modules are planned to be extracted:

### session-management.js

- Session management functionality
- Create, load, rename sessions
- Server synchronization

### scan-result.js

- Display scan results
- Template processing
- Equipment information updates

### equipment-history.js

- Load and display equipment history
- Timeline functionality
- Booking management

### barcode-scanner.js

- Barcode scanning processing
- Equipment API integration
- Scan error handling

### modal-management.js

- Modal window management
- Accessibility fixes
- Centralized event handling

## Organization Principles

1. **Separation of Concerns** - each module is responsible for specific functionality
2. **Loose Coupling** - modules interact through well-defined interfaces
3. **Reusability** - common functions are extracted to separate utilities
4. **Testability** - modules can be tested in isolation

## Module Imports

```javascript
// Example import in scanner.js
import {
    filterSessionItems,
    initSessionSearch,
    performSessionSearch
} from './scanner/session-search.js';
```
