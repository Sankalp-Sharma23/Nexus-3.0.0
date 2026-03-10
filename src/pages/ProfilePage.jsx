import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Save, LogOut, Edit2, Camera, X, ArrowLeft } from 'lucide-react';
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
  });

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
    });
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    });
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
          {/* Header */}
          <div className="profile-header">
            <button
              onClick={() => navigate(-1)}
              className="back-btn"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="profile-title">My Profile</h1>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="edit-btn"
              >
                <Edit2 size={18} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Error & Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert alert-error"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert alert-success"
            >
              {success}
            </motion.div>
          )}

          {/* Avatar Section */}
          <div className="avatar-section">
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
            <div className="user-name-display">
              <h2>{formData.fullName || 'User'}</h2>
              <p className="user-email">{formData.email}</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="form-section">
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
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
                <div className="form-display">
                  <User size={18} />
                  {formData.fullName || 'Not provided'}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
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
                <div className="form-display">
                  <Mail size={18} />
                  {formData.email || 'Not provided'}
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your phone number"
                />
              ) : (
                <div className="form-display">
                  <Phone size={18} />
                  {formData.phone || 'Not provided'}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">Location</label>
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
                <div className="form-display">
                  <MapPin size={18} />
                  {formData.location || 'Not provided'}
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="form-group">
              <label className="form-label">Bio</label>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Tell us about yourself..."
                  rows="4"
                />
              ) : (
                <div className="form-display bio-display">
                  {formData.bio || 'No bio provided'}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            {isEditing ? (
              <>
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
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="btn btn-danger"
              >
                <LogOut size={18} />
                Sign Out
              </motion.button>
            )}
          </div>
          </motion.div>
          </div>
      </div>
      <Footer />
    </div>
  );
}
