"""Client factory for tests."""

import factory
from faker import Faker

from backend.models.client import Client, ClientStatus

fake = Faker()


class ClientFactory(factory.Factory):
    """Factory for Client model."""

    class Meta:
        """Factory configuration."""

        model = Client

    name = factory.LazyFunction(lambda: fake.name()[:50])
    email = factory.LazyFunction(lambda: fake.email())
    phone = factory.LazyFunction(
        lambda: (
            fake.numerify(text='+1-###-###-####')
            if fake.boolean(chance_of_getting_true=80)
            else None
        )
    )
    company = factory.LazyFunction(
        lambda: (
            fake.company()[:200] if fake.boolean(chance_of_getting_true=60) else None
        )
    )
    status = ClientStatus.ACTIVE
    notes = factory.LazyFunction(
        lambda: (
            fake.sentence()[:100] if fake.boolean(chance_of_getting_true=30) else None
        )
    )


class ClientActiveFactory(ClientFactory):
    """Factory for ACTIVE status clients."""

    status = ClientStatus.ACTIVE


class ClientBlockedFactory(ClientFactory):
    """Factory for BLOCKED status clients."""

    status = ClientStatus.BLOCKED


class ClientArchivedFactory(ClientFactory):
    """Factory for ARCHIVED status clients."""

    status = ClientStatus.ARCHIVED
