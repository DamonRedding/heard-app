# iOS Development Workflow Guide - Heard App

## Current Status - February 15, 2026

✅ **Environment Ready**
- Node.js v22.22.0 (required for Capacitor 8)
- Xcode 26.0.1 installed
- iOS Simulator available (iPhone 16e currently booted)
- Production API accessible at https://churchheard.com
- Build completed and synced to iOS

## Quick Start

### 1. Start Development Server
```bash
# Terminal 1: Start Vite dev server
source ~/.nvm/nvm.sh && nvm use
npm run dev:client
```

The dev server will run at:
- Local: http://localhost:5173/
- Network: http://[your-ip]:5173/

### 2. Launch iOS Simulator
```bash
# Terminal 2: Run iOS app
source ~/.nvm/nvm.sh && nvm use
npx cap run ios

# Or target specific device:
npx cap run ios --target "iPhone 16e"
npx cap run ios --target "iPhone 17 Pro"
```

### 3. Open in Xcode (Alternative)
```bash
source ~/.nvm/nvm.sh && nvm use
npx cap open ios
```
Then press ⌘+R to build and run.

## Development Workflow

### Making Changes

1. **Edit your code** in `client/src/`
2. **Hot reload** will update the web server automatically
3. **iOS app** will reload when you save (using live reload)

### After Changing Native Code

If you modify:
- `capacitor.config.ts`
- Native iOS code in `ios/App/`
- Plugin configurations

Run:
```bash
source ~/.nvm/nvm.sh && nvm use
npm run build
npx cap sync ios
```

## Production API Connection

### Current Configuration

The app is configured to use production data from churchheard.com:

**Environment (.env):**
```env
VITE_API_URL=https://churchheard.com
VITE_USE_PRODUCTION_API=true
```

**Vite Proxy (vite.config.ts):**
```typescript
proxy: {
  '/api': {
    target: 'https://churchheard.com',
    changeOrigin: true,
    secure: true
  }
}
```

### API Test Results
```
✅ Production API accessible
✅ 77 submissions available
⚠️  CORS headers not configured (see below)
```

### CORS Configuration Needed

The production server needs CORS headers for local development. Add to your Replit `server/index.ts`:

```typescript
// CORS configuration for development
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',      // Vite dev server
    'http://localhost:5000',      // Alternative dev port
    'capacitor://localhost',      // Capacitor iOS
    'http://localhost'            // Generic localhost
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});
```

## iOS-Specific Considerations

### 1. Safe Area Handling

The app uses Capacitor's safe area configuration:

**Capacitor Config:**
```typescript
ios: {
  contentInset: 'never',
  preferredContentMode: 'mobile',
  backgroundColor: '#F5F1E8'
}
```

**CSS Implementation:**
```css
/* Safe area padding */
padding-top: max(env(safe-area-inset-top), 0px);
padding-bottom: max(env(safe-area-inset-bottom), 0px);

/* For fixed elements */
position: fixed;
top: env(safe-area-inset-top);
bottom: env(safe-area-inset-bottom);
```

### 2. Keyboard Management

**Current Configuration:**
```typescript
Keyboard: {
  resize: 'none',
  style: 'dark'
}
```

This prevents the iOS keyboard from pushing up the bottom navigation. The app handles keyboard visibility with CSS:

```css
.ios.keyboard-open .bottom-nav {
  transform: translateY(100%);
}
```

### 3. Viewport Configuration

**Meta Tag:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, viewport-fit=cover">
```

The `viewport-fit=cover` ensures the app extends into safe areas.

### 4. WebView Background Fix

A post-install script patches the iOS WebView to prevent gaps during scrolling:

**Script:** `scripts/patch-ios-webview.js`
**Effect:** Sets WKWebView background to match app background color

### 5. Status Bar Configuration

```typescript
StatusBar: {
  style: 'light',
  backgroundColor: '#0D5C63',
  overlaysWebView: false
}
```

## Testing iOS-Specific Features

### Haptic Feedback
```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

await Haptics.impact({ style: ImpactStyle.Light });
await Haptics.notification({ type: NotificationType.Success });
```

### Keyboard Events
```typescript
import { Keyboard } from '@capacitor/keyboard';

Keyboard.addListener('keyboardWillShow', info => {
  console.log('keyboard will show with height:', info.keyboardHeight);
});

Keyboard.addListener('keyboardWillHide', () => {
  console.log('keyboard will hide');
});
```

### Status Bar
```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

await StatusBar.setStyle({ style: Style.Light });
await StatusBar.hide();
await StatusBar.show();
```

## Debugging

### Safari Developer Tools

1. **Open Safari** on your Mac
2. **Enable Developer Menu:** Safari > Settings > Advanced > Show Developer menu
3. **Connect to Simulator:** Develop > Simulator > [Your App]
4. **Inspect elements** and view console logs

### Xcode Console

1. **Open Xcode** and run the app
2. **View logs** in the bottom panel
3. **Set breakpoints** in native iOS code

### Network Debugging

Use Safari Developer Tools to inspect:
- API calls to churchheard.com
- Response status codes
- CORS errors
- Request/response bodies

## Performance Considerations

### Build Size
Current production build:
```
index.html:      3.33 kB (gzip: 1.21 kB)
CSS:           103.47 kB (gzip: 16.38 kB)
Main JS:       991.22 kB (gzip: 300.72 kB) ⚠️
```

**Optimization Opportunities:**
1. Code splitting with dynamic imports
2. Lazy loading routes
3. Manual chunk splitting for vendor dependencies
4. Image optimization

### iOS-Specific Performance

1. **Smooth Scrolling:** CSS `scroll-behavior: smooth` with momentum
2. **Touch Targets:** Minimum 44x44pt for iOS HIG compliance
3. **Animation:** Use CSS transforms (GPU accelerated)
4. **Memory:** Monitor in Xcode Instruments

## Church Feedback App Features

### Core Features
- Anonymous church experience submissions
- Real-time feed with infinite scroll
- Emoji reactions (Amen, Wow, Heartbreak, Trash)
- Comments with nested replies
- Church search and filtering
- Dark/light theme toggle

### iOS UX Enhancements
- Pull-to-refresh on feed
- Haptic feedback on interactions
- Native keyboard handling
- Safe area padding for notched devices
- Smooth scrolling with momentum

### Data Privacy
- Anonymous submissions (no user accounts required)
- Location-based church search
- Emoji reactions tracked by IP (not user)
- Comments tied to session IDs

## Troubleshooting

### Build Errors

**Error:** "Capacitor CLI requires NodeJS >=22.0.0"
```bash
source ~/.nvm/nvm.sh
nvm use
# Creates .nvmrc file automatically
```

**Error:** "Unable to boot simulator"
```bash
# List running simulators
xcrun simctl list devices | grep Booted

# Shutdown all simulators
xcrun simctl shutdown all

# Boot specific simulator
xcrun simctl boot "iPhone 16e"
```

### CORS Errors

**Symptom:** API calls fail with CORS error in console

**Fix:** Add CORS middleware to production server (see above)

**Workaround:** Use Capacitor's built-in HTTP plugin for native requests:
```typescript
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.get({
  url: 'https://churchheard.com/api/submissions'
});
```

### Keyboard Issues

**Problem:** Keyboard pushes up content unexpectedly

**Solution:** Current config uses `resize: 'none'` and CSS transforms

**Alternative:** Use `resize: 'ionic'` or `resize: 'body'` if needed

### Safe Area Issues

**Problem:** Content hidden behind notch/home indicator

**Check:**
1. Verify `viewport-fit=cover` in HTML
2. Use `env(safe-area-inset-*)` in CSS
3. Test on devices with notches (iPhone 17, 17 Pro)

## Available Simulators

```
iPhone 16e (iOS 26.0)         - Currently booted
iPhone 17 (iOS 26.0)          - Latest standard model
iPhone 17 Pro (iOS 26.0)      - Pro features
iPhone 17 Pro Max (iOS 26.0)  - Largest screen
iPhone Air (iOS 26.0)         - New model
iPad Air 11" M3 (iOS 26.0)    - Tablet testing
```

## Testing Checklist

### Pre-Release Testing

- [ ] Launch app on iPhone 16e simulator
- [ ] Test on iPhone 17 Pro (notch handling)
- [ ] Test on iPad (responsive layout)
- [ ] Test dark mode toggle
- [ ] Test pull-to-refresh
- [ ] Test keyboard interactions
- [ ] Test emoji reactions with haptics
- [ ] Test comment submission
- [ ] Test church search
- [ ] Test infinite scroll
- [ ] Test safe area padding
- [ ] Test status bar appearance
- [ ] Check network requests in Safari dev tools
- [ ] Verify no CORS errors
- [ ] Test app launch time
- [ ] Test memory usage in Xcode

## Next Steps

### Immediate
1. ✅ Verify Node.js 22+ installed
2. ✅ Build and sync iOS project
3. ✅ Test production API connection
4. 🔄 Add CORS headers to production (Replit)
5. 🔄 Launch app in simulator
6. 🔄 Test core features with production data

### Short Term
1. Add physical device testing setup
2. Implement push notifications
3. Add App Store assets (icons, screenshots)
4. Configure provisioning profiles
5. Set up TestFlight distribution

### Long Term
1. Optimize bundle size (code splitting)
2. Add offline support (service worker)
3. Implement analytics (PostHog)
4. Add crash reporting
5. Performance monitoring

## Resources

- **Capacitor Docs:** https://capacitorjs.com/docs/ios
- **iOS HIG:** https://developer.apple.com/design/human-interface-guidelines/ios
- **Safe Areas:** https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- **WKWebView:** https://developer.apple.com/documentation/webkit/wkwebview

---

**Last Updated:** February 15, 2026
**Environment:** macOS 14.0, Xcode 26.0.1, Node 22.22.0, Capacitor 8.0.2
