"""Integration tests for barcode API endpoints."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import async_test


@async_test
async def test_generate_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test generating a barcode via API."""
    # Generate barcode without parameters (auto-increment)
    response = await async_client.post(
        '/api/v1/barcodes/generate',
    )

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert 'barcode' in data
    barcode = data['barcode']

    # Check barcode format
    assert isinstance(barcode, str)
    assert len(barcode) == 11  # 9 digits + 2 digit checksum


@async_test
async def test_validate_barcode(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test validating a barcode via API."""
    # First generate a barcode
    generate_response = await async_client.post(
        '/api/v1/barcodes/generate',
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
    assert 'sequence_number' in data
    assert isinstance(data['sequence_number'], int)


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
    assert data['sequence_number'] == 0


@async_test
async def test_get_next_sequence_number(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test getting the next sequence number via API."""
    # Get the next sequence number
    response = await async_client.get('/api/v1/barcodes/next')

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert 'next_sequence_number' in data
    assert isinstance(data['next_sequence_number'], int)
