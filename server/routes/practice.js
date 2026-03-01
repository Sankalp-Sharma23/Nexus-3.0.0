/**
 * routes/practice.js  –  Practice Hub API  (JSON-store edition)
 *
 * Endpoints:
 *   GET  /api/practice/problems              → all 150 problems
 *   POST /api/practice/user                  → upsert user, return user row
 *   GET  /api/practice/solved/:username      → solved slugs for a Nexus user
 *   POST /api/practice/sync                  → fetch LC data, update store, return solved slugs
 *   POST /api/practice/mark                  → manually toggle a problem solved/unsolved
 *   PUT  /api/practice/lc-username           → update a user's LeetCode username
 */

const express = require('express');
const fetch   = require('node-fetch');
const fs      = require('fs');
const path    = require('path');
const db      = require('../db');

/* ── LeetCode problem-list cache ────────────────────────────────────────── */
const LC_CACHE_FILE = path.join(__dirname, '..', 'data', 'lc-problems-cache.json');
const CACHE_TTL_MS  = 24 * 60 * 60 * 1000; // 24 hours

async function fetchAllLcProblems() {
  const PAGE_SIZE = 100;
  const GQL_QUERY = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          acRate
          difficulty
          frontendQuestionId: questionFrontendId
          paidOnly: isPaidOnly
          title
          titleSlug
          topicTags { name slug }
        }
      }
    }
  `;

  const headers = {
    'Content-Type': 'application/json',
    'Referer':      'https://leetcode.com/problemset/',
    'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  // First page – also tells us the total count
  const firstRes = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: GQL_QUERY, variables: { categorySlug: '', skip: 0, limit: PAGE_SIZE, filters: {} } }),
  });
  if (!firstRes.ok) throw new Error(`LeetCode API ${firstRes.status}`);
  const firstData  = await firstRes.json();
  const psl        = firstData?.data?.problemsetQuestionList;
  const total      = psl?.total ?? 0;
  let   allQuestions = psl?.questions ?? [];

  console.log(`[lc-problems] total=${total}, fetching pages…`);

  // Fetch remaining pages in parallel (batches of 5 to avoid rate-limiting)
  const skips = [];
  for (let skip = PAGE_SIZE; skip < total; skip += PAGE_SIZE) skips.push(skip);

  const BATCH = 5;
  for (let i = 0; i < skips.length; i += BATCH) {
    const batch = skips.slice(i, i + BATCH);
    const pages = await Promise.all(batch.map(skip =>
      fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: GQL_QUERY, variables: { categorySlug: '', skip, limit: PAGE_SIZE, filters: {} } }),
      })
      .then(r => r.json())
      .then(d => d?.data?.problemsetQuestionList?.questions ?? [])
    ));
    pages.forEach(page => allQuestions = allQuestions.concat(page));
    console.log(`[lc-problems] fetched ${allQuestions.length}/${total}`);
  }

  return allQuestions.map(q => ({
    id:           parseInt(q.frontendQuestionId, 10) || 0,
    title:        q.title,
    title_slug:   q.titleSlug,
    difficulty:   q.difficulty,
    category:     q.topicTags?.[0]?.name ?? 'Uncategorized',
    tags:         (q.topicTags ?? []).map(t => t.name),
    paid_only:    q.paidOnly ?? false,
    ac_rate:      Math.round(q.acRate ?? 0),
    leetcode_url: `https://leetcode.com/problems/${q.titleSlug}/`,
  }));
}

const router = express.Router();

// ── GET /api/practice/problems  (curated 350, kept for backwards compat) ── //

router.get('/problems', (_req, res) => {
  res.json({ problems: db.problems });
});

// ── GET /api/practice/lc-problems  (all LC problems, 24h cache) ─────────── //

router.get('/lc-problems', async (_req, res) => {
  // Serve from cache when fresh
  try {
    const cached = JSON.parse(fs.readFileSync(LC_CACHE_FILE, 'utf8'));
    const age    = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      return res.json({ problems: cached.problems, source: 'cache', total: cached.problems.length });
    }
  } catch (_) { /* cache miss */ }

  // Fetch fresh from LeetCode
  try {
    const problems   = await fetchAllLcProblems();
    const cacheData  = { fetched_at: new Date().toISOString(), problems };
    fs.writeFileSync(LC_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
    return res.json({ problems, source: 'leetcode', total: problems.length });
  } catch (err) {
    console.error('[lc-problems] fetch failed, falling back to curated list:', err.message);
    return res.json({ problems: db.problems, source: 'fallback', total: db.problems.length });
  }
});

// ── POST /api/practice/user ──────────────────────────────────────────────── //
// Body: { nexusUsername, leetcodeUsername? }

router.post('/user', (req, res) => {
  const { nexusUsername, leetcodeUsername = null } = req.body;
  if (!nexusUsername) return res.status(400).json({ error: 'nexusUsername required' });

  const user = db.upsertUser(nexusUsername, leetcodeUsername);
  res.json({ user });
});

// ── GET /api/practice/solved/:nexusUsername ──────────────────────────────── //

router.get('/solved/:nexusUsername', (req, res) => {
  const { nexusUsername } = req.params;
  const user = db.getUser(nexusUsername);
  if (!user) return res.json({ solvedSlugs: [], user: null });

  res.json({ user, solvedSlugs: db.getSolvedSlugs(nexusUsername) });
});

// ── PUT /api/practice/lc-username ───────────────────────────────────────── //
// Body: { nexusUsername, leetcodeUsername }

router.put('/lc-username', (req, res) => {
  const { nexusUsername, leetcodeUsername } = req.body;
  if (!nexusUsername || !leetcodeUsername)
    return res.status(400).json({ error: 'nexusUsername and leetcodeUsername required' });

  db.upsertUser(nexusUsername);
  const user = db.updateLcUsername(nexusUsername, leetcodeUsername);
  res.json({ user });
});

// ── POST /api/practice/mark ──────────────────────────────────────────────── //
// Body: { nexusUsername, slug, solved: boolean }

router.post('/mark', (req, res) => {
  const { nexusUsername, slug, solved } = req.body;
  if (!nexusUsername || !slug) return res.status(400).json({ error: 'nexusUsername and slug required' });

  // Accept any valid-looking LeetCode slug (not limited to curated list)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    return res.status(400).json({ error: 'Invalid problem slug format' });

  db.upsertUser(nexusUsername);
  if (solved) {
    db.insertSolved(nexusUsername, slug);
  } else {
    db.deleteSolved(nexusUsername, slug);
  }

  res.json({ solvedSlugs: db.getSolvedSlugs(nexusUsername) });
});

// ── POST /api/practice/sync ──────────────────────────────────────────────── //
// Body: { nexusUsername, leetcodeUsername }
//
// Strategy (most-to-least data):
//   1. alfa-leetcode-api  (returns all AC submissions, no auth needed)
//   2. LeetCode GraphQL   (returns ~20 most recent AC submissions)
// Each sync is accumulative – we never delete previously synced slugs.

router.post('/sync', async (req, res) => {
  const { nexusUsername, leetcodeUsername } = req.body;
  if (!nexusUsername || !leetcodeUsername)
    return res.status(400).json({ error: 'nexusUsername and leetcodeUsername required' });

  // Ensure both usernames are stored
  db.upsertUser(nexusUsername, leetcodeUsername);
  db.updateLcUsername(nexusUsername, leetcodeUsername);

  let newSlugs = [];
  let source   = 'none';

  // ── Strategy 1: alfa-leetcode-api ─────────────────────────────────────── //
  try {
    const alfaRes = await fetch(
      `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(leetcodeUsername)}/acSubmission?limit=500`,
      { timeout: 8000 }
    );
    if (alfaRes.ok) {
      const alfaData = await alfaRes.json();
      // Response shape: { submission: [{ titleSlug, ... }] }
      const subs = alfaData?.submission ?? alfaData?.acSubmission ?? [];
      newSlugs = subs
        .map(s => s.titleSlug)
        .filter(Boolean);
      source = 'alfa-leetcode-api';
    }
  } catch (_) { /* fall through */ }

  // ── Strategy 2: LeetCode GraphQL fallback ─────────────────────────────── //
  if (newSlugs.length === 0) {
    try {
      const lcRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer':      'https://leetcode.com',
        },
        body: JSON.stringify({
          query: `
            query recentAcSubmissionList($username: String!, $limit: Int!) {
              recentAcSubmissionList(username: $username, limit: $limit) {
                id
                title
                titleSlug
                timestamp
              }
            }
          `,
          variables: { username: leetcodeUsername, limit: 50 },
        }),
        timeout: 10000,
      });
      if (lcRes.ok) {
        const lcData = await lcRes.json();
        const subs = lcData?.data?.recentAcSubmissionList ?? [];
        newSlugs = subs
          .map(s => s.titleSlug)
          .filter(Boolean);
        source = 'leetcode-graphql';
      }
    } catch (_) { /* fall through */ }
  }

  // ── Persist new solved slugs ─────────────────────────────────────────── //
  db.insertManySolved(nexusUsername, newSlugs);
  db.updateLastSync(nexusUsername);

  // ── Return complete solved list from store ───────────────────────────── //
  const allSolved = db.getSolvedSlugs(nexusUsername);
  const user      = db.getUser(nexusUsername);

  res.json({
    solvedSlugs:     allSolved,
    newThisSync:     newSlugs.length,
    newSlugsArray:   newSlugs,
    source,
    user,
  });
});

// ── GET /api/practice/streak/:leetcodeUsername ──────────────────────────── //
// Fetches current streak from alfa-leetcode-api. Falls back gracefully.

router.get('/streak/:leetcodeUsername', async (req, res) => {
  const { leetcodeUsername } = req.params;
  try {
    const r = await fetch(
      `https://alfa-leetcode-api.onrender.com/userProfile/${encodeURIComponent(leetcodeUsername)}`,
      { timeout: 7000 }
    );
    if (!r.ok) throw new Error('API error');
    const data = await r.json();
    // alfa-leetcode-api profile shape: { streak, totalSolved, ranking, … }
    const streak = data?.streak ?? data?.currentStreak ?? null;
    res.json({ streak, username: leetcodeUsername });
  } catch {
    res.json({ streak: null, username: leetcodeUsername });
  }
});

module.exports = router;
