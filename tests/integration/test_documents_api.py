"""Documents API integration tests."""

from typing import Dict, List, TypedDict, cast

from fastapi import status as http_status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Booking, Client, Document, DocumentStatus, DocumentType
from tests.conftest import async_test


class DocumentResponse(TypedDict):
    """Document response type."""

    id: int
    client_id: int
    booking_id: int
    type: str
    title: str
    description: str
    file_path: str
    file_name: str
    file_size: int
    mime_type: str
    status: str
    created_at: str
    updated_at: str


@async_test
async def test_create_document(
    async_client: AsyncClient,
    test_client: Client,
    test_booking: Booking,
) -> None:
    """Test creating a new document."""
    data = {
        'document_type': 'CONTRACT',
        'file_path': '/test/contract.pdf',
        'title': 'Test Contract',
        'description': 'Test contract description',
    }

    params = {
        'client_id': str(test_client.id),
        'booking_id': str(test_booking.id),
        'file_name': 'contract.pdf',
        'file_size': '1024',
        'mime_type': 'application/pdf',
        'notes': 'Test document',
    }

    response = await async_client.post(
        '/api/v1/documents/',
        json=data,
        params=params,
    )

    assert response.status_code == http_status.HTTP_201_CREATED
    result = response.json()

    assert result['client_id'] == test_client.id
    assert result['booking_id'] == test_booking.id
    assert result['type'] == 'CONTRACT'
    assert result['file_path'] == '/test/contract.pdf'
    assert result['title'] == 'Test Contract'
    assert result['description'] == 'Test contract description'
    assert result['file_name'] == 'contract.pdf'
    assert result['file_size'] == 1024
    assert result['mime_type'] == 'application/pdf'
    assert result['status'] == 'DRAFT'


@async_test
async def test_create_document_without_booking(
    async_client: AsyncClient,
    test_client: Client,
) -> None:
    """Test creating a document without a booking."""
    data = {
        'document_type': 'OTHER',
        'file_path': '/test/id.pdf',
        'title': 'ID Document',
        'description': 'Client identification document',
    }

    params = {
        'client_id': str(test_client.id),
        'file_name': 'id.pdf',
        'file_size': '2048',
        'mime_type': 'application/pdf',
    }

    response = await async_client.post(
        '/api/v1/documents/',
        json=data,
        params=params,
    )

    assert response.status_code == http_status.HTTP_201_CREATED
    result = response.json()

    assert result['client_id'] == test_client.id
    assert result['booking_id'] is None
    assert result['type'] == 'OTHER'
    assert result['file_path'] == '/test/id.pdf'
    assert result['title'] == 'ID Document'
    assert result['description'] == 'Client identification document'
    assert result['file_name'] == 'id.pdf'
    assert result['file_size'] == 2048
    assert result['mime_type'] == 'application/pdf'
    assert result['status'] == 'DRAFT'


@async_test
async def test_create_document_invalid_client(
    async_client: AsyncClient,
) -> None:
    """Test creating a document with an invalid client ID."""
    data = {
        'document_type': 'CONTRACT',
        'file_path': '/test/contract.pdf',
        'title': 'Test Contract',
        'description': 'Test contract description',
    }

    params = {
        'client_id': '9999',  # Non-existent client ID
        'file_name': 'contract.pdf',
        'file_size': '1024',
        'mime_type': 'application/pdf',
    }

    response = await async_client.post(
        '/api/v1/documents/',
        json=data,
        params=params,
    )

    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_get_documents(
    async_client: AsyncClient,
    test_document: Document,
) -> None:
    """Test getting a list of documents."""
    response = await async_client.get('/api/v1/documents/')

    assert response.status_code == http_status.HTTP_200_OK
    results = cast(List[Dict], response.json())

    assert len(results) >= 1
    assert any(doc['id'] == test_document.id for doc in results)


@async_test
async def test_get_documents_with_filters(
    async_client: AsyncClient,
    test_document: Document,
) -> None:
    """Test getting documents with filters."""
    # Test filtering by document type
    response = await async_client.get(
        f'/api/v1/documents/?document_type={test_document.type.value}'
    )

    assert response.status_code == http_status.HTTP_200_OK
    results = cast(List[Dict], response.json())

    assert len(results) >= 1
    assert all(doc['type'] == test_document.type.value for doc in results)

    # Test filtering by status
    response = await async_client.get(
        f'/api/v1/documents/?status={test_document.status.value}'
    )

    assert response.status_code == http_status.HTTP_200_OK
    results = cast(List[Dict], response.json())

    assert len(results) >= 1
    assert all(doc['status'] == test_document.status.value for doc in results)


@async_test
async def test_get_document_by_id(
    async_client: AsyncClient,
    test_document: Document,
) -> None:
    """Test getting a document by ID."""
    response = await async_client.get(f'/api/v1/documents/{test_document.id}/')

    assert response.status_code == http_status.HTTP_200_OK
    result = response.json()

    assert result['id'] == test_document.id
    assert result['client_id'] == test_document.client_id
    assert result['booking_id'] == test_document.booking_id
    assert result['type'] == test_document.type.value
    assert result['file_path'] == test_document.file_path
    assert result['status'] == test_document.status.value


@async_test
async def test_get_document_by_id_not_found(
    async_client: AsyncClient,
) -> None:
    """Test getting a non-existent document."""
    response = await async_client.get('/api/v1/documents/9999/')

    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_update_document(
    async_client: AsyncClient,
    test_document: Document,
) -> None:
    """Test updating a document."""
    data = {
        'file_path': '/test/updated.pdf',
        'status': 'PENDING',
    }

    response = await async_client.put(
        f'/api/v1/documents/{test_document.id}/',
        json=data,
    )

    assert response.status_code == http_status.HTTP_200_OK
    result = response.json()

    assert result['id'] == test_document.id
    assert result['file_path'] == '/test/updated.pdf'
    assert result['status'] == 'PENDING'


@async_test
async def test_update_document_not_found(
    async_client: AsyncClient,
) -> None:
    """Test updating a non-existent document."""
    data = {
        'file_path': '/test/updated.pdf',
    }

    response = await async_client.put(
        '/api/v1/documents/9999/',
        json=data,
    )

    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_update_document_invalid_status_transition(
    async_client: AsyncClient,
    test_document: Document,
    db_session: AsyncSession,
) -> None:
    """Test updating a document with an invalid status transition."""
    # First update to APPROVED (invalid transition from DRAFT)
    data = {
        'status': 'APPROVED',
    }

    response = await async_client.put(
        f'/api/v1/documents/{test_document.id}/',
        json=data,
    )

    assert response.status_code == http_status.HTTP_400_BAD_REQUEST

    # Update to a valid transition firs
    data = {
        'status': 'PENDING',
    }

    response = await async_client.put(
        f'/api/v1/documents/{test_document.id}/',
        json=data,
    )

    assert response.status_code == http_status.HTTP_200_OK

    # Then update to APPROVED (now valid from PENDING)
    data = {
        'status': 'APPROVED',
    }

    response = await async_client.put(
        f'/api/v1/documents/{test_document.id}/',
        json=data,
    )

    assert response.status_code == http_status.HTTP_200_OK

    # Then try to update to DRAFT (invalid transition from APPROVED)
    data = {
        'status': 'DRAFT',
    }

    response = await async_client.put(
        f'/api/v1/documents/{test_document.id}/',
        json=data,
    )

    assert response.status_code == http_status.HTTP_400_BAD_REQUEST


@async_test
async def test_delete_document(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_client: Client,
) -> None:
    """Test deleting a document."""
    # Create a document to delete
    from backend.services import DocumentService

    service = DocumentService(db_session)
    document = await service.create_document(
        client_id=test_client.id,  # Use test_client.id instead of hardcoded 1
        booking_id=None,
        document_type=DocumentType.OTHER,
        file_path='/test/to_delete.pdf',
        title='Document to Delete',
        description='This document will be deleted',
        file_name='to_delete.pdf',
        file_size=512,
        mime_type='application/pdf',
    )

    response = await async_client.delete(f'/api/v1/documents/{document.id}/')

    assert response.status_code == http_status.HTTP_204_NO_CONTENT

    # Verify document is deleted
    response = await async_client.get(f'/api/v1/documents/{document.id}/')
    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_delete_document_not_found(
    async_client: AsyncClient,
) -> None:
    """Test deleting a non-existent document."""
    response = await async_client.delete('/api/v1/documents/9999/')

    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_get_client_documents(
    async_client: AsyncClient,
    test_document: Document,
) -> None:
    """Test getting documents for a client."""
    response = await async_client.get(
        f'/api/v1/documents/client/{test_document.client_id}/'
    )

    assert response.status_code == http_status.HTTP_200_OK
    results = cast(List[Dict], response.json())

    assert len(results) >= 1
    assert any(doc['id'] == test_document.id for doc in results)
    assert all(doc['client_id'] == test_document.client_id for doc in results)


@async_test
async def test_get_booking_documents(
    async_client: AsyncClient,
    test_document: Document,
) -> None:
    """Test getting documents for a booking."""
    response = await async_client.get(
        f'/api/v1/documents/booking/{test_document.booking_id}/'
    )

    assert response.status_code == http_status.HTTP_200_OK
    results = cast(List[Dict], response.json())

    assert len(results) >= 1
    assert any(doc['id'] == test_document.id for doc in results)
    assert all(doc['booking_id'] == test_document.booking_id for doc in results)


@async_test
async def test_change_document_status(
    async_client: AsyncClient,
    test_document: Document,
) -> None:
    """Test changing document status."""
    response = await async_client.post(
        f'/api/v1/documents/{test_document.id}/status/',
        params={'status': 'PENDING'},
    )

    assert response.status_code == http_status.HTTP_200_OK
    result = response.json()

    assert result['id'] == test_document.id
    assert result['status'] == 'PENDING'

    # Test another valid transition
    response = await async_client.post(
        f'/api/v1/documents/{test_document.id}/status/',
        params={'status': 'UNDER_REVIEW'},
    )

    assert response.status_code == http_status.HTTP_200_OK
    result = response.json()

    assert result['id'] == test_document.id
    assert result['status'] == 'UNDER_REVIEW'


@async_test
async def test_change_document_status_invalid_transition(
    async_client: AsyncClient,
    test_document: Document,
    db_session: AsyncSession,
) -> None:
    """Test changing document status with an invalid transition."""
    # First set status to PENDING (valid transition from DRAFT)
    from backend.services import DocumentService

    service = DocumentService(db_session)
    await service.change_status(test_document.id, DocumentStatus.PENDING)

    # Then set status to APPROVED (valid transition from PENDING)
    await service.change_status(test_document.id, DocumentStatus.APPROVED)

    # Then try to change to DRAFT (invalid transition from APPROVED)
    response = await async_client.post(
        f'/api/v1/documents/{test_document.id}/status/',
        params={'status': 'DRAFT'},
    )

    assert response.status_code == http_status.HTTP_400_BAD_REQUEST


@async_test
async def test_change_document_status_not_found(
    async_client: AsyncClient,
) -> None:
    """Test changing status of a non-existent document."""
    response = await async_client.post(
        '/api/v1/documents/9999/status/',
        params={'status': 'PENDING'},
    )

    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_pagination(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_client: Client,
) -> None:
    """Test document pagination."""
    # Create multiple documents
    from backend.services import DocumentService

    service = DocumentService(db_session)

    # Create 5 documents
    for i in range(5):
        await service.create_document(
            client_id=test_client.id,
            booking_id=None,
            document_type=DocumentType.OTHER,
            file_path=f'/test/note_{i}.pdf',
            title=f'Test Note {i}',
            description=f'Test note description {i}',
            file_name=f'note_{i}.pdf',
            file_size=512,
            mime_type='application/pdf',
        )

    # Test first page (limit=2, skip=0)
    response = await async_client.get('/api/v1/documents/?limit=2&skip=0')

    assert response.status_code == http_status.HTTP_200_OK
    results = cast(List[Dict], response.json())

    assert len(results) == 2

    # Test second page (limit=2, skip=2)
    response = await async_client.get('/api/v1/documents/?limit=2&skip=2')

    assert response.status_code == http_status.HTTP_200_OK
    results = cast(List[Dict], response.json())

    assert len(results) == 2

    # The IDs should be different from the first page
    first_page_response = await async_client.get('/api/v1/documents/?limit=2&skip=0')
    first_page = cast(List[Dict], first_page_response.json())

    first_page_ids = [doc['id'] for doc in first_page]
    second_page_ids = [doc['id'] for doc in results]

    assert not any(doc_id in first_page_ids for doc_id in second_page_ids)
