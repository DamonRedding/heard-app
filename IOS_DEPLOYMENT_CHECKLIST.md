# iOS Deployment Quick Checklist

Use this checklist when deploying to iOS. For detailed instructions, see [IOS_DEPLOYMENT.md](./IOS_DEPLOYMENT.md).

## Pre-Deployment Setup

- [ ] Mac computer with macOS installed
- [ ] Xcode installed from Mac App Store (latest version)
- [ ] Apple Developer account ($99/year) - https://developer.apple.com/programs/
- [ ] Node.js and npm installed
- [ ] Project downloaded/cloned to Mac

## Build & Sync

- [ ] Run `npm install` to install dependencies
- [ ] Run `bash scripts/cap-build.sh` to build and sync
- [ ] Verify build completed successfully
- [ ] Run `npx cap add ios` (if iOS platform not already added)
- [ ] Run `npx cap open ios` to open in Xcode

## Xcode Configuration

- [ ] Sign in to Apple Developer account in Xcode (Settings → Accounts)
- [ ] Select project → Heard target → Signing & Capabilities
- [ ] Enable "Automatically manage signing"
- [ ] Select your Team from dropdown
- [ ] Verify Bundle Identifier matches: `app.heard.community`
- [ ] Check Display Name is set to "Heard"
- [ ] Set Version number (e.g., "1.0.0")
- [ ] Set Build number (e.g., "1")

## Testing

- [ ] Test on iOS Simulator (select device → Run)
- [ ] Test on physical device (connect iPhone/iPad → Run)
- [ ] Trust developer certificate on device if needed
- [ ] Verify all app functionality works correctly
- [ ] Test push notifications (if applicable)
- [ ] Test on different iOS versions if possible

## App Store Preparation

- [ ] Create app icon (1024x1024px) and add to Assets
- [ ] Prepare screenshots for required device sizes
- [ ] Write app description
- [ ] Prepare keywords for App Store
- [ ] Set up Privacy Policy URL (required)
- [ ] Set up Support URL
- [ ] Complete App Privacy questionnaire

## Archive & Upload

- [ ] Select "Any iOS Device" in Xcode device dropdown
- [ ] Product → Archive
- [ ] Validate App in Organizer
- [ ] Fix any validation errors
- [ ] Distribute App → App Store Connect → Upload
- [ ] Wait for processing (10-30 minutes)

## App Store Connect

- [ ] Sign in to https://appstoreconnect.apple.com
- [ ] Create new app record
- [ ] Fill in all required app information
- [ ] Upload screenshots for all required sizes
- [ ] Add app description and metadata
- [ ] Select build from uploaded archives
- [ ] Complete App Privacy information
- [ ] Submit for Review
- [ ] Answer export compliance questions

## Post-Submission

- [ ] Monitor review status in App Store Connect
- [ ] Respond to any review feedback if needed
- [ ] Prepare marketing materials
- [ ] Set up analytics monitoring
- [ ] Plan for future updates

## Quick Commands Reference

```bash
# Build and sync
bash scripts/cap-build.sh

# Add iOS platform (first time only)
npx cap add ios

# Open in Xcode
npx cap open ios

# Sync only (after manual changes)
npx cap sync ios

# Update Capacitor
npx cap update ios
```

## Troubleshooting

- **Signing errors**: Enable automatic signing, verify Apple Developer account
- **Build errors**: Clean build folder (Cmd+Shift+K), rebuild
- **Sync issues**: Delete `ios/` folder, run `npx cap add ios` again
- **Missing dependencies**: Run `npm install`

---

**Current Configuration:**
- App ID: `app.heard.community`
- App Name: `Heard`
- Web Directory: `dist/public`

