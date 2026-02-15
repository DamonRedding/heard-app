# 🚨 Immediate Actions Required

## 1. Add CORS Headers to Production (5 minutes)

The API is working but **CORS headers are missing**. Your iOS app cannot connect until you add them.

### Quick Fix - Add to Replit `server/index.ts`:

```typescript
// Add this after line 25 (after express.urlencoded setup)
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    'capacitor://localhost',
    'http://localhost'
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});
```

## 2. Test Connection (2 minutes)

After adding CORS, test the connection:

```bash
# From your project directory
node test-api-connection.js
```

Expected output:
```
✅ Success! Found 77 total submissions
✅ CORS headers present
```

## 3. Open iOS App in Safari (1 minute)

1. Open Safari
2. Menu: Develop → Simulator → Heard
3. Check Console tab for any errors
4. Check Network tab to verify API calls

## 4. Test Core Features (5 minutes)

In the iOS simulator:

1. **Feed Loading**: Should show church submissions
2. **Reactions**: Tap emoji buttons (should feel haptic on device)
3. **Voting**: Test Condemn/Absolve buttons
4. **Comments**: Open a submission and view comments
5. **Search**: Try searching for a church

## 5. Use Dev Dashboard (Optional)

In the iOS app:
- Press **Cmd+Shift+D** to open dev dashboard
- Run all tests to validate features
- Check API connection status

## Current Status

| Component | Status |
|-----------|--------|
| iOS App | ✅ Deployed to simulator |
| Vite Server | ✅ Running on localhost:5173 |
| Production API | ✅ Accessible at churchheard.com |
| CORS Headers | ❌ **NEEDS CONFIGURATION** |
| Data Loading | ⏳ Waiting for CORS |

## Next Steps After CORS

Once CORS is configured:

1. **Verify Data Loading**: Open the app and confirm submissions appear
2. **Test Interactions**: Vote, react, comment
3. **Check Performance**: Smooth scrolling, fast loading
4. **Safari DevTools**: Monitor network requests and console

## Troubleshooting

**If no data loads after adding CORS:**
1. Check Safari console for errors
2. Verify CORS headers with: `curl -I "https://churchheard.com/api/submissions"`
3. Make sure origin matches exactly (including port)

**If app crashes:**
1. Check Xcode logs: `npx cap open ios`
2. Look for memory or JavaScript errors

**If haptics don't work:**
- Normal - haptics only work on physical devices, not simulator

## Success Criteria

Your iOS app is working when:
- ✅ Feed shows real church submissions
- ✅ Can vote and see counts update
- ✅ Can add reactions with feedback
- ✅ Can view and post comments
- ✅ Search returns results
- ✅ No errors in Safari console

**Estimated time to complete: 10-15 minutes**