"""Category factory for tests."""

import factory
from faker import Faker

from backend.models.category import Category

fake = Faker()


class CategoryFactory(factory.Factory):
    """Factory for Category model."""

    class Meta:
        """Factory configuration."""

        model = Category

    name = factory.LazyFunction(lambda: fake.unique.word())
    description = factory.LazyFunction(lambda: fake.text(max_nb_chars=200))
