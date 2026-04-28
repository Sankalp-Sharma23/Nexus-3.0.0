/**
 * components/ResumeDashboard.jsx
 * Nexus Resume Builder — Main dashboard
 * Design: matches Nexus Dashboard.css design language
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Sparkles, ArrowRight, Zap, AlertCircle,
  Trash2, Eye, Edit, TrendingUp, Clock, LayoutTemplate,
  Target, CheckCircle2, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import GradientBlinds from './GradientBlinds';
import Footer from './Footer';
import '../styles/ResumeDashboard.css';

const TEMPLATES = [
  { id: 'classic',   label: 'Classic',   emoji: '📄', desc: 'Traditional, ATS-optimized single-column layout' },
  { id: 'modern',    label: 'Modern',    emoji: '✨', desc: 'Contemporary with sidebar, accent colors, modern typography' },
  { id: 'minimal',   label: 'Minimal',   emoji: '⚪', desc: 'Clean and minimal with maximum whitespace' },
];

function ATSBadge({ score }) {
  if (!score) return null;
  const cls = score >= 75 ? 'rdb-ats-badge--high' : score >= 55 ? 'rdb-ats-badge--med' : 'rdb-ats-badge--low';
  return (
    <span className={`rdb-ats-badge ${cls}`}>
      <TrendingUp size={10} /> {score}
    </span>
  );
}

function ResumeCard({ resume, onEdit, onDelete, onView }) {
  const accentCls = `rdb-card-accent--${resume.template || 'default'}`;
  const templateCls = `rdb-card-template--${resume.template || 'classic'}`;
  return (
    <motion.div
      className="rdb-card"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileHover={{ y: -4 }}
    >
      <div className={`rdb-card-accent ${accentCls}`} />
      <div className="rdb-card-body">
        <div className="rdb-card-row">
          <h3 className="rdb-card-title">{resume.title || 'Untitled'}</h3>
          <span className={`rdb-card-template ${templateCls}`}>{resume.template || 'classic'}</span>
        </div>
        <p className="rdb-card-role">
          {resume.targetRole || 'General Resume'}
          {resume.targetCompany && ` @ ${resume.targetCompany}`}
        </p>
        <div className="rdb-card-meta">
          <span className="rdb-meta-item">
            <Clock size={10} />
            {new Date(resume.updatedAt).toLocaleDateString()}
          </span>
          {resume.aiEnhanced && (
            <span className="rdb-meta-item rdb-meta-item--ai">
              <Sparkles size={10} /> AI Enhanced
            </span>
          )}
          {resume.isDraft && (
            <span className="rdb-meta-item rdb-meta-item--draft">Draft</span>
          )}
          {resume.atsScore > 0 && <ATSBadge score={resume.atsScore} />}
        </div>
      </div>
      <div className="rdb-card-actions">
        <button className="rdb-act-btn rdb-act-btn--primary" onClick={() => onEdit(resume._id)}>
          <Edit size={12} /> Edit
        </button>
        <button className="rdb-act-btn rdb-act-btn--secondary" onClick={() => onView(resume._id)}>
          <Eye size={12} /> View
        </button>
        <button className="rdb-act-btn rdb-act-btn--danger" onClick={() => onDelete(resume._id)}>
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}

function TemplateModal({ isOpen, onClose, onSelect }) {
  const [selected, setSelected] = useState('classic');
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="rdb-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rdb-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="rdb-modal-head">
              <h2 className="rdb-modal-title">Choose a Template</h2>
              <button className="rdb-modal-close" onClick={onClose}><X size={16} /></button>
            </div>
            <div className="rdb-template-grid">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  className={`rdb-template-card ${selected === t.id ? 'selected' : ''}`}
                  onClick={() => setSelected(t.id)}
                >
                  <div className="rdb-template-emoji">{t.emoji}</div>
                  <div className="rdb-template-name">{t.label}</div>
                  <div className="rdb-template-desc">{t.desc}</div>
                  {selected === t.id && <CheckCircle2 size={16} style={{ color: '#8b5cf6' }} />}
                </button>
              ))}
            </div>
            <button className="rdb-template-choose" onClick={() => onSelect(selected)}>
              <Sparkles size={15} style={{ marginRight: 6 }} />
              Start with {TEMPLATES.find(t => t.id === selected)?.label} Template
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ResumeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resumes, setResumes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState(null);
  const [toast, setToast]       = useState(null);
  const [offline, setOffline]   = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    fetch('/api/resume', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        // 401 = token expired → redirect to login
        if (r.status === 401) {
          navigate('/login');
          return null;
        }
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          console.warn('[ResumeDashboard] list error:', r.status, data);
          return null;
        }
        return data;
      })
      .then(d => {
        if (!d) return;
        setResumes(d.resumes || []);
        if (d._offline) setOffline(true);
      })
      .catch(e => console.error('[ResumeDashboard] fetch error:', e))
      .finally(() => setLoading(false));
  }, [navigate]);

  const createResume = async (templateId) => {
    setShowModal(false);
    const token = localStorage.getItem('nexus_token');
    if (!token) { navigate('/login'); return; }
    try {
      const res = await fetch('/api/resume/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `Resume — ${new Date().toLocaleDateString()}`,
          template: templateId,
        }),
      });
      // 401 = expired token
      if (res.status === 401) { navigate('/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      navigate(`/resume-builder/${data.resume._id}`);
    } catch (err) {
      console.error('[createResume]', err.message);
      showToast(err.message || 'Failed to create resume', 'error');
    }
  };

  const deleteResume = async () => {
    if (!resumeToDelete) return;
    try {
      const res = await fetch(`/api/resume/${resumeToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token')}` },
      });
      if (!res.ok) throw new Error();
      setResumes(prev => prev.filter(r => r._id !== resumeToDelete));
      showToast('Resume deleted');
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setResumeToDelete(null);
    }
  };

  return (
    <div className="resume-dashboard">
      <Navbar />

      <div className="rdb-page">
        {/* Top bar */}
        <div className="rdb-topbar">
          <span className="rdb-site-tag"><Zap size={11} />NEXUS / RESUME BUILDER</span>
          <span className="rdb-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>

        {/* Offline / DB unavailable banner */}
        {offline && (
          <div className="rdb-offline-banner">
            <AlertCircle size={14} />
            <span>Database is temporarily unavailable — your resumes will appear once the connection is restored. Please check your <strong>MongoDB Atlas IP whitelist</strong>.</span>
          </div>
        )}

        {/* Hero */}
        <motion.section
          className="rdb-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* GradientBlinds WebGL canvas — full-bleed background */}
          <div className="rdb-hero-canvas">
            <GradientBlinds
              gradientColors={['#8b5cf6', '#4f46e5', '#2563eb']}
              angle={0}
              noise={0.25}
              blindCount={12}
              blindMinWidth={50}
              spotlightRadius={0.55}
              spotlightSoftness={1}
              spotlightOpacity={0.9}
              mouseDampening={0.12}
              distortAmount={0}
              shineDirection="left"
              mixBlendMode="lighten"
            />
          </div>
          <div className="rdb-hero-glow" />

          <div className="rdb-hero-content">
            <div className="rdb-eyebrow"><Sparkles size={12} /> AI-Powered Resume Builder</div>
            <h1 className="rdb-hero-title">
              Land Your Dream Job with an{' '}
              <span className="highlight">ATS-Optimized</span>{' '}
              Resume
            </h1>
            <p className="rdb-hero-sub">
              Build, enhance, and score your resume with Gemini AI — tailored to any job description in minutes.
            </p>
            <div className="rdb-hero-btns">
              <button className="rdb-btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Make Resume <ArrowRight size={14} />
              </button>
              {resumes.length === 0 && (
                <span className="rdb-hero-hint">✓ Free &amp; private</span>
              )}
            </div>
            <div className="rdb-hero-pills">
              <span className="rdb-pill"><Sparkles size={11} /> AI Enhanced</span>
              <span className="rdb-pill"><TrendingUp size={11} /> ATS Scoring</span>
              <span className="rdb-pill"><LayoutTemplate size={11} /> 3 Templates</span>
              <span className="rdb-pill"><Target size={11} /> Aim Linked</span>
            </div>
          </div>

          <div className="rdb-hero-visual">
            <img
              src="/resume-hero.png"
              alt="Resume Builder preview"
              className="rdb-hero-img"
            />
          </div>
        </motion.section>

        {/* Resume grid */}
        <div className="rdb-section-head">
          <span className="rdb-section-title">Your Resumes</span>
          {resumes.length > 0 && (
            <span className="rdb-section-count">{resumes.length} saved</span>
          )}
        </div>

        {loading ? (
          <div className="rdb-loading">
            <div className="rdb-spinner" />
            <p>Loading your resumes...</p>
          </div>
        ) : (
          <div className="rdb-grid">
            {/* Create new card */}
            <motion.button
              className="rdb-create-card"
              onClick={() => setShowModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="rdb-create-icon"><Plus size={22} /></div>
              <span className="rdb-create-label">Create New Resume</span>
            </motion.button>

            <AnimatePresence>
              {resumes.map(r => (
                <ResumeCard
                  key={r._id}
                  resume={r}
                  onEdit={id => navigate(`/resume-builder/${id}`)}
                  onDelete={id => setResumeToDelete(id)}
                  onView={id => navigate(`/resume-old/${id}`)}
                />
              ))}
            </AnimatePresence>

            {resumes.length === 0 && (
              <motion.div className="rdb-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <FileText size={56} className="rdb-empty-icon" />
                <h3>No resumes yet</h3>
                <p>Create your first resume to get started</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Feature cards */}
        <div className="rdb-section-head" style={{ marginTop: 8 }}>
          <span className="rdb-section-title">Why Nexus Resume Builder</span>
        </div>
        <div className="rdb-features">
          {[
            { icon: Sparkles, label: 'AI Enhancement', desc: 'Gemini AI transforms bullet points into ATS-friendly content', color: 'purple' },
            { icon: TrendingUp, label: 'ATS Scoring', desc: 'Real-time ATS score. Auto-optimize to 90+ with one click', color: 'green' },
            { icon: LayoutTemplate, label: '3 Templates', desc: 'Classic, Modern, Minimal — each crafted for ATS systems', color: 'blue' },
            { icon: Target, label: 'Aim Linked', desc: 'Import your career goal from Aim to perfectly tailor content', color: 'amber' },
          ].map((f, i) => (
            <motion.div
              key={f.label}
              className="rdb-feat"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <div className={`rdb-feat-icon rdb-feat-icon--${f.color}`}><f.icon size={18} /></div>
              <h4>{f.label}</h4>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <TemplateModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={createResume}
      />

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {resumeToDelete && (
          <motion.div
            className="rdb-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setResumeToDelete(null)}
          >
            <motion.div
              className="rdb-modal"
              style={{ maxWidth: '400px' }}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="rdb-modal-head">
                <h2 className="rdb-modal-title">Delete Resume</h2>
                <button className="rdb-modal-close" onClick={() => setResumeToDelete(null)}><X size={16} /></button>
              </div>
              <div className="rdb-modal-body" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.5' }}>
                <p>Are you sure you want to delete this resume? This action cannot be undone.</p>
                <div className="rdb-modal-actions" style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                  <button className="rb-btn rb-btn--ghost" onClick={() => setResumeToDelete(null)}>Cancel</button>
                  <button className="rb-btn rb-btn--primary" style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }} onClick={deleteResume}>Delete</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`rdb-toast rdb-toast--${toast.type}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {toast.msg}
            <button className="rdb-toast-close" onClick={() => setToast(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
