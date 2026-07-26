/**
 * Barcode capture rules ported from the legacy BarcodeScanner (main.js).
 *
 * The distinguishing feature is that capture is global: unlike the scanner-page
 * hook, it does not ignore keystrokes aimed at focused inputs, so a scan lands
 * in the cart no matter where the caret happens to be.
 */

/** Max ms between keystrokes for the input to look machine-generated. */
export const SCANNER_THRESHOLD_MS = 20;

/** Idle gap after which a partial buffer is discarded. */
export const BUFFER_RESET_MS = 500;

/** Length above which a buffer is trusted even without scanner-speed timing. */
export const TRUSTED_LENGTH = 8;

/**
 * Barcodes are not a fixed-width numeric format: they may be longer, and may
 * contain letters, dots and hyphens (e.g. "K2.0000071-7114").
 */
export const BARCODE_PATTERN = /^[A-Za-z0-9.-]+$/;
export const MIN_BARCODE_LENGTH = 3;

export function isValidBarcode(barcode: string): boolean {
  return barcode.length >= MIN_BARCODE_LENGTH && BARCODE_PATTERN.test(barcode);
}

/**
 * Whether a completed buffer should be treated as a scan rather than typing.
 *
 * Mirrors legacy: either the keystrokes arrived at scanner speed, or the buffer
 * is long enough that a human is unlikely to have typed it into a hidden buffer.
 */
export function looksLikeScan(buffer: string, lastGapMs: number): boolean {
  if (!buffer) return false;
  return lastGapMs <= SCANNER_THRESHOLD_MS || buffer.length >= TRUSTED_LENGTH;
}

/** A buffer older than the idle gap belongs to an abandoned attempt. */
export function shouldResetBuffer(gapMs: number): boolean {
  return gapMs > BUFFER_RESET_MS;
}
