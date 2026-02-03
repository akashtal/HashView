#!/bin/bash
set -e

echo "🚀 Starting Deep Clean & Rebuild Process..."

# 0. Fix Dependencies (Added per Expo Doctor recommendations)
echo "💊 Fixing dependencies..."
npm uninstall eas-cli
npx expo install --fix -- --legacy-peer-deps

# 1. Kill potentially conflicting processes
echo "🛑 Stopping running packagers..."
pkill -f "react-native" || true
pkill -f "expo" || true
pkill -f "metro" || true

# 2. Watchman Reset
if command -v watchman &> /dev/null; then
    echo "👀 Clearing Watchman..."
    watchman watch-del-all
fi

# 3. Clean Project Artifacts
echo "🧹 Removing node_modules, android, and ios directories..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf yarn.lock
rm -rf android
rm -rf ios
rm -rf .expo

# 4. Reinstall Dependencies
echo "📦 Reinstalling dependencies (ignoring peer deps due to React 19 ecosystem lag)..."
npm install --legacy-peer-deps

# 5. Prebuild Native Projects
echo "🏗️ Generating Android project..."
npx expo prebuild --platform android --clean

# 6. Verify Google Services
if [ ! -f "google-services.json" ]; then
    echo "⚠️ WARNING: google-services.json not found! Push notifications will NOT work."
    echo "Please ensure you have placed google-services.json in the frontend directory."
else
    echo "✅ google-services.json found."
fi

echo "✅ Deep clean complete."
echo "👉 To run the app, execute:"
echo "npx expo run:android --no-build-cache"
