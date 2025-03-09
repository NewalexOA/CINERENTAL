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
        prefix='TC',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Create equipment with generated barcode
    response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment',
            'description': 'Test Equipment Description',
            'category_id': category.id,
            'generate_barcode': True,
            'serial_number': 'SN001',
            'status': 'AVAILABLE',
            'replacement_cost': 1000.00,
        },
    )

    # Check response
    assert response.status_code == 201
    data = response.json()
    assert 'barcode' in data
    barcode = data['barcode']

    # Check barcode format
    assert isinstance(barcode, str)
    assert len(barcode) == 11  # 9 digits for sequence + 2 digits for checksum

    # Verify equipment was created with the barcode
    equipment_response = await async_client.get(f'/api/v1/equipment/{data["id"]}')
    assert equipment_response.status_code == 200
    equipment_data = equipment_response.json()
    assert equipment_data['barcode'] == barcode


@async_test
async def test_create_equipment_with_custom_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating equipment with custom barcode."""
    # Create test category
    category = Category(
        name='Test Category',
        description='Test Description',
        prefix='TC',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Create equipment with custom barcode
    response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment',
            'description': 'Test Equipment Description',
            'category_id': category.id,
            'barcode': 'TCTS-000001-3',
            'serial_number': 'SN001',
            'status': 'AVAILABLE',
            'replacement_cost': 1000.00,
        },
    )

    # Check response
    assert response.status_code == 201
    data = response.json()
    assert data['barcode'] == 'TCTS-000001-3'


@async_test
async def test_create_equipment_without_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating equipment without barcode."""
    # Create test category
    category = Category(
        name='Test Category',
        description='Test Description',
        prefix='TC',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Try to create equipment without barcode
    response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment',
            'description': 'Test Equipment Description',
            'category_id': category.id,
            'serial_number': 'SN001',  # Add serial_number
        },
    )

    # Check response - should fail with validation error
    assert response.status_code == 400
    data = response.json()
    assert 'detail' in data
    assert 'barcode' in data['detail']


@async_test
async def test_create_equipment_with_invalid_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating equipment with invalid barcode."""
    # Create test category
    category = Category(
        name='Test Category',
        description='Test Description',
        prefix='TC',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Try to create equipment with invalid barcode
    response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment',
            'description': 'Test Equipment Description',
            'category_id': category.id,
            'barcode': 'INVALID-BARCODE',  # Invalid barcode format
            'serial_number': 'SN001',  # Add serial_number
        },
    )

    # Check response - should fail with validation error
    assert response.status_code == 400
    data = response.json()
    assert 'detail' in data
    assert 'Invalid barcode format' in data['detail']


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
        prefix='TC',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Create first equipment
    first_response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment 1',
            'description': 'Test Equipment Description 1',
            'category_id': category.id,
            'barcode': 'TCTS-000001-3',
            'serial_number': 'SN001',
            'status': 'AVAILABLE',
            'replacement_cost': 1000.00,
        },
    )
    assert first_response.status_code == 201

    # Try to create second equipment with same barcode
    second_response = await async_client.post(
        '/api/v1/equipment/',
        json={
            'name': 'Test Equipment 2',
            'description': 'Test Equipment Description 2',
            'category_id': category.id,
            'barcode': 'TCTS-000001-3',
            'serial_number': 'SN002',
            'status': 'AVAILABLE',
            'replacement_cost': 1000.00,
        },
    )

    # Check response - should fail with conflict error
    assert second_response.status_code == 400
    data = second_response.json()
    assert 'detail' in data
    assert 'already exists' in data['detail']
