#!/bin/bash
# HostelHub Deploy Script
# Run from PowerShell: bash deploy.sh
# Or run commands manually

echo "=== HostelHub Deploy ==="

# Step 1: Build
echo "Building..."
npm run build

# Step 2: Copy to server (you'll be prompted for password)
echo "Copying files to server..."
scp -r .next src prisma package.json public .env root@187.127.138.168:/root/new-project/

# Step 3: SSH and restart (run manually)
echo ""
echo "Files copied! Now SSH into server and run:"
echo "  ssh root@187.127.138.168"
echo "  cd /root/new-project && npm install && npx prisma db push && pm2 restart hostelhub"
echo ""
echo "App: http://187.127.138.168:3001"
