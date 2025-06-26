/**
 * Cart Configuration Module
 *
 * Defines configurations for different types of carts used in ACT-Rental
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

/**
 * Configuration for equipment addition cart
 * Used when adding equipment to projects through search or scanner
 */
const ADD_EQUIPMENT_CONFIG = {
    type: 'equipment_add',
    name: 'Добавить оборудование',
    description: 'Корзина для временного хранения оборудования перед добавлением в проект',

    // Capacity settings
    maxItems: 100,
    maxQuantityPerItem: 10,

    // Storage settings
    enableStorage: true,
    autoSave: true,
    storageKey: 'act_rental_equipment_cart',

    // UI settings
    showQuantityControls: true,
    showRemoveButtons: true,
    showClearButton: true,

    // Behavior settings
    allowDuplicates: false, // Based on equipment ID
    autoShowOnAdd: true,
    hideOnEmpty: true,
    confirmBeforeClear: true,

    // Debug settings
    debug: false,

    // Validation rules
    validation: {
        required: ['id', 'name'],
        unique: 'id',
        maxQuantity: 10
    },

    // UI text customization
    text: {
        title: 'Корзина оборудования',
        emptyMessage: 'Корзина пуста',
        addButton: 'Добавить в проект',
        clearButton: 'Очистить корзину',
        removeButton: 'Удалить',
        quantityLabel: 'Количество',
        totalLabel: 'Всего позиций'
    },

    // Action callbacks
    callbacks: {
        onAdd: null,
        onRemove: null,
        onClear: null,
        onQuantityChange: null,
        onSubmit: null
    }
};

/**
 * Configuration for equipment return cart (future implementation)
 * Used when returning equipment from projects
 */
const RETURN_EQUIPMENT_CONFIG = {
    type: 'equipment_return',
    name: 'Вернуть оборудование',
    description: 'Корзина для временного хранения оборудования перед возвратом',

    // Capacity settings
    maxItems: 50,
    maxQuantityPerItem: 1, // Returns are typically individual items

    // Storage settings
    enableStorage: true,
    autoSave: true,
    storageKey: 'act_rental_return_cart',

    // UI settings
    showQuantityControls: false, // No quantity changes for returns
    showRemoveButtons: true,
    showClearButton: true,

    // Behavior settings
    allowDuplicates: false,
    autoShowOnAdd: true,
    hideOnEmpty: true,
    confirmBeforeClear: true,

    // Debug settings
    debug: false,

    // Validation rules
    validation: {
        required: ['id', 'name', 'booking_id'],
        unique: 'booking_id',
        maxQuantity: 1
    },

    // UI text customization
    text: {
        title: 'Корзина возврата',
        emptyMessage: 'Нет оборудования для возврата',
        addButton: 'Оформить возврат',
        clearButton: 'Очистить',
        removeButton: 'Убрать',
        quantityLabel: 'Количество',
        totalLabel: 'К возврату'
    },

    // Action callbacks
    callbacks: {
        onAdd: null,
        onRemove: null,
        onClear: null,
        onQuantityChange: null,
        onSubmit: null
    }
};

/**
 * Configuration for equipment transfer cart (future implementation)
 * Used when transferring equipment between projects
 */
const TRANSFER_EQUIPMENT_CONFIG = {
    type: 'equipment_transfer',
    name: 'Перенести оборудование',
    description: 'Корзина для временного хранения оборудования перед переносом между проектами',

    // Capacity settings
    maxItems: 30,
    maxQuantityPerItem: 5,

    // Storage settings
    enableStorage: true,
    autoSave: true,
    storageKey: 'act_rental_transfer_cart',

    // UI settings
    showQuantityControls: true,
    showRemoveButtons: true,
    showClearButton: true,

    // Behavior settings
    allowDuplicates: false,
    autoShowOnAdd: true,
    hideOnEmpty: true,
    confirmBeforeClear: true,

    // Debug settings
    debug: false,

    // Validation rules
    validation: {
        required: ['id', 'name', 'booking_id', 'source_project_id'],
        unique: 'booking_id',
        maxQuantity: 5
    },

    // UI text customization
    text: {
        title: 'Корзина переноса',
        emptyMessage: 'Нет оборудования для переноса',
        addButton: 'Перенести в проект',
        clearButton: 'Отменить',
        removeButton: 'Убрать',
        quantityLabel: 'Количество',
        totalLabel: 'К переносу'
    },

    // Action callbacks
    callbacks: {
        onAdd: null,
        onRemove: null,
        onClear: null,
        onQuantityChange: null,
        onSubmit: null
    }
};

/**
 * Configuration for project page
 * Used when adding equipment to projects through search or scanner
 */
const PROJECT_VIEW_CONFIG = {
    type: 'project_view',
    name: 'Добавить в проект',
    description: 'Корзина для добавления оборудования в проект',

    // Capacity settings
    maxItems: 50,
    maxQuantityPerItem: 10,

    // Storage settings
    enableStorage: true,
    autoSave: true,
    storageKey: 'act_rental_project_cart',

    // UI settings
    showQuantityControls: true,
    showRemoveButtons: true,
    showClearButton: true,
    showToggleButton: false,  // No toggle button in embedded mode

    // Behavior settings
    allowDuplicates: false,
    autoShowOnAdd: true,      // Automatically show cart when item is added
    hideOnEmpty: false,       // TEMPORARILY DISABLED: Hide cart when empty - show only after adding items
    confirmBeforeClear: true,

    // Debug settings
    debug: true,              // Enable debug for troubleshooting

    // Validation rules
    validation: {
        required: ['id', 'name'],
        unique: 'id',
        maxQuantity: 10
    },

    // UI text customization
    text: {
        title: 'Корзина оборудования',
        emptyMessage: 'Корзина пуста. Добавьте оборудование из поиска или сканера.',
        addButton: 'Добавить в проект',
        clearButton: 'Очистить корзину',
        removeButton: 'Удалить',
        quantityLabel: 'Количество',
        totalLabel: 'Всего позиций'
    },

    // Embedded UI settings
    ui: {
        embedded: true,                    // Use embedded mode
        containerId: 'universalCartContainer',
        contentId: 'cartContent'
    },

    // Feature flags
    features: {
        barcode: true,
        scanner: true,
        search: true,
        categories: true,
        bulk: true
    },

    // Action callbacks
    callbacks: {
        onAdd: null,
        onRemove: null,
        onClear: null,
        onQuantityChange: null,
        onSubmit: null
    }
};

/**
 * Factory function to create cart configuration
 * @param {string} type - Cart type ('equipment_add', 'equipment_return', 'equipment_transfer')
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Cart configuration
 */
function createCartConfig(type, overrides = {}) {
    let baseConfig;

    switch (type) {
        case 'equipment_add':
            baseConfig = ADD_EQUIPMENT_CONFIG;
            break;
        case 'equipment_return':
            baseConfig = RETURN_EQUIPMENT_CONFIG;
            break;
        case 'equipment_transfer':
            baseConfig = TRANSFER_EQUIPMENT_CONFIG;
            break;
        case 'project_view':
            baseConfig = PROJECT_VIEW_CONFIG;
            break;
        default:
            throw new Error(`Unknown cart type: ${type}`);
    }

    // Deep merge configuration with overrides
    return {
        ...baseConfig,
        ...overrides,
        validation: {
            ...baseConfig.validation,
            ...(overrides.validation || {})
        },
        text: {
            ...baseConfig.text,
            ...(overrides.text || {})
        },
        callbacks: {
            ...baseConfig.callbacks,
            ...(overrides.callbacks || {})
        }
    };
}

/**
 * Validate cart configuration
 * @param {Object} config - Cart configuration to validate
 * @returns {boolean} True if configuration is valid
 * @throws {Error} If configuration is invalid
 */
function validateCartConfig(config) {
    const requiredFields = ['type', 'name', 'maxItems', 'enableStorage'];

    for (const field of requiredFields) {
        if (!(field in config)) {
            throw new Error(`Missing required configuration field: ${field}`);
        }
    }

    if (config.maxItems <= 0) {
        throw new Error('maxItems must be greater than 0');
    }

    if (config.maxQuantityPerItem <= 0) {
        throw new Error('maxQuantityPerItem must be greater than 0');
    }

    if (!config.validation || !config.validation.required || !Array.isArray(config.validation.required)) {
        throw new Error('validation.required must be an array');
    }

    return true;
}

/**
 * Get all available cart configurations
 * @returns {Object} Object with all cart configurations
 */
function getAllCartConfigs() {
    return {
        ADD_EQUIPMENT_CONFIG,
        RETURN_EQUIPMENT_CONFIG,
        TRANSFER_EQUIPMENT_CONFIG,
        PROJECT_VIEW_CONFIG
    };
}

// Global exports for browser usage
if (typeof window !== 'undefined') {
    window.ADD_EQUIPMENT_CONFIG = ADD_EQUIPMENT_CONFIG;
    window.RETURN_EQUIPMENT_CONFIG = RETURN_EQUIPMENT_CONFIG;
    window.TRANSFER_EQUIPMENT_CONFIG = TRANSFER_EQUIPMENT_CONFIG;
    window.PROJECT_VIEW_CONFIG = PROJECT_VIEW_CONFIG;
    window.createCartConfig = createCartConfig;
    window.validateCartConfig = validateCartConfig;
    window.getAllCartConfigs = getAllCartConfigs;
}

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ADD_EQUIPMENT_CONFIG,
        RETURN_EQUIPMENT_CONFIG,
        TRANSFER_EQUIPMENT_CONFIG,
        PROJECT_VIEW_CONFIG,
        createCartConfig,
        validateCartConfig,
        getAllCartConfigs
    };
}
