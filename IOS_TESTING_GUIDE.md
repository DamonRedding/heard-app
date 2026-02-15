# iOS Testing Guide - Heard Church Feedback App

## Current Status

✅ **App Successfully Deployed to iOS Simulator**
- Bundle ID: `app.heard.community`
- Display Name: Heard
- Device: iPhone 16e (iOS 26.0)
- PID: 40464 (running)

## Quick Testing Commands

### Launch App
```bash
# Using the launch script (recommended)
./scripts/launch-ios.sh

# Or target specific device
./scripts/launch-ios.sh "iPhone 17 Pro"

# Manual launch
source ~/.nvm/nvm.sh && nvm use
npx cap run ios --target "iPhone 16e"
```

### Relaunch After Changes
```bash
# Just rebuild and sync (faster)
source ~/.nvm/nvm.sh && nvm use
npm run build && npx cap sync ios

# Then relaunch from simulator or:
xcrun simctl launch booted app.heard.community
```

### Open Safari DevTools
1. Open Safari
2. Menu: Develop > Simulator > iPhone 16e > Heard
3. Console, Network, and Elements tabs available

## Testing Checklist for Production API Connection

### 1. App Launch and Initial Load

**Test:** App launches and loads feed from production
```
Expected:
✅ Splash screen shows
✅ Feed loads with 77+ submissions
✅ No CORS errors in console
✅ Church names display correctly
```

**Safari Console Check:**
```javascript
// Check API calls
Network tab > Filter: churchheard.com
// Should see GET /api/submissions
```

### 2. Feed Interactions

**Test:** Scroll through feed
```
Actions:
1. Scroll down to load more submissions
2. Verify infinite scroll works
3. Check safe area padding (no content behind notch)
4. Test pull-to-refresh

Expected:
✅ Smooth 60fps scrolling
✅ New submissions load automatically
✅ Content respects safe areas
✅ Pull-to-refresh triggers reload
```

### 3. Emoji Reactions

**Test:** Tap emoji reactions on a submission
```
Actions:
1. Tap Amen emoji (🙏)
2. Tap again to remove
3. Try other emojis (Wow 😮, Heartbreak 💔, Trash 🗑️)

Expected:
✅ Haptic feedback on tap
✅ Count increments immediately
✅ API call to production succeeds
✅ Visual feedback (color change)
```

**Check Network:**
```
POST /api/submissions/:id/reaction
Body: { reaction: 'amen' }
Status: 200
```

### 4. Comments

**Test:** View and add comments
```
Actions:
1. Tap on a submission to view details
2. Scroll to comments section
3. Tap "Add a comment"
4. Type a test comment
5. Submit

Expected:
✅ Comments load from production
✅ Keyboard appears with proper resize behavior
✅ Bottom nav hides when keyboard shows
✅ Comment submits successfully
✅ New comment appears immediately
```

**Keyboard Behavior:**
- Bottom navigation should transform down: `translateY(100%)`
- Content should remain visible
- No jarring layout shifts

### 5. Church Search

**Test:** Search for a church
```
Actions:
1. Tap Churches tab in bottom nav
2. Tap search bar
3. Type "Grace"
4. Select a church from results

Expected:
✅ Typeahead suggestions appear
✅ Results from production database
✅ Tap selects church
✅ Feed filters to that church
```

### 6. Submission Flow

**Test:** Create a new submission
```
Actions:
1. Tap Submit tab (+ icon)
2. Select a church
3. Enter story text (min 50 chars)
4. Select category
5. Submit

Expected:
✅ Form validates properly
✅ Submission saves to production
✅ Redirects to feed
✅ New submission appears
```

**Note:** This creates real data in production! Use test church names.

### 7. Settings and Theme

**Test:** Toggle dark mode
```
Actions:
1. Tap Settings tab
2. Toggle theme switch

Expected:
✅ Theme changes immediately
✅ Colors transition smoothly
✅ Safe area colors update
✅ Status bar style updates
```

### 8. Safe Area Testing

**Test:** Verify safe areas on notched devices
```
Devices to Test:
- iPhone 16e (no notch)
- iPhone 17 Pro (notch + dynamic island)
- iPhone 17 Pro Max (largest screen)

Check:
✅ Header doesn't hide behind notch
✅ Bottom nav respects home indicator
✅ Content scrolls fully visible
✅ Fixed elements positioned correctly
```

### 9. Performance Testing

**Test:** Monitor performance metrics
```
Safari DevTools > Timelines:
- Memory usage
- CPU usage during scroll
- Network waterfall

Expected:
✅ <100MB memory
✅ 60fps during scroll
✅ API calls <500ms
✅ No memory leaks
```

### 10. Haptic Feedback

**Test:** Verify haptic patterns
```
Interactions with Haptics:
- Emoji tap: Light impact
- Pull to refresh: Selection
- Comment submit: Success notification
- Error: Error notification

Expected:
✅ Distinct haptic for each action
✅ No haptics on Android/web
✅ Feels natural and responsive
```

## iOS-Specific Issues to Watch For

### 1. CORS Errors

**Symptom:** Network requests fail with CORS policy errors

**Check:**
```javascript
// Safari Console
fetch('https://churchheard.com/api/submissions')
  .then(r => console.log('Success:', r.status))
  .catch(e => console.error('CORS Error:', e));
```

**Fix:** Add CORS headers to production server (see IOS_DEV_WORKFLOW.md)

### 2. Keyboard Pushing Content

**Symptom:** Bottom nav gets pushed up when keyboard appears

**Check:**
```css
/* Should be present in styles */
.ios.keyboard-open .bottom-nav {
  transform: translateY(100%);
}
```

**Verify:**
```javascript
// Listen for keyboard events
import { Keyboard } from '@capacitor/keyboard';

Keyboard.addListener('keyboardWillShow', (info) => {
  console.log('Keyboard height:', info.keyboardHeight);
  // Bottom nav should hide
});
```

### 3. Viewport Gaps on Scroll

**Symptom:** White/background gaps appear during overscroll

**Check:** WebView background should match app background

**Verify:**
```bash
# Check if patch script ran
cat ios/App/App/AppDelegate.swift | grep "F5F1E8"
# Should see: webView.backgroundColor = UIColor(hex: "#F5F1E8")
```

### 4. Safe Area Issues

**Symptom:** Content hidden behind notch or home indicator

**Check:**
```css
/* Header should have */
padding-top: max(env(safe-area-inset-top), 0px);

/* Bottom nav should have */
padding-bottom: max(env(safe-area-inset-bottom), 16px);
```

**Verify:**
```javascript
// Safari Console
getComputedStyle(document.querySelector('.header')).paddingTop
// Should be > 0 on notched devices
```

### 5. Status Bar Overlap

**Symptom:** Content behind status bar

**Check:**
```typescript
// capacitor.config.ts
StatusBar: {
  overlaysWebView: false  // Should be false
}
```

**Visual Check:** Status bar should have solid color, not transparent

## Production API Verification

### API Endpoints to Test

```bash
# Health check
curl https://churchheard.com/api/health

# Get submissions
curl https://churchheard.com/api/submissions?limit=10

# Get churches
curl https://churchheard.com/api/churches?search=Grace

# Get categories
curl https://churchheard.com/api/categories
```

### Expected Responses

**Submissions:**
```json
{
  "submissions": [...],
  "total": 77,
  "limit": 10,
  "offset": 0
}
```

**Churches:**
```json
{
  "churches": [
    {
      "id": 1,
      "name": "Grace Community Church",
      "city": "Tempe",
      "state": "AZ"
    }
  ]
}
```

## Debugging Tools

### Safari Web Inspector

**Access:**
1. Safari > Settings > Advanced > Show Developer menu
2. Develop > Simulator > Heard

**Useful Tabs:**
- **Console:** View logs, errors, warnings
- **Network:** Inspect API calls, CORS headers, timing
- **Elements:** Inspect DOM, CSS, safe areas
- **Timelines:** Profile performance, memory

### Xcode Console

**Access:**
1. Open Xcode: `npx cap open ios`
2. Run app: Cmd+R
3. View console: Cmd+Shift+Y

**Useful Logs:**
```
[Capacitor] Plugin events
[WebView] JavaScript errors
[Network] Request failures
```

### Log Native Events

Add to `ios/App/App/AppDelegate.swift`:

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    print("🚀 App launched successfully")
    return true
}
```

## Common Test Scenarios

### Scenario 1: First-Time User

```
Steps:
1. Launch app (fresh install)
2. View default feed
3. Scroll and explore
4. React to submission
5. Add comment
6. Create submission
7. Search churches
8. Toggle theme

Checks:
✅ Smooth onboarding experience
✅ No errors in console
✅ All features work without auth
✅ Performance feels native
```

### Scenario 2: Power User

```
Steps:
1. Rapid scroll through feed
2. React to multiple submissions quickly
3. Add several comments
4. Create submission with long text
5. Search and filter churches
6. Toggle theme multiple times

Checks:
✅ No lag or jank
✅ No memory leaks
✅ Haptics feel responsive
✅ API calls batched/optimized
```

### Scenario 3: Edge Cases

```
Tests:
1. Open app without network (airplane mode)
2. Submit comment with emoji and special chars
3. Search with empty query
4. React spam (tap same emoji 10x)
5. Keyboard dismiss methods
6. Background → foreground transition

Checks:
✅ Graceful offline handling
✅ Special characters work
✅ Empty states display
✅ Rate limiting works
✅ Keyboard dismisses properly
✅ App resumes correctly
```

## Performance Benchmarks

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| App Launch | <2s | ? |
| Feed Load | <1s | ? |
| Scroll FPS | 60fps | ? |
| Memory | <100MB | ? |
| Bundle Size | <1MB (gzipped) | 300KB |

### Measure Performance

**Safari Timelines:**
```
1. Open Timeline tab
2. Start recording
3. Perform action (scroll, load, etc)
4. Stop recording
5. Analyze results
```

**Xcode Instruments:**
```bash
# Launch Instruments
open -a Instruments

# Select template: Time Profiler or Leaks
# Attach to: iPhone 16e > Heard
# Record and analyze
```

## Next Steps

### Immediate Testing

1. ✅ Launch app in simulator
2. 🔄 Verify feed loads from production
3. 🔄 Test emoji reactions
4. 🔄 Test comment submission
5. 🔄 Test church search
6. 🔄 Verify safe areas
7. 🔄 Check keyboard behavior

### CORS Configuration

Add to production `server/index.ts`:
```typescript
app.use((req, res, next) => {
  const allowedOrigins = [
    'capacitor://localhost',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

### Physical Device Testing

```bash
# Find connected devices
xcrun xctrace list devices

# Build for device
npx cap run ios --target [device-udid]

# Or open in Xcode and select device
npx cap open ios
# Xcode: Select device > Cmd+R
```

### App Store Preparation

1. Configure signing in Xcode
2. Update App Store assets
3. Test on multiple devices
4. Run accessibility audit
5. Optimize performance
6. Create TestFlight build

## Resources

- **Safari DevTools:** Develop menu > Simulator > Heard
- **Capacitor Docs:** https://capacitorjs.com/docs/ios/debugging
- **iOS HIG:** https://developer.apple.com/design/human-interface-guidelines/
- **Production API:** https://churchheard.com

---

**App Status:** ✅ Running on iPhone 16e
**Last Updated:** February 15, 2026
**Next:** Add CORS headers to production and test API calls
