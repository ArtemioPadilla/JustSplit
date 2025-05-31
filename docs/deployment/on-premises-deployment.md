# On-Premises Deployment Guide

This guide covers deploying JustSplit on your own infrastructure, either on-premises or using a VPS/cloud provider of your choice.

## Overview

JustSplit can be deployed without Firebase using:
- **Docker** for containerization
- **PostgreSQL** as the database
- **Nginx** as a reverse proxy
- **PM2** for process management (alternative to Docker)

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose (or Node.js 18+ for non-Docker deployment)
- PostgreSQL 13+
- Nginx
- SSL certificate (Let's Encrypt recommended)
- Domain name (optional but recommended)

## Architecture for On-Premises

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Nginx     │────▶│  Hub App    │────▶│              │
│   Reverse   │     │  Port 3000  │     │  PostgreSQL  │
│   Proxy     │     └─────────────┘     │  Database    │
│   Port 80/  │                         │              │
│   443       │     ┌─────────────┐     │              │
│             │────▶│ JustSplit   │────▶│              │
└─────────────┘     │  Port 4000  │     └──────────────┘
                    └─────────────┘
```

## Database Setup

### 1. Install PostgreSQL
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 2. Create Databases
```sql
sudo -u postgres psql

CREATE DATABASE justsplit_hub;
CREATE DATABASE justsplit_app;
CREATE USER justsplit_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE justsplit_hub TO justsplit_user;
GRANT ALL PRIVILEGES ON DATABASE justsplit_app TO justsplit_user;
```

### 3. Configure Database Schema

Create migration files for Firestore replacement:

```sql
-- Hub database schema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- JustSplit database schema
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  date DATE NOT NULL,
  paid_by UUID NOT NULL,
  participants UUID[] NOT NULL,
  settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Docker Deployment

### 1. Create Docker Configuration

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  hub:
    build:
      context: .
      dockerfile: apps/hub/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://justsplit_user:password@db:5432/justsplit_hub
    depends_on:
      - db
    restart: unless-stopped

  justsplit:
    build:
      context: .
      dockerfile: apps/justsplit/Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://justsplit_user:password@db:5432/justsplit_app
      - HUB_URL=http://hub:3000
    depends_on:
      - db
      - hub
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=justsplit_user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=justsplit_hub
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - hub
      - justsplit
    restart: unless-stopped

volumes:
  postgres_data:
```

### 2. Create Dockerfiles

`apps/hub/Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY nx.json workspace.json tsconfig.base.json ./
COPY apps/hub ./apps/hub
COPY libs ./libs

RUN npm ci
RUN npx nx build hub --configuration=production

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/hub/.next/standalone ./
COPY --from=builder /app/apps/hub/.next/static ./apps/hub/.next/static
COPY --from=builder /app/apps/hub/public ./apps/hub/public

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "apps/hub/server.js"]
```

### 3. Build and Run
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Non-Docker Deployment (PM2)

### 1. Install Dependencies
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### 2. Build Applications
```bash
# Clone repository
git clone https://github.com/your-org/justsplit.git
cd justsplit

# Install dependencies
npm install

# Build all apps
nx run-many --target=build --all --configuration=production
```

### 3. Create PM2 Configuration

`ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'hub',
      script: 'npm',
      args: 'start',
      cwd: './apps/hub',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/justsplit_hub'
      }
    },
    {
      name: 'justsplit',
      script: 'npm',
      args: 'start',
      cwd: './apps/justsplit',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/justsplit_app'
      }
    }
  ]
};
```

### 4. Start Applications
```bash
# Start all apps
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

## Nginx Configuration

Create `/etc/nginx/sites-available/justsplit`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Hub application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # JustSplit application
    location /app {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/justsplit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Environment Variables

Create `.env.production` for each app:

### Hub Environment
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:5432/justsplit_hub
JWT_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret
```

### JustSplit Environment
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:5432/justsplit_app
HUB_URL=https://your-domain.com
NEXT_PUBLIC_HUB_URL=https://your-domain.com
```

## Backup Strategy

### Database Backups
```bash
# Create backup script
cat > /home/user/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U justsplit_user justsplit_hub > /backups/hub_$DATE.sql
pg_dump -U justsplit_user justsplit_app > /backups/app_$DATE.sql

# Keep only last 7 days
find /backups -name "*.sql" -mtime +7 -delete
EOF

chmod +x /home/user/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /home/user/backup.sh
```

### Application Backups
```bash
# Backup uploads and data
rsync -av /var/www/justsplit/uploads /backups/uploads/
```

## Monitoring

### Setup Monitoring Stack
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Health Checks
Add health check endpoints:
```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
}
```

## Security Hardening

### 1. Firewall Setup
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2ban Configuration
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 3. Security Headers
Add to Nginx configuration:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :4000
   ```

2. **Database Connection Issues**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify credentials and connection string
   - Check firewall rules

3. **PM2 Issues**
   ```bash
   pm2 logs
   pm2 restart all
   pm2 status
   ```

4. **Nginx Issues**
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

## Performance Optimization

1. **Enable Gzip Compression** in Nginx
2. **Use CDN** for static assets
3. **Enable HTTP/2** in Nginx
4. **Optimize PostgreSQL** queries and indexes
5. **Use Redis** for session storage (optional)