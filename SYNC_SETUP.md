# Syncing Local Development with Production Data

This guide explains how to connect your local iOS development environment to your live Replit production data.

## Quick Setup (Recommended)

### Step 1: Get Your Replit App URL
1. Go to your Replit project
2. Find your app's public URL (e.g., `https://heard-app.yourusername.repl.co`)

### Step 2: Create Local Environment File
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add:
   ```env
   VITE_API_URL=https://your-actual-heard-app.repl.co
   VITE_USE_PRODUCTION_API=true
   ```

### Step 3: Update Replit CORS Settings
Add CORS headers to allow your local development. In your Replit `server/index.ts`, add before your routes:

```typescript
// Add CORS for local development
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    'capacitor://localhost',
    'http://localhost',
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

### Step 4: Run Your Local Development
```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# In another terminal, sync and run iOS
npx cap sync ios
npx cap run ios
```

## Alternative Options

### Option 1: Direct Database Connection
If you need direct database access:

1. Get your `DATABASE_URL` from Replit Secrets
2. Add to `.env`:
   ```env
   DATABASE_URL=postgresql://...
   ```
3. Run normally with `npm run dev`

**Pros**: Full database access
**Cons**: Less secure, requires exposing production credentials

### Option 2: Local Database with Data Export
For complete isolation:

1. Set up local PostgreSQL
2. Export data from Replit:
   ```bash
   pg_dump $DATABASE_URL > production_dump.sql
   ```
3. Import locally:
   ```bash
   psql local_db < production_dump.sql
   ```

**Pros**: Safe for testing, no production impact
**Cons**: Data gets out of sync, requires manual updates

## Troubleshooting

### iOS Simulator Can't Connect
1. Make sure you're using the correct URL in `.env`
2. Check that CORS is properly configured on Replit
3. Try using `http://` instead of `https://` for local testing

### Data Not Showing
1. Open browser developer tools
2. Check Network tab for API calls
3. Verify they're going to the correct URL
4. Check for CORS errors in console

### Authentication Issues
If your app uses authentication, you may need to:
1. Configure session cookies to work cross-domain
2. Use a shared auth token approach
3. Temporarily disable auth for local testing

## Best Practices

1. **Use Environment Variables**: Never hardcode production URLs
2. **Separate Configs**: Keep development and production configs separate
3. **Version Control**: Don't commit `.env` files with real credentials
4. **API Versioning**: Consider versioning your API for compatibility

## Mobile-Specific Considerations

### Capacitor Configuration
The app uses Capacitor for iOS builds. Key files:
- `capacitor.config.ts`: Main configuration
- `ios/App/`: Native iOS project

### Live Reload on Device
To test on a physical device with live reload:

1. Find your computer's IP address
2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://YOUR_IP:5173',
     cleartext: true
   }
   ```
3. Run `npx cap sync ios`

Remember to remove this before production builds!

## Security Notes

1. **API Keys**: Keep any API keys in environment variables
2. **CORS**: Only allow specific origins in production
3. **HTTPS**: Always use HTTPS for production APIs
4. **Rate Limiting**: Your production API should have rate limiting

## Next Steps

After setup, your local iOS app will:
- Display the same data as your live website
- Make API calls to your production server
- Update in real-time as data changes

For production iOS builds, remove the development configurations and ensure the app uses relative URLs to work with the bundled web assets.