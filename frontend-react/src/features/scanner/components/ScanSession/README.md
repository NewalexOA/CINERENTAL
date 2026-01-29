# ScanSession Components

Session management UI components for the Scanner feature.

## Components

### SessionHeader
Header for session card displaying metadata, sync status, and action buttons.

**Props:**
- `sessionName` - Current session name
- `itemCount` - Number of items in session
- `syncStatus` - Sync status: 'synced' | 'dirty' | 'error' | 'local_only'
- `onNewSession` - Create new session handler
- `onLoadSession` - Load session handler
- `onManageSessions` - Open sessions manager
- `onRenameSession` - Rename session handler
- `onSync` - Manual sync trigger
- `isSyncing?` - Shows loading state

**Features:**
- Color-coded sync status indicators:
  - Green dot: Synced
  - Yellow dot: Unsaved changes
  - Red dot: Sync failed
  - Gray dot: Local only
- Item count badge
- Action buttons with icons

### SessionSearch
Search input with debounce and item counter.

**Props:**
- `value` - Controlled search value
- `onChange` - Search change handler (debounced)
- `totalCount` - Total number of items
- `filteredCount` - Number of filtered items

**Features:**
- 300ms debounce on input
- Cmd+F / Ctrl+F keyboard shortcut to focus
- Clear button when has value
- Smart counter display

### SessionTable
Table displaying all session items with search highlighting.

**Props:**
- `items` - Array of SessionItem
- `searchTerm?` - Current search term for highlighting
- `onRemoveItem` - Remove item handler (equipmentId, serialNumber?)
- `onIncrementQuantity` - Increment non-serialized item quantity
- `onDecrementQuantity` - Decrement non-serialized item quantity
- `onItemClick?` - Item click handler for details

**Features:**
- Columns: Name, Category, Barcode, Serial#, Qty, Actions
- Animated rows with framer-motion
- Search term highlighting in yellow

### SessionTableRow
Single row in session table with quantity controls.

**Props:**
- `item` - SessionItem to display
- `searchTerm?` - Highlight matching text
- `onRemove` - Remove handler
- `onIncrement?` - Increment quantity (non-serialized only)
- `onDecrement?` - Decrement quantity (non-serialized only)
- `onClick?` - Row click handler

**Features:**
- **Serialized items** (with serial_number): Only remove button
- **Non-serialized items**: +/- quantity controls, remove when qty=1
- Search highlighting with `<mark>` tags
- Smooth animations on mount/unmount
- Click-through prevention on action buttons

### SessionEmptyState
Empty state displays for different scenarios.

**Props:**
- `type` - 'no_session' | 'no_items'
- `onCreateSession?` - Handler for "Create Session" button

**States:**
- `no_session`: Shows when no active session with create button
- `no_items`: Shows when session exists but is empty

## Usage Example

```tsx
import {
  SessionHeader,
  SessionSearch,
  SessionTable,
  SessionEmptyState,
} from '@/features/scanner/components/ScanSession';
import { SessionItem, SyncStatus } from '@/features/scanner/types/scanner.types';

function ScannerSessionPanel() {
  const [session, setSession] = useState<ScanSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter items by search term
  const filteredItems = useMemo(() => {
    if (!session || !searchTerm) return session?.items || [];

    const term = searchTerm.toLowerCase();
    return session.items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.barcode.toLowerCase().includes(term) ||
        item.category_name.toLowerCase().includes(term) ||
        item.serial_number?.toLowerCase().includes(term)
    );
  }, [session, searchTerm]);

  // Calculate sync status
  const syncStatus: SyncStatus = useMemo(() => {
    if (!session) return 'local_only';
    if (session.dirty) return 'dirty';
    if (session.syncedWithServer) return 'synced';
    return 'local_only';
  }, [session]);

  const handleRemoveItem = (equipmentId: number, serialNumber?: string) => {
    // Remove logic
  };

  const handleIncrementQuantity = (equipmentId: number) => {
    // Increment logic
  };

  const handleDecrementQuantity = (equipmentId: number) => {
    // Decrement logic
  };

  const handleSync = async () => {
    setIsSyncing(true);
    // Sync logic
    setIsSyncing(false);
  };

  if (!session) {
    return <SessionEmptyState type="no_session" onCreateSession={handleCreateSession} />;
  }

  return (
    <div className="flex flex-col h-full">
      <SessionHeader
        sessionName={session.name}
        itemCount={session.items.length}
        syncStatus={syncStatus}
        onNewSession={handleNewSession}
        onLoadSession={handleLoadSession}
        onManageSessions={handleManageSessions}
        onRenameSession={handleRenameSession}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      <SessionSearch
        value={searchTerm}
        onChange={setSearchTerm}
        totalCount={session.items.length}
        filteredCount={filteredItems.length}
      />

      <div className="flex-1 overflow-auto p-4">
        {session.items.length === 0 ? (
          <SessionEmptyState type="no_items" />
        ) : (
          <SessionTable
            items={filteredItems}
            searchTerm={searchTerm}
            onRemoveItem={handleRemoveItem}
            onIncrementQuantity={handleIncrementQuantity}
            onDecrementQuantity={handleDecrementQuantity}
            onItemClick={handleItemClick}
          />
        )}
      </div>
    </div>
  );
}
```

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all controls
- **ARIA Labels**: Proper button titles and labels
- **Focus Management**: Cmd+F / Ctrl+F focuses search input
- **Color Contrast**: Meets WCAG AA standards
- **Screen Reader**: Semantic HTML and proper table structure

## Performance Optimizations

- **Debounced Search**: 300ms delay prevents excessive filtering
- **AnimatePresence**: Efficient framer-motion animations
- **Memoization**: Filter computation only when search/items change
- **Click Prevention**: stopPropagation on action buttons
- **Lazy Loading**: Use with virtualization for 1000+ items

## Search Highlighting

The `highlightText` function in `SessionTableRow` highlights matching search terms:

```tsx
// Input: "Canon EOS 5D", search: "eos"
// Output: "Canon <mark>EOS</mark> 5D"
```

Highlighted text uses:
- `bg-yellow-200` background
- `text-black` foreground
- `rounded px-0.5` styling

## Animation Details

Row animations use framer-motion:
- **Enter**: Fade in + slide down from y: -10
- **Exit**: Fade out + slide left to x: -100
- **Duration**: 200ms
- **Layout**: Smooth position changes when items reorder

## Component Architecture

```
SessionHeader
  ├─ Session metadata (name, count, status)
  └─ Action buttons (New, Load, Manage, Sync)

SessionSearch
  ├─ Search input with icon
  ├─ Clear button
  └─ Item counter

SessionTable
  ├─ Table structure
  └─ SessionTableRow (repeated)
      ├─ Item data with highlighting
      ├─ Quantity controls (non-serialized)
      └─ Remove button

SessionEmptyState
  ├─ Icon
  ├─ Message
  └─ Action button (optional)
```

## File Locations

- `/Users/anaskin/Github/CINERENTAL/frontend-react/src/features/scanner/components/ScanSession/SessionHeader.tsx`
- `/Users/anaskin/Github/CINERENTAL/frontend-react/src/features/scanner/components/ScanSession/SessionSearch.tsx`
- `/Users/anaskin/Github/CINERENTAL/frontend-react/src/features/scanner/components/ScanSession/SessionTable.tsx`
- `/Users/anaskin/Github/CINERENTAL/frontend-react/src/features/scanner/components/ScanSession/SessionTableRow.tsx`
- `/Users/anaskin/Github/CINERENTAL/frontend-react/src/features/scanner/components/ScanSession/SessionEmptyState.tsx`
- `/Users/anaskin/Github/CINERENTAL/frontend-react/src/features/scanner/components/ScanSession/index.ts`
