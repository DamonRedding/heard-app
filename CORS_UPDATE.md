# Adding CORS Support to Production Server

To enable your local iOS development to connect to the production API, you need to add CORS headers to your production server.

## Update Required in `server/index.ts`

Add this middleware **before** your route registration (around line 25, after `app.use(express.urlencoded({ extended: false }));`):

```typescript
// CORS configuration for development
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',      // Vite dev server
    'http://localhost:5000',      // Alternative dev port
    'http://localhost:8100',      // Ionic dev server
    'capacitor://localhost',      // Capacitor iOS
    'http://localhost'            // Generic localhost
  ];

  const origin = req.headers.origin;

  // Only allow CORS for development origins
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});
```

## Deployment Steps

1. **Update your Replit code** with the CORS middleware above
2. **Deploy the changes** (Replit should auto-deploy)
3. **Test the connection** again using the test script

## Security Considerations

The CORS configuration above:
- ✅ Only allows specific localhost origins
- ✅ Doesn't expose your API to any external websites
- ✅ Maintains security while enabling local development
- ✅ Handles preflight requests properly

## Alternative: Environment-Based CORS

For more flexibility, you can use environment variables:

```typescript
// CORS configuration based on environment
app.use((req, res, next) => {
  const isDevelopment = process.env.ALLOW_DEV_CORS === 'true';

  if (isDevelopment) {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'capacitor://localhost'
    ];

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});
```

Then in your Replit secrets, add:
```
ALLOW_DEV_CORS=true
CORS_ORIGINS=http://localhost:5173,capacitor://localhost
```

This way you can easily enable/disable CORS without code changes.