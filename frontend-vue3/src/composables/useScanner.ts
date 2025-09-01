import { ref, onMounted, onUnmounted } from 'vue'

export interface UseScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  threshold?: number; // ms between keystrokes
  minLength?: number;
}

export function useScanner(options: UseScannerOptions) {
  const { onScan, onError, threshold = 50, minLength = 6 } = options;

  let buffer = '';
  let lastKeyTime = 0;

  function handleKeyDown(event: KeyboardEvent) {
    const key = event.key;
    const currentTime = Date.now();

    if (currentTime - lastKeyTime > threshold) {
      buffer = ''; // Reset buffer if typing is too slow
    }

    lastKeyTime = currentTime;

    if (key === 'Enter') {
      if (buffer.length >= minLength) {
        event.preventDefault();
        onScan(buffer);
      }
      buffer = ''; // Always clear buffer on Enter
      return;
    }

    if (key.length === 1) {
      buffer += key;
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  // No return value needed as this composable just sets up a global listener
}
