# Universal Pagination Component

A comprehensive, self-rendering pagination component with themes, synchronization, and enterprise-grade features for the ACT-Rental system.

## 🎯 Key Features

- **Self-Rendering**: Manages its own HTML and DOM manipulation
- **Multiple Themes**: Full, Compact, and Minimal themes for different use cases
- **Synchronization**: Master-slave pattern for multiple synchronized instances
- **TypeScript Support**: Full JSDoc type definitions for excellent IDE support
- **Responsive Design**: Mobile-first approach with Bootstrap 5.3 compatibility
- **Persistence**: Optional localStorage support for user preferences
- **Event-Driven**: Complete event system for custom integrations

## 🚀 Quick Start

### Basic Usage

```javascript
import { Pagination } from './utils/pagination/index.js';

const pagination = new Pagination({
    container: '#pagination-container',
    theme: 'full',
    callbacks: {
        onDataLoad: async (page, pageSize) => {
            const response = await fetch(`/api/equipment?page=${page}&size=${pageSize}`);
            const data = await response.json();
            return { totalItems: data.total };
        }
    }
});
```

### Synchronized Pagination

```javascript
import { PaginationPresets } from './utils/pagination/index.js';

// Complete setup for equipment list with multiple pagination instances
const pagination = PaginationPresets.listView({
    main: '#main-pagination',
    top: '#top-pagination',
    bottom: '#bottom-pagination'
}, loadEquipmentData, 'equipment-list');
```

## 📋 Configuration

### PaginationConfig

```javascript
const config = {
    container: '#pagination',              // Required: Container selector or element
    theme: 'full',                        // Optional: Theme name
    groupId: 'my-group',                  // Optional: Sync group identifier
    role: 'master',                       // Optional: 'master' or 'slave'
    options: {
        pageSize: 20,                     // Items per page
        pageSizes: [20, 50, 100],        // Available page sizes
        showPageInfo: true,               // Show "X of Y pages"
        showPageSizeSelect: true,         // Show page size dropdown
        persistPageSize: true,            // Save to localStorage
        autoLoadOnInit: true              // Auto-load data on creation
    },
    callbacks: {
        onDataLoad: async (page, size, state) => {
            // Required: Load data for given page/size
            return { totalItems: 150 };
        },
        onError: (error) => {
            // Optional: Handle errors
            console.error('Pagination error:', error);
        }
    }
};
```

## 🎨 Themes

### Full Theme (Default)

- Complete pagination with all features
- "Page X of Y" display as requested
- Page size selector
- Full navigation with numbered pages
- Ideal for main content areas

### Compact Theme

- Simplified pagination for secondary positions
- "X of Y" format with basic navigation
- Input field for direct page jumping
- Perfect for top/bottom positions

### Minimal Theme

- Ultra-compact for limited space
- Essential navigation only (prev/next)
- "X/Y" format display
- Ideal for inline or sidebar use

## 🔄 Synchronization

The component supports master-slave synchronization where multiple instances share the same pagination state:

```javascript
// Master instance (handles data loading)
const masterPagination = new Pagination({
    container: '#main-pagination',
    theme: 'full',
    groupId: 'equipment-list',
    role: 'master',
    callbacks: { onDataLoad: loadData }
});

// Slave instances (UI only, no data loading)
const topPagination = new Pagination({
    container: '#top-pagination',
    theme: 'compact',
    groupId: 'equipment-list',  // Same group ID
    role: 'slave'               // No callbacks needed
});
```

## 📚 API Reference

### Main Class Methods

```javascript
const pagination = new Pagination(config);

// Navigation
await pagination.goToPage(5);
await pagination.nextPage();
await pagination.prevPage();
await pagination.setPageSize(50);

// State management
pagination.setTotalItems(250);
const state = pagination.getState();
pagination.reset();
await pagination.refresh();

// Theming
pagination.setTheme('compact');
pagination.updateOptions({ showPageInfo: false });

// Synchronization
pagination.joinGroup('my-group', 'master');
pagination.leaveGroup();
const groupInfo = pagination.getGroupInfo();

// Cleanup
pagination.destroy();
```

### Event System

```javascript
pagination.on('stateChanged', (state) => {
    console.log('Pagination state updated:', state);
});

pagination.on('pageChanged', ({ currentPage, totalPages }) => {
    console.log(`Page changed to ${currentPage} of ${totalPages}`);
});

pagination.on('dataLoaded', ({ page, pageSize, totalItems }) => {
    console.log(`Loaded page ${page} with ${pageSize} items`);
});
```

### Presets

```javascript
import { PaginationPresets } from './utils/pagination/index.js';

// Main content area pagination
const mainPagination = PaginationPresets.main('#pagination', loadData, {
    persistPageSize: true
});

// Secondary/top pagination
const topPagination = PaginationPresets.secondary('#top-pagination', 'my-group');

// Complete list view setup
const instances = PaginationPresets.listView({
    main: '#main-pagination',
    top: '#top-pagination',
    bottom: '#bottom-pagination'
}, loadData, 'equipment-list');
```

## 🎯 Migration from Legacy

For existing pagination implementations:

```javascript
import { migrateLegacyConfig } from './utils/pagination/index.js';

// Old format
const oldConfig = {
    containerId: '#pagination',
    pageSize: 20,
    onPageChange: handlePageChange,
    loadData: loadEquipmentData
};

// Convert to new format
const newConfig = migrateLegacyConfig(oldConfig);
const pagination = new Pagination(newConfig);
```

## 🛠️ Advanced Usage

### Custom Themes

```javascript
import { globalTemplateEngine } from './utils/pagination/index.js';

const customTheme = globalTemplateEngine.createCustomTheme(
    'custom',
    (state, options) => `<div>Custom pagination HTML</div>`,
    () => `/* Custom CSS */`
);
```

### Global Utilities

```javascript
import { PaginationUtils } from './utils/pagination/index.js';

// Preload all theme styles
PaginationUtils.preloadStyles();

// Get global statistics
const stats = PaginationUtils.getGlobalStats();

// Cleanup all resources
PaginationUtils.cleanup();
```

## 📱 Responsive Behavior

All themes are fully responsive:

- **Desktop**: Full features displayed
- **Tablet**: Compact layout, maintained functionality
- **Mobile**: Stacked layout, touch-friendly controls
- **Small screens**: Minimal theme automatically applied

## 🔧 Technical Implementation

### Architecture

- **Modular Design**: Separate concerns (state, rendering, synchronization)
- **Event-Driven**: Loose coupling between components
- **ES6 Modules**: Modern JavaScript with imports/exports
- **No Dependencies**: Pure JavaScript, no external libraries required

### Performance

- **Efficient Rendering**: Minimal DOM updates
- **Debounced Events**: Prevents excessive API calls
- **Style Injection**: Dynamic CSS loading
- **Memory Management**: Proper cleanup and garbage collection

### Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **ES6 Features**: Native ES6 modules, async/await, classes
- **Polyfills**: None required for target browsers

## 🧪 Testing

### Unit Tests

```bash
# Run pagination tests
npm test -- frontend/static/js/utils/pagination/tests/
```

### Manual Testing

```javascript
// Test pagination with mock data
const pagination = new Pagination({
    container: '#test-pagination',
    callbacks: {
        onDataLoad: async (page, size) => ({
            totalItems: 150 // Mock data
        })
    }
});
```

## 📝 Change Log

### v2.0.0 (Current Implementation)

- ✅ Self-rendering pagination component
- ✅ Three built-in themes (Full, Compact, Minimal)
- ✅ Master-slave synchronization
- ✅ "X of Y pages" display format
- ✅ Complete API with async/await support
- ✅ TypeScript definitions (JSDoc)
- ✅ Responsive design with Bootstrap 5.3
- ✅ Event system for custom integrations

### Migration Notes

- Replaces old `pagination.js` with modular architecture
- Maintains backward compatibility through migration helper
- Improves performance with efficient DOM handling
- Enhances UX with better theme system

## 🤝 Contributing

When modifying the pagination component:

1. **Follow the modular structure** - keep concerns separated
2. **Update type definitions** - maintain JSDoc comments
3. **Test all themes** - ensure consistent behavior
4. **Check responsive design** - verify mobile compatibility
5. **Update documentation** - keep README current

## 🐛 Troubleshooting

### Common Issues

**Pagination not rendering:**

```javascript
// Check container exists
const container = document.querySelector('#pagination');
console.log('Container found:', !!container);
```

**Synchronization not working:**

```javascript
// Verify group configuration
console.log('Group info:', pagination.getGroupInfo());
```

**Theme styles missing:**

```javascript
// Force style injection
import { globalTemplateEngine } from './utils/pagination/index.js';
globalTemplateEngine.injectStyles('full');
```

### Debug Mode

```javascript
// Enable debug logging
const pagination = new Pagination({
    // ... config
    options: {
        debug: true // Will log all state changes
    }
});
```
