# 📊 Logging System Guide

## Overview

The logging system provides centralized control over debug information output to the browser console. This allows:

- ✅ Disable excessive logging in production (95% log volume reduction)
- 🔧 Easy enable/disable logging for debugging
- 🎯 Manage logging by components
- ⚡ Preserve browser performance

## Quick Start

### In browser console

```javascript
// Enable all logs for debugging
window.logger.enable()

// Disable all logs
window.logger.disable()

// Enable only API logs
window.logger.enableComponent('api', {
    requests: true,
    responses: true,
    timing: true
})

// Check current status
window.logger.getConfig()
```

### In code

```javascript
import { getLogConfig } from './utils/logger.js';

const LOG_CONFIG = {
    get myComponent() {
        return getLogConfig('myComponent');
    }
};

// Conditional logging
if (LOG_CONFIG.myComponent.enabled) {
    console.log('Debug information');
}
```

## Component Configuration

### API (`api`)

- `enabled`: Main toggle
- `requests`: Log requests and statuses
- `responses`: Log responses
- `headers`: Log HTTP headers
- `timing`: Log execution time

### Pagination (`pagination`)

- `enabled`: Main toggle
- `events`: Log events (clicks, changes)
- `dataLoad`: Log data loading
- `stateChanges`: Log state changes

### Filters (`filters`)

- `enabled`: Main toggle
- `init`: Log initialization
- `dataLoad`: Log data loading

### UI components (`ui`)

- `enabled`: Main toggle
- `events`: Log UI events
- `init`: Log component initialization

## System Files

### Core files

- `frontend/static/js/utils/logger.js` - Main logger module
- `frontend/static/js/utils/api.js` - API client with logging
- `frontend/static/js/utils/pagination.js` - Pagination with logging
- `frontend/static/js/project/equipment/filters.js` - Filters with logging

### Test files

- `frontend/test-logging.html` - Interactive testing page

## Usage Examples

### Enable logs for development

```javascript
// In browser console
window.logger.enable()

// Or for specific component
window.logger.enableComponent('api', {
    requests: true,
    responses: false,
    timing: true
})
```

### Debug API issues

```javascript
// Enable detailed API logging
window.logger.enableComponent('api', {
    requests: true,
    responses: true,
    headers: true,
    timing: true
})

// Execute problematic request and observe logs
```

### Debug pagination

```javascript
// Enable pagination logs
window.logger.enableComponent('pagination', {
    events: true,
    dataLoad: true,
    stateChanges: true
})

// Use pagination and observe logs
```

## Integration into New Components

### 1. Import logger

```javascript
import { getLogConfig } from './utils/logger.js';

const LOG_CONFIG = {
    get myComponent() {
        return getLogConfig('myComponent');
    }
};
```

### 2. Conditional logging

```javascript
class MyComponent {
    init() {
        if (LOG_CONFIG.myComponent.enabled && LOG_CONFIG.myComponent.init) {
            console.log('Initializing MyComponent');
        }
    }

    loadData() {
        if (LOG_CONFIG.myComponent.enabled && LOG_CONFIG.myComponent.dataLoad) {
            console.group('📊 Loading MyComponent data');
            console.log('Parameters:', params);
            console.groupEnd();
        }
    }
}
```

### 3. Add to global configuration

In file `frontend/static/js/utils/logger.js`:

```javascript
// Add to DEFAULT_CONFIG
myComponent: {
    enabled: false,  // false for production
    init: false,
    dataLoad: false,
    events: false
}
```

## Performance

### Before optimization

- Hundreds of logs per action
- Browser slowdown with active usage
- Console clutter

### After optimization

- ~95% log volume reduction in production
- Preserve all debugging capabilities
- Easy enable/disable for development

## Testing

1. Open `frontend/test-logging.html` in browser
2. Open browser console (F12)
3. Test various scenarios using buttons
4. Observe log volume changes

## Recommendations

### For development

```javascript
// Enable all logs
window.logger.enable()
```

### For production

```javascript
// All logs disabled by default
// No additional action needed
```

### For debugging specific issues

```javascript
// Enable only needed components
window.logger.enableComponent('api', { requests: true, timing: true })
window.logger.enableComponent('pagination', { events: true })
```

### When adding new component

1. Import `getLogConfig`
2. Create local configuration
3. Add conditional checks before `console.*`
4. Add component to global configuration

## Support

When issues occur:

1. Check configuration: `window.logger.getConfig()`
2. Ensure imports are correct
3. Check console for JavaScript errors
4. Use test page for diagnostics

---

**Status**: ✅ System ready for use
**Updated**: December 2024
**Version**: 1.0
