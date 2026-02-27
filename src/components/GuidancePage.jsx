import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Terminal, Zap, Users, Clock, ChevronRight, Search, Filter, PlusCircle, GitBranch, BookOpen, Award } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/GuidancePage.css';

/* ─── Demo dossier data ────────────────────────────────────── */
const DOSSIERS = [
  { id: 'alex-sde-google',      name: 'Alex Chen',      initials: 'AC', hue: '#00F0FF', status: 'HIRED',     role: 'Software Engineer',        company: 'Google',     totalTime: '9 Months',  skills: ['React','Python','GCP','DSA'],            category: 'swe',     batch: '2025' },
  { id: 'priya-ml-microsoft',   name: 'Priya Sharma',   initials: 'PS', hue: '#a78bfa', status: 'HIRED',     role: 'ML Engineer',               company: 'Microsoft',  totalTime: '11 Months', skills: ['PyTorch','Azure','ONNX','C++'],           category: 'ml',      batch: '2025' },
  { id: 'marcus-de-stripe',     name: 'Marcus Webb',    initials: 'MW', hue: '#39FF14', status: 'HIRED',     role: 'Backend Engineer',          company: 'Stripe',     totalTime: '7 Months',  skills: ['Go','Postgres','gRPC','K8s'],            category: 'swe',     batch: '2025' },
  { id: 'sara-pm-meta',         name: 'Sara Okonkwo',   initials: 'SO', hue: '#fb923c', status: 'OFFER',     role: 'Product Manager',           company: 'Meta',       totalTime: '6 Months',  skills: ['Figma','SQL','A/B Testing','PRD'],       category: 'product', batch: '2025' },
  { id: 'dev-sre-amazon',       name: 'Dev Patel',      initials: 'DP', hue: '#f59e0b', status: 'HIRED',     role: 'SRE',                       company: 'Amazon',     totalTime: '8 Months',  skills: ['Terraform','AWS','Prometheus','Python'], category: 'devops',  batch: '2025' },
  { id: 'lisa-fs-airbnb',       name: 'Lisa Tanaka',    initials: 'LT', hue: '#f472b6', status: 'HIRED',     role: 'Full-Stack Engineer',       company: 'Airbnb',     totalTime: '10 Months', skills: ['Next.js','Ruby','Redis','TypeScript'],   category: 'swe',     batch: '2026' },
  { id: 'james-ds-netflix',     name: 'James Oduya',    initials: 'JO', hue: '#ef4444', status: 'HIRED',     role: 'Data Scientist',            company: 'Netflix',    totalTime: '12 Months', skills: ['Spark','Kafka','Scala','Tableau'],       category: 'ml',      batch: '2026' },
  { id: 'nina-ios-apple',       name: 'Nina Kowalski',  initials: 'NK', hue: '#00F0FF', status: 'INTERVIEW', role: 'iOS Developer',             company: 'Apple',      totalTime: '5 Months',  skills: ['Swift','SwiftUI','CoreML','Xcode'],      category: 'mobile',  batch: '2026' },
  { id: 'ryan-sec-palantir',    name: 'Ryan Blake',     initials: 'RB', hue: '#39FF14', status: 'HIRED',     role: 'Security Engineer',         company: 'Palantir',   totalTime: '14 Months', skills: ['Rust','Cryptography','Linux','C'],       category: 'devops',  batch: '2026' },
  { id: 'aisha-ux-figma',       name: 'Aisha Diallo',   initials: 'AD', hue: '#c026d3', status: 'HIRED',     role: 'UX Engineer',               company: 'Figma',      totalTime: '6 Months',  skills: ['React','Figma','GSAP','CSS'],            category: 'design',  batch: '2026' },
  { id: 'tom-cloud-snowflake',  name: 'Tom Hernandez',  initials: 'TH', hue: '#06b6d4', status: 'OFFER',     role: 'Cloud Architect',           company: 'Snowflake',  totalTime: '8 Months',  skills: ['SQL','dbt','GCP','Airflow'],             category: 'devops',  batch: '2025' },
  { id: 'mei-quant-citadel',    name: 'Mei Zhang',      initials: 'MZ', hue: '#fbbf24', status: 'HIRED',     role: 'Quant Developer',           company: 'Citadel',    totalTime: '10 Months', skills: ['C++','Python','Statistics','CUDA'],      category: 'ml',      batch: '2025' },
];

const CATEGORIES = ['all', 'swe', 'ml', 'devops', 'product', 'design', 'mobile'];
const STATUS_COLOR = { HIRED: '#39FF14', OFFER: '#00F0FF', INTERVIEW: '#f59e0b' };

/* ─── Crosshair-corner dossier card ───────────────────────── */
const DossierCard = ({ d, onClick }) => (
  <motion.div
    className="gp-card"
    style={{ '--accent': d.hue }}
    onClick={() => onClick(d.id)}
    initial={{ opacity: 0, y: 32, scale: 0.96 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ scale: 1.02 }}
  >
    {/* corner crosshairs */}
    <span className="gp-ch gp-ch-tl" />
    <span className="gp-ch gp-ch-tr" />
    <span className="gp-ch gp-ch-bl" />
    <span className="gp-ch gp-ch-br" />

    {/* status bar */}
    <div className="gp-card-bar">
      <span className="gp-prompt">&#62;</span>
      <span className="gp-bar-status" style={{ color: STATUS_COLOR[d.status] ?? '#00F0FF' }}>
        STATUS: {d.status}
      </span>
      <span className="gp-bar-sep">|</span>
      <span className="gp-bar-role">ROLE: {d.role.toUpperCase()}</span>
    </div>

    {/* avatar + company */}
    <div className="gp-card-identity">
      <div className="gp-avatar" style={{ '--accent': d.hue }}>
        <span className="gp-initials">{d.initials}</span>
        <div className="gp-avatar-scanline" />
        <div className="gp-avatar-duotone" style={{ background: `linear-gradient(145deg, ${d.hue}22, #0A0F1A88)` }} />
      </div>
      <div className="gp-name-block">
        <span className="gp-candidate-name">{d.name}</span>
        <span className="gp-company">
          <span className="gp-company-dot" style={{ background: d.hue }} />
          {d.company}
        </span>
        <span className="gp-time"><Clock size={11} /> {d.totalTime}</span>
      </div>
    </div>

    {/* tech stack pills */}
    <div className="gp-skills">
      {d.skills.map(s => (
        <span key={s} className="gp-skill-pill">{s}</span>
      ))}
    </div>

    {/* CTA */}
    <div className="gp-card-footer">
      <span className="gp-batch">BATCH_{d.batch}</span>
      <span className="gp-read-more">
        READ_DOSSIER <ChevronRight size={13} />
      </span>
    </div>
  </motion.div>
);

/* ─── Main page ────────────────────────────────────────────── */
const GuidancePage = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const { scrollY } = useScroll();
  const gridY = useTransform(scrollY, [0, 1000], [0, -200]);

  const filtered = DOSSIERS.filter(d => {
    const matchCat = category === 'all' || d.category === category;
    const q = query.toLowerCase();
    const matchQ = !q || d.name.toLowerCase().includes(q) ||
      d.role.toLowerCase().includes(q) || d.company.toLowerCase().includes(q) ||
      d.skills.some(s => s.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  return (
    <div className="gp-page" ref={containerRef}>
      <Navbar />

      {/* Parallax grid layer */}
      <motion.div className="gp-grid-bg" style={{ y: gridY }} aria-hidden />

      {/* scan line overlay */}
      <div className="gp-scanlines" aria-hidden />

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="gp-hero">
        <motion.div className="gp-hero-inner"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="gp-hero-badge">
            <Zap size={12} />
            <span>GUIDANCE DIRECTORY — v2.0.26</span>
          </div>
          <h1 className="gp-hero-title">
            The <span className="gp-cyan">Blueprint</span>
          </h1>
          <p className="gp-hero-sub">
            Verified roadmaps from students who made it. Every node, every resource,
            every interview question — documented and open.
          </p>

          <div className="gp-hero-meta">
            <span className="gp-meta-item"><Users size={13} />{DOSSIERS.length} Dossiers</span>
            <span className="gp-meta-sep" />
            <span className="gp-meta-item"><Terminal size={13} />100% Verified</span>
            <span className="gp-meta-sep" />
            <span className="gp-meta-item" style={{ color: '#39FF14' }}><Zap size={13} />Live Updates</span>
          </div>

        </motion.div>
      </section>

      {/* ── CONTROLS ──────────────────────────────────────────── */}
      <div className="gp-controls">
        <div className="gp-search-wrap">
          <Search size={14} className="gp-search-icon" />
          <input
            className="gp-search"
            placeholder="SEARCH_QUERY //"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="gp-filter-row">
          <Filter size={13} className="gp-filter-icon" />
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`gp-filter-btn ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── GRID ────────────────────────────────────────────────── */}
      <section className="gp-grid-wrap">
        <div className="gp-sys-header">
          <span className="gp-sys-line">// QUERY RESULT: {filtered.length} RECORDS FOUND</span>
          <span className="gp-blink">▮</span>
        </div>

        {filtered.length > 0 ? (
          <div className="gp-grid">
            {filtered.map(d => (
              <DossierCard key={d.id} d={d} onClick={id => navigate(`/guidance/${id}`)} />
            ))}
          </div>
        ) : (
          <div className="gp-empty">
            <Terminal size={32} />
            <p>NO RECORDS MATCH QUERY.</p>
          </div>
        )}
      </section>

      {/* ── CONTRIBUTE CTA ─────────────────────────────────── */}
      <section className="gp-contribute">
        <div className="gp-contribute-inner">

          {/* top label */}
          <motion.div className="gp-contrib-eyebrow"
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="gp-contrib-badge"><Zap size={11} /> OPEN_CONTRIBUTION</span>
          </motion.div>

          {/* heading */}
          <motion.h2 className="gp-contrib-title"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.08 }}>
            You made it.<br />
            <span className="gp-contrib-accent">Now help the next one.</span>
          </motion.h2>

          <motion.p className="gp-contrib-sub"
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.14 }}>
            Every dossier in this directory was built by a student who got the offer
            and came back to document the path. Your prep notes, your LeetCode streak,
            your system design breakdown — it's someone else's blueprint.
          </motion.p>

          {/* value props */}
          <motion.div className="gp-contrib-cards"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.2 }}>
            <div className="gp-contrib-card">
              <div className="gp-contrib-card-icon" style={{ color: '#00F0FF' }}>
                <BookOpen size={22} />
              </div>
              <h4>Document Your Path</h4>
              <p>Build a node-by-node timeline — courses, grind stats, projects, interview rounds. Every field matters.</p>
            </div>
            <div className="gp-contrib-card">
              <div className="gp-contrib-card-icon" style={{ color: '#39FF14' }}>
                <GitBranch size={22} />
              </div>
              <h4>Share Real Questions</h4>
              <p>Log the exact interview questions you were asked and the approach that worked. No fluff, only signal.</p>
            </div>
            <div className="gp-contrib-card">
              <div className="gp-contrib-card-icon" style={{ color: '#a78bfa' }}>
                <Award size={22} />
              </div>
              <h4>Get Credited</h4>
              <p>Your dossier appears in the directory with your name, role, and company. Your story stays live forever.</p>
            </div>
          </motion.div>

          {/* terminal prompt + CTA */}
          <motion.div className="gp-contrib-cta"
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.28 }}>
            <div className="gp-contrib-prompt">
              <span className="gp-contrib-prompt-line">&gt; INITIALIZING NEXUS PATHWAY...</span>
              <span className="gp-contrib-prompt-line">&gt; ENTER TARGET DESTINATION:<span className="gp-blink"> ▮</span></span>
            </div>
            <motion.button
              className="gp-share-btn"
              onClick={() => navigate('/guidance/build')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <PlusCircle size={15} />
              Share Your Experience
            </motion.button>
            <p className="gp-contrib-note">Takes ~15 min &nbsp;·&nbsp; Auto-saved locally &nbsp;·&nbsp; Live immediately</p>
          </motion.div>

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GuidancePage;
