# GenZ Living Space - VPS Deployment Guide

## Prerequisites & System Requirements

### Server Specs (Recommended)
- **OS**: Ubuntu 20.04 LTS or Ubuntu 22.04 LTS
- **RAM**: 2GB minimum (4GB recommended)
- **Storage**: 20GB minimum
- **CPU**: 1vCPU minimum (2+ vCPU recommended)

---

## Step 1: Initial Server Setup

### 1.1 Connect to Your VPS via SSH
```bash
ssh root@your_vps_ip_address
# or if you have a specific user
ssh ubuntu@your_vps_ip_address
```

### 1.2 Update System Packages
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Install Required System Packages
```bash
sudo apt install -y \
  git \
  curl \
  wget \
  build-essential \
  python3 \
  sqlite3 \
  nginx \
  certbot \
  python3-certbot-nginx
```

---

## Step 2: Install Node.js & npm

### Using NodeSource (Recommended - Latest LTS)
```bash
# For Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Alternative: Using nvm (Node Version Manager)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

---

## Step 3: Clone Your Repository

### 3.1 Setup SSH Key (Optional but Recommended)
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Copy the public key to GitHub/GitLab
cat ~/.ssh/id_ed25519.pub
```

### 3.2 Clone the Repository
```bash
cd /var/www
sudo git clone https://github.com/your-username/genz-living-space.git
cd genz-living-space
sudo chown -R $USER:$USER /var/www/genz-living-space
```

---

## Step 4: Install Dependencies

```bash
cd /var/www/genz-living-space
npm install

# Generate Prisma client
npx prisma generate
```

---

## Step 5: Environment Configuration

### 5.1 Create Production .env File
```bash
cp .env .env.production
nano .env.production  # or use vim/vi
```

### 5.2 Update Environment Variables for Production
```env
# Database (use PostgreSQL in production recommended)
# Option A: SQLite (for small deployments)
DATABASE_URL="file:./prisma/prod.db"

# Option B: PostgreSQL (Recommended for production)
DATABASE_URL="postgresql://user:password@localhost:5432/genz_db"

# JWT Secret (Generate a secure random key)
JWT_SECRET="generate_a_strong_random_secret_key_here_min_32_chars"

# App URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# Payment Gateway
PAYMENT_KEY_ID="your_razorpay_key_id"
PAYMENT_KEY_SECRET="your_razorpay_secret_key"
PAYMENT_WEBHOOK_SECRET="your_webhook_secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="your_razorpay_key_id"

# Support Contact
SUPPORT_EMAIL="support@yourdomain.com"
SUPPORT_PHONE="+91 XXXXXXXXXX"

# Node Environment
NODE_ENV="production"
```

### Generate Secure JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 6: Database Setup

### Option A: SQLite (Simple, for small deployments)
```bash
# Database will be created automatically
npx prisma migrate deploy
npx prisma db seed
```

### Option B: PostgreSQL (Recommended for production)

#### Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Create Database and User
```bash
sudo -u postgres psql

# In PostgreSQL shell
CREATE DATABASE genz_db;
CREATE USER genz_user WITH PASSWORD 'your_secure_password';
ALTER ROLE genz_user SET client_encoding TO 'utf8';
ALTER ROLE genz_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE genz_user SET default_transaction_deferrable TO on;
ALTER ROLE genz_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE genz_db TO genz_user;
\q
```

#### Run Migrations
```bash
cd /var/www/genz-living-space
npx prisma migrate deploy
npx prisma db seed
```

---

## Step 7: Build the Application

```bash
cd /var/www/genz-living-space
npm run build

# Verify build
ls -la .next
```

---

## Step 8: Setup Process Manager (PM2)

### 8.1 Install PM2 Globally
```bash
sudo npm install -g pm2
pm2 startup
```

### 8.2 Create PM2 Ecosystem File
```bash
cat > /var/www/genz-living-space/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'genz-living-space',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/genz-living-space',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF
```

### 8.3 Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8.4 Verify PM2 is Running
```bash
pm2 list
pm2 logs genz-living-space
```

---

## Step 9: Configure Nginx Reverse Proxy

### 9.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/genz-living-space
```

### 9.2 Add Configuration
```nginx
upstream genz_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client Upload Size
    client_max_body_size 10M;

    location / {
        proxy_pass http://genz_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Caching for static files
    location /_next/static {
        proxy_pass http://genz_backend;
        proxy_cache_valid 30d;
        proxy_cache_bypass $http_pragma $http_authorization;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    location /static {
        proxy_pass http://genz_backend;
        proxy_cache_valid 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }
}
```

### 9.3 Enable Nginx Configuration
```bash
sudo ln -s /etc/nginx/sites-available/genz-living-space /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

---

## Step 10: Setup SSL Certificate with Let's Encrypt

```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Step 11: Setup Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

## Step 12: Git Push & Deployment Workflow

### 12.1 Initialize Git Repository (if not already)
```bash
cd /var/www/genz-living-space
git init
git remote add origin https://github.com/your-username/genz-living-space.git
git branch -M main
```

### 12.2 Push Code to GitHub
```bash
git add .
git commit -m "Initial production deployment"
git push -u origin main
```

### 12.3 Create Deployment Script
```bash
cat > /var/www/genz-living-space/deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Build application
npm run build

# Restart PM2
pm2 restart genz-living-space

echo "✅ Deployment complete!"
EOF

chmod +x deploy.sh
```

### 12.4 Automated Deployment (Optional - GitHub Actions)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/genz-living-space
            ./deploy.sh
```

---

## Step 13: Monitoring & Maintenance

### Check Application Status
```bash
pm2 status
pm2 logs genz-living-space --lines 50
```

### View Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Backup (SQLite)
```bash
cd /var/www/genz-living-space
cp prisma/prod.db prisma/prod.db.backup.$(date +%Y%m%d_%H%M%S)
```

### Database Backup (PostgreSQL)
```bash
sudo -u postgres pg_dump genz_db > genz_db_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Step 14: Performance Optimization

### Enable Gzip Compression in Nginx
```bash
sudo nano /etc/nginx/nginx.conf

# Add in http block:
gzip on;
gzip_vary on;
gzip_min_length 1000;
gzip_types text/plain text/css text/xml text/javascript 
           application/x-javascript application/xml+rss 
           application/javascript application/json;
```

### Increase Node.js File Descriptors
```bash
echo "fs.file-max = 2097152" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs genz-living-space

# Rebuild and restart
npm run build
pm2 restart genz-living-space
```

### Port Already in Use
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL

# Or for SQLite
sqlite3 prisma/prod.db ".tables"
```

### SSL Certificate Issues
```bash
sudo certbot renew --dry-run
sudo certbot renew
```

---

## Production Checklist

- [ ] Install Node.js and npm
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Configure .env.production
- [ ] Setup database (SQLite or PostgreSQL)
- [ ] Run migrations
- [ ] Build application
- [ ] Setup PM2
- [ ] Configure Nginx
- [ ] Setup SSL with Let's Encrypt
- [ ] Configure Firewall (UFW)
- [ ] Test application at https://yourdomain.com
- [ ] Setup automated backups
- [ ] Monitor logs regularly
- [ ] Setup monitoring (optional: Uptimerobot, DataDog)

---

## Summary of Packages to Install

**System Packages:**
- git, curl, wget, build-essential, python3, sqlite3, nginx, certbot

**Node.js & npm** (Latest LTS)

**npm Packages:**
- All listed in package.json (npm install handles this)

**Optional but Recommended:**
- PM2 (process management)
- PostgreSQL (production database)
- Certbot (SSL certificates)

---

## Quick Start Summary

```bash
# 1. SSH to VPS
ssh root@your_vps_ip

# 2. System setup
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential python3 sqlite3 nginx certbot python3-certbot-nginx

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Clone & Setup
cd /var/www
sudo git clone YOUR_REPO_URL
cd genz-living-space
npm install

# 5. Environment & Database
cp .env .env.production
# Edit .env.production with production values
npx prisma migrate deploy && npx prisma db seed

# 6. Build
npm run build

# 7. PM2 Setup
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save

# 8. Nginx & SSL
# Follow steps 9-10 above

# Done! 🚀
```
