import { useEffect, useRef } from 'react';
import {
  isValidBarcode,
  looksLikeScan,
  shouldResetBuffer
} from '../utils/scanCapture';

interface UseGlobalScanCaptureOptions {
  /** Called with a validated barcode. */
  onScan: (barcode: string) => void;
  /** Called when a scan-looking buffer fails validation, so it is not lost silently. */
  onInvalid?: (barcode: string) => void;
  enabled?: boolean;
}

/**
 * Captures barcode scans anywhere on the page, including while a text field has
 * focus — the behaviour the legacy project page had.
 *
 * A recognised scan calls preventDefault on its trailing Enter, so a focused
 * form does not submit the same barcode a second time. Slow, human typing never
 * trips the scanner heuristics and is left entirely alone.
 */
export function useGlobalScanCapture({
  onScan,
  onInvalid,
  enabled = true
}: UseGlobalScanCaptureOptions): void {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);
  const onScanRef = useRef(onScan);
  const onInvalidRef = useRef(onInvalid);

  // Keep the latest callbacks without re-subscribing the listener on every render.
  useEffect(() => {
    onScanRef.current = onScan;
    onInvalidRef.current = onInvalid;
  }, [onScan, onInvalid]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now();
      const gap = now - lastKeyTime.current;

      if (event.key === 'Enter') {
        const scanned = buffer.current;
        buffer.current = '';

        if (!looksLikeScan(scanned, gap)) return;

        // Claim the Enter so a focused form does not also submit it.
        event.preventDefault();
        lastKeyTime.current = now;

        if (isValidBarcode(scanned)) {
          onScanRef.current(scanned);
        } else {
          onInvalidRef.current?.(scanned);
        }
        return;
      }

      // Only printable characters make up a barcode.
      if (event.key.length !== 1) return;

      if (shouldResetBuffer(gap)) {
        buffer.current = '';
      }

      buffer.current += event.key;
      lastKeyTime.current = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
