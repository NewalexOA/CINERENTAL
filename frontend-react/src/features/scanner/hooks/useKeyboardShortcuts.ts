/**
 * Keyboard shortcuts handler for Scanner page
 * Provides global keyboard shortcuts with proper event handling
 */

import { useEffect, useCallback } from 'react';
import { KeyboardShortcut } from '../types/scanner.types';

interface UseKeyboardShortcutsOptions {
  onNewSession: () => void;
  onLoadSession: () => void;
  onSync: () => void;
  onCreateProject: () => void;
  onClearResult: () => void;
  onFocusSearch: () => void;
  enabled?: boolean;
}

interface UseKeyboardShortcuts {
  shortcuts: KeyboardShortcut[];
}

/**
 * Check if keyboard event target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}

/**
 * Check if event matches shortcut configuration
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  // Check key match (case-insensitive)
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  // Check modifier keys
  if (shortcut.ctrlKey && !(event.ctrlKey || event.metaKey)) {
    return false;
  }

  if (!shortcut.ctrlKey && (event.ctrlKey || event.metaKey)) {
    return false;
  }

  if (shortcut.shiftKey && !event.shiftKey) {
    return false;
  }

  if (!shortcut.shiftKey && event.shiftKey) {
    return false;
  }

  if (shortcut.altKey && !event.altKey) {
    return false;
  }

  if (!shortcut.altKey && event.altKey) {
    return false;
  }

  return true;
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions
): UseKeyboardShortcuts {
  const {
    onNewSession,
    onLoadSession,
    onSync,
    onCreateProject,
    onClearResult,
    onFocusSearch,
    enabled = true,
  } = options;

  // Define shortcuts configuration
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      ctrlKey: true,
      description: 'Create new session',
      action: onNewSession,
    },
    {
      key: 'l',
      ctrlKey: true,
      description: 'Load session',
      action: onLoadSession,
    },
    {
      key: 's',
      ctrlKey: true,
      description: 'Sync to server',
      action: onSync,
    },
    {
      key: 'p',
      ctrlKey: true,
      description: 'Create project from session',
      action: onCreateProject,
    },
    {
      key: 'Escape',
      description: 'Clear scan result / Close panel',
      action: onClearResult,
    },
    {
      key: 'f',
      ctrlKey: true,
      description: 'Focus search input',
      action: onFocusSearch,
    },
  ];

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      // Don't trigger shortcuts when typing in inputs (except Escape and Ctrl+F)
      if (
        isInputElement(event.target) &&
        event.key !== 'Escape' &&
        !(event.key.toLowerCase() === 'f' && (event.ctrlKey || event.metaKey))
      ) {
        return;
      }

      // Find matching shortcut
      const matchedShortcut = shortcuts.find((shortcut) =>
        matchesShortcut(event, shortcut)
      );

      if (matchedShortcut) {
        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();

        // Execute shortcut action
        matchedShortcut.action();
      }
    },
    [enabled, shortcuts]
  );

  // Register global keyboard event listener
  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts,
  };
}

/**
 * Format shortcut for display
 * Converts shortcut config to human-readable string
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  // Detect macOS
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }

  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format key name
  let keyName = shortcut.key;
  if (keyName === 'Escape') {
    keyName = 'Esc';
  } else if (keyName.length === 1) {
    keyName = keyName.toUpperCase();
  }

  parts.push(keyName);

  return parts.join('+');
}
