import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowUpRight } from 'lucide-react';
import '../styles/CardNav.css';

const CardNav = ({
  items,
  className = '',
  ease = 'power3.out',
  baseColor = '#fff',
  menuColor,
  closeMenuTrigger,
  onMenuStateChange,
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);
  const containerRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 260;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const contentEl = navEl.querySelector('.card-nav-content');
      if (contentEl) {
        const wasVisible = contentEl.style.visibility;
        const wasPointerEvents = contentEl.style.pointerEvents;
        const wasPosition = contentEl.style.position;
        const wasHeight = contentEl.style.height;

        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';

        contentEl.offsetHeight;

        const topBar = 60;
        const padding = 16;
        const contentHeight = contentEl.scrollHeight;

        contentEl.style.visibility = wasVisible;
        contentEl.style.pointerEvents = wasPointerEvents;
        contentEl.style.position = wasPosition;
        contentEl.style.height = wasHeight;

        return topBar + contentHeight + padding;
      }
    }
    return 260;
  };

const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    // Filter out any undefined refs
    const validCards = cardsRef.current.filter(card => card);
    if (validCards.length === 0) return null;

    gsap.set(validCards, { y: 20, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(validCards, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 });

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      tlRef.current.kill();
      const newTl = createTimeline();
      if (newTl) {
        if (isExpanded) {
          newTl.progress(1);
        }
        tlRef.current = newTl;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isExpanded && containerRef.current && !containerRef.current.contains(event.target)) {
        const tl = tlRef.current;
        setIsHamburgerOpen(false);
        setIsExpanded(false);
        onMenuStateChange?.(false);
        if (tl) {
          tl.reverse();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, onMenuStateChange]);

  // Close menu when closeMenuTrigger changes
  useEffect(() => {
    if (closeMenuTrigger > 0 && isExpanded) {
      const tl = tlRef.current;
      setIsHamburgerOpen(false);
      setIsExpanded(false);
      onMenuStateChange?.(false);
      if (tl) {
        tl.reverse();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeMenuTrigger]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    
    if (!isExpanded) {
      // Recreate timeline if needed to ensure refs are populated
      const newTl = createTimeline();
      if (!newTl) return;
      
      tlRef.current = newTl;
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      newTl.play(0);
      onMenuStateChange?.(true);
    } else {
      setIsHamburgerOpen(false);
      setIsExpanded(false);
      onMenuStateChange?.(false);
      if (tl) {
        tl.reverse();
      }
    }
  };

  const setCardRef = i => el => {
    if (el) cardsRef.current[i] = el;
  };

  return (
    <div ref={containerRef} className={`card-nav-container ${className}`}>
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: baseColor }}>
        <div className="card-nav-inner">
          <div
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            role="button"
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            tabIndex={0}
            style={{ color: menuColor || '#000' }}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 4).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ 
                backgroundColor: item.bgColor, 
                color: item.textColor,
                '--hover-bg': item.hoverBgColor || item.bgColor
              }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <a key={`${lnk.label}-${i}`} className="nav-card-link" href={lnk.href} aria-label={lnk.ariaLabel}>
                    <ArrowUpRight className="nav-card-link-icon" size={16} aria-hidden="true" />
                    {lnk.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
