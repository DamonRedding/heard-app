#!/bin/bash

# Setup script for iOS development with production API

echo "🚀 Setting up iOS development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env and set VITE_API_URL to your production URL"
    echo "   Currently set to use: https://churchheard.com"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync ios

# Instructions
echo ""
echo "✅ Setup complete! Next steps:"
echo ""
echo "1. Make sure CORS is enabled on your production server (see CORS_UPDATE.md)"
echo ""
echo "2. Run the iOS app with one of these commands:"
echo "   npm run dev:client    # Start Vite dev server only"
echo "   npx cap run ios       # Run iOS app in simulator"
echo "   npm run dev:ios       # Do both in one command"
echo ""
echo "3. For live reload on a physical device:"
echo "   - Find your computer's IP address"
echo "   - Update capacitor.config.ts with:"
echo "     server: { url: 'http://YOUR_IP:5173', cleartext: true }"
echo "   - Run: npx cap sync ios"
echo "   - Connect your device and run: npx cap run ios --target YOUR_DEVICE_ID"
echo ""
echo "🎯 Your iOS app will connect to: https://churchheard.com"