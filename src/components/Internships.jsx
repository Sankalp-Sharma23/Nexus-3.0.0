import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Building2, MapPin, Clock, DollarSign, Briefcase,
  Search, Filter, ChevronRight, TrendingUp, Award,
  Users, Calendar, X, ArrowRight, Zap, Star, ExternalLink, ArrowLeft
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import LightRays from './LightRays';
import '../styles/Internships.css';

/* ─────────────────────────────────────────────────────────────
   MAGNETIC CURSOR HOOK
   ───────────────────────────────────────────────────────────── */
function useMagnetic(strength = 0.35) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left - width  / 2) * strength;
    const y = (e.clientY - top  - height / 2) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }, [strength]);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'translate(0,0)';
  }, []);
  return { ref, onMove, onLeave };
}

/* ─────────────────────────────────────────────────────────────
   3-D TILT CARD
   ───────────────────────────────────────────────────────────── */
const TiltCard = ({ children, className, onClick, layoutId }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    el.style.transform = `perspective(800px) rotateX(${y * -12}deg) rotateY(${x * 12}deg) scale3d(1.025,1.025,1.025)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
  };
  return (
    <motion.div layoutId={layoutId} ref={ref} className={className}
      onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      initial={{ opacity: 0, scale: 0.88, y: 50 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ANIMATED NEON CTA BUTTON
   ───────────────────────────────────────────────────────────── */
const NeonButton = ({ children, className, onClick }) => {
  const mag = useMagnetic(0.4);
  return (
    <button
      ref={mag.ref} className={`int-neon-btn ${className || ''}`}
      onMouseMove={mag.onMove} onMouseLeave={mag.onLeave} onClick={onClick}
    >
      {children}
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────
   EXPAND DETAIL OVERLAY
   ───────────────────────────────────────────────────────────── */
const DetailOverlay = ({ internship, onClose }) => {
  if (!internship) return null;
  const fmtDeadline = (d, opts) => { try { return d ? new Date(d).toLocaleDateString('en-US', opts) : 'Rolling'; } catch { return 'Rolling'; } };
  return (
    <AnimatePresence>
      <motion.div className="int-overlay-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          layoutId={`card-${internship.id}`}
          className="int-overlay-card"
          onClick={e => e.stopPropagation()}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
          <button className="int-overlay-close" onClick={onClose}><X size={20} /></button>

          <div className="int-overlay-header">
            <div className="int-overlay-logo">{internship.company[0]}</div>
            <div>
              <h2 className="int-overlay-company">{internship.company}</h2>
              <p className="int-overlay-role">{internship.position}</p>
            </div>
            {internship.featured && <span className="int-overlay-featured"><Star size={13} /> Featured</span>}
          </div>

          <motion.div className="int-overlay-body"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="int-detail-grid">
              {[
                { icon: MapPin,     label: 'Location',  val: internship.location  },
                { icon: Clock,      label: 'Duration',  val: internship.duration  },
                { icon: DollarSign, label: 'Stipend',   val: internship.stipend   },
              { icon: Users,     label: 'Applicants',val: internship.applicants ? internship.applicants + ' applied' : 'N/A' },
                { icon: Calendar,   label: 'Deadline',  val: fmtDeadline(internship.deadline, { month:'long', day:'numeric', year:'numeric' }) },
                { icon: Briefcase,  label: 'Type',      val: internship.type      },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="int-detail-item">
                  <span className="int-detail-icon"><Icon size={15} /></span>
                  <div>
                    <span className="int-detail-label">{label}</span>
                    <span className="int-detail-val">{val}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="int-overlay-section">
              <h4>Tech Stack</h4>
              <div className="int-pill-row">
                {internship.tags.map(t => <span key={t} className="int-glass-pill">{t}</span>)}
              </div>
            </div>

            <div className="int-overlay-section">
              <h4>What you'll do</h4>
              <p className="int-overlay-desc">
                Join the {internship.company} team as a {internship.position}. Work alongside world-class engineers,
                ship production code, and build skills that last a lifetime. This role is ideal for students
                who move fast and love building real-world impact.
              </p>
            </div>

            <NeonButton className="int-apply-neon" onClick={() => internship.url && internship.url !== '#' && window.open(internship.url, '_blank')}>
              Apply Now <ExternalLink size={15} />
            </NeonButton>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
/* ── Normalise API response → card-compatible shape ─────── */
function normalizeApiInternship(i, idx) {
  const fmtApplicants = n => {
    const num = parseInt(String(n).replace(/[^0-9]/g, ''), 10);
    if (!num || num <= 0) return null;
    return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : String(num);
  };
  return {
    id:         i._id || i.uid || `api-${idx}`,
    company:    i.organizer || 'Company',
    position:   i.title    || 'Internship',
    location:   i.location || 'India',
    type:       i.mode === 'Online' ? 'Remote' : i.mode === 'Hybrid' ? 'Hybrid' : 'On-Site',
    duration:   i.duration || null,
    stipend:    i.stipend  || null,
    deadline:   i.deadline || null,
    tags:       Array.isArray(i.tags) ? i.tags : [],
    applicants: i.applicants ? fmtApplicants(i.applicants) : null,
    featured:   !!(i.featured),
    category:   i.category || 'general',
    url:        i.url      || '#',
    logo:       i.logo     || null,
    source:     i.source   || 'unknown',
  };
}

const Internships = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const deepLinkDone = useRef(false);
  const [searchQuery, setSearchQuery]           = useState('');
  const [selectedFilter, setSelectedFilter]     = useState('all');
  const [activeInternship, setActiveInternship] = useState(null);
  const [apiInternships, setApiInternships]     = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [totalCompanies, setTotalCompanies]     = useState(0);

  const { scrollY } = useScroll();
  const heroY  = useTransform(scrollY, [0, 500], [0, 130]);
  const heroOp = useTransform(scrollY, [0, 350], [1, 0]);

  useEffect(() => {
    fetch('/api/internships?limit=500')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const items = (data.internships || []).map(normalizeApiInternship);
        setApiInternships(items);
        const companies = new Set(items.map(i => i.company).filter(Boolean));
        setTotalCompanies(companies.size);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* Deep-link: open a specific internship card when navigated from Dashboard */
  useEffect(() => {
    if (!location.state?.openId || !apiInternships.length || deepLinkDone.current) return;
    const target = apiInternships.find(i => String(i._id || i.id) === String(location.state.openId));
    if (target) { setActiveInternship(target); deepLinkDone.current = true; }
  }, [apiInternships, location.state]);

  // ── REAL DATA ONLY ──────────────────────────────────────────────────────
  const internships = apiInternships;

  const openCount   = apiInternships.filter(i => !i.deadline || new Date(i.deadline) >= new Date()).length;
  const stats = [
    { icon: Briefcase, label: 'Active Openings',   value: loading ? '…' : (openCount  > 0 ? `${openCount.toLocaleString()}+`  : '3,200+'), trend: '+18%' },
    { icon: Building2, label: 'Partner Companies', value: loading ? '…' : (totalCompanies > 0 ? String(totalCompanies) : '480'),           trend: '+11%' },
    { icon: Users,     label: 'Students Placed',   value: '24K+',                                                                           trend: '+31%' },
    { icon: Award,     label: 'Avg Stipend',        value: '₹15k+/mo',                                                                      trend: '+19%' },
  ];

  const filters = ['all', 'engineering', 'data', 'design', 'product', 'marketing', 'finance', 'general'];

  const filtered = internships.filter(i => {
    const matchFilter = selectedFilter === 'all' || i.category === selectedFilter;
    const matchSearch = !searchQuery ||
      i.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchFilter && matchSearch;
  });

  return (
    <div className="int-page">
      <Navbar />

      {/* ── Back to Experience Hub ── */}
      <motion.button
        className="exp-back-btn"
        onClick={() => navigate('/experience-hub')}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ x: -3 }}
      >
        <ArrowLeft size={16} />
        Experience Hub
      </motion.button>

      {/* LightRays background */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#a78bfa"
        raysSpeed={0.6}
        lightSpread={0.55}
        rayLength={2.5}
        followMouse={true}
        mouseInfluence={0.12}
        noiseAmount={0.05}
        distortion={0.08}
        pulsating={false}
        fadeDistance={1.2}
        saturation={1.4}
        className="int-light-rays"
      />

      {/* Mesh gradient blobs */}
      <div className="int-mesh-bg">
        <div className="int-blob int-blob-1" />
        <div className="int-blob int-blob-2" />
        <div className="int-blob int-blob-3" />
      </div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="int-hero">
        <motion.div className="int-hero-content" style={{ y: heroY, opacity: heroOp }}>
          <motion.div className="int-hero-badge"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Briefcase size={13} /> The Hunter
          </motion.div>

          <motion.h1 className="int-hero-title"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            Land Your Dream
            <span className="int-gradient-text"> Internship</span>
          </motion.h1>

          <motion.p className="int-hero-sub"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.65 }}
          >
            Curated roles from the world's most ambitious companies.<br />
            Apply smarter. Land faster.
          </motion.p>

          {/* Search */}
          <motion.div className="int-search-wrap"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.6 }}
          >
            <Search size={17} className="int-search-icon" />
            <input
              className="int-search-input"
              placeholder="Search role, company, or tech stack…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </motion.div>

          {/* Filter pills */}
          <motion.div className="int-filter-row"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {filters.map(f => (
              <button key={f}
                className={`int-filter-pill ${selectedFilter === f ? 'active' : ''}`}
                onClick={() => setSelectedFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section className="int-stats-bar">
        {stats.map(({ icon: Icon, label, value, trend }, i) => (
          <motion.div key={label} className="int-stat-item"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.5 }}
          >
            <span className="int-stat-icon"><Icon size={18} /></span>
            <span className="int-stat-val">{value}</span>
            <span className="int-stat-label">{label}</span>
            <span className="int-stat-trend"><TrendingUp size={11} />{trend}</span>
          </motion.div>
        ))}
      </section>

      {/* ── BENTO GRID ───────────────────────────────────────── */}
      <section className="int-bento-section">
        <motion.div className="int-section-header"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <h2>Featured Opportunities
            <span className="int-count-badge">{filtered.length}</span>
          </h2>
        </motion.div>

        {/* Loading skeletons */}
        {loading && (
          <div className="int-skeleton-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="int-skeleton-card" />
            ))}
          </div>
        )}

        {/* No data from server */}
        {!loading && internships.length === 0 && (
          <div className="int-empty-state">
            <Briefcase size={40} className="int-empty-icon" />
            <h3>No internships found</h3>
            <p>The server couldn&apos;t load data. Make sure the backend is running.</p>
          </div>
        )}

        {/* No filter matches */}
        {!loading && internships.length > 0 && filtered.length === 0 && (
          <div className="int-empty-state">
            <Search size={40} className="int-empty-icon" />
            <h3>No matches</h3>
            <p>Try a different search term or category filter.</p>
          </div>
        )}

        <div className="int-bento-grid">
          {!loading && filtered.map((intern, idx) => (
            <TiltCard
              key={intern.id}
              layoutId={`card-${intern.id}`}
              className={`int-card ${intern.featured ? 'int-card-featured' : ''}`}
              onClick={() => setActiveInternship(intern)}
            >
              {/* animated border */}
              <div className="int-card-border-anim" />

              {intern.featured && (
                <div className="int-featured-chip"><Star size={11} /> Featured</div>
              )}

              <div className="int-card-top">
                <div className="int-company-avatar">{intern.company?.[0] || '?'}</div>
                <div className="int-card-meta">
                  <span className="int-company-name">{intern.company}</span>
                  <span className="int-location"><MapPin size={12} />{intern.location}</span>
                </div>
                {intern.stipend && <span className="int-stipend-badge">{intern.stipend}</span>}
              </div>

              <h3 className="int-card-position">{intern.position}</h3>

              <div className="int-pill-row">
                {intern.tags.map(t => <span key={t} className="int-glass-pill">{t}</span>)}
              </div>

              <div className="int-card-row">
                {intern.duration  && <span className="int-card-info"><Clock size={13} />{intern.duration}</span>}
                {intern.applicants && <span className="int-card-info"><Users size={13} />{intern.applicants}</span>}
                {intern.deadline  && <span className="int-card-info"><Calendar size={13} />{(() => { try { return new Date(intern.deadline).toLocaleDateString('en-US',{ month:'short', day:'numeric' }); } catch { return '—'; } })()}</span>}
              </div>

              <NeonButton className="int-apply-btn" onClick={e => { e.stopPropagation(); if (intern.url && intern.url !== '#') window.open(intern.url, '_blank'); }}>
                Apply Now <ArrowRight size={15} style={{ display: 'inline', marginLeft: 4 }} />
              </NeonButton>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="int-cta">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.65 }}
        >
          <h2>Don't see your dream role?</h2>
          <p>Set up smart alerts and get notified the moment it drops.</p>
          <NeonButton className="int-cta-btn">
            Create Alert <Zap size={15} />
          </NeonButton>
        </motion.div>
      </section>

      <Footer />

      {/* ── DETAIL OVERLAY ──────────────────────────────────── */}
      <AnimatePresence>
        {activeInternship && (
          <DetailOverlay
            internship={activeInternship}
            onClose={() => setActiveInternship(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Internships;
