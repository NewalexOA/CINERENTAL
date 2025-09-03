import { test, expect } from '@playwright/test'

test.describe('Universal Cart Dual-Mode E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/v1/**', route => {
      const url = route.request().url()

      if (url.includes('/projects/')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            name: 'Test Project',
            client_name: 'Test Client',
            status: 'active',
            start_date: '2024-02-01',
            end_date: '2024-02-05'
          })
        })
      } else if (url.includes('/equipment/')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 1,
                name: 'Professional Camera',
                daily_cost: 50,
                status: 'AVAILABLE',
                barcode: '123456789',
                category_name: 'Cameras'
              },
              {
                id: 2,
                name: 'Lighting Kit',
                daily_cost: 30,
                status: 'AVAILABLE',
                barcode: '987654321',
                category_name: 'Lighting'
              }
            ],
            total: 2
          })
        })
      } else if (url.includes('/equipment/availability')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            available: true,
            available_quantity: 5
          })
        })
      } else if (url.includes('/equipment/bookings/batch')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            created_count: 1,
            failed_count: 0,
            bookings: [{
              id: 1,
              equipment_id: 1,
              quantity: 1,
              total_cost: 200
            }]
          })
        })
      } else {
        route.continue()
      }
    })
  })

  test.describe('Embedded Mode on Project Pages', () => {
    test('should display embedded cart on project detail page', async ({ page }) => {
      await page.goto('/projects/1')

      // Wait for page to load
      await page.waitForSelector('h1', { state: 'visible' })

      // Check that embedded cart container exists
      const cartContainer = page.locator('#universalCartContainer')
      await expect(cartContainer).toBeVisible()

      // Cart should be visible by default in embedded mode
      const cartContent = page.locator('.cart-content')
      await expect(cartContent).toBeVisible()

      // Should not have floating toggle button
      const toggleButton = page.locator('.floating-cart-toggle')
      await expect(toggleButton).not.toBeVisible()

      // Should have embedded-specific styling
      const cart = page.locator('.universal-cart')
      await expect(cart).toHaveClass(/cart--embedded/)
    })

    test('should add equipment to embedded cart on project page', async ({ page }) => {
      await page.goto('/projects/1')

      // Wait for cart to be visible
      await page.waitForSelector('.cart-content', { state: 'visible' })

      // Click add equipment button
      await page.click('button:has-text("+ Add Equipment")')

      // Wait for equipment search modal/dropdown
      await page.waitForSelector('[data-testid="equipment-search"]', { state: 'visible' })

      // Search for equipment
      await page.fill('[data-testid="equipment-search-input"]', 'camera')
      await page.press('[data-testid="equipment-search-input"]', 'Enter')

      // Click on first equipment item
      await page.click('[data-testid="equipment-item"]:first-child')

      // Verify item was added to cart
      const cartItems = page.locator('.cart-items .cart-item')
      await expect(cartItems).toHaveCount(1)

      // Check cart header shows correct count
      const itemCount = page.locator('.item-count')
      await expect(itemCount).toHaveText(/1 item/)
    })

    test('should handle barcode scanning in embedded mode', async ({ page }) => {
      await page.goto('/projects/1')

      // Enable scanner
      await page.click('button:has-text("📦 Start Scanner")')

      // Wait for scanner status
      const scannerStatus = page.locator('.bg-blue-50')
      await expect(scannerStatus).toBeVisible()
      await expect(scannerStatus).toContainText('Scanner active')

      // Simulate barcode input (scanners send keyboard input)
      await page.keyboard.type('123456789')
      await page.keyboard.press('Enter')

      // Wait for equipment to be added
      await page.waitForTimeout(1000) // Wait for API call and processing

      // Verify item was added to cart
      const cartItems = page.locator('.cart-items .cart-item')
      await expect(cartItems).toHaveCount(1)

      // Check that scanned equipment is displayed
      await expect(cartItems.first()).toContainText('Professional Camera')
    })

    test('should execute booking creation in embedded mode', async ({ page }) => {
      await page.goto('/projects/1')

      // Add an item to cart first
      await page.click('button:has-text("+ Add Equipment")')
      await page.waitForSelector('[data-testid="equipment-search"]', { state: 'visible' })
      await page.fill('[data-testid="equipment-search-input"]', 'camera')
      await page.press('[data-testid="equipment-search-input"]', 'Enter')
      await page.click('[data-testid="equipment-item"]:first-child')

      // Verify item in cart
      await expect(page.locator('.cart-items .cart-item')).toHaveCount(1)

      // Execute booking creation
      await page.click('button:has-text("Create Bookings")')

      // Wait for success message or progress
      await page.waitForSelector('.cart-footer', { state: 'visible' })

      // Check for success indicators
      const successMessage = page.locator('.action-status')
      await expect(successMessage).toContainText(/success/i)

      // Cart should be cleared after successful execution
      await expect(page.locator('.cart-items .cart-item')).toHaveCount(0)
    })
  })

  test.describe('Floating Mode on Equipment Pages', () => {
    test('should display floating cart on equipment list page', async ({ page }) => {
      await page.goto('/equipment')

      // Wait for page to load
      await page.waitForSelector('h1', { state: 'visible' })

      // Embedded cart container should not exist
      const cartContainer = page.locator('#universalCartContainer')
      await expect(cartContainer).not.toBeVisible()

      // Cart should start hidden in floating mode
      const cartContent = page.locator('.cart-content')
      await expect(cartContent).not.toBeVisible()

      // Should have floating toggle button
      const toggleButton = page.locator('.floating-cart-toggle button')
      await expect(toggleButton).toBeVisible()

      // Should have floating-specific styling
      const cart = page.locator('.universal-cart')
      await expect(cart).toHaveClass(/cart--floating/)
    })

    test('should toggle cart visibility in floating mode', async ({ page }) => {
      await page.goto('/equipment')

      // Wait for floating toggle button
      const toggleButton = page.locator('.floating-cart-toggle button')
      await expect(toggleButton).toBeVisible()

      // Cart should start hidden
      const cartContent = page.locator('.cart-content')
      await expect(cartContent).not.toBeVisible()

      // Click to show cart
      await toggleButton.click()
      await expect(cartContent).toBeVisible()

      // Click to hide cart
      await toggleButton.click()
      await expect(cartContent).not.toBeVisible()
    })

    test('should show item count badge on floating toggle', async ({ page }) => {
      await page.goto('/equipment')

      const toggleButton = page.locator('.floating-cart-toggle button')
      await expect(toggleButton).toBeVisible()

      // Add item to cart via equipment list
      await page.click('[data-testid="equipment-item"]:first-child [data-testid="add-to-cart-btn"]')

      // Check badge appears with count
      const badge = page.locator('.floating-cart-toggle .badge')
      await expect(badge).toBeVisible()
      await expect(badge).toHaveText('1')

      // Add another item
      await page.click('[data-testid="equipment-item"]:nth-child(2) [data-testid="add-to-cart-btn"]')

      // Badge should update
      await expect(badge).toHaveText('2')
    })

    test('should auto-show cart when items added in floating mode', async ({ page }) => {
      await page.goto('/equipment')

      // Cart should start hidden
      const cartContent = page.locator('.cart-content')
      await expect(cartContent).not.toBeVisible()

      // Add item to cart
      await page.click('[data-testid="equipment-item"]:first-child [data-testid="add-to-cart-btn"]')

      // Cart should auto-show
      await expect(cartContent).toBeVisible()

      // Verify item is in cart
      const cartItems = page.locator('.cart-items .cart-item')
      await expect(cartItems).toHaveCount(1)
    })

    test('should handle mobile responsiveness in floating mode', async ({ page, isMobile }) => {
      if (!isMobile) {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 })
      }

      await page.goto('/equipment')

      const toggleButton = page.locator('.floating-cart-toggle button')
      await expect(toggleButton).toBeVisible()

      // Add item to trigger cart display
      await page.click('[data-testid="equipment-item"]:first-child [data-testid="add-to-cart-btn"]')

      // Cart should be visible and responsive
      const cartContent = page.locator('.cart-content')
      await expect(cartContent).toBeVisible()

      // Check mobile-specific styling
      await expect(cartContent).toHaveClass(/cart-content--floating/)

      // Cart should take up appropriate space on mobile
      const cartRect = await cartContent.boundingBox()
      expect(cartRect?.width).toBeLessThanOrEqual(375 - 32) // Screen width minus padding
    })
  })

  test.describe('Cross-Page State Persistence', () => {
    test('should maintain cart state when navigating between pages', async ({ page }) => {
      // Start on equipment page and add items
      await page.goto('/equipment')

      // Add item to cart
      await page.click('[data-testid="equipment-item"]:first-child [data-testid="add-to-cart-btn"]')

      // Verify item in floating cart
      const toggleButton = page.locator('.floating-cart-toggle button')
      await toggleButton.click()

      const cartItems = page.locator('.cart-items .cart-item')
      await expect(cartItems).toHaveCount(1)

      // Navigate to project page
      await page.goto('/projects/1')

      // Wait for embedded cart to load
      await page.waitForSelector('.cart-content', { state: 'visible' })

      // Cart should maintain the item
      const embeddedCartItems = page.locator('.cart-items .cart-item')
      await expect(embeddedCartItems).toHaveCount(1)

      // Navigate back to equipment page
      await page.goto('/equipment')

      // Cart should still have the item
      await toggleButton.click()
      await expect(cartItems).toHaveCount(1)
    })

    test('should preserve cart state across page reloads', async ({ page }) => {
      await page.goto('/projects/1')

      // Add item to embedded cart
      await page.click('button:has-text("+ Add Equipment")')
      await page.waitForSelector('[data-testid="equipment-search"]', { state: 'visible' })
      await page.fill('[data-testid="equipment-search-input"]', 'camera')
      await page.press('[data-testid="equipment-search-input"]', 'Enter')
      await page.click('[data-testid="equipment-item"]:first-child')

      // Verify item in cart
      await expect(page.locator('.cart-items .cart-item')).toHaveCount(1)

      // Reload page
      await page.reload()
      await page.waitForSelector('.cart-content', { state: 'visible' })

      // Cart should maintain the item after reload
      await expect(page.locator('.cart-items .cart-item')).toHaveCount(1)
    })
  })

  test.describe('Animation and Transition Testing', () => {
    test('should have smooth transitions in floating mode', async ({ page }) => {
      await page.goto('/equipment')

      const toggleButton = page.locator('.floating-cart-toggle button')
      const cartContent = page.locator('.cart-content')

      // Test show animation
      await toggleButton.click()

      // Check that cart becomes visible with transition
      await expect(cartContent).toBeVisible()

      // Test hide animation
      await toggleButton.click()

      // Cart should become hidden
      await expect(cartContent).not.toBeVisible()
    })

    test('should handle rapid toggle operations smoothly', async ({ page }) => {
      await page.goto('/equipment')

      const toggleButton = page.locator('.floating-cart-toggle button')

      // Rapid toggle operations
      for (let i = 0; i < 5; i++) {
        await toggleButton.click()
        await page.waitForTimeout(100) // Brief pause between clicks
      }

      // Cart should be in a consistent state
      const cartContent = page.locator('.cart-content')
      await expect(cartContent).toBeVisible()
    })
  })

  test.describe('Error Handling in Both Modes', () => {
    test('should display errors in embedded mode', async ({ page }) => {
      // Mock API error
      await page.route('**/api/v1/equipment/availability**', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Equipment not available'
          })
        })
      })

      await page.goto('/projects/1')

      // Try to add equipment that will fail availability check
      await page.click('button:has-text("+ Add Equipment")')
      await page.waitForSelector('[data-testid="equipment-search"]', { state: 'visible' })
      await page.fill('[data-testid="equipment-search-input"]', 'camera')
      await page.press('[data-testid="equipment-search-input"]', 'Enter')
      await page.click('[data-testid="equipment-item"]:first-child')

      // Wait for error to appear
      const errorDisplay = page.locator('.cart-errors')
      await expect(errorDisplay).toBeVisible()
      await expect(errorDisplay).toContainText('Equipment not available')
    })

    test('should display errors in floating mode', async ({ page }) => {
      // Mock API error
      await page.route('**/api/v1/equipment/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Server error'
          })
        })
      })

      await page.goto('/equipment')

      // Try to add equipment that will fail
      await page.click('[data-testid="equipment-item"]:first-child [data-testid="add-to-cart-btn"]')

      // Show cart to see error
      const toggleButton = page.locator('.floating-cart-toggle button')
      await toggleButton.click()

      // Wait for error to appear
      const errorDisplay = page.locator('.cart-errors')
      await expect(errorDisplay).toBeVisible()
    })
  })

  test.describe('Accessibility Testing', () => {
    test('should be accessible in embedded mode', async ({ page }) => {
      await page.goto('/projects/1')

      // Wait for cart to load
      await page.waitForSelector('.cart-content', { state: 'visible' })

      // Test keyboard navigation
      await page.keyboard.press('Tab')

      // Check that cart elements are focusable
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()

      // Test ARIA attributes
      const cartHeader = page.locator('.cart-header')
      await expect(cartHeader).toHaveAttribute('role', 'banner')

      // Test screen reader content
      const cartTitle = page.locator('.cart-title')
      await expect(cartTitle).toBeVisible()
    })

    test('should be accessible in floating mode', async ({ page }) => {
      await page.goto('/equipment')

      // Test toggle button accessibility
      const toggleButton = page.locator('.floating-cart-toggle button')
      await expect(toggleButton).toHaveAttribute('aria-label')

      // Test keyboard activation
      await toggleButton.focus()
      await page.keyboard.press('Enter')

      // Cart should open
      const cartContent = page.locator('.cart-content')
      await expect(cartContent).toBeVisible()

      // Test focus management
      await expect(cartContent).toHaveAttribute('tabindex')
    })
  })
})
