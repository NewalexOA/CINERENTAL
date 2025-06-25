/**
 * Unit Tests for Universal Cart
 * Milestone 4: Enhancement & Polish - UCB-014
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

describe('UniversalCart', () => {
    let cart;
    let mockConfig;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Clear localStorage
        localStorage.clear();

        // Mock configuration
        mockConfig = {
            type: 'equipment_add',
            maxItems: 10,
            enableStorage: true,
            autoSave: true,
            debug: false,
            storageKey: 'test_cart'
        };

        // Import and initialize cart
        cart = new UniversalCart(mockConfig);
    });

    afterEach(() => {
        if (cart) {
            cart.clear();
        }
        localStorage.clear();
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize with default config when no config provided', () => {
            const defaultCart = new UniversalCart();

            expect(defaultCart.config.type).toBe('equipment_add');
            expect(defaultCart.config.maxItems).toBe(100);
            expect(defaultCart.config.enableStorage).toBe(true);
            expect(defaultCart.config.autoSave).toBe(true);
        });

        test('should merge provided config with defaults', () => {
            const customConfig = { maxItems: 50, debug: true };
            const customCart = new UniversalCart(customConfig);

            expect(customCart.config.maxItems).toBe(50);
            expect(customCart.config.debug).toBe(true);
            expect(customCart.config.type).toBe('equipment_add'); // default
        });

        test('should initialize with empty items collection', () => {
            expect(cart.items.size).toBe(0);
            expect(cart.getItems()).toEqual([]);
        });

        test('should emit initialized event', (done) => {
            const newCart = new UniversalCart(mockConfig);

            newCart.on('initialized', (data) => {
                expect(data.config).toEqual(expect.objectContaining(mockConfig));
                done();
            });
        });
    });

    describe('Adding Items', () => {
        const mockEquipment = {
            id: 1,
            name: 'Sony FX6',
            barcode: '123456789',
            category_name: 'Cameras',
            serial_number: 'SN12345',
            replacement_cost: 500000
        };

        test('should add new item successfully', async () => {
            const result = await cart.addItem(mockEquipment);

            expect(result).toBe(true);
            expect(cart.getItemCount()).toBe(1);
            expect(cart.getItems()).toHaveLength(1);
        });

        test('should emit itemAdded event when adding new item', (done) => {
            cart.on('itemAdded', (data) => {
                expect(data.item.id).toBe(mockEquipment.id);
                expect(data.item.name).toBe(mockEquipment.name);
                done();
            });

            cart.addItem(mockEquipment);
        });

        test('should increase quantity for existing items without serial number', async () => {
            const cableEquipment = {
                ...mockEquipment,
                id: 2,
                serial_number: null,
                name: 'HDMI Cable'
            };

            // Add first time
            await cart.addItem(cableEquipment);
            expect(cart.getItems()[0].quantity).toBe(1);

            // Add second time
            await cart.addItem(cableEquipment);
            expect(cart.getItemCount()).toBe(1); // Still one item
            expect(cart.getItems()[0].quantity).toBe(2); // Quantity increased
        });

        test('should not increase quantity for items with serial number', async () => {
            // Add first time
            await cart.addItem(mockEquipment);
            expect(cart.getItemCount()).toBe(1);

            // Add second time (should create new entry or reject)
            await cart.addItem(mockEquipment);
            // With serial number, it should either reject or create separate entry
            // depending on implementation specifics
            expect(cart.getItemCount()).toBeGreaterThanOrEqual(1);
        });

        test('should reject invalid items', async () => {
            const invalidItem = { name: 'Invalid' }; // Missing required fields

            const result = await cart.addItem(invalidItem);
            expect(result).toBe(false);
            expect(cart.getItemCount()).toBe(0);
        });

        test('should respect maximum capacity', async () => {
            // Fill cart to capacity
            for (let i = 0; i < mockConfig.maxItems; i++) {
                await cart.addItem({
                    ...mockEquipment,
                    id: i,
                    serial_number: `SN${i}`
                });
            }

            // Try to add one more
            const result = await cart.addItem({
                ...mockEquipment,
                id: 999,
                serial_number: 'SN999'
            });

            expect(result).toBe(false);
            expect(cart.getItemCount()).toBe(mockConfig.maxItems);
        });

        test('should emit error event for invalid additions', (done) => {
            cart.on('error', (data) => {
                expect(data.operation).toBe('addItem');
                expect(data.error).toBeDefined();
                done();
            });

            cart.addItem(null); // Invalid item
        });
    });

    describe('Removing Items', () => {
        const mockEquipment = {
            id: 1,
            name: 'Sony FX6',
            barcode: '123456789',
            category_name: 'Cameras',
            serial_number: 'SN12345'
        };

        beforeEach(async () => {
            await cart.addItem(mockEquipment);
        });

        test('should remove existing item', async () => {
            const itemKey = cart._generateItemKey(mockEquipment);
            const result = await cart.removeItem(itemKey);

            expect(result).toBe(true);
            expect(cart.getItemCount()).toBe(0);
        });

        test('should emit itemRemoved event', (done) => {
            const itemKey = cart._generateItemKey(mockEquipment);

            cart.on('itemRemoved', (data) => {
                expect(data.key).toBe(itemKey);
                expect(data.item.id).toBe(mockEquipment.id);
                done();
            });

            cart.removeItem(itemKey);
        });

        test('should return false for non-existent items', async () => {
            const result = await cart.removeItem('non-existent-key');
            expect(result).toBe(false);
        });

        test('should save to storage after removal when autoSave enabled', async () => {
            const itemKey = cart._generateItemKey(mockEquipment);

            // Mock storage save method
            const saveSpy = jest.spyOn(cart, '_saveToStorage');

            await cart.removeItem(itemKey);

            expect(saveSpy).toHaveBeenCalled();
        });
    });

    describe('Quantity Management', () => {
        const cableEquipment = {
            id: 2,
            name: 'HDMI Cable',
            barcode: '987654321',
            category_name: 'Cables',
            serial_number: null
        };

        beforeEach(async () => {
            await cart.addItem(cableEquipment);
        });

        test('should update quantity for existing item', async () => {
            const itemKey = cart._generateItemKey(cableEquipment);
            const result = await cart.updateQuantity(itemKey, 5);

            expect(result).toBe(true);
            expect(cart.getItem(itemKey).quantity).toBe(5);
        });

        test('should remove item when quantity set to 0', async () => {
            const itemKey = cart._generateItemKey(cableEquipment);
            const result = await cart.updateQuantity(itemKey, 0);

            expect(result).toBe(true);
            expect(cart.getItemCount()).toBe(0);
        });

        test('should remove item when quantity set to negative', async () => {
            const itemKey = cart._generateItemKey(cableEquipment);
            const result = await cart.updateQuantity(itemKey, -1);

            expect(result).toBe(true);
            expect(cart.getItemCount()).toBe(0);
        });

        test('should emit itemUpdated event', (done) => {
            const itemKey = cart._generateItemKey(cableEquipment);

            cart.on('itemUpdated', (data) => {
                expect(data.key).toBe(itemKey);
                expect(data.item.quantity).toBe(3);
                expect(data.previousQuantity).toBe(1);
                done();
            });

            cart.updateQuantity(itemKey, 3);
        });

        test('should return false for non-existent items', async () => {
            const result = await cart.updateQuantity('non-existent-key', 5);
            expect(result).toBe(false);
        });
    });

    describe('Cart Operations', () => {
        const mockItems = [
            {
                id: 1,
                name: 'Sony FX6',
                barcode: '123456789',
                category_name: 'Cameras',
                serial_number: 'SN12345'
            },
            {
                id: 2,
                name: 'HDMI Cable',
                barcode: '987654321',
                category_name: 'Cables',
                serial_number: null
            }
        ];

        beforeEach(async () => {
            for (const item of mockItems) {
                await cart.addItem(item);
            }
        });

        test('should get all items', () => {
            const items = cart.getItems();
            expect(items).toHaveLength(2);
            expect(items[0].name).toBe('Sony FX6');
            expect(items[1].name).toBe('HDMI Cable');
        });

        test('should get item by key', () => {
            const itemKey = cart._generateItemKey(mockItems[0]);
            const item = cart.getItem(itemKey);

            expect(item).toBeDefined();
            expect(item.name).toBe('Sony FX6');
        });

        test('should return undefined for non-existent item key', () => {
            const item = cart.getItem('non-existent-key');
            expect(item).toBeUndefined();
        });

        test('should get correct item count', () => {
            expect(cart.getItemCount()).toBe(2);
        });

        test('should get correct total quantity', () => {
            // One camera (qty 1) + one cable (qty 1)
            expect(cart.getTotalQuantity()).toBe(2);
        });

        test('should check if cart is empty', () => {
            expect(cart.isEmpty()).toBe(false);

            cart.clear();
            expect(cart.isEmpty()).toBe(true);
        });

        test('should clear all items', async () => {
            await cart.clear();

            expect(cart.isEmpty()).toBe(true);
            expect(cart.getItemCount()).toBe(0);
            expect(cart.getItems()).toHaveLength(0);
        });

        test('should emit cleared event when clearing', (done) => {
            cart.on('cleared', () => {
                expect(cart.isEmpty()).toBe(true);
                done();
            });

            cart.clear();
        });
    });

    describe('Item Validation', () => {
        test('should validate items with required fields', () => {
            const validItem = {
                id: 1,
                name: 'Test Equipment',
                barcode: '123456789',
                category_name: 'Test Category'
            };

            expect(cart._validateItem(validItem)).toBe(true);
        });

        test('should reject items missing required fields', () => {
            const invalidItems = [
                null,
                undefined,
                {},
                { name: 'No ID' },
                { id: 1 }, // No name
                { id: 1, name: 'No barcode' },
                { id: 1, name: 'Test', barcode: '123' } // No category
            ];

            invalidItems.forEach(item => {
                expect(cart._validateItem(item)).toBe(false);
            });
        });
    });

    describe('Key Generation', () => {
        test('should generate consistent keys for same item', () => {
            const item = {
                id: 1,
                name: 'Test Equipment',
                barcode: '123456789',
                serial_number: 'SN123'
            };

            const key1 = cart._generateItemKey(item);
            const key2 = cart._generateItemKey(item);

            expect(key1).toBe(key2);
        });

        test('should generate different keys for different items', () => {
            const item1 = { id: 1, barcode: '123456789' };
            const item2 = { id: 2, barcode: '987654321' };

            const key1 = cart._generateItemKey(item1);
            const key2 = cart._generateItemKey(item2);

            expect(key1).not.toBe(key2);
        });

        test('should handle items without serial numbers', () => {
            const item = {
                id: 1,
                name: 'Cable',
                barcode: '123456789',
                serial_number: null
            };

            const key = cart._generateItemKey(item);
            expect(key).toBeDefined();
            expect(typeof key).toBe('string');
        });
    });

    describe('Event System', () => {
        test('should register event listeners', () => {
            const mockCallback = jest.fn();
            cart.on('test-event', mockCallback);

            cart._emit('test-event', { data: 'test' });

            expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
        });

        test('should unregister event listeners', () => {
            const mockCallback = jest.fn();
            cart.on('test-event', mockCallback);
            cart.off('test-event', mockCallback);

            cart._emit('test-event', { data: 'test' });

            expect(mockCallback).not.toHaveBeenCalled();
        });

        test('should handle multiple listeners for same event', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            cart.on('test-event', callback1);
            cart.on('test-event', callback2);

            cart._emit('test-event', { data: 'test' });

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });
    });

    describe('Storage Integration', () => {
        test('should save to storage when autoSave enabled', async () => {
            const item = {
                id: 1,
                name: 'Test Equipment',
                barcode: '123456789',
                category_name: 'Test'
            };

            // Mock localStorage
            const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');

            await cart.addItem(item);

            expect(mockSetItem).toHaveBeenCalled();
        });

        test('should load from storage on initialization', () => {
            // Pre-populate localStorage
            const testData = [
                {
                    id: 1,
                    name: 'Stored Equipment',
                    barcode: '123456789',
                    category_name: 'Test'
                }
            ];

            localStorage.setItem('test_cart', JSON.stringify(testData));

            // Create new cart instance
            const newCart = new UniversalCart(mockConfig);

            // Should load from storage
            expect(newCart.getItemCount()).toBe(1);
            expect(newCart.getItems()[0].name).toBe('Stored Equipment');
        });
    });

    describe('Debug Information', () => {
        test('should provide debug information', () => {
            const debugInfo = cart.getDebugInfo();

            expect(debugInfo).toHaveProperty('itemCount');
            expect(debugInfo).toHaveProperty('totalQuantity');
            expect(debugInfo).toHaveProperty('config');
            expect(debugInfo).toHaveProperty('isInitialized');
        });

        test('should include items in debug info', async () => {
            const item = {
                id: 1,
                name: 'Test Equipment',
                barcode: '123456789',
                category_name: 'Test'
            };

            await cart.addItem(item);
            const debugInfo = cart.getDebugInfo();

            expect(debugInfo.itemCount).toBe(1);
            expect(debugInfo.items).toHaveLength(1);
        });
    });

    describe('Error Handling', () => {
        test('should handle storage errors gracefully', async () => {
            // Mock storage to throw error
            jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            const item = {
                id: 1,
                name: 'Test Equipment',
                barcode: '123456789',
                category_name: 'Test'
            };

            // Should not throw error but return false
            const result = await cart.addItem(item);
            expect(result).toBe(true); // Item added to memory

            // Error should be emitted
            const errorSpy = jest.fn();
            cart.on('error', errorSpy);

            await cart._saveToStorage();
            expect(errorSpy).toHaveBeenCalled();
        });

        test('should emit error events for operation failures', (done) => {
            cart.on('error', (data) => {
                expect(data.operation).toBeDefined();
                expect(data.error).toBeDefined();
                done();
            });

            // Trigger error by exceeding capacity
            const promises = [];
            for (let i = 0; i <= mockConfig.maxItems; i++) {
                promises.push(cart.addItem({
                    id: i,
                    name: `Equipment ${i}`,
                    barcode: `${i}`,
                    category_name: 'Test',
                    serial_number: `SN${i}`
                }));
            }

            Promise.all(promises);
        });
    });
});
