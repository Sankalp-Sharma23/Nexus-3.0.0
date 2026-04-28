/**
 * server/routes/winners.js  –  Past Winners Showcase API
 *
 * Endpoints:
 *   GET  /api/winners              → paginated list, filterable by category/year
 *   POST /api/winners/regenerate   → re-generate winners via Gemini (admin)
 */

'use strict';

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const fetch    = require('node-fetch');
const { mongoReady } = require('../db');

const router     = express.Router();
const CACHE_FILE = path.join(__dirname, '..', 'data', 'winners-cache.json');

/* ─────────────────────────────────────────────────────────
   MONGO HELPERS
───────────────────────────────────────────────────────── */
// mongoReady() is imported from ../db
function getModel() { return require('../models/PastWinner'); }

/* ─────────────────────────────────────────────────────────
   LOAD FROM FILE CACHE
───────────────────────────────────────────────────────── */
function loadFromFile() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    return raw.winners || [];
  } catch (_) { return []; }
}

/* ─────────────────────────────────────────────────────────
   GEMINI HELPER (for regeneration)
───────────────────────────────────────────────────────── */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } catch (_) { return null; }
}

const REGEN_PROMPT = `Generate 18 realistic past hackathon winning projects as a JSON array.
Each object must have: hackathonName, projectName, teamName, teamMembers (array of 2-4 names),
placement (e.g. "1st Place", "Best AI Track"), prize (e.g. "$5,000"), description (2-3 sentences),
techStack (3-6 items), projectUrl ("#"), year (2024 or 2025), category (ai/web3/hardware/climate/data/general).
Return ONLY a JSON array. No markdown fences.`;

/* ═════════════════════════════════════════════════════════
   GET /api/winners
   Query params: ?category=ai&year=2025&limit=12
═════════════════════════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const { category, year, limit = 18 } = req.query;
    const lim = Math.min(parseInt(limit) || 18, 50);

    /* Try MongoDB first */
    if (mongoReady()) {
      const PastWinner = getModel();
      const filter = { approved: true };
      if (category && category !== 'all') filter.category = category;
      if (year) filter.year = parseInt(year);

      const winners = await PastWinner.find(filter)
        .sort({ year: -1, placement: 1 })
        .limit(lim)
        .lean();

      if (winners.length) {
        return res.json({ winners, source: 'mongodb', count: winners.length });
      }
    }

    /* Fallback to file cache */
    let winners = loadFromFile();
    if (category && category !== 'all') {
      winners = winners.filter(w => w.category === category);
    }
    if (year) {
      winners = winners.filter(w => w.year === parseInt(year));
    }
    winners = winners.slice(0, lim);

    res.json({ winners, source: 'file', count: winners.length });
  } catch (e) {
    console.error('[winners] GET error:', e.message);
    res.status(500).json({ error: 'Failed to load winners' });
  }
});

/* ═════════════════════════════════════════════════════════
   POST /api/winners/regenerate
   Re-generate winners via Gemini and save
═════════════════════════════════════════════════════════ */
router.post('/regenerate', async (req, res) => {
  try {
    console.log('[winners] Regenerating via Gemini...');
    const raw = await callGemini(REGEN_PROMPT);

    if (!raw) {
      return res.status(503).json({ error: 'Gemini unavailable. Check GEMINI_API_KEY.' });
    }

    let winners;
    try {
      const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      winners = JSON.parse(clean);
    } catch (e) {
      return res.status(502).json({ error: 'Gemini returned invalid JSON', detail: e.message });
    }

    // Normalize
    winners = winners.map((w, i) => ({
      uid:            `winner-${(w.hackathonName || 'hack').replace(/\s+/g, '-').toLowerCase()}-${i}`,
      hackathonName:  w.hackathonName || 'Unknown',
      projectName:    w.projectName   || 'Untitled',
      teamName:       w.teamName      || 'Anonymous',
      teamMembers:    w.teamMembers   || [],
      placement:      w.placement     || '1st Place',
      prize:          w.prize         || null,
      description:    w.description   || '',
      techStack:      w.techStack     || [],
      projectUrl:     w.projectUrl    || '#',
      imageUrl:       null,
      year:           w.year          || 2025,
      category:       w.category      || 'general',
      approved:       true,
      source:         'gemini',
    }));

    // Save to file
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), winners }, null, 2), 'utf8');

    // Save to MongoDB
    if (mongoReady()) {
      const PastWinner = getModel();
      const ops = winners.map(w => ({
        updateOne: { filter: { uid: w.uid }, update: { $set: w }, upsert: true },
      }));
      await PastWinner.bulkWrite(ops, { ordered: false });
    }

    res.json({ message: 'Regenerated successfully', count: winners.length, winners });
  } catch (e) {
    console.error('[winners] Regenerate error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
