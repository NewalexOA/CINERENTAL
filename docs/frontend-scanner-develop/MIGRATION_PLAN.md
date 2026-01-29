# Scanner Page Migration Plan - React Implementation

## Summary

Migrate the legacy Scanner page to React while **preserving the existing workflow** but adding **modern UI polish**.

**Approach**: Same business logic and UX flow, modernized presentation layer.

---

## What Stays the Same (from Legacy)

| Feature | Legacy Behavior | Keep? |
|---------|----------------|-------|
| HID scanner detection | Keyboard events, 20ms threshold | Yes |
| Explicit session creation | Must create/load before scanning | Yes |
| Session in localStorage | Primary storage + server sync | Yes |
| Simple table for items | Table with +/- buttons | Yes |
| Duplicate detection | Serial: block, Non-serial: increment qty | Yes |
| Auto-sync 60s interval | Background sync when dirty | Yes |
| Equipment status update | Modal to change status | Yes |
| Equipment history view | Timeline + bookings tabs | Yes |
| Create project from session | Convert items -> new project | Yes |

---

## What Gets Modernized

### 1. Modals -> Slide-over Panels

**Legacy**: 6 blocking modals

- newSessionModal
- loadSessionModal
- renameSessionModal
- manageSessionsModal
- updateStatusModal
- historyModal

**Modern**: Slide-over panels (shadcn/ui Sheet)

- Session management -> Right slide-over
- Equipment details/history -> Right slide-over
- Status update -> Bottom sheet (small)

**Benefits**: Non-blocking, maintains context, feels more app-like

---

### 2. Scan Feedback System

**Legacy**: Toast notifications only

**Modern**: Multi-modal feedback

```typescript
// Success scan
- Green pulse animation on scan result card
- Optional "beep" sound (Web Audio API)
- Toast: "Equipment added"

// Duplicate scan (serialized)
- Yellow highlight on existing row in table
- Shake animation
- Toast: "Already in session"

// Quantity increment (non-serialized)
- Blue pulse on quantity badge
- Toast: "Quantity updated"

// Error (not found)
- Red flash on scanner area
- Error sound
- Inline error message (auto-dismiss)
```

---

### 3. Keyboard Shortcuts

```typescript
const shortcuts = {
  'ctrl+n': 'New session',
  'ctrl+l': 'Load session',
  'ctrl+s': 'Sync to server',
  'ctrl+p': 'Create project from session',
  'escape': 'Clear scan result / Close panel',
};
```

---

### 4. Better Visual States

**Session Status Indicators**:

- Synced with server (green)
- Has unsynced changes / dirty (yellow)
- Sync error (red)
- Local only / never synced (gray)

**Scanner Status**:

- Active: Pulsing indicator
- Inactive: Gray indicator
- Error: Red indicator with message

---

### 5. Search Improvements

**Legacy**: Basic text filter with counter

**Modern**:

- Debounced search (300ms) - keep
- Highlight matches in table - keep
- Add: Cmd+F to focus search
- Add: Clear button with animation

---

### 6. Animations & Transitions

Using Framer Motion:

- Slide-over panel enter/exit
- Table row add/remove (fade + slide)
- Quantity change (scale pulse)
- Scan result card (fade in)
- Loading states (skeleton)

---

## File Structure

```text
frontend-react/src/
├── features/
│   └── scanner/
│       ├── components/
│       │   ├── ScannerPage.tsx              # Main page layout
│       │   ├── ScanResult/
│       │   │   ├── ScanResultCard.tsx       # Last scanned equipment
│       │   │   └── ScanResultSkeleton.tsx   # Loading state
│       │   ├── ScanSession/
│       │   │   ├── SessionHeader.tsx        # Name, item count, actions
│       │   │   ├── SessionTable.tsx         # Equipment table
│       │   │   ├── SessionTableRow.tsx      # Single row with controls
│       │   │   ├── SessionSearch.tsx        # Search input + counter
│       │   │   └── SessionEmptyState.tsx    # No session / no items
│       │   ├── ScanHistory/
│       │   │   └── ScanHistoryFeed.tsx      # Chronological list
│       │   ├── ScannerInfo/
│       │   │   └── ScannerStatusCard.tsx    # Scanner status + errors
│       │   ├── QuickActions/
│       │   │   └── QuickActionsCard.tsx     # Update status, view history
│       │   └── Panels/
│       │       ├── SessionManagementPanel.tsx   # Slide-over: manage sessions
│       │       ├── EquipmentHistoryPanel.tsx    # Slide-over: timeline + bookings
│       │       └── StatusUpdateSheet.tsx        # Bottom sheet: status change
│       ├── hooks/
│       │   ├── useBarcodeScanner.ts         # HID scanner detection
│       │   ├── useScanSession.ts            # localStorage CRUD
│       │   ├── useSessionSync.ts            # Server sync logic
│       │   ├── useScanFeedback.ts           # Sound + visual feedback
│       │   └── useKeyboardShortcuts.ts      # Shortcut handler
│       ├── api/
│       │   ├── scanSessionsApi.ts           # TanStack Query mutations
│       │   └── equipmentApi.ts              # Barcode lookup, status, history
│       ├── utils/
│       │   ├── sessionStorage.ts            # localStorage helpers
│       │   ├── barcodeValidator.ts          # Validation regex
│       │   └── feedbackSounds.ts            # Web Audio helpers
│       └── types/
│           └── scanner.types.ts             # TypeScript interfaces
```

---

## Component Details

### ScannerPage.tsx (Main Layout)

```tsx
// Two-column layout matching legacy
<div className="grid grid-cols-12 gap-6">
  {/* Left: 8 cols */}
  <div className="col-span-8 space-y-6">
    <ScanResultCard />
    <ScanSessionCard />
    <ScanHistoryCard />
  </div>

  {/* Right: 4 cols */}
  <div className="col-span-4 space-y-6">
    <ScannerStatusCard />
    <QuickActionsCard />
  </div>
</div>

{/* Slide-over panels */}
<SessionManagementPanel />
<EquipmentHistoryPanel />
<StatusUpdateSheet />
```

---

### useBarcodeScanner.ts (Core Hook)

```typescript
interface UseBarcodeScanner {
  isActive: boolean;
  start: () => void;
  stop: () => void;
  lastScan: Equipment | null;
  error: Error | null;
}

// Port existing logic:
// - 20ms threshold for rapid keystrokes
// - Buffer accumulation until Enter
// - Validation: /^[A-Za-z0-9.\-]+$/, min 3 chars
// - API call: GET /api/v1/equipment/barcode/{barcode}
```

---

### useScanSession.ts (Session Management)

```typescript
interface ScanSession {
  id: string;                    // "local_timestamp"
  name: string;
  items: SessionItem[];
  updatedAt: string;             // ISO timestamp
  syncedWithServer: boolean;
  serverSessionId: number | null;
  dirty: boolean;
}

interface SessionItem {
  equipment_id: number;
  name: string;
  barcode: string;
  serial_number: string | null;
  category_id: number | null;
  category_name: string;
  quantity: number;              // 1 for serialized, >=1 for non-serialized
}

// Methods to implement:
// - getSessions(): ScanSession[]
// - getActiveSession(): ScanSession | null
// - createSession(name: string): ScanSession
// - addEquipment(sessionId, equipment): 'added' | 'incremented' | 'duplicate'
// - removeEquipment(sessionId, equipmentId): void
// - decrementQuantity(sessionId, equipmentId): void
// - clearSession(sessionId): void
// - deleteSession(sessionId): void
// - renameSession(sessionId, name): void
```

---

### useSessionSync.ts (Server Sync)

```typescript
// Sync logic:
// 1. Check if session.dirty === true
// 2. If serverSessionId exists -> PUT /api/v1/scan-sessions/{id}
// 3. If new session -> POST /api/v1/scan-sessions/
// 4. On success -> mark session as clean

// Auto-sync:
// - useInterval(60000) when session is dirty
// - Manual sync button
// - Sync on page unload (beforeunload)
```

---

## API Endpoints (TanStack Query)

```typescript
// Equipment
useEquipmentByBarcode(barcode: string)
useMutateEquipmentStatus()
useEquipmentTimeline(equipmentId: number)
useEquipmentBookings(equipmentId: number)

// Scan Sessions
useScanSessions(userId: number)
useScanSession(sessionId: number)
useCreateScanSession()
useUpdateScanSession()
useDeleteScanSession()
useCleanExpiredSessions()
```

---

## Implementation Order

### Phase 1: Core Infrastructure

1. Create file structure
2. Define TypeScript types
3. Implement `useBarcodeScanner` hook (port from legacy)
4. Implement `useScanSession` hook (localStorage)
5. Set up TanStack Query API hooks

### Phase 2: Basic UI Components

6. `ScannerPage` layout
7. `ScanResultCard` component
8. `SessionHeader` + `SessionTable` + `SessionTableRow`
9. `SessionSearch` with highlighting
10. `SessionEmptyState` states
11. `ScanHistoryFeed` component
12. `ScannerStatusCard` component
13. `QuickActionsCard` component

### Phase 3: Panels & Interactions

14. `SessionManagementPanel` (slide-over)
15. `EquipmentHistoryPanel` (slide-over)
16. `StatusUpdateSheet` (bottom sheet)
17. Implement `useSessionSync` hook
18. Add auto-sync interval

### Phase 4: Polish & Modern UX

19. `useScanFeedback` hook (sounds + animations)
20. `useKeyboardShortcuts` hook
21. Add Framer Motion animations
22. Sync status indicators
23. Error handling & recovery

### Phase 5: Testing & Verification

24. Manual testing with HID scanner
25. Test all session operations
26. Test sync scenarios (online/offline)
27. Test keyboard shortcuts
28. Cross-browser testing

---

## Verification Checklist

### Functional Testing

- [ ] HID scanner detects rapid keystrokes and triggers lookup
- [ ] Equipment lookup by barcode works
- [ ] Session CRUD operations work (create, rename, delete, clear)
- [ ] Duplicate detection works (serialized vs non-serialized)
- [ ] Quantity increment/decrement works
- [ ] Search filters items correctly
- [ ] Auto-sync fires every 60s when dirty
- [ ] Manual sync works
- [ ] Create project from session redirects correctly
- [ ] Equipment status update works
- [ ] Equipment history shows timeline + bookings

### UX Testing

- [ ] Slide-over panels open/close smoothly
- [ ] Scan feedback (visual) triggers on scan
- [ ] Sound feedback works (if enabled)
- [ ] Keyboard shortcuts work
- [ ] Animations are smooth
- [ ] Loading states display correctly
- [ ] Error states display correctly

### Edge Cases

- [ ] Scanning when no session -> prompts to create
- [ ] Scanning invalid barcode -> shows error
- [ ] Scanning non-existent barcode -> shows "not found"
- [ ] Offline sync -> queues and retries
- [ ] Session with 100+ items -> performance OK

---

## Dependencies to Add

```json
{
  "dependencies": {
    "framer-motion": "^11.x",
    "use-sound": "^4.x"
  }
}
```

Note: Most deps already exist (shadcn/ui Sheet, TanStack Query, etc.)

---

## Key Files to Reference (Legacy)

| Purpose | Legacy File |
|---------|-------------|
| Page template | `frontend/templates/scanner.html` |
| Main JS logic | `frontend/static/js/scanner.js` |
| Session storage | `frontend/static/js/scan-storage.js` |
| HID scanner class | `frontend/static/js/main.js:104-292` |
| Search module | `frontend/static/js/scanner/session-search.js` |
| Styles | `frontend/static/css/scanner.css` |
