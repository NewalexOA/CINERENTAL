"""Error messages for exceptions.

This module defines error messages used in exceptions throughout the application.
Messages are grouped by category/domain for better organization.
"""


# Project related error messages
class ProjectErrorMessages:
    """Error messages related to projects."""

    PROJECT_NOT_FOUND = 'Проект с ID {} не найден'
    CLIENT_NOT_FOUND = 'Клиент с ID {} не найден'
    BOOKING_NOT_FOUND = 'Бронирование с ID {} не найдено'
    BOOKING_NOT_IN_PROJECT = 'Бронирование {} не принадлежит проекту {}'

    # Booking validation errors
    INCOMPLETE_BOOKING_DATA = 'Неполные данные бронирования'
    INVALID_EQUIPMENT_ID = 'Недопустимый ID оборудования: {}'
    INVALID_DATE_TYPE = 'Недопустимый тип даты: {}'
    BOOKING_CREATION_FAILED = 'Не удалось создать бронирование для оборудования {}: {}'


# Date related error messages
class DateErrorMessages:
    """Error messages related to dates and time."""

    INVALID_DATES = 'Дата начала должна быть раньше даты окончания'
    DATE_IN_PAST = 'Дата не может быть в прошлом'
    BOOKING_DURATION_TOO_SHORT = 'Минимальная длительность бронирования: {} дней'
    BOOKING_DURATION_TOO_LONG = 'Максимальная длительность бронирования: {} дней'


# Resource related error messages
class ResourceErrorMessages:
    """Error messages related to resources."""

    EQUIPMENT_NOT_FOUND = 'Оборудование с ID {} не найдено'
    EQUIPMENT_NOT_AVAILABLE = 'Оборудование с ID {} недоступно в указанный период'
    RESOURCE_CONFLICT = 'Ресурс {} уже используется'


# Transaction related error messages
class TransactionErrorMessages:
    """Error messages related to database transactions."""

    TRANSACTION_CLOSED = 'Транзакция закрыта'
    TRANSACTION_ROLLBACK = 'Транзакция отменена'
    TRANSACTION_CONFLICT = 'Конфликт транзакций'
