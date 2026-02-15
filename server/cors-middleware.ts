import type { Request, Response, NextFunction } from 'express';

/**
 * CORS Middleware for Development
 *
 * Add this to your production server to enable local iOS development.
 * Import and use this middleware in your server/index.ts file.
 */

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Define allowed origins for development
  const allowedOrigins = [
    'http://localhost:5173',          // Vite dev server
    'http://localhost:5000',          // Alternative port
    'http://localhost:8100',          // Ionic dev server
    'capacitor://localhost',          // Capacitor iOS
    'http://localhost',               // Generic localhost
    'http://192.168.86.29:5173',     // Your local network IP
    'http://100.64.0.1:5173'         // Alternative network IP
  ];

  // Get the origin from request headers
  const origin = req.headers.origin || req.headers.referer;

  // Log CORS requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`CORS request from origin: ${origin}`);
  }

  // Check if origin is allowed
  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    // Preflight request - respond immediately
    return res.sendStatus(200);
  }

  next();
}

/**
 * Usage in server/index.ts:
 *
 * import { corsMiddleware } from './cors-middleware';
 *
 * // Add after express setup, before routes
 * app.use(corsMiddleware);
 */