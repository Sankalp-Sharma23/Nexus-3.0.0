import { useState, useRef } from 'react';
import {
  Briefcase, Zap, ArrowRight, Building2, Rocket,
  Trophy, Calendar, MapPin, Clock, Star, Users,
  DollarSign, Filter, ChevronRight, Award, TrendingUp,
  Search, Globe, Target, CheckCircle, ExternalLink
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/ExperienceRadar.css';

/* ─── DATA ─── */
const HACKATHONS = [
  {
    id: 1, name: 'MLH Global Hack Week', organizer: 'Major League Hacking',
    date: 'Feb 19-25, 2026', location: 'Online', participants: '18,000+',
    prize: '$50,000', difficulty: 'All Levels', tags: ['AI/ML', 'Web3', 'Open Source'],
    isLive: false, daysUntil: 5, color: '#FF6B6B', featured: true
  },
  {
    id: 2, name: 'HackMIT 2026', organizer: 'MIT',
    date: 'Mar 5-7, 2026', location: 'Cambridge, MA', participants: '1,500+',
    prize: '$25,000', difficulty: 'Intermediate', tags: ['Hardware', 'IoT', 'Robotics'],
    isLive: false, daysUntil: 19, color: '#4ECDC4', featured: true
  },
  {
    id: 3, name: 'ETHGlobal Waterloo', organizer: 'ETHGlobal',
    date: 'Feb 14-16, 2026', location: 'Waterloo, Canada', participants: '2,000+',
    prize: '$100,000', difficulty: 'Advanced', tags: ['Blockchain', 'DeFi', 'Smart Contracts'],
    isLive: true, daysUntil: 0, color: '#A78BFA', featured: true
  },
  {
    id: 4, name: 'TreeHacks', organizer: 'Stanford University',
    date: 'Feb 21-23, 2026', location: 'Stanford, CA', participants: '1,200+',
    prize: '$30,000', difficulty: 'All Levels', tags: ['Climate Tech', 'Sustainability', 'Impact'],
    isLive: false, daysUntil: 7, color: '#10B981', featured: false
  },
  {
    id: 5, name: 'Google DevFest Hackathon', organizer: 'Google',
    date: 'Mar 12-14, 2026', location: 'Online', participants: '10,000+',
    prize: '$75,000', difficulty: 'Intermediate', tags: ['Cloud', 'Mobile', 'AI'],
    isLive: false, daysUntil: 26, color: '#F59E0B', featured: true
  },
  {
    id: 6, name: 'NASA Space Apps', organizer: 'NASA',
    date: 'Apr 2-4, 2026', location: 'Global', participants: '25,000+',
    prize: '$60,000', difficulty: 'All Levels', tags: ['Space Tech', 'Data Science', 'Innovation'],
    isLive: false, daysUntil: 47, color: '#3B82F6', featured: false
  }
];

const INTERNSHIPS = [
  {
    id: 1, company: 'Google', position: 'Software Engineering Intern',
    location: 'Mountain View, CA', type: 'Full-Time', duration: '3 months',
    stipend: '$8,000/mo', deadline: '2026-03-15', daysLeft: 17,
    tags: ['Machine Learning', 'Python', 'TensorFlow'], applicants: 1240, featured: true, color: '#4285F4'
  },
  {
    id: 2, company: 'Microsoft', position: 'Cloud Infrastructure Intern',
    location: 'Redmond, WA', type: 'Full-Time', duration: '3 months',
    stipend: '$7,500/mo', deadline: '2026-03-20', daysLeft: 22,
    tags: ['Azure', 'DevOps', 'Cloud'], applicants: 980, featured: true, color: '#00BCF2'
  },
  {
    id: 3, company: 'Meta', position: 'Product Design Intern',
    location: 'Menlo Park, CA', type: 'Full-Time', duration: '3 months',
    stipend: '$7,800/mo', deadline: '2026-03-10', daysLeft: 12,
    tags: ['UI/UX', 'Figma', 'Design Systems'], applicants: 756, featured: false, color: '#0081FB'
  },
  {
    id: 4, company: 'Amazon', position: 'Data Science Intern',
    location: 'Seattle, WA', type: 'Full-Time', duration: '3 months',
    stipend: '$7,200/mo', deadline: '2026-03-25', daysLeft: 27,
    tags: ['Data Analysis', 'Python', 'AWS'], applicants: 1100, featured: false, color: '#FF9900'
  },
  {
    id: 5, company: 'Apple', position: 'iOS Development Intern',
    location: 'Cupertino, CA', type: 'Full-Time', duration: '3 months',
    stipend: '$8,200/mo', deadline: '2026-03-18', daysLeft: 20,
    tags: ['Swift', 'iOS', 'Mobile'], applicants: 890, featured: true, color: '#555555'
  },
  {
    id: 6, company: 'Tesla', position: 'Robotics Engineering Intern',
    location: 'Austin, TX', type: 'Full-Time', duration: '3 months',
    stipend: '$6,800/mo', deadline: '2026-03-22', daysLeft: 24,
    tags: ['Robotics', 'C++', 'Automation'], applicants: 654, featured: false, color: '#E31937'
  }
];

/* ─── COMPONENT ─── */
const ExperienceRadar = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [hackFilter, setHackFilter] = useState('All');
  const [internSearch, setInternSearch] = useState('');
  const internRef = useRef(null);
  const hackRef  = useRef(null);

  const hackCategories = ['All', 'AI/ML', 'Web3', 'Hardware', 'Climate', 'Gaming', 'Blockchain'];
  const filteredHacks  = hackFilter === 'All'
    ? HACKATHONS
    : HACKATHONS.filter(h => h.tags.some(t => t.toLowerCase().includes(hackFilter.toLowerCase())));

  const filteredInterns = INTERNSHIPS.filter(i =>
    i.company.toLowerCase().includes(internSearch.toLowerCase()) ||
    i.position.toLowerCase().includes(internSearch.toLowerCase()) ||
    i.tags.some(t => t.toLowerCase().includes(internSearch.toLowerCase()))
  );

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="experience-radar-page">
      <Navbar theme="dark" />

      {/* ── SPLIT HERO ── */}
      <section className="radar-split-hero">

        {/* LEFT — HUNTER / Internships */}
        <div
          className={`hero-split hunter-split ${activeSection === 'hunter' ? 'active' : ''} ${activeSection === 'hustler' ? 'inactive' : ''}`}
          onMouseEnter={() => setActiveSection('hunter')}
          onMouseLeave={() => setActiveSection(null)}
        >
          <div className="split-content">
            <div className="split-badge">
              <Building2 size={20} />
              <span>THE HUNTER</span>
            </div>
            <h1 className="split-title">
              Find Your Next
              <span className="title-highlight">Internship</span>
            </h1>
            <p className="split-description">
              Track opportunities at industry-leading companies. Your career starts here.
            </p>
            <div className="split-features">
              <div className="feature-pill"><div className="pill-icon">🎯</div><span>2,400+ Placements</span></div>
              <div className="feature-pill"><div className="pill-icon">📈</div><span>85% Success Rate</span></div>
              <div className="feature-pill"><div className="pill-icon">🏢</div><span>Top Companies</span></div>
            </div>
            <button className="split-cta hunter-cta" onClick={() => scrollTo(internRef)}>
              <span>Explore Internships</span>
              <ArrowRight size={20} />
            </button>
            <div className="company-tags">
              {['Google','Microsoft','Meta','Amazon','Apple'].map(c => (
                <span key={c} className="tag">{c}</span>
              ))}
            </div>
          </div>
          <div className="hunter-bg-shapes">
            <div className="shape shape-1"/><div className="shape shape-2"/><div className="shape shape-3"/>
          </div>
        </div>

        {/* RIGHT — HUSTLER / Hackathons */}
        <div
          className={`hero-split hustler-split ${activeSection === 'hustler' ? 'active' : ''} ${activeSection === 'hunter' ? 'inactive' : ''}`}
          onMouseEnter={() => setActiveSection('hustler')}
          onMouseLeave={() => setActiveSection(null)}
        >
          <div className="split-content">
            <div className="split-badge hustler-badge">
              <Zap size={20} />
              <span>THE HUSTLER</span>
            </div>
            <h1 className="split-title">
              Join Epic
              <span className="title-highlight hustler-highlight">Hackathons</span>
            </h1>
            <p className="split-description">
              Build, compete, and win. From local meetups to global championships.
            </p>
            <div className="live-indicator">
              <div className="live-pulse"/>
              <span className="live-text">3 Hackathons Live Now</span>
            </div>
            <div className="next-major-event">
              <div className="event-label">NEXT MAJOR EVENT</div>
              <div className="event-name">MLH Global Hack Week</div>
              <div className="event-countdown">
                <div className="countdown-block"><span className="count">05</span><span className="unit">D</span></div>
                <span className="separator">:</span>
                <div className="countdown-block"><span className="count">14</span><span className="unit">H</span></div>
                <span className="separator">:</span>
                <div className="countdown-block"><span className="count">32</span><span className="unit">M</span></div>
              </div>
            </div>
            <button className="split-cta hustler-cta" onClick={() => scrollTo(hackRef)}>
              <span>Browse Hackathons</span>
              <Rocket size={20} />
            </button>
            <div className="hustler-stats">
              <div className="stat-box"><div className="stat-value">142</div><div className="stat-label">Active Events</div></div>
              <div className="stat-box"><div className="stat-value">$2.4M</div><div className="stat-label">In Prizes</div></div>
              <div className="stat-box"><div className="stat-value">18K</div><div className="stat-label">Participants</div></div>
            </div>
          </div>
          <div className="hustler-bg-shapes">
            <div className="neon-circle circle-1"/><div className="neon-circle circle-2"/><div className="neon-circle circle-3"/>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          INTERNSHIPS SECTION
          ════════════════════════════════════ */}
      <section className="er-section" ref={internRef} id="internships">
        <div className="er-section-inner">
          <div className="er-section-head">
            <div className="er-section-badge er-badge-blue">
              <Building2 size={14} />
              Internships
            </div>
            <h2 className="er-section-title">
              Open Internship <span className="er-title-accent er-accent-blue">Positions</span>
            </h2>
            <p className="er-section-sub">Apply before deadlines close — {INTERNSHIPS.length} active listings</p>
            <div className="er-search-bar">
              <Search size={15} />
              <input
                placeholder="Search company, role, skill…"
                value={internSearch}
                onChange={e => setInternSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="er-grid er-intern-grid">
            {filteredInterns.map(i => (
              <div key={i.id} className={`er-card er-intern-card${i.featured?' er-featured':''}`}>
                {i.featured && <span className="er-featured-badge">Featured</span>}
                <div className="er-card-top">
                  <div className="er-company-logo" style={{background:`${i.color}18`,borderColor:`${i.color}40`,color:i.color}}>
                    {i.company[0]}
                  </div>
                  <div>
                    <div className="er-company-name" style={{color:i.color}}>{i.company}</div>
                    <div className="er-position">{i.position}</div>
                  </div>
                </div>

                <div className="er-meta-row">
                  <span><MapPin size={11}/> {i.location}</span>
                  <span><Clock size={11}/> {i.duration}</span>
                  <span><DollarSign size={11}/> {i.stipend}</span>
                </div>

                <div className="er-tags">
                  {i.tags.map(t => <span key={t} className="er-tag">{t}</span>)}
                </div>

                <div className="er-card-footer">
                  <div className="er-deadline">
                    <Calendar size={11}/>
                    <span>Deadline: {i.deadline}</span>
                    <span className="er-days-left" style={{color: i.daysLeft < 15 ? '#ef4444' : '#10b981'}}>
                      {i.daysLeft}d left
                    </span>
                  </div>
                  <button className="er-apply-btn" style={{background:`${i.color}18`,borderColor:`${i.color}40`,color:i.color}}>
                    Apply <ExternalLink size={11}/>
                  </button>
                </div>

                <div className="er-applicants">
                  <Users size={10}/> {i.applicants.toLocaleString()} applicants
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          HACKATHONS SECTION
          ════════════════════════════════════ */}
      <section className="er-section er-section-dark" ref={hackRef} id="hackathons">
        <div className="er-section-inner">
          <div className="er-section-head">
            <div className="er-section-badge er-badge-purple">
              <Trophy size={14} />
              Hackathons
            </div>
            <h2 className="er-section-title">
              Upcoming <span className="er-title-accent er-accent-purple">Hackathons</span>
            </h2>
            <p className="er-section-sub">Win prizes, build fast, grow your network</p>

            <div className="er-filter-pills">
              {hackCategories.map(c => (
                <button
                  key={c}
                  className={`er-filter-pill${hackFilter === c ? ' active' : ''}`}
                  onClick={() => setHackFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="er-grid er-hack-grid">
            {filteredHacks.map(h => (
              <div key={h.id} className={`er-card er-hack-card${h.featured?' er-featured':''}`}
                style={{'--hcolor': h.color}}>
                {h.isLive && <span className="er-live-badge"><span className="er-live-dot"/>LIVE</span>}
                {h.featured && !h.isLive && <span className="er-featured-badge">Featured</span>}

                <div className="er-hack-header">
                  <div className="er-hack-colorswatch" style={{background:h.color}}/>
                  <div>
                    <div className="er-hack-name">{h.name}</div>
                    <div className="er-hack-organizer">{h.organizer}</div>
                  </div>
                  <div className="er-hack-days"
                    style={{color:h.color, borderColor:`${h.color}50`, background:`${h.color}12`}}>
                    {h.isLive ? '⚡ NOW' : `${h.daysUntil}d`}
                  </div>
                </div>

                <div className="er-meta-row er-hack-meta">
                  <span><MapPin size={11}/> {h.location}</span>
                  <span><Calendar size={11}/> {h.date}</span>
                  <span><Users size={11}/> {h.participants}</span>
                </div>

                <div className="er-hack-prize-row">
                  <div className="er-prize">
                    <Trophy size={13} style={{color:h.color}}/>
                    <span style={{color:h.color}}>{h.prize}</span>
                  </div>
                  <div className="er-difficulty">{h.difficulty}</div>
                </div>

                <div className="er-tags">
                  {h.tags.map(t => (
                    <span key={t} className="er-tag er-tag-hack" style={{borderColor:`${h.color}40`,color:h.color,background:`${h.color}10`}}>
                      {t}
                    </span>
                  ))}
                </div>

                <button className="er-register-btn" style={{background:`${h.color}18`,borderColor:`${h.color}50`,color:h.color}}>
                  Register <ArrowRight size={12}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ExperienceRadar;
