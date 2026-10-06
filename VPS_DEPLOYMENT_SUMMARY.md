# GenZ Living Space - Complete VPS Deployment Guide

## 📚 Documentation Files Created

1. **DEPLOYMENT_GUIDE.md** - Complete step-by-step deployment instructions
2. **DEPLOYMENT_QUICK_REFERENCE.md** - Quick checklist and summary
3. **deploy.sh** - Automated deployment script
4. **ecosystem.config.js** - PM2 process manager configuration
5. **.github/workflows/deploy.yml** - GitHub Actions CI/CD pipeline
6. **.env.example** - Environment variables template

---

## 🎯 Quick Summary: What Needs to Be Installed on VPS

### System-Level Packages
```bash
git, curl, wget, build-essential, python3, sqlite3, nginx, certbot, python3-certbot-nginx
```

### Runtime
- **Node.js 18+** (Latest LTS recommended - v20)
- **npm** (comes with Node.js)

### Database (Choose One)
- **SQLite** - Already included, good for small deployments
- **PostgreSQL** - Recommended for production

### Process Manager
- **PM2** - Keeps your Node.js app running 24/7

### Total New Packages: ~12 packages

---

## 🚀 30-Minute Deployment Process

### 1️⃣ Server Setup (5 min)
```bash
ssh root@your_vps_ip
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential python3 sqlite3 nginx certbot python3-certbot-nginx
```

### 2️⃣ Node.js Installation (2 min)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3️⃣ App Deployment (8 min)
```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/genz-living-space.git
cd genz-living-space
npm install
```

### 4️⃣ Configuration (3 min)
```bash
cp .env .env.production
nano .env.production
# Update: DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL, Payment keys
```

### 5️⃣ Database & Build (5 min)
```bash
npx prisma migrate deploy
npm run build
```

### 6️⃣ Process Manager (2 min)
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.js
```

### 7️⃣ Nginx & SSL (5 min)
Follow DEPLOYMENT_GUIDE.md Steps 9-10

---

## 📋 Deployment Checklist

### Pre-Deployment ✅
- [ ] Have VPS credentials ready
- [ ] Domain name configured
- [ ] Razorpay API keys (if using payments)
- [ ] GitHub repository created with code pushed

### Installation Steps ✅
- [ ] System packages installed
- [ ] Node.js 20 installed
- [ ] Application cloned
- [ ] Dependencies installed (npm install)
- [ ] .env.production configured
- [ ] Database migrations run
- [ ] Application built (npm run build)
- [ ] PM2 started and saved

### Configuration ✅
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Firewall configured (UFW)
- [ ] Application accessible via HTTPS

### Verification ✅
- [ ] App running at https://yourdomain.com
- [ ] pm2 status shows "online"
- [ ] No errors in pm2 logs
- [ ] SSL certificate valid

---

## 🔧 Commands You'll Use Most

```bash
# Check app status
pm2 status

# View logs
pm2 logs genz-living-space

# Restart app
pm2 restart genz-living-space

# Deploy new version
cd /var/www/genz-living-space && ./deploy.sh

# View Nginx status
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates

# Monitor performance
pm2 monit
```

---

## 💡 Key Technologies Used

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20 LTS | JavaScript runtime |
| **Next.js** | 14.2.15 | React framework |
| **Prisma** | 5.21.1 | Database ORM |
| **React** | 18.3.1 | UI library |
| **Tailwind CSS** | 3.4.14 | Styling |
| **SQLite/PostgreSQL** | Latest | Database |
| **PM2** | Latest | Process manager |
| **Nginx** | Latest | Web server |
| **Certbot** | Latest | SSL/TLS |

---

## 🌍 Domain Setup

### DNS Records Needed
```
A Record: yourdomain.com → your_vps_ip
A Record: www.yourdomain.com → your_vps_ip
```

### SSL Certificate
Automatically handled by Certbot (Let's Encrypt)

---

## 📊 Performance Expectations

### Before Optimization
- First page load: ~2-3 seconds
- Subsequent loads: ~500-800ms

### After Optimization (Caching enabled)
- First page load: ~1-1.5 seconds
- Subsequent loads: ~200-400ms

---

## 🛡️ Security Best Practices Included

✅ HTTPS/SSL with Let's Encrypt  
✅ Firewall (UFW) configured  
✅ Nginx security headers added  
✅ JWT authentication  
✅ Password hashing (bcryptjs)  
✅ Environment variables isolated  
✅ Database backups recommended  

---

## 🆚 SQLite vs PostgreSQL

### Use SQLite if:
- Small deployment (< 1000 users)
- Budget constraints
- Simple requirements
- Testing environment

### Use PostgreSQL if:
- Production deployment
- High concurrent users
- Complex queries
- Data integrity critical
- Scaling planned

---

## 📱 Git Workflow for Deployment

### First Time
```bash
# Locally
git add .
git commit -m "Initial deployment setup"
git push origin main
```

### Regular Updates
```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push origin main

# Auto-deployed via GitHub Actions
# OR manually on VPS:
cd /var/www/genz-living-space
./deploy.sh
```

---

## 🚨 Common Issues & Solutions

### Issue: "Port 3000 already in use"
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
pm2 restart genz-living-space
```

### Issue: "Nginx not connecting to app"
```bash
# Check if app is running
pm2 status

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t
```

### Issue: "Database connection error"
```bash
# Check DATABASE_URL in .env.production
cat .env.production | grep DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

---

## 📞 Next Steps

1. **Prepare your VPS** (Get IP address, SSH access)
2. **Read DEPLOYMENT_GUIDE.md** thoroughly
3. **Follow the Installation Sequence** in DEPLOYMENT_QUICK_REFERENCE.md
4. **Test everything** before going live
5. **Setup monitoring** (optional but recommended)

---

## 📖 Documentation Structure

```
GenZ Living Space/
├── DEPLOYMENT_GUIDE.md          ← Detailed step-by-step guide
├── DEPLOYMENT_QUICK_REFERENCE.md ← Quick checklist
├── deploy.sh                    ← Automated deployment script
├── ecosystem.config.js          ← PM2 configuration
├── .github/
│   └── workflows/
│       └── deploy.yml           ← GitHub Actions CI/CD
└── [Your app files...]
```

---

## ⏱️ Timeline

- **Development**: ✅ Complete
- **Testing**: Ready
- **VPS Setup**: ~30 minutes
- **Go Live**: Ready to launch
- **Maintenance**: Ongoing

---

## 🎓 Learning Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/deploy)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**You're ready to deploy! Follow the deployment guide step by step.** 🚀

For questions, refer to the specific section in DEPLOYMENT_GUIDE.md or troubleshooting section above.
