import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import TargetCursor from './TargetCursor';
import PortalTransition from './PortalTransition';
import { Code, Target, Zap, Users, Briefcase, BookOpen, Calendar, Pencil, Folder, FileText, Bot, TrendingUp, Award, CheckCircle, ArrowRight, Sparkles, Rocket, Shield, Globe, LayoutDashboard, Plus, Map, Compass, Activity } from 'lucide-react';
import '../styles/Home.css';

const Home = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const observerRef = useRef(null);
  const portalRef   = useRef(null);

  const handleBentoClick = (e, route) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    portalRef.current?.trigger(cx, cy, route);
  };

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const features = [
    {
      icon: <LayoutDashboard size={28} />,
      title: "Central Dashboard",
      description: "Nexus Score tracks readiness with daily missions & dream company countdown",
      shortDesc: "Track your career readiness",
      color: "#7C3AED"
    },
    {
      icon: <Target size={28} />,
      title: "Practice Hub",
      description: "DSA tracks with company filters and persistent logic notes",
      shortDesc: "Master coding challenges",
      color: "#EC4899"
    },
    {
      icon: <Calendar size={28} />,
      title: "Study Planner",
      description: "AI spaced repetition with auto-curated resources",
      shortDesc: "Organize your learning",
      color: "#F59E0B"
    },
    {
      icon: <Pencil size={28} />,
      title: "Whiteboard",
      description: "Real-time canvas with tech stencils for system design",
      shortDesc: "Collaborate in real-time",
      color: "#10B981"
    },
    {
      icon: <Folder size={28} />,
      title: "Project Hub",
      description: "Case studies with designs, code, and auto-docs",
      shortDesc: "Build impressive projects",
      color: "#3B82F6"
    },
    {
      icon: <FileText size={28} />,
      title: "Resume Builder",
      description: "STAR-method optimization with ATS analysis",
      shortDesc: "Optimize your resume",
      color: "#8B5CF6"
    },
    {
      icon: <Bot size={28} />,
      title: "Career Agents",
      description: "AI agents auto-draft applications 24/7",
      shortDesc: "AI-powered job applications",
      color: "#14B8A6"
    },
    {
      icon: <Users size={28} />,
      title: "Community",
      description: "Share work, earn karma, build portfolio",
      shortDesc: "Connect with peers",
      color: "#06B6D4"
    },
    {
      icon: <TrendingUp size={28} />,
      title: "Experience Radar",
      description: "Track and showcase your professional growth journey",
      shortDesc: "Monitor career progress",
      color: "#F43F5E"
    }
  ];

  const problems = [
    {
      icon: <Code size={28} />,
      title: "Fragmentation of Effort",
      description: "Juggling 5-7 platforms kills momentum and makes progress invisible"
    },
    {
      icon: <TrendingUp size={28} />,
      title: "The Forgetting Curve",
      description: "No revision system means constantly relearning the same concepts"
    },
    {
      icon: <Shield size={28} />,
      title: "Context Loss",
      description: "Design logic disappears and code never translates to resume impact"
    },
    {
      icon: <Globe size={28} />,
      title: "Resource Overload",
      description: "Drowning in tutorials with none specific to your actual skill gaps"
    }
  ];

  const solutions = [
    {
      icon: <Sparkles size={28} />,
      title: "Unified Feedback Loop",
      description: "Learn → Architect → Build → Optimize → Land. Everything feeds your readiness"
    },
    {
      icon: <Rocket size={28} />,
      title: "Smart Memory System",
      description: "Auto-scheduled reviews, persistent notes, and linked documentation"
    },
    {
      icon: <Award size={28} />,
      title: "Dream Company Ecosystem",
      description: "Auto-audits your stack and aligns everything to your target role"
    }
  ];

  return (
    <div className="home-container">
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      
      {/* Landing Banner — sticky parallax zone */}
      <div className="landing-parallax-zone">
      <section className="landing-banner">
        <div className="banner-content scroll-animate">
          <h1 className="banner-title">
            From Zero to Hero
            <span className="gradient-text"> in One Ecosystem</span>
          </h1>
          <p className="banner-subtitle">
            Stop juggling 7 platforms. One intelligent system: 
            <br></br>
            <strong> Learn → Architect → Build → Optimize → Land</strong>
          </p>
          <div className="banner-cta-group">
            <button className="cta-critical" onClick={() => navigate('/login')}>
              <span>Start Your Journey</span>
              <ArrowRight size={20} />
            </button>
            <button className="cta-secondary" onClick={() => navigate('/dashboard')}>
              <span>Explore Dashboard</span>
            </button>
          
          </div>
          {/* Stats removed as requested */}
        </div>
        <div className="banner-visual">
          <div className="floating-card card-1">
            <BookOpen size={24} />
            <span>Learn</span>
          </div>
          <div className="floating-card card-2">
            <Pencil size={24} />
            <span>Architect</span>
          </div>
          <div className="floating-card card-3">
            <Folder size={24} />
            <span>Build</span>
          </div>
          <div className="floating-card card-4">
            <FileText size={24} />
            <span>Optimize</span>
          </div>
          <div className="floating-card card-5">
            <Briefcase size={24} />
            <span>Land</span>
          </div>
          <div className="floating-card card-6">
            <Code size={24} />
            <span>Code</span>
          </div>
          <div className="floating-card card-7">
            <Target size={24} />
            <span>Goals</span>
          </div>
          <div className="floating-card card-8">
            <Bot size={24} />
            <span>AI Agent</span>
          </div>
          <div className="nexus-center">
            <div className="nexus-logo">NEXUS</div>
          </div>
          <svg className="connection-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="conn-line line-anim-1" x1="50" y1="12" x2="50" y2="50" />
            <line className="conn-line line-anim-2" x1="79" y1="21" x2="50" y2="50" />
            <line className="conn-line line-anim-3" x1="88" y1="50" x2="50" y2="50" />
            <line className="conn-line line-anim-4" x1="79" y1="79" x2="50" y2="50" />
            <line className="conn-line line-anim-5" x1="50" y1="88" x2="50" y2="50" />
            <line className="conn-line line-anim-6" x1="21" y1="79" x2="50" y2="50" />
            <line className="conn-line line-anim-7" x1="12" y1="50" x2="50" y2="50" />
            <line className="conn-line line-anim-8" x1="21" y1="21" x2="50" y2="50" />
          </svg>
        </div>
      </section>
      </div>{/* end landing-parallax-zone */}

      {/* Problem Section */}
      <section className="problem-section">
        <div className="section-header scroll-animate">
          <div className="section-badge">The Problem</div>
          <h2 className="section-title">The Fragmentation Crisis</h2>
          <p className="section-description">
            Career prep is broken. Context-switching kills momentum.
          </p>
        </div>
        <div className="problems-grid">
          {problems.map((problem, index) => (
            <div key={index} className="problem-card scroll-animate anim-from-right" style={{ transitionDelay: `${index * 0.12}s` }}>
              <div className="problem-icon">{problem.icon}</div>
              <h3 className="problem-title">{problem.title}</h3>
              <p className="problem-description">{problem.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solution Section */}
      <section className="solution-section">
        <div className="section-header scroll-animate">
          <div className="section-badge gradient-badge">The Solution</div>
          <h2 className="section-title">Career Engineering, Not Job Seeking</h2>
          <p className="section-description">
            Intelligent automation meets unified workflows
          </p>
        </div>
        <div className="solutions-grid">
          {solutions.map((solution, index) => (
            <div key={index} className="solution-card scroll-animate anim-from-bottom" style={{ transitionDelay: `${index * 0.15}s` }}>
              <div className="solution-icon-wrapper">
                <div className="solution-icon">{solution.icon}</div>
              </div>
              <h3 className="solution-title">{solution.title}</h3>
              <p className="solution-description">{solution.description}</p>
              <div className="solution-arrow">
                <ArrowRight size={20} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dream Company Flow Section */}
      <section className="dream-company-section">
        <div className="section-header scroll-animate">
          <div className="section-badge gradient-badge">Smart Workflow</div>
          <h2 className="section-title">The Dream Company Ecosystem</h2>
          <p className="section-description">
            Set your target. Watch Nexus auto-align everything.
          </p>
        </div>

        <div className="dc-timeline">
          {/* animated center line */}
          <div className="dc-line"><div className="dc-line-fill scroll-animate" /></div>

          {/* Step 1 — right */}
          <div className="dc-step dc-step-right scroll-animate anim-from-right" style={{ transitionDelay: '0.1s' }}>
            <div className="dc-node"><Target size={18} /></div>
            <div className="dc-card">
              <span className="dc-step-num">01</span>
              <div className="dc-card-icon"><Target size={22} /></div>
              <h3 className="dc-card-title">Select Your Target</h3>
              <p className="dc-card-desc">"I want to work at NVIDIA" — your north star is set and every tool re-calibrates around it.</p>
              <span className="dc-card-tag">Goal Setting</span>
            </div>
          </div>

          {/* Step 2 — left */}
          <div className="dc-step dc-step-left scroll-animate anim-from-left" style={{ transitionDelay: '0.25s' }}>
            <div className="dc-node"><Shield size={18} /></div>
            <div className="dc-card">
              <span className="dc-step-num">02</span>
              <div className="dc-card-icon"><Shield size={22} /></div>
              <h3 className="dc-card-title">System Audit</h3>
              <p className="dc-card-desc">Nexus scans your full profile and flags critical gaps — no C++ experience, missing low-level projects.</p>
              <span className="dc-card-tag">Gap Analysis</span>
            </div>
          </div>

          {/* Step 3 — right */}
          <div className="dc-step dc-step-right scroll-animate anim-from-right" style={{ transitionDelay: '0.4s' }}>
            <div className="dc-node"><BookOpen size={18} /></div>
            <div className="dc-card">
              <span className="dc-step-num">03</span>
              <div className="dc-card-icon"><BookOpen size={22} /></div>
              <h3 className="dc-card-title">Resource Curation</h3>
              <p className="dc-card-desc">Auto-curates OS deep-dives, NVIDIA mock interviews, and hands-on driver projects just for you.</p>
              <span className="dc-card-tag">Smart Resources</span>
            </div>
          </div>

          {/* Step 4 — left */}
          <div className="dc-step dc-step-left scroll-animate anim-from-left" style={{ transitionDelay: '0.55s' }}>
            <div className="dc-node"><Calendar size={18} /></div>
            <div className="dc-card">
              <span className="dc-step-num">04</span>
              <div className="dc-card-icon"><Calendar size={22} /></div>
              <h3 className="dc-card-title">Auto-Schedule</h3>
              <p className="dc-card-desc">C++ Memory Management review, spaced repetition sessions, and mock deadlines drop into your planner automatically.</p>
              <span className="dc-card-tag">Automation</span>
            </div>
          </div>

          {/* Step 5 — right */}
          <div className="dc-step dc-step-right scroll-animate anim-from-right" style={{ transitionDelay: '0.7s' }}>
            <div className="dc-node"><FileText size={18} /></div>
            <div className="dc-card">
              <span className="dc-step-num">05</span>
              <div className="dc-card-icon"><FileText size={22} /></div>
              <h3 className="dc-card-title">Resume Optimization</h3>
              <p className="dc-card-desc">AI rewrites your bullet points with Hardware-Software keywords, making you ATS-ready for NVIDIA roles.</p>
              <span className="dc-card-tag">AI Powered</span>
            </div>
          </div>

        </div>
      </section>

      {/* Features Bento Section */}
      <section className="bento-section">
        <TargetCursor
          targetSelector=".bento-card"
          containerSelector=".bento-section"
          spinDuration={3}
          hideDefaultCursor={false}
          hoverDuration={0.18}
          parallaxOn={true}
        />
        <div className="section-header scroll-animate">
          <div className="section-badge gradient-badge">Everything You Need</div>
          <h2 className="section-title">Your Complete Career OS</h2>
          <p className="section-description">Nine powerful tools, one seamless workflow</p>
        </div>

        <div className="bento-grid scroll-animate">

          {/* 1 · Dashboard – wide top-left (2×1) */}
          <div className="bento-card bento-dashboard" onClick={(e) => handleBentoClick(e, '/dashboard')}>
            <div className="bento-accent-circle" />
            <div className="bento-card-icon"><LayoutDashboard size={34} /></div>
            <h3 className="bento-card-title">Dashboard</h3>
            <p className="bento-card-desc">
              Mission control for your career. Track your Nexus Score, knock out daily missions, and run a live countdown to your dream company — all from one intelligent hub.
            </p>
            <div className="bento-dashboard-pills">
              <span className="bento-pill">Nexus Score</span>
              <span className="bento-pill">Daily Missions</span>
              <span className="bento-pill">Dream Countdown</span>
            </div>
            <div className="bento-card-tag">Command Centre</div>
          </div>

          {/* 2 · Practice Hub – top col 3 (1×1) */}
          <div className="bento-card bento-practice" onClick={(e) => handleBentoClick(e, '/practice')}>
            <div className="bento-card-icon"><Target size={26} /></div>
            <h3 className="bento-card-title">Practice Hub</h3>
            <p className="bento-card-desc">DSA tracks, company filters &amp; persistent logic notes.</p>
          </div>

          {/* 3 · Whiteboard – tall card (1×2), col 4 */}
          <div className="bento-card bento-whiteboard" onClick={(e) => handleBentoClick(e, '/whiteboard')}>
            <div className="bento-card-icon"><Pencil size={26} /></div>
            <h3 className="bento-card-title">Whiteboard</h3>
            <p className="bento-card-desc">Real-time canvas with tech stencils &amp; sticky notes for system design.</p>
            <div className="bento-wb-new">
              <div className="bento-wb-plus"><Plus size={18} /></div>
              <span className="bento-wb-label">New Project</span>
            </div>
          </div>

          {/* 4 · Study Planner – small top-right (1×1) */}
          <div className="bento-card bento-study" onClick={(e) => handleBentoClick(e, '/study-planner')}>
            <div className="bento-card-icon"><Calendar size={26} /></div>
            <h3 className="bento-card-title">Study Planner</h3>
            <p className="bento-card-desc">AI spaced repetition &amp; smart schedules.</p>
          </div>

          {/* 5 · Experience Hub – wide (2×1), row 2 left */}
          <div className="bento-card bento-experience" onClick={(e) => handleBentoClick(e, '/experience-radar')}>
            <div className="bento-accent-circle bento-accent-right" />
            <div className="bento-card-icon"><Activity size={26} /></div>
            <h3 className="bento-card-title">Experience Hub</h3>
            <p className="bento-card-desc">Visualise your professional growth. Skill radar, internships, hackathons &amp; milestones — all in one living record.</p>
            <div className="bento-card-tag">Growth Tracker</div>
          </div>

          {/* 6 · Placement Portal – row 2 col 3 (1×1) */}
          <div className="bento-card bento-placement" onClick={(e) => handleBentoClick(e, '/placement-portal')}>
            <div className="bento-card-icon"><Briefcase size={26} /></div>
            <h3 className="bento-card-title">Placement Portal</h3>
            <p className="bento-card-desc">Mock interviews &amp; offers tracker.</p>
          </div>

          {/* 7 · Resume – small row 2 col 5 (1×1) */}
          <div className="bento-card bento-resume" onClick={(e) => handleBentoClick(e, '/aim')}>
            <div className="bento-card-icon"><FileText size={26} /></div>
            <h3 className="bento-card-title">Resume</h3>
            <p className="bento-card-desc">STAR-method &amp; ATS scan.</p>
          </div>

          {/* 8 · Guidance – wide bottom-left (3×1) */}
          <div className="bento-card bento-guidance" onClick={(e) => handleBentoClick(e, '/project-workspace')}>
            <div className="bento-card-icon"><Compass size={26} /></div>
            <h3 className="bento-card-title">Guidance</h3>
            <p className="bento-card-desc">Role-specific roadmaps, curated resources &amp; step-by-step paths to get you from where you are to where you want to be.</p>
            <div className="bento-card-tag">Your Roadmap</div>
          </div>

          {/* 9 · Aim – bottom right (2×1) */}
          <div className="bento-card bento-aim" onClick={(e) => handleBentoClick(e, '/aim')}>
            <div className="bento-accent-circle" />
            <div className="bento-card-icon"><Map size={26} /></div>
            <h3 className="bento-card-title">Aim</h3>
            <p className="bento-card-desc">Set your north star. Define your dream company, role, and timeline — then let Nexus align everything around it.</p>
            <div className="bento-card-tag">North Star</div>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section scroll-animate">
        {/* decorative orbs */}
        <div className="cta-orb cta-orb-1" />
        <div className="cta-orb cta-orb-2" />
        <div className="cta-orb cta-orb-3" />

        {/* grid overlay */}
        <div className="cta-grid-overlay" />

        <div className="cta-content">
          {/* eyebrow */}
          <div className="cta-eyebrow">
            <span className="cta-eyebrow-dot" />
            The Future of Career Prep
          </div>

          {/* headline */}
          <h2 className="cta-title">
            Stop Grinding.<br />
            <span className="cta-title-gradient">Start Engineering.</span>
          </h2>

          <p className="cta-description">
            Join engineers who replaced 7 scattered tools with one
            intelligent system — and landed the roles they actually wanted.
          </p>

          {/* CTAs */}
          <div className="cta-actions">
            <button className="cta-btn-primary" onClick={() => navigate('/login')}>
              <span>Start for Free</span>
              <Rocket size={18} />
            </button>
            <button className="cta-btn-secondary" onClick={() => navigate('/dashboard')}>
              <span>Live Demo</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* stats strip */}
          <div className="cta-stats">
            <div className="cta-stat">
              <span className="cta-stat-number">9+</span>
              <span className="cta-stat-label">Integrated Tools</span>
            </div>
            <div className="cta-stat-divider" />
            <div className="cta-stat">
              <span className="cta-stat-number">1</span>
              <span className="cta-stat-label">Unified Workflow</span>
            </div>
            <div className="cta-stat-divider" />
            <div className="cta-stat">
              <span className="cta-stat-number">∞</span>
              <span className="cta-stat-label">Possibilities</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      <PortalTransition ref={portalRef} />
    </div>
  );
};

export default Home;
