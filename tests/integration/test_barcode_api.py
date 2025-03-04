"""Integration tests for barcode API endpoints."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Category, SubcategoryPrefix
from tests.conftest import async_test


@async_test
async def test_generate_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test generating a barcode via API."""
    # Create test category
    category = Category(
        name='Test Category',
        description='Test Description',
        prefix='TC',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Create test subcategory prefix
    subcategory_prefix = SubcategoryPrefix(
        category_id=category.id,
        name='Test Subcategory',
        prefix='TS',
        description='Test Subcategory Description',
    )
    db_session.add(subcategory_prefix)
    await db_session.commit()
    await db_session.refresh(subcategory_prefix)

    # Generate barcode
    response = await async_client.post(
        '/api/v1/barcodes/generate',
        json={
            'category_id': category.id,
            'subcategory_prefix_id': subcategory_prefix.id,
        },
    )

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert 'barcode' in data
    barcode = data['barcode']

    # Check barcode format
    assert isinstance(barcode, str)
    assert len(barcode.split('-')) == 3
    assert barcode.startswith('TCTS-')


@async_test
async def test_generate_barcode_invalid_category(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test generating a barcode with invalid category."""
    # Create test subcategory prefix
    category = Category(
        name='Test Category',
        description='Test Description',
        prefix='TC',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    subcategory_prefix = SubcategoryPrefix(
        category_id=category.id,
        name='Test Subcategory',
        prefix='TS',
        description='Test Subcategory Description',
    )
    db_session.add(subcategory_prefix)
    await db_session.commit()
    await db_session.refresh(subcategory_prefix)

    # Try to generate barcode with invalid category
    response = await async_client.post(
        '/api/v1/barcodes/generate',
        json={
            'category_id': 999999,  # Non-existent category ID
            'subcategory_prefix_id': subcategory_prefix.id,
        },
    )

    # Check response
    assert response.status_code == 400
    data = response.json()
    assert 'detail' in data
    assert 'Category not found' in data['detail']


@async_test
async def test_validate_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test validating a barcode via API."""
    # Create test category
    category = Category(
        name='Test Category',
        description='Test Description',
        prefix='TC',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    # Create test subcategory prefix
    subcategory_prefix = SubcategoryPrefix(
        category_id=category.id,
        name='Test Subcategory',
        prefix='TS',
        description='Test Subcategory Description',
    )
    db_session.add(subcategory_prefix)
    await db_session.commit()
    await db_session.refresh(subcategory_prefix)

    # First generate a barcode
    generate_response = await async_client.post(
        '/api/v1/barcodes/generate',
        json={
            'category_id': category.id,
            'subcategory_prefix_id': subcategory_prefix.id,
        },
    )
    barcode = generate_response.json()['barcode']

    # Then validate it
    validate_response = await async_client.post(
        '/api/v1/barcodes/validate',
        json={
            'barcode': barcode,
        },
    )

    # Check response
    assert validate_response.status_code == 200
    data = validate_response.json()
    assert data['is_valid'] is True
    assert 'details' in data
    assert 'category' in data['details']
    assert 'subcategory_prefix' in data['details']
    assert 'sequence_number' in data['details']


@async_test
async def test_validate_invalid_barcode(
    async_client: AsyncClient,
) -> None:
    """Test validating an invalid barcode via API."""
    response = await async_client.post(
        '/api/v1/barcodes/validate',
        json={
            'barcode': 'INVALID-BARCODE',
        },
    )

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data['is_valid'] is False
    assert data['details'] == {}
