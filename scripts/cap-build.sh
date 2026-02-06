#!/bin/bash
set -e

echo "Building web assets..."
npm run build

echo "Syncing to native projects..."
npx cap sync

echo "Done! Open native projects with:"
echo "  npx cap open ios     # Opens Xcode"
echo "  npx cap open android # Opens Android Studio"
