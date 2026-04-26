import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, Save, LogOut, Edit2, Camera, X, ArrowLeft,
  Code, Heart, Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const toast = useToast();
  const canvasRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    avatar: '',
    skills: [],
    interests: [],
  });

  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');

  /* ── star canvas animation ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const stars = Array.from({ length: 130 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.3 + 0.3,
      dx: (Math.random() - 0.5) * 0.17,
      dy: (Math.random() - 0.5) * 0.17,
      a: Math.random() * 0.65 + 0.2,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${s.a})`; ctx.fill();
        s.x += s.dx; s.y += s.dy;
        if (s.x < 0) s.x = canvas.width;  if (s.x > canvas.width)  s.x = 0;
        if (s.y < 0) s.y = canvas.height; if (s.y > canvas.height) s.y = 0;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  // Sync formData when user changes
  useEffect(() => {
    if (!user) return;
    setFormData({
      fullName: user.name || user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.location || '',
      bio: user.bio || '',
      avatar: user.avatar || '',
      skills: user.skills || [],
      interests: user.interests || [],
    });
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest)) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest]
      }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interestToRemove) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interestToRemove)
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData(prev => ({
          ...prev,
          avatar: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaveLoading(true);

    try {
      const result = await updateProfile({
        name: formData.fullName,
        phone: formData.phone,
        location: formData.location,
        bio: formData.bio,
        avatar: formData.avatar,
        skills: formData.skills,
        interests: formData.interests,
      });

      if (result.success) {
        toast.success(result.offline ? 'Profile saved locally!' : 'Profile updated!');
        setSuccess(result.offline ? 'Profile saved locally!' : 'Profile updated successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        toast.error('Failed to update profile.');
        setError('Failed to update profile. Please try again.');
      }
    } catch (err) {
      toast.error('Connection error.');
      setError('Connection error. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.name || user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      location: user?.location || '',
      bio: user?.bio || '',
      avatar: user?.avatar || '',
      skills: user?.skills || [],
      interests: user?.interests || [],
    });
    setNewSkill('');
    setNewInterest('');
    setPreviewImage(null);
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="profile-root">
        <div className="profile-loading">Loading...</div>
      </div>
    );
  }

  const tabVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'about', label: 'About', icon: Heart },
  ];

  return (
    <div className="profile-root">
      <Navbar />
      <canvas ref={canvasRef} className="profile-canvas" />

      <div className="profile-body">
        <div className="profile-card-wrap">
          <div className="profile-conic" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="profile-card"
          >
            {/* Header with Avatar */}
            <div className="profile-header-new">
              <button
                onClick={() => navigate(-1)}
                className="back-btn"
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="profile-header-content">
                <div className="profile-avatar-section">
                  <div className="avatar-wrapper">
                    {previewImage || formData.avatar ? (
                      <img src={previewImage || formData.avatar} alt="User avatar" className="avatar-image" />
                    ) : (
                      <div className="avatar-placeholder">
                        <User size={48} />
                      </div>
                    )}
                    {isEditing && (
                      <label className="avatar-upload-label">
                        <Camera size={20} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="profile-info-display">
                    <h1 className="profile-name">{formData.fullName || 'User'}</h1>
                    <p className="profile-email">{formData.email}</p>
                  </div>
                </div>

                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="edit-btn-header"
                  >
                    <Edit2 size={16} />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Error & Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="alert alert-error"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="alert alert-success"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab Navigation */}
            <div className="tab-navigation">
              {tabs.map(tab => {
                const IconComponent = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <IconComponent size={18} />
                    {tab.label}
                  </motion.button>
                );
              })}
              <div className="tab-indicator" style={{ '--tab-position': `${tabs.findIndex(t => t.id === activeTab) * 100}%` }} />
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="tab-content"
              >
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="tab-pane">
                    <div className="info-grid">
                      <div className="info-card">
                        <div className="info-icon">
                          <Mail size={24} />
                        </div>
                        <div className="info-details">
                          <span className="info-label">Email</span>
                          {isEditing ? (
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className="form-input"
                              placeholder="Enter your email"
                            />
                          ) : (
                            <span className="info-value">{formData.email || 'Not provided'}</span>
                          )}
                        </div>
                      </div>

                      <div className="info-card">
                        <div className="info-icon">
                          <Phone size={24} />
                        </div>
                        <div className="info-details">
                          <span className="info-label">Phone</span>
                          {isEditing ? (
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="form-input"
                              placeholder="Enter your phone"
                            />
                          ) : (
                            <span className="info-value">{formData.phone || 'Not provided'}</span>
                          )}
                        </div>
                      </div>

                      <div className="info-card">
                        <div className="info-icon">
                          <MapPin size={24} />
                        </div>
                        <div className="info-details">
                          <span className="info-label">Location</span>
                          {isEditing ? (
                            <input
                              type="text"
                              name="location"
                              value={formData.location}
                              onChange={handleInputChange}
                              className="form-input"
                              placeholder="Enter your location"
                            />
                          ) : (
                            <span className="info-value">{formData.location || 'Not provided'}</span>
                          )}
                        </div>
                      </div>

                      <div className="info-card">
                        <div className="info-icon">
                          <User size={24} />
                        </div>
                        <div className="info-details">
                          <span className="info-label">Full Name</span>
                          {isEditing ? (
                            <input
                              type="text"
                              name="fullName"
                              value={formData.fullName}
                              onChange={handleInputChange}
                              className="form-input"
                              placeholder="Enter your full name"
                            />
                          ) : (
                            <span className="info-value">{formData.fullName || 'Not provided'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio Section */}
                    <div className="bio-section">
                      <h3 className="section-title">About Me</h3>
                      {isEditing ? (
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          className="form-textarea"
                          placeholder="Tell us about yourself..."
                          rows="5"
                        />
                      ) : (
                        <p className="bio-text">{formData.bio || 'No bio provided. Update your profile to add one!'}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* About Tab */}
                {activeTab === 'about' && (
                  <div className="tab-pane">
                    {/* Skills Section */}
                    <div className="section">
                      <div className="section-header">
                        <h3 className="section-title">
                          <Code size={20} />
                          Skills
                        </h3>
                        {isEditing && (
                          <span className="section-helper">{formData.skills.length} skills</span>
                        )}
                      </div>

                      {isEditing && (
                        <div className="add-item-group">
                          <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                            className="form-input"
                            placeholder="Add a new skill..."
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleAddSkill}
                            className="add-btn"
                          >
                            <Plus size={18} />
                          </motion.button>
                        </div>
                      )}

                      {formData.skills.length > 0 ? (
                        <div className="tags-container">
                          {formData.skills.map(skill => (
                            <motion.div
                              key={skill}
                              className="tag"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <span>{skill}</span>
                              {isEditing && (
                                <button
                                  onClick={() => handleRemoveSkill(skill)}
                                  className="tag-remove"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <p className="empty-state">
                          {isEditing ? 'Add your first skill!' : 'No skills added yet'}
                        </p>
                      )}
                    </div>

                    {/* Interests Section */}
                    <div className="section">
                      <div className="section-header">
                        <h3 className="section-title">
                          <Heart size={20} />
                          Interests
                        </h3>
                        {isEditing && (
                          <span className="section-helper">{formData.interests.length} interests</span>
                        )}
                      </div>

                      {isEditing && (
                        <div className="add-item-group">
                          <input
                            type="text"
                            value={newInterest}
                            onChange={(e) => setNewInterest(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                            className="form-input"
                            placeholder="Add a new interest..."
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleAddInterest}
                            className="add-btn"
                          >
                            <Plus size={18} />
                          </motion.button>
                        </div>
                      )}

                      {formData.interests.length > 0 ? (
                        <div className="tags-container">
                          {formData.interests.map(interest => (
                            <motion.div
                              key={interest}
                              className="tag interest-tag"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <span>{interest}</span>
                              {isEditing && (
                                <button
                                  onClick={() => handleRemoveInterest(interest)}
                                  className="tag-remove"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <p className="empty-state">
                          {isEditing ? 'Add your first interest!' : 'No interests added yet'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Action Buttons */}
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="action-buttons-new"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="btn btn-primary"
                >
                  <Save size={18} />
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                  className="btn btn-secondary"
                >
                  <X size={18} />
                  Cancel
                </motion.button>
              </motion.div>
            )}

            {!isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="action-buttons-new"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="btn btn-danger"
                >
                  <LogOut size={18} />
                  Sign Out
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
