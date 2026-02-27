import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder, useScroll, useTransform } from 'framer-motion';
import {
  ArrowLeft, Save, Rocket, Plus, GripVertical, Trash2,
  GitBranch, ExternalLink, Zap, ChevronDown, Terminal,
  BookOpen, Code2, Mic, Target, BarChart2, CheckCircle, X,
  RefreshCw, AlertCircle
} from 'lucide-react';
import Navbar from './Navbar';
import '../styles/PathBuilder.css';

/* ─── Constants ──────────────────────────────────────────────── */
const NODE_TYPES = [
  { id: 'target_acquired', icon: '🎯', label: 'Target Acquired', color: '#00F0FF',  shortDesc: 'Company, role & date' },
  { id: 'grind',           icon: '⚙️', label: 'The Grind',       color: '#f59e0b',  shortDesc: 'DSA / coding stats' },
  { id: 'core_skill',      icon: '📚', label: 'Core Skill',       color: '#a78bfa',  shortDesc: 'Course, stack, cert' },
  { id: 'build',           icon: '💻', label: 'The Build',        color: '#39FF14',  shortDesc: 'Project & architecture' },
  { id: 'execution',       icon: '🎤', label: 'Execution',        color: '#ef4444',  shortDesc: 'Interview round & Q&A' },
];

const TECH_TAGS = [
  'Python','JavaScript','TypeScript','React','Next.js','Node.js','Go','Rust','Java','C++','C#',
  'AWS','GCP','Azure','Docker','Kubernetes','Terraform','Linux','Redis','PostgreSQL','MongoDB',
  'GraphQL','gRPC','PyTorch','TensorFlow','CUDA','Swift','Kotlin','Flutter','Figma','SQL',
  'Spark','Kafka','Airflow','dbt','Prometheus','Elasticsearch','Nginx','FastAPI','Spring Boot',
];

const STORAGE_KEY = 'nexus_pathbuilder_draft';

/* ─── Helpers ────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

const defaultNodeData = t => {
  switch (t) {
    case 'target_acquired': return { company: '', role: '', date: '', outcome: 'TARGET' };
    case 'grind':           return { title: '', easy: '', medium: '', hard: '', streak: '', notes: '' };
    case 'core_skill':      return { courseName: '', stack: [], certLink: '', notes: '' };
    case 'build':           return { projectName: '', githubUrl: '', description: '' };
    case 'execution':       return { roundName: '', questions: '' };
    default:                return {};
  }
};

const makePill = tag => ({ id: uid(), text: tag });

/* ─── Simple markdown → HTML (no dependencies) ──────────────── */
const renderMd = raw => {
  if (!raw) return '';
  return raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="pb-code-block" data-lang="${lang || ''}">${code.trimEnd()}</pre>`)
    .replace(/`([^`]+)`/g, '<code class="pb-inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/#([A-Za-z0-9.+#_-]+)/g, '<span class="pb-tag-pill">$1</span>')
    .replace(/^###\s+(.+)$/gm, '<h3 class="pb-md-h3">$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2 class="pb-md-h2">$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1 class="pb-md-h1">$1</h1>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="pb-md-link">$1</a>');
};

/* ─────────────────────────────────────────────────────────────
   BLUEPRINT NODE — read-only left-panel preview
   ──────────────────────────────────────────────────────────── */
const BlueprintNode = ({ node, isActive, onClick }) => {
  const meta = NODE_TYPES.find(t => t.id === node.type);
  if (!meta) return null;

  const preview = () => {
    const d = node.data;
    switch (node.type) {
      case 'target_acquired':
        return d.company
          ? <><span className="pb-bp-accent" style={{ color: meta.color }}>{d.role || 'ROLE_TBD'}</span> @ {d.company}</>
          : <span className="pb-bp-placeholder">Define your target…</span>;
      case 'grind':
        return d.title
          ? <><span style={{ color: meta.color }}>{d.title}</span> · {Number(d.easy||0)+Number(d.medium||0)+Number(d.hard||0)} problems</>
          : <span className="pb-bp-placeholder">Add your grind stats…</span>;
      case 'core_skill':
        return d.courseName
          ? <><span style={{ color: meta.color }}>{d.courseName}</span></>
          : <span className="pb-bp-placeholder">Name a course or skill…</span>;
      case 'build':
        return d.projectName
          ? <><span style={{ color: meta.color }}>{d.projectName}</span> <a href={d.githubUrl||'#'} className="pb-bp-link" target="_blank" rel="noreferrer">[repo]</a></>
          : <span className="pb-bp-placeholder">Name your project…</span>;
      case 'execution':
        return d.roundName
          ? <><span style={{ color: meta.color }}>{d.roundName}</span></>
          : <span className="pb-bp-placeholder">Name the interview round…</span>;
      default: return null;
    }
  };

  const tags = node.tags || [];

  return (
    <motion.div
      layout
      className={`pb-bp-node ${isActive ? 'pb-bp-node--active' : ''}`}
      style={{ '--nc': meta.color }}
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pb-bp-node-icon">{meta.icon}</div>
      <div className="pb-bp-node-body">
        <div className="pb-bp-node-label" style={{ color: meta.color }}>
          {meta.label.toUpperCase()}
        </div>
        <div className="pb-bp-node-text">{preview()}</div>
        {tags.length > 0 && (
          <div className="pb-bp-tags">
            {tags.map(t => <span key={t.id} className="pb-bp-tag-pill">{t.text}</span>)}
          </div>
        )}
        {node.data.description && (
          <div className="pb-bp-md"
            dangerouslySetInnerHTML={{ __html: renderMd(node.data.description.slice(0, 240)) }}
          />
        )}
        {node.data.questions && (
          <div className="pb-bp-md"
            dangerouslySetInnerHTML={{ __html: renderMd(node.data.questions.slice(0, 240)) }}
          />
        )}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   NODE PICKER — bento grid overlay
   ──────────────────────────────────────────────────────────── */
const NodePicker = ({ onPick, onClose }) => (
  <motion.div className="pb-picker-overlay"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div className="pb-picker-panel"
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onClick={e => e.stopPropagation()}
    >
      <div className="pb-picker-head">
        <span className="pb-picker-title">// SELECT_NODE_TYPE</span>
        <button className="pb-icon-btn" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="pb-picker-grid">
        {NODE_TYPES.map(t => (
          <motion.button
            key={t.id}
            className="pb-picker-card"
            style={{ '--nc': t.color }}
            onClick={() => onPick(t.id)}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="pb-picker-icon">{t.icon}</span>
            <span className="pb-picker-label">{t.label}</span>
            <span className="pb-picker-desc">{t.shortDesc}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────
   TAG TEXT AREA — textarea with # autocomplete
   ──────────────────────────────────────────────────────────── */
const TagTextArea = ({ value, onChange, placeholder, rows = 6 }) => {
  const [tagSearch, setTagSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [caretPos, setCaretPos] = useState(0);
  const ref = useRef(null);

  const handleChange = e => {
    const v = e.target.value;
    const pos = e.target.selectionStart;
    onChange(v);
    // detect # trigger
    const slice = v.slice(0, pos);
    const hashIdx = slice.lastIndexOf('#');
    if (hashIdx !== -1 && !/\s/.test(slice.slice(hashIdx + 1))) {
      const term = slice.slice(hashIdx + 1);
      setTagSearch(term);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
    setCaretPos(pos);
  };

  const insertTag = tag => {
    const v = value;
    const pos = caretPos;
    const slice = v.slice(0, pos);
    const hashIdx = slice.lastIndexOf('#');
    const before = v.slice(0, hashIdx);
    const after  = v.slice(pos);
    const next = `${before}#${tag} ${after}`;
    onChange(next);
    setShowDropdown(false);
    setTimeout(() => {
      if (ref.current) {
        const p = (before + '#' + tag + ' ').length;
        ref.current.setSelectionRange(p, p);
        ref.current.focus();
      }
    }, 0);
  };

  const filtered = TECH_TAGS.filter(t =>
    t.toLowerCase().startsWith(tagSearch.toLowerCase()) && tagSearch.length > 0
  ).slice(0, 8);

  return (
    <div className="pb-tag-area-wrap">
      <textarea
        ref={ref}
        className="pb-textarea"
        rows={rows}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        spellCheck={false}
      />
      <AnimatePresence>
        {showDropdown && filtered.length > 0 && (
          <motion.div className="pb-tag-dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {filtered.map(t => (
              <button key={t} className="pb-tag-option" onMouseDown={() => insertTag(t)}>
                <span className="pb-tag-hash">#</span>{t}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   NODE EDITORS (per node type)
   ──────────────────────────────────────────────────────────── */
const TargetEditor = ({ data, onChange }) => (
  <div className="pb-form">
    <label className="pb-label">COMPANY_NAME</label>
    <input className="pb-input" placeholder="e.g. Google" value={data.company}
      onChange={e => onChange({ ...data, company: e.target.value })} />

    <label className="pb-label">ROLE</label>
    <input className="pb-input" placeholder="e.g. Software Engineer Intern" value={data.role}
      onChange={e => onChange({ ...data, role: e.target.value })} />

    <label className="pb-label">DATE</label>
    <input className="pb-input" type="date" value={data.date}
      onChange={e => onChange({ ...data, date: e.target.value })} />

    <label className="pb-label">OUTCOME</label>
    <div className="pb-select-row">
      {['TARGET','OFFER','HIRED','REJECTED','INTERVIEW'].map(o => (
        <button key={o}
          className={`pb-select-chip ${data.outcome === o ? 'active' : ''}`}
          onClick={() => onChange({ ...data, outcome: o })}
        >{o}</button>
      ))}
    </div>
  </div>
);

const GrindEditor = ({ data, onChange }) => {
  const [fetching, setFetching] = useState(false);
  const mockFetch = () => {
    setFetching(true);
    setTimeout(() => {
      onChange({ ...data, easy: '98', medium: '148', hard: '54', streak: '127' });
      setFetching(false);
    }, 1800);
  };
  return (
    <div className="pb-form">
      <label className="pb-label">GRIND_TITLE</label>
      <input className="pb-input" placeholder="e.g. DSA Mastery — 300 Problems" value={data.title}
        onChange={e => onChange({ ...data, title: e.target.value })} />

      <div className="pb-lc-header">
        <span className="pb-label">LEETCODE_STATS</span>
        <button className="pb-fetch-btn" onClick={mockFetch} disabled={fetching}>
          {fetching
            ? <><RefreshCw size={11} className="pb-spin" /> FETCHING…</>
            : <><Zap size={11} /> MOCK_IMPORT</>}
        </button>
      </div>
      <div className="pb-stat-grid">
        {[
          { key: 'easy',   label: 'Easy',   color: '#39FF14' },
          { key: 'medium', label: 'Medium', color: '#f59e0b' },
          { key: 'hard',   label: 'Hard',   color: '#ef4444' },
          { key: 'streak', label: 'Streak', color: '#00F0FF' },
        ].map(s => (
          <div key={s.key} className="pb-stat-cell">
            <span className="pb-stat-label" style={{ color: s.color }}>{s.label}</span>
            <input className="pb-input pb-input--sm" type="number" value={data[s.key]}
              onChange={e => onChange({ ...data, [s.key]: e.target.value })} />
          </div>
        ))}
      </div>

      <label className="pb-label">NOTES // supports #tags + markdown</label>
      <TagTextArea value={data.notes} rows={4}
        placeholder="Document key patterns, resources, interview problems asked…"
        onChange={v => onChange({ ...data, notes: v })} />
    </div>
  );
};

const CoreSkillEditor = ({ data, onChange }) => {
  const addTag = text => onChange({ ...data, stack: [...(data.stack || []), makePill(text)] });
  const removeTag = id => onChange({ ...data, stack: data.stack.filter(t => t.id !== id) });
  return (
    <div className="pb-form">
      <label className="pb-label">COURSE_NAME</label>
      <input className="pb-input" placeholder="e.g. MIT 6.006 — Algorithms" value={data.courseName}
        onChange={e => onChange({ ...data, courseName: e.target.value })} />

      <label className="pb-label">TECH_STACK // type and press Enter</label>
      <div className="pb-stack-input-row">
        <input className="pb-input" id="stack-input" placeholder="e.g. PyTorch"
          onKeyDown={e => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              addTag(e.target.value.trim());
              e.target.value = '';
            }
          }} />
      </div>
      <div className="pb-stack-pills">
        {(data.stack || []).map(t => (
          <span key={t.id} className="pb-stack-pill">
            {t.text}
            <button onClick={() => removeTag(t.id)}><X size={10} /></button>
          </span>
        ))}
      </div>

      <label className="pb-label">CERT_LINK (optional)</label>
      <input className="pb-input" placeholder="https://…" value={data.certLink}
        onChange={e => onChange({ ...data, certLink: e.target.value })} />

      <label className="pb-label">NOTES // supports #tags + markdown</label>
      <TagTextArea value={data.notes} rows={4}
        placeholder="Summarise what you learned, resources used, key takeaways…"
        onChange={v => onChange({ ...data, notes: v })} />
    </div>
  );
};

const BuildEditor = ({ data, onChange }) => (
  <div className="pb-form">
    <label className="pb-label">PROJECT_NAME</label>
    <input className="pb-input" placeholder="e.g. DistCache — Distributed LRU Cache" value={data.projectName}
      onChange={e => onChange({ ...data, projectName: e.target.value })} />

    <label className="pb-label">GITHUB_REPO</label>
    <div className="pb-input-icon-wrap">
      <GitBranch size={13} className="pb-input-icon" />
      <input className="pb-input pb-input--icon" placeholder="https://github.com/you/repo" value={data.githubUrl}
        onChange={e => onChange({ ...data, githubUrl: e.target.value })} />
    </div>

    <label className="pb-label">ARCHITECTURE // markdown + #tags + code blocks (```lang)</label>
    <TagTextArea value={data.description} rows={8}
      placeholder={`Describe your architecture in markdown.\n\nExample:\n**Stack:** #Go #gRPC #Docker\n\nBuilt a horizontally-scalable LRU cache…\n\n\`\`\`go\nfunc NewNode(key, val string) *Node {\n  return &Node{key: key, val: val}\n}\n\`\`\``}
      onChange={v => onChange({ ...data, description: v })} />
  </div>
);

const ExecutionEditor = ({ data, onChange }) => (
  <div className="pb-form">
    <label className="pb-label">ROUND_NAME</label>
    <input className="pb-input" placeholder="e.g. On-site — System Design Round" value={data.roundName}
      onChange={e => onChange({ ...data, roundName: e.target.value })} />

    <label className="pb-label">QUESTIONS & NOTES // markdown + code blocks</label>
    <TagTextArea value={data.questions} rows={10}
      placeholder={`Document questions and your approach:\n\n**Q1.** Design YouTube at scale.\n> Focus on video pipeline, CDN, and ranking stub.\n\n**Q2.** Implement autocomplete.\n\`\`\`python\nclass Trie:\n    def __init__(self): ...\n\`\`\``}
      onChange={v => onChange({ ...data, questions: v })} />
  </div>
);

const NodeEditorForm = ({ node, onChange }) => {
  const props = { data: node.data, onChange: d => onChange({ ...node, data: d }) };
  switch (node.type) {
    case 'target_acquired': return <TargetEditor {...props} />;
    case 'grind':           return <GrindEditor  {...props} />;
    case 'core_skill':      return <CoreSkillEditor {...props} />;
    case 'build':           return <BuildEditor  {...props} />;
    case 'execution':       return <ExecutionEditor {...props} />;
    default: return null;
  }
};

/* ─────────────────────────────────────────────────────────────
   TERMINAL INIT
   ──────────────────────────────────────────────────────────── */
const BOOT_LINES = [
  '> INITIALIZING NEXUS PATHWAY...',
  '> LOADING BLUEPRINT ENGINE v2.0.26...',
  '> ENCRYPTION LAYER... OK',
  '> ENTER TARGET DESTINATION:',
];

const TerminalInit = ({ onInit }) => {
  const [step, setStep]   = useState(0);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState([]);

  useEffect(() => {
    // reset in case StrictMode double-fires
    setLines([]);
    setStep(0);
    let i = 0;
    const timer = setInterval(() => {
      if (i < BOOT_LINES.length) {
        const line = BOOT_LINES[i];
        i++;
        if (typeof line === 'string') setLines(prev => [...prev, line]);
      } else {
        setStep(1);
        clearInterval(timer);
      }
    }, 420);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = e => {
    e.preventDefault();
    if (!input.trim()) return;
    // parse "Role at Company" or just use as role
    let company = '', role = input.trim();
    const atMatch = input.match(/^(.+?)\s+at\s+(.+)$/i);
    if (atMatch) { role = atMatch[1].trim(); company = atMatch[2].trim(); }
    onInit({ company, role });
  };

  return (
    <div className="pb-terminal">
      <div className="pb-term-bar">
        <span className="pb-term-dot pb-term-dot--r" />
        <span className="pb-term-dot pb-term-dot--y" />
        <span className="pb-term-dot pb-term-dot--g" />
        <span className="pb-term-title">nexus_pathbuilder — init</span>
      </div>
      <div className="pb-term-body">
        {lines.filter(l => typeof l === 'string').map((l, i) => (
          <motion.p key={i} className={`pb-term-line ${l.startsWith('> ENTER') ? 'pb-term-line--prompt' : ''}`}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}>
            {l}
          </motion.p>
        ))}
        {step === 1 && (
          <motion.form className="pb-term-input-row" onSubmit={handleSubmit}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <span className="pb-term-cursor">{'>'}</span>
            <input
              autoFocus
              className="pb-term-input"
              placeholder="Software Engineer at Google"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
          </motion.form>
        )}
      </div>
      {step === 1 && (
        <div className="pb-term-footer">
          <span className="pb-term-hint">Press Enter to initialise. Format: "Role at Company"</span>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   BLUEPRINT LEFT PANEL
   ──────────────────────────────────────────────────────────── */
const BlueprintPreview = ({ target, nodes, activeNodeId, onNodeClick, deployed }) => {
  const { scrollY } = useScroll();
  const gridY = useTransform(scrollY, [0, 800], [0, -120]);

  return (
    <div className={`pb-blueprint ${deployed ? 'pb-blueprint--full' : ''}`}>
      <motion.div className="pb-bp-grid" style={{ y: gridY }} aria-hidden />
      {deployed && <div className="pb-scanline-flash" />}

      {/* Central glowing line */}
      {(target.company || target.role) && (
        <motion.div className="pb-bp-axis"
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      {/* Hero header */}
      <AnimatePresence>
        {(target.company || target.role) && (
          <motion.div className="pb-bp-hero"
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <div className="pb-bp-hero-eyebrow">// TARGET_ACQUIRED</div>
            <h2 className="pb-bp-hero-title">
              {target.role || 'ROLE_TBD'}
              {target.company && (
                <> <span className="pb-bp-at">@</span>
                   <span className="pb-bp-co">{target.company}</span>
                </>
              )}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline nodes */}
      <div className="pb-bp-nodes">
        <AnimatePresence>
          {nodes.map(n => (
            <BlueprintNode
              key={n.id}
              node={n}
              isActive={n.id === activeNodeId}
              onClick={() => onNodeClick(n.id)}
            />
          ))}
        </AnimatePresence>
        {nodes.length === 0 && (target.company || target.role) && (
          <motion.p className="pb-bp-empty-hint"
            initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} transition={{ delay: 0.8 }}>
            Append your first node →
          </motion.p>
        )}
      </div>

      {deployed && nodes.length > 0 && (
        <motion.div className="pb-bp-end-badge"
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}>
          <CheckCircle size={20} style={{ color: '#39FF14' }} />
          <span>PATH_DEPLOYED</span>
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   EDITOR CONSOLE RIGHT PANEL
   ──────────────────────────────────────────────────────────── */
const EditorConsole = ({
  target, nodes, setNodes, activeNodeId, setActiveNodeId,
  saved, onDeploy, pickerOpen, setPickerOpen
}) => {

  const updateNode = useCallback(updated => {
    setNodes(ns => ns.map(n => n.id === updated.id ? updated : n));
  }, [setNodes]);

  const deleteNode = id => {
    setNodes(ns => ns.filter(n => n.id !== id));
    if (activeNodeId === id) setActiveNodeId(null);
  };

  const addNode = type => {
    const newNode = { id: uid(), type, data: defaultNodeData(type), tags: [] };
    setNodes(ns => [...ns, newNode]);
    setActiveNodeId(newNode.id);
    setPickerOpen(false);
  };

  const activeNode = nodes.find(n => n.id === activeNodeId);
  const activeMeta = activeNode ? NODE_TYPES.find(t => t.id === activeNode.type) : null;

  return (
    <div className="pb-console">
      {/* Console header */}
      <div className="pb-console-head">
        <div className="pb-console-target">
          {target.company || target.role
            ? <><span className="pb-console-path">~/nexus/</span><span className="pb-console-co">{target.role}{target.company ? ` @ ${target.company}` : ''}</span></>
            : <span className="pb-console-idle">IDLE</span>
          }
        </div>
        <div className="pb-console-meta">
          <span className={`pb-save-status ${saved ? 'saved' : 'unsaved'}`}>
            {saved ? <><CheckCircle size={10} /> Saved locally</> : <><AlertCircle size={10} /> Unsaved</>}
          </span>
          <button className="pb-deploy-btn" onClick={onDeploy}>
            <Rocket size={13} /> Deploy Schematic
          </button>
        </div>
      </div>

      {/* Active node editor */}
      <div className="pb-console-body">
        <AnimatePresence mode="wait">
          {activeNode && activeMeta ? (
            <motion.div key={activeNode.id} className="pb-node-editor"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="pb-ne-header" style={{ '--nc': activeMeta.color }}>
                <div className="pb-ne-type">
                  <span className="pb-ne-icon">{activeMeta.icon}</span>
                  <span className="pb-ne-label">{activeMeta.label.toUpperCase()}</span>
                </div>
                <div className="pb-ne-actions">
                  <button className="pb-icon-btn pb-icon-btn--delete" onClick={() => deleteNode(activeNode.id)}>
                    <Trash2 size={14} />
                  </button>
                  <button className="pb-icon-btn" onClick={() => setActiveNodeId(null)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="pb-ne-body">
                <NodeEditorForm node={activeNode} onChange={updateNode} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="idle" className="pb-console-idle-panel"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {nodes.length === 0
                ? <><Terminal size={28} /><p>Click <strong>+ Append Node</strong> to start building your pathway.</p></>
                : <><Code2 size={28} /><p>Select a node from the blueprint to edit it.</p></>
              }
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Node list sidebar within console */}
      {nodes.length > 0 && (
        <div className="pb-node-list">
          <div className="pb-nl-header">// TIMELINE — drag to reorder</div>
          <Reorder.Group axis="y" values={nodes} onReorder={setNodes} className="pb-nl-items">
            {nodes.map(n => {
              const m = NODE_TYPES.find(t => t.id === n.type);
              return (
                <Reorder.Item key={n.id} value={n} className="pb-nl-item">
                  <GripVertical size={13} className="pb-nl-grip" />
                  <span className="pb-nl-icon">{m?.icon}</span>
                  <span className="pb-nl-label" style={{ color: m?.color }}>
                    {n.data.company || n.data.title || n.data.courseName ||
                     n.data.projectName || n.data.roundName || m?.label}
                  </span>
                  <button className="pb-nl-edit" onClick={() => setActiveNodeId(n.id)}>
                    <Code2 size={11} />
                  </button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>
      )}

      {/* Sticky append button */}
      <div className="pb-console-footer">
        <button className="pb-append-btn" onClick={() => setPickerOpen(true)}>
          <Plus size={15} /> Append Node
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────────── */
const PathBuilder = () => {
  const navigate = useNavigate();

  const [phase, setPhase]       = useState('init');   // init | building | deployed
  const [target, setTarget]     = useState({ company: '', role: '' });
  const [nodes, setNodes]       = useState([]);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [saved, setSaved]       = useState(true);

  /* LocalStorage auto-save */
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        if (draft.target && (draft.target.company || draft.target.role)) {
          setTarget(draft.target);
          setNodes(draft.nodes || []);
          setPhase('building');
        }
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (phase !== 'building') return;
    setSaved(false);
    const t = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ target, nodes }));
      setSaved(true);
    }, 800);
    return () => clearTimeout(t);
  }, [target, nodes, phase]);

  const handleInit = ({ company, role }) => {
    setTarget({ company, role });
    setPhase('building');
    // Pre-seed a target_acquired node
    const seed = { id: uid(), type: 'target_acquired', data: { ...defaultNodeData('target_acquired'), company, role }, tags: [] };
    setNodes([seed]);
    setActiveNodeId(seed.id);
  };

  const handleDeploy = () => {
    setPhase('deployed');
    setTimeout(() => {
      navigate('/guidance');
    }, 3600);
  };

  return (
    <div className="pb-page">
      <Navbar />

      {/* ── STICKY TOP BAR ─────────────────────────────────── */}
      <div className="pb-topbar">
        <button className="pb-back-btn" onClick={() => navigate('/guidance')}>
          <ArrowLeft size={14} /> BACK_TO_DIRECTORY
        </button>
        <span className="pb-topbar-title">// PATH_BUILDER v2.0</span>
        <span className="pb-topbar-tip">Split-screen • Live blueprint • Auto-save</span>
      </div>

      {/* ── INIT TERMINAL ──────────────────────────────────── */}
      <AnimatePresence>
        {phase === 'init' && (
          <motion.div className="pb-init-overlay"
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5 }}>
            <TerminalInit onInit={handleInit} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SPLIT SCREEN ───────────────────────────────────── */}
      {phase !== 'init' && (
        <motion.div className="pb-split"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>

          {/* LEFT — blueprint */}
          <BlueprintPreview
            target={target}
            nodes={nodes}
            activeNodeId={activeNodeId}
            onNodeClick={setActiveNodeId}
            deployed={phase === 'deployed'}
          />

          {/* RIGHT — editor console */}
          {phase !== 'deployed' && (
            <EditorConsole
              target={target}
              nodes={nodes}
              setNodes={setNodes}
              activeNodeId={activeNodeId}
              setActiveNodeId={setActiveNodeId}
              saved={saved}
              onDeploy={handleDeploy}
              pickerOpen={pickerOpen}
              setPickerOpen={setPickerOpen}
            />
          )}
        </motion.div>
      )}

      {/* ── NODE PICKER OVERLAY ─────────────────────────── */}
      <AnimatePresence>
        {pickerOpen && <NodePicker onPick={type => { const _ = null; /* addNode called inside */ setPickerOpen(false); const newNode = { id: uid(), type, data: defaultNodeData(type), tags: [] }; setNodes(ns => [...ns, newNode]); setActiveNodeId(newNode.id); }} onClose={() => setPickerOpen(false)} />}
      </AnimatePresence>

      {/* ── DEPLOY OVERLAY ──────────────────────────────── */}
      <AnimatePresence>
        {phase === 'deployed' && (
          <motion.div className="pb-deploy-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="pb-deploy-card"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <CheckCircle size={40} style={{ color: '#39FF14' }} />
              <h2>SCHEMATIC_DEPLOYED</h2>
              <p>Your pathway is live on the Guidance hub.</p>
              <p className="pb-deploy-redirect">Redirecting to directory…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PathBuilder;
