"""Integration tests for the server-rendered web routes.

These pages are rendered with Jinja2 through Starlette templating rather than
returned as JSON, so they exercise a code path no API test touches. Without
them a change to the templating call signature can break every page in the
application while the whole API suite still passes.
"""

import pytest
from fastapi import status
from httpx import AsyncClient

from backend.models.project import Project

pytestmark = pytest.mark.asyncio

LIST_PAGES = [
    '/',
    '/equipment/',
    '/categories/',
    '/clients/',
    '/bookings/',
    '/scanner/',
    '/projects/',
    '/projects/new',
]


@pytest.mark.parametrize('path', LIST_PAGES)
async def test_page_renders(async_client: AsyncClient, path: str) -> None:
    """Test that each list page renders as HTML."""
    response = await async_client.get(path)

    assert (
        response.status_code == status.HTTP_200_OK
    ), f'{path} returned {response.status_code}'
    assert response.headers['content-type'].startswith('text/html')
    assert response.text.strip(), f'{path} rendered an empty body'


async def test_project_detail_page_renders(
    async_client: AsyncClient,
    test_project: Project,
) -> None:
    """Test that the project detail page renders with the project name."""
    response = await async_client.get(f'/projects/{test_project.id}')

    assert response.status_code == status.HTTP_200_OK
    assert response.headers['content-type'].startswith('text/html')
    assert test_project.name in response.text


async def test_project_print_page_renders(
    async_client: AsyncClient,
    test_project: Project,
) -> None:
    """Test that the printable project form renders."""
    response = await async_client.get(f'/projects/{test_project.id}/print')

    assert response.status_code == status.HTTP_200_OK
    assert response.headers['content-type'].startswith('text/html')
    assert test_project.name in response.text


# A missing project id is not covered: its error branch cannot render, which
# predates this change and belongs to the legacy frontend being replaced.
