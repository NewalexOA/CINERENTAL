/**
 * Universal Cart integration module for project view
 */

import {
    updateCartQuantity,
    removeFromCart,
    clearCart,
    addCartToProject,
    initializeCartHandlers
} from './cart-integration.js';

import {
    addEquipmentToProject,
    addEquipmentBatchToProject
} from './cart-operations.js';

// Re-export all functions
export {
    updateCartQuantity,
    removeFromCart,
    clearCart,
    addCartToProject,
    initializeCartHandlers,
    addEquipmentToProject,
    addEquipmentBatchToProject
};

/**
 * Initialize Universal Cart module
 */
export function initializeUniversalCartModule() {
    initializeCartHandlers();

    // Initialize Universal Cart if container exists
    if (document.getElementById('universalCartContainer')) {
        import('../../universal-cart/index.js').then(module => {
            console.log('Universal Cart loaded for embedded mode');
        }).catch(error => {
            console.error('Failed to load Universal Cart:', error);
        });
    }
}
