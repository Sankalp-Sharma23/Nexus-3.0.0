import { useState } from 'react';
import { Zap, Trophy, Users, Calendar, MapPin, Clock, Rocket, Star } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/Hackathons.css';

const Hackathons = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const hackathons = [
    {
      id: 1,
      name: 'MLH Global Hack Week',
      organizer: 'Major League Hacking',
      emoji: 'public',
      date: 'Feb 19-25, 2026',
      location: 'Online',
      participants: '18,000+',
      prize: '$50,000',
      difficulty: 'All Levels',
      tags: ['AI/ML', 'Web3', 'Open Source'],
      isLive: false,
      daysUntil: 5,
      color: '#FF6B6B',
      featured: true
    },
    {
      id: 2,
      name: 'HackMIT 2026',
      organizer: 'MIT',
      emoji: 'school',
      date: 'Mar 5-7, 2026',
      location: 'Cambridge, MA',
      participants: '1,500+',
      prize: '$25,000',
      difficulty: 'Intermediate',
      tags: ['Hardware', 'IoT', 'Robotics'],
      isLive: false,
      daysUntil: 19,
      color: '#4ECDC4',
      featured: true
    },
    {
      id: 3,
      name: 'ETHGlobal Waterloo',
      organizer: 'ETHGlobal',
      emoji: 'bolt',
      date: 'Feb 14-16, 2026',
      location: 'Waterloo, Canada',
      participants: '2,000+',
      prize: '$100,000',
      difficulty: 'Advanced',
      tags: ['Blockchain', 'DeFi', 'Smart Contracts'],
      isLive: true,
      daysUntil: 0,
      color: '#A78BFA',
      featured: true
    },
    {
      id: 4,
      name: 'TreeHacks',
      organizer: 'Stanford University',
      emoji: 'park',
      date: 'Feb 21-23, 2026',
      location: 'Stanford, CA',
      participants: '1,200+',
      prize: '$30,000',
      difficulty: 'All Levels',
      tags: ['Climate Tech', 'Sustainability', 'Impact'],
      isLive: false,
      daysUntil: 7,
      color: '#10B981',
      featured: false
    },
    {
      id: 5,
      name: 'Google DevFest Hackathon',
      organizer: 'Google',
      emoji: 'local_fire_department',
      date: 'Mar 12-14, 2026',
      location: 'Online',
      participants: '10,000+',
      prize: '$75,000',
      difficulty: 'Intermediate',
      tags: ['Cloud', 'Mobile', 'AI'],
      isLive: false,
      daysUntil: 26,
      color: '#F59E0B',
      featured: true
    },
    {
      id: 6,
      name: 'NASA Space Apps',
      organizer: 'NASA',
      emoji: 'rocket_launch',
      date: 'Apr 2-4, 2026',
      location: 'Global',
      participants: '25,000+',
      prize: '$60,000',
      difficulty: 'All Levels',
      tags: ['Space Tech', 'Data Science', 'Innovation'],
      isLive: false,
      daysUntil: 47,
      color: '#3B82F6',
      featured: false
    }
  ];

  const leaderboard = [
    { rank: 1, team: 'Code Crushers', points: 2450, avatar: 'emoji_events' },
    { rank: 2, team: 'Byte Brigade', points: 2380, avatar: 'looks_two' },
    { rank: 3, team: 'Debug Demons', points: 2210, avatar: 'looks_3' },
    { rank: 4, team: 'Hack Heroes', points: 2050, avatar: 'star' },
    { rank: 5, team: 'Code Ninjas', points: 1890, avatar: 'target' }
  ];

  const categories = ['All', 'Web3', 'AI/ML', 'Hardware', 'Climate', 'Gaming'];

  return (
    <div className="hackathons-page">
      <Navbar theme="dark" />
      
      <div className="hackathons-container">
        {/* Hero Section */}
        <section className="hackathons-hero">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={16} />
              <span>The Hustler - Hackathons</span>
            </div>
            
            <h1 className="hero-title">
              Discover Global
              <span className="title-neon"> Hackathons</span>
            </h1>
            
            <p className="hero-subtitle">
              Participate in world-class hackathons, collaborate with talented developers, and showcase your innovative solutions.
            </p>

            {/* Live Status */}
            <div className="live-status-banner">
              <div className="live-indicator">
                <div className="live-pulse"></div>
                <Zap size={18} />
                <span>3 Hackathons Live Now</span>
              </div>
              <div className="total-prizes">
                <Trophy size={18} />
                <span>$2.4M Total Prize Pool</span>
              </div>
            </div>

            {/* Category Pills */}
            <div className="category-pills">
              {categories.map((category, index) => (
                <button
                  key={index}
                  className={`category-pill ${selectedCategory === category.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.toLowerCase())}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Hackathons Grid */}
        <section className="hackathons-listing">
          <div className="listing-header">
            <h2 className="listing-title">
              <Rocket size={28} />
              Featured Hackathons
            </h2>
          </div>

          <div className="hackathons-grid">
            {hackathons.map((hackathon) => (
              <div
                key={hackathon.id}
                className={`hackathon-card ${hackathon.featured ? 'featured' : ''} ${hackathon.isLive ? 'live' : ''}`}
                style={{ '--card-color': hackathon.color }}
              >
                {hackathon.isLive && (
                  <div className="live-tag">
                    <div className="live-dot"></div>
                    LIVE NOW!
                  </div>
                )}
                
                {hackathon.featured && !hackathon.isLive && (
                  <div className="featured-tag">
                    <Star size={14} />
                    HOT
                  </div>
                )}

                <div className="card-header">
                  <div className="emoji-badge">
                    <span className="material-symbols-rounded">{hackathon.emoji}</span>
                  </div>
                  <div className="hack-info">
                    <h3 className="hack-name">{hackathon.name}</h3>
                    <p className="hack-organizer">{hackathon.organizer}</p>
                  </div>
                </div>

                {!hackathon.isLive && hackathon.daysUntil <= 7 && (
                  <div className="countdown-badge">
                    <Clock size={14} />
                    Starts in {hackathon.daysUntil} {hackathon.daysUntil === 1 ? 'day' : 'days'}!
                  </div>
                )}

                <div className="card-details">
                  <div className="detail-row">
                    <div className="detail-item">
                      <Calendar size={16} />
                      <span>{hackathon.date}</span>
                    </div>
                    <div className="detail-item">
                      <MapPin size={16} />
                      <span>{hackathon.location}</span>
                    </div>
                  </div>
                  
                  <div className="detail-row">
                    <div className="detail-item">
                      <Users size={16} />
                      <span>{hackathon.participants}</span>
                    </div>
                    <div className="detail-item prize">
                      <Trophy size={16} />
                      <span>{hackathon.prize}</span>
                    </div>
                  </div>
                </div>

                <div className="card-tags">
                  {hackathon.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                  <span className="difficulty-tag">{hackathon.difficulty}</span>
                </div>

                <button className={`register-button ${hackathon.isLive ? 'live-button' : ''}`}>
                  <Zap size={18} />
                  <span>{hackathon.isLive ? 'Join Now' : 'Register'}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default Hackathons;
