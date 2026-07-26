import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGlobalScanCapture } from '../useGlobalScanCapture';
import { isValidBarcode, looksLikeScan } from '../../utils/scanCapture';

/**
 * Scans are simulated by dispatching keydown events with a controlled clock,
 * because the capture rules depend on the gap between keystrokes.
 */
function typeInto(target: EventTarget, text: string, gapMs: number) {
  for (const char of text) {
    vi.advanceTimersByTime(gapMs);
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true })
    );
  }
}

function pressEnter(target: EventTarget, gapMs = 5): KeyboardEvent {
  vi.advanceTimersByTime(gapMs);
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true
  });
  target.dispatchEvent(event);
  return event;
}

describe('scanCapture rules', () => {
  it('accepts barcodes with letters, dots and hyphens', () => {
    expect(isValidBarcode('K2.0000071-7114')).toBe(true);
    expect(isValidBarcode('00000000101')).toBe(true);
  });

  it('rejects too short or malformed codes', () => {
    expect(isValidBarcode('ab')).toBe(false);
    expect(isValidBarcode('has space')).toBe(false);
    expect(isValidBarcode('drop/slash')).toBe(false);
  });

  it('treats slow but long input as a scan, and slow short input as typing', () => {
    expect(looksLikeScan('123456789', 200)).toBe(true);
    expect(looksLikeScan('12345', 200)).toBe(false);
    expect(looksLikeScan('12345', 5)).toBe(true);
  });
});

describe('useGlobalScanCapture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('captures a scan made while a text input has focus', () => {
    // This is the legacy behaviour the scanner-page hook does not provide.
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const onScan = vi.fn();
    renderHook(() => useGlobalScanCapture({ onScan }));

    typeInto(input, '00000000101', 5);
    pressEnter(input);

    expect(onScan).toHaveBeenCalledWith('00000000101');
  });

  it('claims the Enter so a surrounding form does not submit twice', () => {
    const onScan = vi.fn();
    renderHook(() => useGlobalScanCapture({ onScan }));

    typeInto(window, '00000000101', 5);
    const enter = pressEnter(window);

    expect(enter.defaultPrevented).toBe(true);
  });

  it('leaves slow human typing alone', () => {
    const onScan = vi.fn();
    renderHook(() => useGlobalScanCapture({ onScan }));

    typeInto(window, 'abc', 300);
    const enter = pressEnter(window, 300);

    expect(onScan).not.toHaveBeenCalled();
    expect(enter.defaultPrevented).toBe(false);
  });

  it('reports a scan that fails validation instead of dropping it', () => {
    const onScan = vi.fn();
    const onInvalid = vi.fn();
    renderHook(() => useGlobalScanCapture({ onScan, onInvalid }));

    typeInto(window, 'bad/code/here', 5);
    pressEnter(window);

    expect(onScan).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith('bad/code/here');
  });

  it('discards a stale partial buffer', () => {
    const onScan = vi.fn();
    renderHook(() => useGlobalScanCapture({ onScan }));

    typeInto(window, 'AAAA', 5);
    // Long pause: the operator walked away mid-scan, then scanned for real.
    vi.advanceTimersByTime(5000);
    typeInto(window, '00000000101', 5);
    pressEnter(window);

    expect(onScan).toHaveBeenCalledWith('00000000101');
  });

  it('stops listening once disabled', () => {
    const onScan = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useGlobalScanCapture({ onScan, enabled }),
      { initialProps: { enabled: false } }
    );

    typeInto(window, '00000000101', 5);
    pressEnter(window);
    expect(onScan).not.toHaveBeenCalled();

    rerender({ enabled: true });
    typeInto(window, '00000000101', 5);
    pressEnter(window);
    expect(onScan).toHaveBeenCalledTimes(1);
  });
});
