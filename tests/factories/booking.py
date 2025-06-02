"""Booking factory for tests."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import factory

from backend.models.booking import Booking, BookingStatus, PaymentStatus
from tests.factories.client import ClientFactory
from tests.factories.equipment import EquipmentFactory


class BookingFactory(factory.Factory):
    """Factory for Booking model."""

    class Meta:
        """Factory configuration."""

        model = Booking

    client = factory.SubFactory(ClientFactory)
    client_id = factory.LazyAttribute(lambda obj: obj.client.id)
    equipment = factory.SubFactory(EquipmentFactory)
    equipment_id = factory.LazyAttribute(lambda obj: obj.equipment.id)
    start_date = factory.LazyFunction(
        lambda: datetime.now(timezone.utc) + timedelta(days=1)
    )
    end_date = factory.LazyAttribute(lambda obj: obj.start_date + timedelta(days=7))
    quantity = 1
    total_amount = Decimal('100.00')
    deposit_amount = Decimal('50.00')
    paid_amount = Decimal('0.00')
    booking_status = BookingStatus.PENDING
    payment_status = PaymentStatus.PENDING
    notes = factory.Faker('text', max_nb_chars=100)
