# iOS Deployment Guide

This guide walks you through the complete process of building and submitting the Heard app to the iOS App Store.

## ⚠️ Important: Mac Required

**This deployment process MUST be performed on a Mac computer.** The project has been prepared on a remote system, but all iOS-specific operations (building, Xcode configuration, App Store submission) require macOS and Xcode, which are only available on Mac hardware.

**What's been prepared remotely:**
- ✅ Build scripts and configuration files
- ✅ Capacitor configuration
- ✅ Documentation and guides
- ✅ Dependencies listed in package.json

**What must be done on your Mac:**
- 🔨 Running build commands
- 🔨 Adding iOS platform (`npx cap add ios`)
- 🔨 Opening in Xcode
- 🔨 Configuring signing and capabilities
- 🔨 Building and archiving
- 🔨 Submitting to App Store

## Prerequisites

1. **Mac Computer** - iOS development requires macOS and Xcode
2. **Apple Developer Account** - $99/year subscription required
   - Sign up at: https://developer.apple.com/programs/
   - You'll need an Apple ID and payment method
3. **Xcode** - Latest version from the Mac App Store
4. **Node.js** - Ensure you have Node.js and npm installed

## Step 1: Transfer Project to Mac

**Important**: If you're working from a remote system (like SSH), you need to transfer the project to your Mac first.

### Option A: Using Git (If Repository is Available)

If this project is hosted on GitHub, GitLab, or another git hosting service:

```bash
# On your Mac
git clone <repository-url>
cd <project-directory>
```

**To find your repository URL:**
- If on GitHub/GitLab: Check the repository's clone URL (HTTPS or SSH)
- Example GitHub HTTPS: `git clone https://github.com/username/repo-name.git`
- Example GitHub SSH: `git clone git@github.com:username/repo-name.git`

### Option B: Using SCP/SFTP (From Remote Server)

If you need to transfer from a remote server via SSH:

```bash
# From your Mac terminal
scp -r user@remote-server:/path/to/project /local/path/on/mac

# Example:
# scp -r runner@example.com:/home/runner/workspace ~/Desktop/heard-app

# Or use SFTP client like FileZilla, Cyberduck, Transmit, etc.
```

### Option C: Archive and Transfer (Recommended for Replit/Remote Systems)

Create a tarball on the remote system, then transfer:

```bash
# On remote system (SSH into your server)
cd /path/to/project
tar -czf heard-app.tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='ios' \
  --exclude='android' \
  --exclude='.git' \
  --exclude='.DS_Store' \
  .

# Transfer to Mac using one of these methods:
# 1. SCP:
scp user@remote-server:/path/to/heard-app.tar.gz ~/Downloads/

# 2. Download via web interface (if available)
# 3. Use SFTP client

# On Mac, extract:
cd ~/Desktop  # or wherever you want the project
tar -xzf ~/Downloads/heard-app.tar.gz
cd heard-app  # or whatever the extracted folder is named
```

### Option D: Replit Export (If Using Replit)

If this is a Replit project:

1. In Replit, click the three-dot menu (⋮) on your project
2. Select **"Download as ZIP"**
3. Extract the ZIP file on your Mac
4. Open Terminal and navigate to the extracted folder

**Note**: The `ios/` directory will be created when you run `npx cap add ios` on the Mac, so you don't need to transfer it. The `.gitignore` file already excludes it.

## Step 2: Install Dependencies

Install all project dependencies:

```bash
npm install
```

## Step 3: Build and Sync

Run the Capacitor build script to compile web assets and sync to native projects:

```bash
bash scripts/cap-build.sh
```

This script:
- Builds the web assets using `npm run build`
- Syncs the built assets to native iOS/Android projects using `npx cap sync`

**Expected Output:**
```
Building web assets...
[build output]
Syncing to native projects...
[Capacitor sync output]
Done! Open native projects with:
  npx cap open ios     # Opens Xcode
  npx cap open android # Opens Android Studio
```

## Step 4: Add iOS Platform

If the iOS platform hasn't been added yet, add it:

```bash
npx cap add ios
```

This creates the `ios/` directory with the native iOS project structure.

## Step 5: Open in Xcode

Open the project in Xcode:

```bash
npx cap open ios
```

This will launch Xcode with the iOS project loaded.

## Step 6: Configure Apple Developer Account

### 6.1 Sign in to Xcode

1. In Xcode, go to **Xcode → Settings (or Preferences) → Accounts**
2. Click the **+** button and select **Apple ID**
3. Sign in with your Apple Developer account credentials

### 6.2 Configure Signing & Capabilities

1. In Xcode, select the **Heard** project in the navigator (top item)
2. Select the **Heard** target
3. Go to the **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** from the dropdown (your Apple Developer account)
6. Xcode will automatically:
   - Create an App ID (e.g., `app.heard.community`)
   - Generate provisioning profiles
   - Configure signing certificates

### 6.3 Configure Bundle Identifier

The bundle identifier should match your `capacitor.config.ts`:
- Current: `app.heard.community`
- Verify this matches in Xcode: **General → Bundle Identifier**

### 6.4 Configure Capabilities (if needed)

Add any required capabilities:
- **Push Notifications** - Already configured in Capacitor config
- **Background Modes** - If needed for notifications
- **App Transport Security** - Configure allowed domains if needed

## Step 7: Configure App Information

### 7.1 App Display Name

1. In Xcode, select the **Heard** target
2. Go to **General** tab
3. Set **Display Name** to "Heard" (or your preferred name)

### 7.2 Version and Build Number

1. In **General** tab:
   - **Version**: e.g., "1.0.0" (user-facing version)
   - **Build**: e.g., "1" (increment for each submission)

### 7.3 App Icons and Launch Screen

1. **App Icon**:
   - Go to **Assets.xcassets → AppIcon**
   - Add your app icon images (various sizes required)
   - Or use Xcode's built-in icon generator

2. **Launch Screen**:
   - The launch screen is configured in `ios/App/App/Info.plist` or via storyboard
   - Capacitor uses a default launch screen that can be customized

## Step 8: Test on Simulator

Before submitting, test your app:

1. In Xcode, select a simulator from the device dropdown (e.g., "iPhone 15 Pro")
2. Click the **Play** button (▶️) or press `Cmd + R`
3. The app will build and launch in the simulator
4. Test all functionality to ensure everything works

## Step 9: Test on Physical Device (Recommended)

1. Connect your iPhone/iPad via USB
2. Trust the computer on your device if prompted
3. In Xcode, select your device from the device dropdown
4. You may need to:
   - Register your device in Apple Developer portal (automatic with automatic signing)
   - Trust the developer certificate on your device: **Settings → General → VPN & Device Management**
5. Click **Play** to build and install on your device
6. Test thoroughly on a real device

## Step 10: Prepare for App Store Submission

### 10.1 Archive the App

1. In Xcode, select **Any iOS Device** (or a connected device) from the device dropdown
2. Go to **Product → Archive**
3. Wait for the archive to complete
4. The **Organizer** window will open automatically

### 10.2 Validate the Archive

1. In the Organizer, select your archive
2. Click **Validate App**
3. Follow the validation wizard:
   - Select your distribution method: **App Store Connect**
   - Select your team
   - Review app information
4. Fix any validation errors that appear

### 10.3 Upload to App Store Connect

1. In the Organizer, select your validated archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Choose distribution options:
   - **Upload** (recommended for first submission)
   - Or **Export** if you need the .ipa file
5. Follow the wizard to complete the upload

## Step 11: Submit via App Store Connect

### 11.1 Create App Record

1. Go to https://appstoreconnect.apple.com
2. Sign in with your Apple Developer account
3. Click **My Apps → +** to create a new app
4. Fill in:
   - **Platform**: iOS
   - **Name**: Heard
   - **Primary Language**: English (or your choice)
   - **Bundle ID**: Select `app.heard.community` (created during signing)
   - **SKU**: Unique identifier (e.g., `heard-ios-001`)
   - **User Access**: Full Access (or Limited if using a team)

### 11.2 Complete App Information

Fill in all required information:

1. **App Information**:
   - Category
   - Privacy Policy URL (required)
   - Support URL

2. **Pricing and Availability**:
   - Price tier (Free or Paid)
   - Availability countries

3. **App Privacy**:
   - Answer privacy questions
   - Describe data collection practices

### 11.3 Add App Metadata

1. **Screenshots**: Required for various device sizes
2. **Description**: App description for the App Store
3. **Keywords**: Search keywords
4. **Support URL**: Your support website
5. **Marketing URL**: Optional marketing site
6. **App Icon**: 1024x1024px (already uploaded with archive)
7. **Version Information**: Version number and "What's New"

### 11.4 Submit for Review

1. Once your build appears in App Store Connect (may take 10-30 minutes after upload)
2. Select the build in **App Store → iOS App → Build**
3. Complete any remaining required fields
4. Click **Submit for Review**
5. Answer export compliance questions
6. Submit!

## Step 12: Monitor Review Status

- Check status in App Store Connect
- Apple typically reviews within 24-48 hours
- You'll receive email notifications about status changes
- If rejected, address feedback and resubmit

## Troubleshooting

### Common Issues

1. **Signing Errors**:
   - Ensure "Automatically manage signing" is enabled
   - Verify your Apple Developer account is active
   - Check bundle identifier matches `capacitor.config.ts`

2. **Build Errors**:
   - Run `bash scripts/cap-build.sh` again to sync latest changes
   - Clean build folder: **Product → Clean Build Folder** (`Cmd + Shift + K`)
   - Delete derived data if needed

3. **Capacitor Sync Issues**:
   - Delete `ios/` folder and run `npx cap add ios` again
   - Ensure `dist/public` exists after building

4. **Missing Dependencies**:
   - Run `npm install` to ensure all packages are installed
   - Check that `@capacitor/ios` is in `package.json`

### Useful Commands

```bash
# Rebuild and sync
bash scripts/cap-build.sh

# Sync only (after manual changes)
npx cap sync ios

# Copy web assets only
npx cap copy ios

# Update Capacitor dependencies
npx cap update ios

# Check Capacitor version
npx cap --version
```

## Project Configuration

Current Capacitor configuration (`capacitor.config.ts`):
- **App ID**: `app.heard.community`
- **App Name**: `Heard`
- **Web Directory**: `dist/public`
- **iOS Settings**: Content inset and mobile mode enabled
- **Splash Screen**: Auto-hide after 2 seconds, background color `#0D5C63`
- **Status Bar**: Light style with background color `#0D5C63`

## Additional Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

## Next Steps After Submission

1. Monitor review status in App Store Connect
2. Prepare marketing materials
3. Set up analytics and crash reporting (if not already done)
4. Plan for updates and maintenance
5. Consider TestFlight beta testing for future releases

---

**Note**: This process requires a Mac and active Apple Developer account. The $99/year fee is required to submit apps to the App Store.

