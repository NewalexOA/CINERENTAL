# Docker Setup for React Frontend

This document explains how to run the React frontend in Docker containers.

## Overview

The frontend has two Docker configurations:

- **Development mode** (`Dockerfile.dev`): Vite dev server with hot reload
- **Production mode** (`Dockerfile`): Nginx serving optimized build

## Development Mode

### Quick Start

From the project root directory:

```bash
# Start all services including frontend
docker compose up

# Or start only frontend (requires backend to be running)
docker compose up frontend
```

The frontend will be available at **<http://localhost:5173>**

### Features

- **Hot Module Replacement (HMR)**: Changes to source files automatically reload in browser
- **Source maps**: Full debugging support
- **Volume mounts**: Your local code changes are reflected immediately
- **API Proxy**: Requests to `/api` are proxied to the backend at `http://web:8000`

### Configuration

Environment variables for development:

- `BACKEND_URL`: Backend service URL (default: `http://web:8000`)
- `NODE_ENV`: Set to `development`

### Mounted Volumes

The following directories are mounted for hot reload:

- `./src` - Source code
- `./public` - Public assets
- `index.html` - Entry HTML
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration

Note: `node_modules` is NOT mounted to avoid conflicts.

## Production Mode

### Build and Run

```bash
# Build and start production services
docker compose -f docker-compose.prod.yml up --build

# Or build frontend only
docker compose -f docker-compose.prod.yml build frontend
```

### Features

- **Optimized Build**: Minified JavaScript and CSS
- **Nginx**: High-performance web server
- **Gzip Compression**: Reduced bandwidth usage
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Client-side Routing**: React Router support with fallback to index.html
- **Static Asset Caching**: 1-year cache for JS/CSS/images
- **API Proxy**: Nginx proxies `/api` requests to backend

### Nginx Configuration

The production setup includes:

- Listens on port 5173 (matching dev server)
- Proxies `/api` to `http://web:8000`
- Handles React Router with `try_files` directive
- Caches static assets for 1 year
- Disables caching for `index.html`

## Docker Commands Reference

### Development

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Rebuild and start
docker compose up --build

# Stop services
docker compose down

# View logs
docker compose logs frontend

# Follow logs
docker compose logs -f frontend

# Execute commands in container
docker compose exec frontend sh
docker compose exec frontend npm run lint
```

### Production

```bash
# Start production services
docker compose -f docker-compose.prod.yml up

# Build only
docker compose -f docker-compose.prod.yml build frontend

# Stop and remove containers
docker compose -f docker-compose.prod.yml down

# View logs
docker compose -f docker-compose.prod.yml logs frontend
```

## Troubleshooting

### Port Already in Use

If port 5173 is already in use:

```bash
# Find process using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "5174:5173"  # Map to different host port
```

### Container Won't Start

```bash
# Check logs
docker compose logs frontend

# Rebuild without cache
docker compose build --no-cache frontend

# Check if dependencies are installed
docker compose exec frontend ls -la node_modules
```

### Hot Reload Not Working

1. Ensure volume mounts are correct in `docker-compose.yml`
2. Check that Vite is running in the container:

   ```bash
   docker compose logs frontend
   ```

3. Verify file changes are being detected:

   ```bash
   docker compose exec frontend ls -la /app/src
   ```

### API Requests Failing

1. Check backend is running:

   ```bash
   docker compose ps web
   ```

2. Verify CORS settings in backend allow `http://localhost:5173`

3. Check network connectivity:

   ```bash
   docker compose exec frontend ping web
   ```

4. Review backend logs:

   ```bash
   docker compose logs web
   ```

## Architecture

### Development Architecture

```text
Browser (localhost:5173)
    ↓
Vite Dev Server (Docker container)
    ↓ /api requests
Backend API (web:8000)
```

### Production Architecture

```text
Browser (localhost:5173)
    ↓
Nginx (Docker container)
    ↓ static files → /usr/share/nginx/html
    ↓ /api requests → Backend API (web:8000)
```

## Performance

### Development

- Container size: ~450MB (Node.js + dependencies)
- Startup time: ~10-15 seconds
- HMR update: <100ms

### Production

- Container size: ~50MB (Nginx + static build)
- Startup time: <2 seconds
- Response time: <10ms (static assets)

## Security

### Development

- Container runs as root (development only)
- All ports exposed to host
- Debug mode enabled

### Production

- Security headers configured in Nginx
- CORS restricted to specific origins
- Static assets only, no code execution
- Healthcheck enabled

## Next Steps

1. **Environment Variables**: Create `.env.production` for production settings
2. **SSL/TLS**: Add HTTPS support with Let's Encrypt
3. **CDN**: Configure CloudFlare or similar for static assets
4. **Monitoring**: Add application performance monitoring
