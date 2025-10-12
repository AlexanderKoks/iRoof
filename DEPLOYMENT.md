# Deployment Guide - Roof Measurement App

## Overview

This guide provides instructions for deploying the Roof Measurement App to various environments including development, staging, and production.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git for version control

## Environment Setup

### Development Environment

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd roof-measurement-app
npm install
```

2. **Start development server:**
```bash
npm run dev
# or
npm start
```

3. **Access the application:**
Open `http://localhost:4200` in your browser

### Production Build

1. **Build for production:**
```bash
npm run build:prod
```

2. **Build with SSR (Server-Side Rendering):**
```bash
npm run build:ssr
```

3. **Start production server:**
```bash
npm run start:prod
```

## Deployment Options

### 1. Static Hosting (Netlify, Vercel, GitHub Pages)

For client-side only deployment:

```bash
# Build the application
npm run build:prod

# Deploy the dist/roof-measurement-app/browser folder
```

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  publish = "dist/roof-measurement-app/browser"
  command = "npm run build:prod"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Node.js Hosting (Heroku, Railway, DigitalOcean)

For full-stack deployment with SSR:

**Heroku Configuration** (`Procfile`):
```
web: npm run start:prod
```

**Environment Variables:**
```bash
NODE_ENV=production
PORT=8080
```

**Deploy steps:**
```bash
# Build for production
npm run build:ssr

# Deploy to Heroku
heroku create roof-measurement-app
git push heroku main
```

### 3. Docker Deployment

**Dockerfile:**
```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build:ssr

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

EXPOSE 4000
CMD ["node", "dist/roof-measurement-app/server/server.mjs"]
```

**Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
    restart: unless-stopped
```

**Build and run:**
```bash
docker build -t roof-measurement-app .
docker run -p 4000:4000 roof-measurement-app
```

## Environment Variables

### Required Environment Variables

- `NODE_ENV`: Set to 'production' for production builds
- `PORT`: Port number for the server (default: 4000)

### Optional Environment Variables

- `MAPBOX_ACCESS_TOKEN`: Custom Mapbox access token
- `API_BASE_URL`: Base URL for API endpoints
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## Performance Optimization

### 1. Enable Gzip Compression

Add to your server configuration:

```javascript
// For Express.js
app.use(compression());

// For Nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. CDN Configuration

Configure CDN for static assets:

```javascript
// In angular.json
"outputPath": "dist/roof-measurement-app",
"deployUrl": "https://cdn.yoursite.com/"
```

### 3. Service Worker (PWA)

Add Progressive Web App capabilities:

```bash
ng add @angular/pwa
npm run build:prod
```

## Security Configuration

### 1. HTTPS Setup

Always use HTTPS in production:

```bash
# Let's Encrypt with Certbot
certbot --nginx -d yourdomain.com
```

### 2. Security Headers

Already configured in `server.ts`:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### 3. API Security

- Rate limiting
- CORS configuration
- Input validation
- Authentication (if needed)

## Monitoring and Logging

### 1. Application Monitoring

Consider adding:
- Error tracking (Sentry)
- Performance monitoring (New Relic)
- Uptime monitoring (Pingdom)

### 2. Log Management

```javascript
// Add structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});
```

## Backup and Recovery

### 1. Database Backup (if using database)

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/roofapp"

# PostgreSQL backup
pg_dump roofapp > backup.sql
```

### 2. Asset Backup

Backup uploaded files and generated PDFs regularly.

## CI/CD Pipeline

### GitHub Actions Example (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Build application
      run: npm run build:ssr
    
    - name: Deploy to production
      run: |
        # Add your deployment commands here
        echo "Deploying to production..."
```

## Troubleshooting

### Common Issues

1. **Build failures:**
   - Check Node.js version compatibility
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

2. **Memory issues:**
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`

3. **API CORS errors:**
   - Configure CORS headers in server.ts
   - Check API endpoint URLs

4. **Map tiles not loading:**
   - Verify Mapbox access token
   - Check network connectivity
   - Validate API quotas

### Health Checks

The application includes a health check endpoint:
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-11T12:00:00.000Z",
  "version": "0.0.0"
}
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Update dependencies:**
```bash
npm audit
npm update
```

2. **Monitor performance:**
- Check server response times
- Monitor memory usage
- Review error logs

3. **Security updates:**
- Keep dependencies updated
- Review security advisories
- Update access tokens when needed

### Support Channels

- GitHub Issues for bug reports
- Documentation wiki for guides
- Team chat for urgent issues

## Scaling Considerations

### Horizontal Scaling

- Load balancer configuration
- Session management
- Shared storage for uploads

### Vertical Scaling

- Increase server resources
- Optimize database queries
- Implement caching strategies

### Database Scaling

- Read replicas
- Database sharding
- Connection pooling

This deployment guide ensures your Roof Measurement App is production-ready and scalable.