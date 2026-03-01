/**
 * server/index.js  –  Nexus backend entry point
 *
 * Run:  node index.js          (production)
 *       nodemon index.js       (development)
 *
 * Listens on PORT 3001 – Vite proxies /api/* → http://localhost:3001
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

// ── Bootstrap DB on require ─────────────────────────────────────────────── //
require('./db');

// ── App ─────────────────────────────────────────────────────────────────── //
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────── //
const practiceRouter = require('./routes/practice');
app.use('/api/practice', practiceRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Start ────────────────────────────────────────────────────────────────── //
app.listen(PORT, () => {
  console.log(`\n  ✓  Nexus server running → http://localhost:${PORT}`);
  console.log(`     /api/practice  – Practice Hub endpoints\n`);
});
