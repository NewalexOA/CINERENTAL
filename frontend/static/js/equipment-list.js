// Import API client
import { api } from './utils/api.js';
import { buildCategoryTree, renderCategoriesRecursive } from './utils/ui-helpers.js';
import { scanStorage } from './scan-storage.js';
import { Pagination } from './utils/pagination.js';

// Enable debug logging for pagination
if (window.logger && window.logger.enableComponent) {
    window.logger.enableComponent('pagination', {
        enabled: true,
        events: true,
        dataLoad: true,
        stateChanges: true
    });

    window.logger.enableComponent('api', {
        enabled: true,
        requests: true,
        responses: true,
        timing: true
    });

    console.log('🐛 Debug logging enabled for equipment pagination');
} else {
    console.log('⚠️ Logger not available yet, will try to enable later');
    // Try to enable it after a short delay
    setTimeout(() => {
        if (window.logger && window.logger.enableComponent) {
            window.logger.enableComponent('pagination', {
                enabled: true,
                events: true,
                dataLoad: true,
                stateChanges: true
            });

            window.logger.enableComponent('api', {
                enabled: true,
                requests: true,
                responses: true,
                timing: true
            });

            console.log('🐛 Debug logging enabled for equipment pagination (delayed)');
        } else {
            console.log('❌ Logger still not available');
        }
    }, 100);
}

// Global pagination instances
let equipmentTopPagination = null;
let equipmentBottomPagination = null;

// Current filters state
let currentFilters = {
    query: '',
    category_id: null,
    status: null,
    include_deleted: false
};

// Disable old equipment search system for this page immediately
console.log('🚫 Disabling global equipment search for pagination page');
window.disableGlobalEquipmentSearch = true;

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

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Helper function to get status badge CSS class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'AVAILABLE':
            return 'success';
        case 'RENTED':
            return 'warning';
        case 'MAINTENANCE':
        case 'BROKEN':
            return 'danger';
        case 'RETIRED':
            return 'secondary';
        default:
            return 'secondary';
    }
}

// Function to prevent inline styles from being applied to table elements
function protectTableStyles() {
    const table = document.querySelector('.table');
    const actionColumns = document.querySelectorAll('.actions-column');

    if (!table) return;

    console.log('🛡️ Protecting table styles from inline modifications');

    // Create MutationObserver to watch for style changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;

                // If it's a table cell or action column, remove inline styles
                if (target.classList.contains('actions-column') ||
                    target.tagName === 'TD' ||
                    target.tagName === 'TH') {

                    console.warn('⚠️ Removing inline styles from table element:', target);
                    target.removeAttribute('style');
                }
            }
        });
    });

    // Observe the entire table for changes
    observer.observe(table, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: true
    });

    // Also remove any existing inline styles
    actionColumns.forEach(col => {
        if (col.hasAttribute('style')) {
            console.warn('⚠️ Removing existing inline styles from action column');
            col.removeAttribute('style');
        }
    });
}

// Function to clean all inline styles on the page (one-time cleanup)
function cleanAllInlineStyles() {
    console.log('🧹 Cleaning all inline styles on equipment page');

    // Remove styles from table elements
    const tableElements = document.querySelectorAll('.table td, .table th, .table');
    tableElements.forEach(el => {
        if (el.hasAttribute('style')) {
            console.warn('🧹 Removing inline style from table element:', el.tagName, el.className);
            el.removeAttribute('style');
        }
    });

    // Remove styles from action columns specifically
    const actionElements = document.querySelectorAll('.actions-column, [class*="actions"]');
    actionElements.forEach(el => {
        if (el.hasAttribute('style')) {
            console.warn('🧹 Removing inline style from action element:', el.tagName, el.className);
            el.removeAttribute('style');
        }
    });

    // Remove styles from pagination selectors
    const paginationSelects = document.querySelectorAll('[id*="PageSize"], .pagination-size-select');
    paginationSelects.forEach(el => {
        if (el.hasAttribute('style')) {
            console.warn('🧹 Removing inline style from pagination selector:', el.id);
            el.removeAttribute('style');
        }
    });

    console.log('✅ Inline style cleanup completed');
}

// Diagnostic function for testing table styles (available in browser console)
window.diagnoseTableStyles = function() {
    console.group('🔍 Table Styles Diagnostic');

    const table = document.querySelector('.table');
    if (!table) {
        console.error('❌ Table not found');
        console.groupEnd();
        return;
    }

    console.log('📋 Table element:', table);
    console.log('📋 Table computed style - table-layout:', getComputedStyle(table).tableLayout);
    console.log('📋 Table computed style - min-width:', getComputedStyle(table).minWidth);

    // Check action columns
    const actionColumns = document.querySelectorAll('.actions-column, .table td:last-child, .table th:last-child');
    console.log(`📋 Found ${actionColumns.length} action columns`);

    actionColumns.forEach((col, index) => {
        console.group(`📋 Action Column ${index + 1}:`);
        console.log('Element:', col);
        console.log('Classes:', col.className);
        console.log('Inline style attribute:', col.getAttribute('style'));
        console.log('Computed width:', getComputedStyle(col).width);
        console.log('Computed min-width:', getComputedStyle(col).minWidth);
        console.log('Computed max-width:', getComputedStyle(col).maxWidth);
        console.log('Computed white-space:', getComputedStyle(col).whiteSpace);

        const btnGroup = col.querySelector('.btn-group');
        if (btnGroup) {
            console.log('Button group display:', getComputedStyle(btnGroup).display);
            console.log('Button group flex-shrink:', getComputedStyle(btnGroup).flexShrink);
        }
        console.groupEnd();
    });

    // Check if any elements have inline styles
    const elementsWithStyles = document.querySelectorAll('[style]');
    console.log(`⚠️ Elements with inline styles: ${elementsWithStyles.length}`);
    elementsWithStyles.forEach((el, index) => {
        console.log(`${index + 1}. ${el.tagName}.${el.className} - style="${el.getAttribute('style')}"`);
    });

    console.groupEnd();
};

// Equipment data loading function for pagination
async function loadEquipmentData(page = 1, size = 20) {
    console.log('📡 Loading equipment data:', { page, size, currentFilters });

    try {
        // Show search spinner
const searchSpinner = document.getElementById('search-spinner');
        if (searchSpinner) {
            searchSpinner.classList.remove('d-none');
        }

        // Build query parameters
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString()
        });

        // Add filters
        if (currentFilters.query && currentFilters.query.trim()) {
            params.append('query', currentFilters.query.trim());
        }
        if (currentFilters.category_id) {
            params.append('category_id', currentFilters.category_id.toString());
        }
        if (currentFilters.status) {
            params.append('status', currentFilters.status);
        }
        if (currentFilters.include_deleted) {
            params.append('include_deleted', 'true');
        }

        console.log('🌐 API request parameters:', params.toString());

        // Make API request to paginated endpoint
        const response = await api.get(`/equipment/paginated?${params.toString()}`);

        console.log('📦 API response:', response);

        // Update table with new data
        renderEquipment(response.items);

        // Clean and protect table styles
        cleanAllInlineStyles();
        protectTableStyles();

        // Update URL without reload
        const url = new URL(window.location);
        url.searchParams.set('page', page.toString());
        url.searchParams.set('size', size.toString());

        if (currentFilters.query && currentFilters.query.trim()) {
            url.searchParams.set('query', currentFilters.query.trim());
        } else {
            url.searchParams.delete('query');
        }

        if (currentFilters.category_id) {
            url.searchParams.set('category_id', currentFilters.category_id.toString());
        } else {
            url.searchParams.delete('category_id');
        }

        if (currentFilters.status) {
            url.searchParams.set('status', currentFilters.status);
        } else {
            url.searchParams.delete('status');
        }

        window.history.replaceState({}, '', url);

        const result = {
            items: response.items,
            total: response.total,
            page: response.page,
            size: response.size,
            pages: response.pages
        };

        console.log('✅ Data loading completed:', result);

        return result;
    } catch (error) {
        console.error('❌ Error loading equipment data:', error);
        if (typeof showToast === 'function') {
            showToast('Ошибка при загрузке данных оборудования', 'danger');
        }
        return {
            items: [],
            total: 0,
            page: 1,
            size: size,
            pages: 1
        };
    } finally {
        // Hide search spinner
        const searchSpinner = document.getElementById('search-spinner');
        if (searchSpinner) {
            searchSpinner.classList.add('d-none');
        }
    }
}

// Render equipment data in table
function renderEquipment(items) {
    const tableBody = document.getElementById('equipmentTable');
    if (!tableBody) {
        console.error('Equipment table body not found');
        return;
    }

    if (!items || items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    <i class="fas fa-search fa-2x mb-3"></i>
                    <br>Оборудование не найдено
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = items.map(item => `
        <tr>
            <td class="col-name">
                <div class="fw-bold">${item.name || ''}</div>
                <small class="text-muted">${item.description || ''}</small>
            </td>
            <td class="col-category" title="${item.category_name || ''}">${item.category_name || ''}</td>
            <td class="col-serial" title="${item.serial_number || '-'}">${item.serial_number || '-'}</td>
            <td class="col-status text-center">
                <span class="badge bg-${getStatusBadgeClass(item.status)}">
                    ${item.status || ''}
                </span>
            </td>
            <td class="col-actions text-center">
                <div class="btn-group" role="group">
                    <a href="/equipment/${item.id}" class="btn btn-sm btn-outline-primary" title="Просмотр">
                        <i class="fas fa-info-circle"></i>
                    </a>
                    <button type="button" class="btn btn-sm btn-outline-secondary btn-print-barcode"
                            data-equipment-id="${item.id}"
                            data-barcode="${item.barcode}"
                            title="Печать штрих-кода">
                        <i class="fas fa-print"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-success btn-add-to-scan"
                            data-equipment-id="${item.id}"
                            title="Добавить в сессию сканирования">
                        <i class="fas fa-qrcode"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Update tooltips after content change
    setupTableTooltips();
}

// Initialize pagination
async function initializePagination() {
    console.log('🚀 Equipment pagination initialization started');

    // Get URL parameters for initial state
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = parseInt(urlParams.get('page')) || 1;
    const initialSize = parseInt(urlParams.get('size')) || 20;

    console.log('📊 Initial pagination state:', { initialPage, initialSize });

    // Set current filters from URL
    currentFilters.query = urlParams.get('query') || '';
    currentFilters.category_id = urlParams.get('category_id') ? parseInt(urlParams.get('category_id')) : null;
    currentFilters.status = urlParams.get('status') || null;
    currentFilters.include_deleted = urlParams.get('include_deleted') === 'true';

    console.log('🔍 Current filters:', currentFilters);

    // Update form fields with URL values
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput && currentFilters.query) {
        searchInput.value = currentFilters.query;
    }
    if (categoryFilter && currentFilters.category_id) {
        categoryFilter.value = currentFilters.category_id.toString();
    }
    if (statusFilter && currentFilters.status) {
        statusFilter.value = currentFilters.status;
    }

    // Unique storage keys for equipment pagination
    const storageKeyTop = 'equipment_list_pagesize';
    const storageKeyBottom = 'equipment_list_pagesize'; // Same key for sync

    console.log('🔧 Creating top pagination...');

    // Check if pagination elements exist
    const topElements = {
        pageStart: document.getElementById('equipmentTopPageStart'),
        pageEnd: document.getElementById('equipmentTopPageEnd'),
        totalItems: document.getElementById('equipmentTopTotalItems'),
        currentPage: document.getElementById('equipmentTopCurrentPage'),
        totalPages: document.getElementById('equipmentTopTotalPages'),
        prevButton: document.getElementById('equipmentTopPrevPage'),
        nextButton: document.getElementById('equipmentTopNextPage'),
        pageSizeSelect: document.getElementById('equipmentTopPageSize')
    };

    console.log('🎯 Top pagination elements:', topElements);

    // Check for missing elements
    const missingTop = Object.entries(topElements).filter(([key, el]) => !el);
    if (missingTop.length > 0) {
        console.error('❌ Missing top pagination elements:', missingTop.map(([key]) => key));
    }

    // Initialize top pagination
    equipmentTopPagination = new Pagination({
        selectors: {
            pageStart: '#equipmentTopPageStart',
            pageEnd: '#equipmentTopPageEnd',
            totalItems: '#equipmentTopTotalItems',
            currentPage: '#equipmentTopCurrentPage',
            totalPages: '#equipmentTopTotalPages',
            prevButton: '#equipmentTopPrevPage',
            nextButton: '#equipmentTopNextPage',
            pageSizeSelect: '#equipmentTopPageSize'
        },
        options: {
            pageSize: initialSize,
            pageSizes: [20, 50, 100],
            showPageInfo: true,
            showPageSizeSelect: true,
            persistPageSize: true,
            storageKey: storageKeyTop,
            useUrlParams: true,
            autoLoadOnInit: false  // Disable auto loading
        },
        callbacks: {
            onDataLoad: loadEquipmentData,
            onPageChange: (page) => {
                console.log('📄 Top pagination page changed to:', page);
                // Sync bottom pagination
                if (equipmentBottomPagination && equipmentBottomPagination.state.currentPage !== page) {
                    equipmentBottomPagination.state.currentPage = page;
                    equipmentBottomPagination._updateUI();
                }
            },
            onPageSizeChange: (size) => {
                console.log('📏 Top pagination page size changed to:', size);
                // Sync bottom pagination
                if (equipmentBottomPagination && equipmentBottomPagination.state.pageSize !== size) {
                    equipmentBottomPagination.state.pageSize = size;
                    equipmentBottomPagination._updateUI();
                }
            }
        }
    });

    console.log('✅ Top pagination created:', equipmentTopPagination);

    console.log('🔧 Creating bottom pagination...');

    // Initialize bottom pagination
    equipmentBottomPagination = new Pagination({
        selectors: {
            pageStart: '#equipmentBottomPageStart',
            pageEnd: '#equipmentBottomPageEnd',
            totalItems: '#equipmentBottomTotalItems',
            currentPage: '#equipmentBottomCurrentPage',
            totalPages: '#equipmentBottomTotalPages',
            prevButton: '#equipmentBottomPrevPage',
            nextButton: '#equipmentBottomNextPage',
            pageSizeSelect: '#equipmentBottomPageSize'
        },
        options: {
            pageSize: initialSize,
            pageSizes: [20, 50, 100],
            showPageInfo: true,
            showPageSizeSelect: true,
            persistPageSize: true,
            storageKey: storageKeyBottom,
            useUrlParams: true,
            autoLoadOnInit: false  // Disable auto loading
        },
        callbacks: {
            onDataLoad: loadEquipmentData,
            onPageChange: (page) => {
                console.log('📄 Bottom pagination page changed to:', page);
                // Sync top pagination
                if (equipmentTopPagination && equipmentTopPagination.state.currentPage !== page) {
                    equipmentTopPagination.state.currentPage = page;
                    equipmentTopPagination._updateUI();
                }
            },
            onPageSizeChange: (size) => {
                console.log('📏 Bottom pagination page size changed to:', size);
                // Sync top pagination
                if (equipmentTopPagination && equipmentTopPagination.state.pageSize !== size) {
                    equipmentTopPagination.state.pageSize = size;
                    equipmentTopPagination._updateUI();
                }
            }
        }
    });

    console.log('✅ Bottom pagination created:', equipmentBottomPagination);

    // Set initial page if from URL
    if (initialPage > 1) {
        console.log('🔄 Setting initial page to:', initialPage);
        equipmentTopPagination.state.currentPage = initialPage;
        equipmentBottomPagination.state.currentPage = initialPage;
    }

    console.log('📡 Loading initial data...');
    // Load initial data only once for both paginations
    const initialData = await loadEquipmentData(initialPage, initialSize);

    // Update both paginations with the same data
    if (initialData && equipmentTopPagination && equipmentBottomPagination) {
        console.log('🔄 Updating pagination UI with initial data');

        // Update top pagination
        equipmentTopPagination._updateState(initialData);
        equipmentTopPagination._updateUI();

        // Update bottom pagination
        equipmentBottomPagination._updateState(initialData);
        equipmentBottomPagination._updateUI();
    }

    // Show pagination elements
    const topPagination = document.getElementById('equipmentTopPagination');
    const bottomPagination = document.getElementById('equipmentBottomPagination');

    console.log('👁️ Pagination containers:', {
        topPagination: topPagination ? `${topPagination.tagName}#${topPagination.id}.${topPagination.className}` : null,
        bottomPagination: bottomPagination ? `${bottomPagination.tagName}#${bottomPagination.id}.${bottomPagination.className}` : null
    });

    if (topPagination) {
        console.log('🔍 Top pagination classes before removal:', topPagination.className);
        topPagination.classList.remove('d-none');
        console.log('🔍 Top pagination classes after removal:', topPagination.className);
        console.log('✅ Top pagination shown');
    } else {
        console.error('❌ Top pagination container not found');
    }

    if (bottomPagination) {
        console.log('🔍 Bottom pagination classes before removal:', bottomPagination.className);
        bottomPagination.classList.remove('d-none');
        console.log('🔍 Bottom pagination classes after removal:', bottomPagination.className);
        console.log('✅ Bottom pagination shown');
    } else {
        console.error('❌ Bottom pagination container not found');
    }

    console.log('🎉 Equipment pagination initialization completed');

    // Clean any existing inline styles first
    cleanAllInlineStyles();

    // Protect table styles from modifications
    protectTableStyles();
}

// Debounce timer for search input
let searchDebounceTimer;

// Setup event listeners for filters
function setupFilterEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                currentFilters.query = e.target.value;
                // Reset to first page when filtering
                if (equipmentTopPagination) {
                    equipmentTopPagination.reset();
                }
            }, 300);
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentFilters.category_id = e.target.value ? parseInt(e.target.value) : null;
            // Reset to first page when filtering
            if (equipmentTopPagination) {
                equipmentTopPagination.reset();
        }
    });
}

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentFilters.status = e.target.value || null;
            // Reset to first page when filtering
            if (equipmentTopPagination) {
                equipmentTopPagination.reset();
            }
        });
    }
}

// Setup table event listeners (for buttons in the table)
function setupTableEventListeners() {
    const equipmentTableBody = document.getElementById('equipmentTable');
    if (equipmentTableBody) {
        equipmentTableBody.addEventListener('click', handleTableClick);

        // Add tooltip support for truncated text
        setupTableTooltips();
    }
}

// Setup tooltips for truncated text in table cells
function setupTableTooltips() {
    const equipmentTableBody = document.getElementById('equipmentTable');
    if (!equipmentTableBody) return;

    // Add tooltips to cells that might be truncated
    equipmentTableBody.addEventListener('mouseenter', (event) => {
        const cell = event.target.closest('td');
        if (!cell) return;

        // Skip first (название) and last (действия) columns
        const cellIndex = Array.from(cell.parentNode.children).indexOf(cell);
        if (cellIndex === 0 || cellIndex === 4) return;

        // Check if text is truncated
        if (cell.offsetWidth < cell.scrollWidth) {
            cell.title = cell.textContent.trim();
        }
    }, true);

    equipmentTableBody.addEventListener('mouseleave', (event) => {
        const cell = event.target.closest('td');
        if (!cell) return;

        // Remove title to prevent default tooltip
        cell.removeAttribute('title');
    }, true);
}

function handleTableClick(event) {
    // Handle print barcode button
    if (event.target.closest('.btn-print-barcode')) {
        const button = event.target.closest('.btn-print-barcode');
        const equipmentId = button.getAttribute('data-equipment-id');
        const barcode = button.getAttribute('data-barcode');
        printBarcode(equipmentId, barcode);
    }

    // Handle add to scan session button
    if (event.target.closest('.btn-add-to-scan')) {
        const button = event.target.closest('.btn-add-to-scan');
        const equipmentId = button.getAttribute('data-equipment-id');

        // Get equipment details from the row
        const row = button.closest('tr');
        const nameElement = row.querySelector('.fw-bold');
        const name = nameElement ? nameElement.textContent : '';

        addToScanSession(equipmentId, name, '', '', '', '');
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
    const modal = document.getElementById('addToScanSessionModal');
    if (!modal) return;

    // Get or create Bootstrap modal instance
    let modalInstance = bootstrap.Modal.getInstance(modal);
    if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modal);
    }

    const loadingDiv = document.getElementById('addToSessionLoading');
    const contentDiv = document.getElementById('addToSessionContent');
    const noActiveMessage = document.getElementById('noActiveSessionMessage');
    const activeMessage = document.getElementById('activeSessionMessage');
    const equipmentNameSpan = document.getElementById('equipmentNameToAdd');
    const activeSessionNameSpan = document.getElementById('activeSessionName');
    const confirmNewBtn = document.getElementById('confirmNewSession');
    const confirmAddBtn = document.getElementById('confirmAddToSession');

    // Set hidden values
    document.getElementById('equipmentIdToAdd').value = equipmentId;
    document.getElementById('equipmentBarcodeToAdd').value = barcode || '';
    document.getElementById('equipmentSerialNumberToAdd').value = serialNumber || '';
    document.getElementById('equipmentCategoryIdToAdd').value = categoryId || '';
    document.getElementById('equipmentCategoryNameToAdd').value = categoryName || '';

    // Show modal and loading state
    modalInstance.show();

    loadingDiv.classList.remove('d-none');
    contentDiv.classList.add('d-none');

    try {
        // Get equipment details first
        const equipment = await api.get(`/equipment/${equipmentId}`);
        equipmentNameSpan.textContent = equipment.name;

        // Check for active session
        const activeSession = scanStorage.getActiveSession();

        if (activeSession) {
            // Show active session message
            activeSessionNameSpan.textContent = activeSession.name;
            activeMessage.classList.remove('d-none');
            noActiveMessage.classList.add('d-none');
            confirmAddBtn.style.display = 'inline-block';
            confirmNewBtn.style.display = 'none';
        } else {
            // Show new session form
            noActiveMessage.classList.remove('d-none');
            activeMessage.classList.add('d-none');
            confirmNewBtn.style.display = 'inline-block';
            confirmAddBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading equipment data:', error);
        if (typeof showToast === 'function') {
            showToast('Ошибка при загрузке данных оборудования', 'danger');
        }
        modalInstance.hide();
    } finally {
        loadingDiv.classList.add('d-none');
        contentDiv.classList.remove('d-none');
    }
}

function createSessionAndAddEquipment() {
    const sessionNameInput = document.getElementById('newSessionName');
    const sessionName = sessionNameInput.value.trim();

    if (!sessionName) {
        if (typeof showToast === 'function') {
        showToast('Введите название сессии', 'warning');
        }
        return;
    }

    // Create new session
    const sessionId = scanStorage.createSession(sessionName);
    addEquipmentToSession(sessionId);
}

function addEquipmentToActiveSession() {
    const activeSession = scanStorage.getActiveSession();
    if (activeSession) {
    addEquipmentToSession(activeSession.id);
    }
}

function addEquipmentToSession(sessionId) {
    const equipmentId = document.getElementById('equipmentIdToAdd').value;
    const equipmentName = document.getElementById('equipmentNameToAdd').textContent;
    const barcode = document.getElementById('equipmentBarcodeToAdd').value;
    const serialNumber = document.getElementById('equipmentSerialNumberToAdd').value;
    const categoryId = document.getElementById('equipmentCategoryIdToAdd').value;
    const categoryName = document.getElementById('equipmentCategoryNameToAdd').value;

    const equipmentData = {
        id: parseInt(equipmentId),
        name: equipmentName,
        barcode: barcode,
        serial_number: serialNumber,
        category_id: categoryId ? parseInt(categoryId) : null,
        category_name: categoryName
    };

    try {
        scanStorage.addEquipment(sessionId, equipmentData);
        if (typeof showToast === 'function') {
            showToast(`Оборудование добавлено в сессию сканирования`, 'success');
        }
    } catch (error) {
        console.error('Error adding to session:', error);
        if (typeof showToast === 'function') {
            showToast('Ошибка при добавлении в сессию', 'danger');
        }
    } finally {
        // Ensure modal is always closed
        const modalElement = document.getElementById('addToScanSessionModal');
        const confirmBtn = document.getElementById('confirmAddToSession'); // Get the button that retains focus

        if (confirmBtn) {
            confirmBtn.blur(); // Explicitly remove focus from the button
        }

        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
    }
}

// Setup add equipment modal functionality
function setupAddEquipmentModal() {
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
        // Trigger change event on load to set initial state
        generateBarcodeCheckbox.dispatchEvent(new Event('change'));
    }

    // Form submission handler
    const addEquipmentBtn = document.getElementById('addEquipment');
    if (addEquipmentBtn) {
        addEquipmentBtn.addEventListener('click', async function() {
            const form = document.getElementById('addEquipmentForm');

            // Check form validity
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

            try {
                console.log('Sending data:', data);
                const response = await api.post('/equipment/', data);
                if (typeof showToast === 'function') {
                    showToast('Оборудование успешно добавлено', 'success');
                }

                // Close modal, reset form, and reload data
                const modalEl = document.getElementById('addEquipmentModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                form.reset();

                // Re-trigger checkbox change to reset barcode input state
                if (generateBarcodeCheckbox) {
                    generateBarcodeCheckbox.dispatchEvent(new Event('change'));
                }

                // Reload current page data instead of full page reload
                if (equipmentTopPagination) {
                    equipmentTopPagination.loadData();
                }

            } catch (error) {
                console.error('Error adding equipment:', error);

                // Clear previous validation errors
                form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
                form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

                let errorMessage = 'Ошибка при добавлении оборудования';

                if (error.response) {
                    const details = error.response.data?.detail;

                    if (Array.isArray(details)) { // Pydantic validation errors
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
                    } else if (typeof details === 'string') {
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
                                errorMessage = 'Серийный номер уже используется.';
                            }
                        }
                    }
                }

                if (typeof showToast === 'function') {
                    showToast(errorMessage, 'danger');
                }

            } finally {
                // Restore button state
                this.disabled = false;
                this.innerHTML = originalButtonText;
            }
        });
    }
}

// Initialize scan session modal functionality
function initializeScanSessionModal() {
    // Add event listeners for scan session modal buttons
    const confirmNewBtn = document.getElementById('confirmNewSession');
    if (confirmNewBtn) {
        confirmNewBtn.addEventListener('click', createSessionAndAddEquipment);
    }

    const confirmAddBtn = document.getElementById('confirmAddToSession');
    if (confirmAddBtn) {
        confirmAddBtn.addEventListener('click', addEquipmentToActiveSession);
    }

    const modalElement = document.getElementById('addToScanSessionModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', function () {
            document.body.focus();
        });
    }
}

// Main setup function
async function setupEventListeners() {
    console.log('🎬 Equipment page setup started');

    // Initialize components
    console.log('📚 Loading categories...');
    await loadCategories();

    console.log('🎛️ Setting up filter event listeners...');
    setupFilterEventListeners();

    console.log('🔧 Setting up table event listeners...');
    setupTableEventListeners();

    console.log('🖼️ Setting up barcode modal event listeners...');
    setupBarcodeModalEventListeners();

    // Initialize pagination after categories are loaded
    console.log('📄 Initializing pagination...');
    await initializePagination();

    // Initialize add equipment modal functionality
    console.log('➕ Setting up add equipment modal...');
    setupAddEquipmentModal();

    // Initialize scan session functionality
    console.log('📱 Setting up scan session modal...');
    initializeScanSessionModal();

    console.log('🎉 Equipment page setup completed');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM ready, starting equipment page initialization');
    setupEventListeners();
});

// Export function globally for main.js integration
window.addToScanSession = addToScanSession;
