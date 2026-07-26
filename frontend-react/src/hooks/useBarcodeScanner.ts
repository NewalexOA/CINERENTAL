import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
}

export function useBarcodeScanner({ onScan, minLength = 3 }: UseBarcodeScannerOptions) {
  const buffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const target = e.target as HTMLElement;

      // Ignore input elements to allow manual typing
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // If too much time passed, reset buffer (except if it's Enter, handled below)
      if (currentTime - lastKeyTime.current > 50 && buffer.current.length > 0) {
         // This logic is tricky. HID scanners are fast. 
         // But if a user types fast? 
         // We usually rely on the buffer accumulating rapidly.
         // Let's rely on simple timing reset.
         if (e.key !== 'Enter') {
             // buffer.current = ''; // Reset on slow typing
             // Actually, strict timeout reset is good for scanners.
         }
      }

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          onScan(buffer.current);
        }
        buffer.current = '';
        return;
      }

      // Allow printable characters
      if (e.key.length === 1) {
        if (currentTime - lastKeyTime.current > 100) {
            // Reset if gap > 100ms (manual typing assumption)
            buffer.current = ''; 
        }
        buffer.current += e.key;
        lastKeyTime.current = currentTime;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, minLength]);
}
