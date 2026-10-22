import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import jevRouter from './routes/jevRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const app = express();

// Body parser
app.use(express.json({ limit: '1mb' }));

// Vendor asset serving for Chart.js
app.use('/vendor/chart.js', express.static(path.join(rootDir, 'node_modules', 'chart.js', 'dist')));

// Static asset serving from public directory
app.use(express.static(publicDir, {
  etag: true,
  maxAge: 0
}));

// API Routes
app.use('/api/jev', jevRouter);

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start HTTP server
app.listen(config.port, () => {
  console.log(`Server is running at http://localhost:${config.port}/`);
  console.log(`JEV Endpoint: ${config.jevEndpoint} (Model: ${config.jevModel})`);
});
