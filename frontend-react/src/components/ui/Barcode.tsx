import React, { useRef, useEffect } from 'react';
import bwipjs from 'bwip-js';

// Define our own type for barcode options
interface BarcodeOptions {
  bcid?: string;
  text?: string;
  scale?: number;
  height?: number;
  width?: number;
  includetext?: boolean;
  textxalign?: string;
  [key: string]: unknown;
}

interface BarcodeProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  value: string;
  options?: BarcodeOptions;
}

const Barcode: React.FC<BarcodeProps> = ({ value, options, ...canvasProps }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const combinedOptions: BarcodeOptions = {
        bcid: 'datamatrix', // Default to datamatrix
        text: value,
        scale: 5,
        height: 10,
        width: 10,
        includetext: true,
        textxalign: 'center',
        ...options,
      };

      try {
        bwipjs.toCanvas(canvasRef.current, combinedOptions);
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [value, options]);

  return <canvas ref={canvasRef} {...canvasProps} />;
};

export default Barcode;
