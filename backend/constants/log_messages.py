"""Log message constants.

This module defines constants for log messages used throughout the application.
Messages are grouped by category/domain for better organization.
"""


class ProjectLogMessages:
    """Log messages related to projects."""

    PROJECT_CREATED = 'Project created (ID: {}, client: {})'
    PROJECT_UPDATED = 'Project updated (ID: {})'
    PROJECT_DELETED = 'Project deleted (ID: {})'
    PROJECT_RETRIEVED = 'Project retrieved successfully (ID: {})'
    PROJECT_NOT_FOUND = 'Project not found (ID: {})'
    PROJECT_LISTING = 'Retrieved {} projects'
    PROJECT_DICT_CONVERSION = 'Project {} converted to dictionary with {} bookings'


class BookingLogMessages:
    """Log messages related to bookings."""

    BOOKING_CREATED = 'Created booking for equipment {} in project {}'
    BOOKING_ADDED = 'Booking added to project (booking: {}, project: {})'
    BOOKING_REMOVED = 'Booking removed from project (booking: {}, project: {})'
    BOOKING_NOT_FOUND = 'Booking not found (ID: {})'
    BOOKING_NOT_IN_PROJECT = (
        'Booking does not belong to project ' '(booking: {}, project: {}, actual: {})'
    )
    CREATING_WITH_BOOKINGS = 'Creating project with {} bookings'
    NO_BOOKINGS_CREATED = 'No bookings created for project {} out of {} requested'
    BOOKING_RESULT = 'Project {}: created {} bookings, failed {}'
    BOOKING_VALIDATION_FAILED = 'Booking validation failed: {}'
    BOOKING_FORMATTING = 'Formatting {} bookings with equipment details'


class ClientLogMessages:
    """Log messages related to clients."""

    CLIENT_CREATED = 'Client created (ID: {}, name: {})'
    CLIENT_UPDATED = 'Client updated (ID: {})'
    CLIENT_DELETED = 'Client deleted (ID: {})'
    CLIENT_NOT_FOUND = 'Client not found (ID: {})'
    CLIENT_LISTING = 'Retrieved {} clients'


class ErrorLogMessages:
    """Log messages related to errors and exceptions."""

    CREATE_PROJECT_ERROR = 'Error creating project: {}'
    UPDATE_PROJECT_ERROR = 'Error updating project: {}'
    DELETE_PROJECT_ERROR = 'Error deleting project: {}'
    CREATE_BOOKING_ERROR = 'Error creating booking: {}'
    TRANSACTION_ERROR = 'Transaction error: {}'
    VALIDATION_ERROR = 'Validation error: {}'
    NOT_FOUND_ERROR = 'Not found error: {}'
    UNEXPECTED_ERROR = 'Unexpected error: {}'
