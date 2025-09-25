# Universal Pagination Macros

## Description

Universal macros created for reusing pagination components in different parts of the application. Includes functionality for persisting page size between reloads through localStorage.

## Files

- **Macros**: `frontend/templates/macros.jinja2`
- **Implementation**: `frontend/templates/projects/view.html`

## Available Macros

### 1. `pagination()` - Full Pagination

Full-featured pagination macro with page size selector.

#### Parameters

{% raw %}

```jinja2
{% from "macros.jinja2" import pagination %}

{{ pagination(
    prefix="equipment",                  # Prefix for element IDs (required)
    page_start_id=None,                 # ID for start element (optional)
    page_end_id=None,                   # ID for end element (optional)
    total_items_id=None,                # ID for total count (optional)
    total_pages_id=None,                # ID for total pages (optional)
    current_page_id=None,               # ID for current page (optional)
    page_size_id=None,                  # ID for size selector (optional)
    prev_page_id=None,                  # ID for "previous" button (optional)
    next_page_id=None,                  # ID for "next" button (optional)
    page_sizes=[20, 50, 100],           # Available page sizes
    default_page_size=20,               # Default page size
    container_class="..."               # Container CSS classes
) }}
```

{% endraw %}

#### Usage Example

{% raw %}

```jinja2
{{ pagination("equipment", default_page_size=20) }}
```

{% endraw %}

#### Generated IDs

When using prefix `"equipment"`, automatically creates:

- `equipmentPagination` - pagination container
- `equipmentPageStart` - start element
- `equipmentPageEnd` - end element
- `equipmentTotalItems` - total count
- `equipmentTotalPages` - total pages
- `equipmentCurrentPage` - current page
- `equipmentPageSize` - size selector
- `equipmentPrevPage` - previous button
- `equipmentNextPage` - next button

### 2. `simple_pagination()` - Simplified Pagination

Simplified pagination macro without page size selector (for catalogs).

#### Configuration

{% raw %}

```jinja2
{% from "macros.jinja2" import simple_pagination %}

{{ simple_pagination(
    prefix="catalog",                   # Prefix for element IDs (required)
    page_start_id=None,                 # ID for start element (optional)
    page_end_id=None,                   # ID for end element (optional)
    total_items_id=None,                # ID for total count (optional)
    prev_page_id=None,                  # ID for "previous" button (optional)
    next_page_id=None,                  # ID for "next" button (optional)
    container_class="d-none",           # Container CSS classes
    show_total_pages=false              # Show total pages count
) }}
```

{% endraw %}

#### Usage

{% raw %}

```jinja2
{{ simple_pagination("catalog") }}
```

{% endraw %}

#### Created Elements

When using prefix `"catalog"`, automatically creates:

- `catalogPagination` - pagination container
- `catalogPageStart` - start element
- `catalogPageEnd` - end element
- `catalogTotalItems` - total count
- `catalogPrevPage` - previous button
- `catalogNextPage` - next button

## Output Structure

### Full Pagination

```text
[Showing 1-50 of 57 (Total 2 pages)]    [20 ▼] [« 1 »]
```

### Simplified Pagination

```text
[Showing 1-20 of 57]                    [‹ ›]
```

## JavaScript Integration

All element IDs remain compatible with existing JavaScript code. Pagination logic works without changes.

## Benefits

1. **Code Reuse** - one macro for all pages
2. **Interface Consistency** - same pagination appearance everywhere
3. **Easy Maintenance** - changes in one place
4. **Flexible Configuration** - customization through parameters
5. **Backward Compatibility** - all IDs preserved
6. **Precise Selection Tracking** - selector shows "100" even if fewer items

## Usage in Other Places

To use in other templates:

1. Add import:

    {% raw %}

    ```jinja2
    {% from "macros.jinja2" import pagination, simple_pagination %}
    ```

    {% endraw %}

2. Use macro with unique prefix:

    {% raw %}

    ```jinja2
    {{ pagination("clients", default_page_size=50) }}
    {{ simple_pagination("search") }}
    ```

    {% endraw %}

## Examples for Different Sections

{% raw %}

```jinja2
{# Clients #}
{{ pagination("clients", default_page_size=25, page_sizes=[25, 50, 100]) }}

{# Equipment in project - dual pagination #}
{{ pagination("equipmentTop", default_page_size=20) }}
{{ pagination("equipmentBottom", default_page_size=20) }}

{# Project list - multiple pagination for different modes #}
{{ pagination("projectsTop", default_page_size=20) }}
{{ pagination("projectsBottom", default_page_size=20) }}
{{ pagination("projectsCardTop", default_page_size=20) }}
{{ pagination("projectsCardBottom", default_page_size=20) }}

{# Catalog search #}
{{ simple_pagination("search") }}

{# Bookings #}
{{ pagination("bookings", default_page_size=30) }}
```

{% endraw %}

## Page Size Persistence (Version 1.1.0)

### Functionality

The system automatically saves user-selected page size to `localStorage` and restores it on next page visit.

### JavaScript Configuration

```javascript
// In Pagination configuration, the following options are enabled:
new Pagination({
    options: {
        persistPageSize: true,  // Enable page size persistence
        storageKey: 'project_equipment_pagesize_123',  // Unique key for each project
        useUrlParams: false     // Use URL parameters (optional)
    }
});
```

### Restoration Priority

1. **URL parameter** (if `useUrlParams: true`) - `?size=50`
2. **localStorage** - user's saved value
3. **Default value** - from configuration

### Storage Keys

- `project_equipment_pagesize_{projectId}` - for equipment list in projects
- `projects_list_pagesize` - for general project list
- `pagination_pagesize` - standard key for general cases

### Page Size Options

The system supports standard page size options [20, 50, 100]:

- Saved as numeric values in localStorage
- Properly restores user's preferred page size
- Selector displays selected numeric value

### Usage Examples

```javascript
// Unique storage for different projects
storageKey: `project_equipment_pagesize_${projectId}`

// General storage for client lists
storageKey: 'clients_pagesize'

// Project list
storageKey: 'projects_list_pagesize'

// With URL parameter support
useUrlParams: true  // Page size will be in URL
```

## Version History

### Version 1.1.0 (December 2024)

- **ENHANCED**: Added page size persistence through localStorage
- **NEW**: URL parameter support for pagination state (optional)
- **NEW**: Unique storage keys for isolation between projects
- **IMPROVED**: Page size preserved between page reloads
- **ENHANCED**: Improved page size state handling

### Version 1.0.0 (December 2024)

- Initial implementation with two macro types
- Full pagination with page size selector
- Simplified pagination for catalogs
- Bootstrap 5 compatibility
- Responsive design with mobile optimization
