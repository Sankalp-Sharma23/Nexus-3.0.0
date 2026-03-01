/**
 * db.js  –  Pure-JS JSON file store (no native deps)
 *
 * Replaces better-sqlite3 so the server runs on any machine
 * without needing Visual Studio Build Tools.
 *
 * Data is persisted to server/data/nexus-db.json.
 */

const fs       = require('fs');
const path     = require('path');
const problems = require('./data/problems.json');

const DB_FILE = path.join(__dirname, 'data', 'nexus-db.json');

// ── Default empty store ──────────────────────────────────────────────────── //
const DEFAULT = { users: [], user_solved_problems: [], _nextUserId: 1 };

function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { ...DEFAULT }; }
}
function save(store) {
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf8');
}

let store = load();

// ── Helpers ─────────────────────────────────────────────────────────────── //

function getUser(nexusUsername) {
  return store.users.find(u => u.nexus_username === nexusUsername) ?? null;
}

function upsertUser(nexusUsername, leetcodeUsername = null) {
  let user = getUser(nexusUsername);
  if (!user) {
    user = { id: store._nextUserId++, nexus_username: nexusUsername,
             leetcode_username: leetcodeUsername, last_synced_at: null };
    store.users.push(user);
    save(store);
  } else if (leetcodeUsername && user.leetcode_username !== leetcodeUsername) {
    user.leetcode_username = leetcodeUsername;
    save(store);
  }
  return user;
}

function updateLcUsername(nexusUsername, leetcodeUsername) {
  const user = getUser(nexusUsername);
  if (user) { user.leetcode_username = leetcodeUsername; save(store); }
  return user;
}

function updateLastSync(nexusUsername) {
  const user = getUser(nexusUsername);
  if (user) { user.last_synced_at = new Date().toISOString(); save(store); }
}

function updateUserLcStats(nexusUsername, { lcTotalSolved, lcEasySolved, lcMediumSolved, lcHardSolved }) {
  const user = getUser(nexusUsername);
  if (user) {
    user.lc_total_solved  = lcTotalSolved;
    user.lc_easy_solved   = lcEasySolved;
    user.lc_medium_solved = lcMediumSolved;
    user.lc_hard_solved   = lcHardSolved;
    save(store);
  }
}

function getSolvedSlugs(nexusUsername) {
  const user = getUser(nexusUsername);
  if (!user) return [];
  return store.user_solved_problems
    .filter(r => r.user_id === user.id)
    .map(r => r.problem_slug);
}

function insertSolved(nexusUsername, slug) {
  const user = upsertUser(nexusUsername);
  const exists = store.user_solved_problems.some(
    r => r.user_id === user.id && r.problem_slug === slug
  );
  if (!exists) {
    store.user_solved_problems.push({ user_id: user.id, problem_slug: slug,
                                       solved_at: new Date().toISOString() });
    save(store);
  }
}

function deleteSolved(nexusUsername, slug) {
  const user = getUser(nexusUsername);
  if (!user) return;
  store.user_solved_problems = store.user_solved_problems.filter(
    r => !(r.user_id === user.id && r.problem_slug === slug)
  );
  save(store);
}

function insertManySolved(nexusUsername, slugs) {
  const user = upsertUser(nexusUsername);
  const existing = new Set(
    store.user_solved_problems.filter(r => r.user_id === user.id).map(r => r.problem_slug)
  );
  const now = new Date().toISOString();
  let changed = false;
  for (const slug of slugs) {
    if (!existing.has(slug)) {
      store.user_solved_problems.push({ user_id: user.id, problem_slug: slug, solved_at: now });
      changed = true;
    }
  }
  if (changed) save(store);
}

const VALID_SLUGS = new Set(problems.map(p => p.title_slug));
function isValidSlug(slug) { return VALID_SLUGS.has(slug); }

module.exports = {
  problems, VALID_SLUGS,
  getUser, upsertUser, updateLcUsername, updateLastSync, updateUserLcStats,
  getSolvedSlugs, insertSolved, deleteSolved, insertManySolved, isValidSlug,
};

console.log('[db] JSON store ready →', DB_FILE);
