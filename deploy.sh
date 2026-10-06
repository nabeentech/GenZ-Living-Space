#!/bin/bash
# GenZ Living Space - Production Deployment Script

set -e  # Exit on error

echo "=========================================="
echo "  GenZ Living Space - Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production file not found!${NC}"
    echo "Please create .env.production with your production settings"
    exit 1
fi

echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
npm install --production=false

echo -e "${YELLOW}🔧 Step 2: Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}🗄️ Step 3: Running database migrations...${NC}"
npx prisma migrate deploy

echo -e "${YELLOW}🛠️ Step 4: Building application...${NC}"
npm run build

echo -e "${YELLOW}✨ Step 5: Restarting PM2...${NC}"
pm2 restart genz-living-space || pm2 start ecosystem.config.js

echo -e "${YELLOW}📊 Step 6: Saving PM2 configuration...${NC}"
pm2 save

echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ Deployment Successful!"
echo "==========================================${NC}"
echo ""
echo "Application is running at: https://yourdomain.com"
echo ""
echo "Useful commands:"
echo "  pm2 logs genz-living-space          # View application logs"
echo "  pm2 status                          # Check process status"
echo "  pm2 restart genz-living-space       # Restart application"
echo "  pm2 stop genz-living-space          # Stop application"
echo ""
