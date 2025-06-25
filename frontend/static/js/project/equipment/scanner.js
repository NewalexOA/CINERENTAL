/**
 * Barcode scanner functionality
 */

import { showToast } from '../../utils/common.js';
import { searchEquipmentByBarcode, searchEquipmentInCatalog } from './search.js';
import { ADD_EQUIPMENT_CONFIG } from './cart-configs.js';

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

    // Add equipment directly to cart instead of just searching
    const success = await addScannedEquipmentToCart(equipment);

    if (success) {
        showToast(`Добавлено в корзину: ${equipment.name}`, 'success');
    } else {
        // Fallback to search if cart addition fails
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
        showToast(`Отсканирован штрих-код: ${equipment.barcode}`, 'info');
    }
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
            // Try to add scanned equipment directly to cart
            const equipment = await findEquipmentByBarcode(barcode);
            if (equipment) {
                const success = await addScannedEquipmentToCart(equipment);
                if (success) {
                    showToast(`Добавлено в корзину: ${equipment.name}`, 'success');
                    return;
                }
            }

            // Fallback to search
            await searchEquipmentByBarcode();
        } catch (error) {
            console.error('Barcode search failed in camera scanner:', error);
            showToast('Ошибка поиска по штрих-коду', 'danger');
        }
    }
}

/**
 * Find equipment by barcode using API
 * @param {string} barcode - Equipment barcode
 * @returns {Object|null} Equipment data or null if not found
 */
async function findEquipmentByBarcode(barcode) {
    try {
        const { api } = await import('../../utils/api.js');
        const equipment = await api.get(`/equipment/barcode/${barcode}`);
        return equipment;
    } catch (error) {
        console.error('Error finding equipment by barcode:', error);
        return null;
    }
}

/**
 * Add scanned equipment to cart
 * @param {Object} equipment - Equipment data from scanner
 * @returns {boolean} Success status
 */
async function addScannedEquipmentToCart(equipment) {
    try {
        // Dynamic import to avoid circular dependencies
        const { UniversalCart } = await import('../../universal-cart/universal-cart.js');

        // Initialize or get existing cart
        if (!window.universalCart) {
            window.universalCart = new UniversalCart(ADD_EQUIPMENT_CONFIG);
        }

        const cart = window.universalCart;

        // Prepare equipment data for cart
        const itemData = {
            id: equipment.id,
            name: equipment.name,
            barcode: equipment.barcode,
            serial_number: equipment.serial_number || null,
            category: equipment.category?.name || 'Без категории',
            quantity: 1,
            addedAt: new Date().toISOString(),
            addedBy: 'scanner'
        };

        // Add to cart
        const success = await cart.addItem(itemData);

        if (success) {
            // Show cart UI if available and this is the first item
            if (cart.ui && cart.getItemCount() === 1) {
                cart.ui.show();
            }
            return true;
        }

        return false;

    } catch (error) {
        console.error('Failed to add scanned equipment to cart:', error);
        return false;
    }
}

/**
 * Get scan feedback message based on cart integration
 * @param {Object} equipment - Equipment data
 * @param {boolean} addedToCart - Whether item was added to cart
 * @returns {Object} Message object with text and type
 */
function getScanFeedbackMessage(equipment, addedToCart) {
    if (addedToCart) {
        return {
            text: `✅ ${equipment.name} добавлено в корзину`,
            type: 'success'
        };
    } else {
        return {
            text: `📋 ${equipment.name} найдено (см. результаты поиска)`,
            type: 'info'
        };
    }
}

export { scannerActive, hidScanner, addScannedEquipmentToCart, findEquipmentByBarcode };
