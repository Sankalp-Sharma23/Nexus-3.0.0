import { useRef, useState } from "react";
import { gsap } from "gsap";
import { FiMenu, FiX } from "react-icons/fi";
import "./CardNav.css";

const CardNav = ({
  logo,
  logoAlt = "Logo",
  items,
  baseColor = "#fff",
  menuColor = "#000",
  buttonBgColor = "#111",
  buttonTextColor = "#fff",
  ease = "power3.out",
  theme = "light",
}) => {
  const itemContainerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  const toggleMenu = () => {
    if (!menuOpen) {
      setMenuOpen(true);
      gsap.fromTo(
        itemContainerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.3, ease }
      );
    } else {
      gsap.to(itemContainerRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.2,
        ease,
        onComplete: () => setMenuOpen(false),
      });
    }
  };

  const handleItemHover = (index) => {
    setHoveredItem(index);
  };

  const handleItemLeave = () => {
    setHoveredItem(null);
  };

  return (
    <nav className={`card-nav ${theme}`} style={{ "--base-color": baseColor }}>
      <div className="card-nav-inner">
        <div className="card-nav-logo">
          {logo ? (
            typeof logo === "string" ? (
              <img src={logo} alt={logoAlt} />
            ) : (
              logo
            )
          ) : (
            <span className="logo-text">NEXUS</span>
          )}
        </div>

        <div className="card-nav-menu">
          <button
            className="menu-toggle"
            onClick={toggleMenu}
            style={{
              backgroundColor: buttonBgColor,
              color: buttonTextColor,
            }}
          >
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            <span>{menuOpen ? "Close" : "Menu"}</span>
          </button>

          {menuOpen && (
            <div className="item-container" ref={itemContainerRef}>
              {items.map((item, index) => (
                <div
                  key={index}
                  className={`nav-item-card ${hoveredItem === index ? "hovered" : ""}`}
                  style={{
                    "--card-bg": item.bgColor,
                    "--card-text": item.textColor,
                  }}
                  onMouseEnter={() => handleItemHover(index)}
                  onMouseLeave={handleItemLeave}
                >
                  <span className="item-label">{item.label}</span>
                  <div className="item-links">
                    {item.links.map((link, linkIndex) => (
                      <a
                        key={linkIndex}
                        href={link.href || "#"}
                        aria-label={link.ariaLabel}
                        className="item-link"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default CardNav;
