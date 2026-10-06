# 🚀 VPS Deployment Quick Reference

## Overview
Your GenZ Living Space application is a **Next.js + Prisma** full-stack app. This document provides quick deployment commands.

---

## 📋 Required Packages to Install on VPS

### System Level
```bash
git curl wget build-essential python3 sqlite3 nginx certbot python3-certbot-nginx
```

### Node.js Runtime
```bash
Node.js 18+ (or latest LTS)
npm (comes with Node.js)
```

### npm Global Packages
```bash
pm2  # Process manager for keeping app running
```

### Database (Choose One)
- **SQLite**: Already included (file: ./prisma/prod.db) - Good for small deployments
- **PostgreSQL**: Recommended for production - `sudo apt install postgresql`

---

## 🔧 Installation Sequence

### Step 1: Server Preparation (5 min)
```bash
ssh root@your_vps_ip
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential python3 sqlite3 nginx certbot python3-certbot-nginx
```

### Step 2: Node.js Installation (2 min)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version && npm --version
```

### Step 3: Application Setup (5 min)
```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/genz-living-space.git
cd genz-living-space
npm install
npx prisma generate
```

### Step 4: Environment Configuration (3 min)
```bash
cp .env .env.production
nano .env.production  # Update with your production settings
```

**Key variables to update:**
- `DATABASE_URL` - Your database connection string
- `JWT_SECRET` - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `NEXT_PUBLIC_APP_URL` - Your domain (https://yourdomain.com)
- `PAYMENT_KEY_ID` & `PAYMENT_KEY_SECRET` - Razorpay credentials
- `SUPPORT_EMAIL` & `SUPPORT_PHONE` - Your contact info

### Step 5: Database Setup (2 min)
```bash
# For SQLite (simple)
npx prisma migrate deploy
npx prisma db seed

# OR for PostgreSQL (recommended)
# See DEPLOYMENT_GUIDE.md for PostgreSQL setup
```

### Step 6: Build Application (3 min)
```bash
npm run build
# Verify build succeeded
ls -la .next
```

### Step 7: Setup Process Manager (2 min)
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 8: Nginx & SSL Setup (5 min)
```bash
# See DEPLOYMENT_GUIDE.md Step 9 & 10 for detailed Nginx config
sudo nano /etc/nginx/sites-available/genz-living-space
# Add the config from DEPLOYMENT_GUIDE.md
sudo ln -s /etc/nginx/sites-available/genz-living-space /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 9: Firewall (1 min)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 📊 Package Summary

### npm Dependencies (Installed via npm install)
```json
{
  "core": [
    "next@14.2.15",
    "@prisma/client@5.21.1",
    "react@18.3.1",
    "react-dom@18.3.1"
  ],
  "features": [
    "bcryptjs - Password hashing",
    "jsonwebtoken - JWT authentication",
    "qrcode - QR code generation",
    "pdfkit - PDF invoice generation",
    "@zxing/browser - QR code scanning",
    "date-fns - Date utilities",
    "canvas-confetti - Animations"
  ],
  "ui": [
    "tailwindcss - Styling",
    "tailwind-merge",
    "lucide-react - Icons",
    "clsx - Class utilities"
  ]
}
```

### System Packages
```
git - Version control
curl, wget - Download utilities
build-essential - C++ compiler for native modules
python3 - For some build tools
sqlite3 - Database (if not using PostgreSQL)
nginx - Web server / reverse proxy
certbot - SSL certificate management
postgresql - Database (optional, recommended)
pm2 - Process manager (installed via npm)
```

---

## ✅ Verification Steps

### Check App is Running
```bash
pm2 status
pm2 logs genz-living-space
```

### Test in Browser
```
https://yourdomain.com
```

### Check Nginx
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Database Health
```bash
# SQLite
sqlite3 prisma/prod.db ".tables"

# PostgreSQL
psql $DATABASE_URL -c "\dt"
```

---

## 📈 Performance Tuning

### Optimize Database (if using PostgreSQL)
```bash
# On VPS, run:
sudo -u postgres vacuumdb -z genz_db
```

### Enable Nginx Caching
Already included in DEPLOYMENT_GUIDE.md Nginx config

### Monitor Performance
```bash
pm2 monit
```

---

## 🔄 Updating Application

### Quick Update (Pull & Rebuild)
```bash
cd /var/www/genz-living-space

# Option 1: Manual
git pull origin main
npm install
npm run build
pm2 restart genz-living-space

# Option 2: Using deploy script
./deploy.sh
```

### With Database Migrations
```bash
git pull origin main
npm install
npx prisma migrate deploy
npm run build
pm2 restart genz-living-space
```

---

## 🆘 Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs genz-living-space

# Rebuild
npm run build
pm2 restart genz-living-space
```

### Port Already in Use
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
pm2 restart genz-living-space
```

### Nginx Not Working
```bash
sudo nginx -t  # Check syntax
sudo systemctl status nginx
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues
```bash
sudo certbot renew --dry-run
sudo certbot renew
```

---

## 📱 Git Deployment Workflow

### Push to Repository
```bash
git add .
git commit -m "Production deployment"
git push origin main
```

### GitHub Actions (Optional - Auto Deploy)
Create `.github/workflows/deploy.yml` to auto-deploy on push

---

## 💾 Backup & Maintenance

### Daily Database Backup
```bash
# SQLite
cd /var/www/genz-living-space
cp prisma/prod.db prisma/backups/prod.db.$(date +%Y%m%d).backup

# PostgreSQL
pg_dump $DATABASE_URL > /var/backups/genz_db_$(date +%Y%m%d).sql
```

### Monitor Application
```bash
# View logs
pm2 logs genz-living-space

# Check status
pm2 status

# View memory usage
pm2 monit
```

---

## 🎯 Total Installation Time: ~30 minutes

| Step | Time |
|------|------|
| Server Preparation | 5 min |
| Node.js Install | 2 min |
| App Setup | 5 min |
| Environment Config | 3 min |
| Database Setup | 2 min |
| Build | 3 min |
| PM2 Setup | 2 min |
| Nginx & SSL | 5 min |
| Firewall | 1 min |
| **TOTAL** | **~28 min** |

---

## 📞 Support

If you encounter issues:
1. Check logs: `pm2 logs genz-living-space`
2. Check Nginx: `sudo systemctl status nginx`
3. Check database connection
4. Review DEPLOYMENT_GUIDE.md for detailed solutions

---

## Environment Variables Checklist

- [ ] `DATABASE_URL` - Set and tested
- [ ] `JWT_SECRET` - Generated and secure
- [ ] `NEXT_PUBLIC_APP_URL` - Set to your domain
- [ ] `PAYMENT_KEY_ID` - Razorpay key
- [ ] `PAYMENT_KEY_SECRET` - Razorpay secret
- [ ] `PAYMENT_WEBHOOK_SECRET` - Webhook secret
- [ ] `SUPPORT_EMAIL` - Company email
- [ ] `SUPPORT_PHONE` - Company phone
- [ ] `NODE_ENV` - Set to "production"

---

**Ready to deploy? Follow the "Installation Sequence" section step by step!** 🚀
