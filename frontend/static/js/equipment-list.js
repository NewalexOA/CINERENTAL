// Import API client
import { api } from './utils/api.js';
import { buildCategoryTree, renderCategoriesRecursive } from './utils/ui-helpers.js';
import { scanStorage } from './scan-storage.js';

// Load categories for add form
async function loadCategories() {
    const formSelect = document.querySelector('select[name="category_id"]');
    const filterSelect = document.getElementById('categoryFilter');

    if (formSelect) {
        formSelect.innerHTML = '<option value="">Выберите категорию...</option>';
        formSelect.disabled = true;
    }
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Загрузка категорий...</option>';
        filterSelect.disabled = true;
    }

    try {
        const categories = await api.get('/categories');

        // Build tree structure
        const categoryTree = buildCategoryTree(categories);

        // Populate "Add Equipment" modal select
        if (formSelect) {
            formSelect.innerHTML = '<option value="">Выберите категорию...</option>';
            renderCategoriesRecursive(categoryTree, formSelect, 0);
        }

        // Populate filter select with tree structure
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Все категории</option>';
            renderCategoriesRecursive(categoryTree, filterSelect, 0);
        }

    } catch (error) {
        console.error('Error loading categories:', error);
        if (typeof showToast === 'function') showToast('Ошибка при загрузке категорий', 'danger');
        if (formSelect) {
            formSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        }
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        }
    } finally {
        if (formSelect) {
            formSelect.disabled = false;
        }
        if (filterSelect) {
            filterSelect.disabled = false;
        }
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

// Pagination state variables
let currentPage = 1;
let totalPages = 1;
let pageSize = 20; // Default page size
let totalCount = 0;

// DOM Elements
const equipmentTableBody = document.getElementById('equipmentTable');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const searchSpinner = document.getElementById('search-spinner');
const paginationElement = document.getElementById('pagination');
const pageStartElement = document.getElementById('pageStart');
const pageEndElement = document.getElementById('pageEnd');
const totalItemsElement = document.getElementById('totalItems');
const prevPageButton = document.getElementById('prevPage');
const nextPageButton = document.getElementById('nextPage');

// Debounce timer for search input
let searchDebounceTimer;

// Function to render the equipment table
function renderEquipment(items) {
    equipmentTableBody.innerHTML = ''; // Clear existing rows
    if (!items || items.length === 0) {
        const row = equipmentTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5; // Span across all columns
        cell.textContent = 'Оборудование не найдено.';
        cell.classList.add('text-center', 'text-muted');
        return;
    }

    items.forEach(item => {
        const row = equipmentTableBody.insertRow();
        const statusBadgeBg = item.status === 'AVAILABLE' ? 'bg-success' :
                            item.status === 'RENTED' ? 'bg-warning' :
                            'bg-danger'; // Or map other statuses

        // Cell for Name and Description
        const nameCell = row.insertCell();
        nameCell.innerHTML = `
            <div class="fw-bold">${item.name}</div>
            <small class="text-muted">${item.description || ''}</small>
        `;

        // Cell for Category
        row.insertCell().textContent = item.category_name;

        // Cell for Serial Number
        row.insertCell().textContent = item.serial_number || ''

        // Cell for Status
        const statusCell = row.insertCell();
        statusCell.innerHTML = `<span class="badge ${statusBadgeBg}">${item.status}</span>`;

        // Cell for Actions
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <div class="btn-group">
                <a href="/equipment/${item.id}" class="btn btn-sm btn-outline-primary" title="Подробности">
                    <i class="fas fa-info-circle"></i>
                </a>
                <button type="button" class="btn btn-sm btn-outline-secondary btn-print-barcode"
                        title="Печать штрих-кода"
                        data-equipment-id="${item.id}"
                        data-barcode="${item.barcode}">
                    <i class="fas fa-print"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-success btn-add-to-scan"
                        title="Добавить в сессию сканирования"
                        data-equipment-id="${item.id}">
                    <i class="fas fa-qrcode"></i>
                </button>
            </div>
        `;
    });
    // formatAmounts(); // Re-enable if replacement_cost is shown in the list
}

// Setup table event delegation
function setupTableEventListeners() {
    if (document.documentElement.hasAttribute('data-global-handlers-initialized')) {
        console.log('Using global event handlers, skipping table event setup');
        return;
    }

    console.log('Setting up legacy table event handlers');
    if (!equipmentTableBody) return;

    // Remove existing handler if it exists (to prevent duplication)
    equipmentTableBody.removeEventListener('click', handleTableClick);

    // Add new handler
    equipmentTableBody.addEventListener('click', handleTableClick);
}

// Table click handler
function handleTableClick(event) {
    // Find closest button
    const button = event.target.closest('button');

    // If click was not on a button, ignore
    if (!button) return;

    // Handle click on print barcode button
    if (button.classList.contains('btn-print-barcode')) {
        const equipmentId = button.dataset.equipmentId;
        const barcode = button.dataset.barcode;
        if (equipmentId && barcode) {
            event.preventDefault();
            printBarcode(equipmentId, barcode);
        }
    }

    // Handle click on add to scan button
    else if (button.classList.contains('btn-add-to-scan')) {
        const equipmentId = button.dataset.equipmentId;
        if (equipmentId) {
            event.preventDefault();
            addToScanSession(equipmentId);
        }
    }
}

// Function to update pagination UI
function updatePaginationUI() {
    if (totalCount > 0) {
        paginationElement.classList.remove('d-none');
        const startItem = (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalCount);
        pageStartElement.textContent = startItem;
        pageEndElement.textContent = endItem;
        totalItemsElement.textContent = totalCount;

        prevPageButton.parentElement.classList.toggle('disabled', currentPage <= 1);
        nextPageButton.parentElement.classList.toggle('disabled', currentPage >= totalPages);
    } else {
        paginationElement.classList.add('d-none');
    }
}

// Setuo event listeners for barcode modal
function setupBarcodeModalEventListeners() {
    const modalElement = document.getElementById('barcodePrintModal');
    if (!modalElement) return;

    modalElement.addEventListener('click', function(event) {
        const button = event.target.closest('button[data-barcode-type]');
        if (!button) return;

        const barcodeType = button.dataset.barcodeType;
        if (barcodeType) {
            event.preventDefault();
            doPrintBarcode(barcodeType);
        }
    });
}

// Function to load equipment data
async function loadEquipment() {
    if (!equipmentTableBody) return; // Exit if table body not found

    searchSpinner?.classList.remove('d-none');
    paginationElement?.classList.add('d-none'); // Hide pagination while loading

    const params = new URLSearchParams({
        page: currentPage,
        size: pageSize
    });

    const query = searchInput?.value.trim();
    const categoryId = categoryFilter?.value;
    const status = statusFilter?.value;

    if (query && query.length >= 3) params.append('query', query);
    if (categoryId) params.append('category_id', categoryId);
    if (status) params.append('status', status);

    try {
        // Assuming 'api' is a global object for API calls
        const response = await api.get(`/equipment/paginated?${params.toString()}`);

        totalCount = response.total;
        totalPages = response.pages;
        currentPage = response.page;
        pageSize = response.size;

        renderEquipment(response.items);
        updatePaginationUI();

    } catch (error) {
        console.error('Error loading equipment:', error);
        showToast('Ошибка при загрузке списка оборудования', 'danger'); // Assuming showToast is global
        equipmentTableBody.innerHTML = ''; // Clear table on error
        const row = equipmentTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.textContent = 'Не удалось загрузить оборудование.';
        cell.classList.add('text-center', 'text-danger');
        totalCount = 0; // Reset count on error
        updatePaginationUI(); // Hide pagination block on error
    } finally {
        searchSpinner?.classList.add('d-none');
    }
}

// Event listeners for filters and search
function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            const query = searchInput.value.trim();
            if (query.length === 0 || query.length >= 3) {
                searchDebounceTimer = setTimeout(() => {
                    currentPage = 1; // Reset page on new search/filter
                    loadEquipment();
                }, 500); // 500ms debounce
            } else {
                 searchSpinner?.classList.add('d-none'); // Hide spinner if query too short
            }
        });
    }

    [categoryFilter, statusFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                currentPage = 1; // Reset page on new search/filter
                loadEquipment();
            });
        }
    });

    // Pagination button listeners
    if (prevPageButton) {
        prevPageButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                loadEquipment();
            }
        });
    }

    if (nextPageButton) {
        nextPageButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                loadEquipment();
            }
        });
    }
}

// Add event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Reset any active loader first (assuming resetLoader is global)
    if (typeof resetLoader === 'function') resetLoader();

    // Setup table event delegation
    setupTableEventListeners();

    // Initial load of equipment
    loadEquipment();

    // Setup filter and pagination listeners
    setupEventListeners();

    // Load categories for the modal form
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
            data.replacement_cost = parseInt(data.replacement_cost || 0, 10);

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
            const value = parseInt(element.textContent.replace(/\s/g, ''), 10);
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

    // Setup barcode modal event listeners
    setupBarcodeModalEventListeners();
});

// Barcode print functions
function printBarcode(equipmentId, barcode) {
    const barcodeModalElement = document.getElementById('barcodePrintModal');
    if (!barcodeModalElement) return console.error('Barcode print modal not found!');

    // Use existing modal instance or create new one
    const barcodeModal = bootstrap.Modal.getInstance(barcodeModalElement) || new bootstrap.Modal(barcodeModalElement);

    // Set values in hidden fields
    document.getElementById('print-barcode-equipment-id').value = equipmentId;
    document.getElementById('print-barcode-value').value = barcode;

    // Load barcode previews
    loadBarcodePreviews(barcode);

    // Show modal
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

// Function to print selected barcode type
async function doPrintBarcode(barcodeType) {
    const barcodeModalEl = document.getElementById('barcodePrintModal');
    const barcodeValue = document.getElementById('print-barcode-value').value;

    if (!barcodeValue) {
        if (typeof showToast === 'function') showToast('Ошибка: значение штрих-кода недоступно', 'danger');
        return;
    }

    // Direct URL to the barcode image endpoint
    const imageUrl = `/api/v1/barcodes/${encodeURIComponent(barcodeValue)}/image?barcode_type=${encodeURIComponent(barcodeType)}`;
    let iframe = null;

    try {
        if (typeof showToast === 'function') showToast('Подготовка штрих-кода к печати...', 'info');

        iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px'; // Keep it non-visible
        iframe.style.height = '0px';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);

        // Determine styles based on barcode type, as in the old version
        const containerStyleClass = barcodeType === 'datamatrix' ? 'barcode-container-datamatrix' : 'barcode-container-linear';
        const imageMaxWidth = barcodeType === 'datamatrix' ? '9mm' : '28mm';
        const imageHeight = barcodeType === 'datamatrix' ? '9mm' : '7mm';
        const textStyle = barcodeType === 'datamatrix' ? 'margin-left: 1mm;' : 'margin-top: 0.5mm;';

        const printContent = `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <title>Печать штрих-кода</title>
                <style>
                    @page { size: 30mm 10mm; margin: 0; } /* Critical for label printing */
                    body { font-family: Arial, sans-serif; text-align: center; padding: 0; margin: 0; width: 30mm; height: 10mm; overflow: hidden; box-sizing: border-box; }
                    .barcode-container-linear { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
                    .barcode-container-datamatrix { width: 100%; height: 100%; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; padding-left: 1mm; box-sizing: border-box; }
                    .barcode-image { max-width: ${imageMaxWidth}; height: ${imageHeight}; object-fit: contain; display: block; }
                    .barcode-text { font-size: 6px; font-family: monospace; word-break: break-all; line-height: 1; ${textStyle} }
                </style>
            </head>
            <body>
                <div class="${containerStyleClass}">
                    <img class="barcode-image" src="${imageUrl}" alt="Штрих-код ${barcodeValue}">
                    <div class="barcode-text">${barcodeValue}</div>
                </div>
            </body>
            </html>
        `;

        const printWindow = iframe.contentWindow;
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();

        iframe.onload = () => {
            try {
                // Optional: printWindow.focus(); // May be needed for some browsers, but can also cause focus issues.
                printWindow.print();
                if (typeof showToast === 'function') showToast('Документ отправлен на печать', 'success');
            } catch (printError) {
                console.error('Ошибка при вызове диалога печати:', printError);
                if (typeof showToast === 'function') showToast('Ошибка при вызове диалога печати.', 'danger');
            } finally {
                // Cleanup iframe after a delay to allow print dialog to process
                setTimeout(() => {
                    if (iframe && iframe.parentNode === document.body) {
                        console.log("Removing iframe post-print (reverted logic)...");
                        document.body.removeChild(iframe);
                        iframe = null; // Help GC
                    }
                }, 2000); // Increased timeout slightly
            }
        };

        // Hide the modal - this was done in old examples after iframe setup
        if (barcodeModalEl) {
            const modal = bootstrap.Modal.getInstance(barcodeModalEl);
            if (modal && modal._isShown) { // Check if modal is currently shown before trying to hide
                modal.hide();
            }
        }

    } catch (error) {
        console.error('Ошибка подготовки iframe для печати:', error);
        if (typeof showToast === 'function') {
            showToast(`${error.message || 'Не удалось подготовить штрих-код к печати.'}`, 'danger');
        }
        // Ensure iframe is removed on error if it was added
        if (iframe && iframe.parentNode === document.body) {
            document.body.removeChild(iframe);
        }
    }
}

// Function to add equipment to scan session
async function addToScanSession(equipmentId, name, barcode, serialNumber, categoryId, categoryName) {
    console.log('addToScanSession called with ID:', equipmentId, 'Serial:', serialNumber);

    // Check if ID is provided
    if (!equipmentId) {
        if (typeof showToast === 'function') showToast('Ошибка: отсутствует ID оборудования', 'danger');
        return;
    }

    const modalElement = document.getElementById('addToScanSessionModal');
    if (!modalElement) return console.error('addToScanSessionModal not found!');

    // Get modal sections
    const loadingSection = document.getElementById('addToSessionLoading');
    const contentSection = document.getElementById('addToSessionContent');
    const noSessionSection = document.getElementById('noActiveSessionMessage');
    const activeSessionSection = document.getElementById('activeSessionMessage');
    const newSessionBtn = document.getElementById('confirmNewSession');
    const addToSessionBtn = document.getElementById('confirmAddToSession');

    // Show loading, hide content
    if (loadingSection) loadingSection.classList.remove('d-none');
    if (contentSection) contentSection.classList.add('d-none');

    let currentName = name;
    let currentBarcode = barcode;
    let currentSerialNumber = serialNumber;
    let currentCategoryId = categoryId;
    let currentCategoryName = categoryName;

    try {
        // If any crucial detail is missing (name, barcode), fetch full details from API
        // We also fetch if serialNumber is explicitly undefined, to ensure we have it
        if (!currentName || !currentBarcode || typeof currentSerialNumber === 'undefined') {
            console.log('Fetching full equipment details for ID:', equipmentId);
            const response = await api.get(`/equipment/${equipmentId}`);

            currentName = response.name;
            currentBarcode = response.barcode;
            currentSerialNumber = response.serial_number || null;
            currentCategoryId = response.category_id;
            currentCategoryName = response.category_name;
        }

        // Store values in hidden fields
        document.getElementById('equipmentIdToAdd').value = equipmentId;
        document.getElementById('equipmentNameToAdd').textContent = currentName;
        document.getElementById('equipmentBarcodeToAdd').value = currentBarcode;
        document.getElementById('equipmentSerialNumberToAdd').value = currentSerialNumber || '';
        document.getElementById('equipmentCategoryIdToAdd').value = currentCategoryId || '';
        document.getElementById('equipmentCategoryNameToAdd').value = currentCategoryName || '';

        // Check for active session
        const sessionInfo = await scanStorage.getActiveSession();

        // Hide loading, show content
        if (loadingSection) loadingSection.classList.add('d-none');
        if (contentSection) contentSection.classList.remove('d-none');

        if (sessionInfo) {
            // We have an active session
            console.log('Active session found:', sessionInfo);
            if (noSessionSection) noSessionSection.classList.add('d-none');
            if (activeSessionSection) activeSessionSection.classList.remove('d-none');

            document.getElementById('activeSessionName').textContent = sessionInfo.name;

            if (newSessionBtn) newSessionBtn.style.display = 'none';
            if (addToSessionBtn) addToSessionBtn.style.display = '';
        } else {
            // No active session
            console.log('No active session found');
            if (noSessionSection) noSessionSection.classList.remove('d-none');
            if (activeSessionSection) activeSessionSection.classList.add('d-none');

            if (newSessionBtn) newSessionBtn.style.display = '';
            if (addToSessionBtn) addToSessionBtn.style.display = 'none';
        }

        const bsModal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        bsModal.show();

    } catch (error) {
        console.error('Error preparing scan session:', error);
        if (typeof showToast === 'function') {
            showToast('Ошибка при подготовке сессии сканирования', 'danger');
        }

        if (loadingSection) loadingSection.classList.add('d-none');
        if (contentSection) contentSection.classList.remove('d-none');

        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
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
        // Close modal with delay
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addToScanSessionModal'));
            if (modal) modal.hide();
        }, 100);
        return;
    }
    addEquipmentToSession(activeSession.id);
}

function addEquipmentToSession(sessionId) {
    if (typeof scanStorage === 'undefined') return showToast('Ошибка: Модуль сканирования не инициализирован.', 'danger');

    const equipmentId = parseInt(document.getElementById('equipmentIdToAdd').value);
    const equipmentName = document.getElementById('equipmentNameToAdd').textContent;
    const barcode = document.getElementById('equipmentBarcodeToAdd').value;
    const serialNumber = document.getElementById('equipmentSerialNumberToAdd')?.value || null;
    const categoryId = parseInt(document.getElementById('equipmentCategoryIdToAdd').value) || null;
    const categoryName = document.getElementById('equipmentCategoryNameToAdd').value || '';

    if (isNaN(equipmentId) || !equipmentName || !barcode) {
        console.error('Invalid equipment data for session add:', { equipmentId, equipmentName, barcode, serialNumber });
        return showToast('Ошибка: Некорректные данные об оборудовании.', 'danger');
    }

    const equipmentData = {
        equipment_id: equipmentId,
        name: equipmentName,
        barcode: barcode,
        serial_number: serialNumber ? serialNumber : null,
        category_id: categoryId,
        category_name: categoryName
    };

    console.log('Data being sent to scanStorage.addEquipment:', sessionId, equipmentData);
    const result = scanStorage.addEquipment(sessionId, equipmentData);
    console.log('Result from scanStorage.addEquipment:', result);

    setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addToScanSessionModal'));
        if (modal) modal.hide();

        setTimeout(() => {
            if (result === 'duplicate_serial_exists') {
                showToast(`Оборудование "${equipmentName}" (S/N: ${serialNumber}) уже добавлено и не может быть продублировано.`, 'warning');
            } else if (result === 'quantity_incremented') {
                showToast(`Количество оборудования "${equipmentName}" увеличено в сессии "${scanStorage.getSession(sessionId)?.name}".`, 'success');
            } else if (result === 'item_added') {
                showToast(`Оборудование "${equipmentName}" добавлено в сессию "${scanStorage.getSession(sessionId)?.name}"`, 'success');
            } else if (result === 'duplicate') {
                showToast(`Оборудование "${equipmentName}" ${serialNumber ? `(S/N: ${serialNumber})` : ''} уже есть в этой сессии.`, 'warning');
            } else {
                showToast('Не удалось добавить оборудование в сессию.', 'danger');
            }
        }, 300);
    }, 100);
}

// Export functions to global scope for onclick handlers
window.printBarcode = printBarcode;
window.doPrintBarcode = doPrintBarcode;
window.addToScanSession = addToScanSession;
window.createSessionAndAddEquipment = createSessionAndAddEquipment;
window.addEquipmentToActiveSession = addEquipmentToActiveSession;

// Initialize equipment list when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    setupEventListeners();

    // Setup table event delegation
    setupTableEventListeners();

    // Load equipment data
    loadEquipment();

    // Load categories for the add form
    loadCategories();
});
