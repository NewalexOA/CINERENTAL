import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../../components/ui/collapsible';

// StatusGroup is a local (non-exported) component inside ProjectsPage.tsx.
// It is a thin, controlled wrapper around the Radix Collapsible primitive:
//
//   <Collapsible open={isOpen} onOpenChange={onOpenChange}>
//     <CollapsibleTrigger asChild>...</CollapsibleTrigger>
//     <CollapsibleContent>...project cards...</CollapsibleContent>
//   </Collapsible>
//
// Rather than testing the private component directly (which would require
// exporting it and changing production code), we test the Collapsible
// pattern that StatusGroup relies on. These tests give us confidence that
// the controlled open/close behaviour and the onOpenChange callback work
// as expected within jsdom.

describe('StatusGroup — Collapsible controlled behavior', () => {
  // Test 1: When isOpen=true the CollapsibleContent is visible
  it('renders content when open prop is true', () => {
    render(
      <Collapsible open={true} onOpenChange={vi.fn()}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>
          <div>Project list content</div>
        </CollapsibleContent>
      </Collapsible>,
    );

    // When open=true Radix renders the content into the DOM and it is visible.
    expect(screen.getByText('Project list content')).toBeInTheDocument();
  });

  // Test 2: When isOpen=false the CollapsibleContent is hidden
  it('does not render content when open prop is false', () => {
    render(
      <Collapsible open={false} onOpenChange={vi.fn()}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>
          <div>Project list content</div>
        </CollapsibleContent>
      </Collapsible>,
    );

    // When closed, Radix either removes the content from the DOM or hides it.
    // We assert it is not visible to the user.
    expect(screen.queryByText('Project list content')).not.toBeInTheDocument();
  });

  // Test 3: Clicking the trigger fires the onOpenChange callback
  it('calls onOpenChange when the trigger is clicked', () => {
    const onOpenChange = vi.fn();

    render(
      <Collapsible open={false} onOpenChange={onOpenChange}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>
          <div>Project list content</div>
        </CollapsibleContent>
      </Collapsible>,
    );

    fireEvent.click(screen.getByText('Toggle'));

    // onOpenChange should be called with true (requesting to open)
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
