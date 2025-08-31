# CINERENTAL Vue3 Frontend Deployment Guide

**Document Version**: 1.0
**Last Updated**: 2025-08-29
**Target Application**: CINERENTAL Vue3 Frontend Migration

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Environment Requirements](#environment-requirements)
3. [Build Process](#build-process)
4. [Deployment Strategies](#deployment-strategies)
5. [Environment Configuration](#environment-configuration)
6. [Production Checklist](#production-checklist)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring & Health Checks](#monitoring--health-checks)

---

## 🎯 Overview

### Deployment Architecture

The CINERENTAL Vue3 frontend follows a modern SPA (Single Page Application) deployment pattern:

- **Build Process**: Vite-based production build with TypeScript compilation
- **Static Asset Serving**: CDN-ready static files with optimized caching
- **API Integration**: RESTful API communication with FastAPI backend
- **Reverse Proxy**: Nginx configuration for production serving

### Deployment Targets

- **Development**: Hot-reload development server on `localhost:5173`
- **Staging**: Production build served via Nginx with staging API endpoints
- **Production**: Optimized build with CDN integration and monitoring

---

## 🔧 Environment Requirements

### System Requirements

```yaml
# Minimum Requirements
Node.js: >= 18.0.0
npm: >= 8.0.0
RAM: 2GB minimum for build process
Storage: 1GB for dependencies and build artifacts

# Recommended Requirements
Node.js: >= 20.0.0
npm: >= 10.0.0
RAM: 4GB for optimal build performance
Storage: 2GB for development dependencies
```

### Required Dependencies

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🏗️ Build Process

### Development Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Development server runs on http://localhost:5173
# Hot module replacement enabled
# Source maps enabled for debugging
```

### Production Build

```bash
# Install production dependencies only
npm ci --production=false

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Output directory: dist/
# Assets are minified and optimized
# Source maps excluded in production
```

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  base: process.env.NODE_ENV === 'production' ? '/app/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          utils: ['axios', '@vueuse/core']
        }
      }
    }
  }
})
```

---

## 🚀 Deployment Strategies

### 1. Static File Deployment

**Best for**: Simple deployments, CDN integration

```bash
# Build production files
npm run build

# Deploy to static file server
rsync -avz --delete dist/ user@server:/var/www/cinerental/

# Update Nginx configuration
sudo systemctl reload nginx
```

### 2. Docker Deployment

**Best for**: Containerized environments, consistent deployments

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. CI/CD Pipeline Deployment

**Best for**: Automated deployments, multiple environments

```yaml
# .github/workflows/deploy.yml
name: Deploy Vue3 Frontend
on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run build

      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: |
          rsync -avz dist/ ${{ secrets.STAGING_HOST }}:/var/www/staging/

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: |
          rsync -avz dist/ ${{ secrets.PROD_HOST }}:/var/www/production/
```

---

## ⚙️ Environment Configuration

### Environment Variables

```typescript
// src/config/environment.ts
interface Environment {
  apiBaseUrl: string
  appVersion: string
  environment: 'development' | 'staging' | 'production'
  enableDebugMode: boolean
  cdnUrl?: string
}

export const config: Environment = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: (import.meta.env.VITE_ENVIRONMENT as Environment['environment']) || 'development',
  enableDebugMode: import.meta.env.VITE_DEBUG === 'true',
  cdnUrl: import.meta.env.VITE_CDN_URL
}
```

### Environment Files

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8000
VITE_ENVIRONMENT=development
VITE_DEBUG=true

# .env.staging
VITE_API_BASE_URL=https://staging-api.cinerental.com
VITE_ENVIRONMENT=staging
VITE_DEBUG=false

# .env.production
VITE_API_BASE_URL=https://api.cinerental.com
VITE_ENVIRONMENT=production
VITE_DEBUG=false
VITE_CDN_URL=https://cdn.cinerental.com
```

### Nginx Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name cinerental.com;
    root /var/www/cinerental;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Handle Vue Router history mode
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## ✅ Production Checklist

### Pre-Deployment Verification

- [ ] **Type Checking**: All TypeScript errors resolved
- [ ] **Linting**: Code passes ESLint and Prettier checks
- [ ] **Testing**: All unit and integration tests pass
- [ ] **Build**: Production build completes without errors
- [ ] **Environment**: Production environment variables configured
- [ ] **API Connectivity**: Backend API endpoints accessible
- [ ] **Dependencies**: Security audit completed (`npm audit`)

### Performance Optimization

- [ ] **Bundle Analysis**: Bundle size analyzed and optimized
- [ ] **Code Splitting**: Dynamic imports implemented for large routes
- [ ] **Asset Optimization**: Images and fonts optimized
- [ ] **CDN Configuration**: Static assets configured for CDN delivery
- [ ] **Caching Strategy**: HTTP caching headers properly configured

### Security Checklist

- [ ] **CSP Headers**: Content Security Policy configured
- [ ] **HTTPS**: SSL/TLS certificates installed
- [ ] **API Security**: CORS properly configured
- [ ] **Secrets**: No sensitive data in client-side code
- [ ] **Dependencies**: No known vulnerabilities in dependencies

---

## 🔄 Rollback Procedures

### Quick Rollback Strategy

```bash
#!/bin/bash
# rollback.sh

# Stop current deployment
sudo systemctl stop nginx

# Restore previous version
cp -r /var/www/cinerental-backup/* /var/www/cinerental/

# Restart services
sudo systemctl start nginx

# Verify rollback
curl -f http://localhost/health || echo "Rollback verification failed"
```

### Database State Considerations

```typescript
// During rollback, ensure frontend compatibility
export const API_VERSION_COMPATIBILITY = {
  'v1.0.0': ['1.15.0', '1.16.0'], // Frontend versions compatible with backend v1.0.0
  'v1.1.0': ['1.16.0', '1.17.0']  // Frontend versions compatible with backend v1.1.0
}
```

---

## 📊 Monitoring & Health Checks

### Application Health Endpoint

```typescript
// src/utils/health.ts
export async function performHealthCheck(): Promise<HealthStatus> {
  try {
    const apiResponse = await axios.get('/api/health')
    return {
      status: 'healthy',
      apiConnection: apiResponse.status === 200,
      version: config.appVersion,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      apiConnection: false,
      error: error.message
    }
  }
}
```

### Performance Monitoring

```typescript
// src/utils/monitoring.ts
export function initializeMonitoring() {
  // Track route changes
  router.afterEach((to) => {
    analytics.track('page_view', {
      route: to.name,
      timestamp: Date.now()
    })
  })

  // Track API response times
  axios.interceptors.response.use(
    response => {
      const duration = Date.now() - response.config.metadata?.startTime
      analytics.track('api_response_time', {
        endpoint: response.config.url,
        method: response.config.method,
        duration
      })
      return response
    }
  )
}
```

---

## 🔧 Troubleshooting

### Common Deployment Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **White screen** | App loads but shows blank page | Check console for JS errors, verify base URL configuration |
| **API connection failed** | Network errors in console | Verify CORS configuration, check API endpoint URLs |
| **Route not found** | 404 errors on refresh | Configure Nginx for SPA history mode |
| **Slow loading** | Long initial load times | Enable gzip, optimize bundle size, configure CDN |

### Debug Mode Activation

```typescript
// Enable debug mode in production (temporary)
if (window.location.search.includes('debug=true')) {
  config.enableDebugMode = true
  console.log('Debug mode activated')
}
```

---

**Document Maintainer**: DevOps Team
**Review Schedule**: Monthly
**Next Review**: 2025-09-29
