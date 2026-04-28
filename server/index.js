/**
 * server/index.js  –  Nexus backend entry point
 *
 * Run:  node index.js          (production)
 *       nodemon index.js       (development)
 *
 * Listens on PORT 3001 – Vite proxies /api/* → http://localhost:3001
 */

require('dotenv').config();   // load server/.env  → process.env.*

const http     = require('http');
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { registerWhiteboardSocket } = require('./socket/WhiteboardSocket');
const { registerStudySocket }     = require('./socket/StudySocket');

// ── Bootstrap DB on require ─────────────────────────────────────────────── //
require('./db');

// ── App ─────────────────────────────────────────────────────────────────── //
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods : ['GET', 'POST'],
  },
});
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ── Routes ──────────────────────────────────────────────────────────────── //
const authRouter        = require('./routes/auth');
const practiceRouter    = require('./routes/practice');
const jobsRouter        = require('./routes/jobs');
const hackathonsRouter  = require('./routes/hackathons');
const internshipsRouter = require('./routes/internships');
const aimRouter         = require('./routes/aim');
const studyRouter       = require('./routes/study');
const dashboardRouter   = require('./routes/dashboard');
const resumeRouter      = require('./routes/resume');
app.use('/api/auth',        authRouter);
app.use('/api/practice',    practiceRouter);
app.use('/api/jobs',        jobsRouter);
app.use('/api/hackathons',  hackathonsRouter);
app.use('/api/internships', internshipsRouter);
app.use('/api/aim',         aimRouter);
app.use('/api/study',       studyRouter);
app.use('/api/dashboard',   dashboardRouter);
app.use('/api/resume',      resumeRouter);

// Health check — includes MongoDB connection status details
app.get('/api/health', (_req, res) => {
  const readyState = mongoose.connection.readyState;
  const stateNames = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    source: readyState === 1 ? 'MongoDB' : 'JSON',
    mongoState: stateNames[readyState] || 'unknown',
  });
});

// ── 404 for unknown API routes ──────────────────────────────────────────── //
app.use('/api/*', (_req, res) => res.status(404).json({ error: 'API endpoint not found' }));

// ── Global error handler ────────────────────────────────────────────────── //
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Socket.io ─────────────────────────────────────────────────────────────── //
registerWhiteboardSocket(io);
registerStudySocket(io);

// ── Start ────────────────────────────────────────────────────────────────── //
server.listen(PORT, () => {
  console.log(`\n    Nexus server running → http://localhost:${PORT}`);
  console.log(`     /api/auth         – Authentication endpoints`);
  console.log(`     /api/practice     – Practice Hub endpoints`);
  console.log(`     /api/jobs         – Placement Portal job listings`);
  console.log(`     /api/hackathons   – Hackathons listings`);
  console.log(`     /api/internships  – Internships listings`);
  console.log(`     ws://localhost:${PORT}/  – Whiteboard real-time socket\n`);
});
