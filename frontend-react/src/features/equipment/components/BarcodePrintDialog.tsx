import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Printer } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BarcodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode: string;
  serialNumber?: string;
}

type BarcodeType = 'code128' | 'datamatrix';

export function BarcodePrintDialog({ open, onOpenChange, barcode, serialNumber }: BarcodePrintDialogProps) {
  const [previews, setPreviews] = useState<{ code128: string; datamatrix: string }>({
    code128: '',
    datamatrix: ''
  });

  useEffect(() => {
    if (open && barcode) {
      loadBarcodePreviews();
    }
  }, [open, barcode]);

  const loadBarcodePreviews = () => {
    const code128Url = `/api/v1/barcodes/${barcode}/image?barcode_type=code128`;
    const datamatrixUrl = `/api/v1/barcodes/${barcode}/image?barcode_type=datamatrix`;

    setPreviews({
      code128: code128Url,
      datamatrix: datamatrixUrl
    });
  };

  const doPrintBarcode = (barcodeType: BarcodeType) => {
    const imageUrl = `/api/v1/barcodes/${barcode}/image?barcode_type=${barcodeType}`;

    // Create print window HTML
    const printHtml = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Печать штрих-кода</title>
        <style>
          @page {
            size: 30mm 10mm;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }

          .barcode-container-linear {
            width: 30mm;
            height: 10mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0;
            box-sizing: border-box;
          }

          .barcode-container-datamatrix {
            width: 30mm;
            height: 10mm;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            padding: 0;
            box-sizing: border-box;
          }

          .barcode-image {
            ${barcodeType === 'code128' ? 'width: 100%; height: 7mm; object-fit: fill;' : 'width: 10mm; height: 10mm; object-fit: contain;'}
          }

          .barcode-text {
            font-size: 8px;
            text-align: center;
            margin: 0;
            padding: 0;
            line-height: 1;
          }

          .barcode-text-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            ${barcodeType === 'datamatrix' ? 'flex: 1;' : ''}
          }
        </style>
      </head>
      <body>
        <div class="barcode-container-${barcodeType === 'code128' ? 'linear' : 'datamatrix'}">
          <img class="barcode-image" src="${imageUrl}" alt="Barcode">
          ${barcodeType === 'code128' ? `
            <div class="barcode-text-container">
              <p class="barcode-text">${barcode}</p>
            </div>
          ` : `
            <div class="barcode-text-container">
              <p class="barcode-text">${barcode}</p>
              ${serialNumber && serialNumber !== barcode ? `<p class="barcode-text">${serialNumber}</p>` : ''}
            </div>
          `}
        </div>
      </body>
      </html>
    `;

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Write content and print
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      // Wait for image to load, then print
      const img = iframeDoc.querySelector('img');
      if (img) {
        img.onload = () => {
          iframe.contentWindow?.print();
          // Clean up after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
            onOpenChange(false);
          }, 2000);
        };
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Печать штрих-кода</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Code128 Format */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-medium">Code128 (Линейный)</div>
            {previews.code128 && (
              <div
                className="border rounded bg-white cursor-pointer hover:shadow-md transition-shadow w-full"
                onClick={() => doPrintBarcode('code128')}
                title="Нажмите для печати"
              >
                {/* Preview identical to print output: 30x10mm */}
                <div
                  className="flex flex-col items-center justify-center"
                  style={{ aspectRatio: '3/1' }}
                >
                  <img
                    src={previews.code128}
                    alt="Code128 Preview"
                    className="w-full object-fill"
                    style={{ maxHeight: '70%' }}
                  />
                  <p style={{ fontSize: '8px', textAlign: 'center', margin: 0, padding: 0, lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>{barcode}</p>
                </div>
              </div>
            )}
          </div>

          {/* DataMatrix Format */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-medium">DataMatrix (2D)</div>
            {previews.datamatrix && (
              <div
                className="border rounded bg-white cursor-pointer hover:shadow-md transition-shadow w-full"
                onClick={() => doPrintBarcode('datamatrix')}
                title="Нажмите для печати"
              >
                {/* Preview identical to print output: 30x10mm */}
                <div
                  className="flex flex-row items-center justify-start"
                  style={{ aspectRatio: '3/1' }}
                >
                  <img
                    src={previews.datamatrix}
                    alt="DataMatrix Preview"
                    className="object-contain"
                    style={{ width: '33.33%', height: '100%' }}
                  />
                  <div className="flex flex-col flex-1 items-center justify-center">
                    <p style={{ fontSize: '8px', textAlign: 'center', margin: 0, padding: 0, lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>{barcode}</p>
                    {serialNumber && serialNumber !== barcode && <p style={{ fontSize: '8px', textAlign: 'center', margin: 0, padding: 0, lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>{serialNumber}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
