#!/bin/bash
#
# RentAI 24 - iOS App Store Submission Script
# ============================================
#
# Prerequisites:
#   1. Apple Developer Account ($99/year) - https://developer.apple.com
#   2. EAS CLI installed: npm install -g eas-cli
#   3. Expo account: npx eas-cli login
#   4. Fill in eas.json with your Apple credentials
#
# Usage:
#   chmod +x scripts/submit-to-appstore.sh
#   ./scripts/submit-to-appstore.sh
#

set -e

echo "========================================="
echo "  RentAI 24 - iOS App Store Submission"
echo "========================================="
echo ""

# Check if eas-cli is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in
echo "📋 Step 1: Checking EAS login status..."
eas whoami 2>/dev/null || {
    echo "Please login to your Expo account:"
    eas login
}

echo ""
echo "📋 Step 2: Pre-submission checklist"
echo "──────────────────────────────────"
echo ""
echo "  Before proceeding, make sure you have:"
echo ""
echo "  ✅ App icon (1024x1024 PNG) at assets/icon.png"
echo "  ✅ Splash screen image at assets/splash-icon.png"
echo "  ✅ Adaptive icon at assets/adaptive-icon.png"
echo "  ✅ Apple Developer credentials in eas.json:"
echo "     - appleId: your Apple ID email"
echo "     - ascAppId: App Store Connect app ID"
echo "     - appleTeamId: Your team ID"
echo "  ✅ App Store Connect listing created"
echo "  ✅ Privacy Policy URL ready"
echo ""
read -p "All set? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Aborted. Please complete the checklist first."
    exit 1
fi

echo ""
echo "📋 Step 3: Installing dependencies..."
npm install

echo ""
echo "📋 Step 4: Building iOS production binary..."
echo "  This will build in Expo's cloud (takes ~15-20 min)"
echo ""
eas build --platform ios --profile production --non-interactive

echo ""
echo "📋 Step 5: Submitting to App Store Connect..."
echo "  The build will be uploaded to TestFlight"
echo ""
eas submit --platform ios --latest --non-interactive

echo ""
echo "========================================="
echo "  ✅ Submission Complete!"
echo "========================================="
echo ""
echo "  Next steps:"
echo "  1. Go to App Store Connect"
echo "  2. The build should appear in TestFlight"
echo "  3. Add it to a TestFlight group for testing"
echo "  4. When ready, submit for App Review"
echo ""
echo "  Typical review time: 24-48 hours"
echo ""
