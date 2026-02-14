# Next Steps for iOS Deployment

## ✅ What's Done
- Dependencies installed
- Build output created (`dist/public`)

## ⚠️ IMPORTANT: Upgrade Node.js First

**You need Node.js 22+ for Capacitor 8. Currently on v20.9.0.**

Run these commands in your terminal:

```bash
# Install Node.js 22 (LTS)
nvm install 22

# Use Node.js 22
nvm use 22

# Verify the version
node --version  # Should show v22.x.x

# Set as default (optional, but recommended)
nvm alias default 22
```

**Then continue with the steps below.**

## 🔨 Next: Add iOS Platform & Open Xcode

Run these commands in your terminal (from the project root):

```bash
# Add iOS platform (creates the ios/ directory)
npx cap add ios

# Sync Capacitor to copy web assets to iOS project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## 📱 Once Xcode Opens

Follow these steps in Xcode:

### 1. Sign in to Apple Developer Account
- Go to **Xcode → Settings** (or **Preferences**)
- Click the **Accounts** tab
- Click the **+** button
- Select **Apple ID**
- Sign in with your Apple Developer account

### 2. Configure Signing & Capabilities
- In Xcode, select the **Heard** project (top item in left sidebar)
- Select the **Heard** target
- Click the **Signing & Capabilities** tab
- ✅ Check **"Automatically manage signing"**
- Select your **Team** from the dropdown
- Verify **Bundle Identifier** shows: `app.heard.community`

### 3. Set App Information
- Still in the **Heard** target, go to the **General** tab
- Set **Display Name**: `Heard`
- Set **Version**: `1.0.0` (or your version)
- Set **Build**: `1` (increment for each submission)

### 4. Test on Simulator
- Select a simulator from the device dropdown (e.g., "iPhone 15 Pro")
- Click the **Play** button (▶️) or press `Cmd + R`
- Wait for the app to build and launch
- Test that everything works

### 5. Test on Physical Device (Recommended)
- Connect your iPhone/iPad via USB
- Trust the computer on your device if prompted
- In Xcode, select your device from the device dropdown
- Click **Play** to build and install
- On your device: **Settings → General → VPN & Device Management** → Trust the developer certificate

## 📦 After Testing

Once everything works, you can proceed to:
1. Archive the app
2. Upload to App Store Connect
3. Submit for review

See `IOS_DEPLOYMENT_CHECKLIST.md` for the complete process.

