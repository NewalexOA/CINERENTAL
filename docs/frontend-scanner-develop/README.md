# Scanner Page - Frontend Migration Documentation

This folder contains documentation for migrating the Scanner page from legacy Vanilla JS to React.

## Documents

| Document | Description |
| -------- | ----------- |
| [MIGRATION_PLAN.md](MIGRATION_PLAN.md) | Implementation plan with file structure, components, and phases |
| [LEGACY_ANALYSIS.md](LEGACY_ANALYSIS.md) | Complete analysis of existing implementation and business logic |

## Quick Reference

### Key Business Rules

1. **Duplicate Detection**:
   - Serialized items (with S/N): Block exact duplicates
   - Non-serialized items: Increment quantity on rescan

2. **Session Lifecycle**:
   - Created locally in localStorage
   - Auto-sync every 60 seconds if dirty
   - Server sessions expire after 7 days

3. **HID Scanner Detection**:
   - 20ms threshold between keystrokes
   - Enter key triggers processing
   - Validation: `/^[A-Za-z0-9.\-]+$/`, min 3 chars

### Modernizations Planned

- Modals -> Slide-over panels
- Toast-only feedback -> Multi-modal feedback (visual + sound)
- No shortcuts -> Keyboard shortcuts (Ctrl+N, Ctrl+S, etc.)
- Static UI -> Framer Motion animations

### Implementation Scope

- 28 tasks across 5 phases
- Same workflow as legacy, modernized presentation
- HID scanner only (no camera)
- Simple table (no drag & drop)
