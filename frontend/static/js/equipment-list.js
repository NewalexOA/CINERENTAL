// Load categories for add form
async function loadCategories() {
    const formSelect = document.querySelector('select[name="category_id"]');
    formSelect.innerHTML = '<option value="">Загрузка категорий...</option>';
    formSelect.disabled = true;

    try {
        const categories = await api.get('/categories'); // Assuming 'api' object is globally available
        formSelect.innerHTML = categories.map(category =>
            `<option value="${category.id}">${category.name}</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('Ошибка при загрузке категорий', 'danger'); // Assuming 'showToast' is globally available
        formSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
    } finally {
        formSelect.disabled = false;
    }
}

async function previewBarcode() {
    // Get the preview button and barcode input
    const previewButton = document.getElementById('preview_barcode');
    const barcodeInput = document.getElementById('barcode_input');

    // Show loading state on the button
    const originalButtonText = previewButton.innerHTML;
    previewButton.disabled = true;
    previewButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

    try {
        // Reset any global loader that might be active
        if (typeof resetLoader === 'function') resetLoader();

        // Generate the barcode
        const response = await api.post('/barcodes/generate', {}); // Assuming 'api' object is globally available
        barcodeInput.value = response.barcode;

        // Show feedback (optional)
        showToast('Штрих-код сгенерирован', 'success'); // Assuming 'showToast' is globally available
    } catch (error) {
        console.error('Error previewing barcode:', error);
        showToast('Ошибка при предпросмотре штрих-кода', 'danger'); // Assuming 'showToast' is globally available
    } finally {
        // Restore button state
        previewButton.disabled = false;
        previewButton.innerHTML = originalButtonText;
    }
}

// Function to forcibly reset loader state if needed (assuming it might be defined globally)
// function resetLoader() { ... } - This function definition was present in the original HTML,
// but should ideally be defined in a global scope (e.g., main.js) if used across pages.
// If it's ONLY used here, it should be defined here. Assuming it's global for now.

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Add event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Reset any active loader first (assuming resetLoader is global)
    if (typeof resetLoader === 'function') resetLoader();

    // Load categories
    loadCategories();

    // Listen for preview barcode button clicks
    const previewBtn = document.getElementById('preview_barcode');
    if (previewBtn) {
        previewBtn.addEventListener('click', previewBarcode);
    }

    // Listen for generate barcode checkbox changes
    const generateBarcodeCheckbox = document.getElementById('generate_barcode');
    if (generateBarcodeCheckbox) {
        generateBarcodeCheckbox.addEventListener('change', function() {
            const barcodeInput = document.getElementById('barcode_input');
            const previewButton = document.getElementById('preview_barcode');
            const barcodeHelp = document.getElementById('barcode_help');

            if (this.checked) {
                barcodeInput.readOnly = true;
                previewButton.disabled = false;
                previewButton.style.display = '';
                barcodeInput.value = ''; // Clear input when checked
                barcodeHelp.textContent = 'Штрих-код будет сгенерирован автоматически.';
            } else {
                barcodeInput.readOnly = false;
                previewButton.disabled = true;
                previewButton.style.display = 'none';
                barcodeHelp.textContent = 'Введите штрих-код в любом формате.';
            }
        });
         // Trigger change event on load to set initial state based on default 'checked'
         generateBarcodeCheckbox.dispatchEvent(new Event('change'));
    }

    // Form submission handler
    const addEquipmentBtn = document.getElementById('addEquipment');
    if (addEquipmentBtn) {
        addEquipmentBtn.addEventListener('click', async function() {
            const form = document.getElementById('addEquipmentForm');

            // Check form validity before submission
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Convert checkbox value to boolean
            data.generate_barcode = formData.has('generate_barcode');

            // Convert numeric fields
            data.category_id = parseInt(data.category_id);
            data.replacement_cost = parseFloat(data.replacement_cost || 0);

            // Handle optional fields
            if (!data.description?.trim()) data.description = null;
            if (!data.serial_number?.trim()) data.serial_number = null;

            // Handle barcode based on generation flag
            if (data.generate_barcode) {
                delete data.barcode; // Server generates
            } else if (!formData.get('barcode')?.trim()) {
                data.barcode = null; // Manual but empty
            } else {
                // Manual entry
                data.custom_barcode = formData.get('barcode').trim();
                data.validate_barcode = false; // Do not validate custom format
                delete data.barcode;
            }

            // Button loading state
            const originalButtonText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Добавление...';

            // Reset loader if exists
            if (typeof resetLoader === 'function') resetLoader();

            // API request
            try {
                console.log('Sending data:', data);
                const response = await api.post('/equipment/', data); // Assuming 'api' is global
                showToast('Оборудование успешно добавлено', 'success'); // Assuming 'showToast' is global

                // Close modal, reset form, and reload
                const modalEl = document.getElementById('addEquipmentModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                form.reset();
                // Re-trigger checkbox change to reset barcode input state
                if(generateBarcodeCheckbox) generateBarcodeCheckbox.dispatchEvent(new Event('change'));

                window.location.reload(); // Consider AJAX update instead

            } catch (error) {
                console.error('Error adding equipment:', error);

                // Clear previous validation errors
                 form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
                 form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

                let errorMessage = 'Ошибка при добавлении оборудования';

                if (error.response) {
                    console.error('API response:', error.response);
                    const details = error.response.data?.detail;

                    if (Array.isArray(details)) { // Pydantic v2 validation errors
                        errorMessage = 'Ошибка валидации. Проверьте поля.';
                        details.forEach(err => {
                            const fieldName = err.loc?.[1];
                            const field = form.querySelector(`[name="${fieldName}"]`);
                            if (field) {
                                field.classList.add('is-invalid');
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'invalid-feedback';
                                errorDiv.textContent = err.msg || 'Неверное значение';
                                field.parentNode.appendChild(errorDiv);
                            }
                        });
                    } else if (typeof details === 'string') { // Single error message
                        errorMessage = details;
                        // Specific handling for serial number unique constraint
                        if (errorMessage.toLowerCase().includes('serial number') && errorMessage.toLowerCase().includes('already exists')) {
                            const serialField = form.querySelector('[name="serial_number"]');
                            if (serialField) {
                                serialField.classList.add('is-invalid');
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'invalid-feedback';
                                errorDiv.textContent = 'Серийный номер уже используется';
                                serialField.parentNode.appendChild(errorDiv);
                                errorMessage = 'Серийный номер уже используется.'; // More user-friendly
                            }
                        }
                    } else if (error.response.data?.message) {
                         errorMessage = error.response.data.message;
                    } else if (error.response.data?.error) {
                         errorMessage = error.response.data.error;
                    }

                } else {
                    errorMessage = 'Ошибка сети или сервера';
                }

                showToast(errorMessage, 'danger'); // Assuming 'showToast' is global
                if (typeof resetLoader === 'function') resetLoader(); // Ensure loader reset on error

            } finally {
                // Restore button state
                this.disabled = false;
                this.innerHTML = originalButtonText;
                if (typeof resetLoader === 'function') resetLoader(); // Ensure loader reset always
            }
        });
    }

    // Format amounts in the table
    const formatAmounts = () => {
        document.querySelectorAll('.replacement-cost').forEach(element => {
            const value = parseFloat(element.textContent);
            if (!isNaN(value)) {
                element.textContent = formatNumber(value);
            }
        });
    };
    formatAmounts(); // Run on initial load

    // Hook into equipmentSearch if it exists (assuming it's global)
    if (typeof equipmentSearch !== 'undefined' && equipmentSearch.updateResults) {
        const originalUpdateResults = equipmentSearch.updateResults;
        equipmentSearch.updateResults = function() {
            originalUpdateResults.apply(this, arguments);
            setTimeout(formatAmounts, 100); // Format after search results update
        };
        // Assuming equipmentSearch.init() is called elsewhere or within its own script
    }

    // Add event listeners for scan session modal buttons
    const confirmNewBtn = document.getElementById('confirmNewSession');
    if (confirmNewBtn) confirmNewBtn.addEventListener('click', createSessionAndAddEquipment);

    const confirmAddBtn = document.getElementById('confirmAddToSession');
    if (confirmAddBtn) confirmAddBtn.addEventListener('click', addEquipmentToActiveSession);
});

// Barcode print functions (need to be global scope for onclick)
function printBarcode(equipmentId, barcode) {
    const barcodeModalElement = document.getElementById('barcodePrintModal');
    if (!barcodeModalElement) return console.error('Barcode print modal not found!');
    const barcodeModal = new bootstrap.Modal(barcodeModalElement);

    document.getElementById('print-barcode-equipment-id').value = equipmentId;
    document.getElementById('print-barcode-value').value = barcode;

    loadBarcodePreviews(barcode);
    barcodeModal.show();
}

function loadBarcodePreviews(barcode) {
    const baseUrl = '/api/v1/barcodes/';
    const code128Preview = document.getElementById('code128-preview');
    const code128Text = document.getElementById('code128-text');
    const datamatrixPreview = document.getElementById('datamatrix-preview');
    const datamatrixText = document.getElementById('datamatrix-text');

    if(code128Preview) code128Preview.src = `${baseUrl}${barcode}/image?barcode_type=code128`;
    if(code128Text) code128Text.textContent = barcode;
    if(datamatrixPreview) datamatrixPreview.src = `${baseUrl}${barcode}/image?barcode_type=datamatrix`;
    if(datamatrixText) datamatrixText.textContent = barcode;
}

function doPrintBarcode(barcodeType) {
    const equipmentId = document.getElementById('print-barcode-equipment-id').value;
    const barcode = document.getElementById('print-barcode-value').value;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const containerStyleClass = barcodeType === 'datamatrix' ? 'barcode-container-datamatrix' : 'barcode-container-linear';
    const printContent = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Печать</title><style>
        @page { size: 30mm 10mm; margin: 0; }
        body { font-family: Arial, sans-serif; text-align: center; padding: 0; margin: 0; width: 30mm; height: 10mm; overflow: hidden; }
        .barcode-container-linear { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
        .barcode-container-datamatrix { width: 100%; height: 100%; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; padding-left: 1mm; box-sizing: border-box; }
        .barcode-image { max-width: ${barcodeType === 'datamatrix' ? '9mm' : '28mm'}; height: ${barcodeType === 'datamatrix' ? '9mm' : '7mm'}; object-fit: contain; display: block; }
        .barcode-text { font-size: 6px; font-family: monospace; word-break: break-all; line-height: 1; ${barcodeType === 'datamatrix' ? 'margin-left: 1mm;' : 'margin-top: 0.5mm;'} }
        </style></head><body><div class="${containerStyleClass}">
        <img class="barcode-image" src="/api/v1/barcodes/${barcode}/image?barcode_type=${barcodeType}" alt="Штрих-код">
        <div class="barcode-text">${barcode}</div></div></body></html>
    `;

    const printWindow = iframe.contentWindow;
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    iframe.onload = () => {
        try {
            printWindow.focus();
            printWindow.print();
        } catch (e) {
            console.error("Printing failed:", e);
            showToast('Ошибка при отправке на печать', 'danger');
        } finally {
             setTimeout(() => { if(iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 500);
        }
    };

    const barcodeModalEl = document.getElementById('barcodePrintModal');
    const barcodeModal = bootstrap.Modal.getInstance(barcodeModalEl);
    if (barcodeModal) barcodeModal.hide();

    showToast('Штрих-код отправлен на печать', 'info');
}

// Scan session functions (need to be global scope for onclick)
function addToScanSession(equipmentId, equipmentName, barcode, categoryId, categoryName) {
    // Decode potential HTML entities
    const decodedName = document.createElement('textarea');
    decodedName.innerHTML = equipmentName;
    equipmentName = decodedName.value;

    // Populate modal hidden fields
    document.getElementById('equipmentIdToAdd').value = equipmentId;
    document.getElementById('equipmentNameToAdd').textContent = equipmentName;
    document.getElementById('equipmentBarcodeToAdd').value = barcode;
    document.getElementById('equipmentCategoryIdToAdd').value = categoryId || '';
    document.getElementById('equipmentCategoryNameToAdd').value = categoryName || '';

    // Ensure scanStorage is available (should be loaded via script tag)
    if (typeof scanStorage === 'undefined') {
        console.error('scanStorage is not available!');
        showToast('Ошибка: Модуль сканирования не инициализирован.', 'danger');
        return;
    }

    const activeSession = scanStorage.getActiveSession();
    const modalElement = document.getElementById('addToScanSessionModal');
    const activeMsg = document.getElementById('activeSessionMessage');
    const noActiveMsg = document.getElementById('noActiveSessionMessage');
    const activeNameSpan = document.getElementById('activeSessionName');
    const confirmAddBtn = document.getElementById('confirmAddToSession');
    const confirmNewBtn = document.getElementById('confirmNewSession');

    if (activeSession) {
        activeMsg.classList.remove('d-none');
        noActiveMsg.classList.add('d-none');
        activeNameSpan.textContent = activeSession.name;
        confirmAddBtn.style.display = '';
        confirmNewBtn.style.display = 'none';
    } else {
        activeMsg.classList.add('d-none');
        noActiveMsg.classList.remove('d-none');
        confirmAddBtn.style.display = 'none';
        confirmNewBtn.style.display = '';
        const newSessionNameInput = document.getElementById('newSessionName');
        if (newSessionNameInput) newSessionNameInput.value = ''; // Clear input
    }

    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        console.error('addToScanSessionModal not found!');
    }
}

function createSessionAndAddEquipment() {
    const sessionNameInput = document.getElementById('newSessionName');
    const sessionName = sessionNameInput.value.trim();

    if (!sessionName) {
        showToast('Введите название сессии', 'warning');
        sessionNameInput.focus();
        return;
    }

    if (typeof scanStorage === 'undefined') return showToast('Ошибка: Модуль сканирования не инициализирован.', 'danger');

    const newSession = scanStorage.createSession(sessionName);
    scanStorage.setActiveSession(newSession.id);
    addEquipmentToSession(newSession.id);
    sessionNameInput.value = ''; // Clear input
}

function addEquipmentToActiveSession() {
    if (typeof scanStorage === 'undefined') return showToast('Ошибка: Модуль сканирования не инициализирован.', 'danger');

    const activeSession = scanStorage.getActiveSession();
    if (!activeSession) {
        showToast('Нет активной сессии', 'warning');
        const modal = bootstrap.Modal.getInstance(document.getElementById('addToScanSessionModal'));
        if (modal) modal.hide();
        return;
    }
    addEquipmentToSession(activeSession.id);
}

function addEquipmentToSession(sessionId) {
    if (typeof scanStorage === 'undefined') return showToast('Ошибка: Модуль сканирования не инициализирован.', 'danger');

    const equipmentId = parseInt(document.getElementById('equipmentIdToAdd').value);
    const equipmentName = document.getElementById('equipmentNameToAdd').textContent;
    const barcode = document.getElementById('equipmentBarcodeToAdd').value;
    const categoryId = parseInt(document.getElementById('equipmentCategoryIdToAdd').value) || null;
    const categoryName = document.getElementById('equipmentCategoryNameToAdd').value || '';

    if (isNaN(equipmentId) || !equipmentName || !barcode) {
        console.error('Invalid equipment data for session add:', { equipmentId, equipmentName, barcode });
        return showToast('Ошибка: Некорректные данные об оборудовании.', 'danger');
    }

    const equipment = {
        equipment_id: equipmentId,
        name: equipmentName,
        barcode: barcode,
        category_id: categoryId,
        category_name: categoryName
    };

    const updatedSession = scanStorage.addEquipment(sessionId, equipment);

    if (updatedSession) {
        showToast(`Оборудование "${equipmentName}" добавлено в сессию "${updatedSession.name}"`, 'success');
    } else {
        // Handle potential errors from addEquipment, e.g., duplicates
        showToast('Не удалось добавить оборудование (возможно, уже добавлено)', 'warning');
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById('addToScanSessionModal'));
    if (modal) modal.hide();
}

// Initial setup moved inside DOMContentLoaded
// Global function definitions (printBarcode, doPrintBarcode, addToScanSession, etc.) remain outside
// to be accessible via onclick attributes.
