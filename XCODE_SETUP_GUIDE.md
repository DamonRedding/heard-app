# Xcode Setup Guide - Step by Step

## Step 1: Sign in to Apple Developer Account

1. In Xcode, go to **Xcode → Settings** (or press `Cmd + ,`)
2. Click the **Accounts** tab (at the top)
3. Click the **+** button (bottom left)
4. Select **Apple ID**
5. Enter your Apple Developer account email and password
6. Click **Sign In**

✅ You should now see your account listed in the Accounts tab

---

## Step 2: Configure Signing & Capabilities

1. In the **left sidebar** (Project Navigator), click on the **Heard** project (the blue icon at the very top)
2. In the main area, you'll see a list of targets - click on **Heard** (under "TARGETS")
3. Click the **Signing & Capabilities** tab (at the top of the main area)
4. Check the box: **"Automatically manage signing"**
5. In the **Team** dropdown, select your Apple Developer account/team
6. Verify that **Bundle Identifier** shows: `app.heard.community`

⚠️ **If you see errors:**
- Make sure you're signed in (Step 1)
- Make sure "Automatically manage signing" is checked
- Xcode will automatically create the App ID and provisioning profile

---

## Step 3: Set App Information

1. Still in the **Heard** target, click the **General** tab (next to Signing & Capabilities)
2. Find the **Identity** section
3. Set **Display Name**: `Heard`
4. Set **Version**: `1.0.0` (this is the user-facing version)
5. Set **Build**: `1` (increment this number for each App Store submission)

---

## Step 4: Test on Simulator (First Test)

1. At the top of Xcode, you'll see a device selector (next to the Play button)
2. Click it and select a simulator, e.g.:
   - **iPhone 15 Pro**
   - **iPhone 15**
   - **iPhone 14 Pro**
3. Click the **Play** button (▶️) or press `Cmd + R`
4. Wait for the build to complete (this may take a few minutes the first time)
5. The simulator will launch and your app should open
6. Test that the app works correctly

✅ **If the build succeeds and the app launches, you're ready for the next step!**

---

## Step 5: Test on Physical Device (Recommended)

1. Connect your iPhone or iPad to your Mac via USB
2. On your device, if prompted, tap **"Trust This Computer"**
3. In Xcode, click the device selector again
4. Select your physical device (it will show your device name)
5. Click **Play** (▶️) or press `Cmd + R`
6. On your device, you may need to:
   - Go to **Settings → General → VPN & Device Management**
   - Tap on your developer account
   - Tap **"Trust [Your Name]"**
   - Confirm by tapping **"Trust"**
7. The app should now install and launch on your device
8. Test thoroughly on the real device

---

## Step 6: Configure Capabilities (If Needed)

If your app uses push notifications or background features:

1. Still in the **Heard** target, go to **Signing & Capabilities** tab
2. Click **+ Capability** (top left of the capabilities list)
3. Add if needed:
   - **Push Notifications** (if your app sends notifications)
   - **Background Modes** (if your app needs to run in background)

Note: Push Notifications is already configured in your Capacitor config, but you may need to add it here too.

---

## Step 7: Add App Icon (Optional for Now)

1. In the left sidebar, expand **Heard** → **Heard** → **Assets.xcassets**
2. Click on **AppIcon**
3. You'll see slots for different icon sizes
4. Drag and drop your app icon images into the appropriate slots
5. You need a 1024x1024px icon for App Store submission

⚠️ **You can skip this for now if you just want to test the app first**

---

## Common Issues & Solutions

### "No signing certificate found"
- Make sure you're signed in to your Apple Developer account (Step 1)
- Make sure "Automatically manage signing" is checked
- Try selecting your team again from the dropdown

### "Bundle identifier is already in use"
- This means the bundle ID `app.heard.community` is already registered
- You can either:
  - Use a different bundle ID (change it in Xcode and in `capacitor.config.ts`)
  - Or use the existing one if it's yours

### Build errors
- Try: **Product → Clean Build Folder** (or `Cmd + Shift + K`)
- Then build again

### "Unable to install app"
- On your device: Settings → General → VPN & Device Management → Trust the developer
- Make sure your device is unlocked
- Try disconnecting and reconnecting the USB cable

---

## ✅ What's Next?

Once your app builds and runs successfully:

1. **Test thoroughly** - Make sure all features work
2. **Prepare for App Store** - See `IOS_DEPLOYMENT_CHECKLIST.md` for:
   - Creating app icons
   - Preparing screenshots
   - Archiving the app
   - Uploading to App Store Connect
   - Submitting for review

---

**Need help?** Check `IOS_DEPLOYMENT_CHECKLIST.md` for the complete deployment process.


