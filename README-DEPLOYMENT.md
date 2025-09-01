# Dual Frontend Deployment Guide

## Architecture Overview

CINERENTAL now supports **soft migration** between two frontends:

- **MVP Frontend**: `frontend/` - Bootstrap + Vanilla JS (legacy)
- **Vue3 Frontend**: `frontend-vue3/` - Vue 3 + TypeScript + TailwindCSS (new)

## Deployment Modes

### Development Mode

```bash
# Standard Docker Compose pattern - override.yml automatically loaded
docker compose up

# Access points:
# - MVP Frontend: http://localhost:8000 (FastAPI + static files)
# - Vue3 Frontend: http://localhost:5173 (Vite dev server)
# - API: http://localhost:8000/api/v1

# Optional: Start with Nginx reverse proxy for route testing
docker compose --profile proxy up

# Access points with proxy:
# - Nginx Proxy: http://localhost:3000 (routes to both frontends)
# - MVP Frontend: http://localhost:3000/ (default)
# - Vue3 Frontend: http://localhost:3000/v3 (new frontend)
```

### Production Mode

```bash
# Build and deploy both frontends
docker compose -f docker-compose.prod.yml up

# Access points:
# - MVP Frontend: http://localhost/ (default)
# - Vue3 Frontend: http://localhost/v3 (new frontend)
# - API: http://localhost/api/
```

## Nginx Routing Strategy

### Soft Migration Paths

- `/` → MVP Frontend (default, legacy users)
- `/v3` → Vue3 Frontend (new frontend)
- `/api/` → FastAPI backend
- `/admin` → FastAPI admin interface

### WebSocket Support

Vue3 development includes HMR (Hot Module Replacement) via WebSocket proxy.

## GitHub Actions

Automated deployment builds and pushes:

1. **Backend + MVP**: `cinerental-backend:latest`
2. **Vue3 Frontend**: `cinerental-vue3:latest`

## Environment Variables

```bash
# Required for production
DOCKER_USERNAME=your-dockerhub-username
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-password
POSTGRES_DB=act-rental
REDIS_PASSWORD=secure-redis-password
SECRET_KEY=secure-jwt-secret
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Migration Strategy

1. **Phase 1**: Deploy both frontends simultaneously
2. **Phase 2**: Redirect specific user groups to `/v3`
3. **Phase 3**: Gradually migrate all users to Vue3
4. **Phase 4**: Sunset MVP frontend when migration complete

## Container Resources

### Development
- Backend: Unlimited (development)
- Vue3: Unlimited (development)
- PostgreSQL: 512M limit
- Redis: 256M limit

### Production
- Backend: 2 CPU, 1GB RAM
- Vue3: 0.5 CPU, 256MB RAM
- PostgreSQL: 2 CPU, 1GB RAM
- Redis: 1 CPU, 256MB RAM
- Nginx: 0.5 CPU, 128MB RAM

## Health Checks

All services include health checks:
- Backend: `/api/v1/health`
- Vue3: `/health` (nginx)
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`

## SSL/TLS Support

Production configuration includes SSL certificate mounting:
```bash
# Place certificates in ./ssl/
- ./ssl:/etc/nginx/ssl
```

## Monitoring

Access logs and metrics:
```bash
# View container logs
docker compose -f docker-compose.prod.yml logs -f

# Monitor resource usage
docker stats
```
