/**
 * Universal Cart UI integration
 */

import { showToast } from '../../utils/common.js';
import { addEquipmentBatchToProject } from './cart-operations.js';

/**
 * Update cart item quantity
 * @param {string} itemId - Item ID
 * @param {number} newQuantity - New quantity
 */
export function updateCartQuantity(itemId, newQuantity) {
    if (window.universalCart) {
        if (newQuantity <= 0) {
            window.universalCart.removeItem(itemId);
        } else {
            window.universalCart.updateQuantity(itemId, newQuantity);
        }
    }
}

/**
 * Remove item from cart
 * @param {string} itemId - Item ID
 */
export function removeFromCart(itemId) {
    if (window.universalCart) {
        window.universalCart.removeItem(itemId);
    }
}

/**
 * Clear entire cart
 */
export function clearCart() {
    if (window.universalCart) {
        window.universalCart.clear();
    }
}

/**
 * Add all cart items to project
 */
export async function addCartToProject() {
    if (!window.universalCart) {
        showToast('Universal Cart не инициализирован', 'danger');
        return;
    }

    const items = window.universalCart.getItems();
    if (items.length === 0) {
        showToast('Корзина пуста', 'warning');
        return;
    }

    try {
        const result = await addEquipmentBatchToProject(items);

        if (result.success) {
            if (result.successCount === items.length) {
                // All items added successfully
                showToast(`Успешно добавлено ${result.successCount} позиций в проект`, 'success');
                window.universalCart.clear();

                // Hide cart after successful addition
                if (window.universalCart.ui && typeof window.universalCart.ui.hide === 'function') {
                    window.universalCart.ui.hide();
                    console.log('Cart hidden after successful addition of all items');
                }
            } else {
                // Partial success
                showToast(`Добавлено ${result.successCount} из ${items.length} позиций. Ошибки: ${result.errorCount}`, 'warning');
            }
        } else {
            // All items failed
            const errorMessage = result.errors?.length > 0
                ? `Не удалось добавить ни одной позиции. Ошибки: ${result.errors.slice(0, 3).join('; ')}`
                : 'Не удалось добавить ни одной позиции';
            showToast(errorMessage, 'danger');
        }

        if (result.errors?.length > 0) {
            console.error('Cart addition errors:', result.errors);
        }
    } catch (error) {
        console.error('Error in addCartToProject:', error);
        showToast('Произошла ошибка при добавлении корзины в проект', 'danger');
    }
}

/**
 * Initialize cart event handlers
 */
export function initializeCartHandlers() {
    // Close cart button
    document.getElementById('closeCartBtn')?.addEventListener('click', function() {
        if (window.universalCart && window.universalCart.ui) {
            if (typeof window.universalCart.ui.hide === 'function') {
                window.universalCart.ui.hide();
                console.log('Cart hidden by user request');
                showToast('Корзина скрыта. Добавляйте оборудование для повторного отображения.', 'info');
            } else {
                console.log('Close cart button clicked - hide method not available');
            }
        }
    });

    // Clear cart button
    document.getElementById('clearCartBtn')?.addEventListener('click', function() {
        if (window.universalCart) {
            if (confirm('Вы уверены, что хотите очистить корзину?')) {
                window.universalCart.clear();
            }
        }
    });

    // Add cart to project button
    document.getElementById('addCartToProjectBtn')?.addEventListener('click', function() {
        addCartToProject();
    });
}

// Make functions available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.updateCartQuantity = updateCartQuantity;
    window.removeFromCart = removeFromCart;
    window.clearCart = clearCart;
    window.addCartToProject = addCartToProject;
}
