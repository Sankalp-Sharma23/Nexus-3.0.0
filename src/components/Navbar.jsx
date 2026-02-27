import StaggeredMenu from './StaggeredMenu';
import '../styles/Navbar.css';

const menuItems = [
    { label: 'Home',             ariaLabel: 'Go to home',              link: '/'                  },
    { label: 'Dashboard',        ariaLabel: 'Open dashboard',          link: '/dashboard'         },
    { label: 'Whiteboard',       ariaLabel: 'Open whiteboard',         link: '/whiteboard'        },
    { label: 'Practice Hub',     ariaLabel: 'Open practice hub',       link: '/practice-hub'      },
    { label: 'Study Planner',    ariaLabel: 'Open study planner',      link: '/study-planner'     },
    { label: 'Experience Hub',   ariaLabel: 'Open experience hub',     link: '/experience-hub'    },
    { label: 'Aim',              ariaLabel: 'View aim page',           link: '/aim'               },
    { label: 'Resume',           ariaLabel: 'Open resume builder',     link: '/resume'            },
    { label: 'Guidance',         ariaLabel: 'Open guidance',           link: '/guidance'          },
    { label: 'Placement Portal', ariaLabel: 'Open placement portal',   link: '/placement-portal'  },
];

const socialItems = [
    { label: 'GitHub',   link: 'https://github.com'   },
    { label: 'LinkedIn', link: 'https://linkedin.com' },
    { label: 'Twitter',  link: 'https://twitter.com'  },
];

const Navbar = () => {
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
        />
    );
};

export default Navbar;
