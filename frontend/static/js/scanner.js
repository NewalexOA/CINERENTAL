import { scanStorage } from './scan-storage.js';
import { formatCurrency } from './project/project-utils.js';

/**
 * Scanner page logic
 */

// Global variables
let scanner = null;
let currentEquipment = null;
let autoSyncIntervalId = null;
const AUTO_SYNC_INTERVAL_MS = 60000;

// Initialize modal scanner
function initModalScanner() {
    const scannerModal = document.getElementById('scannerModal');
    if (!scannerModal) return;

    let modalScanner = null;

    scannerModal.addEventListener('show.bs.modal', () => {
        if (!modalScanner) {
            modalScanner = new window.BarcodeScanner();
            // Override scanner handlers
            modalScanner.onScan = (equipment) => {
                const resultDiv = document.getElementById('scannerResult');
                if (resultDiv) {
                    resultDiv.innerHTML = `
                        <div class="alert alert-success">
                            <h6>${equipment.name}</h6>
                            <p class="mb-0">Категория: ${equipment.category.name}</p>
                            <p class="mb-0">Статус: ${equipment.status}</p>
                        </div>
                    `;
                }
                showToast('Оборудование успешно отсканировано', 'success');
            };

            modalScanner.onError = (error) => {
                const resultDiv = document.getElementById('scannerResult');
                if (resultDiv) {
                    resultDiv.innerHTML = `
                        <div class="alert alert-danger">
                            Ошибка сканирования: ${error.message}
                        </div>
                    `;
                }
                showToast('Ошибка сканирования', 'danger');
            };
        }
        modalScanner.start();
    });

    scannerModal.addEventListener('hide.bs.modal', () => {
        if (modalScanner) {
            modalScanner.stop();
        }
    });
}

// Initialize scanner
async function initScanner() {
    try {
        // Wait for scanStorage to be available
        if (!scanStorage) {
            console.error('scanStorage is not available');
            return;
        }

        // Get active session ID before initializing scanner
        const activeSession = scanStorage.getActiveSession();
        const activeSessionId = activeSession?.id;

        // Initialize scanner with active session ID
        scanner = new window.BarcodeScanner(
            handleScan,
            handleError,
            activeSessionId
        );

        // Start listening for scanner input
        scanner.start();
        updateScannerControls(true);

        // Initialize session management
        initSessionManagement();

        // Check for active session on load
        if (activeSession) {
            updateSessionUI(activeSession);
            startAutoSyncTimer();
        } else {
            // Optionally show message or create a new default session
            document.getElementById('noActiveSessionMessage').classList.remove('d-none');
        }
    } catch (error) {
        console.error('Error initializing scanner:', error);
        showToast('Ошибка инициализации сканера', 'danger');
    }
}

// Initialize session management
function initSessionManagement() {
    // Check for active session
    const activeSession = scanStorage.getActiveSession();
    updateSessionUI(activeSession);

    // Event listeners for session management
    initEventListeners();
}

// Update session UI based on active session
function updateSessionUI(session) {
    const noActiveSessionMessage = document.getElementById('noActiveSessionMessage');
    const activeSessionInfo = document.getElementById('activeSessionInfo');
    const sessionName = document.getElementById('sessionName');
    const itemCount = document.getElementById('itemCount');
    const itemsList = document.getElementById('sessionItemsList');
    const noSessionItems = document.getElementById('noSessionItems');
    const sessionEquipmentTable = document.getElementById('sessionEquipmentTable');

    if (!noActiveSessionMessage || !activeSessionInfo || !sessionName || !itemCount || !itemsList) {
        console.error('Required session UI elements not found');
        return;
    }

    if (session) {
        noActiveSessionMessage.classList.add('d-none');
        activeSessionInfo.classList.remove('d-none');
        sessionName.textContent = session.name;
        const totalItems = session.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        itemCount.textContent = `${totalItems} шт. (${session.items.length} поз.)`;

        // Clear the list before updating to avoid duplicates
        itemsList.innerHTML = '';

        if (session.items.length === 0) {
            if (noSessionItems) {
                noSessionItems.classList.remove('d-none');
            }
            if (sessionEquipmentTable && sessionEquipmentTable.querySelector('table')) {
                sessionEquipmentTable.querySelector('table').classList.add('d-none');
            }
        } else {
            console.log('Updating session UI with items:', session.items);

            if (noSessionItems) {
                noSessionItems.classList.add('d-none');
            }
            if (sessionEquipmentTable && sessionEquipmentTable.querySelector('table')) {
                sessionEquipmentTable.querySelector('table').classList.remove('d-none');
            }

            // Render each item in the table
            session.items.forEach(item => {
                const hasSerialNumber = !!item.serial_number;
                const quantity = item.quantity || 1;

                // Define buttons based on whether the item has a serial number
                let buttonsHtml;
                if (hasSerialNumber) {
                    // Item WITH serial number: Show remove button
                    buttonsHtml = `
                        <button class="btn btn-sm btn-outline-danger remove-item-btn" data-equipment-id="${item.equipment_id}" title="Удалить">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                } else {
                    // Item WITHOUT serial number: Show increment and decrement/remove buttons
                    let firstButtonHtml;
                    if (quantity > 1) {
                        // Quantity > 1: Show decrement button
                        firstButtonHtml = `
                            <button class="btn btn-outline-secondary decrement-item-btn" data-equipment-id="${item.equipment_id}" title="Уменьшить кол-во">
                                <i class="fas fa-minus"></i>
                            </button>
                        `;
                    } else {
                        // Quantity === 1: Show remove button instead of decrement
                        firstButtonHtml = `
                            <button class="btn btn-sm btn-outline-danger remove-item-btn" data-equipment-id="${item.equipment_id}" title="Удалить">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
                    }
                    // Always show increment button
                    const incrementButtonHtml = `
                        <button class="btn btn-outline-secondary increment-item-btn" data-equipment-id="${item.equipment_id}" title="Увеличить кол-во">
                            <i class="fas fa-plus"></i>
                        </button>
                    `;
                    // Combine buttons in desired order (+ first, then -/X)
                    buttonsHtml = `
                        <div class="btn-group btn-group-sm" role="group">
                            ${incrementButtonHtml}
                            ${firstButtonHtml}
                        </div>
                    `;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div>${item.name}</div>
                        ${hasSerialNumber ? `<small class="text-muted d-block">S/N: ${item.serial_number}</small>` : ''}
                    </td>
                    <td>${item.category_name || item.category?.name || 'Без категории'}</td>
                    <td class="text-center">
                        ${quantity}
                    </td>
                    <td class="text-center">
                        ${buttonsHtml}
                    </td>
                `;
                itemsList.appendChild(row);
            });

            // Add event listeners AFTER updating the items
            attachItemButtonListeners(session.id);
        }
    } else {
        noActiveSessionMessage.classList.remove('d-none');
        activeSessionInfo.classList.add('d-none');
    }
}

// Helper function to attach listeners to item buttons
function attachItemButtonListeners(sessionId) {
    // Remove item button listener
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        // Remove existing listener before adding a new one to prevent duplicates
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            const equipmentId = parseInt(e.currentTarget.getAttribute('data-equipment-id'));
            removeEquipmentFromSession(sessionId, equipmentId); // Pass sessionId
        });
    });

    // Decrement item button listener
    document.querySelectorAll('.decrement-item-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            const equipmentId = parseInt(e.currentTarget.getAttribute('data-equipment-id'));
            handleDecrementItem(sessionId, equipmentId); // Pass sessionId
        });
    });

    // Increment item button listener
    document.querySelectorAll('.increment-item-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            const equipmentId = parseInt(e.currentTarget.getAttribute('data-equipment-id'));
            handleIncrementItem(sessionId, equipmentId); // Pass sessionId
        });
    });
}

// Handlers for increment/decrement (Need to be defined)
function handleDecrementItem(sessionId, equipmentId) {
    console.log(`Decrementing item ${equipmentId} in session ${sessionId}`);
    const updatedSession = scanStorage.decrementQuantity(sessionId, equipmentId);
    updateSessionUI(updatedSession);
}

function handleIncrementItem(sessionId, equipmentId) {
    console.log(`Incrementing item ${equipmentId} in session ${sessionId}`);
    const session = scanStorage.getSession(sessionId);
    const item = session?.items.find(i => i.equipment_id === equipmentId);
    if (item) {
        const updatedSession = scanStorage.addEquipment(sessionId, item);
        updateSessionUI(updatedSession);
    } else {
        console.error(`Could not find item with ID ${equipmentId} to increment.`);
    }
}

// Modify removeEquipmentFromSession to accept sessionId
function removeEquipmentFromSession(sessionId, equipmentId) {
    if (!sessionId) {
        console.error("Cannot remove item, session ID is missing.");
        return;
    }

    const updatedSession = scanStorage.removeEquipment(sessionId, equipmentId);
    updateSessionUI(updatedSession);

    showToast('Оборудование удалено из сессии', 'success');
}

// Show new session modal
function showNewSessionModal() {
    const modal = new bootstrap.Modal('#newSessionModal');
    document.getElementById('newSessionForm').reset();
    modal.show();
}

// Create new session
function createNewSession() {
    const form = document.getElementById('newSessionForm');
    const sessionName = form.elements.session_name.value.trim();

    if (!sessionName) {
        showToast('Введите название сессии', 'warning');
        return;
    }

    const session = scanStorage.createSession(sessionName);
    updateSessionUI(session);

    // Hide modal
    bootstrap.Modal.getInstance('#newSessionModal').hide();
    showToast('Сессия успешно создана', 'success');
}

// Show load session modal
function showLoadSessionModal() {
    // Populate local sessions
    const localSessions = scanStorage.getSessions();
    const localSessionsList = document.getElementById('localSessionsList');

    if (localSessions.length === 0) {
        localSessionsList.innerHTML = '<div class="text-center text-muted py-3">Нет сохраненных сессий</div>';
    } else {
        localSessionsList.innerHTML = '';
        localSessions.forEach(session => {
            const lastUpdate = new Date(session.updatedAt).toLocaleString();
            const totalItems = session.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            const sessionElement = document.createElement('a');
            sessionElement.href = '#';
            sessionElement.className = 'list-group-item list-group-item-action';
            sessionElement.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${session.name}</h6>
                    <small>${totalItems} шт. (${session.items.length} поз.)</small>
                </div>
                <small class="text-muted">Обновлено: ${lastUpdate}</small>
            `;
            sessionElement.addEventListener('click', (e) => {
                e.preventDefault();
                scanStorage.setActiveSession(session.id);
                updateSessionUI(session);
                bootstrap.Modal.getInstance('#loadSessionModal').hide();
                showToast('Сессия загружена', 'success');
            });
            localSessionsList.appendChild(sessionElement);
        });
    }

    // Show modal
    const modal = new bootstrap.Modal('#loadSessionModal');
    modal.show();

    // Load server sessions when switching to that tab
    document.querySelector('button[data-bs-target="#serverSessions"]').addEventListener('click', loadServerSessions);

    // Ensure listeners are added only once or cleared first
    const localList = document.getElementById('localSessionsList');
    const serverList = document.getElementById('serverSessionsList');
    localList.querySelectorAll('.load-local-session-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true)); // Simple way to remove old listeners
    });
    serverList.querySelectorAll('.load-server-session-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
     localList.querySelectorAll('.delete-local-session-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
     serverList.querySelectorAll('.delete-server-session-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });

    // Add event listeners for loading sessions (Local)
    localList.querySelectorAll('.load-local-session-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sessionId = e.currentTarget.getAttribute('data-session-id');
            const session = scanStorage.setActiveSession(sessionId);
            updateSessionUI(session);
            startAutoSyncTimer();
            bootstrap.Modal.getInstance('#loadSessionModal').hide();
            showToast('Локальная сессия загружена', 'success');
        });
    });

    // Add event listeners for loading sessions (Server)
    serverList.querySelectorAll('.load-server-session-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const serverSessionId = e.currentTarget.getAttribute('data-session-id');
            try {
                console.log('Начинаем импорт сессии с сервера:', serverSessionId);
                const session = await scanStorage.importSessionFromServer(serverSessionId);
                if (session) {
                    console.log('Сессия успешно импортирована:', session);
                    updateSessionUI(session);
                    startAutoSyncTimer();
                    bootstrap.Modal.getInstance('#loadSessionModal').hide();
                    showToast('Сессия успешно импортирована с сервера', 'success');
                } else {
                    console.error('Сессия не была импортирована (undefined)');
                    showToast('Ошибка импорта сессии: сервер вернул пустые данные', 'danger');
                }
            } catch (error) {
                console.error('Error importing session:', error);
                showToast('Ошибка импорта сессии: ' + (error.message || 'Неизвестная ошибка'), 'danger');
            }
        });
    });

    // Add event listeners for deleting sessions (Local)
    localList.querySelectorAll('.delete-local-session-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sessionId = e.currentTarget.getAttribute('data-session-id');
            if (confirm('Удалить локальную сессию?')) {
                const isActive = scanStorage.getActiveSession()?.id === sessionId;
                scanStorage.deleteSession(sessionId);
                refreshLocalSessionsList();
                if (isActive) {
                    stopAutoSyncTimer();
                    updateSessionUI(null);
                }
                showToast('Локальная сессия удалена', 'success');
            }
        });
    });

     // Add event listeners for deleting sessions (Server) - Needs backend endpoint
     serverList.querySelectorAll('.delete-server-session-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const serverSessionId = e.currentTarget.getAttribute('data-session-id');
            if (confirm('Удалить сессию с сервера? Локальная копия (если есть) останется.')) {
                 try {
                    // TODO: Implement scanSync.deleteSessionFromServer(serverSessionId);
                    await scanStorage.deleteSessionFromServer(serverSessionId);
                    loadServerSessions();
                    showToast('Сессия удалена с сервера', 'success');
                } catch (error) {
                    showToast('Ошибка удаления сессии с сервера', 'danger');
                }
            }
        });
    });
}

// Load server sessions
async function loadServerSessions() {
    const serverSessionsList = document.getElementById('serverSessionsList');
    serverSessionsList.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>';

    try {
        // Assume user ID is available in some way, for demo we'll use 1
        const userId = 1; // This should be replaced with actual user ID
        const serverSessions = await scanStorage.getUserSessionsFromServer(userId);

        if (serverSessions.length === 0) {
            serverSessionsList.innerHTML = '<div class="text-center text-muted py-3">Нет сохраненных сессий на сервере</div>';
        } else {
            serverSessionsList.innerHTML = '';
            serverSessions.forEach(session => {
                const lastUpdate = new Date(session.updated_at).toLocaleString();
                const totalItems = session.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

                const sessionElement = document.createElement('a');
                sessionElement.href = '#';
                sessionElement.className = 'list-group-item list-group-item-action';
                sessionElement.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${session.name}</h6>
                        <small>${totalItems} шт. (${session.items.length} поз.)</small>
                    </div>
                    <small class="text-muted">Обновлено: ${lastUpdate}</small>
                `;
                sessionElement.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        console.log('Начинаем импорт сессии с сервера по клику:', session.id);
                        const importedSession = await scanStorage.importSessionFromServer(session.id);
                        if (importedSession) {
                            console.log('Сессия успешно импортирована по клику:', importedSession);
                            updateSessionUI(importedSession);
                            bootstrap.Modal.getInstance('#loadSessionModal').hide();
                            showToast('Сессия успешно импортирована с сервера', 'success');
                        } else {
                            console.error('Сессия не была импортирована (undefined)');
                            showToast('Ошибка импорта сессии: сервер вернул пустые данные', 'danger');
                        }
                    } catch (error) {
                        console.error('Error importing session:', error);
                        showToast('Ошибка импорта сессии: ' + (error.message || 'Неизвестная ошибка'), 'danger');
                    }
                });
                serverSessionsList.appendChild(sessionElement);
            });
        }
    } catch (error) {
        console.error('Error loading server sessions:', error);
        serverSessionsList.innerHTML = '<div class="text-center text-danger py-3">Ошибка загрузки сессий с сервера</div>';
        showToast('Ошибка получения сессий с сервера: ' + (error.message || 'Неизвестная ошибка'), 'danger');
    }
}

// Show rename session modal
function showRenameSessionModal() {
    const activeSession = scanStorage.getActiveSession();
    if (!activeSession) return;

    const form = document.getElementById('renameSessionForm');
    form.elements.new_name.value = activeSession.name;

    const modal = new bootstrap.Modal('#renameSessionModal');
    modal.show();
}

// Rename active session
function renameActiveSession() {
    const activeSession = scanStorage.getActiveSession();
    if (!activeSession) return;

    const form = document.getElementById('renameSessionForm');
    const newName = form.elements.new_name.value.trim();

    if (!newName) {
        showToast('Введите название сессии', 'warning');
        return;
    }

    const updatedSession = scanStorage.updateSessionName(activeSession.id, newName);
    updateSessionUI(updatedSession);

    // Hide modal
    bootstrap.Modal.getInstance('#renameSessionModal').hide();
    showToast('Сессия переименована', 'success');
}

// Confirm clearing session
function confirmClearSession() {
    const activeSession = scanStorage.getActiveSession();
    if (!activeSession) return;

    if (confirm('Вы уверены, что хотите очистить все позиции из текущей сессии?')) {
        const updatedSession = scanStorage.clearEquipment(activeSession.id);
        updateSessionUI(updatedSession);
        showToast('Сессия очищена', 'success');
    }
}

// Sync active session with server
async function syncActiveSession() {
    const activeSession = scanStorage.getActiveSession();
    if (!activeSession) return;

    try {
        const syncedSession = await scanStorage.syncSessionWithServer(activeSession.id);
        if (syncedSession) {
            updateSessionUI(syncedSession);
            showToast('Сессия успешно сохранена на сервере', 'success');
        }
    } catch (error) {
        console.error('Error syncing session:', error);
        showToast('Ошибка синхронизации с сервером: ' + (error.message || 'Неизвестная ошибка'), 'danger');
    }
}

// Create project from session
function createProjectFromSession() {
    const activeSession = scanStorage.getActiveSession();
    if (!activeSession || activeSession.items.length === 0) {
        showToast('Нет оборудования для создания проекта', 'warning');
        return;
    }

    // Prepare data for the project creation page
    // Map session items to the expected 'bookings' format
    const projectData = {
        name: activeSession.name,
        client_id: null,
        description: null,
        notes: null,
        start_date: null,
        end_date: null,
        bookings: activeSession.items.map(item => ({
            equipment_id: item.equipment_id,
            equipment_name: item.name,
            price_per_day: item.price_per_day || 0,
            category: item.category_name || 'Unknown',
            quantity: item.quantity || 1,
            start_date: null,
            end_date: null
        }))
    };

    // Save data to sessionStorage for the project page to pick up
    try {
        sessionStorage.setItem('newProjectData', JSON.stringify(projectData));
        console.log('Saved project data to sessionStorage:', projectData);
        window.location.href = `/projects/new?session_id=${activeSession.id}`;
    } catch (e) {
        console.error('Error saving project data to sessionStorage:', e);
        showToast('Ошибка подготовки данных для проекта', 'danger');
    }
}

// Handle successful scan
async function handleScan(equipment, scanInfo = { isDuplicate: false, addedToSession: false }) {
    currentEquipment = equipment;
    updateScanResult(equipment);
    updateQuickActions(true);
    addToScanHistory(equipment);

    // Handle session addition based on scanInfo flags
    const activeSession = scanStorage.getActiveSession();
    if (activeSession) {
        if (scanInfo.isDuplicate) {
             showToast(`Оборудование "${equipment.name}" уже есть в сессии`, 'info');
             // Optionally, briefly highlight the existing item in the list?
        } else if (scanInfo.addedToSession) {
             // Item was successfully added by processBarcode
             updateSessionUI(scanStorage.getSession(activeSession.id));
             showToast(`Оборудование "${equipment.name}" добавлено в сессию`, 'success');
        }
    }
}

// Handle scan error
function handleError(error) {
    const errorContainer = document.getElementById('scannerErrorContainer');
    const errorText = document.getElementById('scannerErrorText');
    errorText.textContent = error.message;
    errorContainer.classList.remove('d-none');
    showToast(error.message, 'danger');
    updateScanResult(null);
    updateQuickActions(false);
    setTimeout(() => {
        errorContainer.classList.add('d-none');
    }, 10000);
}

// Update scan result display using template
function updateScanResult(equipment) {
    const container = document.getElementById('scanResult');
    const errorContainer = document.getElementById('scannerErrorContainer');
    const errorText = document.getElementById('scannerErrorText');

    if (!container || !errorContainer || !errorText) {
        console.error('Required scan result elements not found');
        return;
    }

    errorContainer.classList.add('d-none');
    container.innerHTML = '';

    if (!equipment) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-barcode fa-3x mb-3"></i>
                <p>Отсканируйте штрих-код, чтобы увидеть информацию</p>
            </div>
        `;
        updateQuickActions(false);
        return;
    }

    // Get the template content
    const template = document.getElementById('scan-result-template');
    if (!template) {
        console.error('Scan result template not found!');
        container.innerHTML = '<div class="alert alert-danger">Ошибка: шаблон результата сканирования не найден.</div>';
        return;
    }
    const clone = template.content.cloneNode(true);

    // Find elements within the cloned template
    const nameEl = clone.querySelector('[data-field="name"]');
    const categoryEl = clone.querySelector('[data-field="category"]');
    const barcodeEl = clone.querySelector('[data-field="barcode"] span');
    const serialEl = clone.querySelector('[data-field="serial"]');
    const serialTextEl = serialEl.querySelector('span');
    const costEl = clone.querySelector('[data-field="cost"]');
    const costTextEl = costEl.querySelector('span');
    const descriptionEl = clone.querySelector('[data-field="description"]');
    const statusEl = clone.querySelector('[data-field="status"]');
    const detailsLinkEl = clone.querySelector('[data-field="details-link"]');

    // Populate elements with data
    if (nameEl) nameEl.textContent = equipment.name || 'Без названия';
    if (categoryEl) categoryEl.textContent = `Категория: ${equipment.category_name || 'Без категории'}`;
    if (barcodeEl) barcodeEl.textContent = equipment.barcode || 'N/A';

    if (equipment.serial_number && serialEl && serialTextEl) {
        serialTextEl.textContent = equipment.serial_number;
        serialEl.style.display = '';
    } else if (serialEl) {
        serialEl.style.display = 'none';
    }

    if (equipment.replacement_cost !== null && equipment.replacement_cost !== undefined && costEl && costTextEl) {
        costTextEl.textContent = formatCurrency(equipment.replacement_cost);
        costEl.style.display = '';
    } else if (costEl) {
        costEl.style.display = 'none';
    }

    if (equipment.description && descriptionEl) {
        descriptionEl.textContent = equipment.description;
        descriptionEl.style.display = '';
    } else if (descriptionEl) {
        descriptionEl.style.display = 'none';
    }

    if (statusEl) {
        const statusText = equipment.status || 'UNKNOWN';
        statusEl.textContent = statusText;
        statusEl.className = statusEl.className.replace(/bg-\S+/g, '');
        statusEl.classList.add(`bg-${getStatusColor(statusText)}`);
    }

    if (detailsLinkEl) {
        detailsLinkEl.href = `/equipment/${equipment.id}`;
    }

    // Append the populated clone to the container
    container.appendChild(clone);
    updateQuickActions(true);
}

// Add scan to history
function addToScanHistory(equipment) {
    const container = document.getElementById('scanHistory');
    if (!container) {
        console.error('Scan history container not found');
        return;
    }

    const timestamp = moment().format('HH:mm:ss');
    const historyItem = document.createElement('div');
    historyItem.className = 'list-group-item';
    historyItem.innerHTML = `
        <div class="d-flex w-100 justify-content-between align-items-center">
            <div>
                <h6 class="mb-1">${equipment.name}</h6>
                <small class="text-muted">${equipment.category_name}</small>
            </div>
            <small class="text-muted">${timestamp}</small>
        </div>
    `;

    container.insertBefore(historyItem, container.firstChild);
}

// Update scanner control buttons
function updateScannerControls(isInitialized) {

    console.log(`Сканер ${isInitialized ? 'активен' : 'остановлен'}`);
}

// Update quick action buttons
function updateQuickActions(enabled) {
    const updateStatusBtn = document.getElementById('updateStatus');
    const viewHistoryBtn = document.getElementById('viewHistory');

    if (updateStatusBtn) {
        updateStatusBtn.disabled = !enabled;
    }
    if (viewHistoryBtn) {
        viewHistoryBtn.disabled = !enabled;
    }
}

// Load equipment history
async function loadEquipmentHistory(equipmentId) {
    const container = document.getElementById('equipmentHistoryContainer');
    if (!container) {
        console.error('Equipment history container not found');
        return;
    }

    try {
        // Get both timeline and bookings data for the equipment
        const [timelineData, bookingsData] = await Promise.all([
            api.get(`/equipment/${equipmentId}/timeline`),
            api.get(`/equipment/${equipmentId}/bookings`)
        ]);

        if (timelineData && timelineData.events && timelineData.events.length) {
            renderEquipmentTimeline(timelineData.events);
        } else {
            document.getElementById('equipmentTimeline').innerHTML = '<div class="text-center text-muted py-3">Нет данных об истории использования</div>';
        }

        if (bookingsData && bookingsData.length) {
            renderEquipmentBookings(bookingsData);
        } else {
            document.getElementById('equipmentBookings').innerHTML = '<div class="text-center text-muted py-3">Нет данных о бронированиях</div>';
        }
    } catch (error) {
        console.error('Error loading equipment history:', error);
        container.innerHTML = '<div class="alert alert-danger">Ошибка при загрузке истории оборудования</div>';
    }
}

const updateStatusBtn = document.getElementById('updateStatus');
if (updateStatusBtn) {
    updateStatusBtn.addEventListener('click', () => {
        if (currentEquipment) {
            const form = document.getElementById('updateStatusForm');
            form.elements.equipment_id.value = currentEquipment.id;
            form.elements.status.value = currentEquipment.status;
            new bootstrap.Modal('#updateStatusModal').show();
        }
    });
}

// Show manage sessions modal
function showManageSessionsModal() {
    refreshSessionsList();
    const modal = new bootstrap.Modal('#manageSessionsModal');
    modal.show();
}

// Refresh sessions list
function refreshSessionsList() {
    const sessionsList = document.getElementById('sessionsList');
    const sessions = scanStorage.getSessions();

    if (sessions.length === 0) {
        sessionsList.innerHTML = '<tr><td colspan="6" class="text-center py-3">Нет сохраненных сессий</td></tr>';
        return;
    }

    sessionsList.innerHTML = '';

    sessions.forEach(session => {
        const createdDate = new Date(session.createdAt).toLocaleString();
        const updatedDate = new Date(session.updatedAt).toLocaleString();
        const isSynced = session.serverSessionId ? 'Да' : 'Нет';
        const isActive = scanStorage.getActiveSession()?.id === session.id;
        const totalItems = session.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const itemsDisplay = `${totalItems} шт. (${session.items.length} поз.)`;

        const row = document.createElement('tr');
        row.className = isActive ? 'table-primary' : '';

        row.innerHTML = `
            <td>${session.name} ${isActive ? '<span class="badge bg-primary">Активная</span>' : ''}</td>
            <td>${createdDate}</td>
            <td>${updatedDate}</td>
            <td>${itemsDisplay}</td>
            <td>${isSynced}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary load-session-btn" data-session-id="${session.id}" title="Загрузить">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-session-btn" data-session-id="${session.id}" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        sessionsList.appendChild(row);
    });

    // Add event listeners
    document.querySelectorAll('.load-session-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sessionId = e.currentTarget.getAttribute('data-session-id');
            const session = scanStorage.setActiveSession(sessionId);
            updateSessionUI(session);
            bootstrap.Modal.getInstance('#manageSessionsModal').hide();
            showToast('Сессия активирована', 'success');
        });
    });

    document.querySelectorAll('.delete-session-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sessionId = e.currentTarget.getAttribute('data-session-id');
            if (confirm('Вы уверены, что хотите удалить эту сессию?')) {
                scanStorage.deleteSession(sessionId);
                refreshSessionsList();

                // Update UI if active session was deleted
                const activeSession = scanStorage.getActiveSession();
                updateSessionUI(activeSession);

                showToast('Сессия удалена', 'success');
            }
        });
    });
}

// Clean expired sessions
async function cleanExpiredSessions() {
    try {
        const response = await api.post('/scan-sessions/clean-expired');
        const removedCount = response.cleaned_count;

        if (removedCount > 0) {
            if (document.getElementById('manageSessionsModal').classList.contains('show')) {
                 refreshSessionsList();
                 loadServerSessions();
            }
            showToast(`Удалено ${removedCount} устаревших сессий с сервера`, 'success');

        } else {
            showToast('Устаревших сессий на сервере не найдено', 'info');
        }
    } catch (error) {
        console.error('Error cleaning expired sessions:', error);
        showToast('Ошибка при очистке устаревших сессий на сервере', 'danger');
    }
}

// Reset all sessions (for debugging)
function resetAllSessions() {
    if (confirm('Вы уверены, что хотите удалить ВСЕ сессии? Это действие нельзя отменить.')) {
        localStorage.removeItem('equipment_scan_sessions');
        localStorage.removeItem('equipment_scan_sessions_active');

        showToast('Все сессии удалены', 'success');
        refreshSessionsList();

        // Create new session and update UI
        const newSession = scanStorage.createSession('Новая сессия ' + new Date().toLocaleString());
        updateSessionUI(newSession);
    }
}

// Setup event listeners - not used now, keeping for reference
function setupEventListeners() {
    document.getElementById('updateStatus').addEventListener('click', () => {
        if (currentEquipment) {
            const form = document.getElementById('updateStatusForm');
            form.elements.equipment_id.value = currentEquipment.id;
            form.elements.status.value = currentEquipment.status;
            new bootstrap.Modal('#updateStatusModal').show();
        }
    });

    document.getElementById('viewHistory').addEventListener('click', () => {
        if (currentEquipment) {
            loadEquipmentHistory(currentEquipment.id);
            new bootstrap.Modal('#historyModal').show();
        }
    });

    // Add other listeners if needed...
}

// --- Auto-Sync Logic ---

// Function for auto-syncing the active session
async function autoSyncActiveSession() {
    const activeSession = scanStorage.getActiveSession();
    if (activeSession) {
        if (scanStorage.isSessionDirty(activeSession.id)) {
            console.log('[AutoSync] Session dirty, attempting sync:', activeSession.name);
            try {
                const updatedSession = await scanStorage.syncSessionWithServer(activeSession.id);
                if (updatedSession) {
                    scanStorage.updateSession(updatedSession);
                    console.log('[AutoSync] Sync successful.');
                    updateSessionUI(updatedSession);
                } else {
                    console.warn('[AutoSync] Sync function did not return updated session.');
                }
            } catch (error) {
                console.error('[AutoSync] Sync failed:', error);
            }
        } else {
            console.log('[AutoSync] Session clean, skipping sync.');
        }
    } else {
        console.log('[AutoSync] No active session, stopping timer.');
        stopAutoSyncTimer();
    }
}

// Function to start the auto-sync timer
function startAutoSyncTimer() {
    stopAutoSyncTimer();
    console.log(`[AutoSync] Starting timer (${AUTO_SYNC_INTERVAL_MS}ms)`);
    autoSyncIntervalId = setInterval(autoSyncActiveSession, AUTO_SYNC_INTERVAL_MS);
}

// Function to stop the auto-sync timer
function stopAutoSyncTimer() {
    if (autoSyncIntervalId) {
        console.log('[AutoSync] Stopping timer');
        clearInterval(autoSyncIntervalId);
        autoSyncIntervalId = null;
    }
}

window.addEventListener('beforeunload', stopAutoSyncTimer);

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the scanner page by looking for a specific element
    const scannerPage = document.getElementById('scanResult');
    if (!scannerPage) {
        // Not on scanner page, exit gracefully
        return;
    }

    const requiredElements = [
        'noActiveSessionMessage',
        'activeSessionInfo',
        'sessionName',
        'itemCount',
        'sessionItemsList',
        'scanResult',
        'scannerErrorContainer',
        'scannerErrorText',
        'scanHistory'
    ];

    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements);
        showToast('Ошибка инициализации: отсутствуют необходимые элементы', 'danger');
        return;
    }

    // Make sure scanStorage is available before initializing
    if (!scanStorage) {
        console.error('scanStorage is not available');
        showToast('Ошибка инициализации: хранилище сессий недоступно', 'danger');
        return;
    }

    try {
        initScanner();
        initEventListeners();
        initModalScanner();
        fixAllModals();
    } catch (error) {
        console.error('Error during initialization:', error);
        showToast('Ошибка инициализации приложения', 'danger');
    }
});

// Function to fix all modal dialogs
function fixAllModals() {
    // List of all modal IDs
    const modalIds = [
        'updateStatusModal',
        'historyModal',
        'newSessionModal',
        'loadSessionModal',
        'renameSessionModal',
        'manageSessionsModal'
    ];

    modalIds.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Fix accessibility issues by removing aria-hidden attribute
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
                    // Remove aria-hidden attribute as soon as it's added
                    if (modal.getAttribute('aria-hidden') === 'true' &&
                        modal.style.display === 'block') {
                        modal.removeAttribute('aria-hidden');
                    }
                }
            });
        });

        // Start observing the modal for attribute changes
        observer.observe(modal, { attributes: true });

        // Also try with the normal events for belt and suspenders
        modal.addEventListener('shown.bs.modal', () => {
            modal.removeAttribute('aria-hidden');
        });

        modal.addEventListener('show.bs.modal', () => {
            modal.removeAttribute('aria-hidden');
        });

        // Fix for modal backdrop not being removed
        modal.addEventListener('hidden.bs.modal', () => {
            // Remove any lingering backdrop elements
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => {
                backdrop.remove();
            });

            // Ensure body doesn't have modal-open class
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
        });
    });
}

// Event listeners initialization
const initEventListeners = () => {
    const elements = {
        newSessionBtn: 'newSessionBtn',
        loadSessionBtn: 'loadSessionBtn',
        manageSessionsBtn: 'manageSessionsBtn',
        renameSessionBtn: 'renameSessionBtn',
        clearSessionBtn: 'clearSessionBtn',
        syncSessionBtn: 'syncSessionBtn',
        createProjectBtn: 'createProjectBtn',
        createSessionBtn: 'createSessionBtn',
        saveRenameBtn: 'saveRenameBtn',
        refreshSessionsListBtn: 'refreshSessionsListBtn',
        cleanExpiredSessionsBtn: 'cleanExpiredSessionsBtn',
        resetAllSessionsBtn: 'resetAllSessionsBtn',
        saveStatus: 'saveStatus',
        viewHistory: 'viewHistory',
        updateStatus: 'updateStatus'
    };

    for (const [key, id] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            switch (key) {
                case 'newSessionBtn':
                    element.addEventListener('click', showNewSessionModal);
                    break;
                case 'loadSessionBtn':
                    element.addEventListener('click', showLoadSessionModal);
                    break;
                case 'manageSessionsBtn':
                    element.addEventListener('click', showManageSessionsModal);
                    break;
                case 'renameSessionBtn':
                    element.addEventListener('click', showRenameSessionModal);
                    break;
                case 'clearSessionBtn':
                    element.addEventListener('click', confirmClearSession);
                    break;
                case 'syncSessionBtn':
                    element.addEventListener('click', syncActiveSession);
                    break;
                case 'createProjectBtn':
                    element.addEventListener('click', createProjectFromSession);
                    break;
                case 'createSessionBtn':
                    element.addEventListener('click', createNewSession);
                    break;
                case 'saveRenameBtn':
                    element.addEventListener('click', renameActiveSession);
                    break;
                case 'refreshSessionsListBtn':
                    element.addEventListener('click', refreshSessionsList);
                    break;
                case 'cleanExpiredSessionsBtn':
                    element.addEventListener('click', cleanExpiredSessions);
                    break;
                case 'resetAllSessionsBtn':
                    element.addEventListener('click', resetAllSessions);
                    break;
                case 'saveStatus':
                    element.addEventListener('click', async () => {
                        const form = document.getElementById('updateStatusForm');
                        if (!form) {
                            console.error('Update status form not found');
                            return;
                        }

                        const formData = new FormData(form);
                        const data = Object.fromEntries(formData.entries());

                        try {
                            await api.put(`/equipment/${data.equipment_id}/status?status=${data.status}`, {});

                            showToast('Статус успешно обновлен', 'success');
                            bootstrap.Modal.getInstance('#updateStatusModal').hide();

                            // Refresh equipment data
                            const equipment = await api.get(`/equipment/${data.equipment_id}`);
                            handleScan(equipment);
                        } catch (error) {
                            console.error('Error updating status:', error);
                            showToast('Ошибка при обновлении статуса', 'danger');
                        }
                    });
                    break;
                case 'viewHistory':
                    element.addEventListener('click', () => {
                        if (currentEquipment) {
                            loadEquipmentHistory(currentEquipment.id);
                            new bootstrap.Modal('#historyModal').show();
                        }
                    });
                    break;
                case 'updateStatus':
                    element.addEventListener('click', () => {
                        if (currentEquipment) {
                            const form = document.getElementById('updateStatusForm');
                            form.elements.equipment_id.value = currentEquipment.id;
                            form.elements.status.value = currentEquipment.status;
                            new bootstrap.Modal('#updateStatusModal').show();
                        }
                    });
                    break;
            }
        }
    }
};

// Initialize page
document.addEventListener('DOMContentLoaded', initEventListeners);
