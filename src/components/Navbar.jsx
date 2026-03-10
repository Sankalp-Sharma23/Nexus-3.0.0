import { useLocation, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import StaggeredMenu from './StaggeredMenu';
import '../styles/Navbar.css';

const menuItems = [
    { label: 'Home',              ariaLabel: 'Go to home',              link: '/'                  },
    { label: 'Dashboard',         ariaLabel: 'Open dashboard',          link: '/dashboard'         },
    { label: 'Practice Hub',      ariaLabel: 'Open practice hub',       link: '/practice'          },
    { label: 'Study Planner',     ariaLabel: 'Open study planner',      link: '/study-planner'     },
    { label: 'Whiteboard',        ariaLabel: 'Open whiteboard',         link: '/whiteboard'        },
    { label: 'Experience Hub',    ariaLabel: 'Open experience hub',     link: '/experience-hub'    },
    { label: 'Aim',               ariaLabel: 'View aim page',           link: '/aim'               },
    { label: 'Guidance',          ariaLabel: 'Open guidance',           link: '/guidance'          },
    { label: 'Placement Portal',  ariaLabel: 'Open placement portal',   link: '/placement-portal'  },
    { label: 'Resume',            ariaLabel: 'Open resume builder',     link: '/resume-builder'    },
];

const socialItems = [
    { label: 'GitHub',   link: 'https://github.com'   },
    { label: 'LinkedIn', link: 'https://linkedin.com' },
    { label: 'Twitter',  link: 'https://twitter.com'  },
];

const Navbar = ({ leftSlot } = {}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const currentPath = location.pathname;

    const handleProfileClick = () => {
        if (isAuthenticated) {
            navigate('/profile');
        } else {
            navigate('/login');
        }
    };

    const profileIcon = (
        <User size={24} color="white" strokeWidth={1.5} />
    );

    return (
        <StaggeredMenu
            position="right"
            isFixed={true}
            logoText="NEXUS"
            items={menuItems}
            socialItems={socialItems}
            displaySocials={true}
            displayItemNumbering={true}
            menuButtonColor="#ffffff"
            openMenuButtonColor="#000000"
            changeMenuColorOnOpen={true}
            colors={['#1e1340', '#5227FF']}
            accentColor="#8b5cf6"
            closeOnClickAway={true}
            activePath={currentPath}
            leftSlot={leftSlot}
            profileIcon={profileIcon}
            onProfileClick={handleProfileClick}
        />
    );
};

export default Navbar;
