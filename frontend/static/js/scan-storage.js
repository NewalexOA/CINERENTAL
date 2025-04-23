/**
 * Utility for working with temporary storage of scanned equipment.
 * Provides functionality to save scan lists between sessions
 * and synchronize with the server.
 */

// Storage key for localStorage
const STORAGE_KEY = 'equipment_scan_sessions';

// Session interface definition
/**
 * @typedef {Object} ScanSession
 * @property {string} id - Local session ID
 * @property {string} name - Session name
 * @property {Equipment[]} items - Array of scanned equipment
 * @property {string} updatedAt - Last update timestamp
 * @property {boolean} syncedWithServer - Server sync flag
 * @property {number|null} serverSessionId - Server session ID (if synced)
 * @property {boolean} [dirty] - Flag indicating if session has unsynced changes (optional)
 */

/**
 * @typedef {Object} Equipment
 * @property {number} equipment_id - Equipment ID
 * @property {string} barcode - Equipment barcode
 * @property {string} name - Equipment name
 * @property {string} [category_name] - Equipment category name
 */

// Main object for working with scan session storage
window.scanStorage = {
    /**
     * Get all sessions from localStorage
     * @returns {ScanSession[]} - Array of scan sessions
     */
    getSessions() {
        const sessions = localStorage.getItem(STORAGE_KEY);
        return sessions ? JSON.parse(sessions) : [];
    },

    /**
     * Get a specific session by ID
     * @param {string} id - Session ID
     * @returns {ScanSession|undefined} - Scan session or undefined
     */
    getSession(id) {
        const sessions = this.getSessions();
        return sessions.find(session => session.id === id);
    },

    /**
     * Get the active session
     * @returns {ScanSession|undefined} - Active session or undefined
     */
    getActiveSession() {
        const activeSessionId = localStorage.getItem(`${STORAGE_KEY}_active`);
        if (activeSessionId) {
            return this.getSession(activeSessionId);
        }
        return undefined;
    },

    /**
     * Set the active session
     * @param {string} id - Session ID
     */
    setActiveSession(id) {
        localStorage.setItem(`${STORAGE_KEY}_active`, id);
    },

    /**
     * Save sessions to localStorage
     * @param {ScanSession[]} sessions - Array of scan sessions
     * @private
     */
    _saveSessions(sessions) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    },

    /**
     * Create a new session
     * @param {string} name - Session name
     * @returns {ScanSession} - Created scan session
     */
    createSession(name) {
        const sessions = this.getSessions();
        const newSession = {
            id: `local_${Date.now()}`,
            name,
            items: [],
            updatedAt: new Date().toISOString(),
            syncedWithServer: false,
            serverSessionId: null,
            dirty: true // New sessions are dirty by default
        };

        sessions.push(newSession);
        this._saveSessions(sessions);
        this.setActiveSession(newSession.id);

        return newSession;
    },

    /**
     * Add equipment to a session
     * @param {string} sessionId - Session ID
     * @param {Equipment} equipment - Equipment to add
     * @returns {ScanSession|undefined} - Updated session or undefined
     */
    addEquipment(sessionId, equipment) {
        const sessions = this.getSessions();
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);
        if (sessionIndex === -1) return undefined;

        const equipmentId = Number(equipment.id || equipment.equipment_id);
        if (isNaN(equipmentId)) {
            console.error('Invalid equipment ID:', equipment);
            return undefined;
        }

        // Normalize equipment object, always add quantity: 1 initially
        const normalizedEquipment = {
            equipment_id: equipmentId,
            barcode: equipment.barcode || '',
            name: equipment.name || 'Unknown Equipment',
            serial_number: equipment.serial_number || null, // Ensure serial_number exists, can be null
            category_id: equipment.category_id || equipment.category?.id || null,
            category_name: equipment.category_name || equipment.category?.name || 'Без категории',
            quantity: 1
        };

        const sessionItems = sessions[sessionIndex].items;
        const existingItemIndex = sessionItems.findIndex(item => item.equipment_id === normalizedEquipment.equipment_id);

        // Check if the incoming item has a serial number
        const hasSerialNumber = !!normalizedEquipment.serial_number;

        if (hasSerialNumber) {
            // Item HAS serial number: check if ANY item with the same equipment_id already exists
            if (existingItemIndex !== -1) {
                console.log(`Equipment with ID ${equipmentId} (with serial number) already represented in session, skipping duplicate.`);
                return 'duplicate';
            }
            // No existing item with this ID found, add the new one
            sessionItems.push(normalizedEquipment);
        } else {
            // Item does NOT have serial number: check if an item with the same equipment_id exists to increment quantity
            if (existingItemIndex !== -1) {
                // Found existing item, increment quantity
                const existingItem = sessionItems[existingItemIndex];
                existingItem.quantity = (existingItem.quantity || 1) + 1; // Increment quantity
                console.log(`Incremented quantity for equipment ID ${equipmentId} (no serial number). New quantity: ${existingItem.quantity}`);
            } else {
                // No existing item found, add the new one (with quantity: 1)
                sessionItems.push(normalizedEquipment);
            }
        }

        // Update session metadata and save
        sessions[sessionIndex].updatedAt = new Date().toISOString();
        sessions[sessionIndex].syncedWithServer = false; // Mark as unsynced after modification
        sessions[sessionIndex].dirty = true; // Mark session as dirty
        this._saveSessions(sessions);

        // Return the updated session (important for UI updates)
        return sessions[sessionIndex];
    },

    /**
     * Decrement quantity or remove equipment without serial number from a session.
     * @param {string} sessionId - The ID of the session.
     * @param {number} equipmentId - The ID of the equipment to decrement.
     * @returns {ScanSession|undefined} The updated session object, or undefined if session/item not found or item has serial number.
     */
    decrementQuantity(sessionId, equipmentId) {
        const sessions = this.getSessions();
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);
        if (sessionIndex === -1) {
            console.error(`Session with ID ${sessionId} not found for decrementing.`);
            return undefined;
        }

        const sessionItems = sessions[sessionIndex].items;
        // Find the item by ID *and* ensure it does NOT have a serial number
        const itemIndex = sessionItems.findIndex(item => item.equipment_id === equipmentId && !item.serial_number);

        if (itemIndex === -1) {
            console.warn(`Equipment with ID ${equipmentId} (without serial number) not found in session ${sessionId} for decrementing.`);
            return sessions[sessionIndex]; // Return current session without changes
        }

        const item = sessionItems[itemIndex];

        if (item.quantity && item.quantity > 1) {
            // Decrement quantity if it's greater than 1
            item.quantity -= 1;
            console.log(`Decremented quantity for equipment ID ${equipmentId}. New quantity: ${item.quantity}`);
        } else {
            // Remove the item if quantity is 1 or less/undefined
            sessionItems.splice(itemIndex, 1);
            console.log(`Removed equipment ID ${equipmentId} (quantity was 1 or less).`);
        }

        // Update session metadata and save
        sessions[sessionIndex].updatedAt = new Date().toISOString();
        sessions[sessionIndex].syncedWithServer = false;
        sessions[sessionIndex].dirty = true; // Mark session as dirty
        this._saveSessions(sessions);

        return sessions[sessionIndex];
    },

    /**
     * Remove equipment from a session (handles both serialized and non-serialized by ID)
     * @param {string} sessionId - Session ID
     * @param {number} equipmentId - Equipment ID
     * @returns {ScanSession|undefined} - Updated session or undefined
     */
    removeEquipment(sessionId, equipmentId) {
        const sessions = this.getSessions();
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);

        if (sessionIndex === -1) return undefined;

        // Filter equipment, checking both id and equipment_id fields
        sessions[sessionIndex].items = sessions[sessionIndex].items.filter(
            item => item.equipment_id !== equipmentId && item.id !== equipmentId
        );

        sessions[sessionIndex].updatedAt = new Date().toISOString();
        sessions[sessionIndex].syncedWithServer = false;
        sessions[sessionIndex].dirty = true; // Mark session as dirty

        this._saveSessions(sessions);
        return sessions[sessionIndex];
    },

    /**
     * Clear all equipment in a session
     * @param {string} sessionId - Session ID
     * @returns {ScanSession|undefined} - Updated session or undefined
     */
    clearEquipment(sessionId) {
        const sessions = this.getSessions();
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);

        if (sessionIndex === -1) return undefined;

        // Clear equipment list
        sessions[sessionIndex].items = [];
        sessions[sessionIndex].updatedAt = new Date().toISOString();
        sessions[sessionIndex].syncedWithServer = false;
        sessions[sessionIndex].dirty = true; // Mark session as dirty

        this._saveSessions(sessions);
        return sessions[sessionIndex];
    },

    /**
     * Delete a session
     * @param {string} sessionId - Session ID
     * @returns {boolean} - Operation success
     */
    deleteSession(sessionId) {
        const sessions = this.getSessions();
        const filteredSessions = sessions.filter(session => session.id !== sessionId);

        if (filteredSessions.length === sessions.length) return false;

        this._saveSessions(filteredSessions);

        // If deleted session was active, reset active session
        const activeSessionId = localStorage.getItem(`${STORAGE_KEY}_active`);
        if (activeSessionId === sessionId) {
            localStorage.removeItem(`${STORAGE_KEY}_active`);
        }

        return true;
    },

    /**
     * Update session name
     * @param {string} sessionId - Session ID
     * @param {string} name - New session name
     * @returns {ScanSession|undefined} - Updated session or undefined
     */
    updateSessionName(sessionId, name) {
        const sessions = this.getSessions();
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);

        if (sessionIndex === -1) return undefined;

        sessions[sessionIndex].name = name;
        sessions[sessionIndex].updatedAt = new Date().toISOString();
        sessions[sessionIndex].syncedWithServer = false;
        sessions[sessionIndex].dirty = true; // Mark session as dirty

        this._saveSessions(sessions);
        return sessions[sessionIndex];
    },

    /**
     * Update session's server sync status
     * @param {string} sessionId - Local session ID
     * @param {number} serverSessionId - Server session ID
     * @returns {ScanSession|undefined} - Updated session or undefined
     */
    updateServerSync(sessionId, serverSessionId) {
        const sessions = this.getSessions();
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);

        if (sessionIndex === -1) return undefined;

        sessions[sessionIndex].syncedWithServer = true;
        sessions[sessionIndex].serverSessionId = serverSessionId;

        this._saveSessions(sessions);
        return sessions[sessionIndex];
    },

    /**
     * Convert session to server format
     * @param {string} sessionId - Session ID
     * @returns {Object|undefined} - Data for server or undefined
     */
    sessionToServerFormat(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) return undefined;

        // Minimal dataset for server API
        return {
            name: session.name,
            items: session.items.map(item => {
                // Strictly follow EquipmentItem schema format
                return {
                    equipment_id: Number(item.id || item.equipment_id),
                    barcode: String(item.barcode || ''),
                    name: String(item.name || '')
                    // Optional fields are omitted
                };
            })
        };
    },

    /**
     * Update a session with new data (usually after server sync)
     * @param {ScanSession} updatedSessionData - New session data
     * @returns {ScanSession|undefined} Updated session
     */
    updateSession(updatedSessionData) {
        const sessions = this.getSessions();
        const sessionIndex = sessions.findIndex(session => session.id === updatedSessionData.id);
        if (sessionIndex === -1) return undefined;

        // Merge updated data, ensuring not to overwrite local-only flags if not provided
        sessions[sessionIndex] = {
            ...sessions[sessionIndex], // Keep existing data
            ...updatedSessionData, // Overwrite with new data
            dirty: false // Mark as clean after successful update/sync
        };
        this._saveSessions(sessions);
        return sessions[sessionIndex];
    },

    /**
     * Checks if a session has unsynced changes.
     * @param {string} sessionId - The ID of the session.
     * @returns {boolean} True if the session is dirty, false otherwise.
     */
    isSessionDirty(sessionId) {
        const session = this.getSession(sessionId);
        return session ? !!session.dirty : false; // Return true if dirty is true, false otherwise
    },

    /**
     * Marks a session as clean (not dirty), usually after a successful sync.
     * @param {string} sessionId - The ID of the session.
     * @returns {ScanSession|undefined} The updated session.
     */
    markSessionAsClean(sessionId) {
        const sessions = this.getSessions();
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);
        if (sessionIndex === -1) return undefined;

        sessions[sessionIndex].dirty = false;
        // Optionally update updatedAt timestamp? Depends on requirements.
        this._saveSessions(sessions);
        return sessions[sessionIndex];
    },

    /**
     * Sync session with server
     * @param {string} sessionId - Session ID
     * @returns {Promise<ScanSession|undefined>} - Updated session or undefined
     */
    async syncSessionWithServer(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) return undefined;

        try {
            const payload = this.sessionToServerFormat(sessionId);
            const response = await window.api.post('/scan-sessions', payload);
            return this.updateServerSync(sessionId, response.id);
        } catch (error) {
            console.error('Error syncing session with server:', error);
            throw error;
        }
    },

    /**
     * Import session from server
     * @param {string} serverSessionId - Server session ID
     * @returns {Promise<ScanSession|undefined>} - Imported session or undefined
     */
    async importSessionFromServer(serverSessionId) {
        try {
            const serverSession = await window.api.get(`/scan-sessions/${serverSessionId}`);
            // ... rest of the implementation ...
        } catch (error) {
            console.error('Error importing session from server:', error);
            throw error;
        }
    },

    /**
     * Get user sessions from server
     * @param {number} userId - User ID
     * @returns {Promise<Array>} - Array of server sessions
     */
    async getUserSessionsFromServer(userId) {
        try {
            return await window.api.get('/scan-sessions/', { user_id: userId });
        } catch (error) {
            console.error('Error getting user sessions from server:', error);
            throw error;
        }
    },

    /**
     * Delete session from server
     * @param {string} serverSessionId - Server session ID
     * @returns {Promise<void>}
     */
    async deleteSessionFromServer(serverSessionId) {
        try {
            await window.api.delete(`/scan-sessions/${serverSessionId}`);
        } catch (error) {
            console.error('Error deleting session from server:', error);
            throw error;
        }
    }
};

/**
 * Helper function to get current user ID
 * @returns {number} - Current user ID
 */
function getCurrentUserId() {
    try {
        // In a real system this would get the current user ID
        // Using hardcoded value for testing purposes
        if (window.API_CONFIG && window.API_CONFIG.user_id) {
            return Number(window.API_CONFIG.user_id);
        }

        // Default value
        return 1;
    } catch (e) {
        console.warn('Error getting user ID:', e);
        return 1;
    }
}
