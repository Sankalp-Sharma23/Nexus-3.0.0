/**
 * server/routes/jobs.js  â€“  Placement Portal API
 *
 * Responsible ONLY for:
 *   - Reading jobs from MongoDB (with JSON file fallback)
 *   - Serving the REST API endpoints
 *
 * All scraping / fetching / normalisation lives in:
 *   server/scraper/scraper.js  â†’  scrapeAll()
 *
 * Endpoints:
 *   GET  /api/jobs           â†’ paginated, filtered, keyword-searched list
 *   GET  /api/jobs/filters   â†’ available types / levels / sources / topTags
 *   GET  /api/jobs/stats     â†’ per-source counts + storage mode
 *   POST /api/jobs/refresh   â†’ trigger a fresh scrape right now
 */

'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const { scrapeAll } = require('../scraper/ScraperForJob');

const router     = express.Router();
const CACHE_FILE = path.join(__dirname, '..', 'data', 'jobs-cache.json');

/* Jobs are considered "fresh" for 2 hours */
const SCRAPE_TTL_MS   = 2 * 60 * 60 * 1000;
/* Trigger a re-scrape if fewer than this many jobs are in the store */
const SCRAPE_MIN_JOBS = 50;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MONGO HELPER
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function mongoReady() {
  try { const m = require('mongoose'); return m.connection.readyState === 1; } catch { return false; }
}
function getJobModel() { return require('../models/Job'); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STORAGE  â€“  MongoDB (primary) with JSON-file fallback
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Upsert all jobs into MongoDB using bulkWrite so duplicates never accumulate */
async function saveToMongo(jobs) {
  if (!mongoReady() || !jobs.length) return;
  const Job = getJobModel();
  const now = new Date();
  const ops = jobs.map(j => ({
    updateOne: {
      filter: { uid: j.uid },
      update: { $set: { ...j, scrapedAt: now } },
      upsert: true,
    },
  }));
  const result = await Job.bulkWrite(ops, { ordered: false });
  console.log(`[jobs] MongoDB upserted: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
}

/** Save freshly scraped jobs to JSON fallback file */
function saveToFile(jobs) {
  try {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ fetchedAt: new Date().toISOString(), jobs }, null, 2),
      'utf8'
    );
  } catch (e) {
    console.warn('[jobs] Could not write file cache:', e.message);
  }
}

/** Load from JSON file â€“ returns [] if stale or missing */
function loadFromFile() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const age = Date.now() - new Date(raw.fetchedAt).getTime();
    if (age < SCRAPE_TTL_MS) {
      console.log(`[jobs] file cache hit (${raw.jobs.length} jobs, age ${Math.round(age / 60000)}m)`);
      return raw.jobs;
    }
  } catch (_) { /* miss */ }
  return [];
}

/* In-memory mirror so the hot-path never hits disk/DB */
let _memCache = { jobs: [], fetchedAt: 0 };

async function getJobs(forceRefresh = false) {
  /* 1. In-memory hit */
  if (!forceRefresh && _memCache.jobs.length >= SCRAPE_MIN_JOBS
      && (Date.now() - _memCache.fetchedAt) < SCRAPE_TTL_MS) {
    return _memCache.jobs;
  }

  /* 2. MongoDB read */
  if (mongoReady()) {
    try {
      const Job    = getJobModel();
      const recent = await Job
        .findOne({})
        .sort({ scrapedAt: -1 })
        .select('scrapedAt')
        .lean();
      const age = recent ? (Date.now() - new Date(recent.scrapedAt).getTime()) : Infinity;

      if (!forceRefresh && age < SCRAPE_TTL_MS) {
        const docs = await Job.find({}).sort({ postedAt: -1 }).lean();
        if (docs.length >= SCRAPE_MIN_JOBS) {
          const jobs = docs.map(d => ({ ...d, id: d.uid }));
          _memCache  = { jobs, fetchedAt: Date.now() };
          console.log(`[jobs] MongoDB read â†’ ${jobs.length} jobs`);
          return jobs;
        }
      }

      /* Stale or empty â€“ scrape then upsert */
      const fresh = await scrapeAll();
      await saveToMongo(fresh);
      saveToFile(fresh);
      const tagged = fresh.map(j => ({ ...j, id: j.uid }));
      _memCache = { jobs: tagged, fetchedAt: Date.now() };
      return tagged;
    } catch (err) {
      console.error('[jobs] MongoDB error, falling back to file:', err.message);
    }
  }

  /* 3. JSON file fallback */
  const cached = loadFromFile();
  if (!forceRefresh && cached.length >= SCRAPE_MIN_JOBS) {
    const tagged = cached.map(j => ({ ...j, id: j.uid ?? j.id }));
    _memCache = { jobs: tagged, fetchedAt: Date.now() };
    return tagged;
  }

  /* 4. Must scrape â€“ file mode only */
  const fresh  = await scrapeAll();
  saveToFile(fresh);
  const tagged = fresh.map(j => ({ ...j, id: j.uid }));
  _memCache = { jobs: tagged, fetchedAt: Date.now() };
  return tagged;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ROUTES
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/**
 * GET /api/jobs
 * Query params:
 *   q        â€“ full-text keyword (title | company | tags | category)
 *   type     â€“ Full-time | Part-time | Contract | Freelance | Internship
 *   level    â€“ Junior | Mid-level | Senior | Manager | Intern
 *   category â€“ free-text sub-string match
 *   source   â€“ remotive | jobicy | arbeitnow
 *   page     â€“ default 1
 *   limit    â€“ default 20, max 50
 *
 *   Multi-select: pass comma-separated values, e.g. types=Full-time,Contract
 *   New params:  remote=true  |  hasSalary=true  |  datePosted=7 (days)
 */
/* â”€â”€ Tech-relevance filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Always applied. A job passes if its TITLE contains a tech keyword, and
   does NOT contain a non-tech title keyword.
   Category is used as a secondary signal only when the title passes.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TECH_KEYWORDS = [
  // Languages & runtimes
  'javascript','typescript','python','java','kotlin','swift','golang',' go ',
  'rust','ruby','php','scala','c++','c#','.net','elixir','dart','flutter',
  // Web / frontend / design
  'react','vue','angular','svelte','html','css','webpack','vite',
  'frontend','front-end','front end','web dev','web developer',
  'ui developer','ux developer','ui designer','ux designer','ui/ux',
  'product designer','interaction design','visual designer','motion design',
  'figma','sketch',
  // Backend
  'backend','back-end','back end','django','flask','spring boot','rails',
  'rest api','graphql','grpc','microservice','serverless',
  // Cloud & DevOps & Infra
  'cloud','aws','azure','gcp','devops','devsecops','kubernetes','docker',
  'terraform','ansible','ci/cd','site reliability','sre','platform engineer',
  'infrastructure','sysadmin','systems admin','network admin',
  // Data / ML / AI
  'data science','data scientist','data engineer','data analyst',
  'machine learning','deep learning','artificial intelligence',
  'nlp','llm','generative ai','computer vision','mlops',
  'analytics engineer','business intelligence','etl','spark','kafka',
  // Security
  'security engineer','cyber','penetration test','pentest','appsec',
  'infosec','devsecops','vulnerability',
  // General tech roles â€” broad but filtered by NON_TECH_TITLE_WORDS above
  'software','engineer','developer','programmer','architect',
  'qa engineer','quality assurance','sdet','test automation',
  'embedded','firmware','iot','blockchain','smart contract','web3',
  'android','ios','mobile dev','game dev','unity','unreal',
  'it support','it manager','database admin','dba','helpdesk','tech support',
  'full stack','fullstack','full-stack','product manager','product owner',
  'technical program','engineering manager','tech lead','scrum master',
  'robotics','fpga','hardware engineer','computer science',
];

// If ANY of these appear in the job title â†’ reject regardless of category
const NON_TECH_TITLE_WORDS = [
  // Medical / clinical
  'nurse','nursing','physician','surgeon','surgery','doctor','clinical',
  'pharmacist','pharmacy','therapist','therapy','counselor','counselling',
  'dentist','dental','orthodont','optometrist','ophthalmolog',
  'veterinarian','vet tech','radiolog','patholog','anesthesiolog',
  'cardiolog','neurolog','oncolog','urolog','gynecolog','gastroenterolog',
  'dermatolog','orthopedic','pediatrician','psychiatrist','psycholog',
  'audiolog','chiropractor','podiatrist','phlebotomist','paramedic',
  'emt','emergency medical','medical assistant','patient care',
  'home health','hospice','caregiver','care aide','healthcare aide',
  // Food & hospitality
  'chef','cook','culinary','baker','barista','bartender','waiter','waitress',
  'dishwasher','food service','restaurant','hotel','hospitality',
  // Facilities / trades
  'housekeeper','custodian','janitor','cleaner','janitorial','laundry',
  'plumber','electrician','carpenter','welder','mason','hvac','roofer',
  // Transport & logistics
  'driver','trucker','truck driver','delivery driver','courier','chauffeur',
  'warehouse','picker','packer','forklift','stocker','logistics coordinator',
  // Automotive
  'auto technician','automotive technician','auto mechanic','auto body',
  // Education (non-tech)
  'teacher','professor','librarian','tutor','childcare','nanny','caregiver',
  // Finance (non-tech)
  'cashier','bank teller','loan officer','insurance agent','real estate agent',
  // Personal services
  'hair stylist','cosmetologist','esthetician','nail technician','barber',
  // Security / law
  'security guard','patrol officer','law enforcement',
];

function isTechJob(job) {
  const title = (job.title || '').toLowerCase();
  // 1. Reject if title contains any non-tech / medical / trades keyword
  if (NON_TECH_TITLE_WORDS.some(w => title.includes(w))) return false;
  // 2. Title MUST contain at least one tech keyword â€” category alone is not enough
  //    (The Muse tags healthcare company jobs under tech categories, so we cannot
  //     trust category as the sole signal)
  return TECH_KEYWORDS.some(kw => title.includes(kw));
}

router.get('/', async (req, res) => {
  try {
    let jobs = await getJobs();

    // Always limit to tech-relevant roles
    jobs = jobs.filter(isTechJob);

    const {
      q = '', types = '', levels = '', sources = '',
      category = '', page = '1', limit = '20',
      remote = '', hasSalary = '', datePosted = '',
      // legacy single-value params kept for backward compat
      type = '', level = '', source = '',
    } = req.query;

    // Build arrays â€“ support both comma-sep multi and legacy single
    const typeArr   = [...(types  ? types.split(',')   : []), ...(type   ? [type]   : [])].filter(Boolean);
    const levelArr  = [...(levels ? levels.split(',')  : []), ...(level  ? [level]  : [])].filter(Boolean);
    const sourceArr = [...(sources? sources.split(',') : []), ...(source ? [source] : [])].filter(Boolean);

    if (q.trim()) {
      const kw = q.trim().toLowerCase();
      jobs = jobs.filter(j =>
        (j.title   && j.title.toLowerCase().includes(kw))   ||
        (j.company && j.company.toLowerCase().includes(kw)) ||
        (typeof j.category === 'string' && j.category.toLowerCase().includes(kw)) ||
        (Array.isArray(j.tags) && j.tags.some(t => typeof t === 'string' && t.toLowerCase().includes(kw)))
      );
    }
    if (typeArr.length)   { const ta = typeArr.map(t => t.toLowerCase());  jobs = jobs.filter(j => ta.includes((j.type  || '').toLowerCase())); }
    if (levelArr.length)  { const la = levelArr.map(l => l.toLowerCase()); jobs = jobs.filter(j => la.includes((j.level || '').toLowerCase())); }
    if (sourceArr.length) jobs = jobs.filter(j => sourceArr.includes(j.source));
    if (category && category !== 'all') jobs = jobs.filter(j => j.category?.toLowerCase().includes(category.toLowerCase()));
    if (remote === 'true') {
      jobs = jobs.filter(j => {
        const loc = (j.location || '').toLowerCase();
        return loc.includes('remote') || loc.includes('anywhere') || loc.includes('worldwide') || loc === '';
      });
    }
    if (hasSalary === 'true') jobs = jobs.filter(j => j.salary);
    if (datePosted) {
      const days = parseInt(datePosted, 10);
      if (!isNaN(days)) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        jobs = jobs.filter(j => new Date(j.postedAt).getTime() >= cutoff);
      }
    }

    const pageN  = Math.max(1, parseInt(page, 10)  || 1);
    const limitN = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const total  = jobs.length;
    const pages  = Math.ceil(total / limitN) || 1;
    const slice  = jobs.slice((pageN - 1) * limitN, pageN * limitN);

    res.json({ jobs: slice, total, page: pageN, pages, limit: limitN });
  } catch (err) {
    console.error('[jobs] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch jobs', detail: err.message });
  }
});

/** GET /api/jobs/filters */
router.get('/filters', async (req, res) => {
  try {
    const jobs = (await getJobs()).filter(isTechJob);
    // Top 30 tags by frequency
    const tagFreq = {};
    for (const j of jobs) (j.tags ?? []).forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1; });
    const topTags = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([t]) => t);
    // Normalize type/level to canonical casing before deduplication
    const TYPE_NORM  = { 'full-time':'Full-time','fulltime':'Full-time','part-time':'Part-time','parttime':'Part-time','contract':'Contract','freelance':'Freelance','internship':'Internship' };
    const LEVEL_NORM = { 'senior':'Senior','mid-level':'Mid-level','mid level':'Mid-level','junior':'Junior','manager':'Manager','intern':'Intern','entry':'Junior','entry-level':'Junior','lead':'Senior' };
    const normType  = t => TYPE_NORM[t?.toLowerCase()] ?? (t ? (t[0].toUpperCase() + t.slice(1)) : null);
    const normLevel = l => LEVEL_NORM[l?.toLowerCase()] ?? (l ? (l[0].toUpperCase() + l.slice(1)) : null);
    res.json({
      types:      [...new Set(jobs.map(j => normType(j.type)).filter(Boolean))].sort(),
      levels:     [...new Set(jobs.map(j => normLevel(j.level)).filter(Boolean))].sort(),
      categories: [...new Set(jobs.map(j => typeof j.category === 'string' ? j.category : null).filter(Boolean))].sort(),
      sources:    [...new Set(jobs.map(j => j.source).filter(Boolean))].sort(),
      topTags,
      total:      jobs.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/jobs/stats  â€“  per-source counts + storage mode */
router.get('/stats', async (req, res) => {
  try {
    const jobs = await getJobs();
    const counts = {};
    for (const j of jobs) counts[j.source] = (counts[j.source] || 0) + 1;
    res.json({ total: jobs.length, bySource: counts, storage: mongoReady() ? 'mongodb' : 'file' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/jobs/refresh  â€“  force re-scrape */
router.post('/refresh', async (req, res) => {
  try {
    const jobs = await getJobs(true);
    const counts = {};
    for (const j of jobs) counts[j.source] = (counts[j.source] || 0) + 1;
    res.json({ message: 'Jobs refreshed', total: jobs.length, bySource: counts });
  } catch (err) {
    console.error('[jobs] refresh error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
