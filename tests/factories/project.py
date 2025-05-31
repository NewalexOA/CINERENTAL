"""Project factory for tests."""

from datetime import timedelta, timezone

import factory
from faker import Faker

from backend.models.project import Project, ProjectStatus

fake = Faker()


class ProjectFactory(factory.Factory):
    """Factory for Project model."""

    class Meta:
        """Factory configuration."""

        model = Project

    name = factory.LazyFunction(lambda: fake.catch_phrase())
    description = factory.LazyFunction(lambda: fake.text(max_nb_chars=500))

    # Generate start_date in the next 30 days
    start_date = factory.LazyFunction(
        lambda: fake.date_time_between(
            start_date='+1d', end_date='+30d', tzinfo=timezone.utc
        )
    )

    # Generate end_date 1-14 days after start_date
    @factory.lazy_attribute
    def end_date(self):
        """Generate end_date after start_date."""
        if hasattr(self, 'start_date') and self.start_date:
            days_to_add = fake.random_int(min=1, max=14)
            return self.start_date + timedelta(days=days_to_add)
        else:
            # Fallback if start_date not set
            return fake.date_time_between(
                start_date='+2d', end_date='+45d', tzinfo=timezone.utc
            )

    status = factory.Iterator([status for status in ProjectStatus])
    notes = factory.LazyFunction(
        lambda: fake.sentence() if fake.boolean(chance_of_getting_true=70) else None
    )

    # client_id will be set when creating the project instance
    client_id = factory.SubFactory('tests.factories.client.ClientFactory')


class ProjectDraftFactory(ProjectFactory):
    """Factory for DRAFT status projects."""

    status = ProjectStatus.DRAFT


class ProjectActiveFactory(ProjectFactory):
    """Factory for ACTIVE status projects."""

    status = ProjectStatus.ACTIVE


class ProjectCompletedFactory(ProjectFactory):
    """Factory for COMPLETED status projects."""

    status = ProjectStatus.COMPLETED

    # For completed projects, set dates in the past
    start_date = factory.LazyFunction(
        lambda: fake.date_time_between(
            start_date='-60d', end_date='-10d', tzinfo=timezone.utc
        )
    )


class ProjectCancelledFactory(ProjectFactory):
    """Factory for CANCELLED status projects."""

    status = ProjectStatus.CANCELLED
