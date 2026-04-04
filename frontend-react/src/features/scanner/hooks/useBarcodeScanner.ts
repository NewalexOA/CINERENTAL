import { useCallback, useEffect, useRef, useState } from 'react';
import { SCANNER_CONSTANTS, BARCODE_REGEX } from '../types/scanner.types';

/**
 * Hook return interface for barcode scanner
 */
export interface UseBarcodeScanner {
  /** Whether scanner is actively listening */
  isActive: boolean;
  /** Start listening for barcode scans */
  start: () => void;
  /** Stop listening for barcode scans */
  stop: () => void;
  /** Last successfully scanned barcode */
  lastBarcode: string | null;
  /** Error state if validation or processing fails */
  error: Error | null;
}

/**
 * Options for configuring the barcode scanner
 */
export interface UseBarcodeScannerOptions {
  /** Callback when valid barcode is scanned */
  onScan: (barcode: string) => void;
  /** Minimum barcode length to process */
  minLength?: number;
  /** Auto-start scanner on mount */
  autoStart?: boolean;
}

/**
 * Enhanced barcode scanner hook for HID scanner detection
 *
 * Features:
 * - 20ms threshold for HID scanner detection
 * - Buffer reset after 100ms of no input (manual typing detection)
 * - Barcode validation using BARCODE_REGEX
 * - Enter key triggers processing
 * - Ignores input when focused on INPUT/TEXTAREA/SELECT elements
 * - Manual start/stop control
 * - Error state handling
 *
 * @example
 * ```typescript
 * const { isActive, start, stop, lastBarcode } = useBarcodeScanner({
 *   onScan: (barcode) => console.log('Scanned:', barcode),
 *   autoStart: true,
 * });
 * ```
 */
export function useBarcodeScanner({
  onScan,
  minLength = SCANNER_CONSTANTS.MIN_BARCODE_LENGTH,
  autoStart = true,
}: UseBarcodeScannerOptions): UseBarcodeScanner {
  const [isActive, setIsActive] = useState(autoStart);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const buffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start listening for barcode scans
   */
  const start = useCallback(() => {
    setIsActive(true);
    setError(null);
    buffer.current = '';
    lastKeyTime.current = 0;
  }, []);

  /**
   * Stop listening for barcode scans
   */
  const stop = useCallback(() => {
    setIsActive(false);
    buffer.current = '';
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  }, []);

  /**
   * Validate barcode format
   */
  const validateBarcode = useCallback((barcode: string): boolean => {
    if (barcode.length < minLength) {
      return false;
    }
    return BARCODE_REGEX.test(barcode);
  }, [minLength]);

  /**
   * Process buffered barcode on Enter key
   */
  const processBarcode = useCallback(() => {
    const barcode = buffer.current.trim();
    buffer.current = '';

    if (!barcode) {
      return;
    }

    if (!validateBarcode(barcode)) {
      const error = new Error(
        `Invalid barcode format: "${barcode}". Must be alphanumeric with dots/hyphens and at least ${minLength} characters.`
      );
      setError(error);
      return;
    }

    try {
      setError(null);
      setLastBarcode(barcode);
      onScan(barcode);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to process barcode');
      setError(error);
    }
  }, [onScan, validateBarcode, minLength]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const target = e.target as HTMLElement;

      // Ignore input when focused on form elements
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Handle Enter key - process buffered barcode
      if (e.key === 'Enter') {
        e.preventDefault();
        processBarcode();
        return;
      }

      // Only accumulate printable characters
      if (e.key.length !== 1) {
        return;
      }

      const timeSinceLastKey = currentTime - lastKeyTime.current;

      // Reset buffer if gap exceeds manual typing threshold (100ms)
      if (timeSinceLastKey > SCANNER_CONSTANTS.BUFFER_RESET_MS) {
        buffer.current = '';
      }

      // Accumulate character
      buffer.current += e.key;
      lastKeyTime.current = currentTime;

      // Clear any existing reset timeout
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }

      // Set new reset timeout
      resetTimeoutRef.current = setTimeout(() => {
        buffer.current = '';
      }, SCANNER_CONSTANTS.BUFFER_RESET_MS);

      // HID scanners typically send characters within 20ms
      // If we detect fast input, we know it's likely a scanner
      if (timeSinceLastKey < SCANNER_CONSTANTS.SCANNER_THRESHOLD_MS && timeSinceLastKey > 0) {
        // Scanner detected - fast input
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [isActive, processBarcode]);

  return {
    isActive,
    start,
    stop,
    lastBarcode,
    error,
  };
}
