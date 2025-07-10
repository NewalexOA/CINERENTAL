/**
 * Universal Cart Factory Functions
 * Helper functions to create cart instances with different configurations
 *
 * @author ACT-Rental Team
 * @created 2025-12-26
 */

/**
 * Factory function to create a table-mode cart
 * @param {string} containerId - Container element ID
 * @param {Object} options - Additional options
 * @returns {UniversalCart} Configured cart instance
 */
function createTableCart(containerId, options = {}) {
    const config = createCartConfig('project_equipment_table', {
        ui: {
            embedded: true,
            containerId: containerId,
            contentId: `${containerId}Content`
        },
        ...options
    });

    return new UniversalCart(config);
}

/**
 * Factory function to create a compact cart
 * @param {string} containerId - Container element ID
 * @param {Object} options - Additional options
 * @returns {UniversalCart} Configured cart instance
 */
function createCompactCart(containerId, options = {}) {
    const config = createCartConfig('equipment_add', {
        renderMode: 'compact',
        compactView: true,
        showAdvancedControls: false,
        ui: {
            embedded: true,
            containerId: containerId,
            contentId: `${containerId}Content`
        },
        ...options
    });

    return new UniversalCart(config);
}

/**
 * Factory function to create cart with custom render mode
 * @param {string} type - Cart type
 * @param {string} renderMode - Render mode ('cards' | 'table' | 'compact')
 * @param {Object} options - Additional options
 * @returns {UniversalCart} Configured cart instance
 */
function createCartWithMode(type, renderMode, options = {}) {
    const config = createCartConfig(type, {
        renderMode,
        compactView: renderMode === 'compact',
        showAdvancedControls: renderMode === 'cards',
        ...options
    });

    return new UniversalCart(config);
}

/**
 * Initialize Universal Cart for project equipment table display
 * @param {string} containerId - Container element ID
 * @param {Array} equipmentData - Initial equipment data
 * @returns {Promise<UniversalCart>} Cart instance
 */
async function initializeProjectEquipmentTable(containerId, equipmentData = []) {
    try {
        const cart = createTableCart(containerId, {
            debug: true
        });

        // Wait for cart initialization
        await new Promise(resolve => {
            if (cart.isInitialized) {
                resolve();
            } else {
                cart.on('initialized', resolve);
            }
        });

        // Load initial data if provided
        if (equipmentData.length > 0) {
            for (const item of equipmentData) {
                await cart.addItem(item);
            }
        }

        console.log(`[Universal Cart] Project equipment table initialized in ${containerId}`);
        return cart;

    } catch (error) {
        console.error('[Universal Cart] Failed to initialize project equipment table:', error);
        throw error;
    }
}

/**
 * Universal Cart initialization for different contexts
 * @param {string} context - Context type ('project_view', 'equipment_add', etc.)
 * @param {Object} options - Configuration options
 * @returns {Promise<UniversalCart>} Cart instance
 */
async function initializeUniversalCart(context = 'equipment_add', options = {}) {
    try {
        let config;

        switch (context) {
            case 'project_view':
                config = createCartConfig('project_view', options);
                break;
            case 'project_equipment_table':
                config = createCartConfig('project_equipment_table', options);
                break;
            case 'equipment_return':
                config = createCartConfig('equipment_return', options);
                break;
            case 'equipment_transfer':
                config = createCartConfig('equipment_transfer', options);
                break;
            default:
                config = createCartConfig('equipment_add', options);
        }

        const cart = new UniversalCart(config);

        // Wait for initialization
        await new Promise(resolve => {
            if (cart.isInitialized) {
                resolve();
            } else {
                cart.on('initialized', resolve);
            }
        });

        console.log(`[Universal Cart] Initialized for context: ${context}`);
        return cart;

    } catch (error) {
        console.error('[Universal Cart] Initialization failed:', error);
        throw error;
    }
}

/**
 * Replace simple cart functionality with Universal Cart in table mode
 * This function creates a table-mode cart as a drop-in replacement for simple cart
 * @param {string} containerId - Container element ID
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Cart interface compatible with simple cart
 */
async function createTableModeCartReplace(containerId, options = {}) {
    const cart = await initializeProjectEquipmentTable(containerId, options.initialData || []);

    // Return interface compatible with simple cart
    return {
        cart: cart,

        // Compatible methods
        addItem: (item) => cart.addItem(item),
        removeItem: (itemKey) => cart.removeItem(itemKey),
        clear: () => cart.clear(),
        getItems: () => cart.getItems(),
        getItemCount: () => cart.getItemCount(),

        // Render method for compatibility
        render: () => cart.ui?.render(),

        // Event handling
        on: (event, callback) => cart.on(event, callback),
        off: (event, callback) => cart.off(event, callback)
    };
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.createTableCart = createTableCart;
    window.createCompactCart = createCompactCart;
    window.createCartWithMode = createCartWithMode;
    window.initializeProjectEquipmentTable = initializeProjectEquipmentTable;
    window.initializeUniversalCart = initializeUniversalCart;
    window.createTableModeCartReplace = createTableModeCartReplace;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createTableCart,
        createCompactCart,
        createCartWithMode,
        initializeProjectEquipmentTable,
        initializeUniversalCart,
        createTableModeCartReplace
    };
}
