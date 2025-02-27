"""Fixtures and configuration for E2E tests."""

import asyncio
import multiprocessing
import time
from typing import AsyncGenerator, Dict, Generator, Tuple

import pytest
import requests
import uvicorn
from alembic import command
from alembic.config import Config
from playwright.async_api import (
    APIRequestContext,
    Browser,
    BrowserContext,
    Page,
    async_playwright,
)
from requests.exceptions import RequestException
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import text

from backend.main import app as fastapi_app
from backend.models import Equipment
from backend.schemas.category import CategoryResponse
from backend.schemas.equipment import EquipmentResponse
from backend.services.category import CategoryService
from backend.services.equipment import EquipmentService

# Test database URL with trust auth method
TEST_DATABASE_URL = 'postgresql+asyncpg://postgres@test_db:5432/cinerental_test'


def wait_for_app(url: str, timeout: int = 30, interval: int = 1) -> bool:
    """Wait for the application to be ready.

    Args:
        url: Base URL to check
        timeout: Maximum time to wait in seconds
        interval: Time between checks in seconds

    Returns:
        bool: True if application is ready, False otherwise
    """
    endpoints = [
        '/api/v1/health',
        '/api/v1/equipment',
        '/api/v1/categories',
    ]

    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            # Check all critical endpoints
            for endpoint in endpoints:
                response = requests.get(f'{url}{endpoint}')
                if response.status_code != 200:
                    break
            else:  # All endpoints returned 200
                return True
        except RequestException:
            pass
        time.sleep(interval)
    return False


def run_app() -> None:
    """Run the FastAPI application."""
    uvicorn.run(
        fastapi_app, host='127.0.0.1', port=8000, log_level='info', use_colors=False
    )


@pytest.fixture(scope='session')
def event_loop():
    """Create event loop for tests."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


def init_test_db() -> None:
    """Initialize test database with migrations."""
    sync_url = 'postgresql://postgres@test_db:5432/postgres'  # Connect to default db
    db_name = 'cinerental_test'

    # Configure Alembic
    config = Config('alembic.ini')
    config.set_main_option(
        'sqlalchemy.url', f'postgresql://postgres@test_db:5432/{db_name}'
    )

    # Create engine for database operations
    engine = create_engine(sync_url)

    try:
        # Connect to default database to recreate test database
        with engine.connect() as conn:
            conn.execute(text('COMMIT'))  # Close any open transaction

            # Drop connections to test database
            conn.execute(
                text(
                    f'''
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{db_name}'
            '''
                )
            )

            # Drop and recreate database
            conn.execute(text(f'DROP DATABASE IF EXISTS {db_name}'))
            conn.execute(text(f'CREATE DATABASE {db_name}'))
            conn.commit()

        # Dispose connection to default database
        engine.dispose()

        # Connect to test database and apply migrations
        test_engine = create_engine(f'postgresql://postgres@test_db:5432/{db_name}')
        try:
            # Apply migrations
            command.upgrade(config, 'head')

            # Verify migrations were applied
            with test_engine.connect() as conn:
                tables = [
                    'equipment',
                    'categories',
                    'clients',
                    'users',
                    'documents',
                    'bookings',
                ]
                for table in tables:
                    result = conn.execute(
                        text(
                            f'''
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_schema = 'public'
                            AND table_name = '{table}'
                        )
                    '''
                        )
                    )
                    if not result.scalar():
                        raise Exception(f'Migrations failed: {table} table not found')

        finally:
            test_engine.dispose()

    except Exception as e:
        print(f'Error initializing test database: {str(e)}')
        raise


@pytest.fixture(scope='session', autouse=True)
def setup_test_env(event_loop) -> Generator[None, None, None]:
    """Setup test environment: initialize DB and start application."""
    # Initialize database first
    init_test_db()

    # Start the FastAPI application in a separate process
    proc = multiprocessing.Process(target=run_app, daemon=True)
    proc.start()

    # Wait for the application to be ready
    max_retries = 30
    retry = 0
    while retry < max_retries:
        try:
            response = requests.get('http://127.0.0.1:8000/api/v1/health')
            if response.status_code == 200:
                break
        except requests.exceptions.ConnectionError:
            retry += 1
            time.sleep(1)

    if retry == max_retries:
        if proc.is_alive():
            proc.terminate()
            proc.join(timeout=5)
            if proc.is_alive():
                proc.kill()
        raise RuntimeError('Failed to start the application')

    yield

    # Cleanup
    if proc.is_alive():
        proc.terminate()
        proc.join(timeout=5)
        if proc.is_alive():
            proc.kill()


@pytest.fixture
async def engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create database engine for tests."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,  # Disable SQL logging
        future=True,
    )

    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Create database session for tests."""
    session_factory = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session


@pytest.fixture
async def test_category(db_session: AsyncSession) -> AsyncGenerator[Dict, None]:
    """Create test category."""
    category_service = CategoryService(db_session)
    category = await category_service.create_category(
        name='Test Category',
        description='Test Category Description',
    )
    await db_session.commit()
    yield CategoryResponse.model_validate(category).model_dump()
    await db_session.delete(category)
    await db_session.commit()


@pytest.fixture
async def test_equipment(
    db_session: AsyncSession,
    test_category: Dict,
) -> AsyncGenerator[Tuple[Equipment, Dict], None]:
    """Create test equipment.

    Returns:
        Tuple containing the SQLAlchemy model and the Pydantic model dict
    """
    equipment_service = EquipmentService(db_session)
    equipment = await equipment_service.create_equipment(
        name='Sony Professional Camera',
        description='Professional camera for video production',
        category_id=test_category['id'],
        barcode='SONY-001',
        serial_number='SN-001',
        daily_rate=100,
        replacement_cost=1000,
    )
    await db_session.commit()
    equipment_dict = EquipmentResponse.model_validate(equipment).model_dump()
    yield equipment, equipment_dict
    await equipment_service.delete_equipment(equipment.id)
    await db_session.commit()


@pytest.fixture(scope='session')
def anyio_backend() -> str:
    """Configure anyio backend."""
    return 'asyncio'


@pytest.fixture(scope='session')
async def browser() -> AsyncGenerator[Browser, None]:
    """Create browser for tests."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            args=['--no-sandbox', '--disable-setuid-sandbox'], headless=True
        )
        yield browser
        await browser.close()


@pytest.fixture
async def browser_context(browser: Browser) -> AsyncGenerator[BrowserContext, None]:
    """Create browser context for tests."""
    context = await browser.new_context()
    yield context
    await context.close()


@pytest.fixture
async def page(browser_context: BrowserContext) -> AsyncGenerator[Page, None]:
    """Create new page for each test."""
    page = await browser_context.new_page()
    yield page
    await page.close()


@pytest.fixture(scope='session')
def browser_type_launch_args() -> Dict:
    """Configure browser launch arguments."""
    return {
        'headless': True,
        'args': ['--no-sandbox', '--disable-setuid-sandbox'],
    }


@pytest.fixture(scope='session')
async def api_request_context(
    browser_context: BrowserContext,
) -> AsyncGenerator[APIRequestContext, None]:
    """Create API request context."""
    request_context = await browser_context.new_context()
    yield request_context
    await request_context.dispose()


@pytest.fixture
async def test_page(
    page: Page,
    test_equipment: Tuple[Equipment, Dict],
) -> AsyncGenerator[Page, None]:
    """Configure page for testing."""
    # Set viewport size
    await page.set_viewport_size({'width': 1280, 'height': 720})

    # Navigate to the equipment page and wait for it to be ready
    await page.goto('http://127.0.0.1:8000/equipment')
    await page.wait_for_load_state('networkidle')
    await page.wait_for_selector('#searchInput', state='visible', timeout=30000)

    yield page


@pytest.fixture(autouse=True)
async def cleanup_test_data(db_session: AsyncSession) -> AsyncGenerator[None, None]:
    """Clean up test data after each test."""
    yield

    try:
        # Disable foreign key checks
        await db_session.execute(text("SET session_replication_role = 'replica'"))
        await db_session.commit()

        # Clean up tables in correct order
        tables = [
            'documents',
            'bookings',
            'equipment',
            'categories',
            'clients',
            'users',
        ]
        for table in tables:
            try:
                await db_session.execute(text(f'TRUNCATE TABLE {table} CASCADE'))
            except Exception as e:
                print(f'Error cleaning up table {table}: {str(e)}')

        # Re-enable foreign key checks
        await db_session.execute(text("SET session_replication_role = 'origin'"))
        await db_session.commit()

    except Exception as e:
        print(f'Error during cleanup: {str(e)}')
        await db_session.rollback()
