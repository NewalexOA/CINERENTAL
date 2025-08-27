# ACT-Rental Changelog

This document lists notable changes to the ACT-Rental application.

## [0.15.0-beta.2] - 2025-08-27

### Comprehensive Backup and Restore System

- **Automated Backup Infrastructure:** Added `create_backup.sh` script for automated full system backups with PostgreSQL database dumps, version detection, and validation. Docker volume backups (postgres, redis, media) with compression and timestamped backup directories with comprehensive metadata. External storage in `~/Documents/ACT-Rental-Backups/` with configurable retention policies.
- **Volume-Based Restoration:** Replaced SQL-based restore with Docker volume restoration for improved reliability and eliminated database migration conflicts. Container lifecycle management with proper cleanup procedures, absolute path handling for Docker Compose operation, and exact state restoration preserving Alembic versions.
- **Desktop Launcher Integration:** BackupManager and BackupService with caching, performance optimizations, and comprehensive validation. BackupInfo dataclass with formatted properties and system readiness checks. Integrated backup UI components in MainWindow with progress tracking, real-time status monitoring, and automated backup operations with confirmation dialogs.

### CI/CD Pipeline Stabilization and Docker Improvements

- **Docker Build Fixes:** Resolved Alpine Linux package compatibility issues for Playwright dependencies with correct accessibility package names (`libatk1.0-0`, `libatk-bridge2.0-0`, `libatspi2.0-0`). Reverted to Debian-based image for better Playwright wheel compatibility and added missing dependencies (`libcairo2`, `libpango-1.0-0`). Enhanced package installation with aptitude for better dependency resolution.
- **Build Context Improvements:** Added README.md to Docker build context for Poetry compatibility, fixed script execution order and file permissions. Resolved "Readme path does not exist" error during package installation and updated Debian sources to use bookworm (latest stable).
- **Pre-commit Integration:** Added convenient Makefile targets (`make pre-commit-install`, `make pre-commit`, `make pre-commit-check`) for automated code quality checks. Fixed Black formatting issues across backend and test files, installed and configured pre-commit hooks for enhanced development workflow.

### Enhanced Business Logic and System Integration

- **Flexible Date Validation:** Removed restrictive past date validation to enable retrospective data entry and historical booking creation. Updated booking service to allow past dates while maintaining data integrity and comprehensive test coverage for past date scenarios.
- **Production Configuration:** Fixed default project path from `~/Github/CINERENTAL` to `~/Documents/GitHub/CINERENTAL` with updated DockerManager initialization and correct fallback paths. Enhanced project path selection dialog with proper defaults and consistent path handling across launcher components.
- **Docker Compatibility:** Enhanced PATH environment setup for macOS with Docker Desktop integration, added fallback methods (docker ps, HTTP health check) for container detection. Comprehensive logging for Docker detection and **BREAKING CHANGE:** Production apps require Docker in standard macOS locations.

### Technical Improvements & Bug Fixes (0.15.0-beta.2)

- Enhanced error handling with improved JSON parsing and subprocess management with UTF-8 encoding support
- Automatic status refresh after backup restore operations with timeout and error handling
- Fixed missing type annotations, unused imports, and standardized quote usage across codebase
- Updated .gitignore to exclude CLAUDE.md and .claude files from version control
- Enhanced backup system integration with DockerManager for consistent status checking
- Improved system reliability with comprehensive validation and monitoring capabilities

## [0.15.0-beta.1] - 2025-07-11

### Universal Cart System & Equipment Management Transformation

- **Universal Cart Foundation Infrastructure:** Implemented comprehensive cart-based equipment management system with UniversalCart class for item management and validation, CartStorage class with localStorage persistence and data migration, and CartUI class with Bootstrap-based responsive interface. Support for multiple cart configurations and types (add, return, transfer) with event-driven design and comprehensive JSDoc documentation.
- **Modular Architecture Transformation:** Refactored monolithic 1291-line file into 11 specialized modules following Single Responsibility Principle with 4476 lines across focused modules. Created new modular directory structure with core business logic (UniversalCart, CartStorage), UI components (CartTemplates, CartRenderer, CartDialogs), event handling (CartEventHandler), configuration (cart-configs), and integration modules (cart-integration).

### Scanner Integration & Direct Cart Addition

- **Enhanced Barcode Scanner Workflow:** Implemented direct equipment addition to cart upon scanning for both HID and camera scanners with automatic cart integration and smart fallback to search functionality. Streamlined scanning workflow eliminating search-only limitations with immediate cart addition instead of traditional search-only workflow.
- **Multi-Selection & Search Integration:** Added cart-integration.js with multi-selection and bulk operations, checkbox-based equipment selection in search results, and "Select All" functionality. Real-time cart controls with dynamic item count display and comprehensive validation with error handling (584 lines across 2 integration modules).

### Dual Rendering Modes & Project Integration

- **Embedded Mode Implementation:** Seamless integration with project view templates through inline cart container between equipment sections, table mode rendering matching project equipment layout, and daterangepicker integration for period inputs with validation. Automatic project context detection and data extraction with date range validation and formatting for booking creation.
- **Floating Mode & UI Enhancement:** Traditional overlay cart for equipment search pages with Bootstrap modal integration, outside click and Escape key handling, mobile-responsive progress indicators, and confirmation dialog integration with cart UI for seamless workflow integration.

### Batch Operations & API Integration

- **Batch Bookings API:** New `/api/v1/bookings/batch` POST endpoint for mass booking creation supporting up to 100 bookings per request with comprehensive validation. Transactional processing with automatic rollback on failures and graceful degradation for partial failures with detailed response including success/failure counts.
- **Smart Equipment Addition Logic:** Two-step booking creation process (create booking → add to project) with smart duplicate detection for equipment without serial numbers. Equipment with same ID and matching dates now increases quantity instead of creating duplicates, with automatic UI refresh after equipment addition and comprehensive error handling.

### Equipment Rental Status System

- **Backend Rental Status Implementation:** Added get_active_projects_for_equipment method to EquipmentRepository and get_equipment_list_with_rental_status method to EquipmentService. Implemented proper layered architecture with repository pattern using two-query approach for optimal performance with comprehensive error handling and validation.
- **Interactive Frontend Status Display:** Updated equipment list template with rental status column, JavaScript functions for rental status badge generation, and interactive popover for on-project status. Color-coded project timeline (gray=past, blue=current, black=future) with chronological sorting by start_date and proper accessibility attributes with keyboard navigation.

### Technical Improvements & Bug Fixes (0.15.0-beta.1)

- Fixed modal handling and focus management in equipment session management with proper Bootstrap modal instance reuse
- Corrected frontend scan module method calls from `addToSession` to `addEquipment` and exported `addToScanSession` function globally
- Enhanced date handling and logging in cart operations with detailed debug logging for item processing
- Optimized resource allocation in docker-compose configuration and set default client status in seed data
- Fixed project classification in rental status popovers with proper null date handling to prevent Unix epoch dates

## [0.14.0-beta.1] - 2025-06-19

### Pagination System Overhaul & API Fixes

- **FastAPI Pagination Fixes:** Resolved critical ValidationError issues in multiple paginated endpoints by replacing manual Page object creation with proper fastapi-pagination transformer patterns. Fixed HTTP 422/500 errors in `/projects/{project_id}/bookings/paginated` endpoint using paginate() function with lambda transformers.
- **Pagination System Standardization:** Removed problematic "show all" option from all pagination components across the application. Standardized page sizes to 20, 50, 100 items for consistent behavior and improved performance. Fixed pagination defaults conflict when "all" page size was persisted in localStorage.

### Equipment Booking History Pagination

- **New Equipment Pagination Feature:** Added comprehensive pagination to equipment booking history with dedicated `/equipment/{id}/bookings/paginated` API endpoint. Integrated universal Pagination class with synchronized top and bottom pagination controls, configurable page sizes, and localStorage persistence.
- **Enhanced Error Handling:** Implemented robust error handling for pagination initialization with try-catch blocks, user-friendly toast notifications, and graceful API failure management. Fixed page size consistency between UI display and actual loaded data.

### Architecture & Code Quality Improvements

- **Data Architecture Fixes:** Resolved non-existent method references in seed_data.py by replacing `get_overlapping_bookings` with proper `check_availability` following DDD principles. Added safe fallback values for enum status types (BookingStatus, PaymentStatus, ClientStatus, EquipmentStatus, ProjectStatus) to prevent AttributeError exceptions.
- **Frontend Stability:** Fixed null reference errors in equipment search setup with comprehensive DOM element validation. Resolved CSS `:has()` selector compatibility issues for older browsers by replacing with `closest()` method. Improved quantity UI handling and filter operations with proper error boundaries.

### Documentation & Development Experience

- **Comprehensive Documentation Updates:** Updated pagination documentation to reflect show_all_option removal and added comprehensive English code style guide translated from Russian. Enhanced pagination logging and debugging capabilities with detailed calculation information and consistent logging format.
- **GitHub Workflow Improvements:** Improved issue auto-closing logic in GitHub Actions with enhanced regex matching, existence validation, and proper error handling for 404 cases.

### Technical Improvements & Bug Fixes (0.14.0-beta.1)

- Fixed equipment count synchronization lag in project filters by passing total count from API responses
- Resolved pagination calculation errors when itemsPerPage is undefined with proper fallback mechanisms
- Improved JavaScript promise rejection handling in pagination initialization
- Enhanced enum handling throughout the application with defensive programming practices
- Cleaned up obsolete comments and references to removed "show all" functionality

## [0.13.0-beta.1] - 2025-06-14

### Project Search & Unified Filters

- **Backend Project Name Search:** Added case-insensitive search by project name using ILIKE in the repository layer. All project endpoints now support an optional query parameter for name filtering, following the equipment search pattern for consistency.
- **Frontend Real-Time Search:** Implemented responsive search input with 300ms debounce, loading spinner, and clear button. Search and filters are unified in a single row with optimized Bootstrap grid proportions. Accessibility features (ARIA labels, keyboard navigation) and Material Design principles applied for a consistent user experience.
- **Unified Filters Row:** Merged search and filters into a compact, responsive row. Integrated inline clear button, reduced filter widths, and ensured full compatibility with existing JavaScript and mobile devices.

### Bookings API Modernization & SQL-Level Pagination

- **Repository & Service Pagination:** Introduced efficient SQL OFFSET/LIMIT pagination in the booking repository and service layers, reducing memory usage from O(n) to O(page_size). All existing filtering parameters are preserved, and query/result separation enables fastapi-pagination integration.
- **API & Frontend Pagination:** Switched bookings API to `Page[BookingResponse]` format with full pagination metadata. Updated frontend to handle new response structure, including Bootstrap pagination UI, state management, and metadata display. All integration tests updated and passing (14/14 booking, 329/329 total).

### Modular ProjectService & Advanced Booking Filtering

- **Modular Architecture:** Refactored ProjectService into a modular facade with CRUD, query, booking, and formatter operations. Introduced `DateFilterType` enum for advanced booking filtering (ALL, DIFFERENT, MATCHING). API endpoints updated for modular service and enhanced filtering. Achieved 69% code reduction and improved maintainability with 100% backward compatibility.
- **Booking Data Reliability:** Optimized booking data loading and seeding to prevent duplicates. Improved logging, import paths, and field mapping. Cleaned up validators directory and optimized import structure.

### Universal Frontend Pagination & Equipment List Modernization

- **Universal Pagination System:** Added reusable JavaScript utility and Jinja2 macro for pagination with persistent page size (localStorage). Supported multiple synchronized paginations per page (dual/quadruple controls). Migrated equipment and projects lists to the universal system with unified CSS and markup consistency.
- **UI/UX Enhancements:** Unified table column classes, implemented Bootstrap grid-based widths, and ensured mobile responsiveness. Optimized logging system and translated documentation to English.

### Critical Bug Fixes & Quality Improvements

- Fixed card view accordion DOM destruction and added empty state feedback for search results.
- Improved barcode scanner error handling and promise management.
- Resolved search spinner persistence and redundant query updates.
- Fixed action button event listeners after pagination and reduced minimum booking duration to 1 hour.
- Removed excessive logging and legacy code for improved maintainability.

### Technical Improvements & Documentation (0.13.0-beta.1)

- **Comprehensive Documentation:** Added and translated documentation for the universal pagination system, logging, and live search functionality. Updated all code comments and examples to English for international consistency.
- **Test Coverage:** All booking and project tests updated for new pagination and search features, with 100% pass rate.

## [0.12.0-beta.1] - 2025-06-10

### Equipment Search Revolution

- **Unified Search Interface:** Eliminated dual-tab navigation between scanner and catalog modes, replacing with single universal search field for streamlined user experience
- **Automatic Scanner Lifecycle:** HID barcode scanner now auto-starts on modal open and stops on close, removing manual intervention requirements
- **Intelligent Search Logic:** Implemented barcode-first search with automatic fallback to catalog search for seamless equipment discovery
- **Real-Time Availability:** Added immediate availability checking for all search results with parallel API calls for optimal performance
- **Zero-Click Workflow:** Reduced user interaction from 2 clicks to 0 for equipment search with Enter key support for instant execution
- **Smart Pagination:** Hidden pagination when results ≤20 items, automatically shown for larger datasets
- **Enhanced Error Handling:** Added graceful fallback when daterangepicker unavailable, using today/tomorrow as default dates with comprehensive try-catch blocks

### Advanced Project Management System

- **Paginated API Infrastructure:** New `/projects/paginated` endpoint with full pagination support, proper joins, and backward compatibility with existing `/projects` endpoint
- **Service Layer Enhancement:** Added `get_projects_list_query()` method for building optimized paginated queries with `get_paginatable_query()` repository method
- **Intelligent Date Filtering:** Replaced exact date containment logic with interval overlap logic - projects now show when partially intersecting with filter periods
- **Status-Based Collapsible Sections:** Converted static project groups to independent collapsible sections (DRAFT, ACTIVE, COMPLETED, CANCELLED) using Bootstrap collapse
- **Color-Coded Visual Hierarchy:** Implemented color-coded headers (gray, green, blue, red) matching project statuses with chevron rotation animations
- **Smart Project Sorting:** Status priority ordering (DRAFT → ACTIVE → COMPLETED → CANCELLED) with chronological secondary sort by start date
- **Enhanced Navigation:** Added clickable client links in project details with Bootstrap styling, hover effects, and proper fallback handling
- **UI Optimization:** Compact card layout with optimized padding (0.5rem 0.75rem), reduced typography (0.95rem), and smaller status badges (0.8rem)

### Production-Ready Data Loading Infrastructure

- **ID Mapping System:** Comprehensive mapping infrastructure for clients, categories, equipment, projects, and bookings with foreign key constraint resolution
- **Hierarchical Category Loading:** Multi-pass dependency resolution for parent-child relationships with proper validation and error handling
- **Extended Data Support:** JSON file loading with automatic ID remapping for production datasets, enabling seamless migration from existing systems
- **Smart Docker Integration:** Automatic detection of extended vs basic data with fallback mechanisms in startup scripts
- **SQL Dump Processing:** Added `extract_from_sql_dump.sh` and `extract_extended_data.py` utilities for PostgreSQL dump extraction and JSON conversion
- **Zero Data Loss:** All valid records preserved with correct relationships, invalid references logged and gracefully skipped
- **Comprehensive Documentation:** Step-by-step workflow guides and troubleshooting documentation for data migration processes

### System Reliability & Performance

- **API Response Consistency:** PATCH endpoints now return complete data including bookings, preventing frontend equipment list clearing issues
- **Enhanced Error Handling:** Comprehensive validation with fallback protection for undefined/unknown statuses throughout the system
- **Performance Optimization:** Reduced console logging volume, parallel API calls, and optimized database queries for better performance
- **Type Safety Improvements:** Proper `Page[ProjectResponse]` return type annotations and enhanced type checking throughout pagination system
- **Backward Compatibility:** All existing API endpoints preserved with seamless migration paths for current integrations

### UI/UX Enhancements

- **Modern Collapsible Interface:** Bootstrap-based independent sections with smooth expand/collapse animations and proper ARIA attributes
- **Status Color Consistency:** Unified status badge colors across all project views and tables for visual consistency
- **Interactive Elements:** Smooth CSS transitions, hover effects, and focus management throughout the interface
- **Responsive Design:** Optimized spacing, typography, and layout for different screen sizes
- **Enhanced Loading States:** Project counters, loading indicators, and improved user feedback throughout client detail pages

### Technical Improvements & Bug Fixes (0.12.0-beta.1)

- **Client Name Display:** Fixed JavaScript code to use correct API field `client_name` instead of `project.client?.name`
- **Equipment List Clearing:** Resolved issue where equipment list disappeared after saving project notes by updating PATCH response models
- **Status Mapping:** Corrected status mapping to use `booking_status` instead of generic `status` field in client project history
- **Table Layout:** Removed unnecessary Actions columns from project tables and fixed colspan values for cleaner interface
- **Logging Optimization:** Replaced detailed JSON logging with concise console.debug() for better development experience

## [0.10.0-beta.1] - 2025-05-30

### Scanner Enhancements

- **Real-Time Session Search:** Implemented search functionality within scanner sessions with debouncing, multi-field filtering (name, category, serial, barcode), and search term highlighting
- **Enhanced Session Validation:** Added validation for session items and improved error handling in increment/decrement operations
- **Modular Architecture:** Extracted search functionality to dedicated `session-search.js` module with ES6+ patterns

### Equipment Management

- **Recursive Category Filtering:** Enhanced equipment filtering to automatically include all subcategories when filtering by parent categories
- **Category Service Enhancement:** Added `get_all_subcategory_ids()` method for complete hierarchy traversal with backward compatibility
- **Improved Error Handling:** Better validation for invalid category IDs with graceful fallbacks

### Testing & Development

- **Comprehensive Testing:** Added 9 unit tests with 100% coverage for category subcategory functionality using real database fixtures
- **Development Tools:** Added `dev` target to Makefile for quick environment setup with automated docker compose workflows
- **Documentation:** Created comprehensive module documentation and planned architecture for future scalability

## [0.9.0-beta.1] - 2025-01-26

### Equipment Management & Status System

- **Enhanced Equipment Status Management:** Removed RENTED status from manual selection in edit forms, keeping it as system-managed only. Added BROKEN and RETIRED status options for manual assignment while maintaining RENTED availability in filter options for viewing.
- **Flexible Status Transitions:** Completely removed equipment status transition restrictions, allowing any status changes between all equipment statuses including transitions from RETIRED back to service. This improves equipment lifecycle management flexibility and simplifies status management logic.
- **Equipment Status UI Consistency:** Updated status badge color mapping across all JavaScript modules to include BROKEN (danger) and RETIRED (secondary) statuses. Fixed MAINTENANCE status color from info to danger for visual consistency throughout the application.

### Equipment Booking & Duplication Fixes

- **Smart Equipment Addition Logic:** Fixed critical issue where equipment without serial numbers (cables, consumables) created duplicate entries instead of incrementing quantity when added to projects. Modified `addSelectedEquipmentToProject` function to check for existing bookings and update quantity via PATCH API.
- **Improved User Workflow:** Removed auto-close behavior from equipment addition interface to keep it open after adding items, allowing users to add multiple equipment pieces without repetitive modal opening.

### Soft Delete System Implementation

- **Comprehensive Soft Delete Architecture:** Implemented system-wide soft delete functionality by adding `SoftDeleteMixin` to `Booking` and `Project` models with `deleted_at` timestamps. Updated all repository methods to automatically exclude soft-deleted records using `deleted_at.is_(None)` checks.
- **Data Integrity & Recovery:** Modified services to use soft delete instead of physical deletion, preserving data for potential recovery while maintaining clean user interfaces. All related queries and services updated to respect soft delete status.

### HID Barcode Scanner Integration

- **Advanced Scanner Management:** Implemented comprehensive HID-keyboard barcode scanner support with automatic activation/deactivation based on tab switching between Scanner and Catalog views. Created specialized functions: `initializeHIDScanner()`, `startHIDScanner()`, and `stopHIDScanner()` in dedicated `scanner.js`.
- **Seamless User Experience:** Integrated scanner with existing `BarcodeScanner` class from `main.js` for consistent keypress event handling. Auto-starts scanner if Scanner tab is active on page load, providing immediate functionality without manual activation.
- **Clean Interface Design:** Removed misleading camera button with `id="toggleScannerBtn"` from scanner tab and expanded input field to full width, eliminating confusion about actual device connectivity detection.

### Technical Improvements & Bug Fixes (0.9.0-beta.1)

- **Project Management:** Fixed project deletion button functionality by correcting ID mismatch between JavaScript selector (`deleteProjectBtn`) and HTML element (`deleteProject`). Replaced browser `confirm()` with Bootstrap modal workflow for consistent UI experience.
- **Code Optimization:** Removed unused imports (Dict, Set) from typing module in equipment service after simplifying status transition logic. Cleaned up complex validation methods that are no longer needed.
- **Event Handling Enhancement:** Improved tab switching event listeners to properly manage scanner state transitions, ensuring scanner is only active when the appropriate interface tab is selected.

## [0.8.0-beta.1] - 2025-05-26

### UI & Equipment Management

- **Enhanced Project Equipment Table:** Added clickable equipment name links to detailed equipment pages and barcode icons before barcode text for improved visual hierarchy and navigation. Equipment names now serve as primary navigation points while barcodes remain informational only.
- **Robust Booking Object Handling:** Improved code resilience for different booking object structures with fallback to `equipment_id` when direct `equipment` object is unavailable, ensuring stable functionality across various data scenarios.

### Equipment Availability System

- **Smart Availability for Non-Serialized Equipment:** Implemented logic to skip availability checks for equipment without serial numbers, enabling unlimited concurrent bookings for consumables like cables, adapters, and other non-tracked items. This maintains existing availability validation for serialized equipment while allowing flexible handling of bulk rental items.

### Date Management & Bug Fixes

- **Fixed Date Display Inconsistency:** Resolved critical issue where equipment booking end dates appeared one day later than project end dates due to DateRangePicker's 23:59:59 time setting causing next-day display.
- **Standardized Date Validation:** Updated backend date validation logic from `start_date >= end_date` to `start_date > end_date` across all services (booking, equipment, project) and API endpoints to properly support same-day projects and bookings.
- **Frontend Date Normalization:** Implemented consistent date handling using `startOf('day')` for start dates (00:00:00) and `startOf('day').add(1, 'second')` for end dates (00:00:01) to ensure proper validation while avoiding display issues.

### Code Maintenance

- **Documentation Cleanup:** Removed obsolete and redundant project documentation files from `.cursor/ai-docs/` and `docs/` directories, including outdated architecture, business logic, code style, database schema, migrations, deployment guides, and API examples to reduce maintenance overhead and prevent confusion.

## [0.7.0-beta.2] - 2025-05-20

### UI & Event Handling

- **Modernized Event Handling:** Replaced all inline `onclick` JavaScript handlers across equipment management pages with a robust event delegation pattern using `data-*` attributes. This significantly improves UI reliability, maintainability, and handles special characters in data more effectively.
- **Centralized Logic:** Global event listeners are now centralized in `main.js`, with specialized handlers in `equipment-detail.js` and `equipment-list.js` for better code organization.

### Scanning System

- **Refined Scan Storage Logic:** `scan-storage.js` now returns specific string codes (`item_added`, `quantity_incremented`, `duplicate_serial_exists`) to provide clear feedback on equipment addition operations.
- **Improved Serialized Item Handling:** Prevents duplicate entries for equipment with identical serial numbers within the same scan session.
- **Accurate Quantity Tracking:** Enabled correct quantity incrementation for non-serialized equipment when scanned multiple times.
- **Enhanced User Feedback:** `scanner.js` updated to interpret new result codes from scan storage, improving feedback messages to the user during scanning.

### Dependencies & Build Process

- **Optimized Dependency Management:** The `Faker` library has been moved to development-specific dependencies.
- **Efficient Docker Builds:** `Dockerfile` updated to conditionally install `Faker` only for `dev` and `test` environments, reducing production Docker image size.
- **Configuration Cleanup:** `Faker` removed from the base dependencies list in `pyproject.toml`.

## [0.7.0-beta.1] - 2025-05-16

### Print System & Category Management

- **Dynamic Multi-Level Category Hierarchy for Print Forms:**
  - Implemented a flexible system to display nested categories in project print forms.
  - Categories can now be marked with `show_in_print_overview` to control their visibility in printed documents.
  - `EquipmentPrintItem` schema updated for dynamic category depth using `PrintableCategoryInfo`.
  - `CategoryService` enhanced with `get_print_hierarchy_and_sort_path` for determining sort order and displayable categories based on visibility flags.
  - `print/project.html` template revamped for dynamic rendering of category headers and consistent item indentation.
  - Sorting in print forms now prioritizes category hierarchy, then serial number.
  - Added database migration for the new `show_in_print_overview` column in `categories`.
- **UI for Category Print Visibility:**
  - Added "Show in print overview" checkbox in category management UI.
  - JavaScript updated to handle this new field for API requests.
- **Print Form Appearance:**
  - Improved CSS for category indentation and background color display in print.

### API & Data Handling

- **Booking Data Enrichment:**
  - `BookingInProject` Pydantic schema now includes `barcode` and `category_name`.
  - `ProjectService.get_project_bookings` updated to provide these fields directly in the API response, simplifying frontend data access.

### Frontend UI (Scanner & Project View)

- **Scanner Page Enhancements:**
  - Resolved `formatCurrency` JavaScript error.
  - Added a "Category" column to the scanned items table, with data populated from `item.category_name`.
- **Project View Page Improvements:**
  - Added "Category" and "Quantity" columns to the equipment table.
  - JavaScript logic in `project/equipment/ui.js` updated to:
    - Populate new category and quantity cells.
    - Consistently hide table headers.
    - Remove redundant quantity display `(xN)` from the equipment name.
    - Ensure quantity update buttons remain functional by adding `quantity` class to the new cell.

## [0.6.0-beta.2] - 2025-05-13

### Fixed (0.6.0-beta.2)

- **Project Cancellation Logic:** Ensured that bookings associated with a 'Cancelled' project are now correctly transitioned to 'Completed' and soft-deleted, mirroring the behavior for 'Completed' projects. (PR #63, PR #64)
- **Print View Sorting:** Changed equipment category sorting in the project print view from alphabetical by name to numerical by `category_id` for consistent ordering. (PR #65)

### Refactored (0.6.0-beta.2)

- **Scanner JavaScript Modularity:** Migrated `scan-storage.js` and its consumers (`equipment-list.js`, `scanner.js`) to use standard ES6 modules, improving code organization and resolving script loading issues. HTML templates updated to load scripts with `type="module"`. (PR #64)

## [0.6.0-beta.1] - 2025-05-09

### Added (0.6.0-beta.1)

- **Hierarchical Category Display:** Implemented tree-like display for categories in equipment list filter, add modal, and edit modal. (`feat: implement hierarchical category display in select dropdowns`)
- **Project Print Form Category Grouping:** Equipment items are now grouped by category in the project print form, improving readability. (`feat: group equipment by category in project print form`)
- **Scanner UI Table Layout:** Replaced list view with a table for scanned items in the scanner UI, including a quantity column. (`feat: improve scanner UI with table layout`)
- **Project UI Quantity Column:** Added a dedicated quantity column to the equipment table in the "New Project" view. (`feat: improve projects UI with separate quantity column`)
- **Shared UI Utilities:** Created `buildCategoryTree` and `renderCategoriesRecursive` in `ui-helpers.js`.

### Changed (0.6.0-beta.1)

- **Scanner Session Summary:** Session summaries now display total item count (units) and unique positions. (`feat: improve scanner UI with table layout`)
- **Project UI Equipment Display:** Removed quantity display from equipment names in the new project view, relying on the new dedicated column. (`feat: improve projects UI with separate quantity column`)

### Fixed (0.6.0-beta.1)

- **Script Loading (`type="module"`):** Ensured correct loading of JavaScript as ES6 modules in `projects/index.html`, `projects/new.html`, and `scanner.html`. (`fix: add type module to script tags in projects/index.html`, `refactor(scripts): update script loading to use ES6 modules`, `feat(scan-storage): integrate API module and update script loading`)

### Refactored (0.6.0-beta.1)

- **ES6 Module Migration:** Continued migrating frontend JavaScript files (`scan-storage.js`, `scanner.js`, `projects-new.js`, `projects-common.js`, etc.) to use ES6 modules. (`refactor(scripts): update script loading to use ES6 modules`, `feat(scan-storage): integrate API module and update script loading`, `fix: add type module to script tags in projects/index.html`)
- **Category UI Logic:** Centralized category tree building and rendering logic into `ui-helpers.js`. (`feat: implement hierarchical category display in select dropdowns`)
- **Scan Storage:** Integrated API module into `scan-storage.js`. (`feat(scan-storage): integrate API module and update script loading`)

## v0.6.0-alpha.1

### B2B Booking Model

- Removed all booking status transition restrictions to support flexible B2B workflows.
- Decoupled payment status from booking status changes, allowing post-rental payments.
- Renamed ambiguous "status" field to "booking_status" for better code clarity.
- Implemented consistent field naming across schemas, repositories, and API endpoints.
- Added cascade booking completion when projects are marked as completed.

### API Enhancements

- Added "active_only" query parameter to bookings API for filtering active bookings.
- Fixed quantity and serial number handling in project bookings API responses.
- Added proper equipment data retrieval in ProjectService for accurate display.
- Enhanced error logging and traceability throughout booking and project APIs.
- Updated backend category repository and services for better maintainability.

### Frontend Architecture

- Migrated all JavaScript files to ES6 module syntax for improved code organization.
- Created a dedicated utils directory for common helper modules (api.js, common.js).
- Updated all HTML templates to use module imports with type="module".
- Removed outdated inline scripts and non-modular code for cleaner templates.
- Implemented consistent event handling patterns across all components.

### UI/UX Improvements

- Added "Active Only" checkbox to bookings table for filtering active bookings.
- Added and reordered status/payment columns in booking tables for better visibility.
- Implemented stable equipment sorting in project view to prevent UI jumps after updates.
- Added confirmation dialogs for equipment quantity changes and removals with clear messages.
- Created new equipment management zone in project view for direct equipment addition.
- Added equipment searching and barcode scanning capabilities to project view.
- Implemented real-time equipment availability checking with date selection.

### Other Improvements (v0.6.0-alpha.1)

- Updated all tests to reflect the new B2B booking model and status transition logic.
- Commented out verbose booking creation logs in seed data for cleaner development.
- Improved documentation with typo fixes and clearer test command examples.
- Enhanced equipment quantity display logic for both serialized and non-serialized items.
- Refactored category management with modular architecture for better maintainability.

## v0.5.1-alpha.1

### Schemas & Data Layer

- **BookingWithDetails Schema**: Added optional `client_name` field for direct client name reference in booking details.
- Improved schema documentation for clarity and maintainability.

### Repository Logic

- Implemented robust extraction of client names from related objects in the booking repository.
- Standardized logger formatting using `{}` placeholders.
- Fixed type issues by separating model validation and field assignment.
- Enhanced error handling for client data processing.

### API Refactor

- Converted `_booking_to_response` function to async for improved scalability.
- Added database lookup for missing client names and implemented cascading fallback system.
- Updated all relevant API endpoints to use the new async logic.
- Improved logging with a standardized format.

### Frontend & UI

- Simplified bookings table by removing the ID column and action buttons.
- Improved client name display with better fallback text.
- Enhanced error handling in the projects UI.
- Added fallback to `sessionStorage` when `scanStorage` is unavailable.
- Fixed column count in empty state messages for better UI consistency.

### Templates & Scanning Tools

- Updated bookings list template to match the new table structure.
- Improved equipment list and projects templates for better error handling and display.
- Fixed error handling and session management in `scan-storage.js`.
- Enhanced `scanner.js` with improved error recovery.

### Other Improvements (v0.5.1-alpha.1)

- All changes tested and verified for compatibility with existing database instances.
- No database migration required for this update.
- No new dependencies introduced in this release.
- Updated frontend assets and improved asset management.

## v0.5.0-alpha.4

### Projects & UI

- Added toggle between table and card views for projects, with state persistence and instant filtering.
- Unified UI: consistent form control heights, square toggle buttons, improved Select2 and DateRangePicker styling, and updated project card/group header design.
- Refactored and improved client list controls and view toggling.

### Equipment

- Implemented server- and client-side pagination for equipment list with advanced filtering and improved performance.
- Updated frontend and backend to support paginated equipment API responses.

### Bookings & Clients

- Enhanced booking API: filtering by status, detailed booking schema, and improved client booking endpoints.
- Added bookings count to client data and improved client repository logic.

### Core & Frontend

- Refactored and modularized frontend JavaScript, improved error handling and notifications.
- Updated and added required frontend libraries and assets.
- Improved logging with Loguru.

### Documentation & Dependencies

- Added OpenAPI specification for frontend.
- Added `fastapi-pagination` to dependencies.

## v0.5.0-alpha.3

### UI & Select2 Integration

- **Client Search**: Integrated Select2 for the client dropdown on the project creation page, enabling fast and user-friendly client search
- **Unified Styles**: Added `select2-bootstrap-fix.css` to visually align Select2 dropdowns with the app's Bootstrap-based form controls
- **Base Template Update**: Updated `base.html` to use local Select2 assets and custom styles for consistent appearance

### Static Libraries & Asset Management

- **Local Static Assets**: Added local versions of `select2.min.js`, `select2.min.css`, `moment.min.js`, and `daterangepicker.min.js` for reliable frontend functionality
- **.gitignore Update**: Explicitly allowed tracking of `static/js/lib` to ensure required JS libraries are properly versioned

### Documentation & Repository Improvements

- **Implementation Plan Update**: Updated implementation plan documentation to reflect completed and partial tasks
- **Changelog Enhancement**: Expanded `CHANGELOG.md` with detailed descriptions of new features
- **Repository Hygiene**: Removed `implementation_plan.md` from the repository to comply with `.gitignore`

### Other Improvements (v0.5.0-alpha.3)

- **User Experience**: Enhanced client selection with searchable dropdowns that match the app's design
- **Reliability**: Critical frontend libraries now served locally for consistent behavior regardless of network conditions
- **Documentation**: Improved planning and changelog documentation for better project tracking
- **Testing**: All 247 tests pass successfully with 78% code coverage

## v0.5.0-alpha.2

### Equipment Management Improvements (v0.5.0-alpha.2)

- **New Feature**: Added "+" and "-" buttons for managing non-serialized equipment quantities
- **Improved Display**: Equipment categories now shown in the equipment list
- **Counter Enhancement**: Total equipment count now includes quantity information
- **UX Improvement**: Minus button changes to delete button when quantity is 1
- **Bug Fix**: Fixed quantity handling when creating projects from scanning sessions
- **Optimized Booking**: Improved logic for creating multiple bookings for items with quantity > 1
- **Interface Cleanup**: Removed redundant edit period button, using calendar picker exclusively
- **Safety Feature**: Added confirmation dialog when removing equipment
- **Better Feedback**: Added toast notifications for equipment removal

### Booking Conflict Management (v0.5.0-alpha.2)

- **Enhanced Conflict Display**: Added detailed conflict information section with affected projects
- **Single-day Bookings**: Added support for single-day equipment bookings
- **Improved Feedback**: Show clear conflict details with project names and dates
- **API Compatibility**: Fixed API compatibility issues for single-day booking availability checks

### Booking Quantity Management (v0.5.0-alpha.2)

- **Database Enhancement**: Added quantity field to Booking model and database table
- **API Support**: Updated booking endpoints to handle quantity parameter
- **Backend Logic**: Modified services to properly handle booking quantities
- **Improved UI**: Updated project view to display booking quantities
- **Dynamic Controls**: Added quantity increase/decrease buttons in project view
- **Server Synchronization**: Booking quantity changes now properly sync with server
- **UI Feedback**: Display updates dynamically reflect actual quantity from server
- **Non-Serial Equipment**: Quantity management restricted to non-serialized equipment
- **Project Creation**: Added quantity support when creating projects with multiple items
- **Backward Compatibility**: Default quantity of 1 for backward compatibility

### Scanner Interface Improvements (v0.5.0-alpha.2)

- **Bug Fix**: Fixed barcode scanning session handling and modal dialogs
- **Session Management**: Improved scanner session persistence across page navigations
- **Modal Accessibility**: Fixed issues with modal dialogs stacking and background interaction
- **Toast Notifications**: Enhanced toast notification system for scanner feedback
- **Error Handling**: Better error handling for scanner connectivity issues

### Print System Enhancements (v0.5.0-alpha.2)

- **Quantity Support**: Updated print forms to properly display equipment quantities
- **Cost Calculation**: Fixed liability amount calculation to consider equipment quantities
- **Currency Formatting**: Improved currency display to use whole numbers without decimal places
- **Form Layout**: Enhanced printable project form layout for better readability

### Other Improvements (v0.5.0-alpha.2)

- **Documentation**: Updated CHANGELOG.md with detailed feature descriptions
- **Type Checking**: Enhanced mypy configuration for FastAPI and migrations
- **Testing**: Improved test coverage with additional test cases for new features
- **Performance**: Optimized database queries for equipment with quantities
- **API Consistency**: Standardized API response formats for equipment operations
- **Form Layout**: Enhanced printable project form layout for better readability

## v0.5.0-alpha.1

### Equipment Management Improvements (v0.5.0-alpha.1)

- **New Feature**: Added "+" and "-" buttons for managing non-serialized equipment quantities
- **Improved Display**: Equipment categories now shown in the equipment list
- **Counter Enhancement**: Total equipment count now includes quantity information
- **UX Improvement**: Minus button changes to delete button when quantity is 1
- **Bug Fix**: Fixed quantity handling when creating projects from scanning sessions
- **Optimized Booking**: Improved logic for creating multiple bookings for items with quantity > 1
- **Interface Cleanup**: Removed redundant edit period button, using calendar picker exclusively
- **Safety Feature**: Added confirmation dialog when removing equipment
- **Better Feedback**: Added toast notifications for equipment removal

### Booking Conflict Management (v0.5.0-alpha.1)

- **Enhanced Conflict Display**: Added detailed conflict information section with affected projects
- **Single-day Bookings**: Added support for single-day equipment bookings
- **Improved Feedback**: Show clear conflict details with project names and dates
- **API Compatibility**: Fixed API compatibility issues for single-day booking availability checks

### Booking Quantity Management (v0.5.0-alpha.1)

- **Database Enhancement**: Added quantity field to Booking model and database table
- **API Support**: Updated booking endpoints to handle quantity parameter
- **Backend Logic**: Modified services to properly handle booking quantities
- **Improved UI**: Updated project view to display booking quantities
- **Dynamic Controls**: Added quantity increase/decrease buttons in project view
- **Server Synchronization**: Booking quantity changes now properly sync with server
- **UI Feedback**: Display updates dynamically reflect actual quantity from server
- **Non-Serial Equipment**: Quantity management restricted to non-serialized equipment
- **Project Creation**: Added quantity support when creating projects with multiple items
- **Backward Compatibility**: Default quantity of 1 for backward compatibility

### Scanner Interface Improvements (v0.5.0-alpha.1)

- **Bug Fix**: Fixed barcode scanning session handling and modal dialogs
- **Session Management**: Improved scanner session persistence across page navigations
- **Modal Accessibility**: Fixed issues with modal dialogs stacking and background interaction
- **Toast Notifications**: Enhanced toast notification system for scanner feedback
- **Error Handling**: Better error handling for scanner connectivity issues

### Print System Enhancements (v0.5.0-alpha.1)

- **Quantity Support**: Updated print forms to properly display equipment quantities
- **Cost Calculation**: Fixed liability amount calculation to consider equipment quantities
- **Currency Formatting**: Improved currency display to use whole numbers without decimal places
- **Form Layout**: Enhanced printable project form layout for better readability

### Other Improvements (v0.5.0-alpha.1)

- **Documentation**: Updated CHANGELOG.md with detailed feature descriptions
- **Type Checking**: Enhanced mypy configuration for FastAPI and migrations
- **Testing**: Improved test coverage with additional test cases for new features
- **Performance**: Optimized database queries for equipment with quantities
- **API Consistency**: Standardized API response formats for equipment operations
