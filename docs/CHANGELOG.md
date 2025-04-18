# ACT-Rental Changelog

This document lists notable changes to the ACT-Rental application.

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
