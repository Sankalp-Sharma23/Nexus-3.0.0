import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from "./Navbar";
import Footer from './Footer';
import {
  Briefcase, TrendingUp, Calendar, Clock,
  ChevronLeft, ChevronRight,
  X, Search,
  Zap, Target, Award, Code2, Database, Cpu,
  CheckCircle, Flame, Trophy, Star, Play, ArrowRight,
  Layers, BarChart2, ExternalLink, GripVertical, Sparkles,
  BookOpen, MonitorPlay, Filter, Globe, Rocket, Users,
} from 'lucide-react';
import '../styles/PlacementPortal.css';

/* ─────────────────────────── JOB PLATFORMS ─────────────────────────── */
// Each platform has:
//   baseUrl  – opens platform homepage / all jobs
//   searchUrl – replace {q} with encoded query to land on search results
const PLATFORMS = [
  // ── FULL-TIME JOBS ──
  {
    id: 1, category: 'jobs', featured: true,
    name: 'LinkedIn Jobs',
    tagline: 'World\'s largest professional network',
    description: 'Best for full-time roles at MNCs, startups, and remote positions. Biggest recruiter-to-candidate pipeline globally.',
    tags: ['Full-time', 'MNCs', 'Remote', 'Experienced'],
    listings: '10M+ jobs',
    color: '#0077B5',
    emoji: '💼',
    baseUrl: 'https://www.linkedin.com/jobs/',
    searchUrl: 'https://www.linkedin.com/jobs/search/?keywords={q}&location=India',
  },
  {
    id: 2, category: 'jobs', featured: true,
    name: 'Naukri',
    tagline: 'India\'s No.1 job portal',
    description: 'Dominant in the Indian market for tech and non-tech roles. Top choice for campus drives, IT services & product companies.',
    tags: ['Full-time', 'India', 'IT', 'Freshers'],
    listings: '1M+ jobs',
    color: '#4A90E2',
    emoji: '🇮🇳',
    baseUrl: 'https://www.naukri.com/',
    searchUrl: 'https://www.naukri.com/{q}-jobs',
  },
  {
    id: 3, category: 'jobs', featured: false,
    name: 'Wellfound',
    tagline: 'The startup job board',
    description: 'Formerly AngelList Talent. The go-to platform for seed-to-Series C startup roles with equity compensation.',
    tags: ['Startups', 'Equity', 'Remote', 'Product'],
    listings: '130K+ jobs',
    color: '#e05d44',
    emoji: '🚀',
    baseUrl: 'https://wellfound.com/jobs',
    searchUrl: 'https://wellfound.com/jobs?q={q}',
  },
  {
    id: 4, category: 'jobs', featured: false,
    name: 'Indeed India',
    tagline: 'Jobs aggregated from all over the web',
    description: 'Aggregates listings from company career pages, boards, and direct postings. Huge volume across all industries.',
    tags: ['All Industries', 'Freshers', 'Experienced'],
    listings: '500K+ jobs',
    color: '#2164f3',
    emoji: '🔍',
    baseUrl: 'https://in.indeed.com/',
    searchUrl: 'https://in.indeed.com/jobs?q={q}&l=India',
  },
  {
    id: 5, category: 'jobs', featured: false,
    name: 'Glassdoor',
    tagline: 'Jobs + real company reviews',
    description: 'Research salaries, read employee reviews, and apply directly. Perfect for evaluating company culture before applying.',
    tags: ['Salary Insights', 'Reviews', 'Full-time'],
    listings: '200K+ jobs',
    color: '#0CAA41',
    emoji: '🪟',
    baseUrl: 'https://www.glassdoor.co.in/Job/index.htm',
    searchUrl: 'https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword={q}',
  },
  {
    id: 6, category: 'jobs', featured: false,
    name: 'Cutshort',
    tagline: 'AI-powered tech hiring',
    description: 'Referral-based, AI-matched professional network. Strong in product and SDE roles at Indian tech startups.',
    tags: ['AI Matching', 'Referrals', 'Tech', 'Startups'],
    listings: '50K+ jobs',
    color: '#7c3aed',
    emoji: '⚡',
    baseUrl: 'https://cutshort.io/jobs',
    searchUrl: 'https://cutshort.io/jobs?q={q}',
  },
  {
    id: 7, category: 'jobs', featured: false,
    name: 'Instahyre',
    tagline: 'Premium tech talent matching',
    description: 'Curated high-quality tech roles from top companies. Algorithm matches you to jobs based on your skills and experience.',
    tags: ['Premium', 'Tech', 'Curated', 'High CTC'],
    listings: '20K+ jobs',
    color: '#f97316',
    emoji: '🎯',
    baseUrl: 'https://www.instahyre.com/engineer-jobs/',
    searchUrl: 'https://www.instahyre.com/search-jobs/?q={q}',
  },
  {
    id: 8, category: 'jobs', featured: false,
    name: 'Shine',
    tagline: 'Jobs for every career stage',
    description: 'Strong for IT, BPO, and core engineering roles. Good coverage of Tier-2 city opportunities and mid-level positions.',
    tags: ['IT', 'BPO', 'Mid-level', 'Tier-2 Cities'],
    listings: '400K+ jobs',
    color: '#e11d48',
    emoji: '✨',
    baseUrl: 'https://www.shine.com/',
    searchUrl: 'https://www.shine.com/job-search/q-{q}-jobs/',
  },

  // ── INTERNSHIPS ──
  {
    id: 9, category: 'internships', featured: true,
    name: 'Internshala',
    tagline: 'India\'s #1 internship platform',
    description: 'The dominant platform for student internships in India. Listed by 25,000+ companies across tech, design, marketing & more.',
    tags: ['Students', 'Stipend', 'Certificate', 'India'],
    listings: '50K+ internships',
    color: '#009688',
    emoji: '🎓',
    baseUrl: 'https://internshala.com/internships/',
    searchUrl: 'https://internshala.com/internships/{q}-internship/',
  },
  {
    id: 10, category: 'internships', featured: true,
    name: 'Unstop',
    tagline: 'Competitions, jobs & internships',
    description: 'Formerly D2C. Combines hackathons, competitions, and internship listings. Great for building a competitive profile.',
    tags: ['Competitions', 'Internships', 'Students', 'Prizes'],
    listings: '10K+ opportunities',
    color: '#8b5cf6',
    emoji: '🏅',
    baseUrl: 'https://unstop.com/opportunities/internships',
    searchUrl: 'https://unstop.com/internships?opportunity=internships&query={q}',
  },
  {
    id: 11, category: 'internships', featured: false,
    name: 'LetsIntern',
    tagline: 'Verified internship opportunities',
    description: 'Focused purely on internships with direct applications. Verified listings from companies without recruitment fees.',
    tags: ['Verified', 'Free Apply', 'Students'],
    listings: '5K+ internships',
    color: '#0ea5e9',
    emoji: '📋',
    baseUrl: 'https://www.letsintern.com/',
    searchUrl: 'https://www.letsintern.com/internships/search?keyword={q}',
  },
  {
    id: 12, category: 'internships', featured: false,
    name: 'Freshersworld',
    tagline: 'Off-campus freshers & interns',
    description: 'Specialized in off-campus fresher jobs and internships from Indian companies. Good for 2024-26 pass-out batches.',
    tags: ['Freshers', 'Off-campus', 'Entry-level'],
    listings: '30K+ listings',
    color: '#16a34a',
    emoji: '🌱',
    baseUrl: 'https://www.freshersworld.com/',
    searchUrl: 'https://www.freshersworld.com/jobs/jobsearch/{q}-jobs-for-freshers',
  },

  // ── HACKATHONS ──
  {
    id: 13, category: 'hackathons', featured: true,
    name: 'Devfolio',
    tagline: 'India\'s premier hackathon platform',
    description: 'Hosts 500+ hackathons yearly. Build, submit, win. Your Devfolio profile acts as your developer portfolio for recruiters.',
    tags: ['Hackathons', 'Portfolio', 'Web3', 'India'],
    listings: '500+ events/yr',
    color: '#3730a3',
    emoji: '🛠️',
    baseUrl: 'https://devfolio.co/hackathons',
    searchUrl: 'https://devfolio.co/hackathons',
  },
  {
    id: 14, category: 'hackathons', featured: true,
    name: 'Devpost',
    tagline: 'Global hackathon community',
    description: 'The largest global hackathon community. Online & in-person events with massive prize pools from top tech companies.',
    tags: ['Global', 'Big Prizes', 'Online', 'In-person'],
    listings: '1000+ events/yr',
    color: '#003E54',
    emoji: '🌍',
    baseUrl: 'https://devpost.com/hackathons',
    searchUrl: 'https://devpost.com/hackathons?challenge_type=all&search={q}',
  },
  {
    id: 15, category: 'hackathons', featured: false,
    name: 'HackerEarth',
    tagline: 'Coding challenges & hackathons',
    description: 'Competitive programming challenges, sprint hackathons, and hiring challenges by top companies including Google & Amazon.',
    tags: ['Competitive', 'Hiring Challenges', 'DSA'],
    listings: '200+ challenges',
    color: '#2a6ebb',
    emoji: '💡',
    baseUrl: 'https://www.hackerearth.com/challenges/hackathon/',
    searchUrl: 'https://www.hackerearth.com/challenges/hackathon/',
  },
  {
    id: 16, category: 'hackathons', featured: false,
    name: 'MLH (Major League Hacking)',
    tagline: 'Official student hackathon league',
    description: 'The official collegiate hackathon league. Attend 200+ MLH-sanctioned events globally and build your hacker reputation.',
    tags: ['Students', 'Global', '200+ events', 'Swag'],
    listings: '200+ events/yr',
    color: '#ff6f61',
    emoji: '🏆',
    baseUrl: 'https://mlh.io/seasons/2026/events',
    searchUrl: 'https://mlh.io/seasons/2026/events',
  },

  // ── REMOTE ──
  {
    id: 17, category: 'remote', featured: true,
    name: 'We Work Remotely',
    tagline: 'The largest remote job board',
    description: 'Largest dedicated remote job board with 3M+ monthly visitors. Quality over quantity — all listings are fully remote.',
    tags: ['100% Remote', 'Global', 'Tech', 'USD Pay'],
    listings: '4K+ jobs',
    color: '#2563eb',
    emoji: '🌐',
    baseUrl: 'https://weworkremotely.com/',
    searchUrl: 'https://weworkremotely.com/remote-jobs/search?term={q}',
  },
  {
    id: 18, category: 'remote', featured: false,
    name: 'Remote OK',
    tagline: 'Remote jobs for digital nomads',
    description: 'Curated remote tech jobs. Known for transparent salary ranges. Strong in dev, design, and marketing roles.',
    tags: ['Transparent Salaries', 'Tech', 'Global'],
    listings: '10K+ jobs',
    color: '#059669',
    emoji: '🏝️',
    baseUrl: 'https://remoteok.com/',
    searchUrl: 'https://remoteok.com/remote-{q}-jobs',
  },
  {
    id: 19, category: 'remote', featured: false,
    name: 'Remotive',
    tagline: 'Hand-curated remote tech jobs',
    description: 'Carefully curated remote jobs from top tech companies. Includes a community newsletter and Slack group for remote workers.',
    tags: ['Curated', 'Newsletter', 'Community'],
    listings: '3K+ jobs',
    color: '#7c3aed',
    emoji: '📡',
    baseUrl: 'https://remotive.com/',
    searchUrl: 'https://remotive.com/remote-jobs/software-dev/{q}',
  },
  {
    id: 20, category: 'remote', featured: false,
    name: 'Remote.co',
    tagline: 'Remote jobs across all categories',
    description: 'Covers remote roles beyond tech — marketing, customer support, HR, and project management alongside developer roles.',
    tags: ['All Roles', 'Non-tech too', 'Part-time'],
    listings: '5K+ jobs',
    color: '#0891b2',
    emoji: '🖥️',
    baseUrl: 'https://remote.co/remote-jobs/',
    searchUrl: 'https://remote.co/remote-jobs/search/?search_keywords={q}',
  },
];

const KANBAN_COLUMNS = [
  { id: 'bookmarked', label: 'Bookmarked', color: '#f59e0b', icon: '🔖' },
  { id: 'applied', label: 'Applied', color: '#3b82f6', icon: '📤' },
  { id: 'assessment', label: 'Assessment / DSA', color: '#8b5cf6', icon: '💻' },
  { id: 'interview', label: 'Interview', color: '#10b981', icon: '🎙️' },
  { id: 'offer', label: 'Offer', color: '#22c55e', icon: '🏆' },
  { id: 'rejected', label: 'Rejected', color: '#ef4444', icon: '🚫' },
];

const INITIAL_KANBAN = {
  bookmarked: [
    { id: 'k1', title: 'Senior Frontend Engineer', company: 'Stripe', logo: 'https://ui-avatars.com/api/?name=Stripe&background=635BFF&color=fff', salary: '20–30 LPA', appliedDate: 'Jan 10' },
    { id: 'k2', title: 'ML Engineer', company: 'Sarvam AI', logo: 'https://ui-avatars.com/api/?name=Sarvam&background=8b5cf6&color=fff', salary: '16–26 LPA', appliedDate: 'Jan 12' },
  ],
  applied: [
    { id: 'k3', title: 'Full Stack Developer', company: 'Razorpay', logo: 'https://ui-avatars.com/api/?name=Razorpay&background=3395FF&color=fff', salary: '14–22 LPA', appliedDate: 'Feb 2' },
  ],
  assessment: [
    { id: 'k4', title: 'Backend Engineer', company: 'CRED', logo: 'https://ui-avatars.com/api/?name=CRED&background=1a1a2e&color=fff', salary: '18–28 LPA', appliedDate: 'Feb 8' },
  ],
  interview: [
    { id: 'k5', title: 'Data Engineer', company: 'PhonePe', logo: 'https://ui-avatars.com/api/?name=PhonePe&background=5f259f&color=fff', salary: '13–20 LPA', appliedDate: 'Feb 14' },
  ],
  offer: [],
  rejected: [
    { id: 'k6', title: 'Security Engineer', company: 'Flipkart', logo: 'https://ui-avatars.com/api/?name=Flipkart&background=F0931E&color=fff', salary: '18–26 LPA', appliedDate: 'Jan 28' },
  ],
};

const HACKATHONS = [
  { id: 1, name: 'HackMIT 2026', date: 'Mar 14–16', prize: '$50,000', mode: 'In-person', theme: 'AI / Climate', org: 'MIT', color: '#a21caf' },
  { id: 2, name: 'ETHIndia 2026', date: 'Mar 22–24', prize: '$80,000', mode: 'In-person', theme: 'Web3 / DeFi', org: 'Devfolio', color: '#1d4ed8' },
  { id: 3, name: 'Smart India Hackathon', date: 'Apr 5–6', prize: '₹1,00,000', mode: 'In-person', theme: 'GovTech', org: 'MoE', color: '#059669' },
  { id: 4, name: 'Hack the North', date: 'Apr 18–20', prize: '$30,000', mode: 'Hybrid', theme: 'Open', org: 'Waterloo', color: '#b45309' },
  { id: 5, name: 'Devpost Global', date: 'May 1–3', prize: '$25,000', mode: 'Online', theme: 'HealthTech', org: 'Devpost', color: '#be185d' },
];

const MOCK_TESTS = [
  { id: 1, title: 'OOP Concepts Deep Dive', questions: 25, duration: '30 min', difficulty: 'Medium', icon: <Code2 size={20} />, color: '#8b5cf6' },
  { id: 2, title: 'DBMS & SQL Mastery', questions: 30, duration: '40 min', difficulty: 'Hard', icon: <Database size={20} />, color: '#3b82f6' },
  { id: 3, title: 'Operating Systems', questions: 20, duration: '25 min', difficulty: 'Hard', icon: <Cpu size={20} />, color: '#10b981' },
  { id: 4, title: 'System Design Primer', questions: 15, duration: '45 min', difficulty: 'Expert', icon: <Layers size={20} />, color: '#f59e0b' },
  { id: 5, title: 'DSA Blitz Round', questions: 40, duration: '60 min', difficulty: 'Hard', icon: <Zap size={20} />, color: '#ef4444' },
  { id: 6, title: 'CN & Networking', questions: 20, duration: '25 min', difficulty: 'Medium', icon: <BarChart2 size={20} />, color: '#06b6d4' },
];

function genHeatmap() {
  const days = [];
  for (let i = 0; i < 365; i++) {
    const rand = Math.random();
    days.push(rand < 0.35 ? 0 : rand < 0.55 ? 1 : rand < 0.72 ? 2 : rand < 0.87 ? 3 : 4);
  }
  return days;
}
const HEATMAP = genHeatmap();

/* ─────────────────────────── CONFETTI ─────────────────────────── */
function spawnConfetti(containerRef) {
  if (!containerRef.current) return;
  const colors = ['#8b5cf6', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#f97316'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-particle';
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${4 + Math.random() * 6}px;
      height: ${4 + Math.random() * 6}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${0.8 + Math.random() * 0.8}s;
      animation-delay: ${Math.random() * 0.3}s;
    `;
    containerRef.current.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}

/* ─────────────────────────── PROGRESS RING ─────────────────────────── */
function ProgressRing({ value, label, color, size = 96 }) {
  const [animated, setAnimated] = useState(0);
  const circumference = 2 * Math.PI * 36;
  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 300);
    return () => clearTimeout(t);
  }, [value]);
  const offset = circumference - (animated / 100) * circumference;
  return (
    <div className="progress-ring-wrap">
      <svg width={size} height={size} viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r="36" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        <text x="48" y="52" textAnchor="middle" fill="#f1f5f9" fontSize="15" fontWeight="700">{value}%</text>
      </svg>
      <span className="progress-ring-label">{label}</span>
    </div>
  );
}

/* ─────────────────────────── SKELETON ─────────────────────────── */
/* helper — build redirect URL substituting {q} */
function buildPlatformUrl(platform, query) {
  if (!query || !query.trim()) return platform.baseUrl;
  return platform.searchUrl.replace('{q}', encodeURIComponent(query.trim()));
}

/* ─────────────────────────── PLATFORM CARD ─────────────────────────── */
function PlatformCard({ platform, searchQuery, index }) {
  const [pulse, setPulse] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 500);
    const url = buildPlatformUrl(platform, searchQuery);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      className={`platform-card${pulse ? ' pulse-once' : ''}${platform.featured ? ' pc-featured-card' : ''}`}
      style={{ '--pc': platform.color }}
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onClick={handleClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* Animated glow border on hover */}
      <motion.div
        className="pc-glow-border"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        style={{ '--pc': platform.color }}
      />

      {/* top row: icon + badge */}
      <div className="pc-top-row">
        <motion.div
          className="pc-icon"
          style={{ background: `${platform.color}22`, color: platform.color }}
          animate={{ scale: hovered ? 1.08 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {platform.emoji}
        </motion.div>
        {platform.featured && (
          <motion.span
            className="featured-badge pc-featured"
            animate={{ scale: hovered ? 1.05 : 1 }}
          >
            <Sparkles size={11} /> Top Pick
          </motion.span>
        )}
      </div>

      {/* name + tagline */}
      <h3 className="pc-name">{platform.name}</h3>
      <p className="pc-tagline" style={{ color: platform.color }}>{platform.tagline}</p>
      <p className="pc-desc">{platform.description}</p>

      {/* tags */}
      <div className="pc-tags">
        {platform.tags.map((t, i) => (
          <span key={i} className="jc-tag">{t}</span>
        ))}
      </div>

      {/* footer */}
      <div className="pc-footer">
        <span className="pc-listings">
          <Briefcase size={13} /> {platform.listings}
        </span>
        <motion.button
          className="pc-explore-btn"
          style={{ '--pc': platform.color }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={e => { e.stopPropagation(); handleClick(); }}
        >
          {searchQuery && searchQuery.trim() ? 'Search Here' : 'Explore'}
          <ExternalLink size={13} />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── DISCOVERY FEED ─────────────────────────── */
const CATEGORY_TABS = [
  { id: 'all',         label: 'All Platforms', icon: <Layers size={14} /> },
  { id: 'jobs',        label: 'Jobs',          icon: <Briefcase size={14} /> },
  { id: 'internships', label: 'Internships',   icon: <BookOpen size={14} /> },
  { id: 'hackathons',  label: 'Hackathons',    icon: <Code2 size={14} /> },
  { id: 'remote',      label: 'Remote',        icon: <MonitorPlay size={14} /> },
];

const QUICK_CHIPS = [
  'React Developer', 'Data Science', 'UI/UX Design',
  'Machine Learning', 'Backend Engineer', 'Frontend Intern',
  'Full Stack', 'DevOps', 'Android Developer',
];

function DiscoveryFeed() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const searchRef = useRef(null);

  const filtered = PLATFORMS.filter(p =>
    category === 'all' || p.category === category
  );

  const featuredPlatforms = filtered.filter(p => p.featured);
  const regularPlatforms  = filtered.filter(p => !p.featured);

  return (
    <div className="discovery-feed">

      {/* ── Animated header banner ── */}
      <motion.div
        className="df-hero-banner"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="df-hero-bg" />
        <div className="df-hero-content">
          <div className="df-hero-left">
            <motion.div
              className="df-hero-icon-wrap"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Globe size={22} />
            </motion.div>
            <div>
              <h2 className="df-hero-title">Discover Opportunities</h2>
              <p className="df-hero-sub">Find your next role across {PLATFORMS.length} curated platforms</p>
            </div>
          </div>
          <div className="df-hero-stats-row">
            {[
              { icon: <Briefcase size={14}/>, val: '12M+', label: 'Active Roles' },
              { icon: <Rocket size={14}/>,   val: '500+',  label: 'Hackathons/yr' },
              { icon: <Users size={14}/>,    val: '50K+',  label: 'Internships' },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="df-mini-stat"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
              >
                {s.icon}
                <span className="df-ms-val">{s.val}</span>
                <span className="df-ms-lbl">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Search bar ── */}
      <motion.div
        className="discover-topbar"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="search-wrap">
          <Search size={17} className="search-icon" />
          <input
            ref={searchRef}
            className="search-input"
            placeholder='Type a role, e.g. "React Developer" or "Data Science Intern"…'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <AnimatePresence>
            {search && (
              <motion.button
                className="search-clear-btn"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                onClick={() => setSearch('')}
              >
                <X size={15} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Quick-search chips ── */}
      <motion.div
        className="quick-chips-row"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <span className="qc-label"><Zap size={13} /> Quick search:</span>
        {QUICK_CHIPS.map((chip, i) => (
          <motion.button
            key={chip}
            className={`quick-chip ${search === chip ? 'active' : ''}`}
            onClick={() => setSearch(prev => prev === chip ? '' : chip)}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.03 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {chip}
          </motion.button>
        ))}
      </motion.div>

      {/* ── Search hint banner ── */}
      <AnimatePresence>
        {search.trim() && (
          <motion.div
            className="search-hint-banner"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: '0.75rem' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Target size={15} />
            Clicking a platform will search <strong>"{search.trim()}"</strong> directly on that site
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category tabs ── */}
      <motion.div
        className="category-tabs"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            className={`cat-tab ${category === tab.id ? 'active' : ''}`}
            onClick={() => setCategory(tab.id)}
          >
            {tab.icon}
            {tab.label}
            <span className="cat-count">
              {tab.id === 'all' ? PLATFORMS.length : PLATFORMS.filter(p => p.category === tab.id).length}
            </span>
          </button>
        ))}
      </motion.div>

      {/* ── Grid header ── */}
      <motion.div
        className="discover-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <span className="discover-count">
          {filtered.length} platforms · {featuredPlatforms.length} top picks
        </span>
        {!search.trim() && (
          <span className="discover-hint">
            <Zap size={13} /> Type a role above to search directly on any platform
          </span>
        )}
      </motion.div>

      {/* ── Featured Platforms row ── */}
      <AnimatePresence mode="wait">
        {featuredPlatforms.length > 0 && (
          <motion.div
            key={category + '-featured'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="df-section-label">
              <Sparkles size={13} />
              <span>Top Picks</span>
              <div className="df-section-line" />
            </div>
            <div className="jobs-masonry df-featured-grid">
              {featuredPlatforms.map((platform, i) => (
                <PlatformCard key={platform.id} platform={platform} searchQuery={search} index={i} />
              ))}
            </div>
            {regularPlatforms.length > 0 && (
              <div className="df-section-label df-section-label-mt">
                <Globe size={13} />
                <span>All Platforms</span>
                <div className="df-section-line" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Regular platform grid ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={category + '-regular'}
          className="jobs-masonry"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {(featuredPlatforms.length > 0 ? regularPlatforms : filtered).map((platform, i) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              searchQuery={search}
              index={i}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── KANBAN BOARD ─────────────────────────── */
function AppTracker() {
  const [columns, setColumns] = useState(INITIAL_KANBAN);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const offerRef = useRef(null);

  const handleDragStart = (e, card, fromCol) => {
    setDragging({ card, fromCol });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setDragOver(colId);
  };

  const handleDrop = (e, toCol) => {
    e.preventDefault();
    if (!dragging || dragging.fromCol === toCol) {
      setDragging(null); setDragOver(null); return;
    }
    setColumns(prev => {
      const next = { ...prev };
      next[dragging.fromCol] = prev[dragging.fromCol].filter(c => c.id !== dragging.card.id);
      next[toCol] = [...prev[toCol], dragging.card];
      return next;
    });
    if (toCol === 'offer') {
      setTimeout(() => spawnConfetti(offerRef), 150);
    }
    setDragging(null); setDragOver(null);
  };

  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  return (
    <div className="kanban-board">
      <div className="kanban-header">
        <h3>Application Tracker</h3>
        <p>Drag cards across stages to track your progress</p>
      </div>
      <div className="kanban-columns">
        {KANBAN_COLUMNS.map(col => (
          <div
            key={col.id}
            className={`kanban-col ${dragOver === col.id ? 'drag-over' : ''}`}
            ref={col.id === 'offer' ? offerRef : null}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            onDragLeave={() => setDragOver(null)}
          >
            <div className="kanban-col-header" style={{ '--col-color': col.color }}>
              <span className="col-icon">{col.icon}</span>
              <span className="col-label">{col.label}</span>
              <span className="col-count">{columns[col.id].length}</span>
            </div>
            <div className="kanban-cards">
              {columns[col.id].map(card => (
                <div
                  key={card.id}
                  className={`kanban-card ${dragging?.card.id === card.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card, col.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="kc-drag"><GripVertical size={14} /></div>
                  <div className="kc-body">
                    <img src={card.logo} alt={card.company} className="kc-logo" />
                    <div>
                      <p className="kc-title">{card.title}</p>
                      <p className="kc-company">{card.company}</p>
                      <p className="kc-salary">{card.salary}</p>
                    </div>
                  </div>
                  <div className="kc-date"><Clock size={11} /> {card.appliedDate}</div>
                </div>
              ))}
              {columns[col.id].length === 0 && (
                <div className="kanban-empty">Drop cards here</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── PREP ARENA ─────────────────────────── */
function PrepArena() {
  const [hackIdx, setHackIdx] = useState(0);

  const readiness = [
    { label: 'DSA', value: 68, color: '#8b5cf6' },
    { label: 'System Design', value: 55, color: '#3b82f6' },
    { label: 'Core CS', value: 80, color: '#10b981' },
    { label: 'Profile', value: 85, color: '#f59e0b' },
  ];

  const currentStreak = 14;
  const longestStreak = 31;

  return (
    <div className="prep-arena">
      <div className="prep-top-row">
        <div className="prep-card streak-card">
          <div className="streak-title"><Flame size={20} /> Daily Coding Streak</div>
          <div className="streak-stats">
            <div className="streak-stat">
              <span className="streak-big" style={{ color: '#f59e0b' }}>{currentStreak}</span>
              <span className="streak-sub">Current Streak</span>
            </div>
            <div className="streak-divider" />
            <div className="streak-stat">
              <span className="streak-big" style={{ color: '#8b5cf6' }}>{longestStreak}</span>
              <span className="streak-sub">Longest Streak</span>
            </div>
            <div className="streak-divider" />
            <div className="streak-stat">
              <span className="streak-big" style={{ color: '#10b981' }}>{HEATMAP.filter(d => d > 0).length}</span>
              <span className="streak-sub">Total Active Days</span>
            </div>
          </div>
          <div className="heatmap-wrap">
            <div className="heatmap-grid">
              {HEATMAP.map((val, i) => (
                <div
                  key={i}
                  className="heatmap-cell"
                  data-val={val}
                  title={`Day ${i + 1}: ${val === 0 ? 'No activity' : val === 1 ? 'Light' : val === 2 ? 'Moderate' : val === 3 ? 'Active' : 'Intense'}`}
                />
              ))}
            </div>
            <div className="heatmap-legend">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map(v => <div key={v} className="heatmap-cell" data-val={v} />)}
              <span>More</span>
            </div>
          </div>
        </div>

        <div className="prep-card readiness-card">
          <div className="readiness-title"><Target size={20} /> Interview Readiness</div>
          <div className="readiness-rings">
            {readiness.map((r) => (
              <ProgressRing key={r.label} value={r.value} label={r.label} color={r.color} />
            ))}
          </div>
          <div className="readiness-tip">
            <Sparkles size={14} />
            <span>Boost your DSA score to unlock 40% more matches</span>
          </div>
        </div>
      </div>

      <div className="prep-card hackathon-card">
        <div className="hack-header">
          <div className="hack-title"><Trophy size={20} /> Hackathon Radar</div>
          <div className="hack-nav">
            <button onClick={() => setHackIdx(i => Math.max(0, i - 1))} disabled={hackIdx === 0}><ChevronLeft size={18} /></button>
            <button onClick={() => setHackIdx(i => Math.min(HACKATHONS.length - 1, i + 1))} disabled={hackIdx === HACKATHONS.length - 1}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="hack-carousel">
          <div
            className="hack-track"
            style={{ transform: `translateX(calc(-${hackIdx} * (var(--hack-card-w) + 1.25rem)))` }}
          >
            {HACKATHONS.map(h => (
              <div key={h.id} className="hack-card" style={{ '--hc-color': h.color }}>
                <div className="hc-top">
                  <span className="hc-theme">{h.theme}</span>
                  <span className="hc-mode">{h.mode}</span>
                </div>
                <h4 className="hc-name">{h.name}</h4>
                <p className="hc-org">{h.org}</p>
                <div className="hc-details">
                  <span><Calendar size={13} />{h.date}</span>
                  <span><Trophy size={13} />{h.prize}</span>
                </div>
                <button className="hc-btn">Register <ArrowRight size={14} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="hack-dots">
          {HACKATHONS.map((_, i) => (
            <button key={i} className={`hack-dot ${i === hackIdx ? 'active' : ''}`} onClick={() => setHackIdx(i)} />
          ))}
        </div>
      </div>

      <div className="prep-card mock-tests-card">
        <div className="mt-header">
          <div className="mt-title"><BookOpen size={20} /> Mock Assessment Hub</div>
          <span className="mt-subtitle">Sharpen your interview skills</span>
        </div>
        <div className="mt-grid">
          {MOCK_TESTS.map(t => (
            <div key={t.id} className="mt-card" style={{ '--mt-color': t.color }}>
              <div className="mt-icon" style={{ background: `${t.color}18` }}>{t.icon}</div>
              <div className="mt-body">
                <p className="mt-name">{t.title}</p>
                <div className="mt-meta">
                  <span>{t.questions} Q's</span>
                  <span>·</span>
                  <span>{t.duration}</span>
                  <span>·</span>
                  <span className="mt-diff" data-diff={t.difficulty.toLowerCase()}>{t.difficulty}</span>
                </div>
              </div>
              <button className="mt-play"><Play size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
const PLacementPortal = () => {
  const [activePage, setActivePage] = useState('discovery');

  const tabs = [
    { id: 'discovery', label: 'Discovery Feed', icon: <Search size={16} /> },
    { id: 'tracker', label: 'App Tracker', icon: <Layers size={16} /> },
  ];

  return (
    <div className="placement-portal-v2">
      <Navbar theme="dark" />

      <section className="pp-hero">
        <div className="pp-hero-inner">
          <div className="pp-hero-text">
            <h1>Placement <span className="gradient-word">Portal</span></h1>
            <p>Discover roles, track applications, and sharpen your skills — all in one place.</p>
          </div>
          <div className="pp-hero-stats">
            {[
              { label: 'Active Roles', value: '12K+', icon: <Briefcase size={18} />, color: '#8b5cf6' },
              { label: 'Applications', value: '24', icon: <TrendingUp size={18} />, color: '#3b82f6' },
              { label: 'Interviews', value: '3', icon: <Calendar size={18} />, color: '#10b981' },
              { label: 'Profile Score', value: '85%', icon: <Award size={18} />, color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} className="pp-stat" style={{ '--sc': s.color }}>
                <div className="pp-stat-icon">{s.icon}</div>
                <div>
                  <div className="pp-stat-val">{s.value}</div>
                  <div className="pp-stat-lbl">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className="sub-nav">
        <div className="sub-nav-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`sub-nav-btn ${activePage === tab.id ? 'active' : ''}`}
              onClick={() => setActivePage(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="pp-content">
        <div className={`pp-page ${activePage === 'discovery' ? 'visible' : 'hidden'}`}>
          <DiscoveryFeed />
        </div>
        <div className={`pp-page ${activePage === 'tracker' ? 'visible' : 'hidden'}`}>
          <AppTracker />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PLacementPortal;
