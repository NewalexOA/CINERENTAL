"""E2E tests for equipment search functionality."""

from typing import Callable

import pytest
from playwright.async_api import Page, expect

TestFunc = Callable[[Page], None]

pytestmark = pytest.mark.asyncio(scope='function')


async def test_search_input_exists(test_page: Page) -> None:
    """Test that search input exists and is visible."""
    search_input = test_page.locator('#searchInput')
    await expect(search_input).to_be_visible()
    await expect(search_input).to_have_attribute(
        'placeholder', 'Поиск по названию, описанию, штрих-коду или серийному номеру...'
    )


async def test_search_as_user_types(test_page: Page) -> None:
    """Test that search works as user types."""
    search_input = test_page.locator('#searchInput')
    results_table = test_page.locator('table tbody tr')

    # Type search query
    await search_input.fill('sony')
    await test_page.wait_for_timeout(300)  # Wait for debounce

    # Wait for results to load
    await expect(results_table).to_be_visible(timeout=30000)

    # Check that results contain the search query
    first_row = await results_table.first.text_content() or ''
    assert 'sony' in first_row.lower()


async def test_search_no_results(test_page: Page) -> None:
    """Test search with no results."""
    search_input = test_page.locator('#searchInput')
    results_table = test_page.locator('table tbody')

    # Search for non-existent item
    await search_input.fill('nonexistent_item_xyz')
    await test_page.wait_for_timeout(300)  # Wait for debounce

    # Wait for "No results" message
    await expect(results_table).to_contain_text('Ничего не найдено', timeout=30000)


async def test_search_clear(test_page: Page) -> None:
    """Test clearing search input shows all items."""
    search_input = test_page.locator('#searchInput')
    results_table = test_page.locator('table tbody tr')

    # First search for something specific
    await search_input.fill('sony')
    await test_page.wait_for_timeout(300)  # Wait for debounce
    await expect(results_table).to_be_visible(timeout=30000)

    # Clear search
    await search_input.fill('')
    await test_page.wait_for_timeout(300)  # Wait for debounce
    await expect(results_table).to_be_visible(timeout=30000)


async def test_search_debounce(test_page: Page) -> None:
    """Test search debounce functionality."""
    search_input = test_page.locator('#searchInput')
    results_table = test_page.locator('table tbody tr')

    # Type quickly
    await search_input.type('s', delay=50)
    await test_page.wait_for_timeout(50)  # Wait between keystrokes
    await search_input.type('o', delay=50)
    await test_page.wait_for_timeout(50)
    await search_input.type('n', delay=50)
    await test_page.wait_for_timeout(50)
    await search_input.type('y', delay=50)

    # Wait for debounce and results to load
    await test_page.wait_for_timeout(300)  # Wait for debounce
    await expect(results_table).to_be_visible(timeout=30000)


async def test_search_special_characters(test_page: Page) -> None:
    """Test search with special characters."""
    search_input = test_page.locator('#searchInput')
    results_table = test_page.locator('table tbody tr')

    special_chars = ['<script>', 'DROP TABLE', '!@#$%^&*()', 'Test & Equipment']

    for chars in special_chars:
        await search_input.fill(chars)
        await test_page.wait_for_timeout(300)  # Wait for debounce
        await expect(results_table).to_be_visible(timeout=30000)


async def test_search_with_unicode(test_page: Page) -> None:
    """Test search with Unicode characters."""
    search_input = test_page.locator('#searchInput')
    results_table = test_page.locator('table tbody tr')

    unicode_queries = ['Тестовое', '测试设备', 'テスト機器']

    for query in unicode_queries:
        await search_input.fill(query)
        await test_page.wait_for_timeout(300)  # Wait for debounce
        await expect(results_table).to_be_visible(timeout=30000)
