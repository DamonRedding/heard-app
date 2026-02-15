# ✅ Local iOS Development Setup Complete

Your local iOS development environment is now configured to use the production API at `https://churchheard.com`.

## Current Status

- ✅ Environment variables configured in `.env`
- ✅ API configuration set to use production URL
- ✅ Vite proxy configured for API calls
- ✅ Development server running at http://localhost:5173/
- ✅ Network accessible at http://192.168.86.29:5173/

## Important Security Notes

⚠️ **CRITICAL**: Your database credentials were exposed in the chat. Please:
1. **Immediately change your database password** in Neon Dashboard
2. **Update the password** in your Replit environment variables
3. **Never share these credentials publicly**

## Next Steps

### 1. Enable CORS on Production (Required)
Your production server needs CORS headers. Add this to your Replit `server/index.ts`:

```typescript
// Add after express setup, before routes
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    'capacitor://localhost',
    'http://192.168.86.29:5173' // Your network IP
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

### 2. Run iOS Simulator
In a new terminal:
```bash
npx cap run ios
```

Or select a specific simulator:
```bash
npx cap run ios --list  # See available devices
npx cap run ios --target "iPhone 15 Pro"
```

### 3. Test on Physical Device
1. Find your IP: `ifconfig | grep inet`
2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.86.29:5173',
     cleartext: true
   }
   ```
3. Sync: `npx cap sync ios`
4. Run on device: `npx cap run ios --target [device-id]`

## Available Commands

- `npm run dev:client` - Start Vite dev server only
- `npm run dev:ios` - Start Vite + sync + run iOS
- `npx cap open ios` - Open in Xcode
- `./setup-ios-dev.sh` - Re-run setup script

## Troubleshooting

### CORS Errors
- Check browser console for specific error
- Verify CORS middleware is added to production
- Check that origin matches exactly (including port)

### No Data Showing
- Open Safari developer tools (Develop > Simulator)
- Check Network tab for API calls
- Verify they're going to https://churchheard.com
- Check for any 4xx/5xx errors

### iOS Build Issues
- Clean build: `cd ios && rm -rf App/build`
- Pod install: `cd ios/App && pod install`
- Reset: `npx cap sync ios --force`

## Architecture

```
Local Development
├── Vite Dev Server (localhost:5173)
│   └── Serves React app with HMR
├── API Proxy
│   └── Forwards /api/* → churchheard.com
└── iOS Simulator/Device
    └── Loads from Vite server
```

Your app is now fully configured to develop locally while using production data! 🎉