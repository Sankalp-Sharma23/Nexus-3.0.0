/**
 * server/routes/hackathons.js  –  Hackathons API
 *
 * Responsible ONLY for:
 *   - Reading hackathons from MongoDB (with JSON file fallback)
 *   - Serving the REST API endpoints
 *
 * All scraping / fetching / normalisation lives in:
 *   server/scraper/ScraperForHackathons.js  →  scrapeHackathons()
 *
 * Endpoints:
 *   GET  /api/hackathons          → paginated, filtered list
 *   GET  /api/hackathons/filters  → available categories / sources / statuses
 *   GET  /api/hackathons/stats    → per-source counts + storage mode
 *   POST /api/hackathons/refresh  → trigger a fresh scrape right now
 */

'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const { scrapeHackathons } = require('../scraper/ScraperForHackathons');

const router     = express.Router();
const CACHE_FILE = path.join(__dirname, '..', 'data', 'hackathons-cache.json');

/* Hackathons are considered "fresh" for 3 hours */
const SCRAPE_TTL_MS    = 3 * 60 * 60 * 1000;
const SCRAPE_MIN_HACKS = 5;

/* ─────────────────────────────────────────────────────────────────────────
   MONGO HELPERS
───────────────────────────────────────────────────────────────────────── */
const { mongoReady } = require('../db');
function getModel() { return require('../models/Hackathon'); }

/* ─────────────────────────────────────────────────────────────────────────
   STORAGE  –  MongoDB (primary) with JSON-file fallback
───────────────────────────────────────────────────────────────────────── */

async function saveToMongo(hacks) {
  if (!mongoReady() || !hacks.length) return;
  const Hackathon = getModel();
  const now = new Date();
  const ops = hacks.map(h => ({
    updateOne: {
      filter: { uid: h.uid },
      update: { $set: { ...h, scrapedAt: now } },
      upsert: true,
    },
  }));
  const result = await Hackathon.bulkWrite(ops, { ordered: false });
  console.log(`[hack] MongoDB upserted: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
}

function saveToFile(hacks) {
  try {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ fetchedAt: new Date().toISOString(), hacks }, null, 2),
      'utf8'
    );
  } catch (e) {
    console.warn('[hack] Could not write file cache:', e.message);
  }
}

function loadFromFile() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const age = Date.now() - new Date(raw.fetchedAt).getTime();
    if (age < SCRAPE_TTL_MS) {
      console.log(`[hack] file cache hit (${raw.hacks.length} hacks, age ${Math.round(age / 60000)}m)`);
      return raw.hacks;
    }
  } catch (_) { /* miss */ }
  return [];
}

let _memCache = { hacks: [], fetchedAt: 0 };

/* ─────────────────────────────────────────────────────────────────────────
   MAIN DATA LOADER
───────────────────────────────────────────────────────────────────────── */

async function getHackathons(forceRefresh = false) {
  /* 1. In-memory hit */
  if (!forceRefresh && _memCache.hacks.length >= SCRAPE_MIN_HACKS
      && (Date.now() - _memCache.fetchedAt) < SCRAPE_TTL_MS) {
    return _memCache.hacks;
  }

  /* 2. MongoDB read */
  if (mongoReady()) {
    try {
      const Hackathon = getModel();
      const recent = await Hackathon
        .findOne({})
        .sort({ scrapedAt: -1 })
        .select('scrapedAt')
        .lean();

      const age = recent ? Date.now() - new Date(recent.scrapedAt).getTime() : Infinity;
      const count = await Hackathon.countDocuments();

      if (!forceRefresh && count >= SCRAPE_MIN_HACKS && age < SCRAPE_TTL_MS) {
        const hacks = await Hackathon.find({}).sort({ status: 1, startDate: 1 }).lean();
        console.log(`[hack] MongoDB read → ${hacks.length} hackathons`);
        _memCache = { hacks, fetchedAt: Date.now() };
        return hacks;
      }

      /* Stale or empty – scrape then upsert */
      console.log(`[hack] DB stale (age ${Math.round(age / 60000)}m, count ${count}) – re-scraping…`);
      const fresh = await scrapeHackathons();
      if (fresh.length) {
        await saveToMongo(fresh);
        saveToFile(fresh);
        _memCache = { hacks: fresh, fetchedAt: Date.now() };
        return fresh;
      }
    } catch (e) {
      console.error('[hack] MongoDB error:', e.message);
    }
  }

  /* 3. JSON file fallback */
  const fromFile = loadFromFile();
  if (fromFile.length) {
    _memCache = { hacks: fromFile, fetchedAt: Date.now() };
    return fromFile;
  }

  /* 4. Must scrape */
  const fresh = await scrapeHackathons();
  saveToFile(fresh);
  _memCache = { hacks: fresh, fetchedAt: Date.now() };
  return fresh;
}

/* ─────────────────────────────────────────────────────────────────────────
   ROUTES
───────────────────────────────────────────────────────────────────────── */

/** GET /api/hackathons */
router.get('/', async (req, res) => {
  try {
    const {
      page     = '1',
      limit    = '20',
      q        = '',
      status   = '',       // live | upcoming | ended
      category = '',       // ai | web3 | hardware | climate | data | general
      mode     = '',       // Online | In-Person | Hybrid
      source   = '',       // devpost | mlh | …
      featured = '',       // 'true' | ''
      location = '',       // free-text location search
    } = req.query;

    let hacks = await getHackathons();

    /* keyword search */
    if (q.trim()) {
      const lq = q.toLowerCase();
      hacks = hacks.filter(h =>
        (h.title       || '').toLowerCase().includes(lq) ||
        (h.organizer   || '').toLowerCase().includes(lq) ||
        (h.description || '').toLowerCase().includes(lq) ||
        (h.tags || []).some(t => t.toLowerCase().includes(lq))
      );
    }

    /* filters */
    if (status)   hacks = hacks.filter(h => h.status   === status);
    if (category) hacks = hacks.filter(h => (h.category || '').toLowerCase() === category.toLowerCase());
    if (mode)     hacks = hacks.filter(h => (h.mode     || '').toLowerCase() === mode.toLowerCase());
    if (source)   hacks = hacks.filter(h => h.source === source);
    if (featured === 'true') hacks = hacks.filter(h => h.featured);
    /* location free-text search – also matches Online/Remote when query is blank */
    if (location.trim()) {
      const ll = location.toLowerCase().trim();
      hacks = hacks.filter(h => (h.location || '').toLowerCase().includes(ll));
    }

    const total = hacks.length;
    const pg    = Math.max(1, parseInt(page, 10));
    const lim   = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const slice = hacks.slice((pg - 1) * lim, pg * lim);

    res.json({ hackathons: slice, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    console.error('[hack] GET / error:', e.message);
    res.status(500).json({ error: 'Failed to load hackathons' });
  }
});

/** GET /api/hackathons/filters */
router.get('/filters', async (req, res) => {
  try {
    const hacks = await getHackathons();

    const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();

    const statuses   = uniq(hacks.map(h => h.status));
    const categories = uniq(hacks.map(h => h.category));
    const modes      = uniq(hacks.map(h => h.mode));
    const sources    = uniq(hacks.map(h => h.source));

    /* top tags */
    const tagCount = {};
    for (const h of hacks) {
      for (const t of (h.tags || [])) tagCount[t] = (tagCount[t] || 0) + 1;
    }
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([t]) => t);

    res.json({ statuses, categories, modes, sources, topTags });
  } catch (e) {
    console.error('[hack] GET /filters error:', e.message);
    res.status(500).json({ error: 'Failed to load filters' });
  }
});

/** GET /api/hackathons/stats */
router.get('/stats', async (req, res) => {
  try {
    const hacks = await getHackathons();

    const bySrc = {};
    const byCat = {};
    const byStatus = {};

    for (const h of hacks) {
      bySrc[h.source || 'unknown'] = (bySrc[h.source || 'unknown'] || 0) + 1;
      byCat[h.category || 'general'] = (byCat[h.category || 'general'] || 0) + 1;
      byStatus[h.status || 'upcoming'] = (byStatus[h.status || 'upcoming'] || 0) + 1;
    }

    res.json({
      total:     hacks.length,
      live:      byStatus.live     || 0,
      upcoming:  byStatus.upcoming || 0,
      ended:     byStatus.ended    || 0,
      bySource:  bySrc,
      byCategory: byCat,
      storage:   mongoReady() ? 'mongodb' : 'file',
      cachedAt:  _memCache.fetchedAt ? new Date(_memCache.fetchedAt).toISOString() : null,
    });
  } catch (e) {
    console.error('[hack] GET /stats error:', e.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

/** POST /api/hackathons/refresh */
router.post('/refresh', async (req, res) => {
  try {
    _memCache = { hacks: [], fetchedAt: 0 };
    const hacks = await getHackathons(true);
    res.json({ ok: true, count: hacks.length, message: `Scraped ${hacks.length} hackathons` });
  } catch (e) {
    console.error('[hack] POST /refresh error:', e.message);
    res.status(500).json({ error: 'Refresh failed', detail: e.message });
  }
});

module.exports = router;
