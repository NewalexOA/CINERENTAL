"""Document schema module.

This module defines Pydantic models for document data validation,
including request/response schemas for managing rental documents.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.models.document import DocumentStatus, DocumentType


class DocumentBase(BaseModel):
    """Base document schema."""

    title: str = Field(..., title='Title', description='Document title')
    description: str = Field(
        ..., title='Description', description='Document description'
    )
    document_type: DocumentType = Field(..., title='Type', description='Document type')
    file_path: str = Field(..., title='File Path', description='Path to document file')


class DocumentCreate(DocumentBase):
    """Create document request schema."""

    pass


class DocumentUpdate(BaseModel):
    """Update document request schema."""

    title: Optional[str] = Field(None, title='Title', description='Document title')
    description: Optional[str] = Field(
        None, title='Description', description='Document description'
    )
    file_path: Optional[str] = Field(
        None, title='File Path', description='Path to document file'
    )
    status: Optional[DocumentStatus] = Field(
        None, title='Status', description='Document status'
    )


class DocumentResponse(BaseModel):
    """Document response schema."""

    id: int
    client_id: int
    booking_id: Optional[int] = None
    type: DocumentType
    title: str
    description: str
    file_path: str
    file_name: str
    file_size: int
    mime_type: str
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
