import { useState } from 'react';
import { Building2, MapPin, Clock, DollarSign, Briefcase, Search, Filter, ChevronRight, TrendingUp, Award, Users, Calendar } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/Internships.css';

const Internships = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const internships = [
    {
      id: 1,
      company: 'Google',
      logo: 'search',
      position: 'Software Engineering Intern',
      location: 'Mountain View, CA',
      type: 'Full-Time',
      duration: '3 months',
      stipend: '$8,000/mo',
      deadline: '2026-03-15',
      tags: ['Machine Learning', 'Python', 'TensorFlow'],
      applicants: 1240,
      featured: true
    },
    {
      id: 2,
      company: 'Microsoft',
      logo: 'cloud',
      position: 'Cloud Infrastructure Intern',
      location: 'Redmond, WA',
      type: 'Full-Time',
      duration: '3 months',
      stipend: '$7,500/mo',
      deadline: '2026-03-20',
      tags: ['Azure', 'DevOps', 'Cloud'],
      applicants: 980,
      featured: true
    },
    {
      id: 3,
      company: 'Meta',
      logo: 'hub',
      position: 'Product Design Intern',
      location: 'Menlo Park, CA',
      type: 'Full-Time',
      duration: '3 months',
      stipend: '$7,800/mo',
      deadline: '2026-03-10',
      tags: ['UI/UX', 'Figma', 'Design Systems'],
      applicants: 756,
      featured: false
    },
    {
      id: 4,
      company: 'Amazon',
      logo: 'shopping_cart',
      position: 'Data Science Intern',
      location: 'Seattle, WA',
      type: 'Full-Time',
      duration: '3 months',
      stipend: '$7,200/mo',
      deadline: '2026-03-25',
      tags: ['Data Analysis', 'Python', 'AWS'],
      applicants: 1100,
      featured: false
    },
    {
      id: 5,
      company: 'Apple',
      logo: 'phone_iphone',
      position: 'iOS Development Intern',
      location: 'Cupertino, CA',
      type: 'Full-Time',
      duration: '3 months',
      stipend: '$8,200/mo',
      deadline: '2026-03-18',
      tags: ['Swift', 'iOS', 'Mobile'],
      applicants: 890,
      featured: true
    },
    {
      id: 6,
      company: 'Tesla',
      logo: 'electric_car',
      position: 'Robotics Engineering Intern',
      location: 'Austin, TX',
      type: 'Full-Time',
      duration: '3 months',
      stipend: '$6,800/mo',
      deadline: '2026-03-22',
      tags: ['Robotics', 'C++', 'Automation'],
      applicants: 654,
      featured: false
    }
  ];

  const stats = [
    { icon: Briefcase, label: 'Active Openings', value: '2,456', trend: '+12%' },
    { icon: Building2, label: 'Partner Companies', value: '340', trend: '+8%' },
    { icon: Users, label: 'Students Placed', value: '18,240', trend: '+24%' },
    { icon: Award, label: 'Average Stipend', value: '$7.2K', trend: '+15%' }
  ];

  const filters = ['All Roles', 'Engineering', 'Design', 'Product', 'Data Science', 'Marketing'];

  return (
    <div className="internships-page">
      <Navbar theme="dark" />
      
      <div className="internships-container">
        {/* Hero Section */}
        <section className="internships-hero">
          <div className="hero-content">
            <div className="hero-badge">
              <Building2 size={16} />
              <span>The Hunter - Internships</span>
            </div>
            <h1 className="hero-title">
              Land Your Dream
              <span className="title-gradient"> Internship</span>
            </h1>
            <p className="hero-subtitle">
              Connect with leading companies and kickstart your career. Browse through curated opportunities tailored for ambitious students.
            </p>
            
            {/* Search Bar */}
            <div className="search-container">
              <div className="search-box">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by role, company, or technology..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button className="search-button">
                  <Filter size={18} />
                  Filters
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
              {filters.map((filter, index) => (
                <button
                  key={index}
                  className={`filter-tab ${selectedFilter === filter.toLowerCase().replace(' ', '-') ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(filter.toLowerCase().replace(' ', '-'))}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="stats-grid">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="stat-card">
                  <div className="stat-icon">
                    <Icon size={24} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                  <div className="stat-trend">
                    <TrendingUp size={14} />
                    {stat.trend}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Internships Listing */}
        <section className="internships-listing">
          <div className="listing-header">
            <h2 className="listing-title">Featured Opportunities</h2>
            <p className="listing-subtitle">{internships.length} internships available</p>
          </div>

          <div className="internships-grid">
            {internships.map((internship) => (
              <div key={internship.id} className={`internship-card ${internship.featured ? 'featured' : ''}`}>
                {internship.featured && (
                  <div className="featured-badge">
                    <Award size={14} />
                    Featured
                  </div>
                )}
                
                <div className="card-header">
                  <div className="company-logo">
                    <span className="material-symbols-rounded">{internship.logo}</span>
                  </div>
                  <div className="company-info">
                    <h3 className="company-name">{internship.company}</h3>
                    <p className="position-title">{internship.position}</p>
                  </div>
                </div>

                <div className="card-details">
                  <div className="detail-item">
                    <MapPin size={16} />
                    <span>{internship.location}</span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} />
                    <span>{internship.duration}</span>
                  </div>
                  <div className="detail-item">
                    <DollarSign size={16} />
                    <span>{internship.stipend}</span>
                  </div>
                </div>

                <div className="card-tags">
                  {internship.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>

                <div className="card-footer">
                  <div className="applicants-info">
                    <Users size={16} />
                    <span>{internship.applicants} applicants</span>
                  </div>
                  <button className="apply-button">
                    <span>Apply Now</span>
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="deadline-banner">
                  <Calendar size={14} />
                  Deadline: {new Date(internship.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Don't See Your Dream Role?</h2>
            <p className="cta-subtitle">Set up job alerts and get notified when new opportunities match your profile</p>
            <button className="cta-button">
              Create Job Alert
              <ChevronRight size={20} />
            </button>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default Internships;
