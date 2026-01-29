/**
 * Web Audio API sound utilities
 * Provides audio feedback for scanner events
 */

let audioContext: AudioContext | null = null;

/**
 * Get or create the audio context (lazy initialization)
 * Handles browser compatibility
 */
export function getAudioContext(): AudioContext | null {
  if (audioContext) {
    return audioContext;
  }

  try {
    // Check for browser support
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
      null;

    if (!AudioContextClass) {
      console.warn('Web Audio API not supported in this browser');
      return null;
    }

    audioContext = new AudioContextClass();
    return audioContext;
  } catch (error) {
    console.error('Failed to create AudioContext:', error);
    return null;
  }
}

/**
 * Play a beep sound with specified frequency and duration
 * @param frequency - Frequency in Hz (e.g., 440 for A4 note)
 * @param duration - Duration in milliseconds
 */
export function playBeep(frequency: number, duration: number): void {
  const context = getAudioContext();
  if (!context) return;

  try {
    // Create oscillator for tone generation
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Configure tone
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Configure volume envelope (fade out)
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      context.currentTime + duration / 1000
    );

    // Play sound
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration / 1000);
  } catch (error) {
    console.error('Failed to play beep:', error);
  }
}

/**
 * Play success sound (short beep)
 */
export function playSuccessSound(): void {
  playBeep(440, 100); // A4 note, 100ms
}

/**
 * Play error sound (low tone)
 */
export function playErrorSound(): void {
  playBeep(220, 200); // A3 note, 200ms
}

/**
 * Play duplicate warning sound (two short beeps)
 */
export function playDuplicateSound(): void {
  playBeep(440, 80);
  setTimeout(() => playBeep(440, 80), 120);
}

/**
 * Play quantity updated sound (ascending tone)
 */
export function playQuantityUpdatedSound(): void {
  playBeep(349, 80); // F4
  setTimeout(() => playBeep(440, 80), 100); // A4
}

/**
 * Play not found sound (same as error)
 */
export function playNotFoundSound(): void {
  playErrorSound();
}
