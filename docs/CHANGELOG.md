# ACT-Rental Changelog

This document lists notable changes to the ACT-Rental application.

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

### Other Improvements

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

### Other Improvements

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

### Other Improvements

- **User Experience**: Enhanced client selection with searchable dropdowns that match the app's design
- **Reliability**: Critical frontend libraries now served locally for consistent behavior regardless of network conditions
- **Documentation**: Improved planning and changelog documentation for better project tracking
- **Testing**: All 247 tests pass successfully with 78% code coverage

## v0.5.0-alpha.2

### Equipment Management Improvements

- **New Feature**: Added "+" and "-" buttons for managing non-serialized equipment quantities
- **Improved Display**: Equipment categories now shown in the equipment list
- **Counter Enhancement**: Total equipment count now includes quantity information
- **UX Improvement**: Minus button changes to delete button when quantity is 1
- **Bug Fix**: Fixed quantity handling when creating projects from scanning sessions
- **Optimized Booking**: Improved logic for creating multiple bookings for items with quantity > 1
- **Interface Cleanup**: Removed redundant edit period button, using calendar picker exclusively
- **Safety Feature**: Added confirmation dialog when removing equipment
- **Better Feedback**: Added toast notifications for equipment removal

### Booking Conflict Management

- **Enhanced Conflict Display**: Added detailed conflict information section with affected projects
- **Single-day Bookings**: Added support for single-day equipment bookings
- **Improved Feedback**: Show clear conflict details with project names and dates
- **API Compatibility**: Fixed API compatibility issues for single-day booking availability checks

### Booking Quantity Management

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

### Scanner Interface Improvements

- **Bug Fix**: Fixed barcode scanning session handling and modal dialogs
- **Session Management**: Improved scanner session persistence across page navigations
- **Modal Accessibility**: Fixed issues with modal dialogs stacking and background interaction
- **Toast Notifications**: Enhanced toast notification system for scanner feedback
- **Error Handling**: Better error handling for scanner connectivity issues

### Print System Enhancements

- **Quantity Support**: Updated print forms to properly display equipment quantities
- **Cost Calculation**: Fixed liability amount calculation to consider equipment quantities
- **Currency Formatting**: Improved currency display to use whole numbers without decimal places
- **Form Layout**: Enhanced printable project form layout for better readability

### Other Improvements

- **Documentation**: Updated CHANGELOG.md with detailed feature descriptions
- **Type Checking**: Enhanced mypy configuration for FastAPI and migrations
- **Testing**: Improved test coverage with additional test cases for new features
- **Performance**: Optimized database queries for equipment with quantities
- **API Consistency**: Standardized API response formats for equipment operations

## v0.5.0-alpha.1

### Equipment Management Improvements

- **New Feature**: Added "+" and "-" buttons for managing non-serialized equipment quantities
- **Improved Display**: Equipment categories now shown in the equipment list
- **Counter Enhancement**: Total equipment count now includes quantity information
- **UX Improvement**: Minus button changes to delete button when quantity is 1
- **Bug Fix**: Fixed quantity handling when creating projects from scanning sessions
- **Optimized Booking**: Improved logic for creating multiple bookings for items with quantity > 1
- **Interface Cleanup**: Removed redundant edit period button, using calendar picker exclusively
- **Safety Feature**: Added confirmation dialog when removing equipment
- **Better Feedback**: Added toast notifications for equipment removal

### Booking Conflict Management

- **Enhanced Conflict Display**: Added detailed conflict information section with affected projects
- **Single-day Bookings**: Added support for single-day equipment bookings
- **Improved Feedback**: Show clear conflict details with project names and dates
- **API Compatibility**: Fixed API compatibility issues for single-day booking availability checks

### Booking Quantity Management

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

### Scanner Interface Improvements

- **Bug Fix**: Fixed barcode scanning session handling and modal dialogs
- **Session Management**: Improved scanner session persistence across page navigations
- **Modal Accessibility**: Fixed issues with modal dialogs stacking and background interaction
- **Toast Notifications**: Enhanced toast notification system for scanner feedback
- **Error Handling**: Better error handling for scanner connectivity issues

### Print System Enhancements

- **Quantity Support**: Updated print forms to properly display equipment quantities
- **Cost Calculation**: Fixed liability amount calculation to consider equipment quantities
- **Currency Formatting**: Improved currency display to use whole numbers without decimal places
- **Form Layout**: Enhanced printable project form layout for better readability

### Other Improvements

- **Documentation**: Updated CHANGELOG.md with detailed feature descriptions
- **Type Checking**: Enhanced mypy configuration for FastAPI and migrations
- **Testing**: Improved test coverage with additional test cases for new features
- **Performance**: Optimized database queries for equipment with quantities
- **API Consistency**: Standardized API response formats for equipment operations
