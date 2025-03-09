"""Integration tests for equipment barcode integration."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Category
from tests.conftest import async_test


@async_test
async def test_create_equipment_with_generated_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating equipment with automatically generated barcode."""
    # Create test category
    category = Category(
        name='Test Category',
        description='Test Description',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Create equipment with generated barcode
    response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment',
            'description': 'Test Description',
            'category_id': category.id,
            'serial_number': 'SN001',
            'replacement_cost': 1000.00,
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()

    # Check that the barcode was auto-generated
    assert 'barcode' in data
    assert data['barcode'], 'Barcode should not be empty'
    assert len(data['barcode']) > 0

    # Verify the new numeric format
    assert data['barcode'].isdigit(), 'Barcode should be numeric, '
    f'got {data["barcode"]}'

    assert data['category_id'] == category.id, 'Category ID should match, '
    f'got {data["category_id"]}'


@async_test
async def test_create_equipment_with_custom_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating equipment with custom barcode."""
    # Create a test category
    category = Category(
        name='Test Category',
        description='Test Description',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Using a valid barcode from test cases in BarcodeService._calculate_checksum
    # '000000001' with checksum '01'
    custom_barcode = '00000000101'

    # Create equipment with custom barcode
    response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment',
            'description': 'Test Description',
            'category_id': category.id,
            'custom_barcode': custom_barcode,
            'serial_number': 'SN002',
            'replacement_cost': 1000.00,
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()

    # Check that our custom barcode was used
    assert data['barcode'] == custom_barcode


@async_test
async def test_create_equipment_without_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating equipment without specifying barcode."""
    # Create test category
    category = Category(
        name='Test Category',
        description='Test Description',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Create equipment without barcode
    response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment',
            'description': 'Test Description',
            'category_id': category.id,
            'serial_number': 'SN003',
            'replacement_cost': 1000.00,
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()

    # Auto-generated barcode should be present
    assert 'barcode' in data
    assert data['barcode'], 'Barcode should not be empty'
    assert len(data['barcode']) > 0

    # Verify the numeric format
    assert data['barcode'].isdigit(), 'Barcode should be numeric, '
    f'got {data["barcode"]}'


@async_test
async def test_create_equipment_with_invalid_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating equipment with invalid barcode format."""
    # Create test category
    category = Category(
        name='Test Category',
        description='Test Description',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Create equipment with invalid barcode format
    response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment',
            'description': 'Test Description',
            'category_id': category.id,
            'custom_barcode': 'INVALID-FORMAT',  # Invalid format
            'serial_number': 'SN004',
            'replacement_cost': 1000.00,
        },
    )

    assert response.status_code == 400, response.text
    data = response.json()
    assert 'detail' in data
    assert 'barcode' in data['detail'].lower() or 'format' in data['detail'].lower()


@async_test
async def test_create_equipment_with_duplicate_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating equipment with duplicate barcode."""
    # Create test category
    category = Category(
        name='Test Category',
        description='Test Description',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Using a valid barcode from test cases in BarcodeService._calculate_checksum
    # '000000123' with checksum '23'
    custom_barcode = '00000012323'

    # Create first equipment
    response1 = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment 1',
            'description': 'Test Description',
            'category_id': category.id,
            'custom_barcode': custom_barcode,
            'serial_number': 'SN005',
            'replacement_cost': 1000.00,
        },
    )

    assert response1.status_code == 201, response1.text

    # Create second equipment with same barcode
    response2 = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment 2',
            'description': 'Test Description',
            'category_id': category.id,
            'custom_barcode': custom_barcode,  # Duplicate
            'serial_number': 'SN006',
            'replacement_cost': 1000.00,
        },
    )

    assert response2.status_code == 400, response2.text
    data = response2.json()
    assert 'detail' in data
    assert 'barcode' in data['detail'].lower() or 'duplicate' in data['detail'].lower()
