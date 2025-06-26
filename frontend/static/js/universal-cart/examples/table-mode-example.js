/**
 * Table Mode Example for Universal Cart
 * Demonstrates how to use Universal Cart in table mode as a replacement for simple cart
 *
 * @author ACT-Rental Team
 * @created 2025-12-26
 */

/**
 * Example: Initialize table-mode cart for project equipment display
 */
async function exampleTableModeUsage() {
    try {
        // ✅ Create table-mode cart (replaces simple cart)
        const equipmentCart = await createTableModeCartReplace('equipmentTableContainer', {
            initialData: [
                {
                    id: 1,
                    name: 'Canon EOS R5',
                    barcode: 'CAM001',
                    category: 'Камеры',
                    quantity: 1,
                    daily_cost: 5000,
                    serial_number: 'SN123456'
                },
                {
                    id: 2,
                    name: 'Sony FX3',
                    barcode: 'CAM002',
                    category: 'Камеры',
                    quantity: 2,
                    daily_cost: 4500
                }
            ]
        });

        console.log('✅ Table mode cart initialized:', equipmentCart);

        // ✅ Use exactly like simple cart
        await equipmentCart.addItem({
            id: 3,
            name: 'Manfrotto Tripod',
            barcode: 'TRP001',
            category: 'Аксессуары',
            quantity: 1,
            daily_cost: 800
        });

        console.log('✅ Items in cart:', equipmentCart.getItems());

    } catch (error) {
        console.error('❌ Failed to initialize table mode cart:', error);
    }
}

/**
 * Example: Different render modes comparison
 */
async function exampleRenderModeComparison() {
    try {
        // ✅ Cards mode (default)
        const cardsCart = createCartWithMode('equipment_add', 'cards', {
            ui: { containerId: 'cardsContainer' }
        });

        // ✅ Table mode
        const tableCart = createCartWithMode('equipment_add', 'table', {
            ui: { containerId: 'tableContainer' }
        });

        // ✅ Compact mode
        const compactCart = createCartWithMode('equipment_add', 'compact', {
            ui: { containerId: 'compactContainer' }
        });

        // Add same item to all carts for comparison
        const sampleItem = {
            id: 1,
            name: 'Sony FX6',
            barcode: 'CAM003',
            category: 'Камеры',
            quantity: 1,
            daily_cost: 6000
        };

        await cardsCart.addItem(sampleItem);
        await tableCart.addItem(sampleItem);
        await compactCart.addItem(sampleItem);

        console.log('✅ All render modes initialized with sample data');

    } catch (error) {
        console.error('❌ Failed to initialize render mode comparison:', error);
    }
}

/**
 * Example: Migration from simple cart to table mode
 */
function exampleSimpleCartMigration() {
    // ❌ OLD: Simple cart approach
    /*
    const simpleCart = {
        items: [],
        addItem: function(item) { this.items.push(item); },
        render: function() {
            // Manual DOM manipulation
            const html = this.items.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>...</td>
                </tr>
            `).join('');
            document.getElementById('container').innerHTML = html;
        }
    };
    */

    // ✅ NEW: Universal Cart in table mode
    document.addEventListener('universalCartReady', async () => {
        const tableCart = await createTableModeCartReplace('equipmentContainer', {
            // Same interface as simple cart, but with enhanced features
            debug: true
        });

        // ✅ Same API, enhanced functionality
        await tableCart.addItem({
            id: 1,
            name: 'Equipment Item',
            quantity: 1
        });

        // ✅ Automatic rendering with animations, events, validation
        // No manual DOM manipulation needed!
    });
}

/**
 * Example: Configuration options for different use cases
 */
function exampleConfigurationOptions() {
    // ✅ Read-only table for project equipment display
    const readOnlyConfig = {
        renderMode: 'table',
        showQuantityControls: false,
        showRemoveButtons: false,
        showAdvancedControls: false,
        compactView: true
    };

    // ✅ Interactive table for equipment selection
    const interactiveConfig = {
        renderMode: 'table',
        showQuantityControls: true,
        showRemoveButtons: true,
        showAdvancedControls: true,
        compactView: false
    };

    // ✅ Compact sidebar cart
    const sidebarConfig = {
        renderMode: 'compact',
        compactView: true,
        showAdvancedControls: false,
        maxItems: 20
    };

    console.log('✅ Configuration examples ready:', {
        readOnlyConfig,
        interactiveConfig,
        sidebarConfig
    });
}

/**
 * Example HTML structure for table mode
 */
function getExampleHTML() {
    return `
        <!-- ✅ Container for table-mode cart -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5>Оборудование в проекте</h5>
                    </div>
                    <div class="card-body">
                        <!-- Universal Cart will render here -->
                        <div id="equipmentTableContainer">
                            <!-- Table will be automatically generated -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ✅ Comparison: Different modes side by side -->
        <div class="row mt-4">
            <div class="col-md-4">
                <h6>Cards Mode</h6>
                <div id="cardsContainer"></div>
            </div>
            <div class="col-md-4">
                <h6>Table Mode</h6>
                <div id="tableContainer"></div>
            </div>
            <div class="col-md-4">
                <h6>Compact Mode</h6>
                <div id="compactContainer"></div>
            </div>
        </div>
    `;
}

// ✅ Auto-run examples when page loads
if (typeof window !== 'undefined') {
    window.exampleTableModeUsage = exampleTableModeUsage;
    window.exampleRenderModeComparison = exampleRenderModeComparison;
    window.exampleSimpleCartMigration = exampleSimpleCartMigration;
    window.exampleConfigurationOptions = exampleConfigurationOptions;
    window.getExampleHTML = getExampleHTML;

    // Auto-initialize examples if containers exist
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('equipmentTableContainer')) {
            exampleTableModeUsage();
        }

        if (document.getElementById('cardsContainer')) {
            exampleRenderModeComparison();
        }
    });
}
