/**
 * Barcode validation utilities
 */

import { BARCODE_REGEX, SCANNER_CONSTANTS } from '../types/scanner.types';

/**
 * Validate barcode format
 * Must be alphanumeric with dots/hyphens and meet minimum length
 */
export function isValidBarcode(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  const cleaned = barcode.trim();

  // Check minimum length
  if (cleaned.length < SCANNER_CONSTANTS.MIN_BARCODE_LENGTH) {
    return false;
  }

  // Check format (alphanumeric, dots, hyphens)
  return BARCODE_REGEX.test(cleaned);
}

/**
 * Clean barcode input
 * Removes whitespace and invalid characters
 */
export function cleanBarcode(barcode: string): string {
  if (!barcode || typeof barcode !== 'string') {
    return '';
  }

  // Trim whitespace
  let cleaned = barcode.trim();

  // Remove any characters that don't match the allowed pattern
  // Keep only alphanumeric, dots, and hyphens
  cleaned = cleaned.replace(/[^A-Za-z0-9.-]/g, '');

  return cleaned;
}

/**
 * Normalize barcode for comparison
 * Converts to uppercase and removes dashes/dots for fuzzy matching
 */
export function normalizeBarcode(barcode: string): string {
  return cleanBarcode(barcode).toUpperCase().replace(/[.-]/g, '');
}
