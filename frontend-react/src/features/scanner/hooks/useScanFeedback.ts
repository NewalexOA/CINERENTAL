/**
 * Visual and audio feedback for scan events
 * Provides sounds and animation classes for different scan results
 */

import { useState, useCallback, useEffect } from 'react';
import { ScanFeedbackType, STORAGE_KEYS } from '../types/scanner.types';
import {
  playSuccessSound,
  playErrorSound,
  playDuplicateSound,
  playQuantityUpdatedSound,
  playNotFoundSound,
} from '../utils/feedbackSounds';

interface UseScanFeedbackOptions {
  soundEnabled?: boolean;
}

interface UseScanFeedback {
  triggerFeedback: (type: ScanFeedbackType) => void;
  setSoundEnabled: (enabled: boolean) => void;
  soundEnabled: boolean;
  feedbackClass: string | null;
}

/**
 * Map feedback types to CSS classes for animations
 */
const FEEDBACK_CLASSES: Record<ScanFeedbackType, string> = {
  success: 'scan-feedback-success',
  duplicate: 'scan-feedback-duplicate',
  quantity_updated: 'scan-feedback-quantity',
  not_found: 'scan-feedback-not-found',
  error: 'scan-feedback-error',
};

/**
 * Map feedback types to sound functions
 */
const FEEDBACK_SOUNDS: Record<ScanFeedbackType, () => void> = {
  success: playSuccessSound,
  duplicate: playDuplicateSound,
  quantity_updated: playQuantityUpdatedSound,
  not_found: playNotFoundSound,
  error: playErrorSound,
};

/**
 * Hook for managing scan feedback (visual and audio)
 */
export function useScanFeedback(
  options: UseScanFeedbackOptions = {}
): UseScanFeedback {
  // Load sound preference from localStorage
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (options.soundEnabled !== undefined) {
      return options.soundEnabled;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
      return stored ? JSON.parse(stored) : true; // Default enabled
    } catch {
      return true;
    }
  });

  // Active feedback class for visual animations
  const [feedbackClass, setFeedbackClass] = useState<string | null>(null);

  // Save sound preference to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SOUND_ENABLED,
        JSON.stringify(soundEnabled)
      );
    } catch (error) {
      console.error('Failed to save sound preference:', error);
    }
  }, [soundEnabled]);

  /**
   * Update sound enabled preference
   */
  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
  }, []);

  /**
   * Trigger feedback for a scan event
   * Plays sound (if enabled) and sets visual feedback class
   */
  const triggerFeedback = useCallback(
    (type: ScanFeedbackType) => {
      // Play sound if enabled
      if (soundEnabled) {
        const soundFunction = FEEDBACK_SOUNDS[type];
        if (soundFunction) {
          soundFunction();
        }
      }

      // Set visual feedback class
      const cssClass = FEEDBACK_CLASSES[type];
      if (cssClass) {
        setFeedbackClass(cssClass);

        // Clear feedback class after animation completes
        setTimeout(() => {
          setFeedbackClass(null);
        }, 500); // Match animation duration
      }
    },
    [soundEnabled]
  );

  return {
    triggerFeedback,
    setSoundEnabled,
    soundEnabled,
    feedbackClass,
  };
}
