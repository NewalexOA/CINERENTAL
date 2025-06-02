"""Equipment factory for tests."""

import factory

from backend.models.equipment import Equipment, EquipmentStatus
from tests.factories.category import CategoryFactory


class EquipmentFactory(factory.Factory):
    """Factory for Equipment model."""

    class Meta:
        """Factory configuration."""

        model = Equipment

    name = factory.Sequence(lambda n: f'Equipment {n}')
    description = factory.Faker('text', max_nb_chars=200)
    category = factory.SubFactory(CategoryFactory)
    category_id = factory.LazyAttribute(lambda obj: obj.category.id)
    barcode = factory.Sequence(lambda n: f'EQ{n:06d}')
    serial_number = factory.Sequence(lambda n: f'SN{n:06d}')
    replacement_cost = factory.Faker('pyint', min_value=100, max_value=50000)
    status = EquipmentStatus.AVAILABLE
    notes = factory.Faker('text', max_nb_chars=100)
