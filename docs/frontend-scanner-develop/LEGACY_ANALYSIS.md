# Legacy Scanner Page - Complete Analysis

This document provides a comprehensive analysis of the legacy scanner page implementation for reference during React migration.

## Page Structure & Layout

**Template**: `frontend/templates/scanner.html`

**Layout**: Two-column Bootstrap grid (8:4 ratio)

### Left Column (8 cols) - Main Working Area

1. **Scan Result Card**
   - Shows last scanned equipment details
   - Fields: name, category, barcode, serial number, cost, status
   - Link to equipment details page

2. **Current Scanning Session Card**
   - Session name + item count badge
   - Action buttons: New, Load, Manage sessions
   - Search input with counters
   - Equipment table with controls
   - Bottom buttons: Sync, Create Project

3. **Scan History Card**
   - Chronological list of all scans in current session
   - Shows name, category, timestamp

### Right Column (4 cols) - Info & Actions

1. **Scanner Status Card**
   - Scanner image/icon
   - Instructions text
   - Error display area with recommendations

2. **Quick Actions Card**
   - Update Status button (disabled until scan)
   - View History button (disabled until scan)

---

## Core Business Logic

### HID Barcode Scanner Detection

**Source**: `frontend/static/js/main.js:104-292`

```javascript
class BarcodeScanner {
    THRESHOLD = 20; // Max ms between keystrokes for scanner detection

    handleKeyPress(event) {
        const currentTime = new Date().getTime();

        // Reset buffer if >500ms since last keystroke
        if (currentTime - this.lastTime > 500) {
            this.buffer = '';
        }

        // Check if rapid succession (likely from scanner)
        const isScanner = currentTime - this.lastTime <= this.THRESHOLD;
        this.lastTime = currentTime;

        // On Enter + buffer content -> process
        if (event.key === 'Enter' && this.buffer.length > 0) {
            if (isScanner || this.buffer.length >= 8) {
                event.preventDefault();
                const barcode = this.buffer;
                this.buffer = '';

                if (this.isValidBarcode(barcode)) {
                    this.processBarcode(barcode);
                }
            }
        } else {
            this.buffer += event.key;
        }
    }

    isValidBarcode(barcode) {
        // Alphanumeric + hyphen + dot, min 3 chars
        return barcode && barcode.length >= 3 && /^[A-Za-z0-9.\-]+$/.test(barcode);
    }
}
```

### Session Management

**Source**: `frontend/static/js/scan-storage.js`

**Storage Keys**:

- `equipment_scan_sessions` - all sessions array
- `equipment_scan_sessions_active` - active session ID

**Session Data Structure**:

```javascript
{
    id: "local_1234567890",        // Local ID with timestamp
    name: "Session Name",
    items: [{
        equipment_id: number,
        name: string,
        barcode: string,
        serial_number: string | null,
        category_id: number | null,
        category_name: string,
        quantity: number            // Only for non-serialized
    }],
    updatedAt: ISO timestamp,
    syncedWithServer: boolean,
    serverSessionId: number | null,
    dirty: boolean,                 // Has unsynced changes
    createdAt: ISO timestamp
}
```

### Equipment Addition Logic (Critical Business Rule)

**Source**: `frontend/static/js/scan-storage.js:112-198`

```javascript
addEquipment(sessionId, equipment) {
    const hasSerialNumber = !!normalizedEquipment.serial_number;

    if (hasSerialNumber) {
        // Check for SAME equipment_id AND SAME serial_number
        const duplicateItem = sessionItems.find(
            item => item.equipment_id === equipmentId &&
                    item.serial_number === normalizedEquipment.serial_number
        );

        if (duplicateItem) {
            return 'duplicate_serial_exists';  // Block duplicate
        } else {
            sessionItems.push(normalizedEquipment);
            return 'item_added';
        }
    } else {
        // For non-serialized: find by ID without serial
        const existingItem = sessionItems.find(
            item => item.equipment_id === equipmentId && !item.serial_number
        );

        if (existingItem) {
            existingItem.quantity += 1;
            return 'quantity_incremented';
        } else {
            sessionItems.push(normalizedEquipment);
            return 'item_added';
        }
    }
}
```

| Equipment Type | Existing in Session? | Action |
|----------------|---------------------|--------|
| With Serial Number | Same ID + Same S/N exists | Return `duplicate_serial_exists` (block) |
| With Serial Number | Not exists | Add as new item |
| Without Serial Number | Same ID exists (no S/N) | Increment quantity |
| Without Serial Number | Not exists | Add with quantity = 1 |

---

## Session Operations

### Create Session

```javascript
createSession(name) {
    const newSession = {
        id: `local_${Date.now()}`,
        name,
        items: [],
        updatedAt: new Date().toISOString(),
        syncedWithServer: false,
        serverSessionId: null,
        dirty: true
    };
    sessions.push(newSession);
    this.setActiveSession(newSession.id);
    return newSession;
}
```

### Decrement Quantity / Remove

```javascript
decrementQuantity(sessionId, equipmentId) {
    // Only for items WITHOUT serial number
    const item = sessionItems.find(
        item => item.equipment_id === equipmentId && !item.serial_number
    );

    if (item.quantity > 1) {
        item.quantity -= 1;  // Decrement
    } else {
        sessionItems.splice(itemIndex, 1);  // Remove if qty = 1
    }
}
```

### Server Sync

```javascript
async syncSessionWithServer(sessionId) {
    const payload = this.sessionToServerFormat(sessionId);

    if (session.serverSessionId) {
        // Update existing
        await api.put(`/scan-sessions/${session.serverSessionId}`, payload);
    } else {
        // Create new
        const response = await api.post('/scan-sessions/', payload);
        this.updateServerSync(sessionId, response.id);
    }

    this.markSessionAsClean(sessionId);
}
```

---

## Auto-Sync Feature

**Source**: `frontend/static/js/scanner.js:929-975`

```javascript
const AUTO_SYNC_INTERVAL_MS = 60000; // 60 seconds

async function autoSyncActiveSession() {
    const activeSession = scanStorage.getActiveSession();
    if (activeSession && scanStorage.isSessionDirty(activeSession.id)) {
        await scanStorage.syncSessionWithServer(activeSession.id);
    }
}

function startAutoSyncTimer() {
    autoSyncIntervalId = setInterval(autoSyncActiveSession, AUTO_SYNC_INTERVAL_MS);
}
```

---

## Search & Filtering

**Source**: `frontend/static/js/scanner/session-search.js`

### Filter Logic

```javascript
function filterSessionItems(items, query) {
    const searchTerm = query.toLowerCase().trim();

    return items.filter(item => {
        // Search in: name, category_name, serial_number, barcode
        return item.name?.toLowerCase().includes(searchTerm) ||
               item.category_name?.toLowerCase().includes(searchTerm) ||
               item.serial_number?.toLowerCase().includes(searchTerm) ||
               item.barcode?.toLowerCase().includes(searchTerm);
    });
}
```

### Highlight Matches

```javascript
function highlightSearchTerm(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}
```

### Debouncing

- 300ms debounce on search input
- Immediate search on Enter key
- Clear button resets search

---

## UI Components in Table

### Items WITH Serial Number

```html
<button class="btn btn-sm btn-outline-danger remove-item-btn">
    <i class="fas fa-times"></i>
</button>
```

Only remove button (quantity locked to 1).

### Items WITHOUT Serial Number

```html
<div class="btn-group btn-group-sm">
    <!-- Increment button (always shown) -->
    <button class="btn btn-outline-secondary increment-item-btn">
        <i class="fas fa-plus"></i>
    </button>

    <!-- If qty > 1: Decrement button -->
    <button class="btn btn-outline-secondary decrement-item-btn">
        <i class="fas fa-minus"></i>
    </button>

    <!-- If qty = 1: Remove button instead -->
    <button class="btn btn-sm btn-outline-danger remove-item-btn">
        <i class="fas fa-times"></i>
    </button>
</div>
```

---

## Modals

### 1. newSessionModal

- Input: session name
- Action: Create session with name

### 2. loadSessionModal

Two tabs:

- **Local Sessions**: List from localStorage
- **Server Sessions**: List from API (user's sessions)

### 3. renameSessionModal

- Input: new session name
- Action: Update session name

### 4. manageSessionsModal

Table with all local sessions:

- Name, Created, Updated, Items count, Synced status
- Actions: Load, Delete

Additional buttons:

- Refresh list
- Clean expired (7+ days old on server)
- Reset all (delete all local sessions)

### 5. updateStatusModal

- Select: AVAILABLE, MAINTENANCE, BROKEN, RETIRED
- Action: PUT `/api/v1/equipment/{id}/status?status=X`

### 6. historyModal

Two tabs:

- **Status History (Timeline)**: Visual timeline of status changes
- **Booking History**: List of bookings for this equipment

---

## API Endpoints

### Equipment

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/equipment/barcode/{barcode}` | GET | Lookup by barcode |
| `/api/v1/equipment/{id}/status` | PUT | Update status |
| `/api/v1/equipment/{id}/timeline` | GET | Status history |
| `/api/v1/equipment/{id}/bookings` | GET | Booking history |

### Scan Sessions

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/scan-sessions/` | GET | List user sessions |
| `/api/v1/scan-sessions/` | POST | Create session |
| `/api/v1/scan-sessions/{id}` | GET | Get session |
| `/api/v1/scan-sessions/{id}` | PUT | Update session |
| `/api/v1/scan-sessions/{id}` | DELETE | Delete session |
| `/api/v1/scan-sessions/clean-expired` | POST | Clean 7+ day old sessions |

---

## UX Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Page Load                                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Check localStorage for active session                        │
│  2. If exists -> display session with items                      │
│  3. If not -> show "Create New Session" prompt                   │
│  4. Initialize BarcodeScanner listener                           │
│  5. Start auto-sync timer (60s interval)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Barcode Scan                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. HID scanner sends keystrokes rapidly                         │
│  2. Buffer accumulates until Enter                               │
│  3. Validate barcode format                                      │
│  4. API lookup: GET /api/v1/equipment/barcode/{barcode}          │
│  5. Display in "Scan Result" card                                │
│  6. Add to session (with duplicate detection)                    │
│  7. Update session table                                         │
│  8. Show toast notification                                      │
│  9. Add to scan history                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Session Item Management                           │
├─────────────────────────────────────────────────────────────────┤
│  Search: Filter by name/category/serial/barcode                  │
│  Items WITH serial: Remove button only                           │
│  Items WITHOUT serial: +/- buttons for quantity                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Session Actions                               │
├─────────────────────────────────────────────────────────────────┤
│  Sync: POST/PUT to server                                        │
│  Create Project: Convert to project -> redirect                  │
│  Rename: Update session name                                     │
│  Clear: Remove all items                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/templates/scanner.html` | 428 | Jinja2 template |
| `frontend/static/js/scanner.js` | 1357 | Main page logic |
| `frontend/static/js/scan-storage.js` | 603 | localStorage + sync |
| `frontend/static/js/main.js:104-292` | 188 | BarcodeScanner class |
| `frontend/static/js/scanner/session-search.js` | 315 | Search module |
| `frontend/static/css/scanner.css` | 132 | Styles |
| `backend/api/v1/endpoints/scan_sessions.py` | 221 | API endpoints |
| `backend/models/scan_session.py` | 55 | Database model |
| `backend/schemas/scan_session.py` | 66 | Pydantic schemas |
