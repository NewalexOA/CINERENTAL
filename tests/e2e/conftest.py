"""Fixtures and configuration for E2E tests."""

import asyncio
import os
import time
from decimal import Decimal
from typing import AsyncGenerator, Dict, Generator, Tuple

import pytest
import pytest_asyncio
import requests
from alembic import command
from alembic.config import Config
from loguru import logger
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

# Import only the settings instance
from backend.core.config import settings
from backend.core.logging import configure_logging
from backend.models import Equipment
from backend.schemas.category import CategoryResponse
from backend.services import EquipmentService
from backend.services.category import CategoryRepository, CategoryService


# Set logging for tests
def configure_test_logging():
    """Configure logging for tests."""
    # Set the environment variable for tests
    os.environ['ENVIRONMENT'] = 'testing'

    # Forcefully set the logging level to WARNING
    # First, remove all handlers
    logger.remove()

    # Add a handler with the WARNING level
    logger.add(
        sink=lambda msg: None, level='WARNING'  # Empty handler to suppress output
    )

    # Use centralized logging configuration through loguru
    configure_logging()


# Call the logging configuration function
configure_test_logging()

# Test database URL is now imported from config
# TEST_DATABASE_URL = 'postgresql+asyncpg://postgres:postgres@test_db:5432/postgres'


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
    """Initialize the test database by dropping and recreating the public schema."""
    # Use settings object to access config values
    db_name = settings.POSTGRES_DB
    # Construct the database URL without the database name for initial connection
    db_url_nodatabase = (
        f'postgresql+psycopg2://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@'
        f'{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/'
    )
    db_url = f'{db_url_nodatabase}{db_name}'

    engine = create_engine(db_url_nodatabase, isolation_level='AUTOCOMMIT')

    try:
        with engine.connect() as conn:
            # Check if database exists
            result = conn.execute(
                text('SELECT 1 FROM pg_database WHERE datname = :db_name'),
                {'db_name': db_name},
            )
            db_exists = result.scalar() == 1

            if not db_exists:
                logger.info(f'Database {db_name} does not exist. Creating...')
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                logger.info(f'Database {db_name} created.')
            else:
                logger.info(f'Database {db_name} already exists.')

    except Exception as e:
        logger.error(f'Error checking or creating database {db_name}: {e}')
        raise
    finally:
        engine.dispose()

    # Now connect to the specific test database
    engine = create_engine(db_url, isolation_level='AUTOCOMMIT')
    try:
        with engine.connect() as conn:
            logger.info(f'Dropping and recreating public schema in {db_name}...')
            # Drop schema with cascade and recreate it
            conn.execute(text('DROP SCHEMA public CASCADE;'))
            conn.execute(text('CREATE SCHEMA public;'))
            # Grant permissions (adjust user if necessary)
            conn.execute(text('GRANT ALL ON SCHEMA public TO postgres;'))
            conn.execute(text('GRANT ALL ON SCHEMA public TO public;'))
            logger.info('Public schema recreated successfully.')

            # No need to drop specific enums or tables anymore

        # Configure Alembic for migrations
        config = Config('alembic.ini')
        # Use the synchronous URL from settings for Alembic
        config.set_main_option('sqlalchemy.url', settings.SYNC_DATABASE_URL)

        # Make sure script_location is properly set to migrations
        if (
            not config.get_main_option('script_location')
            or config.get_main_option('script_location') != 'migrations'
        ):
            config.set_main_option('script_location', 'migrations')

        # Set environment variables for Alembic (might be redundant if
        # alembic.ini uses them)
        # Access values from settings instead of potentially undefined os.environ
        # vars here
        os.environ['POSTGRES_USER'] = settings.POSTGRES_USER
        os.environ['POSTGRES_PASSWORD'] = settings.POSTGRES_PASSWORD
        os.environ['POSTGRES_SERVER'] = settings.POSTGRES_SERVER
        os.environ['POSTGRES_PORT'] = str(settings.POSTGRES_PORT)
        os.environ['POSTGRES_DB'] = settings.POSTGRES_DB

        # Print debug information
        log_db = settings.POSTGRES_DB
        log_server = settings.POSTGRES_SERVER
        log_port = settings.POSTGRES_PORT
        log_script_loc = config.get_main_option('script_location')
        log_message = (
            f'Applying migrations to {log_db} at '
            f'{log_server}:{log_port} '
            f'with script_location={log_script_loc}'
        )
        logger.info(log_message)

        # Apply migrations
        command.upgrade(config, 'head')

        logger.info('Migrations applied, verifying tables...')

        # Verify migrations were applied (using synchronous connection for verification)
        with engine.connect() as conn:
            tables = [
                'equipment',
                'categories',
                'clients',
                'users',
                'documents',
                'bookings',
                'global_barcode_sequence',  # Added verification for sequence table
                'scan_sessions',  # Changed from equipment_scan_sessions
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
                exists = result.scalar()
                if not exists:
                    logger.error(f'Table {table} not found in {db_name}')
                    raise Exception(f'Migrations failed: {table} table not found')
                else:
                    logger.info(f'Table {table} verified in {db_name}')
    except Exception as e:
        # Log detailed error, including traceback
        logger.error(f'Error initializing test database: {e}', exc_info=True)
        raise
    finally:
        engine.dispose()


@pytest.fixture(scope='session', autouse=True)
def setup_test_env(event_loop) -> Generator[None, None, None]:
    """Setup test environment: initialize DB ONLY."""
    # Initialize database first
    init_test_db()

    # Removed the Uvicorn server startup logic (subprocess.Popen)
    # The test execution environment (docker compose run) should handle server
    # if needed, or tests should use ASGITransport.

    yield  # Tests run here

    # No server process to clean up
    logger.info('E2E environment setup complete.')


@pytest.fixture
async def engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create database engine for tests."""
    # Use the DATABASE_URL property from the imported settings instance
    engine = create_async_engine(
        settings.DATABASE_URL,  # Use the async URL from settings
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
    category_repo = CategoryRepository(db_session)
    category_service = CategoryService(db_session, repository=category_repo)
    category = await category_service.create_category(
        name='Test Category',
        description='Test Category Description',
    )
    await db_session.commit()
    yield CategoryResponse.model_validate(category).model_dump()
    await db_session.delete(category)
    await db_session.commit()


@pytest_asyncio.fixture
async def test_equipment(
    db_session: AsyncSession,
    equipment_service: EquipmentService,
    test_category: Dict,
) -> AsyncGenerator[Equipment, None]:
    """Create a test equipment."""
    # Check if category exists before using it
    category_id = test_category.get('id')
    if not category_id:
        raise ValueError('Test category fixture did not return a valid ID.')

    # Ensure barcode uniqueness if necessary for specific tests
    # Correct barcode format: 9 digits sequence + 2 digits checksum
    # For sequence '123456789', checksum is 91 (calculated using _calculate_checksum)
    custom_barcode = '12345678991'  # Corrected barcode with valid checksum

    try:
        equipment = await equipment_service.create_equipment(
            name='Sony Test Equipment',
            description='Test Description for Sony device',
            category_id=category_id,  # Use fetched category_id
            custom_barcode=custom_barcode,
            serial_number='SN001',
            replacement_cost=Decimal('1000.00'),
        )
        await db_session.commit()
        yield equipment
        # Clean up the created equipment
        # await db_session.delete(equipment)  # Optional: cleanup fixture handles it
        # await db_session.commit()
    except Exception as e:
        logger.error(f'Error creating test equipment: {e}', exc_info=True)
        await db_session.rollback()  # Rollback on error
        raise  # Re-raise the exception


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
    # Get base URL from environment variable or use default
    base_url = os.environ.get('APP_BASE_URL', 'http://web-test:8000')

    # Set viewport size
    await page.set_viewport_size({'width': 1280, 'height': 720})

    # Navigate to the equipment page and wait for it to be ready
    # Use the base_url obtained from environment
    equipment_url = f'{base_url}/equipment'  # Assuming /equipment is the correct path
    logger.info(f'Navigating to E2E test URL: {equipment_url}')
    await page.goto(equipment_url)
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


@pytest_asyncio.fixture
async def equipment_service(db_session: AsyncSession) -> EquipmentService:
    """Create an equipment service with proper repository initialization."""
    return EquipmentService(db_session)
