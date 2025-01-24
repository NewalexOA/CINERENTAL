-- Equipment queries

-- Get all available equipment with category info
SELECT e.*, c.name as category_name
FROM equipment e
JOIN categories c ON e.category_id = c.id
WHERE e.status = 'available'
  AND e.deleted_at IS NULL
ORDER BY e.name;

-- Get equipment with specific barcode
SELECT e.*, c.name as category_name
FROM equipment e
JOIN categories c ON e.category_id = c.id
WHERE e.barcode = :barcode
  AND e.deleted_at IS NULL;

-- Get equipment availability for date range
SELECT e.*
FROM equipment e
LEFT JOIN bookings b ON e.id = b.equipment_id
  AND b.start_date <= :end_date
  AND b.end_date >= :start_date
  AND b.status != 'cancelled'
WHERE e.deleted_at IS NULL
  AND b.id IS NULL;

-- Categories queries

-- Get category tree
WITH RECURSIVE category_tree AS (
  -- Base case: root categories
  SELECT c.*, 0 as level, c.name::text as path
  FROM categories c
  WHERE c.parent_id IS NULL
    AND c.deleted_at IS NULL

  UNION ALL

  -- Recursive case: child categories
  SELECT c.*, ct.level + 1, ct.path || ' > ' || c.name
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
  WHERE c.deleted_at IS NULL
)
SELECT * FROM category_tree
ORDER BY path;

-- Get category with all equipment
SELECT c.*, json_agg(e.*) as equipment
FROM categories c
LEFT JOIN equipment e ON c.id = e.category_id
  AND e.deleted_at IS NULL
WHERE c.id = :category_id
  AND c.deleted_at IS NULL
GROUP BY c.id;

-- Clients queries

-- Get client with active bookings
SELECT c.*, json_agg(b.*) as active_bookings
FROM clients c
LEFT JOIN bookings b ON c.id = b.client_id
  AND b.status IN ('pending', 'active')
  AND b.deleted_at IS NULL
WHERE c.id = :client_id
  AND c.deleted_at IS NULL
GROUP BY c.id;

-- Get clients with overdue bookings
SELECT c.*, b.*
FROM clients c
JOIN bookings b ON c.id = b.client_id
WHERE b.end_date < CURRENT_DATE
  AND b.status = 'active'
  AND b.deleted_at IS NULL
  AND c.deleted_at IS NULL
ORDER BY b.end_date;

-- Bookings queries

-- Get active bookings for period
SELECT b.*, c.name as client_name, 
       json_agg(e.*) as equipment
FROM bookings b
JOIN clients c ON b.client_id = c.id
JOIN booking_equipment be ON b.id = be.booking_id
JOIN equipment e ON be.equipment_id = e.id
WHERE b.start_date <= :end_date
  AND b.end_date >= :start_date
  AND b.status = 'active'
  AND b.deleted_at IS NULL
GROUP BY b.id, c.name
ORDER BY b.start_date;

-- Get booking details with all related info
SELECT b.*, 
       c.name as client_name,
       c.phone as client_phone,
       c.email as client_email,
       json_agg(
         json_build_object(
           'equipment', e.*,
           'category', cat.name
         )
       ) as equipment
FROM bookings b
JOIN clients c ON b.client_id = c.id
JOIN booking_equipment be ON b.id = be.booking_id
JOIN equipment e ON be.equipment_id = e.id
JOIN categories cat ON e.category_id = cat.id
WHERE b.id = :booking_id
  AND b.deleted_at IS NULL
GROUP BY b.id, c.name, c.phone, c.email;

-- Documents queries

-- Get all documents for booking
SELECT d.*, b.start_date, b.end_date,
       c.name as client_name
FROM documents d
JOIN bookings b ON d.booking_id = b.id
JOIN clients c ON b.client_id = c.id
WHERE d.booking_id = :booking_id
  AND d.deleted_at IS NULL
ORDER BY d.created_at;

-- Get documents by type for period
SELECT d.*, b.start_date, b.end_date,
       c.name as client_name
FROM documents d
JOIN bookings b ON d.booking_id = b.id
JOIN clients c ON b.client_id = c.id
WHERE d.type = :document_type
  AND d.created_at BETWEEN :start_date AND :end_date
  AND d.deleted_at IS NULL
ORDER BY d.created_at; 