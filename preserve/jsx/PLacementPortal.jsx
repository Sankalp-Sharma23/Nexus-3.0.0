import { useState } from 'react';
import Navbar from "./Navbar";
import Footer from './Footer';
import { 
  Briefcase, 
  TrendingUp, 
  Calendar, 
  Bookmark, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Heart,
  ExternalLink,
  Filter,
  X
} from 'lucide-react';
import '../styles/PlacementPortal.css';

const PLacementPortal = () => {
  const [expandedFilters, setExpandedFilters] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(true);

  const jobsPerPage = 15;

  // Stats data
  const stats = [
    { label: 'Applications Sent', value: '24', icon: <Briefcase size={24} />, color: '#8b5cf6' },
    { label: 'Profile Strength', value: '85%', icon: <TrendingUp size={24} />, color: '#10b981', showProgress: true },
    { label: 'Upcoming Interviews', value: '3', icon: <Calendar size={24} />, color: '#3b82f6' },
    { label: 'Saved Jobs', value: '12', icon: <Bookmark size={24} />, color: '#f59e0b' }
  ];

  // Filter data
  const filterData = {
    'Work mode': [
      { label: 'Work from office', count: 102057 },
      { label: 'Hybrid', count: 5696 },
      { label: 'Remote', count: 3419 }
    ],
    'Experience': [
      { label: 'Any', count: null },
      { label: '0-1 Years', count: null },
      { label: '1-3 Years', count: null },
      { label: '3-5 Years', count: null },
      { label: '5+ Years', count: null }
    ],
    'Department': [
      { label: 'Engineering - Software & QA', count: 104878 },
      { label: 'Data Science & Analytics', count: 1225 },
      { label: 'IT & Information Security', count: 853 },
      { label: 'Production, Manufacturing & Engineering', count: 748 }
    ],
    'Location': [
      { label: 'Bengaluru', count: 37800 },
      { label: 'Hyderabad', count: 19019 },
      { label: 'Pune', count: 15230 },
      { label: 'Delhi / NCR', count: 14204 }
    ],
    'Salary': [
      { label: '0-3 Lakhs', count: 9546 },
      { label: '3-6 Lakhs', count: 58938 },
      { label: '6-10 Lakhs', count: 73310 },
      { label: '10-15 Lakhs', count: 33623 },
      { label: '15+ Lakhs', count: 15000 }
    ],
    'Company type': [
      { label: 'Foreign MNC', count: 36253 },
      { label: 'Corporate', count: 15455 },
      { label: 'Indian MNC', count: 6486 },
      { label: 'Startup', count: 2916 }
    ],
    'Role category': [
      { label: 'Software Development', count: 89901 },
      { label: 'DevOps', count: 6731 },
      { label: 'Quality Assurance and Testing', count: 6178 },
      { label: 'DBA / Data warehousing', count: 2068 }
    ],
    'Education': [
      { label: 'Any Postgraduate', count: 82659 },
      { label: 'M.Tech', count: 5775 },
      { label: 'Any Graduate', count: 71101 },
      { label: 'B.Tech/B.E.', count: 40252 }
    ],
    'Industry': [
      { label: 'IT Services & Consulting', count: 76866 },
      { label: 'Software Product', count: 4884 },
      { label: 'Recruitment / Staffing', count: 3566 },
      { label: 'Financial Services', count: 2379 }
    ],
    'Top companies': [
      { label: 'Accenture', count: 19622 },
      { label: 'Wipro', count: 1551 },
      { label: 'Infosys', count: 641 },
      { label: 'Capgemini', count: 635 }
    ]
  };

  // Mock job data
  const allJobs = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    title: ['Senior Frontend Developer', 'Full Stack Engineer', 'Backend Developer', 'DevOps Engineer', 'Software Engineer'][i % 5],
    company: ['Accenture', 'Wipro', 'Infosys', 'Capgemini', 'TCS'][i % 5],
    location: ['Bengaluru', 'Hyderabad', 'Pune', 'Delhi NCR', 'Mumbai'][i % 5],
    experience: ['0-2 years', '2-4 years', '3-5 years', '5+ years'][i % 4],
    salary: ['3-6 Lakhs', '6-10 Lakhs', '10-15 Lakhs', '15-20 Lakhs'][i % 4],
    mode: ['Remote', 'Hybrid', 'Work from office'][i % 3],
    posted: ['Today', '2 days ago', '1 week ago'][i % 3],
    description: 'Looking for a talented developer to join our growing team. Must have strong problem-solving skills and experience with modern technologies.',
    logo: `https://ui-avatars.com/api/?name=${['Accenture', 'Wipro', 'Infosys', 'Capgemini', 'TCS'][i % 5]}&background=random`
  }));

  const toggleFilter = (filterName) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  const handleFilterChange = (filterName, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterName]: prev[filterName]?.includes(value)
        ? prev[filterName].filter(v => v !== value)
        : [...(prev[filterName] || []), value]
    }));
  };

  const toggleSaveJob = (jobId) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(allJobs.length / jobsPerPage);
  const currentJobs = allJobs.slice(
    (currentPage - 1) * jobsPerPage,
    currentPage * jobsPerPage
  );

  return (
    <div className="placement-portal">
      <Navbar theme="dark" />
      
      {/* Stats Section */}
      <section className="portal-stats">
        <div className="stats-container">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: `${stat.color}15` }}>
                <div style={{ color: stat.color }}>{stat.icon}</div>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                {stat.showProgress && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: stat.value, backgroundColor: stat.color }}></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content Section */}
      <section className="portal-main">
        <div className="portal-container">
          {/* Filter Sidebar */}
          <aside className={`filter-sidebar ${filterSidebarOpen ? 'open' : 'collapsed'}`}>
            <div className="filter-header">
              <div className="filter-title">
                <Filter size={20} />
                <h3>All Filters</h3>
              </div>
              
            </div>

            {filterSidebarOpen && (
              <div className="filter-content">
                {Object.entries(filterData).map(([filterName, options]) => (
                  <div key={filterName} className="filter-group">
                    <button 
                      className="filter-group-header"
                      onClick={() => toggleFilter(filterName)}
                    >
                      <span>{filterName}</span>
                      {expandedFilters[filterName] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    
                    {expandedFilters[filterName] && (
                      <div className="filter-options">
                        {options.map((option, idx) => (
                          <label key={idx} className="filter-option">
                            <input 
                              type="checkbox"
                              checked={selectedFilters[filterName]?.includes(option.label) || false}
                              onChange={() => handleFilterChange(filterName, option.label)}
                            />
                            <span className="filter-label">
                              {option.label}
                              {option.count && <span className="filter-count">({option.count.toLocaleString()})</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Job Listings */}
          <div className="job-listings">
            <div className="listings-header">
              <h2>{allJobs.length.toLocaleString()} Jobs Found</h2>
              <select className="sort-select">
                <option>Most Relevant</option>
                <option>Most Recent</option>
                <option>Salary: High to Low</option>
                <option>Salary: Low to High</option>
              </select>
            </div>

            <div className="jobs-grid">
              {currentJobs.map(job => (
                <div key={job.id} className="job-card">
                  <div className="job-card-header">
                    <img src={job.logo} alt={job.company} className="company-logo" />
                    <button 
                      className={`save-btn ${savedJobs.has(job.id) ? 'saved' : ''}`}
                      onClick={() => toggleSaveJob(job.id)}
                    >
                      <Heart size={18} fill={savedJobs.has(job.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  
                  <h3 className="job-title">{job.title}</h3>
                  <p className="company-name">{job.company}</p>
                  
                  <div className="job-details">
                    <div className="job-detail">
                      <MapPin size={14} />
                      <span>{job.location}</span>
                    </div>
                    <div className="job-detail">
                      <Briefcase size={14} />
                      <span>{job.experience}</span>
                    </div>
                    <div className="job-detail">
                      <DollarSign size={14} />
                      <span>{job.salary}</span>
                    </div>
                  </div>

                  <div className="job-tags">
                    <span className="job-tag">{job.mode}</span>
                    <span className="job-tag-time">{job.posted}</span>
                  </div>

                  <p className="job-description">{job.description}</p>

                  <button className="apply-btn">
                    Apply Now
                    <ExternalLink size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button 
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`page-number ${page === currentPage ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button 
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default PLacementPortal
