import React, { useRef, useEffect, useState, useMemo } from 'react';
import bwipjs, { RenderOptions } from 'bwip-js';

// Extend RenderOptions for our component props (all optional except text comes from value)
type BarcodeOptions = Partial<Omit<RenderOptions, 'text'>>;

// Export for reusability
export type { BarcodeOptions };

// Constants for validation
const MAX_BARCODE_LENGTH = 100;
const VALID_BARCODE_PATTERN = /^[\x20-\x7E]+$/; // Printable ASCII

interface BarcodeProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  value: string;
  options?: BarcodeOptions;
  fallback?: React.ReactNode;
}

const Barcode: React.FC<BarcodeProps> = ({
  value,
  options,
  fallback,
  ...canvasProps
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Stabilize options reference using JSON serialization
  // This prevents unnecessary re-renders when parent passes new object with same values
  const optionsKey = useMemo(() => JSON.stringify(options), [options]);

  useEffect(() => {
    // Validate input - empty check
    if (!value || value.trim() === '') {
      setError('Пустое значение штрих-кода');
      return;
    }

    // Validate input - max length to prevent memory exhaustion
    if (value.length > MAX_BARCODE_LENGTH) {
      setError(`Превышена максимальная длина (${MAX_BARCODE_LENGTH})`);
      return;
    }

    // Validate input - character validation
    if (!VALID_BARCODE_PATTERN.test(value)) {
      setError('Недопустимые символы в штрих-коде');
      return;
    }

    if (!canvasRef.current) {
      return;
    }

    // Parse options from stable key
    const parsedOptions = optionsKey ? JSON.parse(optionsKey) as BarcodeOptions : {};

    const combinedOptions: RenderOptions = {
      bcid: 'datamatrix', // Default to datamatrix
      text: value,
      scale: 5,
      height: 10,
      width: 10,
      includetext: true,
      textxalign: 'center',
      ...parsedOptions,
    };

    try {
      bwipjs.toCanvas(canvasRef.current, combinedOptions);
      setError(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Ошибка генерации';
      console.error('Barcode generation error:', e);
      setError(errorMessage);
    }
  }, [value, optionsKey]);

  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground bg-muted rounded p-2"
        role="img"
        aria-label={`Ошибка штрих-кода: ${error}`}
      >
        <span className="text-destructive">⚠</span>
        <span className="ml-1">{value || '—'}</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Штрих-код: ${value}`}
      {...canvasProps}
    />
  );
};

export default Barcode;
