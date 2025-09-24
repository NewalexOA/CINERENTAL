# TASK-094: Document Generate API Integration Analysis

## API Integration Overview

**Endpoint:** `POST /api/v1/documents/`
**Business Purpose:** Generates rental documents including contracts, handover acts, and labels with equipment and client information
**Frontend Usage:** Document generation interfaces, booking confirmation workflows, contract creation, label printing systems
**User Actions:** Document creation requests, contract generation, label printing, booking document preparation

## API Specification

### Request Structure

**Method:** POST
**Endpoint:** `/api/v1/documents/`
**Content-Type:** `application/json`

#### Parameters

**Request Body:**

```json
{
  "document_type": "string - Document type (required, enum: CONTRACT, HANDOVER_ACT, LABEL, INVOICE)",
  "booking_id": "integer - Booking ID for document generation (optional)",
  "client_id": "integer - Client ID (optional)",
  "equipment_ids": "array[integer] - Equipment IDs to include (optional)",
  "template_id": "integer - Document template ID (optional)",
  "custom_fields": {
    "title": "string - Document title override (optional)",
    "notes": "string - Additional notes (optional)",
    "special_terms": "string - Special contract terms (optional)"
  },
  "format": "string - Output format (optional, enum: PDF, HTML, PNG, default: PDF)",
  "delivery_method": "string - Delivery method (optional, enum: DOWNLOAD, EMAIL, PRINT, default: DOWNLOAD)"
}
```

#### Authentication

**Auth Type:** Session-based authentication with JWT token
**Headers Required:**
- `Content-Type: application/json`
- `Authorization: Bearer {jwt_token}`
**Permissions:** User must have document generation permissions

### Response Structure

#### Success Response (201)

```json
{
  "id": "integer - Generated document ID",
  "document_type": "string - Document type",
  "title": "string - Document title",
  "filename": "string - Generated filename",
  "format": "string - Document format",
  "file_size": "integer - File size in bytes",
  "download_url": "string - Temporary download URL",
  "document_content": {
    "booking_info": {
      "booking_number": "string - Booking reference",
      "client_name": "string - Client name",
      "rental_dates": "object - Rental date information"
    },
    "equipment_list": [
      {
        "equipment_id": "integer - Equipment ID",
        "name": "string - Equipment name",
        "barcode": "string - Equipment barcode",
        "serial_number": "string - Serial number",
        "daily_rate": "decimal - Daily rental rate"
      }
    ],
    "financial_summary": {
      "subtotal": "decimal - Document subtotal",
      "tax_amount": "decimal - Tax amount",
      "total_amount": "decimal - Total amount"
    }
  },
  "generation_info": {
    "template_used": "string - Template name used",
    "generation_time": "datetime - Generation timestamp",
    "processing_duration": "integer - Processing time in milliseconds",
    "page_count": "integer - Number of pages generated"
  },
  "delivery_info": {
    "delivery_method": "string - Delivery method used",
    "download_expires_at": "datetime - Download URL expiration",
    "email_sent": "boolean - Whether email was sent",
    "print_job_id": "string - Print job ID if applicable"
  },
  "created_by": {
    "user_id": "integer - Creating user ID",
    "username": "string - Creating username"
  },
  "created_at": "datetime - Creation timestamp"
}
```

#### Error Responses

**400 Bad Request:**

```json
{
  "detail": "Invalid document generation parameters",
  "errors": {
    "document_type": "Document type is required",
    "booking_id": "Booking ID must exist if provided",
    "equipment_ids": "At least one equipment ID required for equipment documents"
  }
}
```

**401 Unauthorized:**

```json
{
  "detail": "Authentication required for document generation",
  "error_code": "AUTH_REQUIRED"
}
```

**403 Forbidden:**

```json
{
  "detail": "User does not have permission to generate documents",
  "error_code": "INSUFFICIENT_PERMISSIONS"
}
```

**404 Not Found:**

```json
{
  "detail": "Referenced entity not found",
  "errors": {
    "booking_id": "Booking with ID {booking_id} not found",
    "template_id": "Template with ID {template_id} not found"
  }
}
```

## Frontend Integration

### API Call Implementation

**Location:** `/frontend/static/js/document/document-generator.js`
**Function/Method:** `generateDocument()`, `createContract()`, `printLabels()`
**Call Pattern:** Promise-based POST request with file download handling and progress tracking

### Error Handling

#### Network Errors
**Detection:** Request timeouts during document generation
**User Feedback:** "Document generation failed - check connection"
**Recovery:** Retry mechanism with progress preservation

#### Server Errors
**Error Processing:** Template errors guide user to alternative templates
**Error Display:** Document generation errors with specific failure reasons
**Error Recovery:** Alternative document formats, template selection guidance

### Loading States

**Loading Indicators:** Document generation progress bar, processing status
**Expected Duration:** 2-10s depending on document complexity and equipment count
**Progress Indication:** Real-time generation progress with processing steps

## Performance Characteristics

### Response Times
**Typical Response Time:** 2-5s for simple documents, up to 15s for complex contracts with many equipment items
**Performance Factors:** Document complexity, equipment count, template rendering time

### Scalability Considerations
**Concurrent Requests:** Document generation processed in background queues
**Resource Limitations:** Large documents may require extended processing time

## ✅ ACCEPTANCE CRITERIA

- [ ] Document generate API endpoint analyzed through Playwright monitoring
- [ ] All document generation scenarios documented with template examples
- [ ] Error scenarios tested including template and entity issues
- [ ] Frontend integration patterns identified for document workflows
- [ ] Performance characteristics measured for various document types

## 📝 COMPLETION CHECKLIST

- [ ] Document generation API endpoint tested
- [ ] Document creation workflows validated
- [ ] File download integration patterns documented
- [ ] Error scenarios verified with recovery options
- [ ] Performance measurements completed for different document complexities
