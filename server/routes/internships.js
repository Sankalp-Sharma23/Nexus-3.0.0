/**
 * server/routes/internships.js
 *
 * REST endpoints for internship listings.
 *
 * GET  /api/internships          – paginated, filterable list
 * GET  /api/internships/filters  – available filter values
 * GET  /api/internships/stats    – counts by source / status
 * POST /api/internships/refresh  – force re-scrape
 */

'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const { scrapeInternships } = require('../scraper/ScraperForInternship');
const CACHE_FILE   = path.join(__dirname, '..', 'data', 'internships-cache.json');
const SCRAPE_TTL   = 3 * 60 * 60 * 1000;   // 3 hours
const MIN_ITEMS    = 5;

/* ── helpers ───────────────────────────────────────────────── */
const { mongoReady } = require('../db');

function writeCacheFile(items) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: Date.now(), items }, null, 2));
  } catch (e) {
    console.warn('[intern] cache write failed:', e.message);
  }
}

function readCacheFile() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const age = Date.now() - (raw.fetchedAt || 0);
    if (age < SCRAPE_TTL && Array.isArray(raw.items) && raw.items.length >= MIN_ITEMS) {
      console.log(`[intern] file cache hit – ${raw.items.length} items, age ${Math.round(age / 60000)}m`);
      return raw.items;
    }
  } catch { /* ignore */ }
  return null;
}

/* ── in-memory cache ───────────────────────────────────────── */
let _mem = { items: [], fetchedAt: 0 };

async function getInternships(force = false) {
  // 1. Memory cache
  if (!force && _mem.items.length >= MIN_ITEMS && Date.now() - _mem.fetchedAt < SCRAPE_TTL) {
    return _mem.items;
  }

  // 2. MongoDB
  if (!force && mongoReady()) {
    try {
      const Internship = require('../models/Internship');
      const count = await Internship.countDocuments();
      if (count >= MIN_ITEMS) {
        const age = Date.now() - _mem.fetchedAt;
        if (age < SCRAPE_TTL && _mem.items.length >= MIN_ITEMS) return _mem.items;
        // Load from DB
        const items = await Internship.find({}).sort({ stipendRaw: -1 }).lean();
        if (items.length >= MIN_ITEMS) {
          _mem = { items, fetchedAt: Date.now() };
          writeCacheFile(items);
          return items;
        }
      }
    } catch (e) {
      console.warn('[intern] DB read failed:', e.message);
    }
  }

  // 3. File cache
  if (!force) {
    const fromFile = readCacheFile();
    if (fromFile) { _mem = { items: fromFile, fetchedAt: Date.now() }; return fromFile; }
  }

  // 4. Scrape fresh
  console.log('[intern] scraping fresh data...');
  try {
    const fresh = await scrapeInternships();
    if (fresh.length >= MIN_ITEMS) {
      _mem = { items: fresh, fetchedAt: Date.now() };
      writeCacheFile(fresh);
      return fresh;
    }
    if (_mem.items.length) return _mem.items;
    return [];
  } catch (e) {
    console.error('[intern] scrape failed:', e.message);
    return _mem.items;
  }
}

/* ── GET /api/internships ──────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const all = await getInternships();

    const {
      q         = '',
      status    = '',
      category  = '',
      mode      = '',
      source    = '',
      featured  = '',
      location  = '',
      limit     = '500',
      offset    = '0',
    } = req.query;

    let items = all;

    if (q)        { const ql = q.toLowerCase(); items = items.filter(i => (i.title || '').toLowerCase().includes(ql) || (i.organizer || '').toLowerCase().includes(ql) || (i.tags || []).some(t => t.toLowerCase().includes(ql))); }
    if (status)   items = items.filter(i => i.status   === status);
    if (category) items = items.filter(i => i.category === category);
    if (mode)     items = items.filter(i => i.mode     === mode);
    if (source)   items = items.filter(i => i.source   === source);
    if (featured) items = items.filter(i => String(i.featured) === featured);
    if (location) { const ll = location.toLowerCase(); items = items.filter(i => (i.location || '').toLowerCase().includes(ll)); }

    const total   = items.length;
    const off     = Math.max(0, parseInt(offset, 10) || 0);
    const lim     = Math.min(1000, Math.max(1, parseInt(limit, 10) || 500));
    const paginated = items.slice(off, off + lim);

    res.json({ ok: true, total, count: paginated.length, offset: off, limit: lim, internships: paginated });
  } catch (e) {
    console.error('[intern] GET / error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ── GET /api/internships/filters ─────────────────────────── */
router.get('/filters', async (req, res) => {
  try {
    const all = await getInternships();
    const unique = key => [...new Set(all.map(i => i[key]).filter(Boolean))].sort();
    const topTags = Object.entries(
      all.flatMap(i => i.tags || []).reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t);
    res.json({ statuses: unique('status'), categories: unique('category'), modes: unique('mode'), sources: unique('source'), topTags });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ── GET /api/internships/stats ───────────────────────────── */
router.get('/stats', async (req, res) => {
  try {
    const all  = await getInternships();
    const bySource = {};
    all.forEach(i => { bySource[i.source] = (bySource[i.source] || 0) + 1; });
    res.json({
      ok:      true,
      total:   all.length,
      open:    all.filter(i => i.status === 'open').length,
      closed:  all.filter(i => i.status === 'closed').length,
      bySource,
      cachedAt: _mem.fetchedAt ? new Date(_mem.fetchedAt).toISOString() : null,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ── POST /api/internships/refresh ───────────────────────── */
router.post('/refresh', async (req, res) => {
  try {
    const fresh = await getInternships(true);
    res.json({ ok: true, count: fresh.length, message: `Scraped ${fresh.length} internships` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
