# Hierarchical Data Loading Architecture

## 🎯 Problem Statement

Foreign Key Constraint Violations when loading hierarchical category data and related equipment from JSON files due to:

1. **Category hierarchy dependencies** - child categories reference parent categories that don't exist yet
2. **ID mapping issues** - equipment references old category IDs that don't match new auto-incremented IDs

## 🏗️ Architectural Solution

### Phase 1: Hierarchical Category Loading

```python
Algorithm: Topological Sort for Category Creation
Input: categories_data (List[Dict])
Output: category_id_mapping (Dict[old_id, new_id])

Steps:
1. Separate categories into levels (root vs child)
2. Create root categories first (parent_id = None)
3. Iteratively create child categories (multiple passes)
4. Build ID mapping for reference updates
5. Return mapping for downstream data processing
```

### Phase 2: Equipment Data ID Translation

```python
Algorithm: Reference ID Update
Input: equipment_data, category_id_mapping
Output: updated_equipment_data

Steps:
1. Iterate through equipment records
2. Translate old category_id to new category_id using mapping
3. Skip equipment with invalid category references
4. Return cleaned equipment data for creation
```

## 🔧 Implementation Components

### 1. Enhanced Category Loader

- **Function**: `load_categories_from_json()`
- **Returns**: `Dict[int, int]` mapping old→new IDs
- **Features**: Topological sort, infinite loop protection, comprehensive logging

### 2. ID Mapping System

- **Purpose**: Translate foreign key references between datasets
- **Scope**: Categories → Equipment (extensible to Projects, Bookings)
- **Error Handling**: Graceful skipping of invalid references

### 3. Data Validation Layer

- **Pre-creation validation**: Check all foreign key constraints
- **Warning system**: Log skipped records with reasons
- **Fallback strategy**: Continue loading valid data

## 📊 Performance Characteristics

- **Time Complexity**: O(n²) worst case, O(n) average case
- **Space Complexity**: O(n) for ID mapping storage
- **Scalability**: Handles arbitrary hierarchy depth
- **Fault Tolerance**: Continues loading despite partial failures

## 🎉 Resolved Issues

✅ **ForeignKeyViolationError for categories** - Fixed through proper ordering
✅ **ForeignKeyViolationError for equipment** - Fixed through ID mapping
✅ **Data integrity** - Maintained through validation layers
✅ **Extensibility** - Pattern applicable to all hierarchical relationships

## 🚀 Future Extensions

1. **Project-Equipment relationships** with date validation
2. **Booking-Equipment relationships** with availability checks
3. **Multi-tenant data loading** with organization isolation
4. **Incremental updates** for production data synchronization

## 📋 Usage Example

```python
# Load categories and get ID mapping
category_mapping = await load_categories_from_json(session, categories_data)

# Update equipment references
for equipment in equipment_data:
    equipment['category_id'] = category_mapping[equipment['category_id']]

# Load updated equipment data
await load_equipment_from_json(session, equipment_data)
```

## 🏆 Architectural Benefits

1. **Reliability**: Eliminates FK constraint violations
2. **Maintainability**: Clear separation of concerns
3. **Debuggability**: Comprehensive logging and error reporting
4. **Extensibility**: Reusable pattern for other hierarchical data
5. **Performance**: Optimized loading with minimal database roundtrips
