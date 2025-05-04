/**
 * Barcode scanner functionality
 */

import { showToast } from '../../utils/common.js';
import { searchEquipmentByBarcode } from './search.js';

let scannerActive = false;

/**
 * Toggle barcode scanner
 */
export function toggleBarcodeScanner() {
    if (scannerActive) {
        stopScanner();
    } else {
        startScanner();
    }
}

/**
 * Start barcode scanner
 */
async function startScanner() {
    const scannerContainer = document.getElementById('scannerContainer');
    const toggleButton = document.getElementById('toggleScannerBtn');

    try {
        scannerContainer.classList.remove('d-none');
        toggleButton.innerHTML = '<i class="fas fa-stop"></i> Остановить';

        await Quagga.init({
            inputStream: {
                name: 'Live',
                type: 'LiveStream',
                target: document.querySelector('#scannerVideo'),
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: 'environment'
                },
            },
            decoder: {
                readers: [
                    'code_128_reader',
                    'ean_reader',
                    'ean_8_reader',
                    'code_39_reader',
                    'code_39_vin_reader',
                    'codabar_reader',
                    'upc_reader',
                    'upc_e_reader',
                    'i2of5_reader'
                ],
                multiple: false
            }
        });

        Quagga.start();
        scannerActive = true;

        Quagga.onDetected(handleScanResult);
    } catch (error) {
        console.error('Error starting scanner:', error);
        showToast('Ошибка при запуске сканера', 'danger');
        stopScanner();
    }
}

/**
 * Stop barcode scanner
 */
export function stopScanner() {
    if (scannerActive) {
        Quagga.stop();
        scannerActive = false;
        document.getElementById('scannerContainer').classList.add('d-none');
        document.getElementById('toggleScannerBtn').innerHTML = '<i class="fas fa-camera"></i> Камера';
    }
}

/**
 * Handle barcode scan result
 * @param {Object} result - Scan result
 */
function handleScanResult(result) {
    if (result && result.codeResult) {
        const barcode = result.codeResult.code;
        stopScanner();
        document.getElementById('barcodeInput').value = barcode;
        searchEquipmentByBarcode();
    }
}

export { scannerActive };
