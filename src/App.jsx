import { useEffect, useRef, useState } from 'react'
import Navbar from './components/Navbar'
import './App.css'

function App() {
  // Refs for animated sections
  const heroRef = useRef(null);
  const flowRef = useRef(null);
  const problemsRef = useRef(null);
  const featuresRef = useRef(null);
  const dreamRef = useRef(null);
  const ctaRef = useRef(null);

  // Theme state management
  const [theme, setTheme] = useState(() => {
    // Initialize from localStorage or default to 'dark'
    return localStorage.getItem('theme') || 'dark';
  });

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Persist theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  // State for auto-cycling flow animation
  const [activeFlowStep, setActiveFlowStep] = useState(0);

  // Auto-cycle through flow steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFlowStep((prev) => (prev + 1) % 5); // 5 steps total, loop back to 0
    }, 2000); // Change every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const sections = [heroRef, flowRef, problemsRef, featuresRef, dreamRef, ctaRef];
    sections.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);



  // Problems that Nexus solves
  const problems = [
    {
      icon: "psychology",
      title: "Context Loss",
      desc: "Design logic created during brainstorming is lost before the project is finished. Your brilliant ideas vanish into thin air."
    },
    {
      icon: "trending_down",
      title: "The Forgetting Curve",
      desc: "Students solve DSA problems but forget the logic within weeks. All that practice, gone without proper revision systems."
    },
    {
      icon: "draft",
      title: "Blank Page Resume",
      desc: "Difficulty translating technical code into high-impact recruiter language. Your skills don't shine through."
    },
    {
      icon: "waves",
      title: "Resource Overload",
      desc: "Too many YouTube tutorials, none specific to your current skill gap. Endless scrolling, minimal progress."
    }
  ];

  // Core flow steps
  const flowSteps = [
    { icon: "menu_book", label: "Learn", desc: "Practice Hub" },
    { icon: "draw", label: "Architect", desc: "Whiteboard" },
    { icon: "construction", label: "Build", desc: "Project Hub" },
    { icon: "auto_fix_high", label: "Optimize", desc: "Resume Builder" },
    { icon: "flag", label: "Land", desc: "Job Board" }
  ];

  // Platform features (9 pages)
  const features = [
    {
      icon: "dashboard",
      title: "Central Dashboard",
      desc: "Your Nexus Score, daily missions, and dream company countdown—all in one nerve center.",
      tag: "Core"
    },
    {
      icon: "draw",
      title: "Collaborative Whiteboard",
      desc: "Real-time WebSocket-powered canvas with tech-stencil library for system architecture design.",
      tag: "Create"
    },
    {
      icon: "folder_open",
      title: "Project Portfolio Hub",
      desc: "Case study builder with Auto-Doc that scrapes GitHub to generate technical summaries using AI.",
      tag: "Showcase"
    },
    {
      icon: "menu_book",
      title: "Smart Practice Hub",
      desc: "Curated DSA tracks with company-specific filters and persistent logic notes for every problem.",
      tag: "Practice"
    },
    {
      icon: "event_note",
      title: "Study Planner & Resources",
      desc: "SM-2 spaced repetition algorithm, AI resource curator, focus mode with Pomodoro timer.",
      tag: "Learn"
    },
    {
      icon: "groups",
      title: "Community Showcase",
      desc: "Gallery of system designs, code-review karma system, and unified public portfolio URLs.",
      tag: "Social"
    },
    {
      icon: "description",
      title: "AI Resume Builder",
      desc: "STAR-method optimizer and ATS gap analysis that syncs directly with your project hub.",
      tag: "Optimize"
    },
    {
      icon: "work",
      title: "Job & Internship Board",
      desc: "Compatibility scores, referral network, and guidance engine to reach your dream company.",
      tag: "Apply"
    },
    {
      icon: "smart_toy",
      title: "Autonomous Career Agents",
      desc: "24/7 job scanning, auto-apply drafts, and human-in-the-loop approval for full control.",
      tag: "AI Powered"
    }
  ];

  // Dream company flow example
  const dreamFlow = [
    {
      title: "Select Your Target",
      desc: "\"I want to work at NVIDIA\" — Set your dream company and let Nexus audit your profile."
    },
    {
      title: "System Audit",
      desc: "Nexus checks your Hub and finds no C++ or Low-Level projects. Gap identified."
    },
    {
      title: "Resource Recommendation",
      desc: "Recommends Operating Systems videos and NVIDIA mock interviews tailored to you."
    },
    {
      title: "Planner Update",
      desc: "Schedules a C++ Memory Management revision for next Tuesday automatically."
    },
    {
      title: "Resume Output",
      desc: "AI Resume Builder emphasizes \"Hardware-Software Interface\" keywords in your PDF."
    }
  ];

  return (
    <>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <main className="main-content">
        <section ref={heroRef} className="hero-section animate-section">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="material-symbols-rounded">rocket_launch</span>
              <span>The Career Engineering Ecosystem</span>
            </div>
            <h1 className="hero-title">
              Your Career,<br />
              <span className="highlight">Engineered.</span>
            </h1>
            <p className="hero-subtitle">
              Stop juggling 5-7 platforms. Nexus unifies learning, building, and landing
              your dream job into one powerful feedback loop designed for modern developers.
            </p>
            <div className="hero-cta-group">
              <button className="btn btn-primary">
                <span className="material-symbols-rounded">flag</span>
                Start Your Journey
              </button>
              <button className="btn btn-secondary">
                <span className="material-symbols-rounded">play_circle</span>
                Watch Demo
              </button>
            </div>
          </div>
        </section>

        <section ref={flowRef} className="flow-section animate-section">
          <div className="section-header">
            <h2 className="section-title">
              The <span className="gradient-text">Nexus Loop</span>
            </h2>
            <p className="section-subtitle">
              One unified system that transforms fragmented effort into career momentum
            </p>
          </div>
          <div className="flow-container">
            {flowSteps.map((step, index) => (
              <div className="flow-step-wrapper" key={step.label}>
                <div className={`flow-step ${activeFlowStep === index ? 'active' : ''}`}>
                  <span className="flow-step-icon material-symbols-rounded">{step.icon}</span>
                  <span className="flow-step-label">{step.label}</span>
                  <span className="flow-step-desc">{step.desc}</span>
                </div>
                {index < flowSteps.length - 1 && (
                  <span className={`flow-arrow material-symbols-rounded ${activeFlowStep === index ? 'active' : ''}`}>arrow_forward</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section ref={problemsRef} className="problems-section animate-section">
          <div className="section-header">
            <h2 className="section-title">
              Problems We <span className="gradient-text">Solve</span>
            </h2>
            <p className="section-subtitle">
              The fragmentation of effort in tech career preparation ends here
            </p>
          </div>
          <div className="problems-grid">
            {problems.map((problem) => (
              <div className="problem-card" key={problem.title}>
                <div className="problem-icon material-symbols-rounded">{problem.icon}</div>
                <h3 className="problem-title">{problem.title}</h3>
                <p className="problem-desc">{problem.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section ref={featuresRef} className="features-section animate-section">
          <div className="section-header">
            <h2 className="section-title">
              9 Powerful <span className="gradient-text">Modules</span>
            </h2>
            <p className="section-subtitle">
              Everything you need, from learning to landing, in one integrated platform
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature) => (
              <div className="feature-card" key={feature.title}>
                <div className="feature-header">
                  <span className="feature-icon material-symbols-rounded">{feature.icon}</span>
                  <h3 className="feature-title">{feature.title}</h3>
                </div>
                <p className="feature-desc">{feature.desc}</p>
                <span className="feature-tag">{feature.tag}</span>
              </div>
            ))}
          </div>
        </section>

        <section ref={dreamRef} className="dream-section animate-section">
          <div className="dream-container">
            <div className="section-header">
              <h2 className="section-title">
                The <span className="gradient-text">"Dream Company"</span> Flow
              </h2>
              <p className="section-subtitle">
                See how Nexus engineers your path to any target company
              </p>
            </div>
            <div className="dream-flow">
              {dreamFlow.map((step, index) => (
                <div className="dream-step" key={step.title}>
                  <div className="dream-step-num">{index + 1}</div>
                  <div className="dream-step-content">
                    <h4>{step.title}</h4>
                    <p>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={ctaRef} className="cta-section animate-section">
          <div className="cta-content">
            <h2 className="cta-title">
              Ready to <span className="gradient-text">Engineer Your Career?</span>
            </h2>
            <p className="cta-subtitle">
              Join the next evolution of career preparation. Move from passive job seeking
              to active career engineering.
            </p>
            <button className="btn btn-primary">
              <span className="material-symbols-rounded">rocket_launch</span>
              Get Started Free
            </button>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-container">
            <div className="footer-grid">
              <div className="footer-col brand-col">
                <span className="logo-text">NEXUS</span>
                <p className="footer-desc">
                  The Career Engineering Ecosystem for modern developers.
                  Build, architect, and land your dream job.
                </p>
                <div className="social-links">
                  <a href="#" aria-label="Github"><span className="material-symbols-rounded">code</span></a>
                  <a href="#" aria-label="Twitter"><span className="material-symbols-rounded">share</span></a>
                  <a href="#" aria-label="LinkedIn"><span className="material-symbols-rounded">account_circle</span></a>
                </div>
              </div>

              <div className="footer-col">
                <h4>Platform</h4>
                <ul>
                  <li><a href="#">Practice Hub</a></li>
                  <li><a href="#">Project Portfolio</a></li>
                  <li><a href="#">Whiteboard</a></li>
                  <li><a href="#">Job Board</a></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4>Community</h4>
                <ul>
                  <li><a href="#">Showcase</a></li>
                  <li><a href="#">Code Review</a></li>
                  <li><a href="#">Events</a></li>
                  <li><a href="#">Forum</a></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4>Legal</h4>
                <ul>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Cookie Policy</a></li>
                </ul>
              </div>
            </div>

            <div className="footer-bottom">
              <p className="footer-text">
                Built with <span className="material-symbols-rounded" style={{ color: 'var(--brand-primary)', fontSize: '1rem', verticalAlign: 'middle' }}>favorite</span> by <span className="gradient-text">Nexus</span> — © {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}

export default App
