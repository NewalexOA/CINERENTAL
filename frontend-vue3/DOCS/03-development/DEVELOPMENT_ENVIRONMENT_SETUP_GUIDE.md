# Development Environment Setup Guide

**Document Version**: 1.0
**Date**: 2025-08-30
**Status**: Active
**Project**: CINERENTAL Vue3 Frontend Migration

---

## 📋 Executive Summary

This guide provides comprehensive instructions for setting up a complete development environment for the CINERENTAL Vue3 frontend migration project. The setup supports dual-frontend coexistence with the existing Bootstrap application while enabling modern Vue3 development workflows.

### Key Environment Features

- **Vue3 + TypeScript + Pinia + Vite** development stack
- **PrimeVue** component library integration
- **pnpm** package manager for performance
- **Docker** containerized development environment
- **HID Scanner** development testing setup
- **Backend Integration** with existing FastAPI services
- **Testing Framework** with Vitest + Playwright

---

## 🎯 Prerequisites and System Requirements

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Node.js** | 18.x LTS | 20.x LTS |
| **RAM** | 8GB | 16GB+ |
| **Storage** | 10GB free | 20GB+ free |
| **CPU** | Dual-core | Quad-core+ |

### Required Software

- **Git** 2.30+
- **Docker** 20.10+ with Docker Compose
- **Node.js** 18.x or 20.x LTS
- **pnpm** 8.x+ (package manager)
- **VS Code** (recommended IDE)

### Browser Requirements

- **Chrome/Chromium** 90+ (for development and HID testing)
- **Firefox** 88+ (for cross-browser testing)
- **Safari** 14+ (macOS testing)
- **Edge** 90+ (Windows testing)

---

## 🚀 Phase 1: Node.js and pnpm Setup

### Step 1.1: Install Node.js

**Option A: Using Node Version Manager (Recommended)**

```bash
# Install nvm (macOS/Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or reload profile
source ~/.bashrc  # or ~/.zshrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node

# Verify installation
node --version  # Should show v18.x.x or v20.x.x
npm --version   # Should show 8.x.x or higher
```

**Option B: Direct Installation**

Download from [nodejs.org](https://nodejs.org/) and install the LTS version.

### Step 1.2: Install pnpm Package Manager

```bash
# Install pnpm globally
npm install -g pnpm@latest

# Verify installation
pnpm --version  # Should show 8.x.x or higher

# Configure pnpm for optimal performance
pnpm config set store-dir ~/.pnpm-store
pnpm config set shamefully-hoist true
```

### Step 1.3: Verify Installation

```bash
# Check Node.js and pnpm versions
node --version && pnpm --version

# Expected output:
# v20.11.0 (or similar)
# 8.15.1 (or similar)
```

---

## 🏗️ Phase 2: Vue3 Project Initialization

### Step 2.1: Navigate to Project Directory

```bash
# Navigate to CINERENTAL root
cd /path/to/CINERENTAL

# Verify you're in the correct directory
ls -la | grep frontend-vue3
```

### Step 2.2: Initialize Vue3 Project

```bash
# Create Vue3 project in frontend-vue3 directory
cd frontend-vue3

# Initialize with create-vue (if not already done)
pnpm create vue@latest . --typescript --router --pinia --vitest --playwright --eslint --prettier

# Install dependencies
pnpm install
```

### Step 2.3: Configure Project Structure

```bash
# Create recommended directory structure
mkdir -p src/{components,composables,stores,services,types,utils,assets,views}
mkdir -p src/components/{common,forms,layout,equipment,projects}
mkdir -p public/icons
mkdir -p tests/{unit,e2e,fixtures}
```

### Step 2.4: Verify Base Installation

```bash
# Start development server to verify setup
pnpm dev

# Expected output: Local server running on http://localhost:5173
# Open browser and verify Vue3 welcome page loads
```

---

## 🛠️ Phase 3: Development Tools and IDE Setup

### Step 3.1: VS Code Extensions

Install these essential extensions:

```bash
# Core Vue3 extensions
code --install-extension Vue.volar
code --install-extension ms-vscode.vscode-typescript-next

# Additional recommended extensions
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-playwright.playwright
code --install-extension christian-kohler.path-intellisense
```

### Step 3.2: VS Code Configuration

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.inlayHints.missingProps": true,
  "vue.inlayHints.inlineHandlerLeading": true,
  "vue.inlayHints.optionsWrapper": true
}
```

### Step 3.3: Git Configuration

```bash
# Configure Git hooks (if not already configured)
cd /path/to/CINERENTAL

# Install pre-commit (if available)
pip install pre-commit
pre-commit install

# Configure Git for the Vue3 project
git config --global init.defaultBranch main
git config --global pull.rebase false
```

---

## 🔌 Phase 4: Backend Integration Configuration

### Step 4.1: Environment Configuration

Create `frontend-vue3/.env.local`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=v1

# WebSocket Configuration (for real-time updates)
VITE_WS_BASE_URL=ws://localhost:8000

# Development Features
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_MOCK_SCANNER=true

# CORS Origins for backend
VITE_CORS_ORIGIN=http://localhost:5173
```

### Step 4.2: API Client Setup

Create API client configuration in `src/services/api.ts`:

```typescript
// Basic API client structure
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  version: import.meta.env.VITE_API_VERSION || 'v1',
  timeout: 10000,
}

// API endpoints matching existing backend
export const ENDPOINTS = {
  equipment: '/api/v1/equipment',
  projects: '/api/v1/projects',
  categories: '/api/v1/categories',
  clients: '/api/v1/clients',
  bookings: '/api/v1/bookings',
  auth: '/api/v1/auth',
  health: '/api/v1/health',
}
```

### Step 4.3: Verify Backend Connection

Start the existing backend and test connectivity:

```bash
# Terminal 1: Start backend services
cd /path/to/CINERENTAL
docker compose up -d

# Wait for services to be healthy
docker compose ps

# Terminal 2: Test API connectivity from Vue3 project
cd frontend-vue3
curl http://localhost:8000/api/v1/health

# Expected response: {"status": "healthy"}
```

---

## 🧪 Phase 5: Testing Environment Setup

### Step 5.1: Vitest Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

### Step 5.2: Playwright Configuration

Update `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Step 5.3: Testing Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 🐳 Phase 6: Docker Development Environment

### Step 6.1: Vue3 Dockerfile

Create `frontend-vue3/Dockerfile.dev`:

```dockerfile
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Expose development port
EXPOSE 5173

# Start development server
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
```

### Step 6.2: Docker Compose for Vue3

Create `frontend-vue3/docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  vue3-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
      - VITE_ENABLE_DEVTOOLS=true
    depends_on:
      - backend
    networks:
      - cinerental_network

  backend:
    image: cinerental-backend:latest
    ports:
      - "8000:8000"
    networks:
      - cinerental_network

networks:
  cinerental_network:
    external: true
```

### Step 6.3: Integrated Development

Update root `docker-compose.override.yml`:

```yaml
version: '3.8'

services:
  web:
    environment:
      - CORS_ORIGINS=http://localhost:3000,http://localhost:5173
      - ALLOWED_HOSTS=localhost,127.0.0.1,vue3-dev

  vue3-dev:
    build:
      context: ./frontend-vue3
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend-vue3:/app
      - /app/node_modules
    environment:
      - VITE_API_BASE_URL=http://web:8000
    depends_on:
      - web
    networks:
      - act-rental_network
```

---

## 🎨 Phase 7: Component Library and Tooling

### Step 7.1: Install PrimeVue

```bash
cd frontend-vue3

# Install PrimeVue and theme
pnpm add primevue primeicons
pnpm add @primevue/themes

# Install additional PrimeVue utilities
pnpm add @primevue/auto-import-resolver
```

### Step 7.2: Configure PrimeVue

Create `src/plugins/primevue.ts`:

```typescript
import { App } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

// Import commonly used components
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'

export function configurePrimeVue(app: App) {
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: '.dark',
      }
    }
  })

  app.use(ToastService)

  // Register global components
  app.component('Button', Button)
  app.component('InputText', InputText)
  app.component('DataTable', DataTable)
  app.component('Column', Column)
  app.component('Dialog', Dialog)
  app.component('Toast', Toast)
}
```

### Step 7.3: CSS and Styling Setup

Create `src/styles/main.css`:

```css
/* PrimeVue Theme Import */
@import 'primeicons/primeicons.css';

/* Custom CSS Variables for CINERENTAL branding */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;

  /* Equipment Status Colors */
  --status-available: #28a745;
  --status-rented: #ffc107;
  --status-maintenance: #fd7e14;
  --status-broken: #dc3545;
  --status-retired: #6c757d;
}

/* Global styles to match existing frontend */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.5;
  color: #212529;
}

/* Equipment status badges */
.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-available { background-color: var(--status-available); color: white; }
.status-rented { background-color: var(--status-rented); color: black; }
.status-maintenance { background-color: var(--status-maintenance); color: white; }
.status-broken { background-color: var(--status-broken); color: white; }
.status-retired { background-color: var(--status-retired); color: white; }
```

---

## 🔍 Phase 8: HID Scanner Development Setup

### Step 8.1: WebUSB Development Setup

Configure Chrome for WebUSB development:

```bash
# Create Chrome shortcut for development (macOS)
alias chrome-dev="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --enable-experimental-web-platform-features --unsafely-treat-insecure-origin-as-secure=http://localhost:5173"

# Linux equivalent
alias chrome-dev="google-chrome --enable-experimental-web-platform-features --unsafely-treat-insecure-origin-as-secure=http://localhost:5173"
```

### Step 8.2: Mock Scanner Service

Create `src/services/scanner.ts`:

```typescript
// Mock scanner service for development
export class MockScannerService {
  private isEnabled = import.meta.env.VITE_ENABLE_MOCK_SCANNER === 'true'

  async simulateScan(barcode: string): Promise<void> {
    if (!this.isEnabled) return

    // Simulate HID input delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Dispatch keyboard events to simulate scanner input
    const event = new KeyboardEvent('keydown', {
      key: barcode,
      bubbles: true,
    })

    document.dispatchEvent(event)
  }

  generateTestBarcodes(): string[] {
    // Generate test barcodes matching backend format
    return [
      '00000000111', // Valid equipment barcode
      '00000000222',
      '00000000333',
    ]
  }
}
```

### Step 8.3: Scanner Testing Interface

Create development-only scanner testing component:

```vue
<!-- src/components/dev/ScannerTestPanel.vue -->
<template>
  <div v-if="isDevelopment" class="scanner-test-panel">
    <h3>🔧 Scanner Testing Panel</h3>
    <div class="test-controls">
      <Button
        v-for="barcode in testBarcodes"
        :key="barcode"
        @click="simulateScan(barcode)"
        severity="secondary"
      >
        Scan {{ barcode }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MockScannerService } from '@/services/scanner'

const isDevelopment = import.meta.env.DEV
const scanner = new MockScannerService()
const testBarcodes = scanner.generateTestBarcodes()

const simulateScan = (barcode: string) => {
  scanner.simulateScan(barcode)
}
</script>
```

---

## ✅ Phase 9: Verification and Testing

### Step 9.1: Development Server Verification

```bash
cd frontend-vue3

# Start all services
pnpm dev

# In separate terminals, verify services:

# Terminal 2: Backend health check
curl http://localhost:8000/api/v1/health

# Terminal 3: Frontend accessibility
curl http://localhost:5173

# Terminal 4: Run tests
pnpm test

# Terminal 5: E2E tests
pnpm test:e2e
```

### Step 9.2: Integration Testing

Create basic integration test in `tests/e2e/integration.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Backend Integration', () => {
  test('can connect to backend API', async ({ page }) => {
    await page.goto('/')

    // Test API connectivity indicator
    const healthIndicator = page.locator('[data-testid="api-health"]')
    await expect(healthIndicator).toContainText('Connected')
  })

  test('can load equipment data', async ({ page }) => {
    await page.goto('/equipment')

    // Wait for equipment list to load
    await page.waitForSelector('[data-testid="equipment-list"]')

    // Verify data loads from backend
    const equipmentItems = page.locator('[data-testid="equipment-item"]')
    await expect(equipmentItems.first()).toBeVisible()
  })
})
```

### Step 9.3: Performance Verification

```bash
# Install performance testing tools
pnpm add --save-dev lighthouse-ci @lhci/cli

# Create basic Lighthouse configuration
echo '{
  "ci": {
    "collect": {
      "url": ["http://localhost:5173"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", {"minScore": 0.8}],
        "categories:accessibility": ["error", {"minScore": 0.9}]
      }
    }
  }
}' > lighthouserc.json

# Run performance audit
pnpm dlx @lhci/cli collect --config=./lighthouserc.json
```

---

## 🐛 Phase 10: Troubleshooting Guide

### Common Issues and Solutions

#### 10.1: Node.js Version Issues

**Problem**: Vue3 project fails to start with Node.js version errors

**Solution**:

```bash
# Check Node.js version
node --version

# If below v18, update Node.js
nvm install --lts
nvm use --lts
```

#### 10.2: pnpm Installation Issues

**Problem**: `pnpm` command not found or version conflicts

**Solution**:

```bash
# Uninstall and reinstall pnpm
npm uninstall -g pnpm
npm install -g pnpm@latest

# Alternative: Use Corepack (Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

#### 10.3: Backend Connection Issues

**Problem**: Vue3 frontend cannot connect to FastAPI backend

**Solution**:

```bash
# Verify backend is running
docker compose ps

# Check backend health
curl http://localhost:8000/api/v1/health

# Verify CORS configuration in backend
grep -r "CORS_ORIGINS" /path/to/CINERENTAL

# Update backend CORS to include Vue3 dev server
# In docker-compose.override.yml:
# CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### 10.4: PrimeVue Styling Issues

**Problem**: PrimeVue components not styled correctly

**Solution**:

```bash
# Verify PrimeVue CSS imports in main.ts
grep -A5 -B5 "primevue" src/main.ts

# Check CSS import order - should be:
# 1. PrimeVue theme
# 2. PrimeIcons
# 3. Custom CSS
```

#### 10.5: Scanner Integration Issues

**Problem**: HID scanner not working in development

**Solution**:

```bash
# Start Chrome with WebUSB flags
chrome-dev --enable-experimental-web-platform-features

# Verify mock scanner is enabled
grep "VITE_ENABLE_MOCK_SCANNER" .env.local

# Test with keyboard events first
# Use Scanner Test Panel component
```

#### 10.6: Docker Development Issues

**Problem**: Docker services not communicating

**Solution**:

```bash
# Check Docker networks
docker network ls | grep act-rental

# Verify service connectivity
docker compose exec vue3-dev ping web

# Check port conflicts
lsof -i :5173
lsof -i :8000

# Restart with clean state
docker compose down -v
docker compose up --build
```

---

## 📊 Environment Verification Checklist

Use this checklist to verify your development environment is properly configured:

### ✅ Core Environment

- [ ] Node.js 18+ or 20+ LTS installed
- [ ] pnpm 8+ installed and configured
- [ ] Git configured with appropriate user settings
- [ ] VS Code with Vue3 extensions installed

### ✅ Vue3 Project Setup

- [ ] Vue3 project initialized in `frontend-vue3/`
- [ ] Dependencies installed with `pnpm install`
- [ ] Development server starts with `pnpm dev`
- [ ] Vue3 welcome page loads at `http://localhost:5173`

### ✅ Backend Integration

- [ ] Backend services running via Docker Compose
- [ ] API health endpoint responds: `curl http://localhost:8000/api/v1/health`
- [ ] CORS configured to allow Vue3 dev server
- [ ] Environment variables configured in `.env.local`

### ✅ Development Tooling

- [ ] ESLint and Prettier working in VS Code
- [ ] TypeScript compilation without errors
- [ ] Unit tests run with `pnpm test`
- [ ] E2E tests run with `pnpm test:e2e`

### ✅ Component Library

- [ ] PrimeVue components render correctly
- [ ] Theme styles applied properly
- [ ] Icons display from PrimeIcons
- [ ] Custom CINERENTAL styling loaded

### ✅ Scanner Development

- [ ] Mock scanner service configured
- [ ] Scanner test panel available in development
- [ ] Chrome WebUSB flags set for testing
- [ ] Keyboard event simulation working

### ✅ Docker Development

- [ ] Docker services communicate properly
- [ ] Vue3 dev container builds successfully
- [ ] Hot reload working in containerized environment
- [ ] Network connectivity between frontend and backend

---

## 🚀 Next Steps

After completing this setup guide:

1. **Review Component Architecture**: Study existing Bootstrap frontend components to plan Vue3 equivalents
2. **API Integration Planning**: Map all existing API endpoints used by current frontend
3. **Universal Cart Analysis**: Deep dive into existing Universal Cart for migration planning
4. **Scanner Integration Research**: Understand current HID scanner implementation patterns
5. **Testing Strategy**: Plan comprehensive testing approach for dual-frontend environment

### Recommended Reading

- [Vue3 Composition API Guide](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia State Management](https://pinia.vuejs.org/)
- [PrimeVue Component Documentation](https://primevue.org/)
- [Vite Configuration Guide](https://vitejs.dev/config/)
- [Playwright Testing](https://playwright.dev/)

---

## 📞 Support and Troubleshooting

### Internal Resources

- **Project Charter**: `frontend-vue3/DOCS/01-strategic/PROJECT_CHARTER.md`
- **Existing Frontend**: `frontend/static/js/` for reference implementations
- **Backend API**: `backend/api/v1/endpoints/` for API specifications
- **Docker Configuration**: `docker-compose.yml` and related files

### Development Team Contacts

- **Technical Lead**: Architecture and integration questions
- **Frontend Team**: Vue3 implementation guidance
- **Backend Team**: API compatibility and CORS issues
- **DevOps Team**: Docker and deployment configuration

---

**Document Prepared By**: Development Team
**Last Updated**: 2025-08-30
**Next Review**: Weekly during active development

This comprehensive setup guide ensures all developers can quickly establish a fully functional Vue3 development environment that integrates seamlessly with the existing CINERENTAL infrastructure while supporting the dual-frontend migration approach.
