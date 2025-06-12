/**
 * Barcode scanner functionality
 */

import { showToast } from '../../utils/common.js';
import { searchEquipmentByBarcode, searchEquipmentInCatalog } from './search.js';

let scannerActive = false;
let hidScanner = null;

/**
 * Initialize HID barcode scanner for equipment search
 */
export function initializeHIDScanner() {
    if (!hidScanner) {
        hidScanner = new window.BarcodeScanner(
            handleHIDScanResult,
            handleHIDScanError
        );
    }
}

/**
 * Start HID barcode scanner
 */
export function startHIDScanner() {
    if (!hidScanner) {
        initializeHIDScanner();
    }

    if (hidScanner && !hidScanner.isListening) {
        hidScanner.start();
        console.log('HID Barcode scanner started for equipment search');
    }
}

/**
 * Stop HID barcode scanner
 */
export function stopHIDScanner() {
    if (hidScanner && hidScanner.isListening) {
        hidScanner.stop();
        console.log('HID Barcode scanner stopped');
    }
}

/**
 * Auto-start HID scanner for unified equipment search interface
 */
export function autoStartHIDScanner() {
    console.log('Auto-starting HID scanner for equipment search');
    startHIDScanner();
}

/**
 * Auto-stop HID scanner for unified equipment search interface
 */
export function autoStopHIDScanner() {
    console.log('Auto-stopping HID scanner');
    stopHIDScanner();
}

/**
 * Handle HID scanner result
 * @param {Object} equipment - Equipment data from API
 * @param {Object} scanInfo - Additional scan information
 */
async function handleHIDScanResult(equipment, scanInfo) {
    console.log('HID Scanner detected equipment:', equipment);

    // Fill the barcode input field
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.value = equipment.barcode;
        // Add visual feedback to the input
        barcodeInput.classList.add('is-valid');
        setTimeout(() => {
            barcodeInput.classList.remove('is-valid');
        }, 2000);
    }

    try {
        await searchEquipmentByBarcode();
    } catch (error) {
        // If barcode search failed, try catalog search
        console.log('Barcode search failed, falling back to catalog search:', error.message);
        try {
            await searchEquipmentInCatalog();
        } catch (catalogError) {
            console.error('Catalog search also failed:', catalogError);
            showToast('Ошибка поиска оборудования', 'danger');
        }
    }

    showToast(`Отсканирован штрих-код: ${equipment.barcode}`, 'success');
}

/**
 * Handle HID scanner error
 * @param {Error} error - Error object
 */
function handleHIDScanError(error) {
    console.error('HID Scanner error:', error);
    showToast(`Ошибка сканирования: ${error.message}`, 'danger');
}



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
async function handleScanResult(result) {
    if (result && result.codeResult) {
        const barcode = result.codeResult.code;
        stopScanner();
        document.getElementById('barcodeInput').value = barcode;

        try {
            await searchEquipmentByBarcode();
        } catch (error) {
            console.error('Barcode search failed in camera scanner:', error);
            showToast('Ошибка поиска по штрих-коду', 'danger');
        }
    }
}

export { scannerActive, hidScanner };
