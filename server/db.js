/**
 * db.js  –  Data-access layer
 *
 * Mongo-first: when MONGODB_URI is set and connection succeeds, all operations
 * use Mongoose models. Otherwise falls back to the legacy JSON flat-file store
 * so the dev server keeps working before Atlas is configured.
 *
 * All exported functions are ASYNC.
 */

// Load environment variables from .env file
require('dotenv').config();
// File system module for reading/writing JSON files
const fs       = require('fs');
// Path utilities for file path operations
const path     = require('path');
// Pre-loaded problems data from JSON
const problems = require('./data/problems.json');

/* File paths — declared early so they're available in the MongoDB callback */
// Path to the JSON file storing user data and solved problems
const DB_FILE  = path.join(__dirname, 'data', 'nexus-db.json');
// Path to the JSON file storing LeetCode problems
const LC_FILE  = path.join(__dirname, 'data', 'lc-problems.json');

/* ═══════════════════════════════════════════════════
   MONGODB CONNECTION  (if MONGODB_URI is set in .env)
═══════════════════════════════════════════════════ */
// Connect to MongoDB if connection string is provided
if (process.env.MONGODB_URI) {
  const mongoose = require('mongoose');
  // Attempt to connect with timeout settings
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS:          45000,
  })
    .then(async () => {
      console.log('[db] MongoDB connected ✓');
      // Auto-seed LcProblems collection if it is empty
      try {
        const LcProblem = require('./models/LcProblem');
        // Check if LeetCode problems collection is empty
        const count = await LcProblem.estimatedDocumentCount();
        if (count === 0) {
          console.log('[db] LcProblem collection empty — seeding from lc-problems.json…');
          // Load problems from local JSON file
          const raw = JSON.parse(fs.readFileSync(LC_FILE, 'utf8'));
          const probs = raw.problems ?? [];
          if (probs.length > 0) {
            // Use bulk write to insert all problems efficiently
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
// Default empty database structure when DB file doesn't exist
const DEFAULT  = { users: [], user_solved_problems: [], _nextUserId: 1 };

// In-memory cache for the LeetCode problem list – parsed once, reused forever for performance
let _lcCache = null;
// Get cached LeetCode problems with lazy loading from JSON file
function getLcCache() {
  if (_lcCache) return _lcCache;
  try {
    const f   = JSON.parse(fs.readFileSync(LC_FILE, 'utf8'));
    const arr = f.problems ?? [];
    // Create Map for O(1) lookups by problem slug
    _lcCache  = { problems: arr, bySlug: new Map(arr.map(p => [p.title_slug, p])), saved_at: f.saved_at };
  } catch {
    _lcCache = { problems: [], bySlug: new Map(), saved_at: null };
  }
  return _lcCache;
}

// Load JSON database from file or return default structure if file doesn't exist
function jLoad()      { try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return { ...DEFAULT }; } }
// Save JSON database to file
function jSave(s)     { fs.writeFileSync(DB_FILE, JSON.stringify(s, null, 2), 'utf8'); }
// In-memory store of user and problem data
let jStore = jLoad();

// Get a user by nexus_username from JSON store
function jGetUser(nu)        { return jStore.users.find(u => u.nexus_username === nu) ?? null; }
// Insert or update a user in JSON store with optional LeetCode username
function jUpsertUser(nu, lc) {
  let u = jGetUser(nu);
  if (!u) { u = { id: jStore._nextUserId++, nexus_username: nu, leetcode_username: lc ?? null, last_synced_at: null }; jStore.users.push(u); jSave(jStore); }
  else if (lc && u.leetcode_username !== lc) { u.leetcode_username = lc; jSave(jStore); }
  return u;
}
// Get all solved problem slugs for a user
function jGetSolved(nu) { const u = jGetUser(nu); if (!u) return []; const slugs = jStore.user_solved_problems.filter(r => r.user_id === u.id).map(r => r.problem_slug); return [...new Set(slugs)]; }
// Mark a problem as solved for a user
function jInsert(nu, slug)   { const u = jUpsertUser(nu); if (!jStore.user_solved_problems.some(r => r.user_id === u.id && r.problem_slug === slug)) { jStore.user_solved_problems.push({ user_id: u.id, problem_slug: slug, solved_at: new Date().toISOString() }); jSave(jStore); } }
// Remove a solved problem entry for a user
function jDelete(nu, slug)   { const u = jGetUser(nu); if (!u) return; jStore.user_solved_problems = jStore.user_solved_problems.filter(r => !(r.user_id === u.id && r.problem_slug === slug)); jSave(jStore); }
// Insert multiple solved problems at once, avoiding duplicates
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
// Check if MongoDB connection is ready (readyState === 1 means connected)
function mongoReady() {
  try { const m = require('mongoose'); return m.connection.readyState === 1; } catch { return false; }
}
// Validate if a string is a valid MongoDB ObjectId
function isObjectId(v) {
  try { const m = require('mongoose'); return m.Types.ObjectId.isValid(v) && String(new (require('mongoose').Types.ObjectId)(v)) === v; } catch { return false; }
}

// Lazily load the PracticeSolved model (only when first needed)
let PracticeSolved = null;
function getSolvedModel() {
  if (!PracticeSolved) PracticeSolved = require('./models/PracticeSolved');
  return PracticeSolved;
}

/* ═══════════════════════════════════════════════════
   PUBLIC API  — all async
═══════════════════════════════════════════════════ */

// Get user by ID (supports both MongoDB ObjectId and fallback JSON store)
async function getUser(id) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    const u = await User.findById(id).lean();
    if (!u) return null;
    return { id: u._id.toString(), nexus_username: id, leetcode_username: u.leetcodeUsername, last_synced_at: u.lcStats?.lastSyncedAt ?? null };
  }
  return jGetUser(id);
}

// Create or update a user (ensures user exists in database)
async function upsertUser(id, leetcodeUsername = null) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    if (leetcodeUsername) await User.findByIdAndUpdate(id, { leetcodeUsername });
    return await getUser(id);
  }
  return jUpsertUser(id, leetcodeUsername);
}

// Update user's LeetCode username link
async function updateLcUsername(id, leetcodeUsername) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    await User.findByIdAndUpdate(id, { leetcodeUsername });
    return await getUser(id);
  }
  const u = jGetUser(id); if (u) { u.leetcode_username = leetcodeUsername; jSave(jStore); } return u;
}

// Record the last time user synced with LeetCode
async function updateLastSync(id) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    await User.findByIdAndUpdate(id, { 'lcStats.lastSyncedAt': new Date() });
    return;
  }
  const u = jGetUser(id); if (u) { u.last_synced_at = new Date().toISOString(); jSave(jStore); }
}

// Update user's LeetCode statistics (total, easy, medium, hard solved)
async function updateUserLcStats(id, { lcTotalSolved, lcEasySolved, lcMediumSolved, lcHardSolved }) {
  if (mongoReady() && isObjectId(id)) {
    const User = require('./models/User');
    await User.findByIdAndUpdate(id, { 'lcStats.totalSolved': lcTotalSolved, 'lcStats.easySolved': lcEasySolved, 'lcStats.mediumSolved': lcMediumSolved, 'lcStats.hardSolved': lcHardSolved });
    return;
  }
  const u = jGetUser(id); if (u) { Object.assign(u, { lc_total_solved: lcTotalSolved, lc_easy_solved: lcEasySolved, lc_medium_solved: lcMediumSolved, lc_hard_solved: lcHardSolved }); jSave(jStore); }
}

// Get all problem slugs that a user has solved
async function getSolvedSlugs(id) {
  if (mongoReady() && isObjectId(id)) {
    const rows = await getSolvedModel().find({ userId: id }, 'slug').lean();
    return rows.map(r => r.slug);
  }
  return jGetSolved(id);
}

// Mark a single problem as solved for a user
async function insertSolved(id, slug) {
  if (mongoReady() && isObjectId(id)) {
    await getSolvedModel().updateOne({ userId: id, slug }, { $setOnInsert: { solvedAt: new Date() } }, { upsert: true });
    return;
  }
  jInsert(id, slug);
}

// Remove a solved problem entry for a user (undo solve)
async function deleteSolved(id, slug) {
  if (mongoReady() && isObjectId(id)) {
    await getSolvedModel().deleteOne({ userId: id, slug });
    return;
  }
  jDelete(id, slug);
}

// Mark multiple problems as solved in one operation
async function insertManySolved(id, slugs) {
  if (!slugs?.length) return;
  if (mongoReady() && isObjectId(id)) {
    const ops = slugs.map(slug => ({ updateOne: { filter: { userId: id, slug }, update: { $setOnInsert: { solvedAt: new Date() } }, upsert: true } }));
    await getSolvedModel().bulkWrite(ops, { ordered: false });
    return;
  }
  jInsertMany(id, slugs);
}

// Get paginated LeetCode problems with filtering by category, difficulty, search, company
async function getLcProblems({ page = 1, limit = 50, category = '', difficulty = '', q = '', company = '' } = {}) {
  const pg  = Math.max(1, page);
  const lim = Math.min(Math.max(1, limit), 200);

  if (mongoReady()) {
    // MongoDB query with filters
    const LcProblem = require('./models/LcProblem');
    const filter = {};
    if (category   && category   !== 'all') filter.category   = category;
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (q)                                 filter.title       = { $regex: q, $options: 'i' };
    if (company)                            filter.companies  = company;
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
  if (company) filtered = filtered.filter(p => p.companies?.includes(company));
  const total = filtered.length;
  const skip  = (pg - 1) * lim;
  const slice = filtered.slice(skip, skip + lim);
  return { problems: slice, total, page: pg, limit: lim, hasMore: skip + slice.length < total };
}

// Get available categories and difficulty counts for LeetCode problems (with optional company filter)
async function getLcCategories(company = '') {
  if (mongoReady()) {
    // MongoDB aggregation for efficient counting
    const LcProblem = require('./models/LcProblem');
    const match = company ? { $match: { companies: company } } : { $match: {} };
    const [catAgg, diffAgg] = await Promise.all([
      LcProblem.aggregate([match, { $group: { _id: '$category', total: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      LcProblem.aggregate([match, { $group: { _id: '$difficulty', total: { $sum: 1 } } }]),
    ]);
    return {
      categories:  catAgg.map(r => ({ category: r._id, total: r.total })),
      byDifficulty: Object.fromEntries(diffAgg.map(r => [r._id, r.total])),
    };
  }
  // JSON fallback – count manually
  const cache = getLcCache();
  const catMap = {}, diffMap = {};
  cache.problems.forEach(p => {
    if (company && !p.companies?.includes(company)) return;
    catMap[p.category]   = (catMap[p.category]   || 0) + 1;
    diffMap[p.difficulty] = (diffMap[p.difficulty] || 0) + 1;
  });
  return {
    categories:   Object.entries(catMap).map(([category, total]) => ({ category, total })).sort((a, b) => a.category.localeCompare(b.category)),
    byDifficulty: diffMap,
  };
}

// Get solved problems for a user with breakdown by category and difficulty
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

// Update the entire LeetCode problems collection (typically from an external sync)
async function setLcProblems(newProblems) {
  // Invalidate cache so next read fetches fresh data
  _lcCache = null;
  if (mongoReady()) {
    const LcProblem = require('./models/LcProblem');
    const ops = newProblems.map(p => ({
      updateOne: { filter: { title_slug: p.title_slug }, update: { $set: p }, upsert: true },
    }));
    await LcProblem.bulkWrite(ops, { ordered: false });
    console.log(`[db] setLcProblems: upserted ${newProblems.length} problems into MongoDB`);
    return;
  }
  // Update JSON file for fallback store
  fs.writeFileSync(LC_FILE, JSON.stringify({ saved_at: new Date().toISOString(), problems: newProblems }, null, 2), 'utf8');
}

// Validate that a slug follows LeetCode naming convention
function isValidSlug(slug) { return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug); } // accept all LC slugs
// Set of all valid LeetCode problem slugs
const VALID_SLUGS = new Set(problems.map(p => p.title_slug));

// Export all public API functions and data structures
module.exports = {
  problems, // Pre-loaded problems data
  VALID_SLUGS, // Set of valid problem slugs for validation
  getUser, // Retrieve user by ID
  upsertUser, // Create or update user
  updateLcUsername, // Link user to LeetCode account
  updateLastSync, // Record sync timestamp
  updateUserLcStats, // Update stats from LeetCode
  getSolvedSlugs, // Get problems user has solved
  insertSolved, // Mark problem as solved
  deleteSolved, // Remove solved status
  insertManySolved, // Mark multiple problems as solved
  isValidSlug, // Validate slug format
  getLcProblems, // Get paginated problems with filters
  setLcProblems, // Bulk update problems collection
  getLcCategories, // Get available filters (categories, difficulties)
  getSolvedWithMeta, // Get user's solved problems with stats
};
