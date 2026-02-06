import { useState, useEffect, useRef } from 'react';
import './Navbar.css';

const Navbar = ({ theme, toggleTheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const navbarRef = useRef(null);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    // Close navbar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && navbarRef.current && !navbarRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <nav ref={navbarRef} className={`navbar ${isOpen ? 'navbar-open' : ''}`}>
            <div className="navbar-container">
                {/* Close/Menu Button */}
                <button
                    className={`menu-toggle ${isOpen ? 'open' : ''}`}
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    <span className="line line1"></span>
                    <span className="line line2"></span>
                </button>

                {/* Logo/Title Section */}
                <div className="navbar-header">
                    <h1 className="navbar-logo">NEXUS</h1>
                </div>

                {/* Theme Toggle Button */}
                <button
                    className="theme-toggle"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    <span className="material-symbols-rounded">
                        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>

                {/* Get Started Button */}
                <a href="#" className="get-started-btn">Get Started</a>
            </div>

            {/* Dropdown Menu with Card Boxes */}
            <div className={`navbar-dropdown ${isOpen ? 'open' : ''}`}>
                <div className="navbar-cards">

                    {/* Preferences Card */}
                    <div className="nav-card card-preferences">
                        <h3 className="card-title">Preferences</h3>
                        <ul className="card-links">
                            <li><a href="#"><span className="material-symbols-rounded">home</span> Home</a></li>
                            <li><a href="#"><span className="material-symbols-rounded">settings</span> Settings</a></li>
                        </ul>
                    </div>
                    {/* Learn Card */}
                    <div className="nav-card card-learn">
                        <h3 className="card-title">Learn</h3>
                        <ul className="card-links">
                            <li><a href="#"><span className="material-symbols-rounded">menu_book</span> Practice Hub</a></li>
                            <li><a href="#"><span className="material-symbols-rounded">event_note</span> Study Planner</a></li>
                        </ul>
                    </div>

                    {/* Build Card */}
                    <div className="nav-card card-build">
                        <h3 className="card-title">Build</h3>
                        <ul className="card-links">
                            <li><a href="#"><span className="material-symbols-rounded">draw</span> Whiteboard</a></li>
                            <li><a href="#"><span className="material-symbols-rounded">folder_open</span> Project Hub</a></li>
                        </ul>
                    </div>

                    {/* Career Card */}
                    <div className="nav-card card-career">
                        <h3 className="card-title">Career</h3>
                        <ul className="card-links">
                            <li><a href="#"><span className="material-symbols-rounded">description</span> Resume Builder</a></li>
                            <li><a href="#"><span className="material-symbols-rounded">work</span> Job Board</a></li>
                            <li><a href="#"><span className="material-symbols-rounded">smart_toy</span> Career Agents</a></li>
                        </ul>
                    </div>

                    {/* Community Card */}
                    <div className="nav-card card-community">
                        <h3 className="card-title">Community</h3>
                        <ul className="card-links">
                            <li><a href="#"><span className="material-symbols-rounded">groups</span> Showcase</a></li>
                            <li><a href="#"><span className="material-symbols-rounded">dashboard</span> Dashboard</a></li>
                        </ul>
                    </div>


                </div>
            </div>
        </nav>
    );
};

export default Navbar;
