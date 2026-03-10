/**
 * server/scraper/ScraperForInternship.js
 *
 * Scrapes internship listings from multiple Indian & global platforms,
 * normalises them into a flat schema, deduplicates, and upserts to MongoDB.
 *
 * Exports:
 *   scrapeInternships() → Promise<NormalisedInternship[]>
 *
 * Sources (all fail gracefully):
 *   1. Unstop        https://unstop.com/api/public/...  (JSON API – 10 000+ results)
 *   2. Internshala   https://internshala.com/internships/ajax/{offset}  (HTML scrape)
 *   3. HackerEarth   https://www.hackerearth.com/chrome-extension/events/  (JSON)
 */

'use strict';

const fetch   = require('node-fetch');
const cheerio = require('cheerio');

/* ─────────────────────────────────────────────────────────────────────────
   SHARED UTILITIES
───────────────────────────────────────────────────────────────────────── */

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept':     'application/json, text/html, */*',
};

function slug(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

/** Strip HTML tags from a string */
function stripHtml(str = '') {
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse a stipend string like "₹15,000/mo", "15000", "$1,200/month" → { display, raw (INR numeric) }
 * Returns { display: null, raw: 0 } when unparseable / zero.
 */
function parseStipend(val) {
  if (!val && val !== 0) return { display: null, raw: 0 };
  const clean = stripHtml(String(val)).trim();
  if (/unpaid|no stipend|0/i.test(clean) && !/[1-9]/.test(clean)) return { display: null, raw: 0 };

  // Handle ranges like "₹10,000 - 15,000 /month" → take the midpoint
  const rangeParts = clean.replace(/[₹$,]/g, '').match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (rangeParts) {
    const lo = parseFloat(rangeParts[1]);
    const hi = parseFloat(rangeParts[2]);
    const mid = Math.round((lo + hi) / 2);
    const isUSD = /\$/.test(clean);
    const raw = isUSD ? mid * 83 : mid; // rough USD→INR
    const display = isUSD
      ? `$${Math.round(mid).toLocaleString()}/mo`
      : `₹${Math.round(mid).toLocaleString()}/mo`;
    return { display, raw };
  }

  const num = parseFloat(clean.replace(/[^\d.]/g, ''));
  if (!num || num <= 0) return { display: null, raw: 0 };
  const isUSD = /\$/.test(clean);
  const raw = isUSD ? Math.round(num * 83) : Math.round(num);
  const display = isUSD
    ? num >= 1000 ? `$${Math.round(num / 1000)}k/mo` : `$${Math.round(num)}/mo`
    : num >= 1000 ? `₹${Math.round(num / 1000)}k/mo` : `₹${Math.round(num)}/mo`;
  return { display, raw };
}

/** Infer category from title + tags */
function inferCategory(title = '', tagsArr = []) {
  const text = (title + ' ' + tagsArr.join(' ')).toLowerCase();
  if (/frontend|backend|fullstack|full.stack|react|node|python|java\b|javascript|typescript|angular|vue|software engineer|web dev|mobile dev|ios|android|flutter|django|spring/.test(text)) return 'engineering';
  if (/machine learning|deep learning|llm|gpt|nlp|computer vision|ai\b|artificial intel|data science|data analyst|business intelligence|analytics/.test(text)) return 'data';
  if (/ui.ux|product design|graphic design|visual design|branding|illustration|figma|sketch|adobe/.test(text)) return 'design';
  if (/product manager|product management|product analyst|program manager/.test(text)) return 'product';
  if (/marketing|seo|content|growth|social media|brand|copywriting|digital marketing|communications/.test(text)) return 'marketing';
  if (/finance|accounting|investment|banking|trading|equity|valuation/.test(text)) return 'finance';
  return 'general';
}

/** Format applicant count */
function fmtApplicants(n) {
  if (!n || n <= 0) return null;
  const num = Number(n);
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

/* ─────────────────────────────────────────────────────────────────────────
   SOURCE 1 – UNSTOP
   API: https://unstop.com/api/public/opportunity/search-result?opportunity=internships
   Returns up to 10 000 internships with pagination
───────────────────────────────────────────────────────────────────────── */

function normaliseUnstop(raw) {
  // Results sometimes nest the actual item under raw.opportunity
  const h = raw?.opportunity || raw;

  const title    = h.title || h.opportunity_name || raw.title || 'Internship';
  const workTags = (h.workfunction || []).map(w => w.name).filter(Boolean).slice(0, 5);
  const extraTags = (h.tags || []).map(t => (typeof t === 'string' ? t : t?.name)).filter(Boolean);
  const allTags  = [...new Set([...workTags, ...extraTags])].slice(0, 6);

  const addr    = h.address_with_country_logo || {};
  const city    = addr.city || h.city || '';
  const country = addr.country || h.country || '';
  const locStr  = city ? [city, country].filter(Boolean).join(', ') : (country || '');

  const mode =
    (h.region || '').toLowerCase() === 'online' ? 'Online'
    : (h.region || '').toLowerCase() === 'hybrid' ? 'Hybrid'
    : locStr ? 'In-Person' : 'Online';

  const statusRaw = (h.status || '').toUpperCase();
  const status = ['LIVE', 'OPEN', 'ACTIVE'].includes(statusRaw) ? 'open' : 'closed';

  return {
    uid:         `unstop-intrnshp-${h.id || raw.id || slug(title)}`,
    title,
    organizer:   h.organisation?.name || h.organiser_name || 'Unstop',
    logo:        h.logoUrl2 || h.organisation?.logoUrl2 || h.organisation?.logoUrl || null,
    location:    locStr || 'Online',
    mode,
    stipend:     null,   // not present in list endpoint
    stipendRaw:  0,
    duration:    null,
    applicants:  null,
    deadline:    null,
    startDate:   null,
    tags:        allTags,
    status,
    url:         h.seo_url || raw.seo_url || `https://unstop.com/${h.public_url || raw.public_url || ''}`,
    description: stripHtml(h.details || h.about || h.description || '').slice(0, 500),
    source:      'unstop',
    category:    inferCategory(title, allTags),
    featured:    !!(h.isPaid || h.is_featured || raw.is_featured),
  };
}

async function fetchUnstop() {
  const PER_PAGE   = 25;
  const TARGET     = 400;   // aim for 400+ to ensure >300 after dedup
  const BATCH_SIZE = 6;
  const BASE       = 'https://unstop.com/api/public/opportunity/search-result';
  const PARAMS     = `opportunity=internships&per_page=${PER_PAGE}&sort_by=RELEVANCE`;

  const headers = {
    ...BASE_HEADERS,
    'Accept':          'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer':         'https://unstop.com/internships',
    'Origin':          'https://unstop.com',
    'sec-fetch-dest':  'empty',
    'sec-fetch-mode':  'cors',
    'sec-fetch-site':  'same-origin',
  };

  async function fetchPage(page) {
    try {
      const res  = await fetch(`${BASE}?${PARAMS}&page=${page}`, { headers, timeout: 15000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const inner = json?.data;
      if (!inner) return { items: [], total: 0 };
      const items = Array.isArray(inner.data) ? inner.data
                  : Array.isArray(inner)       ? inner
                  : [];
      return { items, total: inner.total || 0 };
    } catch (e) {
      console.warn(`[intern] unstop page ${page} failed:`, e.message);
      return { items: [], total: 0 };
    }
  }

  try {
    const first   = await fetchPage(1);
    if (!first.items.length) { console.warn('[intern] unstop → 0 items page 1'); return []; }

    const total      = first.total || 1000;
    const maxPages   = Math.ceil(Math.min(total, 1000) / PER_PAGE);
    const pagesNeeded = Math.ceil(TARGET / PER_PAGE);
    const lastPage   = Math.min(maxPages, pagesNeeded, 20);

    console.log(`[intern] unstop total=${total}; fetching pages 2–${lastPage}`);

    const allItems = [...first.items];
    const remaining = [];
    for (let p = 2; p <= lastPage; p++) remaining.push(p);

    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      const results = await Promise.all(remaining.slice(i, i + BATCH_SIZE).map(p => fetchPage(p)));
      results.forEach(r => allItems.push(...r.items));
      if (i + BATCH_SIZE < remaining.length) await new Promise(r => setTimeout(r, 350));
    }

    const seen   = new Set();
    const result = [];
    for (const item of allItems) {
      const norm = normaliseUnstop(item);
      if (!seen.has(norm.uid)) { seen.add(norm.uid); result.push(norm); }
    }

    console.log(`[intern] unstop → ${result.length} (from ${allItems.length} raw)`);
    return result;
  } catch (e) {
    console.warn('[intern] unstop error:', e.message);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   SOURCE 2 – INTERNSHALA
   HTML scrape: https://internshala.com/internships/ajax/{offset}
   ~50 cards per page; paginate via offset increments
───────────────────────────────────────────────────────────────────────── */

function normaliseInternshala($, el) {
  const elem = $(el);

  // ID from element id="individual_internship_XXXX"
  const rawId   = elem.attr('id') || '';
  const id      = rawId.replace('individual_internship_', '').trim() || slug(elem.find('.job-title-href').text());

  const titleEl = elem.find('.job-title-href').first();
  const title   = titleEl.text().trim() || 'Internship';
  const href    = titleEl.attr('href') || '';
  const url     = href.startsWith('http') ? href : `https://internshala.com${href}`;

  const company = elem.find('.company-name').first().text().trim()
               || elem.find('.company_name p').first().text().trim()
               || 'Company';

  const logo    = elem.find('.internship_logo img, .company_logo img').first().attr('src') || null;

  // Location – multiple possible places
  const locText = [
    elem.find('.row-1-item.locations a span').text(),
    elem.find('.location_link span').text(),
    elem.find('.location-container').text(),
    elem.find('[class*="location"] span').first().text(),
  ].map(s => s.trim()).find(s => s.length > 0) || '';

  const isOnline = /work from home|online|remote|wfh/i.test(locText);
  const location = isOnline ? 'Online' : locText || 'India';
  const mode     = isOnline ? 'Online' : 'In-Person';

  // Stipend
  const stipendText = [
    elem.find('.stipend_container').text(),
    elem.find('[class*="stipend"]').first().text(),
    elem.find('.item_body').filter((_, e) => /[₹$]/.test($(e).text())).first().text(),
  ].map(s => s.trim()).find(s => s.length > 0) || '';
  const stipend = parseStipend(stipendText);

  // Duration – look for "X month(s)" pattern in detail rows
  let duration = null;
  elem.find('.item_body').each((_, e) => {
    const t = $(e).text().trim();
    if (/month|week|day/i.test(t) && /\d/.test(t) && !duration) duration = t.replace(/\s+/g, ' ');
  });

  // Deadline
  let deadline = null;
  elem.find('.item_body').each((_, e) => {
    const t = $(e).text().trim();
    if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(t) && !deadline) {
      const d = new Date(t);
      if (!isNaN(d)) deadline = d;
    }
  });
  // Also check apply_by / deadline containers
  const deadlineText = elem.find('[class*="deadline"] .item_body, .apply-by .item_body').text().trim();
  if (!deadline && deadlineText) {
    const d = new Date(deadlineText);
    if (!isNaN(d)) deadline = d;
  }

  // Applicants
  const applicants = elem.find('.recent_activity, [class*="apply"]').text()
    .replace(/[^0-9]/g, '') || null;

  const tags = inferTagsFromTitle(title);

  return {
    uid:         `internshala-${id}`,
    title,
    organizer:   company,
    logo,
    location,
    mode,
    stipend:     stipend.display,
    stipendRaw:  stipend.raw,
    duration:    duration || null,
    applicants:  applicants ? fmtApplicants(applicants) : null,
    deadline,
    startDate:   null,
    tags,
    status:      'open',
    url,
    description: '',
    source:      'internshala',
    category:    inferCategory(title, tags),
    featured:    !!(elem.find('.premium_intern_label, .actively-hiring-badge').length),
  };
}

function inferTagsFromTitle(title = '') {
  const lower = title.toLowerCase();
  const techMap = {
    'react': 'React', 'node': 'Node.js', 'python': 'Python', 'java': 'Java',
    'javascript': 'JavaScript', 'typescript': 'TypeScript', 'flutter': 'Flutter',
    'android': 'Android', 'ios': 'iOS', 'angular': 'Angular', 'vue': 'Vue.js',
    'django': 'Django', 'spring': 'Spring Boot', 'php': 'PHP', 'laravel': 'Laravel',
    'sql': 'SQL', 'mongodb': 'MongoDB', 'aws': 'AWS', 'azure': 'Azure',
    'figma': 'Figma', 'sketch': 'Sketch', 'photoshop': 'Photoshop',
    'machine learning': 'ML', 'deep learning': 'Deep Learning', 'data science': 'Data Science',
    'excel': 'Excel', 'power bi': 'Power BI', 'tableau': 'Tableau',
    'content': 'Content Writing', 'marketing': 'Marketing', 'seo': 'SEO',
    'finance': 'Finance', 'accounting': 'Accounting', 'research': 'Research',
    'graphic': 'Graphic Design', 'video': 'Video Editing', 'ui': 'UI/UX',
  };
  const found = [];
  for (const [key, val] of Object.entries(techMap)) {
    if (lower.includes(key)) found.push(val);
  }
  return found.slice(0, 4);
}

async function fetchInternshalaPage(offset) {
  const url = `https://internshala.com/internships/ajax/${offset}`;
  try {
    const res = await fetch(url, {
      headers: {
        ...BASE_HEADERS,
        'Accept':        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer':       'https://internshala.com/internships/',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 20000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $    = cheerio.load(html);
    const cards = [];
    $('.individual_internship').each((_, el) => {
      try { cards.push(normaliseInternshala($, el)); } catch { /* skip bad card */ }
    });
    return cards;
  } catch (e) {
    console.warn(`[intern] internshala offset=${offset} failed:`, e.message);
    return [];
  }
}

async function fetchInternshala() {
  const PAGE_SIZE  = 50;   // ~50 cards per offset page
  const MAX_PAGES  = 8;    // 8 × 50 = 400 items max
  const BATCH_SIZE = 3;    // 3 concurrent to be polite
  const offsets    = Array.from({ length: MAX_PAGES }, (_, i) => i * PAGE_SIZE);

  const allItems = [];
  for (let i = 0; i < offsets.length; i += BATCH_SIZE) {
    const batch   = offsets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(off => fetchInternshalaPage(off)));
    results.forEach(r => allItems.push(...r));
    if (i + BATCH_SIZE < offsets.length) await new Promise(r => setTimeout(r, 600));
  }

  // Deduplicate by uid
  const seen   = new Set();
  const result = allItems.filter(item => {
    if (seen.has(item.uid)) return false;
    seen.add(item.uid);
    return true;
  });

  console.log(`[intern] internshala → ${result.length} internships`);
  return result;
}

/* ─────────────────────────────────────────────────────────────────────────
   SOURCE 3 – HACKEREARTH (graceful, often blocked)
───────────────────────────────────────────────────────────────────────── */

async function fetchHackerEarth() {
  try {
    const res = await fetch(
      'https://www.hackerearth.com/chrome-extension/events/',
      { headers: BASE_HEADERS, timeout: 12000 }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data  = await res.json();
    const items = (data.response || []).filter(e =>
      /intern/i.test(e.title || '') || /intern/i.test((e.type || '').toLowerCase())
    );
    const result = items.map(h => {
      const title  = h.title || 'Internship';
      const tags   = inferTagsFromTitle(title);
      return {
        uid:         `he-intrnshp-${h.id || slug(title)}`,
        title,
        organizer:   h.company_name || h.organization || 'HackerEarth',
        logo:        h.company_logo || null,
        location:    h.location || 'Online',
        mode:        /remote|online|virtual/i.test(h.location || '') ? 'Online' : 'In-Person',
        stipend:     null,
        stipendRaw:  0,
        duration:    null,
        applicants:  null,
        deadline:    h.end_tz   ? new Date(h.end_tz)   : null,
        startDate:   h.start_tz ? new Date(h.start_tz) : null,
        tags,
        status:      h.status === 'OPEN' ? 'open' : 'closed',
        url:         h.url || '#',
        description: h.description || '',
        source:      'hackerearth',
        category:    inferCategory(title, tags),
        featured:    false,
      };
    });
    console.log(`[intern] hackerearth → ${result.length} internships`);
    return result;
  } catch (e) {
    console.warn('[intern] hackerearth failed:', e.message);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   DEDUP + ORCHESTRATOR
───────────────────────────────────────────────────────────────────────── */

function dedup(items) {
  const seen  = new Set();
  return items.filter(item => {
    const key = item.uid || slug(item.title + item.organizer);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Main export – fetches all sources, merges, deduplicates,
 * upserts to MongoDB (if connection is ready), and returns the list.
 */
async function scrapeInternships() {
  console.log('[intern] starting scrape...');

  const [unstopItems, internshalaItems, heItems] = await Promise.allSettled([
    fetchUnstop(),
    fetchInternshala(),
    fetchHackerEarth(),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));

  const all   = dedup([...unstopItems, ...internshalaItems, ...heItems]);
  console.log(`[intern] total after dedup: ${all.length}`);

  // Upsert to MongoDB if connected
  try {
    const mongoose   = require('mongoose');
    const Internship = require('../models/Internship');
    if (mongoose.connection.readyState === 1) {
      const ops = all.map(item => ({
        updateOne: {
          filter: { uid: item.uid },
          update: { $set: { ...item, scrapedAt: new Date() } },
          upsert: true,
        },
      }));
      if (ops.length) {
        const result = await Internship.bulkWrite(ops, { ordered: false });
        console.log(`[intern] upserted ${result.upsertedCount} new, modified ${result.modifiedCount}`);
      }
    }
  } catch (e) {
    console.warn('[intern] DB upsert failed:', e.message);
  }

  return all;
}

module.exports = { scrapeInternships };
