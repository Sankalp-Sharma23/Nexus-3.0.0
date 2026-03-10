/**
 * server/scraper/ScraperForHackathons.js
 *
 * Responsible ONLY for fetching hackathon data from external sources,
 * normalising it into a flat schema, and deduplicating.
 *
 * Exports:
 *   scrapeHackathons() → Promise<NormalisedHackathon[]>
 *
 * Sources  (all fail gracefully – errors logged and silently skipped):
 *   1. Devpost       https://devpost.com/api/hackathons        (JSON API)
 *   2. MLH           https://mlh.io/seasons/2026/events        (HTML scrape)
 *   3. HackerEarth   https://www.hackerearth.com/chrome-extension/events/  (JSON)
 *   4. Devfolio      https://api.devfolio.co/api/hackathons    (JSON API)
 *   5. Unstop        https://unstop.com/api/public/…           (JSON API – Indian)
 *   6. DoraHacks     https://dorahacks.io/api/hackathon/list/  (JSON API – Web3)
 *   7. Lablab.ai     https://lablab.ai/api/get-events          (JSON API – AI)
 */

'use strict';

const fetch   = require('node-fetch');
const cheerio = require('cheerio');

/* ─────────────────────────────────────────────────────────────────────────
   SHARED UTILITIES
───────────────────────────────────────────────────────────────────────── */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept':     'application/json, text/html, */*',
};

/** Slugify a string into a safe uid component */
function slug(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

/** Parse a prize string like "$50,000" or 50000 → { display, raw } */
function parsePrize(val) {
  if (!val && val !== 0) return { display: null, raw: 0 };
  // Strip any HTML tags (Devpost returns e.g. "$<span data-currency-value>50000</span>")
  const clean = String(val).replace(/<[^>]*>/g, '').trim();
  const num   = parseFloat(clean.replace(/[^0-9.]/g, '').replace(/,/g, ''));
  // Treat missing, NaN, or zero as no prize
  if (!num || num <= 0) return { display: null, raw: 0 };
  const display = num >= 1_000_000
    ? `$${(num / 1_000_000).toFixed(1)}M`
    : num >= 1000
    ? `$${Math.round(num / 1000)}k`
    : `$${Math.round(num)}`;
  return { display, raw: num };
}

/** Infer category from title + tags */
function inferCategory(title = '', tagsArr = []) {
  const text = (title + ' ' + tagsArr.join(' ')).toLowerCase();
  if (/web3|blockchain|defi|nft|solana|ethereum|crypto|dao|smart contract/.test(text)) return 'web3';
  if (/machine learning|deep learning|llm|gpt|openai|nlp|computer vision|artificial intel|ai\b/.test(text)) return 'ai';
  if (/hardware|iot|robotics|embedded|fpga|raspberry|arduino/.test(text)) return 'hardware';
  if (/climate|green|sustainability|carbon|clean energy|environment|agtech|agri/.test(text)) return 'climate';
  if (/data science|data engineering|analytics|big data|kaggle|visualization/.test(text)) return 'data';
  return 'general';
}

/** Infer difficulty from title/description */
function inferDifficulty(title = '', desc = '') {
  const text = (title + ' ' + desc).toLowerCase();
  if (/beginner|beginer|fresher|newbie|101\b|introduction|intro\b|starter/.test(text)) return 'Beginner';
  if (/advanced|expert|senior|professional/.test(text)) return 'Advanced';
  if (/intermediate|mid.level|experienced/.test(text)) return 'Intermediate';
  return 'All Levels';
}

/** Determine mode from location string */
function inferMode(location = '') {
  const l = location.toLowerCase();
  if (/online|remote|virtual|worldwide|global|anywhere/.test(l)) return 'Online';
  if (/hybrid/.test(l)) return 'Hybrid';
  return 'In-Person';
}

/** Compute status: live | upcoming | ended */
function computeStatus(startDate, endDate) {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : null;
  const end   = endDate   ? new Date(endDate).getTime()   : null;
  if (end && now > end)       return 'ended';
  if (start && now >= start)  return 'live';
  return 'upcoming';
}

/** Format participants count */
function fmtParticipants(n) {
  if (!n && n !== 0) return null;
  const num = parseInt(n, 10);
  if (isNaN(num)) return String(n);
  if (num >= 1000) return `${Math.round(num / 1000)}k+`;
  return `${num}+`;
}

/** Infer hackathon tags from themes / title */
const TAG_MAP = [
  [/react|vue|angular|next\.js|frontend/i, 'Frontend'],
  [/node|express|django|flask|backend|api/i, 'Backend'],
  [/python/i, 'Python'], [/javascript|typescript/i, 'JavaScript'],
  [/machine.?learning|ml\b/i, 'Machine Learning'], [/deep.?learning/i, 'Deep Learning'],
  [/nlp|natural.?lang/i, 'NLP'], [/computer.?vision|cv\b/i, 'Computer Vision'],
  [/llm|gpt|openai|large.?lang/i, 'LLM'], [/ai\b|artificial.?intel/i, 'AI'],
  [/blockchain|web3|defi|ethereum|solana|crypto/i, 'Blockchain'],
  [/nft/i, 'NFT'], [/smart.?contract/i, 'Smart Contracts'],
  [/cloud|aws|gcp|azure/i, 'Cloud'], [/devops|kubernetes|docker/i, 'DevOps'],
  [/mobile|ios|android|flutter|react.?native/i, 'Mobile'],
  [/ar\b|vr\b|xr\b|spatial|augmented|virtual.?reality/i, 'AR/VR'],
  [/iot|hardware|robotics|embedded/i, 'Hardware'],
  [/data.?science|analytics|big.?data/i, 'Data Science'],
  [/climate|green|sustainability|clean.?energy/i, 'GreenTech'],
  [/health|biotech|medtech/i, 'Health Tech'],
  [/fintech|finance|payment/i, 'Fintech'],
  [/edtech|education/i, 'EdTech'],
  [/security|cybersec/i, 'Cybersecurity'],
  [/game|gaming/i, 'Gaming'],
  [/open.?source/i, 'Open Source'],
];

function extractTags(text = '', existing = []) {
  const combined = [...existing];
  for (const [re, label] of TAG_MAP) {
    if (re.test(text) && !combined.includes(label)) combined.push(label);
  }
  return combined.slice(0, 8);
}

/* ─────────────────────────────────────────────────────────────────────────
   NORMALISERS
───────────────────────────────────────────────────────────────────────── */

function normaliseDevpost(h) {
  const loc       = h.displayed_location?.location || 'Online';
  const themes    = (h.themes || []).map(t => t.name || t.label || t).filter(Boolean);
  const prize     = parsePrize(h.prize_amount);
  const text      = (h.title || '') + ' ' + themes.join(' ') + ' ' + (h.tagline || '');
  const tags      = extractTags(text, themes.slice(0, 4));
  const startDate = h.submission_period_dates
    ? new Date(h.submission_period_dates.split(' - ')[0]) : null;
  const endDate   = h.submission_period_dates
    ? new Date((h.submission_period_dates.split(' - ')[1] || '').trim()) : null;

  return {
    uid:          `devpost-${h.id}`,
    title:        h.title        || 'Untitled',
    organizer:    h.organization_name || 'Devpost',
    logo:         h.thumbnail_url || null,
    location:     loc,
    mode:         inferMode(loc),
    prize:        prize.display,
    prizeRaw:     prize.raw,
    participants: fmtParticipants(h.registrations_count),
    startDate,
    endDate,
    deadline:     endDate,
    tags,
    difficulty:   inferDifficulty(h.title, h.tagline),
    status:       h.open_state === 'open' ? (startDate && new Date() >= startDate ? 'live' : 'upcoming') : computeStatus(startDate, endDate),
    url:          h.url          || `https://devpost.com${h.managed_on_devpost_url || ''}`,
    description:  h.tagline      || '',
    source:       'devpost',
    category:     inferCategory(h.title, tags),
    featured:     !!h.featured,
  };
}

function normaliseMLH(h) {
  const prize = parsePrize(h.prize);
  const tags  = extractTags((h.title || '') + ' ' + (h.themes || []).join(' '), h.themes || []);
  return {
    uid:          `mlh-${slug(h.title + '-' + (h.startDate || ''))}`,
    title:        h.title        || 'MLH Hackathon',
    organizer:    h.organizer    || 'Major League Hacking',
    logo:         h.logo         || 'https://mlh.io/assets/logos/mlh-logo-color.svg',
    location:     h.location     || 'Online',
    mode:         inferMode(h.location || ''),
    prize:        prize.display,
    prizeRaw:     prize.raw,
    participants: h.participants || null,
    startDate:    h.startDate    ? new Date(h.startDate) : null,
    endDate:      h.endDate      ? new Date(h.endDate)   : null,
    deadline:     h.deadline     ? new Date(h.deadline)  : null,
    tags,
    difficulty:   'All Levels',
    status:       computeStatus(h.startDate, h.endDate),
    url:          h.url          || 'https://mlh.io',
    description:  h.description  || '',
    source:       'mlh',
    category:     inferCategory(h.title, tags),
    featured:     false,
  };
}

function normaliseHackerEarth(h) {
  const prize = parsePrize(h.prize || h.reward);
  const title = h.title || h.challenge_name || 'HackerEarth Challenge';
  const tags  = extractTags(title + ' ' + (h.type || ''));
  const start = h.start_utc_dt || h.start_date;
  const end   = h.end_utc_dt   || h.end_date;
  return {
    uid:          `he-${slug(title + '-' + (start || ''))}`,
    title,
    organizer:    h.company_name || 'HackerEarth',
    logo:         h.company_logo || null,
    location:     'Online',
    mode:         'Online',
    prize:        prize.display,
    prizeRaw:     prize.raw,
    participants: fmtParticipants(h.register_count),
    startDate:    start ? new Date(start) : null,
    endDate:      end   ? new Date(end)   : null,
    deadline:     end   ? new Date(end)   : null,
    tags,
    difficulty:   inferDifficulty(title),
    status:       computeStatus(start, end),
    url:          h.url          || 'https://www.hackerearth.com/challenges/',
    description:  h.description  || '',
    source:       'hackerearth',
    category:     inferCategory(title, tags),
    featured:     false,
  };
}

function normaliseDevfolio(h) {
  const prize = parsePrize(h.prize_pool);
  const title = h.name || 'Devfolio Hackathon';
  const tags  = extractTags(title + ' ' + (h.desc || ''));
  const start = h.starts_at;
  const end   = h.ends_at;
  return {
    uid:          `devfolio-${h.id || slug(title)}`,
    title,
    organizer:    h.team_name || 'Devfolio',
    logo:         h.logo?.url || null,
    location:     h.location  || 'Online',
    mode:         h.is_online ? 'Online' : (h.is_hybrid ? 'Hybrid' : 'In-Person'),
    prize:        prize.display,
    prizeRaw:     prize.raw,
    participants: fmtParticipants(h.submissions_count || h.hackers_count),
    startDate:    start ? new Date(start) : null,
    endDate:      end   ? new Date(end)   : null,
    deadline:     h.ends_registration_at ? new Date(h.ends_registration_at) : null,
    tags,
    difficulty:   'All Levels',
    status:       computeStatus(start, end),
    url:          h.website || `https://devfolio.co/hackathons/${h.slug || ''}`,
    description:  h.desc    || '',
    source:       'devfolio',
    category:     inferCategory(title, tags),
    featured:     !!(h.is_featured || h.is_promoted),
  };
}

function normaliseUnstop(raw) {
  // Unstop search results sometimes nest the hackathon under raw.opportunity
  const h = raw?.opportunity || raw;

  // Prize: check multiple fields, convert INR → approximate USD (÷83)
  let prizeVal = h.prizes?.[0]?.amount
              || h.prize_money
              || h.total_prize_money
              || h.reward;
  if (prizeVal && (h.prizes?.[0]?.currency === 'INR' || (h.currency || '').toUpperCase() === 'INR')) {
    prizeVal = Math.round(Number(prizeVal) / 83); // rough INR→USD
  }
  const prize = parsePrize(prizeVal);

  const title = h.title || h.opportunity_name || raw.title || 'Unstop Hackathon';
  const tags  = extractTags(title + ' ' + (h.about || h.description || ''));
  const start = h.event_from_date || h.start_date || h.starts_at;
  const end   = h.event_to_date   || h.end_date   || h.ends_at;

  // Location: prefer city field, then location string, then mode-derived
  const city  = h.city || h.venue_city || '';
  const state = h.state || h.venue_state || '';
  const locRaw = city
    ? [city, state, 'India'].filter(Boolean).join(', ')
    : h.location || '';

  return {
    uid:          `unstop-${h.id || raw.id || slug(title)}`,
    title,
    organizer:    h.organisation?.name || h.organiser_name || h.organizer || 'Unstop',
    logo:         h.organisation?.logo_url || h.organisation?.logo || h.logo || null,
    location:     locRaw || 'Online',
    mode:         h.event_mode === 'OFFLINE' ? 'In-Person'
                : h.event_mode === 'HYBRID'  ? 'Hybrid'
                : h.mode      === 'In-Person'? 'In-Person'
                : 'Online',
    prize:        prize.display,
    prizeRaw:     prize.raw,
    participants: fmtParticipants(h.registered_count || h.registrations_count || raw.registered_count),
    startDate:    start ? new Date(start) : null,
    endDate:      end   ? new Date(end)   : null,
    deadline:     h.deadline || h.registration_deadline
                  ? new Date(h.deadline || h.registration_deadline) : null,
    tags,
    difficulty:   'All Levels',
    status:       computeStatus(start, end),
    url:          h.public_url || raw.public_url || `https://unstop.com/${h.slug || raw.slug || ''}`,
    description:  h.about || h.description || '',
    source:       'unstop',
    category:     inferCategory(title, tags),
    featured:     !!(h.is_featured || raw.is_featured),
  };
}

function normaliseDoraHacks(h) {
  const prize = parsePrize(h.reward_pool || h.total_prize);
  const title = h.title || h.hackathon_name || 'DoraHacks Hackathon';
  const tags  = extractTags(title + ' ' + (h.description || ''), ['Blockchain', 'Web3']);
  const start = h.start_time;
  const end   = h.end_time;
  return {
    uid:          `dora-${h.id || slug(title)}`,
    title,
    organizer:    h.org_name || h.host || 'DoraHacks',
    logo:         h.logo_url || h.banner_url || null,
    location:     'Online',
    mode:         'Online',
    prize:        prize.display,
    prizeRaw:     prize.raw,
    participants: fmtParticipants(h.participant_count || h.team_count),
    startDate:    start ? new Date(start * 1000 || start) : null,
    endDate:      end   ? new Date(end   * 1000 || end)   : null,
    deadline:     end   ? new Date(end   * 1000 || end)   : null,
    tags,
    difficulty:   inferDifficulty(title),
    status:       computeStatus(start ? new Date(start * 1000 || start) : null, end ? new Date(end * 1000 || end) : null),
    url:          h.url || `https://dorahacks.io/hackathon/${h.id || ''}`,
    description:  h.description || '',
    source:       'dorahacks',
    category:     'web3',
    featured:     false,
  };
}

function normaliseLablab(h) {
  const prize = parsePrize(h.prize_pool || h.prizes_total);
  const title = h.title || h.event_name || 'Lablab.ai Hackathon';
  const tags  = extractTags(title + ' ' + (h.description || ''), ['AI', 'LLM']);
  const start = h.start_date || h.starts_at;
  const end   = h.end_date   || h.ends_at;
  return {
    uid:          `lablab-${h.id || slug(title)}`,
    title,
    organizer:    h.organizer || 'Lablab.ai',
    logo:         h.thumbnail || h.cover_image || null,
    location:     'Online',
    mode:         'Online',
    prize:        prize.display,
    prizeRaw:     prize.raw,
    participants: fmtParticipants(h.participants_count || h.registered),
    startDate:    start ? new Date(start) : null,
    endDate:      end   ? new Date(end)   : null,
    deadline:     end   ? new Date(end)   : null,
    tags,
    difficulty:   inferDifficulty(title),
    status:       computeStatus(start, end),
    url:          h.url || `https://lablab.ai/event/${h.slug || ''}`,
    description:  h.description || h.tagline || '',
    source:       'lablab',
    category:     'ai',
    featured:     false,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   FETCHERS
───────────────────────────────────────────────────────────────────────── */

async function fetchDevpost() {
  try {
    const pages = [1, 2];
    const results = [];
    for (const page of pages) {
      const url = `https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&challenge_type[]=hackathon&order_by=recently-added&per_page=24&page=${page}`;
      const res = await fetch(url, { headers: HEADERS, timeout: 15000 });
      if (!res.ok) break;
      const data = await res.json();
      const items = data.hackathons || [];
      if (!items.length) break;
      results.push(...items.map(normaliseDevpost));
    }
    console.log(`[hack] devpost → ${results.length} hackathons`);
    return results;
  } catch (e) {
    console.warn('[hack] devpost failed:', e.message);
    return [];
  }
}

async function fetchMLH() {
  try {
    const res = await fetch('https://mlh.io/seasons/2026/events', { headers: { ...HEADERS, Accept: 'text/html' }, timeout: 15000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $    = cheerio.load(html);
    const hacks = [];

    $('.event.future, .event').each((_i, el) => {
      const name  = $(el).find('.event-name').text().trim() || $(el).find('h3').text().trim();
      if (!name) return;
      const meta  = $(el).find('.event-meta-item').toArray().map(m => $(m).text().trim());
      const link  = $(el).find('a.event-link, a[href*="mlh.io"]').attr('href') || 'https://mlh.io';
      const logo  = $(el).find('img').attr('src') || null;
      const date  = meta.find(m => /\d{4}/.test(m)) || '';
      const loc   = meta.find(m => !/\d{4}/.test(m) && m.length > 1) || 'Online';

      hacks.push(normaliseMLH({
        title:    name,
        url:      link,
        logo,
        location: loc,
        startDate: date ? new Date(date.split('–')[0].trim() + ', 2026') : null,
        endDate:   date ? new Date((date.split('–')[1] || date.split('–')[0]).trim() + ', 2026') : null,
      }));
    });

    console.log(`[hack] mlh → ${hacks.length} hackathons`);
    return hacks;
  } catch (e) {
    console.warn('[hack] mlh failed:', e.message);
    return [];
  }
}

async function fetchHackerEarth() {
  try {
    const res = await fetch('https://www.hackerearth.com/chrome-extension/events/', {
      headers: { ...HEADERS, Accept: 'application/json' },
      timeout: 12000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = [
      ...(data.response?.ongoing  || []),
      ...(data.response?.upcoming || []),
    ];
    const result = items.map(normaliseHackerEarth).filter(h => h.title !== 'HackerEarth Challenge' || h.url !== 'https://www.hackerearth.com/challenges/');
    console.log(`[hack] hackerearth → ${result.length} hackathons`);
    return result;
  } catch (e) {
    console.warn('[hack] hackerearth failed:', e.message);
    return [];
  }
}

async function fetchDevfolio() {
  try {
    const res = await fetch('https://api.devfolio.co/api/hackathons?count=20&order_by_=submissions_count', {
      headers: { ...HEADERS, Accept: 'application/json', 'x-devfolio-auth': '' },
      timeout: 12000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.results || data.hackathons || (Array.isArray(data) ? data : []);
    const result = items.map(normaliseDevfolio);
    console.log(`[hack] devfolio → ${result.length} hackathons`);
    return result;
  } catch (e) {
    console.warn('[hack] devfolio failed:', e.message);
    return [];
  }
}

async function fetchUnstop() {
  const PER_PAGE   = 25;   // max Unstop allows reliably
  const TARGET     = 400;  // aim well above 300
  const BATCH_SIZE = 6;    // concurrent page requests per batch
  const BASE       = 'https://unstop.com/api/public/opportunity/search-result';
  const PARAMS     = `opportunity=hackathons&per_page=${PER_PAGE}&sort_by=RELEVANCE`;

  const unstopHeaders = {
    ...HEADERS,
    'Accept':           'application/json, text/plain, */*',
    'Accept-Language':  'en-US,en;q=0.9',
    'Referer':          'https://unstop.com/hackathons',
    'Origin':           'https://unstop.com',
    'sec-fetch-dest':   'empty',
    'sec-fetch-mode':   'cors',
    'sec-fetch-site':   'same-origin',
  };

  /** Fetch one page, return raw items array or [] on failure */
  async function fetchPage(page) {
    try {
      const res = await fetch(`${BASE}?${PARAMS}&page=${page}`, {
        headers: unstopHeaders,
        timeout: 15000,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Shape can be: json.data.data[] or json.data[]
      const inner = json?.data;
      if (!inner) return { items: [], total: 0 };
      const items = Array.isArray(inner.data) ? inner.data
                  : Array.isArray(inner)       ? inner
                  : [];
      const total = inner.total || inner.count || 0;
      return { items, total };
    } catch (e) {
      console.warn(`[hack] unstop page ${page} failed:`, e.message);
      return { items: [], total: 0 };
    }
  }

  try {
    // ── Step 1: first page to learn total count ──────────────────────
    const first = await fetchPage(1);
    if (!first.items.length) {
      console.warn('[hack] unstop → 0 results on page 1');
      return [];
    }

    const total     = first.total || 1000;          // assume 1000 if unknown
    const maxPages  = Math.ceil(Math.min(total, 1000) / PER_PAGE); // hard cap 1000 items
    const pagesNeeded = Math.max(Math.ceil(TARGET / PER_PAGE), 2); // at least enough for target
    const lastPage  = Math.min(maxPages, pagesNeeded, 20);         // cap at 20 pages

    console.log(`[hack] unstop total=${total}, fetching pages 2–${lastPage} (${PER_PAGE}/page)`);

    // ── Step 2: fetch remaining pages in concurrent batches ──────────
    const allItems = [...first.items];
    const remainingPages = [];
    for (let p = 2; p <= lastPage; p++) remainingPages.push(p);

    for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
      const batch = remainingPages.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(p => fetchPage(p)));
      results.forEach(r => allItems.push(...r.items));
      // small delay between batches to be polite
      if (i + BATCH_SIZE < remainingPages.length) {
        await new Promise(res => setTimeout(res, 400));
      }
    }

    // ── Step 3: normalise + deduplicate by uid ───────────────────────
    const seen   = new Set();
    const result = [];
    for (const item of allItems) {
      const norm = normaliseUnstop(item);
      if (!seen.has(norm.uid)) {
        seen.add(norm.uid);
        result.push(norm);
      }
    }

    console.log(`[hack] unstop → ${result.length} hackathons (from ${allItems.length} raw)`);
    return result;
  } catch (e) {
    console.warn('[hack] unstop failed:', e.message);
    return [];
  }
}

async function fetchDoraHacks() {
  try {
    const res = await fetch('https://dorahacks.io/api/hackathon/list/?limit=20&offset=0&status=0', {
      headers: { ...HEADERS, Accept: 'application/json' },
      timeout: 12000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.list || data.hackathons || (Array.isArray(data) ? data : []);
    const result = items.map(normaliseDoraHacks);
    console.log(`[hack] dorahacks → ${result.length} hackathons`);
    return result;
  } catch (e) {
    console.warn('[hack] dorahacks failed:', e.message);
    return [];
  }
}

async function fetchLablab() {
  try {
    const res = await fetch('https://lablab.ai/api/get-events', {
      headers: { ...HEADERS, Accept: 'application/json' },
      timeout: 12000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.events || data.hackathons || (Array.isArray(data) ? data : []);
    const result = items.map(normaliseLablab);
    console.log(`[hack] lablab → ${result.length} hackathons`);
    return result;
  } catch (e) {
    console.warn('[hack] lablab failed:', e.message);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   DEDUP
───────────────────────────────────────────────────────────────────────── */
function dedup(arr) {
  const seenUid   = new Set();
  const seenTitle = new Set();
  return arr.filter(h => {
    if (!h || !h.uid || !h.title) return false;
    if (seenUid.has(h.uid)) return false;
    const titleKey = h.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenTitle.has(titleKey)) return false;
    seenUid.add(h.uid);
    seenTitle.add(titleKey);
    return true;
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   ORCHESTRATOR
───────────────────────────────────────────────────────────────────────── */
async function scrapeHackathons() {
  console.log('[hack] scraping all 7 sources…');

  const [devpost, mlh, he, devfolio, unstop, dora, lablab] = await Promise.allSettled([
    fetchDevpost(),
    fetchMLH(),
    fetchHackerEarth(),
    fetchDevfolio(),
    fetchUnstop(),
    fetchDoraHacks(),
    fetchLablab(),
  ]);

  const combined = dedup([
    ...(devpost.status  === 'fulfilled' ? devpost.value  : []),
    ...(mlh.status      === 'fulfilled' ? mlh.value      : []),
    ...(he.status       === 'fulfilled' ? he.value       : []),
    ...(devfolio.status === 'fulfilled' ? devfolio.value : []),
    ...(unstop.status   === 'fulfilled' ? unstop.value   : []),
    ...(dora.status     === 'fulfilled' ? dora.value     : []),
    ...(lablab.status   === 'fulfilled' ? lablab.value   : []),
  ]);

  // Sort: live first, then upcoming soonest, then ended last
  combined.sort((a, b) => {
    const order = { live: 0, upcoming: 1, ended: 2 };
    const os = (order[a.status] ?? 1) - (order[b.status] ?? 1);
    if (os !== 0) return os;
    const da = a.startDate ? new Date(a.startDate).getTime() : Infinity;
    const db = b.startDate ? new Date(b.startDate).getTime() : Infinity;
    return da - db;
  });

  console.log(`[hack] total after dedup: ${combined.length}`);
  return combined;
}

module.exports = { scrapeHackathons };
