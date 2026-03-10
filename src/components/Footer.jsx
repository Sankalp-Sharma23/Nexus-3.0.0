import { useState } from 'react';
import { 
  Github, 
  Twitter, 
  Linkedin, 
  MessageCircle, 
  Mail, 
  Send,
  MapPin,
  Phone,
  ArrowRight,
  Heart,
  Sparkles,
  Code,
  Zap
} from 'lucide-react';
import '../styles/Footer.css';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setEmail('');
      }, 3000);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-glow"></div>
      
      <div className="footer-container">
        {/* Newsletter Section */}
        <div className="footer-newsletter">
          <div className="newsletter-content">
            <div className="newsletter-icon">
              <Sparkles size={28} />
            </div>
            <div className="newsletter-text">
              <h3 className="newsletter-title">Stay in the Loop</h3>
              <p className="newsletter-subtitle">Get the latest updates, tips, and opportunities delivered to your inbox.</p>
            </div>
          </div>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <div className="newsletter-input-wrapper">
              <Mail size={20} className="input-icon" />
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="newsletter-input"
                required
              />
            </div>
            <button type="submit" className="newsletter-btn" disabled={subscribed}>
              {subscribed ? (
                <>
                  <span>Subscribed!</span>
                  <Sparkles size={18} />
                </>
              ) : (
                <>
                  <span>Subscribe</span>
                  <Send size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Main Footer Content */}
        <div className="footer-main">
          <div className="footer-brand-section">
            <div className="footer-brand">
              <div className="footer-logo-wrapper">
                <Code size={28} className="logo-icon" />
                <h3 className="footer-logo">NEXUS</h3>
              </div>
              <p className="footer-tagline">
                Empowering developers to learn, grow, and succeed in their career journey. Your all-in-one platform for technical excellence.
              </p>

              <div className="footer-social">
                <a href="https://github.com" className="social-icon" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
                  <Github size={20} />
                </a>
                <a href="https://twitter.com" className="social-icon" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
                  <Twitter size={20} />
                </a>
                <a href="https://linkedin.com" className="social-icon" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                  <Linkedin size={20} />
                </a>
                <a href="https://discord.com" className="social-icon" aria-label="Discord" target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={20} />
                </a>
              </div>
            </div>
          </div>

          <div className="footer-links-container">
            <div className="footer-section">
              <h4 className="footer-heading">
                <Code size={16} />
                Platform
              </h4>
              <ul className="footer-links">
                <li><a href="/dashboard"><ArrowRight size={14} /> Dashboard</a></li>
                <li><a href="/practice"><ArrowRight size={14} /> Practice Hub</a></li>
                <li><a href="/study-planner"><ArrowRight size={14} /> Study Planner</a></li>
                <li><a href="/whiteboard"><ArrowRight size={14} /> Whiteboard</a></li>
                <li><a href="/aim"><ArrowRight size={14} /> Aim</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4 className="footer-heading">
                <Heart size={16} />
                Explore
              </h4>
              <ul className="footer-links">
                <li><a href="/experience-hub"><ArrowRight size={14} /> Experience Hub</a></li>
                <li><a href="/internships"><ArrowRight size={14} /> Internships</a></li>
                <li><a href="/hackathons"><ArrowRight size={14} /> Hackathons</a></li>
                <li><a href="/placement-portal"><ArrowRight size={14} /> Placement Portal</a></li>
                <li><a href="/guidance"><ArrowRight size={14} /> Guidance</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4 className="footer-heading">
                <Mail size={16} />
                Get in Touch
              </h4>
              <ul className="footer-contact">
                <li>
                  <Mail size={16} />
                  <a href="mailto:hello@nexus.dev">hello@nexus.dev</a>
                </li>
                <li>
                  <Phone size={16} />
                  <a href="tel:+1234567890">+1 (234) 567-890</a>
                </li>
                <li>
                  <MapPin size={16} />
                  <span>San Francisco, CA</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            <p>© {currentYear} Nexus. All rights reserved.</p>
            <p className="made-with">
              Made with <Heart size={14} className="heart-icon" /> for developers worldwide
            </p>
          </div>
          <div className="footer-legal">
            <a href="#privacy">Privacy Policy</a>
            <span className="separator">•</span>
            <a href="#terms">Terms of Service</a>
            <span className="separator">•</span>
            <a href="#cookies">Cookie Policy</a>
            <span className="separator">•</span>
            <a href="#security">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
