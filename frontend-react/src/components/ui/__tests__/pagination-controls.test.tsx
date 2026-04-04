import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaginationControls } from '../pagination-controls';

// Usage example:
// <PaginationControls
//   currentPage={1} totalPages={5} pageSize={20} totalItems={100}
//   onPageChange={fn} onPageSizeChange={fn}
// />

function renderPagination(overrides: Partial<Parameters<typeof PaginationControls>[0]> = {}) {
  const defaults = {
    currentPage: 1,
    totalPages: 5,
    pageSize: 20,
    totalItems: 100,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  render(<PaginationControls {...props} />);
  return props;
}

describe('PaginationControls', () => {
  // Test 1: Page size change does NOT call onPageChange
  // This is the most important test — it verifies that the refactoring removed
  // the `onPageChange(1)` call from inside the component's onValueChange handler.
  // The onValueChange handler now only calls `onPageSizeChange(Number(val))`.
  //
  // Radix UI Select uses pointer capture APIs that jsdom does not implement
  // (target.hasPointerCapture). We work around this by polyfilling the missing
  // method on the trigger element before dispatching events, and by using
  // fireEvent (which bypasses pointer capture checks) instead of userEvent.
  it('page size change calls onPageSizeChange but NOT onPageChange', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <PaginationControls
        currentPage={1}
        totalPages={5}
        pageSize={20}
        totalItems={100}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    const trigger = screen.getByRole('combobox');

    // jsdom does not implement the Pointer Events API used by Radix UI Select
    // internally (hasPointerCapture / releasePointerCapture). Polyfill them on
    // the trigger element so the event handlers do not throw.
    if (!trigger.hasPointerCapture) {
      trigger.hasPointerCapture = () => false;
    }
    if (!trigger.releasePointerCapture) {
      trigger.releasePointerCapture = () => undefined;
    }

    // Open the dropdown via a low-level pointer-down + click sequence.
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    // After opening, Radix renders the listbox into a portal in document.body.
    const option50 = screen.getByRole('option', { name: '50' });
    fireEvent.click(option50);

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
    // CRITICAL: onPageChange must NOT have been called — the component no longer
    // calls onPageChange(1) internally when the page size changes.
    expect(onPageChange).not.toHaveBeenCalled();
  });

  // Test 2: Navigate forward
  it('clicking forward button calls onPageChange with next page', () => {
    const props = renderPagination({ currentPage: 2, totalPages: 5 });

    // ChevronRight button — second icon button
    const buttons = screen.getAllByRole('button');
    const forwardButton = buttons[buttons.length - 1];
    fireEvent.click(forwardButton);

    expect(props.onPageChange).toHaveBeenCalledWith(3);
  });

  // Test 3: Navigate backward
  it('clicking back button calls onPageChange with previous page', () => {
    const props = renderPagination({ currentPage: 3, totalPages: 5 });

    // ChevronLeft button — second-to-last icon button (after the Select trigger)
    const buttons = screen.getAllByRole('button');
    // The back button is the second-to-last button (before the forward button)
    const backButton = buttons[buttons.length - 2];
    fireEvent.click(backButton);

    expect(props.onPageChange).toHaveBeenCalledWith(2);
  });

  // Test 4: Back button is disabled on first page
  it('back button is disabled when on the first page', () => {
    renderPagination({ currentPage: 1, totalPages: 5 });

    const buttons = screen.getAllByRole('button');
    const backButton = buttons[buttons.length - 2];

    expect(backButton).toBeDisabled();
  });

  // Test 5: Forward button is disabled on last page
  it('forward button is disabled when on the last page', () => {
    renderPagination({ currentPage: 5, totalPages: 5 });

    const buttons = screen.getAllByRole('button');
    const forwardButton = buttons[buttons.length - 1];

    expect(forwardButton).toBeDisabled();
  });

  // Test 6: Display info shows correct totals and page info
  it('displays total items and current page information', () => {
    renderPagination({ currentPage: 2, totalPages: 5, totalItems: 100 });

    expect(screen.getByText('Всего: 100')).toBeInTheDocument();
    expect(screen.getByText('Стр. 2 из 5')).toBeInTheDocument();
  });
});
