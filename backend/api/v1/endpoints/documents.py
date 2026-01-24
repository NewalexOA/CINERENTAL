"""Documents endpoints module.

This module implements API endpoints for managing rental documents.
It provides routes for uploading, retrieving, and managing various
documents like contracts, invoices, and other rental paperwork.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import typed_delete, typed_get, typed_post, typed_put
from backend.core.database import get_db
from backend.exceptions import BusinessError, NotFoundError, StatusTransitionError
from backend.models import Document, DocumentStatus, DocumentType
from backend.schemas import DocumentCreate, DocumentResponse, DocumentUpdate
from backend.services import DocumentService

documents_router: APIRouter = APIRouter()


def _document_to_response(document: Document) -> DocumentResponse:
    """Convert Document model to DocumentResponse schema.

    Args:
        document: Document model instance

    Returns:
        DocumentResponse schema
    """
    return DocumentResponse(
        id=document.id,
        client_id=document.client_id,
        booking_id=document.booking_id,
        type=document.type,
        title=document.title,
        description=document.description or '',  # Ensure description is never None
        file_path=document.file_path,
        file_name=document.file_name,
        file_size=document.file_size,
        mime_type=document.mime_type,
        status=document.status,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@typed_post(
    documents_router,
    '/',
    response_model=DocumentResponse,
    status_code=http_status.HTTP_201_CREATED,
)
async def create_document(
    document: DocumentCreate,
    client_id: int = Query(..., description='ID клиента'),
    booking_id: Optional[int] = Query(None, description='ID бронирования'),
    file_name: str = Query(..., description='Оригинальное имя файла'),
    file_size: int = Query(..., description='Размер файла в байтах'),
    mime_type: str = Query(..., description='MIME-тип файла'),
    notes: Optional[str] = Query(None, description='Дополнительные заметки'),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Create a new document.

    Args:
        document: Document data
        client_id: Client ID
        booking_id: Booking ID (optional)
        file_name: Original file name
        file_size: File size in bytes
        mime_type: File MIME type
        notes: Additional notes (optional)
        db: Database session

    Returns:
        Created document

    Raises:
        HTTPException: If there is an error creating the document
    """
    try:
        service = DocumentService(db)
        created_document = await service.create_document(
            client_id=client_id,
            booking_id=booking_id,
            document_type=document.document_type,
            file_path=document.file_path,
            title=document.title,
            description=document.description,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            notes=notes,
        )
        return _document_to_response(created_document)
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    documents_router,
    '/',
    response_model=List[DocumentResponse],
)
async def get_documents(
    skip: Optional[int] = Query(0, ge=0, description='Документов для пропуска'),
    limit: Optional[int] = Query(
        100, ge=1, le=1000, description='Максимальное количество документов'
    ),
    document_type: Optional[DocumentType] = Query(
        None, description='Фильтр по типу документа'
    ),
    status: Optional[DocumentStatus] = Query(
        None, description='Фильтр по статусу документа'
    ),
    query: Optional[str] = Query(
        None, description='Поисковый запрос для фильтрации документов'
    ),
    db: AsyncSession = Depends(get_db),
) -> List[DocumentResponse]:
    """Get a list of documents with optional filtering.

    Args:
        skip: Number of documents to skip (for pagination)
        limit: Maximum number of documents to return (for pagination)
        document_type: Filter by document type
        status: Filter by document status
        query: Search query for filtering documents
        db: Database session

    Returns:
        List of documents matching the criteria
    """
    try:
        service = DocumentService(db)

        if query:
            documents = await service.search(query)
        elif document_type:
            documents = await service.get_by_type(document_type)
        elif status:
            documents = await service.get_by_status(status)
        else:
            documents = await service.get_documents()

        # Manually apply pagination
        skip_val = skip or 0
        limit_val = limit or 100
        paginated_documents = documents[skip_val : skip_val + limit_val]

        return [_document_to_response(doc) for doc in paginated_documents]
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    documents_router,
    '/{document_id}',
    response_model=DocumentResponse,
)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Get a document by ID.

    Args:
        document_id: Document ID
        db: Database session

    Returns:
        Document details

    Raises:
        HTTPException: If the document is not found
    """
    try:
        service = DocumentService(db)
        document = await service.get_document(document_id)

        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Документ с ID {document_id} не найден',
            )

        return _document_to_response(document)
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_put(
    documents_router,
    '/{document_id}',
    response_model=DocumentResponse,
)
async def update_document(
    document_id: int,
    document: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Update a document.

    Args:
        document_id: Document ID
        document: Data for update
        db: Database session

    Returns:
        Updated document

    Raises:
        HTTPException: If the document is not found or the update failed
    """
    try:
        service = DocumentService(db)

        # Check if the document exists
        existing_document = await service.get_document(document_id)
        if not existing_document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Документ с ID {document_id} не найден',
            )

        # Update the document
        updated_document = await service.update_document(
            document_id=document_id,
            file_path=document.file_path,
            # notes is not used in DocumentUpdate, so we pass None
            notes=None,
        )

        # If a new status is specified, change it
        if document.status:
            try:
                updated_document = await service.change_status(
                    document_id=document_id,
                    status=document.status,
                )
            except StatusTransitionError as e:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=str(e),
                ) from e

        return _document_to_response(updated_document)
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_delete(
    documents_router,
    '/{document_id}',
    status_code=http_status.HTTP_204_NO_CONTENT,
)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a document.

    Args:
        document_id: Document ID
        db: Database session

    Raises:
        HTTPException: If the document is not found or the deletion failed
    """
    try:
        service = DocumentService(db)

        # Check if the document exists
        document = await service.get_document(document_id)
        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Документ с ID {document_id} не найден',
            )

        # Delete the document
        await service.repository.delete(document_id)
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    documents_router,
    '/client/{client_id}',
    response_model=List[DocumentResponse],
)
async def get_client_documents(
    client_id: int,
    db: AsyncSession = Depends(get_db),
) -> List[DocumentResponse]:
    """Get all documents for a client.

    Args:
        client_id: Client ID
        db: Database session

    Returns:
        List of client's documents

    Raises:
        HTTPException: If there is an error retrieving the documents
    """
    try:
        service = DocumentService(db)
        documents = await service.repository.get_by_client(client_id)
        return [_document_to_response(doc) for doc in documents]
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    documents_router,
    '/booking/{booking_id}',
    response_model=List[DocumentResponse],
)
async def get_booking_documents(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
) -> List[DocumentResponse]:
    """Get all documents for a booking.

    Args:
        booking_id: Booking ID
        db: Database session

    Returns:
        List of booking's documents

    Raises:
        HTTPException: If there is an error retrieving the documents
    """
    try:
        service = DocumentService(db)
        documents = await service.get_by_booking(booking_id)
        return [_document_to_response(doc) for doc in documents]
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_post(
    documents_router,
    '/{document_id}/status',
    response_model=DocumentResponse,
)
async def change_document_status(
    document_id: int,
    status: DocumentStatus,
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Change document status.

    Args:
        document_id: Document ID
        status: New status
        db: Database session

    Returns:
        Updated document

    Raises:
        HTTPException: If the document is not found or the status change failed
    """
    try:
        service = DocumentService(db)

        # Check if the document exists
        document = await service.get_document(document_id)
        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Документ с ID {document_id} не найден',
            )

        # Change the status
        updated_document = await service.change_status(
            document_id=document_id,
            status=status,
        )
        return _document_to_response(updated_document)
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except StatusTransitionError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
