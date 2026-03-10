/**
 * routes/practice.js  –  Practice Hub API  (JSON-store edition)
 *
 * Problem list strategy:
 *   The 3 800+ LeetCode problems are stored in nexus-db.json (lc_problems key).
 *   GET /api/practice/lc-problems  → serves that file directly (no LeetCode call).
 *   POST /api/practice/problems/refresh → manually re-fetches from LeetCode and
 *                                         overwrites the file (run when needed).
 *
 * Solved-slug strategy:
 *   Only the user's accepted submissions are ever fetched from LeetCode.
 *   POST /api/practice/sync        → alfa-leetcode-api → LC GraphQL fallback
 *   POST /api/practice/full-sync   → LEETCODE_SESSION cookie (all solved)
 *   POST /api/practice/paste-sync  → paste slug array from browser console
 *
 * Other endpoints:
 *   GET  /api/practice/problems              → curated 150, kept for compat
 *   POST /api/practice/user                  → upsert user, return user row
 *   GET  /api/practice/solved/:username      → solved slugs for a Nexus user
 *   POST /api/practice/mark                  → manually toggle solved/unsolved
 *   PUT  /api/practice/lc-username           → update linked LeetCode username
 *   GET  /api/practice/lc-account-stats/:u   → per-difficulty totals from LC
 */

const express = require('express');
const fetch   = require('node-fetch');
const db      = require('../db');

/* ── LeetCode problem-list  (stored in nexus-db.json) ────────────────────── */
// Problems live in the db under lc_problems.  No separate cache file.
// To refresh, call POST /api/practice/problems/refresh.

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

// ── GET /api/practice/lc-problems  (paginated, server-filtered) ───────────── //
// Query params: page, limit (max 200), category, difficulty, q (search)

router.get('/lc-problems', async (req, res) => {
  const page       = Math.max(1, parseInt(req.query.page)       || 1);
  const limit      = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const category   = req.query.category   || '';
  const difficulty = req.query.difficulty || '';
  const q          = (req.query.q || '').trim();

  const result = await db.getLcProblems({ page, limit, category, difficulty, q });
  return res.json({ ...result, source: 'db' });
});

// ── GET /api/practice/lc-categories  (lightweight stats for sidebar) ─────── //

router.get('/lc-categories', async (_req, res) => {
  const data = await db.getLcCategories();
  res.json(data);
});

// ── POST /api/practice/problems/refresh  (manual re-seed from LeetCode) ───── //

router.post('/problems/refresh', async (_req, res) => {
  try {
    const problems = await fetchAllLcProblems();
    await db.setLcProblems(problems);
    return res.json({ ok: true, total: problems.length, saved_at: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/practice/user ──────────────────────────────────────────────── //
// Body: { nexusUsername, leetcodeUsername? }

router.post('/user', async (req, res) => {
  const { nexusUsername, leetcodeUsername = null } = req.body;
  if (!nexusUsername) return res.status(400).json({ error: 'nexusUsername required' });

  const user = await db.upsertUser(nexusUsername, leetcodeUsername);
  res.json({ user });
});

// ── GET /api/practice/solved/:nexusUsername ─────────────────────────── //

router.get('/solved/:nexusUsername', async (req, res) => {
  const { nexusUsername } = req.params;
  const user = await db.getUser(nexusUsername);
  if (!user) return res.json({ solvedSlugs: [], solvedByCategory: {}, solvedByDifficulty: {}, user: null });

  const { slugs, byCategory, byDifficulty } = await db.getSolvedWithMeta(nexusUsername);
  res.json({ user, solvedSlugs: slugs, solvedByCategory: byCategory, solvedByDifficulty: byDifficulty });
});

// ── PUT /api/practice/lc-username ───────────────────────────────────────── //
// Body: { nexusUsername, leetcodeUsername }

router.put('/lc-username', async (req, res) => {
  const { nexusUsername, leetcodeUsername } = req.body;
  if (!nexusUsername || !leetcodeUsername)
    return res.status(400).json({ error: 'nexusUsername and leetcodeUsername required' });

  await db.upsertUser(nexusUsername);
  const user = await db.updateLcUsername(nexusUsername, leetcodeUsername);
  res.json({ user });
});

// ── POST /api/practice/mark ──────────────────────────────────────────────── //
// Body: { nexusUsername, slug, solved: boolean }

router.post('/mark', async (req, res) => {
  const { nexusUsername, slug, solved } = req.body;
  if (!nexusUsername || !slug) return res.status(400).json({ error: 'nexusUsername and slug required' });

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    return res.status(400).json({ error: 'Invalid problem slug format' });

  await db.upsertUser(nexusUsername);
  if (solved) {
    await db.insertSolved(nexusUsername, slug);
  } else {
    await db.deleteSolved(nexusUsername, slug);
  }

  const { slugs, byCategory, byDifficulty } = await db.getSolvedWithMeta(nexusUsername);
  res.json({ solvedSlugs: slugs, solvedByCategory: byCategory, solvedByDifficulty: byDifficulty });
});

// ── POST /api/practice/full-sync ─────────────────────────────────────────── //
// Body: { nexusUsername, sessionCookie }
//
// Uses the user's LEETCODE_SESSION cookie to call the authenticated
// GET /api/problems/all/ endpoint which returns every problem with its
// acceptance status – the only reliable way to get all solved slugs.

router.post('/full-sync', async (req, res) => {
  const { nexusUsername, sessionCookie } = req.body;
  if (!nexusUsername || !sessionCookie)
    return res.status(400).json({ error: 'nexusUsername and sessionCookie required' });

  try {
    const r = await fetch('https://leetcode.com/api/problems/all/', {
      headers: {
        'Cookie':     `LEETCODE_SESSION=${sessionCookie.trim()}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer':    'https://leetcode.com/problemset/',
      },
    });
    if (!r.ok) throw new Error(`LeetCode responded ${r.status} — session may be invalid`);

    const data = await r.json();
    if (!data?.stat_status_pairs) throw new Error('Unexpected response shape from leetcode.com');

    // Extract all slugs with status "ac" (accepted / solved)
    const solvedSlugs = data.stat_status_pairs
      .filter(p => p.status === 'ac')
      .map(p => p.stat?.question__title_slug)
      .filter(Boolean);

    await db.upsertUser(nexusUsername);
    await db.insertManySolved(nexusUsername, solvedSlugs);
    await db.updateLastSync(nexusUsername);

    const allSolved = await db.getSolvedSlugs(nexusUsername);
    return res.json({
      solvedSlugs:   allSolved,
      importedTotal: solvedSlugs.length,
      storedTotal:   allSolved.length,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ── POST /api/practice/paste-sync ───────────────────────────────────────── //
// Body: { nexusUsername, slugs: string[] }
// Accepts a raw array of title slugs (e.g. from a browser console script)
// and marks them all as solved. No auth or cookie needed — the user
// generates the list themselves on leetcode.com and pastes the JSON output.

router.post('/paste-sync', async (req, res) => {
  const { nexusUsername, slugs } = req.body;
  if (!nexusUsername || !Array.isArray(slugs))
    return res.status(400).json({ error: 'nexusUsername and slugs[] required' });

  const clean = slugs.map(s => String(s).trim().toLowerCase()).filter(s => /^[a-z0-9-]+$/.test(s));
  if (clean.length === 0) return res.status(400).json({ error: 'No valid slugs provided' });

  await db.upsertUser(nexusUsername);
  await db.insertManySolved(nexusUsername, clean);
  await db.updateLastSync(nexusUsername);

  const allSolved = await db.getSolvedSlugs(nexusUsername);
  return res.json({ solvedSlugs: allSolved, importedTotal: clean.length, storedTotal: allSolved.length });
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
  await db.upsertUser(nexusUsername, leetcodeUsername);
  await db.updateLcUsername(nexusUsername, leetcodeUsername);

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
  await db.insertManySolved(nexusUsername, newSlugs);
  await db.updateLastSync(nexusUsername);

  // ── Fetch real LC account stats (total solved by difficulty) ─────────── //
  let lcAccountStats = null;
  try {
    const statsRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer':      'https://leetcode.com',
        'User-Agent':   'Mozilla/5.0',
      },
      body: JSON.stringify({
        query: `query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum { difficulty count }
            }
          }
        }`,
        variables: { username: leetcodeUsername },
      }),
    });
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const acNums = statsData?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];
      const map = {};
      acNums.forEach(({ difficulty, count }) => { map[difficulty] = count; });
      lcAccountStats = {
        total:  map.All    ?? 0,
        easy:   map.Easy   ?? 0,
        medium: map.Medium ?? 0,
        hard:   map.Hard   ?? 0,
      };
      // Persist on the user row too
      await db.updateUserLcStats(nexusUsername, {
        lcTotalSolved:  lcAccountStats.total,
        lcEasySolved:   lcAccountStats.easy,
        lcMediumSolved: lcAccountStats.medium,
        lcHardSolved:   lcAccountStats.hard,
      });
    }
  } catch (_) { /* non-fatal */ }

  // ── Return complete solved list from store ───────────────────────────── //
  const allSolved = await db.getSolvedSlugs(nexusUsername);
  const user      = await db.getUser(nexusUsername);

  res.json({
    solvedSlugs:     allSolved,
    newThisSync:     newSlugs.length,
    newSlugsArray:   newSlugs,
    source,
    user,
    lcAccountStats,  // { total, easy, medium, hard } straight from LeetCode
  });
});

// ── GET /api/practice/lc-account-stats/:leetcodeUsername ────────────────── //
// Fetches the user's overall LeetCode solved-problem counts from the public
// GraphQL API (no auth needed). Returns { total, easy, medium, hard }.

router.get('/lc-account-stats/:leetcodeUsername', async (req, res) => {
  const { leetcodeUsername } = req.params;
  if (!leetcodeUsername) return res.status(400).json({ error: 'leetcodeUsername required' });
  try {
    const r = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer':      'https://leetcode.com',
        'User-Agent':   'Mozilla/5.0',
      },
      body: JSON.stringify({
        query: `query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum { difficulty count }
            }
          }
        }`,
        variables: { username: leetcodeUsername },
      }),
    });
    if (!r.ok) throw new Error(`LC API ${r.status}`);
    const data = await r.json();
    const acNums = data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];
    const map = {};
    acNums.forEach(({ difficulty, count }) => { map[difficulty] = count; });
    return res.json({
      username: leetcodeUsername,
      total:  map.All    ?? 0,
      easy:   map.Easy   ?? 0,
      medium: map.Medium ?? 0,
      hard:   map.Hard   ?? 0,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
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
