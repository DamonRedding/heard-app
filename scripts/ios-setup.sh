#!/bin/bash
# iOS Deployment Setup Script
# This script prepares the project for iOS deployment

set -e

echo "🚀 iOS Deployment Setup"
echo "========================"
echo ""

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: This script must be run on macOS"
    exit 1
fi

# Check Node version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "⚠️  Warning: Node.js version is less than 22.0.0"
    echo "   Capacitor 8 requires Node.js >= 22.0.0"
    echo ""
    echo "   To upgrade using nvm:"
    echo "     nvm install 22"
    echo "     nvm use 22"
    echo ""
    echo "   Or download from: https://nodejs.org/"
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Node.js version is compatible"
fi

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "   node_modules exists, skipping install"
fi

# Build the project
echo ""
echo "🔨 Building web assets..."
npm run build

# Check if build was successful
if [ ! -d "dist/public" ]; then
    echo "❌ Error: Build failed - dist/public directory not found"
    exit 1
fi
echo "✅ Build completed successfully"

# Add iOS platform if it doesn't exist
echo ""
if [ ! -d "ios" ]; then
    echo "📱 Adding iOS platform..."
    npx cap add ios
    echo "✅ iOS platform added"
else
    echo "✅ iOS platform already exists"
fi

# Sync Capacitor
echo ""
echo "🔄 Syncing Capacitor..."
npx cap sync ios

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npx cap open ios"
echo "  2. In Xcode:"
echo "     - Sign in to your Apple Developer account"
echo "     - Configure signing & capabilities"
echo "     - Set version and build numbers"
echo "     - Add app icons"
echo "  3. Test on simulator or device"
echo "  4. Archive and upload to App Store Connect"
echo ""
echo "For detailed instructions, see: IOS_DEPLOYMENT_CHECKLIST.md"

