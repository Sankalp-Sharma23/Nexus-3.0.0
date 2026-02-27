import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Zap, ArrowRight, Building2, Code, Rocket, Users2, Award } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/ExperienceRadar.css';

const ExperienceRadar = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMouseEnter = (section) => {
    if (!isMenuOpen) {
      setActiveSection(section);
    }
  };

  const handleMouseLeave = () => {
    if (!isMenuOpen) {
      setActiveSection(null);
    }
  };

  return (
    <div className="experience-radar-page">
      <Navbar theme="dark" onMenuStateChange={setIsMenuOpen} />
      
      {/* Split Screen Hero */}
      <section className="radar-split-hero">
        
        {/* Left Side - THE HUNTER (Internships) */}
        <div 
          className={`hero-split hunter-split ${activeSection === 'hunter' ? 'active' : ''} ${activeSection === 'hustler' ? 'inactive' : ''}`}
          onMouseEnter={() => handleMouseEnter('hunter')}
          onMouseLeave={handleMouseLeave}
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
              <div className="feature-pill">
                <div className="pill-icon"><span className="material-symbols-rounded">target</span></div>
                <span>2,400+ Placements</span>
              </div>
              <div className="feature-pill">
                <div className="pill-icon"><span className="material-symbols-rounded">trending_up</span></div>
                <span>85% Success Rate</span>
              </div>
              <div className="feature-pill">
                <div className="pill-icon"><span className="material-symbols-rounded">business</span></div>
                <span>Top Companies</span>
              </div>
            </div>
            
            <Link to="/internships" className="split-cta hunter-cta">
              <span>Explore Internships</span>
              <ArrowRight size={20} />
            </Link>
            
            {/* Company Tags */}
            <div className="company-tags">
              <span className="tag">Google</span>
              <span className="tag">Microsoft</span>
              <span className="tag">Meta</span>
              <span className="tag">Amazon</span>
              <span className="tag">Apple</span>
            </div>
          </div>
          
          {/* Animated Background Elements */}
          <div className="hunter-bg-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>

        {/* Right Side - THE HUSTLER (Hackathons) */}
        <div 
          className={`hero-split hustler-split ${activeSection === 'hustler' ? 'active' : ''} ${activeSection === 'hunter' ? 'inactive' : ''}`}
          onMouseEnter={() => handleMouseEnter('hustler')}
          onMouseLeave={handleMouseLeave}
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
            
            {/* Live Indicator */}
            <div className="live-indicator">
              <div className="live-pulse"></div>
              <span className="live-text">3 Hackathons Live Now</span>
            </div>
            
            {/* Next Major Event */}
            <div className="next-major-event">
              <div className="event-label">NEXT MAJOR EVENT</div>
              <div className="event-name">MLH Global Hack Week</div>
              <div className="event-countdown">
                <div className="countdown-block">
                  <span className="count">05</span>
                  <span className="unit">D</span>
                </div>
                <span className="separator">:</span>
                <div className="countdown-block">
                  <span className="count">14</span>
                  <span className="unit">H</span>
                </div>
                <span className="separator">:</span>
                <div className="countdown-block">
                  <span className="count">32</span>
                  <span className="unit">M</span>
                </div>
              </div>
            </div>
            
            <Link to="/hackathons" className="split-cta hustler-cta">
              <span>Browse Hackathons</span>
              <Rocket size={20} />
            </Link>
            
            {/* Stats */}
            <div className="hustler-stats">
              <div className="stat-box">
                <div className="stat-value">142</div>
                <div className="stat-label">Active Events</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">$2.4M</div>
                <div className="stat-label">In Prizes</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">18K</div>
                <div className="stat-label">Participants</div>
              </div>
            </div>
          </div>
          
          {/* Animated Background Elements */}
          <div className="hustler-bg-shapes">
            <div className="neon-circle circle-1"></div>
            <div className="neon-circle circle-2"></div>
            <div className="neon-circle circle-3"></div>
          </div>
        </div>
        
      </section>

      <Footer />
    </div>
  );
};

export default ExperienceRadar;
