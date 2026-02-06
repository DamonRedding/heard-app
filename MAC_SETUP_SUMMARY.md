# iOS Deployment: Remote Preparation vs. Mac Requirements

## Understanding the Setup

This project has been **prepared** on a remote Linux system, but **iOS deployment must be completed on a Mac**. This document clarifies what's been done remotely and what you need to do on your Mac.

## ✅ What's Been Prepared (Remote System)

All of these have been completed and are ready:

1. **Build Script** (`scripts/cap-build.sh`)
   - ✅ Script is executable
   - ✅ Configured to build web assets and sync to Capacitor
   - ✅ Ready to run on Mac

2. **Capacitor Configuration** (`capacitor.config.ts`)
   - ✅ App ID: `app.heard.community`
   - ✅ App Name: `Heard`
   - ✅ iOS-specific settings configured
   - ✅ Splash screen and status bar configured

3. **Dependencies** (`package.json`)
   - ✅ `@capacitor/ios` v8.0.2 installed
   - ✅ All Capacitor plugins listed
   - ✅ Ready for `npm install` on Mac

4. **Documentation**
   - ✅ `IOS_DEPLOYMENT.md` - Complete step-by-step guide
   - ✅ `IOS_DEPLOYMENT_CHECKLIST.md` - Quick reference
   - ✅ This summary document

5. **Git Configuration** (`.gitignore`)
   - ✅ iOS build artifacts excluded
   - ✅ Xcode user data excluded
   - ✅ Ready to prevent committing native build files

## 🔨 What Must Be Done on Your Mac

These steps **cannot** be done remotely and require macOS/Xcode:

### 1. Transfer Project to Mac

**Choose the method that works for your setup:**

- **Git Clone** (if repository is on GitHub/GitLab):
  ```bash
  git clone <repository-url>
  ```
  
- **SCP/SFTP** (from remote server):
  ```bash
  scp -r user@server:/path/to/project ~/Desktop/heard-app
  ```
  
- **Archive & Transfer** (recommended for remote systems):
  ```bash
  # On remote: tar -czf project.tar.gz --exclude='node_modules' --exclude='dist' .
  # Transfer to Mac, then: tar -xzf project.tar.gz
  ```
  
- **Replit Export** (if using Replit):
  - Use Replit's "Download as ZIP" feature

### 2. Install Dependencies
```bash
npm install
```

### 3. Build and Add iOS Platform
```bash
bash scripts/cap-build.sh
npx cap add ios
npx cap open ios
```

### 4. Xcode Configuration
- Sign in to Apple Developer account
- Configure signing & capabilities
- Set up bundle identifier
- Configure app icons and launch screen

### 5. Testing
- Test on iOS Simulator
- Test on physical device
- Verify all functionality

### 6. App Store Submission
- Archive the app
- Validate and upload
- Complete App Store Connect setup
- Submit for review

## Workflow Summary

```
Remote System (Linux)          Mac System (macOS)
─────────────────────          ──────────────────
✅ Prepare scripts              🔨 Run scripts
✅ Configure Capacitor          🔨 Add iOS platform
✅ Write documentation          🔨 Open in Xcode
✅ Set up .gitignore            🔨 Configure signing
                               🔨 Build & test
                               🔨 Submit to App Store
```

## Quick Start on Mac

Once you have the project on your Mac:

```bash
# 1. Install dependencies
npm install

# 2. Build and sync
bash scripts/cap-build.sh

# 3. Add iOS platform (first time only)
npx cap add ios

# 4. Open in Xcode
npx cap open ios

# 5. Follow IOS_DEPLOYMENT.md for remaining steps
```

## Important Notes

1. **The `ios/` directory doesn't exist yet** - It will be created when you run `npx cap add ios` on your Mac
2. **Don't commit the `ios/` directory** - It's already in `.gitignore`
3. **Xcode is required** - You cannot build iOS apps without Xcode on macOS
4. **Apple Developer account required** - $99/year for App Store submission
5. **Physical device testing recommended** - Simulator is good, but real device testing is essential

## Troubleshooting

If you encounter issues when moving to Mac:

1. **Dependencies not installing**: Run `npm install` again on Mac
2. **Build script fails**: Ensure Node.js and npm are installed on Mac
3. **Capacitor commands not found**: Run `npm install` to ensure `@capacitor/cli` is installed
4. **Xcode not opening**: Ensure Xcode is installed from Mac App Store

## Next Steps

1. Transfer this project to your Mac (see `IOS_DEPLOYMENT.md` Step 1)
2. Follow the complete guide in `IOS_DEPLOYMENT.md`
3. Use `IOS_DEPLOYMENT_CHECKLIST.md` as a quick reference

---

**Remember**: All iOS-specific work happens on your Mac. The remote preparation ensures everything is ready when you get there!

