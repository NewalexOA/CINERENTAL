# Live Search Functionality in Equipment Table

## 1. Overview

Live search functionality allows users to instantly find equipment in the ACT-RENTAL system as they type their search query. The search is performed in real-time with result filtering without the need to reload the page.

### Key features

- Search by equipment name, description, barcode, and serial number
- Filter by equipment category and status
- Instant table result updates
- Visual search process indication
- URL update with search parameters for shareable results

## 2. Solution Architecture

### 2.1. Frontend Components

#### HTML Structure (frontend/templates/equipment/list.html)

```html
<div class="position-relative">
    <input type="text"
           class="form-control rounded"
           id="searchInput"
           placeholder="Search by name, description, barcode, or serial number..."
           minlength="3">
    <div id="search-spinner" class="spinner-border spinner-border-sm d-none text-primary position-absolute"
         style="right: 10px; top: 50%; transform: translateY(-50%)" role="status">
        <span class="visually-hidden">Searching...</span>
    </div>
</div>
```

#### JavaScript Module (frontend/static/js/main.js)

The main `equipmentSearch` module handles initialization and search request processing:

```javascript
const equipmentSearch = {
    init() {
        const searchInput = document.querySelector('#searchInput');
        const categoryFilter = document.querySelector('#categoryFilter');
        const statusFilter = document.querySelector('#statusFilter');
        const searchSpinner = document.querySelector('#search-spinner');

        // Event handlers
        searchInput.addEventListener('input', updateResults);
        categoryFilter.addEventListener('change', updateResults);
        statusFilter.addEventListener('change', updateResults);

        // Results update function with debounce
        const updateResults = debounce(async () => {
            // Request logic and table update
        }, 300);
    }
};
```

### 2.2. Backend Components

#### API Endpoint (backend/api/v1/endpoints/equipment.py)

```python
@typed_get(
    equipment_router,
    '/',
    response_model=List[EquipmentResponse],
)
async def get_equipment_list(
    skip: Optional[int] = Query(0),
    limit: Optional[int] = Query(100),
    status: Optional[EquipmentStatus] = None,
    category_id: Optional[int] = None,
    query: Optional[str] = None,
    available_from: Optional[datetime] = None,
    available_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
) -> List[EquipmentResponse]:
    """Get list of equipment with optional filtering."""
    # Request validation and processing
    equipment_service = EquipmentService(db)
    equipment_list = await equipment_service.get_equipment_list(
        skip=skip,
        limit=limit,
        status=status,
        category_id=category_id,
        query=query,
        available_from=available_from,
        available_to=available_to,
    )
    return equipment_list
```

#### Service Layer (backend/services/equipment.py)

```python
async def get_equipment_list(
    self,
    skip: int = 0,
    limit: int = 100,
    status: Optional[EquipmentStatus] = None,
    category_id: Optional[int] = None,
    query: Optional[str] = None,
    available_from: Optional[datetime] = None,
    available_to: Optional[datetime] = None,
) -> List[EquipmentResponse]:
    """Get list of equipment with optional filtering."""
    # Parameter validation and preparation
    equipment_list = await self.repository.get_list(
        skip=skip,
        limit=limit,
        status=status,
        category_id=category_id,
        query=query,
        available_from=available_from,
        available_to=available_to,
    )
    return [
        EquipmentResponse.model_validate(equipment) for equipment in equipment_list
    ]
```

#### Repository (backend/repositories/equipment.py)

```python
async def get_list(
    self,
    skip: int = 0,
    limit: int = 100,
    status: Optional[EquipmentStatus] = None,
    category_id: Optional[int] = None,
    query: Optional[str] = None,
    available_from: Optional[datetime] = None,
    available_to: Optional[datetime] = None,
) -> List[Equipment]:
    """Get list of equipment with optional filtering and search."""
    stmt = select(Equipment)

    if status:
        stmt = stmt.where(Equipment.status == status)
    if category_id:
        stmt = stmt.where(Equipment.category_id == category_id)
    if query:
        search_pattern = f'%{query}%'
        stmt = stmt.where(
            or_(
                Equipment.name.ilike(search_pattern),
                Equipment.description.ilike(search_pattern),
                Equipment.barcode.ilike(search_pattern),
                Equipment.serial_number.ilike(search_pattern),
            )
        )

    # Additional availability date filtering
    # ...

    stmt = stmt.offset(skip).limit(limit)
    result = await self.session.execute(stmt)
    return list(result.scalars().all())
```

### 2.3. Database Optimization

To ensure high search performance, PostgreSQL GIN indexes with pg_trgm extension are used:

```sql
-- Create extension for trigram search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Search field indexes
CREATE INDEX idx_equipment_name_search ON equipment USING gin (name gin_trgm_ops);
CREATE INDEX idx_equipment_barcode_search ON equipment USING gin (barcode gin_trgm_ops);
CREATE INDEX idx_equipment_description_search ON equipment USING gin (description gin_trgm_ops);
CREATE INDEX idx_equipment_serial_number_search ON equipment USING gin (serial_number gin_trgm_ops);
```

## 3. Algorithm Flow

### 3.1. Search Process

1. User types text in search field
2. If query length ≥ 3 characters, search function activates
3. Loading indicator (spinner) is displayed
4. Debounce is executed to prevent frequent requests
5. URL is formed with search and filter parameters
6. AJAX request is sent to API
7. Browser URL is updated without page reload
8. Results are displayed in table
9. Loading indicator is hidden

### 3.2. Error Handling

- On request error, notification is displayed using `showToast` function
- Error logging to console and server
- Return to previous state on failed request

## 4. Performance

### 4.1. Client-side Optimizations

- Using debounce to prevent frequent requests (300ms)
- Minimum query length (3 characters) to reduce load
- Asynchronous DOM updates without page reload

### 4.2. Server-side Optimizations

- Using GIN indexes for fast text field search
- pg_trgm extension for efficient substring search
- Asynchronous request processing with FastAPI
- Result size limitation (pagination)

## 5. Testing

### 5.1. Unit Tests

```python
async def test_search_by_name():
    """Test search by equipment name."""
    service = EquipmentService(db_session)
    results = await service.search("Sony")
    assert len(results) > 0
    assert all("Sony" in item.name.lower() for item in results)

async def test_search_case_insensitive():
    """Test case insensitivity."""
    service = EquipmentService(db_session)
    results_lower = await service.search("sony")
    results_upper = await service.search("SONY")
    assert len(results_lower) == len(results_upper)
```

### 5.2. Integration Tests

```python
async def test_search_endpoint():
    """Test search endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/equipment/?query=sony")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert all("sony" in item["name"].lower() for item in data)
```

### 5.3. E2E Tests

```javascript
describe('Equipment Search', () => {
    beforeEach(() => {
        cy.visit('/equipment');
    });

    it('should search as user types', () => {
        cy.get('#searchInput')
            .type('sony');
        cy.get('#search-spinner').should('be.visible');
        cy.get('table tbody tr').should('have.length.gt', 0);
        cy.get('table tbody tr').each(($row) => {
            cy.wrap($row).should('contain.text', 'Sony');
        });
    });
});
```

## 6. Monitoring and Logging

### 6.1. Monitoring Metrics

- API endpoint response time `/equipment/?query={query}`
- Number of search requests per minute
- Percentage of failed requests

### 6.2. Logging

```python
# Log format
{
    "time": "2024-02-21T11:34:33",
    "level": "INFO",
    "name": "backend.api.equipment",
    "function": "search_equipment",
    "line": 123,
    "query": "sony",
    "results_count": 5,
    "response_time_ms": 45
}
```

## 7. Possible Improvements

1. **Full-text Search**: Implementing more advanced search capabilities using PostgreSQL Full Text Search or Elasticsearch
2. **Autocomplete**: Adding dropdown list with suggestions as user types
3. **Search History**: Tracking and displaying user's recent search queries
4. **Faceted Search**: Expanding filtering with dynamic available filter updates
5. **Result Caching**: Using Redis for caching frequent search queries

## 8. Conclusion

Live search functionality in equipment table provides a fast and convenient way to find needed equipment in the ACT-RENTAL system. Thanks to client-side and server-side optimizations, as well as the use of modern technologies, search works quickly and efficiently even with large amounts of data.
