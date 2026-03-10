import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import {
  Briefcase, MapPin, Clock, DollarSign, Search, X, Filter,
  BookmarkPlus, Bookmark, ExternalLink, ChevronRight, Loader2,
  TrendingUp, Calendar, ChevronLeft, ChevronDown,
  Globe, SlidersHorizontal, Rocket,
  Building2, Star, RefreshCw, Zap, Wifi, WifiOff,
} from 'lucide-react';
import '../styles/PlacementPortal.css';

 //  HELPERS

function timeAgo(dateStr) {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5)  return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function companyAvatar(company) {
  const colors = ['635BFF','3395FF','8b5cf6','059669','f59e0b','e11d48','0891b2','7c3aed'];
  const idx = company.charCodeAt(0) % colors.length;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(company)}&background=${colors[idx]}&color=fff&size=64&bold=true&format=svg`;
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const TYPE_COLORS = {
  'Full-time':  { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  text: '#34d399' },
  'Part-time':  { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  text: '#60a5fa' },
  'Contract':   { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24' },
  'Freelance':  { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',  text: '#a78bfa' },
  'Internship': { bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.3)',  text: '#f472b6' },
};
const LEVEL_COLORS = {
  'Senior':    { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   text: '#f87171' },
  'Mid-level': { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)', text: '#60a5fa' },
  'Junior':    { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', text: '#34d399' },
  'Manager':   { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
  'Intern':    { bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.25)', text: '#a78bfa' },
};

  // JOB CARD

const BIG_TECH = [
  'google','meta','facebook','amazon','apple','microsoft','netflix','openai',
  'nvidia','tesla','uber','airbnb','lyft','twitter','x corp','linkedin',
  'salesforce','adobe','oracle','ibm','intel','qualcomm','amd','samsung',
  'spotify','stripe','square','paypal','shopify','atlassian','dropbox',
  'slack','zoom','palantir','snowflake','databricks','coinbase','bytedance',
  'tiktok','instacart','doordash','robinhood','twilio','cloudflare',
  'mongodb','elastic','hashicorp','github','gitlab','jetbrains',
  'vmware','citrix','dell','hp','cisco','broadcom','arm','asml',
];

function isBigTechCompany(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return BIG_TECH.some(b => n.includes(b));
}

function JobCard({ job, index, onSelect, isSelected, bookmarked, onBookmark }) {
  const tc = TYPE_COLORS[job.type]   ?? TYPE_COLORS['Full-time'];
  const lc = LEVEL_COLORS[job.level] ?? LEVEL_COLORS['Mid-level'];
  const bigTech = isBigTechCompany(job.company);

  return (
    <motion.div
      className={`jb-card ${isSelected ? 'jb-card--selected' : ''} ${bigTech ? 'jb-card--bigtech' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onSelect(job)}
      layout
    >
      {/* Logo */}
      <div className="jb-logo-wrap">
        <img
          className="jb-logo"
          src={job.logo || companyAvatar(job.company)}
          alt={job.company}
          onError={e => { e.target.src = companyAvatar(job.company); }}
        />
        <span className="jb-source-dot" data-source={job.source} title={`Via ${job.source}`} />
      </div>

      {/* Body */}
      <div className="jb-body">
        <div className="jb-title-row">
          <h3 className="jb-title">{job.title}</h3>
          <div className="jb-badges">
            {bigTech && <span className="jb-badge jb-badge--bigtech">⭐ Top Company</span>}
            <span className="jb-badge" style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text }}>{job.type}</span>
            <span className="jb-badge" style={{ background: lc.bg, border: `1px solid ${lc.border}`, color: lc.text }}>{job.level}</span>
          </div>
        </div>

        <div className="jb-meta-row">
          <span className="jb-meta-item"><Building2 size={13} />{job.company}</span>
          <span className="jb-meta-item"><Globe     size={13} />{job.location}</span>
          {job.salary && (
            <span className="jb-meta-item jb-salary"><DollarSign size={13} />{job.salary}</span>
          )}
          <span className="jb-meta-item jb-time"><Clock size={13} />{timeAgo(job.postedAt)}</span>
        </div>

        {job.tags.length > 0 && (
          <div className="jb-tags">
            {job.tags.slice(0, 5).map(t => <span key={t} className="jb-tag">{t}</span>)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="jb-actions">
        <button
          className={`jb-bookmark ${bookmarked ? 'jb-bookmark--active' : ''}`}
          onClick={e => { e.stopPropagation(); onBookmark(job.id); }}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          {bookmarked ? <Bookmark size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
        </button>
        <button className="jb-view-btn" onClick={() => onSelect(job)}>
          View <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

 //  SKELETON

function JobSkeleton({ count = 6 }) {
  return (
    <div className="jb-skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="jb-skeleton">
          <div className="jb-sk-logo sk-shine" />
          <div className="jb-sk-body">
            <div className="sk-shine" style={{ height: 18, width: '50%', borderRadius: 6, marginBottom: 10 }} />
            <div className="sk-shine" style={{ height: 13, width: '32%', borderRadius: 5, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {[70, 58, 82, 50].map((w, j) => (
                <div key={j} className="sk-shine" style={{ height: 22, width: w, borderRadius: 20 }} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

 //  JOB DETAIL PANEL

function JobDetailPanel({ job, onClose, bookmarked, onBookmark }) {
  const tc = job ? (TYPE_COLORS[job.type]   ?? TYPE_COLORS['Full-time'])   : {};
  const lc = job ? (LEVEL_COLORS[job.level] ?? LEVEL_COLORS['Mid-level']) : {};

  return (
    <>
      <div className={`jdp-backdrop ${job ? 'visible' : ''}`} onClick={onClose} />
      <div className={`jdp-panel ${job ? 'open' : ''}`}>
        {job && (
          <>
            <div className="jdp-scroll">
              <button className="jdp-close" onClick={onClose}><X size={18} /></button>

              <div className="jdp-header">
                <img
                  className="jdp-logo"
                  src={job.logo || companyAvatar(job.company)}
                  alt={job.company}
                  onError={e => { e.target.src = companyAvatar(job.company); }}
                />
                <div className="jdp-header-text">
                  <h2 className="jdp-title">{job.title}</h2>
                  <p className="jdp-company">{job.company}</p>
                  <div className="jdp-chips">
                    <span className="jdp-chip" style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text }}>{job.type}</span>
                    <span className="jdp-chip" style={{ background: lc.bg, border: `1px solid ${lc.border}`, color: lc.text }}>{job.level}</span>
                  </div>
                </div>
              </div>

              <div className="jdp-meta-grid">
                <div className="jdp-meta-item"><Globe size={15} /><div><span>Location</span><strong>{job.location}</strong></div></div>
                <div className="jdp-meta-item"><Clock size={15} /><div><span>Posted</span><strong>{timeAgo(job.postedAt)}</strong></div></div>
                {job.salary && <div className="jdp-meta-item"><DollarSign size={15} /><div><span>Salary</span><strong>{job.salary}</strong></div></div>}
                <div className="jdp-meta-item"><Star size={15} /><div><span>Source</span><strong style={{ textTransform: 'capitalize' }}>{job.source}</strong></div></div>
              </div>

              {job.tags.length > 0 && (
                <div className="jdp-section">
                  <h4>Skills & Technologies</h4>
                  <div className="jdp-tags">{job.tags.map(t => <span key={t} className="jdp-tag">{t}</span>)}</div>
                </div>
              )}

              <div className="jdp-section">
                <h4>About the Role</h4>
                <p className="jdp-desc">
                  {stripHtml(job.description).slice(0, 1400) || 'No description available. Click Apply to view full details on the source platform.'}
                </p>
              </div>
            </div>

            <div className="jdp-actions">
              <button
                className={`jdp-bookmark-btn ${bookmarked ? 'active' : ''}`}
                onClick={() => onBookmark(job.id)}
              >
                {bookmarked ? <Bookmark size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
                {bookmarked ? 'Saved' : 'Save'}
              </button>
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="jdp-apply-btn">
                Apply Now <ExternalLink size={15} />
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}

  //  FILTER SIDEBAR

/* Default fallbacks until /api/jobs/filters responds */
const DEFAULT_TYPES   = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];
const DEFAULT_LEVELS  = ['Junior', 'Mid-level', 'Senior', 'Manager', 'Intern'];
const DEFAULT_SOURCES = ['remotive', 'jobicy', 'arbeitnow', 'linkedin', 'themuse'];
const DATE_OPTS = [
  { label: 'Any time',  value: '' },
  { label: 'Last 24h',  value: '1' },
  { label: 'This week', value: '7' },
  { label: 'This month',value: '30' },
  { label: '3 months',  value: '90' },
];
const SOURCE_LABELS = {
  remotive:  'Remotive',
  jobicy:    'Jobicy',
  arbeitnow: 'Arbeitnow',
  linkedin:  'LinkedIn',
  themuse:   'The Muse',
  jsearch:   'JSearch',
  adzuna:    'Adzuna',
};

/* Collapseable filter group wrapper */
function FilterGroup({ title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`jb-filter-group ${open ? 'open' : 'closed'}`}>
      <button className="jb-filter-group-header" onClick={() => setOpen(v => !v)}>
        <span className="jb-filter-label">
          {title}
          {badge > 0 && <span className="jb-filter-badge-inline">{badge}</span>}
        </span>
        <ChevronDown size={13} className="jb-filter-group-chevron" />
      </button>
      <div className="jb-filter-group-body">{children}</div>
    </div>
  );
}

function FilterSidebar({ filters, onChange, total, loading, onClear, filterOptions, onSkillClick }) {
  const types   = filterOptions?.types   ?? DEFAULT_TYPES;
  const levels  = filterOptions?.levels  ?? DEFAULT_LEVELS;
  const sources = filterOptions?.sources ?? DEFAULT_SOURCES;
  const topTags = filterOptions?.topTags ?? [];
  const hasActive = filters.types.length || filters.levels.length || filters.sources.length
    || filters.remote || filters.hasSalary || filters.datePosted;

  const toggle = (key, val) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };
  const setScalar = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <aside className="jb-sidebar">
      <div className="jb-sidebar-header">
        <span><SlidersHorizontal size={14} /> Filters</span>
        {hasActive && <button className="jb-clear-btn" onClick={onClear}><X size={12} /> Clear all</button>}
      </div>

      <div className="jb-sidebar-count">
        {loading ? 'Loading…' : <><strong>{total.toLocaleString()}</strong> jobs found</>}
      </div>

      {/* Job Type */}
      <FilterGroup title="Job Type" badge={filters.types.length}>
        {types.map(t => (
          <label key={t} className={`jb-filter-option ${filters.types.includes(t) ? 'active' : ''}`}>
            <input type="checkbox" checked={filters.types.includes(t)} onChange={() => toggle('types', t)} />
            <span className="jb-checkbox-box" />
            {t}
          </label>
        ))}
      </FilterGroup>

      {/* Experience Level */}
      <FilterGroup title="Experience Level" badge={filters.levels.length}>
        {levels.map(l => (
          <label key={l} className={`jb-filter-option ${filters.levels.includes(l) ? 'active' : ''}`}>
            <input type="checkbox" checked={filters.levels.includes(l)} onChange={() => toggle('levels', l)} />
            <span className="jb-checkbox-box" />
            {l}
          </label>
        ))}
      </FilterGroup>

      {/* Work Mode */}
      <FilterGroup title="Work Mode" badge={filters.remote ? 1 : 0}>
        <label className={`jb-filter-option ${filters.remote ? 'active' : ''}`}
          onClick={() => setScalar('remote', !filters.remote)}>
          <span className="jb-checkbox-box" />
          <Wifi size={13} style={{ flexShrink: 0 }} />
          Remote only
        </label>
      </FilterGroup>

      {/* Date Posted */}
      <FilterGroup title="Date Posted" badge={filters.datePosted ? 1 : 0}>
        <div className="jb-date-btns">
          {DATE_OPTS.map(o => (
            <button key={o.value}
              className={`jb-date-btn ${filters.datePosted === o.value ? 'active' : ''}`}
              onClick={() => setScalar('datePosted', filters.datePosted === o.value ? '' : o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </FilterGroup>

      {/* Salary */}
      <FilterGroup title="Salary" badge={filters.hasSalary ? 1 : 0}>
        <label className={`jb-filter-option ${filters.hasSalary ? 'active' : ''}`}
          onClick={() => setScalar('hasSalary', !filters.hasSalary)}>
          <span className="jb-checkbox-box" />
          <DollarSign size={13} style={{ flexShrink: 0 }} />
          Has salary info
        </label>
      </FilterGroup>

      {/* Source */}
      <FilterGroup title="Source" badge={filters.sources.length}>
        {sources.map(s => (
          <label key={s} className={`jb-filter-option ${filters.sources.includes(s) ? 'active' : ''}`}>
            <input type="checkbox" checked={filters.sources.includes(s)} onChange={() => toggle('sources', s)} />
            <span className="jb-checkbox-box" />
            <span className="jb-source-dot" data-source={s} />
            {SOURCE_LABELS[s] ?? s}
          </label>
        ))}
      </FilterGroup>

      {/* Top Skills */}
      {topTags.length > 0 && (
        <FilterGroup title="Skills" badge={0} defaultOpen={false}>
          <div className="jb-skill-chips">
            {topTags.map(tag => (
              <button key={tag} className="jb-skill-chip"
                onClick={() => onSkillClick && onSkillClick(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}
    </aside>
  );
}

const QUICK_SEARCHES = [
  'Software Engineer', 'Frontend', 'Backend', 'Full Stack',
  'React', 'Node.js', 'Python', 'TypeScript', 'Java', 'Go',
  'DevOps', 'Cloud', 'AWS', 'Kubernetes', 'Docker',
  'Data Engineer', 'Data Science', 'ML Engineer', 'AI', 'LLM',
  'Cybersecurity', 'Mobile', 'iOS', 'Android', 'Flutter',
  'UI/UX', 'Product Manager', 'QA Engineer', 'Blockchain', 'Embedded',
];

function JobBoard() {
  const [jobs,        setJobs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [debouncedQ,  setDebouncedQ]  = useState('');
  const [sort,        setSort]        = useState('newest');
  const [filters,     setFilters]     = useState({
    types: [], levels: [], sources: [],
    remote: false, hasSalary: false, datePosted: '',
  });
  const [filterOptions, setFilterOptions] = useState(null); // loaded from /api/jobs/filters
  const [selectedJob, setSelectedJob] = useState(null);
  const location     = useLocation();
  const deepLinkDone = useRef(false);
  const [bookmarks,   setBookmarks]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('pp-bookmarks') || '[]'); } catch { return []; }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  // Load filter options once on mount
  useEffect(() => {
    fetch('/api/jobs/filters')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFilterOptions(d); })
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 380);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filters]);

  // Fetch
  const fetchJobs = useCallback(async (pg) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: debouncedQ, page: pg, limit: 20 });
      if (filters.types.length)    params.set('types',     filters.types.join(','));
      if (filters.levels.length)   params.set('levels',    filters.levels.join(','));
      if (filters.sources.length)  params.set('sources',   filters.sources.join(','));
      if (filters.remote)          params.set('remote',    'true');
      if (filters.hasSalary)       params.set('hasSalary', 'true');
      if (filters.datePosted)      params.set('datePosted', filters.datePosted);

      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let list = data.jobs ?? [];
      if (sort === 'oldest') list = [...list].reverse();

      setJobs(list);
      setTotal(data.total ?? list.length);
      setPages(data.pages ?? 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, filters, sort]); // eslint-disable-line

  useEffect(() => { fetchJobs(page); }, [page, debouncedQ, filters, sort]); // eslint-disable-line

  /* Deep-link: open a specific job when navigated from Dashboard */
  useEffect(() => {
    if (!location.state?.openJobId || !jobs.length || deepLinkDone.current) return;
    const target = jobs.find(j => String(j._id || j.id) === String(location.state.openJobId));
    if (target) { setSelectedJob(target); deepLinkDone.current = true; }
  }, [jobs, location.state]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await fetch('/api/jobs/refresh', { method: 'POST' }); await fetchJobs(1); }
    finally { setRefreshing(false); }
  };

  const toggleBookmark = id => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('pp-bookmarks', JSON.stringify(next));
      return next;
    });
  };

  const clearFilters = () => setFilters({ types: [], levels: [], sources: [], remote: false, hasSalary: false, datePosted: '' });
  const activeFilterCount = filters.types.length + filters.levels.length + filters.sources.length
    + (filters.remote ? 1 : 0) + (filters.hasSalary ? 1 : 0) + (filters.datePosted ? 1 : 0);

  // Smart windowed pagination helper
  const paginationPages = (current, total) => {
    if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
    const s = new Set([1, 2, total - 1, total]);
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) s.add(i);
    const sorted = [...s].sort((a, b) => a - b);
    const result = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) result.push('gap');
      result.push(p);
      prev = p;
    }
    return result;
  };

  return (
    <div className="jb-root">

      {/* â”€â”€ Search bar â”€â”€ */}
      <div className="jb-searchbar-wrap">
        <div className="jb-search-inner">
          <Search size={18} className="jb-search-icon" />
          <input
            className="jb-search"
            placeholder='Search by title, company, or skill”   e.g. "React Engineer", "Python"'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <AnimatePresence>
            {search && (
              <motion.button className="jb-search-clear"
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="jb-quick-row">
          <span className="jb-quick-label"><Zap size={12} /> Quick:</span>
          {QUICK_SEARCHES.map(q => (
            <button key={q} className={`jb-quick-chip ${search === q ? 'active' : ''}`}
              onClick={() => setSearch(p => p === q ? '' : q)}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* â”€â”€ Layout â”€â”€ */}
      <div className="jb-layout">

        {/* Mobile filter toggle */}
        <button className="jb-mobile-filter-btn" onClick={() => setShowFilters(v => !v)}>
          <Filter size={14} /> Filters
          {activeFilterCount > 0 && <span className="jb-filter-badge">{activeFilterCount}</span>}
        </button>

        {/* Sidebar */}
        <div className={`jb-sidebar-wrap ${showFilters ? 'open' : ''}`}>
          <FilterSidebar
            filters={filters} onChange={setFilters} total={total} loading={loading}
            onClear={clearFilters} filterOptions={filterOptions}
            onSkillClick={tag => { setSearch(tag); setPage(1); }}
          />
        </div>

        {/* Main */}
        <div className="jb-main">

          {/* Sort + refresh */}
          <div className="jb-topbar">
            <span className="jb-result-count">
              {loading ? (
                <span className="jb-loading-label"><Loader2 size={14} className="spin-icon" />  Loading jobs ...</span>
              ) : error ? (
                <span style={{ color: '#f87171' }}>Unable to load jobs — check your connection</span>
              ) : jobs.length === 0 ? (
                <span style={{ color: 'var(--text3, #888)' }}>No jobs match your search</span>
              ) : (
                <><strong>{total.toLocaleString()}</strong>  Jobs found</>
              )}
            </span>
            <div className="jb-topbar-right">
              <select className="jb-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <button className={`jb-refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh} title="Refresh job listings">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <JobSkeleton count={8} />
          ) : error ? (
            <div className="jb-empty-state">
              <Briefcase size={40} style={{ opacity: 0.35 }} />
              <h3>Could not connect to job feed</h3>
              <p>The job data service is temporarily unavailable. Please try again shortly.</p>
              <button className="jb-retry-btn" onClick={() => fetchJobs(page)}><RefreshCw size={14} /> Retry</button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="jb-empty-state">
              <Search size={36} style={{ opacity: 0.35 }} />
              <h3>No jobs found</h3>
              <p>{(filters.types.length || filters.levels.length || filters.sources.length || filters.remote || filters.hasSalary || filters.datePosted)
                ? 'No roles match the selected filters. Try removing some filters or broadening your search.'
                : 'No results for that search. Try different keywords.'}</p>
              <button className="jb-retry-btn" onClick={() => { setSearch(''); clearFilters(); }}>Clear search &amp; filters</button>
            </div>
          ) : (
            <div className="jb-list">
              {jobs.map((job, i) => (
                <JobCard
                  key={job.id}
                  job={job}
                  index={i}
                  onSelect={setSelectedJob}
                  isSelected={selectedJob?.id === job.id}
                  bookmarked={bookmarks.includes(job.id)}
                  onBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && pages > 1 && (
            <div className="jb-pagination">
              <button className="jb-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="jb-page-dots">
                {paginationPages(page, pages).map((p, i) =>
                  p === 'gap'
                    ? <span key={`gap-${i}`} className="jb-page-ellipsis">…</span>
                    : <button key={p} className={`jb-page-num ${page === p ? 'active' : ''}`}
                        onClick={() => setPage(p)}>{p}</button>
                )}
              </div>
              <button className="jb-page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <JobDetailPanel
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        bookmarked={selectedJob ? bookmarks.includes(selectedJob.id) : false}
        onBookmark={toggleBookmark}
      />
    </div>
  );
}

  // MAIN PAGE COMPONENT

const PLacementPortal = () => {
  return (
    <div className="placement-portal-v2">
      <Navbar theme="dark" />

      {/* Hero */}
      <section className="pp-hero">
        <div className="pp-hero-grid" />
        <div className="pp-hero-inner">
          <div className="pp-hero-text">
            <motion.div className="pp-hero-eyebrow" initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.5 }}>
              <Rocket size={13}/> Career Hub
            </motion.div>
            <motion.h1 initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.55, delay:0.05 }}>
              Placement <span className="gradient-word">Portal</span>
            </motion.h1>
            <motion.p initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.12 }}>
              Real job openings aggregated live from LinkedIn, Remotive, Jobicy, Arbeitnow, The Muse &amp; more — updated every 2 hours.
            </motion.p>
          </div>
          <div className="pp-hero-stats">
            {[
              { label:'Live Roles', value:'900+',  icon:<Briefcase size={18}/>, color:'#8b5cf6' },
              { label:'Sources',    value:'5+',   icon:<Globe     size={18}/>, color:'#3b82f6' },
              { label:'Updated',    value:'2h',   icon:<RefreshCw size={18}/>, color:'#10b981' },
            ].map((s,i)=>(
              <motion.div key={i} className="pp-stat" style={{ '--sc':s.color }}
                initial={{ opacity:0, y:24, scale:0.92 }} animate={{ opacity:1, y:0, scale:1 }}
                transition={{ delay:0.15+i*0.08, duration:0.5, ease:[0.22,1,0.36,1] }}
                whileHover={{ y:-4, transition:{ duration:0.18 } }}>
                <div className="pp-stat-icon">{s.icon}</div>
                <div><div className="pp-stat-val">{s.value}</div><div className="pp-stat-lbl">{s.label}</div></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="pp-content">
        <JobBoard/>
      </main>

      <Footer/>
    </div>
  );
};

export default PLacementPortal;
