# Code Style Guide for CINERENTAL

## General Principles

1. **Readability above all:** Code should be easily readable and understandable for other developers.
2. **Consistency:** Maintain uniformity in naming, indentation, and code structure.
3. **Minimalism:** Strive for brevity, but not at the expense of clarity.
4. **Documentation:** Document complex logic and non-obvious decisions.

## Python

### Style Conventions

1. **Follow PEP 8:** Adhere to the official Python style guide.
2. **Use single quotes:** Prefer single quotes (`'`) over double quotes (`"`) for strings.
3. **Naming:**
   - **Variables and functions:** `snake_case` (e.g., `equipment_status`)
   - **Classes:** `PascalCase` (e.g., `EquipmentService`)
   - **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RENTAL_DAYS`)
   - **Private attributes:** Start with a single underscore (e.g., `_private_method`)
4. **Indentation:** Use 4 spaces for indentation (not tabs).
5. **Line length:** Limit line length to 88 characters (using Black).
6. **Imports:**
   - Group imports: standard library, third-party packages, local modules.
   - Sort alphabetically within groups.

### Docstrings and Comments

1. **Docstrings:**
   - Use triple double quotes (`"""`) for docstrings.
   - Describe parameters, return values, and exceptions.
   - Follow Google format for docstrings.

    ```python
    def get_equipment_by_id(self, equipment_id: int) -> models.Equipment:
        """Get equipment by ID.

        Args:
            equipment_id: Unique equipment identifier.

        Returns:
            Equipment object.

        Raises:
            EquipmentNotFoundError: If equipment with specified ID is not found.
        """
        # Implementation...
    ```

2. **Comments:**

   - Use comments to explain non-obvious logic.
   - Write comments in English.
   - Avoid obvious comments.

### Type Annotations

1. **Always use type annotations** for function arguments, return values, and variables.
2. **Import types** from the `typing` module for complex types.
3. **Use `Optional[T]`** instead of `Union[T, None]` for parameters that can be None.

```python
from typing import Optional, List, Dict, Any

def get_equipment(
    self,
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    category_id: Optional[int] = None,
) -> List[models.Equipment]:
    # Implementation...
```

### Error Handling

1. **Use specific exceptions** instead of general ones.
2. **Create custom exceptions** for business logic.
3. **Handle exceptions** at the appropriate abstraction level.

```python
try:
    equipment = await self.equipment_repository.get_by_id(equipment_id)
    if not equipment:
        raise EquipmentNotFoundError(f"Equipment with id {equipment_id} not found")
except SQLAlchemyError as e:
    raise DatabaseError(f"Database error while fetching equipment: {str(e)}")
```

## SQL / SQLAlchemy

1. **Use asynchronous API** of SQLAlchemy.
2. **Define relationships** in models explicitly.
3. **Use named arguments** when creating model objects.

    ```python
    # Good
    user = User(email="user@example.com", full_name="User Name")

    # Bad
    user = User("user@example.com", "User Name")
    ```

4. **Use Alembic migrations** for all database schema changes.

## FastAPI

1. **Use Pydantic** for request and response validation.
2. **Document API** using description and examples parameters.
3. **Use HTTP status codes** correctly (200, 201, 400, 404, 500, etc.).
4. **Use Depends** for dependency injection.

```python
@router.post(
    "/",
    response_model=schemas.Equipment,
    status_code=201,
    description="Create a new equipment item",
)
async def create_equipment(
    equipment_data: schemas.EquipmentCreate,
    equipment_service: EquipmentService = Depends(),
):
    return await equipment_service.create_equipment(equipment_data)
```

## JavaScript

1. **Use ES6+** features when possible.
2. **Naming:**
   - **Variables and functions:** `camelCase` (e.g., `getEquipmentById`)
   - **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_ITEMS`)
   - **Classes:** `PascalCase` (e.g., `EquipmentManager`)
3. **Use strict mode:** Add `'use strict';` at the beginning of files.
4. **Prefer modular structure** for code organization.

```javascript
'use strict';

const MAX_ITEMS = 100;

function fetchEquipment(categoryId) {
    // Implementation...
}

export { fetchEquipment, MAX_ITEMS };
```

## HTML / Templates (Jinja2)

1. **Use semantic HTML5 tags.**
2. **Format HTML** with 2-space indentation.
3. **Use Jinja2 templates** for reusable components.
4. **Name templates** according to their purpose.

```html
{# equipment/detail.html #}
{% extends "base.html" %}

{% block content %}
  <section class="equipment-details">
    <h1>{{ equipment.name }}</h1>
    <div class="equipment-info">
      <p>Serial Number: {{ equipment.serial_number }}</p>
      <p>Status: {{ equipment.status }}</p>
    </div>
  </section>
{% endblock %}
```

## CSS

1. **Use classes** instead of IDs for styling.
2. **Follow BEM** (Block Element Modifier) for class naming.
3. **Group CSS properties** logically.

```css
/* Good */
.equipment-card {
  /* Positioning */
  position: relative;

  /* Box model */
  display: flex;
  margin: 10px;
  padding: 15px;

  /* Visual properties */
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 4px;

  /* Typography */
  font-size: 14px;
  color: #333;
}

.equipment-card__title {
  font-weight: bold;
  margin-bottom: 8px;
}

.equipment-card--highlighted {
  border-color: #007bff;
  background-color: #f0f7ff;
}
```

## Testing

1. **Write tests** for all new features.
2. **Name tests** clearly, indicating what is being tested and under what conditions.
3. **Use fixtures** for common setups.
4. **Follow the AAA pattern** (Arrange, Act, Assert).

```python
async def test_get_equipment_by_id_returns_equipment_when_exists(db_session):
    # Arrange
    equipment_data = {
        'name': 'Test Equipment',
        'serial_number': 'SN12345',
        'status': EquipmentStatus.AVAILABLE,
    }
    equipment = models.Equipment(**equipment_data)
    db_session.add(equipment)
    await db_session.commit()

    repository = EquipmentRepository(db_session)

    # Act
    result = await repository.get_by_id(equipment.id)

    # Assert
    assert result is not None
    assert result.id == equipment.id
    assert result.name == equipment_data['name']
    assert result.serial_number == equipment_data['serial_number']
    assert result.status == equipment_data['status']
```

## Git and Version Control

1. **Follow commit conventions:**

   ```text
   type: subject

   body
   ```

   where type is one of: feat, fix, docs, style, refactor, perf, test, chore

2. **Write informative commit messages:**
   - Use imperative mood: "add" instead of "added"
   - Start with lowercase letter
   - Don't put a period at the end
   - Maximum 72 characters

3. **Use branches:**
   - `feature/`: for new features
   - `bugfix/`: for bug fixes
   - `refactor/`: for code refactoring
   - `docs/`: for documentation
   - `test/`: for adding tests

## Code Organization

1. **Follow architectural patterns** of the project:
   - Multi-layered architecture
   - Repository pattern
   - Service layer pattern
   - Dependency injection
   - Data Transfer Objects (DTO) with Pydantic

2. **Place code in appropriate directories:**
   - API endpoints in `backend/api/`
   - Business logic in `backend/services/`
   - Repositories in `backend/repositories/`
   - Models in `backend/models/`
   - Schemas in `backend/schemas/`
