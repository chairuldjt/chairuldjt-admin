#!/bin/bash

# Chairperson Admin Deployment Script
# This script handles pulling latest changes, building the frontend, and restarting the server via PM2.

APP_NAME="chairuldjt-admin"

echo "----------------------------------------------------"
echo "🚀 Starting Deployment: $APP_NAME"
echo "----------------------------------------------------"

# 1. Get latest code
echo "📥 Pulling latest changes from master..."
git pull origin master

# 2. Install dependencies (if needed)
echo "📦 Installing dependencies..."
npm install

# 3. Build the frontend
echo "🏗 Building production assets..."
npm run build

# 4. Restart the service
echo "🔄 Reloading PM2 instance..."
if pm2 list | grep -q "$APP_NAME"; then
    pm2 reload "$APP_NAME" --update-env
    echo "✅ PM2 process $APP_NAME reloaded."
else
    echo "⚠️ PM2 process not found. Starting fresh..."
    pm2 start ecosystem.config.cjs
    echo "✅ PM2 process $APP_NAME started."
fi

echo "----------------------------------------------------"
echo "✨ Deployment Finished Successfully!"
echo "----------------------------------------------------"
