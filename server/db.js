/**
 * db.js  –  Data-access layer
 *
 * Mongo-first: when MONGODB_URI is set and connection succeeds, all operations
 * use Mongoose models. Otherwise falls back to the legacy JSON flat-file store
 * so the dev server keeps working before Atlas is configured.
 *
 * All exported functions are ASYNC.
 */

require('dotenv').config();
const fs       = require('fs');
const path     = require('path');
const problems = require('./data/problems.json');

/* File paths — declared early so they're available in the MongoDB callback */
const DB_FILE  = path.join(__dirname, 'data', 'nexus-db.json');
const LC_FILE  = path.join(__dirname, 'data', 'lc-problems.json');

/* ═══════════════════════════════════════════════════
   MONGODB CONNECTION  (if MONGODB_URI is set in .env)
═══════════════════════════════════════════════════ */
if (process.env.MONGODB_URI) {
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS:          45000,
  })
    .then(async () => {
      console.log('[db] MongoDB connected ✓');
      // Auto-seed LcProblems collection if it is empty
      try {
        const LcProblem = require('./models/LcProblem');
        const count = await LcProblem.estimatedDocumentCount();
        if (count === 0) {
          console.log('[db] LcProblem collection empty — seeding from lc-problems.json…');
          const raw = JSON.parse(fs.readFileSync(LC_FILE, 'utf8'));
          const probs = raw.problems ?? [];
          if (probs.length > 0) {
            const ops = probs.map(p => ({
              updateOne: { filter: { title_slug: p.title_slug }, update: { $set: p }, upsert: true },
            }));
            await LcProblem.bulkWrite(ops, { ordered: false });
            console.log(`[db] Seeded ${probs.length} problems into MongoDB ✓`);
          }
        } else {
          console.log(`[db] LcProblem collection has ${count} problems ✓`);
        }
      } catch (e) {
        console.warn('[db] LcProblem seed failed:', e.message);
      }
    })
    .catch(err => console.warn('[db] MongoDB connection failed (using JSON fallback):', err.message));
} else {
  console.log('[db] MONGODB_URI not set — using JSON flat-file store');
}

/* ═══════════════════════════════════════════════════
   JSON FALLBACK STORE  (original implementation)
═══════════════════════════════════════════════════ */
const DEFAULT  = { users: [], user_solved_problems: [], _nextUserId: 1 };

// In-memory cache for the problem list – parsed once, reused forever.
let _lcCache = null;
function getLcCache() {
  if (_lcCache) return _lcCache;
  try {
    const f   = JSON.parse(fs.readFileSync(LC_FILE, 'utf8'));
    const arr = f.problems ?? [];
    _lcCache  = { problems: arr, bySlug: new Map(arr.map(p => [p.title_slug, p])), saved_at: f.saved_at };
  } catch {
    _lcCache = { problems: [], bySlug: new Map(), saved_at: null };
  }
  return _lcCache;
}

function jLoad()      { try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return { ...DEFAULT }; } }
function jSave(s)     { fs.writeFileSync(DB_FILE, JSON.stringify(s, null, 2), 'utf8'); }
let jStore = jLoad();

function jGetUser(nu)        { return jStore.users.find(u => u.nexus_username === nu) ?? null; }
function jUpsertUser(nu, lc) {
  let u = jGetUser(nu);
  if (!u) { u = { id: jStore._nextUserId++, nexus_username: nu, leetcode_username: lc ?? null, last_synced_at: null }; jStore.users.push(u); jSave(jStore); }
  else if (lc && u.leetcode_username !== lc) { u.leetcode_username = lc; jSave(jStore); }
  return u;
}
function jGetSolved(nu) { const u = jGetUser(nu); if (!u) return []; const slugs = jStore.user_solved_problems.filter(r => r.user_id === u.id).map(r => r.problem_slug); return [...new Set(slugs)]; }
function jInsert(nu, slug)   { const u = jUpsertUser(nu); if (!jStore.user_solved_problems.some(r => r.user_id === u.id && r.problem_slug === slug)) { jStore.user_solved_problems.push({ user_id: u.id, problem_slug: slug, solved_at: new Date().toISOString() }); jSave(jStore); } }
function jDelete(nu, slug)   { const u = jGetUser(nu); if (!u) return; jStore.user_solved_problems = jStore.user_solved_problems.filter(r => !(r.user_id === u.id && r.problem_slug === slug)); jSave(jStore); }
function jInsertMany(nu, slugs) {
  const u = jUpsertUser(nu);
  // Build a live set that tracks both pre-existing AND within-batch slugs to prevent duplicates
  const ex = new Set(jStore.user_solved_problems.filter(r => r.user_id === u.id).map(r => r.problem_slug));
  const now = new Date().toISOString(); let changed = false;
  for (const s of slugs) {
    if (!s) continue;
    if (!ex.has(s)) {
      jStore.user_solved_problems.push({ user_id: u.id, problem_slug: s, solved_at: now });
      ex.add(s); // update live set so duplicate slugs in the same batch are skipped
      changed = true;
    }
  }
  if (changed) jSave(jStore);
}

/* ═══════════════════════════════════════════════════
   MONGO HELPERS
═══════════════════════════════════════════════════ */
function mongoReady() {
  try { const m = require('mongoose'); return m.connection.readyState === 1; } catch { return false; }
}
function isObjectId(v) {
  try { const m = require('mongoose'); return m.Types.ObjectId.isValid(v) && String(new (require('mongoose').Types.ObjectId)(v)) === v; } catch { return false; }
}

let PracticeSolved = null;
function getSolvedModel() {
  if (!PracticeSolved) PracticeSolved = require('./models/PracticeSolved');
  return PracticeSolved;
}

/* ═══════════════════════════════════════════════════
   PUBLIC API  — all async
═══════════════════════════════════════════════════ */

async function getUser(id) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    const u = await User.findById(id).lean();
    if (!u) return null;
    return { id: u._id.toString(), nexus_username: id, leetcode_username: u.leetcodeUsername, last_synced_at: u.lcStats?.lastSyncedAt ?? null };
  }
  return jGetUser(id);
}

async function upsertUser(id, leetcodeUsername = null) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    if (leetcodeUsername) await User.findByIdAndUpdate(id, { leetcodeUsername });
    return await getUser(id);
  }
  return jUpsertUser(id, leetcodeUsername);
}

async function updateLcUsername(id, leetcodeUsername) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    await User.findByIdAndUpdate(id, { leetcodeUsername });
    return await getUser(id);
  }
  const u = jGetUser(id); if (u) { u.leetcode_username = leetcodeUsername; jSave(jStore); } return u;
}

async function updateLastSync(id) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    await User.findByIdAndUpdate(id, { 'lcStats.lastSyncedAt': new Date() });
    return;
  }
  const u = jGetUser(id); if (u) { u.last_synced_at = new Date().toISOString(); jSave(jStore); }
}

async function updateUserLcStats(id, { lcTotalSolved, lcEasySolved, lcMediumSolved, lcHardSolved }) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    await User.findByIdAndUpdate(id, { 'lcStats.totalSolved': lcTotalSolved, 'lcStats.easySolved': lcEasySolved, 'lcStats.mediumSolved': lcMediumSolved, 'lcStats.hardSolved': lcHardSolved });
    return;
  }
  const u = jGetUser(id); if (u) { Object.assign(u, { lc_total_solved: lcTotalSolved, lc_easy_solved: lcEasySolved, lc_medium_solved: lcMediumSolved, lc_hard_solved: lcHardSolved }); jSave(jStore); }
}

async function getSolvedSlugs(id) {
  if (mongoReady() && isObjectId(id)) {
    const rows = await getSolvedModel().find({ userId: id }, 'slug').lean();
    return rows.map(r => r.slug);
  }
  return jGetSolved(id);
}

async function insertSolved(id, slug) {
  if (mongoReady() && isObjectId(id)) {
    await getSolvedModel().updateOne({ userId: id, slug }, { $setOnInsert: { solvedAt: new Date() } }, { upsert: true });
    return;
  }
  jInsert(id, slug);
}

async function deleteSolved(id, slug) {
  if (mongoReady() && isObjectId(id)) {
    await getSolvedModel().deleteOne({ userId: id, slug });
    return;
  }
  jDelete(id, slug);
}

async function insertManySolved(id, slugs) {
  if (!slugs?.length) return;
  if (mongoReady() && isObjectId(id)) {
    const ops = slugs.map(slug => ({ updateOne: { filter: { userId: id, slug }, update: { $setOnInsert: { solvedAt: new Date() } }, upsert: true } }));
    await getSolvedModel().bulkWrite(ops, { ordered: false });
    return;
  }
  jInsertMany(id, slugs);
}

async function getLcProblems({ page = 1, limit = 50, category = '', difficulty = '', q = '' } = {}) {
  const pg  = Math.max(1, page);
  const lim = Math.min(Math.max(1, limit), 200);

  if (mongoReady()) {
    const LcProblem = require('./models/LcProblem');
    const filter = {};
    if (category   && category   !== 'all') filter.category   = category;
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (q)                                 filter.title       = { $regex: q, $options: 'i' };
    const total    = await LcProblem.countDocuments(filter);
    const skip     = (pg - 1) * lim;
    const problems = await LcProblem.find(filter, { _id: 0, __v: 0 }).sort({ id: 1 }).skip(skip).limit(lim).lean();
    return { problems, total, page: pg, limit: lim, hasMore: skip + problems.length < total };
  }

  // JSON fallback – filter in memory, return a slice
  const cache = getLcCache();
  let filtered = cache.problems;
  if (category   && category   !== 'all') filtered = filtered.filter(p => p.category   === category);
  if (difficulty && difficulty !== 'All') filtered = filtered.filter(p => p.difficulty === difficulty);
  if (q) { const ql = q.toLowerCase(); filtered = filtered.filter(p => p.title.toLowerCase().includes(ql)); }
  const total = filtered.length;
  const skip  = (pg - 1) * lim;
  const slice = filtered.slice(skip, skip + lim);
  return { problems: slice, total, page: pg, limit: lim, hasMore: skip + slice.length < total };
}

async function getLcCategories() {
  if (mongoReady()) {
    const LcProblem = require('./models/LcProblem');
    const [catAgg, diffAgg] = await Promise.all([
      LcProblem.aggregate([{ $group: { _id: '$category', total: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      LcProblem.aggregate([{ $group: { _id: '$difficulty', total: { $sum: 1 } } }]),
    ]);
    return {
      categories:  catAgg.map(r => ({ category: r._id, total: r.total })),
      byDifficulty: Object.fromEntries(diffAgg.map(r => [r._id, r.total])),
    };
  }
  const cache = getLcCache();
  const catMap = {}, diffMap = {};
  cache.problems.forEach(p => {
    catMap[p.category]   = (catMap[p.category]   || 0) + 1;
    diffMap[p.difficulty] = (diffMap[p.difficulty] || 0) + 1;
  });
  return {
    categories:   Object.entries(catMap).map(([category, total]) => ({ category, total })).sort((a, b) => a.category.localeCompare(b.category)),
    byDifficulty: diffMap,
  };
}

// Like getSolvedSlugs but also returns per-category and per-difficulty counts
async function getSolvedWithMeta(id) {
  const slugs = await getSolvedSlugs(id);
  const cache = getLcCache();
  const byCategory = {}, byDifficulty = {};
  slugs.forEach(slug => {
    const p = cache.bySlug.get(slug);
    if (!p) return;
    byCategory[p.category]    = (byCategory[p.category]    || 0) + 1;
    byDifficulty[p.difficulty] = (byDifficulty[p.difficulty] || 0) + 1;
  });
  return { slugs, byCategory, byDifficulty };
}

async function setLcProblems(newProblems) {
  _lcCache = null; // invalidate in-memory cache
  if (mongoReady()) {
    const LcProblem = require('./models/LcProblem');
    const ops = newProblems.map(p => ({
      updateOne: { filter: { title_slug: p.title_slug }, update: { $set: p }, upsert: true },
    }));
    await LcProblem.bulkWrite(ops, { ordered: false });
    console.log(`[db] setLcProblems: upserted ${newProblems.length} problems into MongoDB`);
    return;
  }
  fs.writeFileSync(LC_FILE, JSON.stringify({ saved_at: new Date().toISOString(), problems: newProblems }, null, 2), 'utf8');
}

function isValidSlug(slug) { return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug); } // accept all LC slugs
const VALID_SLUGS = new Set(problems.map(p => p.title_slug));

module.exports = {
  problems, VALID_SLUGS,
  getUser, upsertUser, updateLcUsername, updateLastSync, updateUserLcStats,
  getSolvedSlugs, insertSolved, deleteSolved, insertManySolved, isValidSlug,
  getLcProblems, setLcProblems, getLcCategories, getSolvedWithMeta,
};
