import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import Barcode from '../../../components/ui/Barcode';
import bwipjs from 'bwip-js';

interface BarcodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode: string;
  serialNumber?: string;
}

type BarcodeType = 'code128' | 'datamatrix';

export function BarcodePrintDialog({ open, onOpenChange, barcode, serialNumber }: BarcodePrintDialogProps) {
  const generateBarcodeDataURL = async (barcodeType: BarcodeType): Promise<string> => {
    const canvas = document.createElement('canvas');
    const options =
      barcodeType === 'code128'
        ? {
            bcid: 'code128',
            text: barcode,
            scale: 10,
            height: 28,
            width: 112,
            includetext: false,
          }
        : {
            bcid: 'datamatrix',
            text: barcode,
            scale: 10,
            width: 40,
            height: 40,
            includetext: false,
          };

    try {
      bwipjs.toCanvas(canvas, options);
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Barcode generation error:', err);
      throw err;
    }
  };

  const doPrintBarcode = async (barcodeType: BarcodeType) => {
    try {
      const imageUrl = await generateBarcodeDataURL(barcodeType);

      const printHtml = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Печать штрих-кода</title>
        <style>
          @page { size: 30mm 10mm; margin: 0; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .barcode-container-linear { width: 30mm; height: 10mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; box-sizing: border-box; }
          .barcode-container-datamatrix { width: 30mm; height: 10mm; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; padding: 0; box-sizing: border-box; }
          .barcode-image { ${barcodeType === 'code128' ? 'width: 100%; height: 7mm; object-fit: fill;' : 'width: 10mm; height: 10mm; object-fit: contain;'} }
          .barcode-text { font-size: 8px; text-align: center; margin: 0; padding: 0; line-height: 1; }
          .barcode-text-container { display: flex; flex-direction: column; align-items: center; justify-content: center; ${barcodeType === 'datamatrix' ? 'flex: 1;' : ''} }
        </style>
      </head>
      <body>
        <div class="barcode-container-${barcodeType === 'code128' ? 'linear' : 'datamatrix'}">
          <img class="barcode-image" src="${imageUrl}" alt="Barcode">
          ${barcodeType === 'code128' ? `<div class="barcode-text-container"><p class="barcode-text">${barcode}</p></div>` : `<div class="barcode-text-container"><p class="barcode-text">${barcode}</p>${serialNumber && serialNumber !== barcode ? `<p class="barcode-text">${serialNumber}</p>` : ''}</div>`}
        </div>
      </body>
      </html>
    `;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(printHtml);
        iframeDoc.close();
        const img = iframeDoc.querySelector('img');
        if (img) {
          img.onload = () => {
            iframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
              onOpenChange(false);
            }, 2000);
          };
        }
      }
    } catch (error) {
      console.error('Failed to generate barcode for printing:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Печать штрих-кода</DialogTitle>
          <DialogDescription>
            Выберите формат штрих-кода для печати на стикере 30x10mm
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div
            className="flex flex-col items-center gap-2 p-2 border rounded cursor-pointer hover:shadow-md transition-all"
            onClick={() => doPrintBarcode('code128')}
          >
            <div className="text-sm font-medium">Code128 (Линейный)</div>
            <div style={{ width: '30mm', height: '10mm', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Barcode value={barcode} options={{ bcid: 'code128', includetext: true, textxalign: 'center', height: 10 }} className="w-full h-full" />
            </div>
          </div>
          <div
            className="flex flex-col items-center gap-2 p-2 border rounded cursor-pointer hover:shadow-md transition-all"
            onClick={() => doPrintBarcode('datamatrix')}
          >
            <div className="text-sm font-medium">DataMatrix (2D)</div>
            <div style={{ width: '30mm', height: '10mm', border: '1px solid #ccc', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', gap: '1mm' }}>
              <Barcode value={barcode} options={{ bcid: 'datamatrix', includetext: false, scale: 3 }} style={{ width: '10mm', height: '10mm', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <p style={{ fontSize: '8px', margin: 0, lineHeight: 1.2, textAlign: 'center', width: '100%' }}>{barcode}</p>
                {serialNumber && serialNumber !== barcode && <p style={{ fontSize: '8px', margin: 0, lineHeight: 1.2, textAlign: 'center', width: '100%' }}>{serialNumber}</p>}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
