/**
 * components/ResumeWizard.jsx
 * Multi-step form — Nexus Design System
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, AlertCircle, Sparkles,
  User, Mail, Phone, MapPin, Briefcase, GraduationCap,
  Code, Target, FileText, Plus, Trash2, CheckCircle2, Zap,
  ArrowRight, Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/ResumeWizard.css';

const STEPS = [
  { id: 0, title: 'Personal',    icon: User },
  { id: 1, title: 'Summary',     icon: FileText },
  { id: 2, title: 'Education',   icon: GraduationCap },
  { id: 3, title: 'Experience',  icon: Briefcase },
  { id: 4, title: 'Projects',    icon: Code },
  { id: 5, title: 'Skills',      icon: Sparkles },
  { id: 6, title: 'Target Job',  icon: Target },
  { id: 7, title: 'Review',      icon: CheckCircle2 },
];

/* ── Main Wizard ─────────────────────────────────────────────── */
export default function ResumeWizard() {
  const { id: resumeId } = useParams();
  const navigate = useNavigate();

  const [resume, setResume]         = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!resumeId) return;
    fetch(`/api/resume/${resumeId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token')}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setResume(d.resume))
      .catch(() => { showToast('Failed to load resume', 'error'); setTimeout(() => navigate('/resume-builder'), 2500); })
      .finally(() => setLoading(false));
  }, [resumeId, navigate]);

  // Auto-save debounce
  useEffect(() => {
    if (!resume || !resumeId) return;
    const t = setTimeout(saveResume, 2000);
    return () => clearTimeout(t);
  }, [resume]);

  const saveResume = useCallback(async () => {
    if (!resumeId || !resume) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/resume/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus_token')}` },
        body: JSON.stringify(resume),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setResume(d.resume);
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }, [resume, resumeId]);

  const updateResume = useCallback((updates) => {
    setResume(prev => ({ ...prev, ...updates }));
  }, []);

  const goToStep  = (i) => i >= 0 && i < STEPS.length && setCurrentStep(i);
  const nextStep  = () => currentStep < STEPS.length - 1 && setCurrentStep(s => s + 1);
  const prevStep  = () => currentStep > 0 && setCurrentStep(s => s - 1);

  const handleFinish = async () => {
    try {
      await fetch(`/api/resume/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus_token')}` },
        body: JSON.stringify({ ...resume, isDraft: false }),
      });
      
      // Save data to localStorage so the old ResumeBuilder can read it instantly
      localStorage.setItem('nexus_resume_v1', JSON.stringify(resume));
      
      // Navigate to legacy ResumeBuilder with the DB ID so it can sync backend
      navigate(`/resume-old/${resumeId}`);
    } catch {
      showToast('Failed to complete resume', 'error');
    }
  };

  if (loading) return (
    <div className="rw-loading">
      <Navbar />
      <div className="rw-spinner" />
      <p>Loading your resume...</p>
    </div>
  );

  if (!resume) return (
    <div className="rw-error">
      <Navbar />
      <AlertCircle size={48} />
      <h2>Resume not found</h2>
      <p>Redirecting...</p>
    </div>
  );

  return (
    <div className="rw-layout">
      <Navbar />
      <div className="rw-page">

        {/* Top bar */}
        <div className="rw-topbar">
          <span className="rw-site-tag"><Zap size={11} />NEXUS / RESUME BUILDER</span>
        </div>

        {/* Progress */}
        <div className="rw-progress-wrap">
          <div className="rw-progress-fill" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Step indicators */}
        <div className="rw-steps">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive    = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <motion.button
                key={step.id}
                className={`rw-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => goToStep(idx)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <div className="rw-step-icon">
                  {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span>{step.title}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Content card */}
        <div className="rw-card">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.25 }}
            >
              {currentStep === 0 && <StepPersonal    resume={resume} onUpdate={updateResume} />}
              {currentStep === 1 && <StepSummary     resume={resume} onUpdate={updateResume} />}
              {currentStep === 2 && <StepEducation   resume={resume} onUpdate={updateResume} />}
              {currentStep === 3 && <StepExperience  resume={resume} onUpdate={updateResume} />}
              {currentStep === 4 && <StepProjects    resume={resume} onUpdate={updateResume} />}
              {currentStep === 5 && <StepSkills      resume={resume} onUpdate={updateResume} />}
              {currentStep === 6 && <StepTargetJob   resume={resume} onUpdate={updateResume} />}
              {currentStep === 7 && <StepReview      resume={resume} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="rw-nav">
          <button className="rw-btn-nav rw-btn-nav--prev" onClick={prevStep} disabled={currentStep === 0}>
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="rw-nav-center">
            {saving && <span className="rw-saving">💾 Saving…</span>}
          </div>

          {currentStep === STEPS.length - 1 ? (
            <button className="rw-btn-nav rw-btn-nav--next" onClick={handleFinish}>
              Complete <CheckCircle2 size={16} />
            </button>
          ) : (
            <button className="rw-btn-nav rw-btn-nav--next" onClick={nextStep}>
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>

      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`rw-toast rw-toast--${toast.type}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP COMPONENTS
══════════════════════════════════════════════════════════════ */

function Field({ label, icon: Icon, children }) {
  return (
    <div className="rw-form-group">
      <label className="rw-label">{Icon && <Icon size={12} />}{label}</label>
      {children}
    </div>
  );
}
function FieldFull({ label, icon: Icon, children }) {
  return (
    <div className="rw-form-group rw-form-group--full">
      <label className="rw-label">{Icon && <Icon size={12} />}{label}</label>
      {children}
    </div>
  );
}

/* ── Step 0: Personal ──────────────────────────────────────── */
function StepPersonal({ resume, onUpdate }) {
  const p = resume.personal || {};
  const upd = f => e => onUpdate({ personal: { ...p, [f]: e.target.value } });
  return (
    <div>
      <h2 className="rw-step-title">Personal Information</h2>
      <p className="rw-step-desc">Let's start with your basic details</p>
      <div className="rw-form-grid">
        <Field label="Full Name *" icon={User}>
          <input className="rw-input" placeholder="Sankalp Sharma" value={p.name||''} onChange={upd('name')} />
        </Field>
        <Field label="Email *" icon={Mail}>
          <input className="rw-input" type="email" placeholder="you@email.com" value={p.email||''} onChange={upd('email')} />
        </Field>
        <Field label="Phone" icon={Phone}>
          <input className="rw-input" placeholder="+91 9876543210" value={p.phone||''} onChange={upd('phone')} />
        </Field>
        <Field label="Location" icon={MapPin}>
          <input className="rw-input" placeholder="Bangalore, India" value={p.location||''} onChange={upd('location')} />
        </Field>
        <FieldFull label="LinkedIn URL">
          <input className="rw-input" placeholder="linkedin.com/in/yourname" value={p.linkedin||''} onChange={upd('linkedin')} />
        </FieldFull>
        <FieldFull label="GitHub URL">
          <input className="rw-input" placeholder="github.com/yourname" value={p.github||''} onChange={upd('github')} />
        </FieldFull>
      </div>
    </div>
  );
}

/* ── Step 1: Summary ───────────────────────────────────────── */
function StepSummary({ resume, onUpdate }) {
  const p = resume.personal || {};
  const summary = p.summary || '';
  return (
    <div>
      <h2 className="rw-step-title">Professional Summary</h2>
      <p className="rw-step-desc">A brief overview of your background — AI will enhance this later</p>
      <FieldFull label="Summary (optional)">
        <textarea
          className="rw-textarea"
          rows={6}
          placeholder="Experienced software engineer with 3+ years in full-stack development, specializing in React and Node.js..."
          value={summary}
          onChange={e => onUpdate({ personal: { ...p, summary: e.target.value } })}
        />
        <span className="rw-char-count">{summary.length} / 500</span>
      </FieldFull>
    </div>
  );
}

/* ── Step 2: Education ─────────────────────────────────────── */
function StepEducation({ resume, onUpdate }) {
  const add = () => onUpdate({ education: [...(resume.education||[]), { id: Date.now(), university:'', degree:'', gpa:'', year:'', relevant:'' }] });
  const upd = (id, f, v) => onUpdate({ education: (resume.education||[]).map(e => e.id===id ? {...e,[f]:v} : e) });
  const del = (id) => onUpdate({ education: (resume.education||[]).filter(e => e.id!==id) });
  return (
    <div>
      <h2 className="rw-step-title">Education</h2>
      <p className="rw-step-desc">Add your academic background</p>
      {(resume.education||[]).map(edu => (
        <div key={edu.id} className="rw-item">
          <div className="rw-form-grid">
            <FieldFull label="University / College *">
              <input className="rw-input" placeholder="IIT Bombay" value={edu.university} onChange={e=>upd(edu.id,'university',e.target.value)} />
            </FieldFull>
            <Field label="Degree *">
              <input className="rw-input" placeholder="B.Tech Computer Science" value={edu.degree} onChange={e=>upd(edu.id,'degree',e.target.value)} />
            </Field>
            <Field label="Year">
              <input className="rw-input" placeholder="2025" value={edu.year} onChange={e=>upd(edu.id,'year',e.target.value)} />
            </Field>
            <Field label="CGPA / GPA">
              <input className="rw-input" placeholder="8.9 / 10" value={edu.gpa} onChange={e=>upd(edu.id,'gpa',e.target.value)} />
            </Field>
            <FieldFull label="Relevant Coursework / Honors">
              <textarea className="rw-textarea" rows={2} placeholder="Dean's List, Key Coursework, Scholarships..." value={edu.relevant} onChange={e=>upd(edu.id,'relevant',e.target.value)} />
            </FieldFull>
          </div>
          <button className="rw-btn-remove" onClick={() => del(edu.id)}><Trash2 size={13} /> Remove</button>
        </div>
      ))}
      <button className="rw-btn-add" onClick={add}><Plus size={14} /> Add Education</button>
    </div>
  );
}

/* ── Step 3: Experience ────────────────────────────────────── */
function StepExperience({ resume, onUpdate }) {
  const add = () => onUpdate({ experiences: [...(resume.experiences||[]), { id:Date.now(), role:'', organization:'', location:'', startDate:'', endDate:'', description:'' }] });
  const upd = (id, f, v) => onUpdate({ experiences: (resume.experiences||[]).map(e => e.id===id ? {...e,[f]:v} : e) });
  const del = (id) => onUpdate({ experiences: (resume.experiences||[]).filter(e => e.id!==id) });
  return (
    <div>
      <h2 className="rw-step-title">Work Experience</h2>
      <p className="rw-step-desc">Add your professional experience</p>
      {(resume.experiences||[]).map(exp => (
        <div key={exp.id} className="rw-item">
          <div className="rw-form-grid">
            <Field label="Job Title *" icon={Briefcase}>
              <input className="rw-input" placeholder="Software Engineer" value={exp.role} onChange={e=>upd(exp.id,'role',e.target.value)} />
            </Field>
            <Field label="Company *">
              <input className="rw-input" placeholder="Google" value={exp.organization} onChange={e=>upd(exp.id,'organization',e.target.value)} />
            </Field>
            <Field label="Location">
              <input className="rw-input" placeholder="Bangalore, India" value={exp.location} onChange={e=>upd(exp.id,'location',e.target.value)} />
            </Field>
            <Field label="Start Date">
              <input className="rw-input" type="month" value={exp.startDate} onChange={e=>upd(exp.id,'startDate',e.target.value)} />
            </Field>
            <Field label="End Date">
              <input className="rw-input" type="month" value={exp.endDate} onChange={e=>upd(exp.id,'endDate',e.target.value)} />
            </Field>
            <FieldFull label="Achievements / Description">
              <textarea className="rw-textarea" rows={3} placeholder="Led team of 5 engineers. Improved API latency by 40%..." value={exp.description} onChange={e=>upd(exp.id,'description',e.target.value)} />
            </FieldFull>
          </div>
          <button className="rw-btn-remove" onClick={() => del(exp.id)}><Trash2 size={13} /> Remove</button>
        </div>
      ))}
      <button className="rw-btn-add" onClick={add}><Plus size={14} /> Add Experience</button>
    </div>
  );
}

/* ── Step 4: Projects ──────────────────────────────────────── */
function StepProjects({ resume, onUpdate }) {
  const add = () => onUpdate({ projects: [...(resume.projects||[]), { id:Date.now(), title:'', company:'', date:'', tech:'', description:'', link:'' }] });
  const upd = (id, f, v) => onUpdate({ projects: (resume.projects||[]).map(p => p.id===id ? {...p,[f]:v} : p) });
  const del = (id) => onUpdate({ projects: (resume.projects||[]).filter(p => p.id!==id) });
  return (
    <div>
      <h2 className="rw-step-title">Projects & Portfolio</h2>
      <p className="rw-step-desc">Showcase your best work — these can be AI-enhanced later</p>
      {(resume.projects||[]).map(proj => (
        <div key={proj.id} className="rw-item">
          <div className="rw-form-grid">
            <FieldFull label="Project Title *">
              <input className="rw-input" placeholder="Nexus – AI Career Platform" value={proj.title} onChange={e=>upd(proj.id,'title',e.target.value)} />
            </FieldFull>
            <Field label="Company / Context">
              <input className="rw-input" placeholder="Personal / Startup" value={proj.company} onChange={e=>upd(proj.id,'company',e.target.value)} />
            </Field>
            <Field label="Date">
              <input className="rw-input" placeholder="Jan 2024 – Apr 2024" value={proj.date} onChange={e=>upd(proj.id,'date',e.target.value)} />
            </Field>
            <FieldFull label="Tech Stack">
              <input className="rw-input" placeholder="React, Node.js, MongoDB, Gemini AI" value={proj.tech} onChange={e=>upd(proj.id,'tech',e.target.value)} />
            </FieldFull>
            <FieldFull label="Description">
              <textarea className="rw-textarea" rows={3} placeholder="Brief description and your role..." value={proj.description} onChange={e=>upd(proj.id,'description',e.target.value)} />
            </FieldFull>
            <FieldFull label="Link (GitHub / Demo)">
              <input className="rw-input" placeholder="github.com/yourname/project" value={proj.link} onChange={e=>upd(proj.id,'link',e.target.value)} />
            </FieldFull>
          </div>
          <button className="rw-btn-remove" onClick={() => del(proj.id)}><Trash2 size={13} /> Remove</button>
        </div>
      ))}
      <button className="rw-btn-add" onClick={add}><Plus size={14} /> Add Project</button>
    </div>
  );
}

/* ── Step 5: Skills ────────────────────────────────────────── */
const QUICK_SKILLS = ['React','Node.js','Python','TypeScript','MongoDB','AWS','Docker','SQL','Git','GraphQL','Redis','Kubernetes'];

function StepSkills({ resume, onUpdate }) {
  const [input, setInput] = useState('');

  const addSkill = val => {
    const trimmed = val.trim();
    if (trimmed && !(resume.skills||[]).includes(trimmed)) {
      onUpdate({ skills: [...(resume.skills||[]), trimmed] });
      setInput('');
    }
  };

  return (
    <div>
      <h2 className="rw-step-title">Technical Skills</h2>
      <p className="rw-step-desc">Add your skills — press Enter or click + to add</p>

      <div className="rw-form-group" style={{ marginBottom: 16 }}>
        <label className="rw-label">Add Skill</label>
        <div className="rw-skill-row">
          <input
            className="rw-input"
            placeholder="React, Python, AWS..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addSkill(input); } }}
          />
          <button className="rw-btn-add-skill" onClick={() => addSkill(input)}><Plus size={16} /></button>
        </div>
      </div>

      {(resume.skills||[]).length > 0 && (
        <div className="rw-skills-wrap">
          {resume.skills.map(skill => (
            <span key={skill} className="rw-skill-tag">
              {skill}
              <button className="rw-skill-remove" onClick={() => onUpdate({ skills: resume.skills.filter(s => s!==skill) })}>✕</button>
            </span>
          ))}
        </div>
      )}

      <div className="rw-quick-skills">
        <p className="rw-quick-label">Quick Add</p>
        {QUICK_SKILLS.map(sk => (
          <button
            key={sk}
            className="rw-quick-btn"
            disabled={(resume.skills||[]).includes(sk)}
            onClick={() => addSkill(sk)}
          >
            {sk}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Step 6: Target Job ────────────────────────────────────── */
function StepTargetJob({ resume, onUpdate }) {
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);

  const importFromAim = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await fetch('/api/resume/import-aim', {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token')}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setImportMsg({ type: 'error', text: data.error || 'Failed to import' });
        return;
      }
      onUpdate({
        targetRole:    data.targetRole    || resume.targetRole,
        targetCompany: data.targetCompany || resume.targetCompany,
        targetJD:      data.targetJD      || resume.targetJD,
      });
      setImportMsg({ type: 'success', text: `✓ Imported: ${data.targetRole}${data.targetCompany ? ` @ ${data.targetCompany}` : ''}` });
    } catch {
      setImportMsg({ type: 'error', text: 'Connection failed' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <h2 className="rw-step-title">Target Job</h2>
      <p className="rw-step-desc">Specify your target role — AI will optimize your resume for it</p>

      {/* Aim Import Box */}
      <div className="rw-aim-box">
        <div className="rw-aim-info">
          <Target size={20} className="rw-aim-icon" />
          <div>
            <strong>Connected to Aim Page</strong>
            <p>Import your career goal to auto-fill this section</p>
          </div>
        </div>
        <button className="rw-btn-aim" onClick={importFromAim} disabled={importing}>
          {importing
            ? <><Loader2 size={14} className="rw-spin" /> Importing…</>
            : <><ArrowRight size={14} /> Import from Aim</>}
        </button>
      </div>

      {importMsg && (
        <div className={`rw-aim-feedback rw-aim-feedback--${importMsg.type}`}>
          {importMsg.text}
        </div>
      )}

      <div className="rw-form-grid">
        <Field label="Target Role" icon={Target}>
          <input className="rw-input" placeholder="Software Engineer" value={resume.targetRole||''} onChange={e => onUpdate({ targetRole: e.target.value })} />
        </Field>
        <Field label="Target Company">
          <input className="rw-input" placeholder="Google, Meta, Startup..." value={resume.targetCompany||''} onChange={e => onUpdate({ targetCompany: e.target.value })} />
        </Field>
        <FieldFull label="Job Description (paste here for ATS optimization)">
          <textarea
            className="rw-textarea"
            rows={7}
            placeholder="Paste the full job description here. AI will analyze keywords, required skills, and tailor your resume to score 90+ ATS..."
            value={resume.targetJD||''}
            onChange={e => onUpdate({ targetJD: e.target.value })}
          />
          {resume.targetJD && (
            <span className="rw-hint">✓ JD provided — AI will optimize keywords for this role</span>
          )}
        </FieldFull>
      </div>
    </div>
  );
}

/* ── Step 7: Review ────────────────────────────────────────── */
function StepReview({ resume }) {
  const items = [
    { key: 'Name',       val: resume.personal?.name },
    { key: 'Email',      val: resume.personal?.email },
    { key: 'Education',  val: `${(resume.education||[]).length} entries` },
    { key: 'Experience', val: `${(resume.experiences||[]).length} entries` },
    { key: 'Projects',   val: `${(resume.projects||[]).length} entries` },
    { key: 'Skills',     val: `${(resume.skills||[]).length} skills` },
    { key: 'Target Role', val: resume.targetRole || 'Not set' },
    { key: 'JD Provided', val: resume.targetJD ? 'Yes ✓' : 'No' },
  ];
  return (
    <div>
      <h2 className="rw-step-title">Review & Complete</h2>
      <p className="rw-step-desc">Everything looks good? Click Complete to generate your ATS score.</p>

      <div className="rw-review">
        {items.map(item => (
          <div key={item.key} className="rw-review-item">
            <span className="rw-review-key">{item.key}</span>
            <span className="rw-review-val">{item.val || '—'}</span>
          </div>
        ))}
      </div>

      <div className="rw-review-note">
        <CheckCircle2 size={18} />
        <span>After completing, you can Auto-Optimize your resume to 90+ ATS score using Gemini AI.</span>
      </div>
    </div>
  );
}
