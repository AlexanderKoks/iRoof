import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// JSON parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] || '0.0.0'
  });
});

/**
 * API endpoint for caching geocoding results (optional enhancement)
 */
app.post('/api/cache/geocode', (req, res) => {
  try {
    // This could be enhanced to cache frequently searched addresses
    // For now, just return success
    res.status(200).json({ success: true, message: 'Geocode cached' });
  } catch (error) {
    console.error('Error caching geocode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * API endpoint for storing measurement data (optional enhancement)
 */
app.post('/api/measurements', (req, res) => {
  try {
    const { address, area, pitchAngle, coordinates } = req.body;
    
    // Validate required fields
    if (!address || !area || !coordinates) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // This could be enhanced to store measurements in a database
    // For now, just return success with the measurement data
    const measurement = {
      id: Date.now().toString(),
      address,
      area,
      pitchAngle: pitchAngle || 0,
      coordinates,
      timestamp: new Date().toISOString()
    };
    
    return res.status(201).json({ success: true, measurement });
  } catch (error) {
    console.error('Error storing measurement:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createNodeRequestHandler(app);
