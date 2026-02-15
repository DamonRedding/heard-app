#!/bin/bash

# Quick script to launch iOS development environment
# Usage: ./scripts/launch-ios.sh [device-name]

set -e

# Ensure we're using Node 22+
source ~/.nvm/nvm.sh
nvm use

# Default to iPhone 16e if no device specified
DEVICE_NAME="${1:-iPhone 16e}"

echo "🚀 Launching Heard app for iOS development"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Build the app
echo ""
echo "📦 Building web app..."
npm run build

# Step 2: Sync to iOS
echo ""
echo "🔄 Syncing to iOS..."
npx cap sync ios

# Step 3: Launch in simulator
echo ""
echo "📱 Launching in simulator: $DEVICE_NAME"
npx cap run ios --target "$DEVICE_NAME"

echo ""
echo "✅ iOS app launched successfully!"
echo ""
echo "💡 Tips:"
echo "  - Open Safari > Develop > Simulator > Heard to debug"
echo "  - Make changes in client/src/ for hot reload"
echo "  - Use 'npx cap open ios' to open in Xcode"
echo ""
