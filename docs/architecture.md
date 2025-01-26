# Architecture Documentation

## 1. Application Layers

### Presentation Layer (UI)
- Web interface using Bootstrap
- Barcode scanner integration components
- Data input forms and views

### API Layer
FastAPI is chosen over Django for the following reasons:
- Asynchronous processing (important for fast scanner response)
- Automatic data validation
- Automatic OpenAPI documentation generation
- Higher performance characteristics

### Service Layer (Business Logic)
Service components:
- Booking services
- Equipment services
- Client services
- Pricing calculation service

### Repository Layer (Data Access)
- PostgreSQL repositories
- Redis caching for frequently accessed data
- File storage abstraction

## 2. Project Structure
```
cinerental/
├── backend/
│   ├── api/              # FastAPI routes
│   ├── services/         # Business logic
│   ├── repositories/     # Database operations
│   ├── models/          # Pydantic models and ORM models
│   └── core/            # Configuration, utilities
├── frontend/
│   ├── static/          # CSS, JS, images
│   └── templates/       # HTML templates
├── tests/               # Tests
└── docker/             # Docker configuration
```

## 3. Design Patterns

### Repository Pattern
- Abstracts database operations
- Provides clean interface for data access
- Allows easy switching between different data sources

### Service Layer Pattern
- Encapsulates business logic
- Coordinates between different repositories
- Handles transaction management

### Factory Pattern
- Used for object creation
- Provides flexibility in object instantiation
- Helps maintain single responsibility principle

### Strategy Pattern
- Implements different pricing calculation strategies
- Allows easy addition of new pricing rules
- Maintains clean separation of pricing logic

### Observer Pattern
- Handles equipment status updates
- Maintains real-time synchronization
- Manages state changes notifications

## 4. Barcode Scanner Integration
- Dedicated service for scanner input processing
- WebSocket implementation for real-time status updates
- HID (keyboard emulation) mode support

## 5. Data Management
- Database migrations using Alembic
- ORM: SQLAlchemy for database operations
- Redis caching for frequently accessed data
- Optimized queries with proper indexing

## 6. Scalability
### Docker Containerization
Separate containers for:
- Backend application
- Frontend static files
- PostgreSQL database
- Redis cache

### Performance Considerations
- Response time for scanner operations < 1 second
- Database optimization for up to 10,000 records
- Indexed fields for fast barcode lookups

## 7. Security
- Basic authentication for MVP
- Password hashing
- Input validation and sanitization
- CORS configuration
- Rate limiting for API endpoints
