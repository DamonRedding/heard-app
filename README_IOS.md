# Heard iOS App - Quick Reference

**Church Feedback Platform for iOS**

## Status: Ready for Development ✅

Your iOS development environment is fully configured and the app is running in the simulator.

## Quick Commands

```bash
# Launch iOS app (recommended)
./scripts/launch-ios.sh

# Or manually
source ~/.nvm/nvm.sh && nvm use
npx cap run ios

# Debug with Safari
Safari > Develop > Simulator > Heard

# Test API connection
node test-api-connection.js
```

## Documentation

- **[IOS_DEV_WORKFLOW.md](IOS_DEV_WORKFLOW.md)** - Complete development workflow
- **[IOS_TESTING_GUIDE.md](IOS_TESTING_GUIDE.md)** - Testing procedures and checklist
- **[IOS_SETUP_SUMMARY.md](IOS_SETUP_SUMMARY.md)** - Setup summary and status
- **[CORS_UPDATE.md](CORS_UPDATE.md)** - CORS configuration for production

## Critical Next Step ⚠️

**Add CORS headers to your production server (Replit):**

```typescript
// server/index.ts (before routes)
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'capacitor://localhost',
    'http://localhost'
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

## Current Environment

- **Node.js:** v22.22.0 (via NVM)
- **Xcode:** 26.0.1
- **Capacitor:** 8.0.2
- **iOS Simulator:** iPhone 16e (iOS 26.0)
- **Production API:** https://churchheard.com
- **App Bundle ID:** app.heard.community

## App Features

- Anonymous church feedback submissions
- Real-time feed with 77+ submissions
- Emoji reactions (Amen, Wow, Heartbreak, Trash)
- Comments with nested replies
- Church search and filtering
- Dark/light theme toggle
- iOS-specific: Haptics, safe areas, keyboard management

## Support

- **Capacitor Docs:** https://capacitorjs.com/docs/ios
- **iOS HIG:** https://developer.apple.com/design/human-interface-guidelines/

---

**Environment:** ✅ Ready
**App Status:** ✅ Running in simulator
**Next:** Configure CORS and test features
