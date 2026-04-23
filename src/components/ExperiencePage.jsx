import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Briefcase, Trophy, ArrowRight, Users, Zap,
  TrendingUp, Building2, Calendar, Star,
  Target, Code, Sparkles
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import TargetCursor from './TargetCursor';
import '../styles/ExperiencePage.css';

/* ─── 3-D Tilt Card ──────────────────────────────────────────────────────── */
const TiltCard = ({ children, className, onClick }) => {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${y * -14}deg) rotateY(${x * 14}deg) scale3d(1.03,1.03,1.03)`;
  };

  const onLeave = () => {
    if (ref.current)
      ref.current.style.transform =
        'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  };

  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}>
      {children}
    </div>
  );
};

/* ─── Shared animation variants ─────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1], delay } },
});

/* ─── Main Component ─────────────────────────────────────────────────────── */
const ExperiencePage = () => {
  const navigate = useNavigate();
  const heroRef  = useRef(null);
  const orbRef   = useRef(null);

  /* Scroll-based parallax on hero text */
  const { scrollY } = useScroll();
  const heroY  = useTransform(scrollY, [0, 600], [0, 160]);
  const heroOp = useTransform(scrollY, [0, 380], [1, 0]);

  /* Mouse-driven orb parallax — rAF-gated so at most 1 style write per frame */
  useEffect(() => {
    let rafId = null;
    const onMove = (e) => {
      if (!orbRef.current) return;
      if (rafId) return;                 // already have a frame queued, skip
      rafId = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth  - 0.5) * 50;
        const y = (e.clientY / window.innerHeight - 0.5) * 50;
        if (orbRef.current) orbRef.current.style.transform = `translate(${x}px, ${y}px)`;
        rafId = null;
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const internshipFeatures = [
    { icon: Building2,  text: '500+ Top Companies' },
    { icon: TrendingUp, text: 'Verified Stipends'   },
    { icon: Calendar,   text: 'Real Deadlines'      },
    { icon: Users,      text: 'Peer Reviews'        },
  ];

  const hackathonFeatures = [
    { icon: Trophy, text: '$10M+ Total Prizes' },
    { icon: Zap,    text: 'Live & Upcoming'    },
    { icon: Code,   text: 'All Tech Stacks'    },
    { icon: Star,   text: 'Team Formation'     },
  ];

  const [cursorInZone, setCursorInZone] = useState(false);

  return (
    <div className="eh-page">
      <Navbar />

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════════════════════ */}
      <section className="eh-hero" ref={heroRef}>
        {/* Background layers */}
        <div className="eh-hero-bg">
          <div className="eh-orb eh-orb-1" ref={orbRef} />
          <div className="eh-orb eh-orb-2" />
          <div className="eh-orb eh-orb-3" />
          <div className="eh-orb eh-orb-4" />
          <div className="eh-grain" />
          <div className="eh-grid-overlay" />
        </div>

        {/* Scroll-parallax content wrapper */}
        <motion.div className="eh-hero-content" style={{ y: heroY, opacity: heroOp }}>
          <motion.div
            className="eh-hero-inner"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {/* Badge */}
            <motion.div className="eh-badge" variants={fadeUp(0)}>
              <Sparkles size={13} />
              <span>Experience Hub</span>
            </motion.div>

            {/* Title */}
            <motion.h1 className="eh-hero-title" variants={fadeUp(0.05)}>
              Your Career Story,
              <span className="eh-gradient-text"> Told Right.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p className="eh-hero-subtitle" variants={fadeUp(0.12)}>
              Discover curated internship opportunities and electrifying hackathons.<br />
              Build your experience portfolio. Land the role you deserve.
            </motion.p>

            {/* Chips */}
            <motion.div className="eh-hero-chips" variants={fadeUp(0.18)}>
              {['Top Internships', 'Live Hackathons', 'Verified Reviews', 'Team Builder'].map(t => (
                <span key={t} className="eh-chip">{t}</span>
              ))}
            </motion.div>

            {/* Choose path divider */}
            <motion.div className="eh-hero-divider" variants={fadeUp(0.24)}>
              <span className="eh-divider-line" />
              <span className="eh-divider-label">Choose your path below</span>
              <span className="eh-divider-line" />
            </motion.div>

            {/* Scroll mouse hint */}
            <motion.div className="eh-scroll-hint" variants={fadeUp(0.3)}>
              <div className="eh-scroll-mouse">
                <div className="eh-scroll-dot" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Bottom gradient fade into next section */}
        <div className="eh-hero-fade-bottom" />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — DECISION
      ═══════════════════════════════════════════════════════════ */}
      <section
        className="eh-decision"
        onMouseEnter={() => setCursorInZone(true)}
        onMouseLeave={() => setCursorInZone(false)}
      >
        {cursorInZone && (
          <TargetCursor
            targetSelector=".cursor-target"
            spinDuration={2}
            hideDefaultCursor
            parallaxOn
            hoverDuration={0.2}
          />
        )}
        {/* Section header */}
        <motion.div
          className="eh-decision-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="eh-section-badge">
            <Target size={12} />
            <span>Choose Your Path</span>
          </div>
          <h2 className="eh-decision-title">What are you looking for?</h2>
          <p className="eh-decision-sub">Two worlds. One hub. Pick your adventure and dive in.</p>
        </motion.div>

        {/* Two bento cards */}
        <div className="eh-cards-grid">

          {/* ── INTERNSHIPS ── */}
          <motion.div
            className="eh-card-wrapper"
            initial={{ opacity: 0, y: 70 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            <TiltCard
              className="eh-card eh-card-intern cursor-target"
              onClick={() => navigate('/internships')}
            >
              <div className="eh-card-glow eh-card-glow-intern" />
              <div className="eh-card-shimmer" />
              <div className="eh-card-deco-quarter eh-deco-intern-quarter" />
              <div className="eh-card-deco-half eh-deco-intern-half" />
              <span className="eh-polka eh-polka-1" />
              <span className="eh-polka eh-polka-2" />
              <span className="eh-polka eh-polka-3" />

              <div className="eh-card-top">
                <div className="eh-card-icon-wrap eh-icon-intern">
                  <Briefcase size={26} />
                </div>
                <span className="eh-card-eyebrow">Internships</span>
              </div>

              <h3 className="eh-card-title">Find Your Dream<br />Internship</h3>
              <p className="eh-card-desc">
                Explore hand-picked internships from top-tier companies worldwide.
                Filter by role, stack, and stipend. Apply with confidence using
                real peer reviews and verified data.
              </p>

              <ul className="eh-card-features">
                {internshipFeatures.map(({ icon: Icon, text }) => (
                  <li key={text} className="eh-feature-item">
                    <span className="eh-feat-icon"><Icon size={14} /></span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <div className="eh-card-stats">
                {[['500+', 'Companies'], ['12K+', 'Reviews'], ['98%', 'Verified']].map(([n, l], i, arr) => (
                  <span key={l} className="eh-stat-group">
                    <span className="eh-stat">
                      <span className="eh-stat-num">{n}</span>
                      <span className="eh-stat-lbl">{l}</span>
                    </span>
                    {i < arr.length - 1 && <span className="eh-stat-sep" />}
                  </span>
                ))}
              </div>

              <div className="eh-card-cta eh-cta-intern">
                <span>Explore Internships</span>
                <ArrowRight size={17} />
              </div>

              <span className="eh-card-corner-tag eh-corner-intern">Career Launch</span>
            </TiltCard>
            <div className="eh-challenge-text-right">
              <div className="eh-hover-circ eh-circ-3" />
              <div className="eh-hover-circ eh-circ-4" />
              <div style={{ position: 'relative', zIndex: 2 }}>
                Are you bold enough to build under pressure? Join the next <span className="eh-highlight-purple">hackathon</span>, ship an incredible project, and claim your victory.
              </div>
            </div>
          </motion.div>

          {/* ── HACKATHONS ── */}
          <motion.div
            className="eh-card-wrapper"
            initial={{ opacity: 0, y: 70 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
          >
            <TiltCard
              className="eh-card eh-card-hack cursor-target"
              onClick={() => navigate('/hackathons')}
            >
              <div className="eh-card-glow eh-card-glow-hack" />
              <div className="eh-card-shimmer" />
              <div className="eh-card-deco-quarter eh-deco-hack-quarter" />
              <div className="eh-card-deco-half eh-deco-hack-half" />
              <span className="eh-polka eh-polka-1" />
              <span className="eh-polka eh-polka-2" />
              <span className="eh-polka eh-polka-3" />

              <div className="eh-card-top">
                <div className="eh-card-icon-wrap eh-icon-hack">
                  <Trophy size={26} />
                </div>
                <span className="eh-card-eyebrow">Hackathons</span>
              </div>

              <h3 className="eh-card-title">Compete,<br />Build &amp; Win.</h3>
              <p className="eh-card-desc">
                Discover the hottest hackathons happening right now — online and
                in-person. Build fast, ship bold, and win prizes while adding
                real proof-of-work to your portfolio.
              </p>

              <ul className="eh-card-features">
                {hackathonFeatures.map(({ icon: Icon, text }) => (
                  <li key={text} className="eh-feature-item">
                    <span className="eh-feat-icon"><Icon size={14} /></span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <div className="eh-card-stats">
                {[['200+', 'Events/yr'], ['$10M+', 'Prizes'], ['50K+', 'Builders']].map(([n, l], i, arr) => (
                  <span key={l} className="eh-stat-group">
                    <span className="eh-stat">
                      <span className="eh-stat-num">{n}</span>
                      <span className="eh-stat-lbl">{l}</span>
                    </span>
                    {i < arr.length - 1 && <span className="eh-stat-sep" />}
                  </span>
                ))}
              </div>

              <div className="eh-card-cta eh-cta-hack">
                <span>Explore Hackathons</span>
                <ArrowRight size={17} />
              </div>

              <span className="eh-card-corner-tag eh-corner-hack">Build &amp; Win</span>
            </TiltCard>
            <div className="eh-challenge-text-left">
              <div className="eh-hover-circ eh-circ-1" />
              <div className="eh-hover-circ eh-circ-2" />
              <div style={{ position: 'relative', zIndex: 2 }}>
                Are you ready to turn your coding skills into a real career? Grab a top-tier <span className="eh-highlight-gold">internship</span> and let's get building.
              </div>
            </div>
          </motion.div>
        </div>

        {/* Profile sync hint */}
        <motion.div
          className="eh-decision-hint"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.55, duration: 0.6 }}
        >
          <Target size={13} />
          <span>Both are synced with your Nexus profile &amp; Aim settings</span>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — FOOTER
      ═══════════════════════════════════════════════════════════ */}
      <Footer />
    </div>
  );
};

export default ExperiencePage;
