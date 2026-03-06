import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, RefreshCw, Zap, Plus, Trash2, ChevronDown,
  ChevronUp, User, GraduationCap, Wrench, Briefcase, X, Check,
  AlertTriangle, CheckCircle2, Sparkles, Link, Github, Mail,
  Phone, MapPin, ExternalLink, Target, BookOpen, LayoutTemplate,
  Star, Eye, Edit3, ArrowRight,
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/ResumeBuilder.css';

// Ensure standard Nexus fonts are loaded if not already
// Note: These are usually in index.css but we ensure display consistency here

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
═══════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'nexus_resume_v1';
const AIM_KEY = 'nexus_aim_v4';

const EMPTY_RESUME = {
  personal: { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
  education: [{ id: 1, university: '', degree: '', gpa: '', year: '', relevant: '' }],
  skills: [],
  projects: [],
  targetJD: '',
};

const TEMPLATES = [
  { id: 'classic', label: 'Classic', icon: FileText, desc: 'Traditional single-column, ATS-safe' },
  { id: 'modern', label: 'Modern', icon: LayoutTemplate, desc: 'Accent sidebar, clean typography' },
  { id: 'minimal', label: 'Minimal', icon: Star, desc: 'Ultra-clean, whitespace-focused' },
];

const SECTION_ICONS = { personal: User, education: GraduationCap, skills: Wrench, projects: Briefcase };

const STAR_TEMPLATES = [
  (action, tech, impact) => `• Architected ${action} leveraging ${tech}, delivering ${impact} to end-users`,
  (action, tech, impact) => `• Engineered ${action} using ${tech}, resulting in measurable improvement of ${impact}`,
  (action, tech, impact) => `• Spearheaded ${action} with ${tech}-based architecture, achieving ${impact}`,
  (action, tech, impact) => `• Developed and deployed ${action} powered by ${tech}, driving ${impact}`,
];

function starOptimize(rawText) {
  if (!rawText.trim()) return rawText;

  // Extract tech keywords
  const techWords = rawText.match(/\b(React|Vue|Angular|Node|Python|Django|Flask|FastAPI|MongoDB|PostgreSQL|MySQL|Redis|AWS|GCP|Azure|Docker|Kubernetes|TypeScript|JavaScript|Java|Go|Rust|Swift|Kotlin|GraphQL|REST|API|Firebase|Tailwind|Next\.js|Express|Spring|Rails|Git|CI\/CD|ML|TensorFlow|PyTorch|Pandas|NumPy|SQL|Linux|Bash|PHP|Laravel|Ruby|C\+\+|C#|\.NET|Unity|WebSocket|Socket\.io|Redux|Zustand|Vite|Webpack)\b/gi) || [];
  const uniqueTech = [...new Set(techWords.map(t => t))].slice(0, 3).join(', ') || 'modern technologies';

  // Extract action verbs / what was built
  const builtMatch = rawText.match(/\b(built|made|created|developed|designed|implemented|wrote|set up|built|launched|deployed)\b.{0,60}/i);
  const action = builtMatch ? builtMatch[0].replace(/\bI\b/gi, '').trim() : 'a full-stack solution';

  // Extract impact / benefit
  const impactMatch = rawText.match(/\b(help|improv|reduc|increas|enhanc|sav|enabl|support|boost|optim).{0,80}/i);
  const impact = impactMatch
    ? impactMatch[0].trim()
    : 'enhanced user experience and operational efficiency for 100+ users';

  // Generate 3 STAR bullets
  const bullets = STAR_TEMPLATES.slice(0, 3).map((fn, i) =>
    fn(action, uniqueTech, impact)
  );

  return bullets.join('\n');
}

/* ATS Scoring Engine */
function calculateATSScore(resumeData, targetJD) {
  let score = 0;
  let details = { keywords: 0, sections: 0, keywords_found: [], keywords_missing: [] };

  // Section completeness (40 points)
  const sectionChecks = [
    resumeData.personal.name.trim().length > 0,
    resumeData.education.some(e => e.university.trim()),
    resumeData.skills.length > 0,
    resumeData.projects.length > 0,
  ];
  details.sections = Math.round((sectionChecks.filter(Boolean).length / sectionChecks.length) * 40);
  score += details.sections;

  // Keyword match vs JD (60 points)
  if (targetJD && targetJD.trim().length > 20) {
    const jdWords = targetJD.toLowerCase().match(/\b[a-z][a-z0-9.+#]{2,}\b/g) || [];
    const jdKeywords = [...new Set(jdWords)].filter(w =>
      !['the', 'and', 'you', 'for', 'with', 'that', 'have', 'this', 'from', 'they', 'will', 'your', 'are', 'has', 'can', 'our', 'all', 'been', 'its', 'more', 'not', 'but', 'was', 'their', 'were', 'which', 'about', 'into', 'than', 'what', 'who', 'how', 'when', 'use', 'used', 'using', 'must', 'also', 'any', 'each', 'only', 'both', 'new', 'may', 'such', 'one', 'two'].includes(w)
    );

    const resumeText = [
      resumeData.personal.name,
      ...resumeData.education.map(e => `${e.degree} ${e.university}`),
      resumeData.skills.join(' '),
      ...resumeData.projects.map(p => `${p.title} ${p.description} ${p.tech}`),
    ].join(' ').toLowerCase();

    const matched = jdKeywords.filter(k => resumeText.includes(k));
    const unmatched = jdKeywords.filter(k => !resumeText.includes(k)).slice(0, 8);

    const matchRate = jdKeywords.length > 0 ? matched.length / Math.min(jdKeywords.length, 30) : 0;
    details.keywords = Math.round(matchRate * 60);
    details.keywords_found = matched.slice(0, 10);
    details.keywords_missing = unmatched;
    score += details.keywords;
  } else {
    // No JD provided — give partial keyword score based on content richness
    const richness = Math.min(resumeData.skills.length * 3 + resumeData.projects.length * 5, 40);
    details.keywords = richness;
    score += richness;
  }

  return { score: Math.min(100, score), details };
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */

/* ATS Score Ring */
const ATSRing = ({ score }) => {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="ats-ring-wrap">
      <svg width={88} height={88} className="ats-ring-svg">
        <circle cx={44} cy={44} r={r} className="ats-ring-track" />
        <motion.circle
          cx={44} cy={44} r={r}
          stroke={color}
          className="ats-ring-fill"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="ats-ring-center">
        <span className="ats-ring-num" style={{ color }}>{score}</span>
        <span className="ats-ring-label">ATS</span>
      </div>
    </div>
  );
};

/* Accordion Section */
const AccordionSection = ({ id, title, icon: Icon, isOpen, onToggle, children, badge }) => (
  <div className={`accordion-section ${isOpen ? 'accordion-open' : ''}`}>
    <button className="accordion-header" onClick={() => onToggle(id)}>
      <div className="accordion-title-grp">
        <div className="accordion-icon-wrap">
          <Icon size={14} />
        </div>
        <span className="accordion-title">{title}</span>
        {badge !== undefined && <span className="accordion-badge">{badge}</span>}
      </div>
      {isOpen ? <ChevronUp size={14} className="accordion-chevron" /> : <ChevronDown size={14} className="accordion-chevron" />}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="accordion-body"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div className="accordion-inner">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

/* Tag Input */
const TagInput = ({ tags, onChange, placeholder = 'Type & press Enter...' }) => {
  const [input, setInput] = useState('');

  const addTag = (val) => {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInput('');
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="tag-input-wrap">
      <div className="tag-list">
        {tags.map(tag => (
          <span key={tag} className="tag-chip">
            {tag}
            <button className="tag-chip-rem" onClick={() => removeTag(tag)}><X size={10} /></button>
          </span>
        ))}
      </div>
      <input
        className="tag-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
          if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1]);
        }}
        placeholder={placeholder}
      />
    </div>
  );
};

/* Project Card (in left panel) */
const ProjectCard = ({ project, onChange, onRemove }) => {
  const [optimizing, setOptimizing] = useState(false);

  const handleOptimize = async () => {
    if (!project.description.trim()) return;
    setOptimizing(true);
    await new Promise(r => setTimeout(r, 1400)); // simulate AI delay
    const optimized = starOptimize(project.description);
    onChange({ ...project, description: optimized, optimized: true });
    setOptimizing(false);
  };

  return (
    <motion.div
      className="project-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <div className="project-card-header">
        <input
          className="rb-input project-title-input"
          placeholder="Project / Role Title"
          value={project.title}
          onChange={e => onChange({ ...project, title: e.target.value })}
        />
        <button className="icon-btn icon-btn--danger" onClick={onRemove}><Trash2 size={13} /></button>
      </div>
      <div className="rb-row">
        <input
          className="rb-input"
          placeholder="Company / Context"
          value={project.company}
          onChange={e => onChange({ ...project, company: e.target.value })}
        />
        <input
          className="rb-input"
          placeholder="Date (e.g. Jan 2025 – Present)"
          value={project.date}
          onChange={e => onChange({ ...project, date: e.target.value })}
        />
      </div>
      <input
        className="rb-input"
        placeholder="Tech stack (e.g. React, Node.js, MongoDB)"
        value={project.tech}
        onChange={e => onChange({ ...project, tech: e.target.value })}
      />
      <div className="project-desc-wrap">
        <textarea
          className="rb-textarea"
          rows={3}
          placeholder="Describe what you built and its impact in plain language..."
          value={project.description}
          onChange={e => onChange({ ...project, description: e.target.value, optimized: false })}
        />
        <button
          className={`optimize-btn ${optimizing ? 'optimize-btn--loading' : ''} ${project.optimized ? 'optimize-btn--done' : ''}`}
          onClick={handleOptimize}
          disabled={optimizing || !project.description.trim()}
          title="Optimize with STAR method AI"
        >
          {optimizing
            ? <><RefreshCw size={12} className="spin" /> Optimizing…</>
            : project.optimized
              ? <><Check size={12} /> Optimized</>
              : <><Sparkles size={12} /> Optimize with AI</>
          }
        </button>
      </div>
    </motion.div>
  );
};

/* ── RESUME PREVIEW TEMPLATES ─────────────────────────── */
const ResumePreviewClassic = ({ data }) => (
  <div className="rp-classic">
    <div className="rp-header">
      <h1 className="rp-name">{data.personal.name || 'Your Name'}</h1>
      <div className="rp-contact">
        {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join(' · ')}
      </div>
      <div className="rp-links">
        {data.personal.linkedin && <span>🔗 {data.personal.linkedin}</span>}
        {data.personal.github && <span>⌥ {data.personal.github}</span>}
      </div>
    </div>
    <hr className="rp-divider" />

    {data.education.some(e => e.university) && (
      <div className="rp-section">
        <h2 className="rp-section-title">EDUCATION</h2>
        <hr className="rp-section-line" />
        {data.education.filter(e => e.university).map(e => (
          <div key={e.id} className="rp-entry">
            <div className="rp-entry-row">
              <strong>{e.university}</strong>
              <span>{e.year}</span>
            </div>
            <div className="rp-entry-sub">{e.degree}{e.gpa ? ` · GPA: ${e.gpa}` : ''}</div>
            {e.relevant && <div className="rp-entry-detail">{e.relevant}</div>}
          </div>
        ))}
      </div>
    )}

    {data.skills.length > 0 && (
      <div className="rp-section">
        <h2 className="rp-section-title">SKILLS</h2>
        <hr className="rp-section-line" />
        <p className="rp-skills-text">{data.skills.join(' · ')}</p>
      </div>
    )}

    {data.projects.some(p => p.title) && (
      <div className="rp-section">
        <h2 className="rp-section-title">PROJECTS & EXPERIENCE</h2>
        <hr className="rp-section-line" />
        {data.projects.filter(p => p.title).map(p => (
          <div key={p.id} className="rp-entry">
            <div className="rp-entry-row">
              <strong>{p.title}</strong>
              <span>{p.date}</span>
            </div>
            {p.company && <div className="rp-entry-sub">{p.company}{p.tech ? ` · ${p.tech}` : ''}</div>}
            {p.description && (
              <div className="rp-entry-bullets">
                {p.description.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} className="rp-bullet">{line}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

const ResumePreviewModern = ({ data }) => (
  <div className="rp-modern">
    <div className="rp-modern-sidebar">
      <div className="rp-modern-name">{data.personal.name || 'Your Name'}</div>
      <div className="rp-modern-contact">
        {data.personal.email && <div className="rp-modern-contact-item">✉ {data.personal.email}</div>}
        {data.personal.phone && <div className="rp-modern-contact-item">📱 {data.personal.phone}</div>}
        {data.personal.location && <div className="rp-modern-contact-item">📍 {data.personal.location}</div>}
        {data.personal.linkedin && <div className="rp-modern-contact-item">🔗 {data.personal.linkedin}</div>}
        {data.personal.github && <div className="rp-modern-contact-item">⌥ {data.personal.github}</div>}
      </div>
      {data.skills.length > 0 && (
        <div className="rp-modern-skills-block">
          <div className="rp-modern-section-label">SKILLS</div>
          <div className="rp-modern-skill-tags">
            {data.skills.map(s => <span key={s} className="rp-modern-skill-tag">{s}</span>)}
          </div>
        </div>
      )}
    </div>
    <div className="rp-modern-main">
      {data.education.some(e => e.university) && (
        <div className="rp-modern-section">
          <div className="rp-modern-section-label">EDUCATION</div>
          {data.education.filter(e => e.university).map(e => (
            <div key={e.id} className="rp-entry">
              <div className="rp-entry-row"><strong>{e.university}</strong><span>{e.year}</span></div>
              <div className="rp-entry-sub">{e.degree}{e.gpa ? ` · GPA: ${e.gpa}` : ''}</div>
            </div>
          ))}
        </div>
      )}
      {data.projects.some(p => p.title) && (
        <div className="rp-modern-section">
          <div className="rp-modern-section-label">EXPERIENCE & PROJECTS</div>
          {data.projects.filter(p => p.title).map(p => (
            <div key={p.id} className="rp-entry">
              <div className="rp-entry-row"><strong>{p.title}</strong><span>{p.date}</span></div>
              {p.company && <div className="rp-entry-sub">{p.company}{p.tech ? ` · ${p.tech}` : ''}</div>}
              {p.description && (
                <div className="rp-entry-bullets">
                  {p.description.split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} className="rp-bullet">{line}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const ResumePreviewMinimal = ({ data }) => (
  <div className="rp-minimal">
    <div className="rp-min-header">
      <div className="rp-min-name">{data.personal.name || 'Your Name'}</div>
      <div className="rp-min-contact">
        {[data.personal.email, data.personal.phone, data.personal.location, data.personal.linkedin].filter(Boolean).join('  |  ')}
      </div>
    </div>
    {data.education.some(e => e.university) && (
      <div className="rp-min-section">
        <span className="rp-min-heading">Education</span>
        {data.education.filter(e => e.university).map(e => (
          <div key={e.id} className="rp-min-item">
            <div className="rp-entry-row"><span>{e.university}</span><span>{e.year}</span></div>
            <div className="rp-min-sub">{e.degree}{e.gpa ? ` — GPA ${e.gpa}` : ''}</div>
          </div>
        ))}
      </div>
    )}
    {data.skills.length > 0 && (
      <div className="rp-min-section">
        <span className="rp-min-heading">Technical Skills</span>
        <div className="rp-min-skills">{data.skills.join(', ')}</div>
      </div>
    )}
    {data.projects.some(p => p.title) && (
      <div className="rp-min-section">
        <span className="rp-min-heading">Projects & Experience</span>
        {data.projects.filter(p => p.title).map(p => (
          <div key={p.id} className="rp-min-item">
            <div className="rp-entry-row"><em>{p.title}</em><span>{p.date}</span></div>
            {p.company && <div className="rp-min-sub" style={{ marginBottom: 2 }}>{p.company}{p.tech ? ` · ${p.tech}` : ''}</div>}
            {p.description && p.description.split('\n').filter(Boolean).map((line, i) => (
              <div key={i} className="rp-min-bullet">{line}</div>
            ))}
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ResumeBuilder() {
  /* ── State ─────────────────────────────────────────── */
  const [resumeData, setResumeData] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : EMPTY_RESUME; }
    catch { return EMPTY_RESUME; }
  });
  const [template, setTemplate] = useState('classic');
  const [openSection, setOpenSection] = useState('personal');
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'synced' | 'error'
  const [toast, setToast] = useState(null);
  const [showGapPanel, setShowGapPanel] = useState(false);
  const printRef = useRef(null);

  /* ── Persist ────────────────────────────────────────── */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
  }, [resumeData]);

  /* ── ATS Score ──────────────────────────────────────── */
  const atsResult = useMemo(() => calculateATSScore(resumeData, resumeData.targetJD), [resumeData]);

  /* ── Helpers ────────────────────────────────────────── */
  const updatePersonal = useCallback((field, val) => {
    setResumeData(prev => ({ ...prev, personal: { ...prev.personal, [field]: val } }));
  }, []);

  const updateEducation = useCallback((id, field, val) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(e => e.id === id ? { ...e, [field]: val } : e),
    }));
  }, []);

  const addProject = useCallback(() => {
    setResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, {
        id: Date.now(), title: '', company: '', date: '', tech: '', description: '', optimized: false
      }],
    }));
  }, []);

  const updateProject = useCallback((id, updated) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, ...updated } : p),
    }));
  }, []);

  const removeProject = useCallback((id) => {
    setResumeData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  }, []);

  const addEducation = useCallback(() => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, { id: Date.now(), university: '', degree: '', gpa: '', year: '', relevant: '' }],
    }));
  }, []);

  /* ── Sync with Aim Page ─────────────────────────────── */
  const syncWithAim = useCallback(async () => {
    setSyncStatus('syncing');
    await new Promise(r => setTimeout(r, 1200));
    try {
      const raw = localStorage.getItem(AIM_KEY);
      if (!raw) throw new Error('No Aim Page data found. Please generate a roadmap in the Aim Page first.');
      const aim = JSON.parse(raw);

      const roadmapData = aim.roadmapData || {};
      const acquired = roadmapData.acquired_skills || aim.acquired_skills || [];
      const target = aim.target || {};
      const role = target.role || '';
      const company = target.company || '';

      // Smart JD construction
      const jdKeywords = acquired.join(', ');
      const jdText = company
        ? `Position: ${role} at ${company}\nCore Requirements: ${jdKeywords}\nSeeking a candidate with strong proficiency in ${acquired.slice(0, 5).join(', ')}.`
        : (role ? `Target Role: ${role}\nRequired Skills: ${jdKeywords}` : prev => prev.targetJD);

      setResumeData(prev => {
        const existingSkills = new Set(prev.skills);
        acquired.forEach(s => existingSkills.add(s));

        return {
          ...prev,
          skills: Array.from(existingSkills),
          targetJD: typeof jdText === 'function' ? jdText(prev) : (jdText || prev.targetJD)
        };
      });

      // Also offer to import roadmap steps as projects
      const roadmapSteps = roadmapData.roadmap || [];
      if (roadmapSteps.length > 0 && window.confirm(`Found ${roadmapSteps.length} roadmap steps. Would you like to import completed steps as experience?`)) {
        const completedNodeIds = new Set(aim.completedNodes || []);
        const projectsToImport = roadmapSteps
          .filter(step => completedNodeIds.has(step.id))
          .map(step => ({
            id: Date.now() + Math.random(),
            title: step.title,
            company: company || 'Nexus Learning Path',
            date: 'Completed',
            tech: acquired.slice(0, 3).join(', '),
            description: step.desc,
            optimized: false
          }));

        if (projectsToImport.length > 0) {
          setResumeData(prev => ({
            ...prev,
            projects: [...prev.projects, ...projectsToImport]
          }));
          setToast({ msg: `✅ Synced! Imported ${acquired.length} skills and ${projectsToImport.length} completed steps.`, type: 'success' });
        } else {
          setToast({ msg: `✅ Synced skills! (No completed roadmap steps to import)`, type: 'success' });
        }
      } else {
        setToast({ msg: `✅ Synced ${acquired.length} skills from Aim Page`, type: 'success' });
      }

      setSyncStatus('synced');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err) {
      setSyncStatus('error');
      setToast({ msg: `⚠ ${err.message}`, type: 'error' });
      setTimeout(() => setSyncStatus(null), 3000);
    }
  }, []);

  /* ── Nexus Project Import ────────────────────────────── */
  const importNexusProject = useCallback(() => {
    try {
      const raw = localStorage.getItem(AIM_KEY);
      if (!raw) { setToast({ msg: '⚠ No Aim Page data. Generate a roadmap first.', type: 'error' }); return; }
      const aim = JSON.parse(raw);
      const roadmap = aim.roadmapData?.roadmap || [];
      const skills = aim.roadmapData?.acquired_skills || [];
      const target = aim.target || {};

      const newProject = {
        id: Date.now(),
        title: target.role ? `${target.role} Preparation Project` : 'Nexus Learning Project',
        company: target.company || 'Self-Directed',
        date: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        tech: skills.slice(0, 6).join(', '),
        description: roadmap.length
          ? `Completed structured learning roadmap targeting ${target.role || 'SWE'} role.\n`
          + roadmap.slice(0, 3).map(r => `• ${r.title}: ${r.desc}`).join('\n')
          : 'Completed structured technical preparation roadmap via Nexus platform.',
        optimized: false,
      };

      setResumeData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
      setToast({ msg: '✅ Nexus project imported!', type: 'success' });
    } catch {
      setToast({ msg: '⚠ Could not import project data.', type: 'error' });
    }
  }, []);

  /* ── PDF Download ───────────────────────────────────── */
  const downloadPDF = useCallback(() => {
    document.body.classList.add('print-mode');
    window.print();
    setTimeout(() => document.body.classList.remove('print-mode'), 500);
  }, []);

  /* ── Toast cleanup ──────────────────────────────────── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Toggle accordion ───────────────────────────────── */
  const toggleSection = useCallback((id) => {
    setOpenSection(prev => prev === id ? null : id);
  }, []);

  /* ── Preview Component ──────────────────────────────── */
  const PreviewComponent = template === 'modern' ? ResumePreviewModern
    : template === 'minimal' ? ResumePreviewMinimal
      : ResumePreviewClassic;

  /* ═════════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════════ */
  return (
    <div className="rb-page">
      <div style={{ position: 'relative', zIndex: 1000 }}>
        <Navbar />
      </div>

      {/* ── TOP NAV BAR ────────────────────────────────── */}
      <div className="rb-topbar">
        <div className="rb-topbar-left">
          <div className="rb-topbar-brand">
            <FileText size={18} className="rb-brand-icon" />
            <span className="rb-brand-text">Resume Builder</span>
            <span className="rb-brand-tag">ATS Optimizer</span>
          </div>
        </div>

        <div className="rb-topbar-center">
          <ATSRing score={atsResult.score} />
          <div className="rb-ats-meta">
            <span className="rb-ats-label">ATS Match Score</span>
            <button
              className="rb-ats-gap-btn"
              onClick={() => setShowGapPanel(p => !p)}
            >
              {showGapPanel ? 'Hide' : 'Show'} Gap Analysis
            </button>
          </div>
        </div>

        <div className="rb-topbar-right">
          <button
            className={`rb-btn rb-btn--secondary ${syncStatus === 'syncing' ? 'rb-btn--loading' : ''} ${syncStatus === 'synced' ? 'rb-btn--success' : ''}`}
            onClick={syncWithAim}
            disabled={syncStatus === 'syncing'}
          >
            {syncStatus === 'syncing'
              ? <><RefreshCw size={14} className="spin" /> Syncing…</>
              : syncStatus === 'synced'
                ? <><CheckCircle2 size={14} /> Synced!</>
                : <><Zap size={14} /> Sync with Aim Page</>
            }
          </button>
          <button className="rb-btn rb-btn--primary" onClick={downloadPDF}>
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* ── GAP ANALYSIS STRIP ─────────────────────────── */}
      <AnimatePresence>
        {showGapPanel && (
          <motion.div
            className="gap-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="gap-panel-inner">
              <div className="gap-col gap-col--found">
                <div className="gap-col-label"><CheckCircle2 size={12} /> Keywords Found ({atsResult.details.keywords_found.length})</div>
                <div className="gap-chips">
                  {atsResult.details.keywords_found.length
                    ? atsResult.details.keywords_found.map(k => <span key={k} className="gap-chip gap-chip--ok">{k}</span>)
                    : <span className="gap-empty">Enter a Target JD to see matches</span>}
                </div>
              </div>
              <div className="gap-col gap-col--missing">
                <div className="gap-col-label"><AlertTriangle size={12} /> Missing Keywords ({atsResult.details.keywords_missing.length})</div>
                <div className="gap-chips">
                  {atsResult.details.keywords_missing.length
                    ? atsResult.details.keywords_missing.map(k => (
                      <span key={k} className="gap-chip gap-chip--miss">
                        {k}
                        <button className="gap-add-btn" onClick={() => setResumeData(prev => ({ ...prev, skills: [...prev.skills, k] }))} title="Add to Skills">+</button>
                      </span>
                    ))
                    : <span className="gap-empty">{resumeData.targetJD ? 'Great! No obvious gaps' : 'Enter a Target JD below'}</span>}
                </div>
              </div>
              <div className="gap-col gap-col--jd">
                <div className="gap-col-label"><Target size={12} /> Target Job Description</div>
                <textarea
                  className="gap-jd-input"
                  rows={3}
                  placeholder="Paste a job description here to analyze your resume against it..."
                  value={resumeData.targetJD}
                  onChange={e => setResumeData(prev => ({ ...prev, targetJD: e.target.value }))}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN SPLIT LAYOUT ──────────────────────────── */}
      <div className="rb-layout">

        {/* LEFT PANEL */}
        <div className="rb-left-panel">

          {/* Personal Info */}
          <AccordionSection id="personal" title="Personal Info" icon={SECTION_ICONS.personal} isOpen={openSection === 'personal'} onToggle={toggleSection}>
            <div className="rb-field-grid">
              <div className="rb-field rb-field--full">
                <label className="rb-label"><User size={11} /> Full Name</label>
                <input className="rb-input" placeholder="Aarav Sharma" value={resumeData.personal.name} onChange={e => updatePersonal('name', e.target.value)} />
              </div>
              <div className="rb-field">
                <label className="rb-label"><Mail size={11} /> Email</label>
                <input className="rb-input" type="email" placeholder="aarav@email.com" value={resumeData.personal.email} onChange={e => updatePersonal('email', e.target.value)} />
              </div>
              <div className="rb-field">
                <label className="rb-label"><Phone size={11} /> Phone</label>
                <input className="rb-input" placeholder="+91 98765 43210" value={resumeData.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} />
              </div>
              <div className="rb-field">
                <label className="rb-label"><MapPin size={11} /> Location</label>
                <input className="rb-input" placeholder="Bengaluru, India" value={resumeData.personal.location} onChange={e => updatePersonal('location', e.target.value)} />
              </div>
              <div className="rb-field">
                <label className="rb-label"><Link size={11} /> LinkedIn</label>
                <input className="rb-input" placeholder="linkedin.com/in/aarav" value={resumeData.personal.linkedin} onChange={e => updatePersonal('linkedin', e.target.value)} />
              </div>
              <div className="rb-field">
                <label className="rb-label"><Github size={11} /> GitHub</label>
                <input className="rb-input" placeholder="github.com/aarav" value={resumeData.personal.github} onChange={e => updatePersonal('github', e.target.value)} />
              </div>
            </div>
          </AccordionSection>

          {/* Education */}
          <AccordionSection id="education" title="Education" icon={SECTION_ICONS.education} isOpen={openSection === 'education'} onToggle={toggleSection} badge={resumeData.education.filter(e => e.university).length}>
            {resumeData.education.map(edu => (
              <div key={edu.id} className="edu-card">
                <div className="rb-field-grid">
                  <div className="rb-field rb-field--full">
                    <label className="rb-label">University / College</label>
                    <input className="rb-input" placeholder="IIT Bombay" value={edu.university} onChange={e => updateEducation(edu.id, 'university', e.target.value)} />
                  </div>
                  <div className="rb-field">
                    <label className="rb-label">Degree</label>
                    <input className="rb-input" placeholder="B.Tech Computer Science" value={edu.degree} onChange={e => updateEducation(edu.id, 'degree', e.target.value)} />
                  </div>
                  <div className="rb-field">
                    <label className="rb-label">Grad Year</label>
                    <input className="rb-input" placeholder="2026" value={edu.year} onChange={e => updateEducation(edu.id, 'year', e.target.value)} />
                  </div>
                  <div className="rb-field">
                    <label className="rb-label">GPA / Percentage</label>
                    <input className="rb-input" placeholder="8.7 / 10" value={edu.gpa} onChange={e => updateEducation(edu.id, 'gpa', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button className="rb-add-btn" onClick={addEducation}><Plus size={13} /> Add Education</button>
          </AccordionSection>

          {/* Skills */}
          <AccordionSection id="skills" title="Skills" icon={SECTION_ICONS.skills} isOpen={openSection === 'skills'} onToggle={toggleSection} badge={resumeData.skills.length}>
            <div className="rb-field">
              <label className="rb-label">Technical Skills <span className="rb-label-hint">(Press Enter or comma to add)</span></label>
              <TagInput
                tags={resumeData.skills}
                onChange={tags => setResumeData(prev => ({ ...prev, skills: tags }))}
                placeholder="React, Node.js, Python…"
              />
            </div>
            <div className="skills-quick-add">
              <span className="skills-quick-label">Quick add:</span>
              {['JavaScript', 'Python', 'React', 'Node.js', 'Git', 'SQL', 'TypeScript', 'Docker'].map(s => (
                <button
                  key={s}
                  className="skills-quick-chip"
                  onClick={() => !resumeData.skills.includes(s) && setResumeData(prev => ({ ...prev, skills: [...prev.skills, s] }))}
                  disabled={resumeData.skills.includes(s)}
                >{s}</button>
              ))}
            </div>
          </AccordionSection>

          {/* Projects / Experience */}
          <AccordionSection id="projects" title="Projects & Experience" icon={SECTION_ICONS.projects} isOpen={openSection === 'projects'} onToggle={toggleSection} badge={resumeData.projects.length}>
            <div className="projects-toolbar">
              <button className="rb-btn rb-btn--ghost" onClick={importNexusProject}>
                <Zap size={13} /> Import from Nexus Aim
              </button>
            </div>
            <AnimatePresence>
              {resumeData.projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onChange={updated => updateProject(p.id, updated)}
                  onRemove={() => removeProject(p.id)}
                />
              ))}
            </AnimatePresence>
            <button className="rb-add-btn" onClick={addProject}><Plus size={13} /> Add Project / Experience</button>
          </AccordionSection>

        </div>

        {/* RIGHT PANEL — LIVE PREVIEW */}
        <div className="rb-right-panel" ref={printRef}>
          <div className="rp-toolbar">
            <div className="rp-template-selector">
              {TEMPLATES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    className={`rp-template-btn ${template === t.id ? 'rp-template-btn--active' : ''}`}
                    onClick={() => setTemplate(t.id)}
                    title={t.desc}
                  >
                    <Icon size={13} /> {t.label}
                  </button>
                );
              })}
            </div>
            <div className="rp-preview-badge">
              <Eye size={12} /> Live Preview
            </div>
          </div>

          {/* A4 Paper */}
          <div className="rp-paper-wrap">
            <div className={`rp-paper print-target`} id="resume-paper">
              <PreviewComponent data={resumeData} />
            </div>
          </div>
        </div>
      </div>

      {/* ── TOAST ──────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`rb-toast rb-toast--${toast.type}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22 }}
          >
            {toast.msg}
            <button className="rb-toast-close" onClick={() => setToast(null)}><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div >
  );
}
