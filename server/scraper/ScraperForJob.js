/**
 * server/scraper/scraper.js
 *
 * Responsible ONLY for fetching job data from external sources,
 * normalising it into a flat schema, and deduplicating.
 *
 * Exports:
 *   scrapeAll() → Promise<NormalisedJob[]>
 *
 * Sources:
 *   1.  Remotive    https://remotive.com/api/remote-jobs
 *   2.  Jobicy      https://jobicy.com/api/v2/remote-jobs
 *   3.  Arbeitnow   https://www.arbeitnow.com/api/job-board-api
 *   4.  LinkedIn    https://linkedin.com/jobs-guest  (HTML scrape)
 *   5.  Indeed      https://indeed.com/rss           (often blocked)
 *   6.  Wellfound   https://wellfound.com            (often blocked)
 *   7.  Naukri      https://naukri.com/jobapi        (often blocked)
 *   8.  Foundit     https://foundit.in/middleware    (often blocked)
 *   9.  The Muse    https://www.themuse.com/api/public/jobs
 *  10.  JSearch     https://jsearch.p.rapidapi.com   (needs RAPIDAPI_KEY)
 *  11.  Adzuna      https://api.adzuna.com           (needs ADZUNA_APP_ID/KEY)
 *
 * All scrapers fail gracefully – errors are logged and silently skipped.
 */

'use strict';

const fetch   = require('node-fetch');
const cheerio = require('cheerio');

/* ─────────────────────────────────────────────────────────────────────────
   SHARED UTILITIES
───────────────────────────────────────────────────────────────────────── */
function fmtK(n) {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

const KEYWORDS = [
  'React','Vue','Angular','Next.js','Nuxt','Svelte',
  'Node.js','Express','NestJS','Django','Flask','FastAPI','Laravel','Rails',
  'Python','Java','Go','Rust','TypeScript','JavaScript','PHP','Kotlin','Swift','C#','C++','Scala',
  'AWS','GCP','Azure','Docker','Kubernetes','Terraform','CI/CD','GitHub Actions',
  'GraphQL','REST','gRPC','Microservices','PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch',
  'Machine Learning','Deep Learning','Data Science','Computer Vision','NLP','PyTorch','TensorFlow',
  'DevOps','SRE','Linux','Bash','Figma','UX','UI','Agile','Scrum',
];

function parseTags(text = '') {
  const lower = text.toLowerCase();
  return KEYWORDS.filter(k => lower.includes(k.toLowerCase())).slice(0, 8);
}

function inferLevel(title = '') {
  const t = title.toLowerCase();
  if (/senior|lead|principal|staff|architect|expert/.test(t)) return 'Senior';
  if (/junior|entry.?level|graduate|fresher|trainee/.test(t))  return 'Junior';
  if (/manager|director|head of|vp |vice president/.test(t))   return 'Manager';
  if (/intern/.test(t))                                        return 'Intern';
  return 'Mid-level';
}

function extractCompanyFromTitle(t = '') {
  const m = t.match(/- ([^-]+)$/);
  return m ? m[1].trim() : null;
}

/* ─────────────────────────────────────────────────────────────────────────
   NORMALISERS  –  each source maps to the same flat schema
───────────────────────────────────────────────────────────────────────── */
const REMOTIVE_TYPE = {
  full_time:   'Full-time',
  part_time:   'Part-time',
  contract:    'Contract',
  freelance:   'Freelance',
  internship:  'Internship',
};

function normaliseRemotive(job) {
  return {
    uid:         `rem-${job.id}`,
    title:       job.title                           || 'Untitled',
    company:     job.company_name                    || 'Unknown',
    logo:        job.company_logo                    || null,
    location:    job.candidate_required_location     || 'Remote',
    type:        REMOTIVE_TYPE[job.job_type] ?? job.job_type ?? 'Full-time',
    salary:      job.salary                          || null,
    tags:        Array.isArray(job.tags) ? job.tags.slice(0, 8) : parseTags(job.title),
    postedAt:    job.publication_date ? new Date(job.publication_date) : new Date(),
    url:         job.url                             || '#',
    description: job.description                     || '',
    source:      'remotive',
    category:    job.category                        || 'Software Development',
    level:       inferLevel(job.title),
  };
}

function normaliseJobicy(job) {
  let salary = null;
  if (job.annualSalaryMin && job.annualSalaryMax)
    salary = `${job.salaryCurrency || 'USD'} ${fmtK(job.annualSalaryMin)}–${fmtK(job.annualSalaryMax)}/yr`;
  return {
    uid:         `jcy-${job.id}`,
    title:       job.jobTitle       || 'Untitled',
    company:     job.companyName    || 'Unknown',
    logo:        job.companyLogo    || null,
    location:    job.jobGeo         || 'Remote',
    type:        job.jobType        || 'Full-time',
    salary,
    tags:        parseTags((job.jobTitle || '') + ' ' + (job.jobIndustry || '') + ' ' + (job.jobExcerpt || '')),
    postedAt:    job.pubDate ? new Date(job.pubDate) : new Date(),
    url:         job.url            || '#',
    description: job.jobDescription || job.jobExcerpt || '',
    source:      'jobicy',
    category:    job.jobIndustry    || 'Engineering',
    level:       job.jobLevel       || inferLevel(job.jobTitle),
  };
}

function normaliseArbeitnow(job) {
  const typeRaw = Array.isArray(job.job_types) ? job.job_types[0] : '';
  const typeMap = {
    full_time:   'Full-time',
    part_time:   'Part-time',
    contract:    'Contract',
    freelance:   'Freelance',
    internship:  'Internship',
  };
  return {
    uid:         `abn-${job.slug}`,
    title:       job.title        || 'Untitled',
    company:     job.company_name || 'Unknown',
    logo:        job.company_logo || null,
    location:    job.location     || (job.remote ? 'Worldwide (Remote)' : 'On-site'),
    type:        typeMap[typeRaw] ?? 'Full-time',
    salary:      null,
    tags:        Array.isArray(job.tags)
      ? job.tags.slice(0, 8)
      : parseTags((job.title || '') + ' ' + (job.description || '')),
    postedAt:    job.created_at ? new Date(job.created_at * 1000) : new Date(),
    url:         job.url          || '#',
    description: job.description  || '',
    source:      'arbeitnow',
    category:    (Array.isArray(job.tags) && job.tags.length) ? job.tags[0] : 'Engineering',
    level:       inferLevel(job.title),
  };
}

function normaliseLinkedIn(el, $) {
  const title    = $(el).find('.base-search-card__title').text().trim();
  const company  = $(el).find('.base-search-card__subtitle a, .base-search-card__subtitle').first().text().trim();
  const location = $(el).find('.job-search-card__location').text().trim();
  const url      = $(el).find('a.base-card__full-link, a.base-search-card__full-link').attr('href') || '#';
  const postedAt = $(el).find('time').attr('datetime');
  const logo     = $(el).find('img.artdeco-entity-image').attr('data-delayed-url')
                || $(el).find('img').attr('src') || null;
  const urnRaw   = $(el).find('[data-entity-urn]').attr('data-entity-urn') || '';
  const id       = urnRaw.match(/(\d+)/)?.[1] || Buffer.from(url).toString('base64').slice(0, 12);
  if (!title) return null;
  return {
    uid:         `li-${id}`,
    title,
    company:     company || 'Unknown',
    logo:        logo && logo.startsWith('http') ? logo : null,
    location:    location || 'Remote',
    type:        'Full-time',
    salary:      null,
    tags:        parseTags(title),
    postedAt:    postedAt ? new Date(postedAt) : new Date(),
    url:         url.split('?')[0],
    description: '',
    source:      'linkedin',
    category:    'Engineering',
    level:       inferLevel(title),
  };
}

function normaliseIndeedItem(xml) {
  const get   = (tag) => xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'))?.[1]?.trim() || '';
  const title = get('title').replace(/ - .*$/, '').trim();
  const link  = get('link') || get('guid') || '#';
  const desc  = get('description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const pub   = get('pubDate');
  const src   = get('source');
  if (!title || title === 'Indeed Job Search') return null;
  return {
    uid:         `ind-${Buffer.from(link).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 16)}`,
    title,
    company:     src || extractCompanyFromTitle(get('title')) || 'Unknown',
    logo:        null,
    location:    'Remote',
    type:        'Full-time',
    salary:      null,
    tags:        parseTags(title + ' ' + desc),
    postedAt:    pub ? new Date(pub) : new Date(),
    url:         link,
    description: desc.slice(0, 800),
    source:      'indeed',
    category:    'Engineering',
    level:       inferLevel(title),
  };
}

function normaliseWellfound(job) {
  const slug = job.id ?? job.jobId ?? job.slug ?? Math.random().toString(36).slice(2);
  return {
    uid:         `wf-${slug}`,
    title:       job.title            || job.role       || 'Untitled',
    company:     job.startup?.name    || job.company    || 'Unknown',
    logo:        job.startup?.thumb_url || job.logo     || null,
    location:    job.remote ? 'Remote' : (job.locations?.[0] || job.location || 'Remote'),
    type:        job.job_type === 'full-time' ? 'Full-time' : (job.job_type || 'Full-time'),
    salary:      job.salary           || null,
    tags:        Array.isArray(job.skills)
      ? job.skills.slice(0, 8).map(s => s.display_name ?? s)
      : parseTags(job.title || ''),
    postedAt:    job.created_at ? new Date(job.created_at) : new Date(),
    url:         job.url || (job.slug ? `https://wellfound.com/jobs/${job.slug}` : '#'),
    description: job.description      || '',
    source:      'wellfound',
    category:    'Startup',
    level:       inferLevel(job.title || ''),
  };
}

function normaliseNaukri(job) {
  const loc = job.placeholders?.find(p => p.type === 'location')?.label || job.location || 'India';
  const sal = job.placeholders?.find(p => p.type === 'salary')?.label   || null;
  return {
    uid:         `nkr-${job.jobId}`,
    title:       job.title       || 'Untitled',
    company:     job.companyName || 'Unknown',
    logo:        job.logoPath ? `https://img.naukimg.com/logo_images/groups/${job.logoPath}` : null,
    location:    loc,
    type:        'Full-time',
    salary:      sal,
    tags:        parseTags((job.title || '') + ' ' + (job.tagsAndSkills || '')),
    postedAt:    new Date(),
    url:         job.jdURL ? `https://www.naukri.com${job.jdURL}` : '#',
    description: job.jobDescription || '',
    source:      'naukri',
    category:    job.functionalArea || 'Engineering',
    level:       inferLevel(job.title || ''),
  };
}

function normaliseFoundit(job) {
  return {
    uid:         `fnd-${job.jobId || job.id}`,
    title:       job.designation    || job.title        || 'Untitled',
    company:     job.company?.title || job.companyName  || 'Unknown',
    logo:        job.company?.logoPath || null,
    location:    Array.isArray(job.locations)
      ? job.locations.map(l => l.label || l).join(', ')
      : (job.location || 'India'),
    type:        'Full-time',
    salary:      job.salary         || null,
    tags:        parseTags((job.designation || '') + ' ' + (job.keySkills?.join(' ') || '')),
    postedAt:    job.modifiedOn ? new Date(job.modifiedOn) : new Date(),
    url:         job.jdURL ? `https://www.foundit.in${job.jdURL}` : '#',
    description: job.jobDescription || '',
    source:      'foundit',
    category:    job.functionalArea || 'Engineering',
    level:       inferLevel(job.designation || ''),
  };
}

function normaliseMuse_level(l = '') {
  if (/senior|lead|principal|staff/.test(l.toLowerCase())) return 'Senior';
  if (/junior|entry|internship/.test(l.toLowerCase()))    return 'Junior';
  if (/manager|director/.test(l.toLowerCase()))           return 'Manager';
  if (/intern/.test(l.toLowerCase()))                     return 'Intern';
  return 'Mid-level';
}

function normaliseMuse(job) {
  const loc = job.locations?.length ? job.locations.map(l => l.name).join(', ') : 'Remote';
  return {
    uid:         `muse-${job.id}`,
    title:       job.name                || 'Untitled',
    company:     job.company?.name       || 'Unknown',
    logo:        job.company?.refs?.landing_page
                   ? `https://www.themuse.com/api/public/companies/${job.company.short_name}/images/logo`
                   : null,
    location:    loc,
    type:        job.type === 'Part Time' ? 'Part-time'
               : job.type === 'Contract'  ? 'Contract'
               : 'Full-time',
    salary:      null,
    tags:        parseTags(
      (job.name || '') + ' ' +
      (Array.isArray(job.categories) ? job.categories.map(c => c.name).join(' ') : '')
    ),
    postedAt:    job.publication_date ? new Date(job.publication_date) : new Date(),
    url:         job.refs?.landing_page  || '#',
    description: job.contents
      ? job.contents.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800)
      : '',
    source:      'themuse',
    category:    job.categories?.[0]?.name || 'Engineering',
    level:       inferLevel(job.name || '') === 'Mid-level' && job.levels?.[0]?.name
      ? normaliseMuse_level(job.levels[0].name)
      : inferLevel(job.name || ''),
  };
}

function normaliseJSearch(job) {
  return {
    uid:         `jsearch-${job.job_id}`,
    title:       job.job_title     || 'Untitled',
    company:     job.employer_name || 'Unknown',
    logo:        job.employer_logo || null,
    location:    job.job_is_remote
      ? 'Remote'
      : [job.job_city, job.job_country].filter(Boolean).join(', ') || 'Remote',
    type:        job.job_employment_type === 'FULLTIME'  ? 'Full-time'
               : job.job_employment_type === 'PARTTIME'  ? 'Part-time'
               : job.job_employment_type === 'CONTRACT'  ? 'Contract'
               : job.job_employment_type === 'INTERN'    ? 'Internship'
               : 'Full-time',
    salary:      job.job_min_salary && job.job_max_salary
      ? `${job.job_salary_currency || 'USD'} ${fmtK(job.job_min_salary)}–${fmtK(job.job_max_salary)}/yr`
      : null,
    tags:        parseTags((job.job_title || '') + ' ' + (job.job_description || '').slice(0, 300)),
    postedAt:    job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc) : new Date(),
    url:         job.job_apply_link || job.job_url || '#',
    description: (job.job_description || '').slice(0, 800),
    source:      'jsearch',
    category:    job.job_occupation || 'Engineering',
    level:       inferLevel(job.job_title || ''),
  };
}

function normaliseAdzuna(job) {
  return {
    uid:         `adz-${job.id}`,
    title:       job.title          || 'Untitled',
    company:     job.company?.display_name || 'Unknown',
    logo:        null,
    location:    job.location?.display_name || job.location?.area?.join(', ') || 'Remote',
    type:        job.contract_type === 'permanent' ? 'Full-time'
               : job.contract_type === 'contract'   ? 'Contract'
               : 'Full-time',
    salary:      job.salary_min && job.salary_max
      ? `${fmtK(Math.round(job.salary_min))}–${fmtK(Math.round(job.salary_max))}/yr`
      : null,
    tags:        parseTags((job.title || '') + ' ' + (job.description || '').slice(0, 300)),
    postedAt:    job.created ? new Date(job.created) : new Date(),
    url:         job.redirect_url  || '#',
    description: (job.description  || '').slice(0, 800),
    source:      'adzuna',
    category:    job.category?.label || 'Engineering',
    level:       inferLevel(job.title || ''),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   FETCH HEADERS
───────────────────────────────────────────────────────────────────────── */
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; NexusApp/2.0; +https://nexus.dev)',
  'Accept':     'application/json',
};

const LI_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept':          'text/html,application/xhtml+xml',
};

/* ─────────────────────────────────────────────────────────────────────────
   FETCHERS
───────────────────────────────────────────────────────────────────────── */

async function fetchRemotive() {
  const results = [];
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=9999', { headers: HEADERS });
    if (res.ok) {
      const data = await res.json();
      results.push(...(data.jobs ?? []).map(normaliseRemotive));
    }
  } catch (e) { console.warn('[scraper] Remotive error:', e.message); }
  console.log(`[scraper] Remotive  → ${results.length} jobs`);
  return results;
}

async function fetchJobicy() {
  const results = [];
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=50', { headers: HEADERS });
    if (res.ok) {
      const data = await res.json();
      results.push(...(data.jobs ?? []).map(normaliseJobicy));
    }
  } catch (e) { console.warn('[scraper] Jobicy error:', e.message); }
  console.log(`[scraper] Jobicy    → ${results.length} jobs`);
  return results;
}

async function fetchArbeitnow() {
  const results = [];
  for (let page = 1; page <= 10; page++) {
    try {
      const res  = await fetch(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, { headers: HEADERS });
      if (!res.ok) break;
      const text = await res.text();
      if (text.trimStart().startsWith('<')) break;
      const data = JSON.parse(text);
      const jobs = data.data ?? [];
      if (!jobs.length) break;
      results.push(...jobs.map(normaliseArbeitnow));
      if (!data.links?.next) break;
    } catch (_) { break; }
  }
  console.log(`[scraper] Arbeitnow → ${results.length} jobs`);
  return results;
}

const LI_QUERIES = [
  'software engineer','frontend developer','backend developer','full stack developer',
  'data engineer','data scientist','machine learning engineer','devops engineer',
  'cloud engineer','site reliability engineer','platform engineer','security engineer',
  'react developer','python developer','java developer','nodejs developer',
  'typescript developer','golang developer','rust developer','kotlin developer',
  'ios developer','android developer','mobile developer','flutter developer',
  'product manager','ux designer','ui designer','qa engineer','test engineer',
  'embedded software engineer','blockchain developer','game developer',
  'solutions architect','tech lead','engineering manager',
];

async function fetchLinkedIn() {
  const results = [];
  for (const q of LI_QUERIES) {
    let blocked = false;
    for (const start of [0, 25, 50]) {
      if (blocked) break;
      try {
        const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(q)}&location=&f_JT=F&start=${start}&count=25`;
        const res = await fetch(url, { headers: LI_HEADERS });
        if (!res.ok) { blocked = true; break; }
        const html = await res.text();
        if (html.includes('authwall') || html.includes('CAPTCHA')) { blocked = true; break; }
        const $   = cheerio.load(html);
        let count = 0;
        $('li').each((_, el) => {
          const job = normaliseLinkedIn(el, $);
          if (job) { results.push(job); count++; }
        });
        if (count < 25) break;
      } catch (_) { break; }
      await new Promise(r => setTimeout(r, 350));
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`[scraper] LinkedIn  → ${results.length} jobs`);
  return results;
}

async function fetchIndeed() {
  const QUERIES = ['software engineer','full stack developer','data engineer','react developer','python developer'];
  const results = [];
  for (const q of QUERIES) {
    try {
      const url = `https://www.indeed.com/rss?q=${encodeURIComponent(q)}&sort=date&limit=25`;
      const res = await fetch(url, {
        headers: { 'User-Agent': LI_HEADERS['User-Agent'], 'Accept': 'application/rss+xml,text/xml' },
      });
      if (!res.ok) continue;
      const xml   = await res.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      for (const item of items) {
        const job = normaliseIndeedItem(item);
        if (job) results.push(job);
      }
    } catch (_) { /* skip */ }
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`[scraper] Indeed    → ${results.length} jobs`);
  return results;
}

async function fetchWellfound() {
  const results = [];
  try {
    const res = await fetch(
      'https://angel.co/api/1/jobs?job_types%5B%5D=full-time&job_types%5B%5D=contract&page=1',
      { headers: { ...HEADERS, 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }
    );
    if (res.ok) {
      const data = await res.json();
      const jobs = data.jobs ?? data.job_listings ?? [];
      results.push(...jobs.map(normaliseWellfound));
    }
  } catch (_) { /* graceful fail */ }

  if (!results.length) {
    try {
      const res2 = await fetch('https://wellfound.com/api/v1/jobs?page=1&remote=true', {
        headers: { ...HEADERS, 'Accept': 'application/json' },
      });
      if (res2.ok) {
        const data2 = await res2.json();
        (data2.jobs ?? []).forEach(j => results.push(normaliseWellfound(j)));
      }
    } catch (_) { /* skip */ }
  }
  console.log(`[scraper] Wellfound → ${results.length} jobs`);
  return results;
}

async function fetchNaukri() {
  const KEYWORDS_NK = ['software developer','frontend developer','backend developer','full stack','data scientist','devops'];
  const results     = [];
  const NK_HEADERS  = {
    'User-Agent': LI_HEADERS['User-Agent'],
    'Accept':     'application/json',
    'appid':      '109',
    'systemid':   '109',
    'Referer':    'https://www.naukri.com/',
    'Origin':     'https://www.naukri.com',
  };
  for (const kw of KEYWORDS_NK) {
    try {
      const url = `https://www.naukri.com/jobapi/v3/search?noOfResults=20&urlType=search_by_keyword&searchType=adv&keyword=${encodeURIComponent(kw)}&sort=r&typeId=1%2C4`;
      const res = await fetch(url, { headers: NK_HEADERS });
      if (!res.ok) continue;
      const data = await res.json();
      (data.jobDetails ?? []).forEach(j => results.push(normaliseNaukri(j)));
    } catch (_) { /* skip */ }
    await new Promise(r => setTimeout(r, 250));
  }
  console.log(`[scraper] Naukri    → ${results.length} jobs`);
  return results;
}

async function fetchFoundit() {
  const results = [];
  try {
    const res = await fetch(
      'https://www.foundit.in/middleware/jobsearch/api/v2/search?searchId=&query=software+developer&location=&page=0&sort=recency&limit=25&experienceRanges=0~3',
      { headers: { 'User-Agent': LI_HEADERS['User-Agent'], 'Accept': 'application/json', 'Referer': 'https://www.foundit.in/' } }
    );
    if (res.ok) {
      const data = await res.json();
      (data.jobDetails ?? data.jobs ?? []).forEach(j => results.push(normaliseFoundit(j)));
    }
  } catch (_) { /* skip */ }
  console.log(`[scraper] Foundit   → ${results.length} jobs`);
  return results;
}

async function fetchTheMuse() {
  const results  = [];
  const BATCH    = 10;
  const MAX_PAGE = 199;
  try {
    for (let batchStart = 0; batchStart <= MAX_PAGE; batchStart += BATCH) {
      const pages   = Array.from({ length: BATCH }, (_, i) => batchStart + i).filter(p => p <= MAX_PAGE);
      const fetches = pages.map(p =>
        fetch(`https://www.themuse.com/api/public/jobs?page=${p}`, { headers: HEADERS })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      );
      const settled = await Promise.all(fetches);
      let batchEmpty = true;
      for (const data of settled) {
        if (!data) continue;
        const batch = data.results ?? [];
        if (batch.length) { batch.forEach(j => results.push(normaliseMuse(j))); batchEmpty = false; }
      }
      if (batchEmpty) break;
    }
  } catch (e) { console.warn('[scraper] TheMuse error:', e.message); }
  console.log(`[scraper] TheMuse   → ${results.length} jobs`);
  return results;
}

async function fetchJSearch() {
  if (!process.env.RAPIDAPI_KEY) {
    console.log('[scraper] JSearch   → skipped (no RAPIDAPI_KEY)');
    return [];
  }
  const queries = ['software engineer remote', 'react developer', 'python developer', 'data engineer'];
  const results = [];
  for (const q of queries) {
    try {
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q)}&page=1&num_pages=2&date_posted=month`,
        { headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' } }
      );
      if (!res.ok) { console.warn(`[scraper] JSearch query "${q}" → HTTP ${res.status}`); continue; }
      const data = await res.json();
      (data.data ?? []).forEach(j => results.push(normaliseJSearch(j)));
    } catch (e) { console.warn('[scraper] JSearch fetch error:', e.message); }
  }
  console.log(`[scraper] JSearch   → ${results.length} jobs`);
  return results;
}

async function fetchAdzuna() {
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
    console.log('[scraper] Adzuna    → skipped (no ADZUNA credentials)');
    return [];
  }
  const terms   = ['software engineer', 'frontend developer', 'backend developer', 'data scientist'];
  const results = [];
  for (const term of terms) {
    for (const country of ['gb', 'us', 'in']) {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=50&what=${encodeURIComponent(term)}&content-type=application/json`;
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) { console.warn(`[scraper] Adzuna ${country} "${term}" → HTTP ${res.status}`); continue; }
        const data = await res.json();
        (data.results ?? []).forEach(j => results.push(normaliseAdzuna(j)));
      } catch (e) { console.warn('[scraper] Adzuna fetch error:', e.message); }
    }
  }
  console.log(`[scraper] Adzuna    → ${results.length} jobs`);
  return results;
}

/* ─────────────────────────────────────────────────────────────────────────
   DEDUP  –  by uid, then cross-source by URL
───────────────────────────────────────────────────────────────────────── */
function dedup(arr) {
  const seenUid = new Set();
  const seenUrl = new Set();
  return arr.filter(j => {
    if (seenUid.has(j.uid)) return false;
    const urlKey = j.url?.replace(/[?#].*$/, '').toLowerCase();
    if (urlKey && urlKey !== '#' && seenUrl.has(urlKey)) return false;
    seenUid.add(j.uid);
    if (urlKey && urlKey !== '#') seenUrl.add(urlKey);
    return true;
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────── */

/**
 * Runs all 11 sources in parallel, deduplicates, and returns a sorted array.
 * Each individual fetcher fails gracefully so the others always complete.
 * @returns {Promise<NormalisedJob[]>}
 */
async function scrapeAll() {
  console.log('[scraper] Starting scrape across all 11 sources…');
  const [r, j, a, li, ind, wf, nk, fnd, muse, jsrch, adz] = await Promise.allSettled([
    fetchRemotive(),
    fetchJobicy(),
    fetchArbeitnow(),
    fetchLinkedIn(),
    fetchIndeed(),
    fetchWellfound(),
    fetchNaukri(),
    fetchFoundit(),
    fetchTheMuse(),
    fetchJSearch(),
    fetchAdzuna(),
  ]);

  const combined = dedup([
    ...(r.status     === 'fulfilled' ? r.value     : []),
    ...(j.status     === 'fulfilled' ? j.value     : []),
    ...(a.status     === 'fulfilled' ? a.value     : []),
    ...(li.status    === 'fulfilled' ? li.value    : []),
    ...(ind.status   === 'fulfilled' ? ind.value   : []),
    ...(wf.status    === 'fulfilled' ? wf.value    : []),
    ...(nk.status    === 'fulfilled' ? nk.value    : []),
    ...(fnd.status   === 'fulfilled' ? fnd.value   : []),
    ...(muse.status  === 'fulfilled' ? muse.value  : []),
    ...(jsrch.status === 'fulfilled' ? jsrch.value : []),
    ...(adz.status   === 'fulfilled' ? adz.value   : []),
  ]);

  combined.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  console.log(`[scraper] Done — ${combined.length} unique jobs after dedup`);
  return combined;
}

module.exports = { scrapeAll };
