import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import {
  CheckCircle2, Circle, RefreshCw, Upload, Github, AlertTriangle,
  ExternalLink, Target, RotateCcw, X, TrendingUp, Clock,
  ChevronRight, ArrowUpRight, Zap, BookOpen, Wrench, Activity,
  Lock, BarChart2, ListChecks, Check,
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/AimPageNew.css';

/* ─────────────────────────────────────────────────────────────
   PDF.js
   ──────────────────────────────────────────────────────────── */
let pdfjs = null;
const loadPdfJs = async () => {
  if (pdfjs) return pdfjs;
  const mod = await import('pdfjs-dist');
  mod.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.version}/pdf.worker.min.mjs`;
  pdfjs = mod;
  return pdfjs;
};
const extractTextFromPdf = async file => {
  const lib = await loadPdfJs();
  const ab  = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: ab }).promise;
  let text  = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 4); i++) {
    const pg = await pdf.getPage(i);
    const ct = await pg.getTextContent();
    text += ct.items.map(s => s.str).join(' ') + '\n';
  }
  return text.trim();
};

/* ─────────────────────────────────────────────────────────────
   GitHub API
   ──────────────────────────────────────────────────────────── */
const fetchGitHubData = async username => {
  const [uRes, rRes] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`),
  ]);
  if (!uRes.ok) throw new Error(`GitHub user "${username}" not found.`);
  const user  = await uRes.json();
  const repos = await rRes.json();
  const lc    = {};
  (Array.isArray(repos) ? repos : []).forEach(r => {
    if (r.language) lc[r.language] = (lc[r.language] || 0) + 1;
  });
  const topLangs    = Object.entries(lc).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l]) => l);
  const recentRepos = (Array.isArray(repos) ? repos : [])
    .slice(0, 4).map(r => ({ name: r.name, stars: r.stargazers_count, lang: r.language }));
  return { username: user.login, publicRepos: user.public_repos, topLangs, recentRepos };
};

/* ─────────────────────────────────────────────────────────────
   Role Database + Mock AI
   ──────────────────────────────────────────────────────────── */
const delay = ms => new Promise(r => setTimeout(r, ms));

const ROLE_DB = {
  backend: {
    acquired: ['Node.js', 'REST APIs', 'PostgreSQL', 'Git'],
    missing:  ['Docker', 'Kubernetes', 'Redis', 'gRPC', 'System Design'],
    base: 64, weeksPerGap: 2.5,
    radar: [
      { axis: 'Containers',     current: 18, required: 90 },
      { axis: 'Caching',        current: 22, required: 80 },
      { axis: 'API Design',     current: 75, required: 85 },
      { axis: 'System Design',  current: 20, required: 95 },
      { axis: 'Orchestration',  current: 10, required: 75 },
    ],
    tasks: [
      { text: 'Solve 1 Dynamic Programming problem on LeetCode', type: 'practice' },
      { text: 'Read DDIA Chapter 5: Replication', type: 'reading' },
      { text: 'Write a Dockerfile for any personal project', type: 'build' },
    ],
    roadmap: [
      { id: 'r1', type: 'learn',    title: 'Docker & Containers',       desc: 'Learn Dockerfile, Compose, image building and layering.', impact: 7,  link: 'https://docs.docker.com/get-started/' },
      { id: 'r2', type: 'build',    title: 'Containerize a Service',    desc: 'Package an existing project. Add Postgres via Compose.', impact: 10, link: null },
      { id: 'r3', type: 'learn',    title: 'Redis Caching Patterns',    desc: 'Cache-aside, write-through, TTL strategies. Use ioredis.', impact: 6,  link: 'https://redis.io/docs/' },
      { id: 'r4', type: 'practice', title: 'System Design — 50 Qs',    desc: 'URL shortener, rate limiter, distributed cache design.', impact: 8,  link: 'https://github.com/donnemartin/system-design-primer' },
      { id: 'r5', type: 'learn',    title: 'Kubernetes Core',           desc: 'Pods, Deployments, Services. Deploy to local k3s.',      impact: 9,  link: 'https://kubernetes.io/docs/' },
    ],
  },
  frontend: {
    acquired: ['React', 'HTML/CSS', 'JavaScript', 'Git'],
    missing:  ['TypeScript', 'Accessibility', 'Vitest', 'Performance', 'Zustand'],
    base: 68, weeksPerGap: 2,
    radar: [
      { axis: 'TypeScript',    current: 20, required: 90 },
      { axis: 'Testing',       current: 15, required: 85 },
      { axis: 'Accessibility', current: 25, required: 75 },
      { axis: 'Performance',   current: 35, required: 80 },
      { axis: 'State Mgmt',    current: 55, required: 85 },
    ],
    tasks: [
      { text: 'Convert 1 component to TypeScript', type: 'build' },
      { text: 'Fix 1 accessibility issue in your project', type: 'practice' },
      { text: 'Write 3 unit tests with React Testing Library', type: 'build' },
    ],
    roadmap: [
      { id: 'r1', type: 'learn',    title: 'TypeScript Fundamentals',    desc: 'Types, interfaces, generics. Migrate one JS file to TS.', impact: 8, link: 'https://www.typescriptlang.org/docs/handbook/' },
      { id: 'r2', type: 'build',    title: 'Build a Testing Suite',      desc: 'Add Vitest + React Testing Library. 80% component coverage.', impact: 9, link: null },
      { id: 'r3', type: 'learn',    title: 'Web Accessibility WCAG 2.1', desc: 'ARIA roles, semantic HTML, focus management.', impact: 6, link: 'https://web.dev/accessibility/' },
      { id: 'r4', type: 'practice', title: 'Core Web Vitals',            desc: 'LCP, FID, CLS. Lighthouse audit and optimize.', impact: 7, link: 'https://web.dev/vitals/' },
      { id: 'r5', type: 'learn',    title: 'Advanced State — Zustand',   desc: 'When to use context vs external store.', impact: 6, link: 'https://zustand-demo.pmnd.rs/' },
    ],
  },
  ml: {
    acquired: ['Python', 'NumPy', 'Pandas', 'Statistics'],
    missing:  ['PyTorch', 'MLOps', 'CUDA', 'Model Deployment', 'Feature Engineering'],
    base: 61, weeksPerGap: 3,
    radar: [
      { axis: 'Deep Learning',   current: 20, required: 90 },
      { axis: 'Feature Eng.',    current: 35, required: 80 },
      { axis: 'MLOps',           current: 10, required: 85 },
      { axis: 'Deployment',      current: 15, required: 75 },
      { axis: 'Experimentation', current: 40, required: 80 },
    ],
    tasks: [
      { text: 'Implement a linear regression from scratch in NumPy', type: 'build' },
      { text: 'Complete 1 Kaggle notebook end-to-end', type: 'practice' },
      { text: 'Watch 1 Andrej Karpathy neural network lecture', type: 'reading' },
    ],
    roadmap: [
      { id: 'r1', type: 'learn',    title: 'PyTorch Deep Learning',      desc: 'Tensors, autograd, training loops. Implement ResNet.', impact: 9, link: 'https://pytorch.org/tutorials/' },
      { id: 'r2', type: 'build',    title: 'Fine-tune a Transformer',    desc: 'Fine-tune distilBERT on a classification task. MLflow tracking.', impact: 11, link: null },
      { id: 'r3', type: 'learn',    title: 'Feature Engineering',        desc: 'Target encoding, feature importance, leakage prevention.', impact: 7, link: 'https://www.kaggle.com/learn/feature-engineering' },
      { id: 'r4', type: 'learn',    title: 'Model Deployment — FastAPI', desc: 'Serve a PyTorch model. Containerize on Cloud Run.', impact: 8, link: 'https://fastapi.tiangolo.com/' },
      { id: 'r5', type: 'practice', title: 'MLOps Pipeline',             desc: 'MLflow + Airflow. Training, versioning, serving.', impact: 9, link: 'https://mlflow.org/docs/latest/' },
    ],
  },
  devops: {
    acquired: ['Linux', 'Bash', 'Git', 'Networking Basics'],
    missing:  ['Terraform', 'Kubernetes', 'Prometheus', 'CI/CD', 'Security'],
    base: 59, weeksPerGap: 3,
    radar: [
      { axis: 'IaC',         current: 15, required: 90 },
      { axis: 'CI/CD',       current: 20, required: 90 },
      { axis: 'Kubernetes',  current: 10, required: 85 },
      { axis: 'Monitoring',  current: 18, required: 80 },
      { axis: 'Security',    current: 25, required: 75 },
    ],
    tasks: [
      { text: 'Write a GitHub Actions workflow for any project', type: 'build' },
      { text: 'Provision 1 resource with Terraform locally', type: 'build' },
      { text: 'Set up Prometheus + Grafana scraping locally', type: 'practice' },
    ],
    roadmap: [
      { id: 'r1', type: 'learn',    title: 'Terraform IaC',           desc: 'Provision AWS VPC, EC2, RDS. Modules & remote state.', impact: 10, link: 'https://developer.hashicorp.com/terraform/tutorials' },
      { id: 'r2', type: 'build',    title: 'CI/CD — GitHub Actions',  desc: 'Build, test, lint, deploy pipeline. Docker → ECR.', impact: 9, link: null },
      { id: 'r3', type: 'learn',    title: 'Kubernetes Operations',    desc: 'Helm, RBAC, HPA. Operate a production-grade cluster.', impact: 11, link: 'https://kubernetes.io/docs/' },
      { id: 'r4', type: 'learn',    title: 'Prometheus + Grafana',     desc: 'Instrument a Node app. Build dashboards and alerts.', impact: 8, link: 'https://prometheus.io/docs/' },
      { id: 'r5', type: 'practice', title: 'Security: CKS Prep',       desc: 'Container hardening, network policies, OPA Gatekeeper.', impact: 7, link: 'https://training.linuxfoundation.org/certification/cks/' },
    ],
  },
  default: {
    acquired: ['Python', 'Data Structures', 'Git', 'SQL'],
    missing:  ['System Design', 'Advanced DSA', 'Cloud', 'Testing', 'Communication'],
    base: 55, weeksPerGap: 2.5,
    radar: [
      { axis: 'Algorithms',     current: 45, required: 85 },
      { axis: 'System Design',  current: 20, required: 90 },
      { axis: 'Backend',        current: 35, required: 80 },
      { axis: 'Cloud',          current: 15, required: 75 },
      { axis: 'Soft Skills',    current: 50, required: 80 },
    ],
    tasks: [
      { text: 'Solve 2 LeetCode Medium problems', type: 'practice' },
      { text: 'Read 1 System Design chapter (DDIA or Primer)', type: 'reading' },
      { text: 'Push 1 commit to a personal project', type: 'build' },
    ],
    roadmap: [
      { id: 'r1', type: 'practice', title: 'NeetCode 150',              desc: 'Solve curated 150 problems covering all major patterns.', impact: 12, link: 'https://neetcode.io/practice' },
      { id: 'r2', type: 'learn',    title: 'System Design Fundamentals', desc: 'DDIA Ch 1–6. Design URL shortener, Twitter.', impact: 10, link: null },
      { id: 'r3', type: 'build',    title: 'Full-Stack Project',        desc: 'Auth, database, REST API, deployed frontend.', impact: 9, link: null },
      { id: 'r4', type: 'learn',    title: 'Cloud Foundations (AWS)',   desc: 'Compute, storage, databases, networking. CCP cert.', impact: 8, link: 'https://aws.amazon.com/certification/certified-cloud-practitioner/' },
      { id: 'r5', type: 'practice', title: 'Mock Interviews × 3/week', desc: 'Pramp or peer mocks. Record and analyze your performance.', impact: 6, link: 'https://www.pramp.com/' },
    ],
  },
};

const pickProfile = (role, company) => {
  const r = (role + ' ' + company).toLowerCase();
  if (/backend|server|api|node|go|java|spring/.test(r))           return ROLE_DB.backend;
  if (/frontend|ui|react|vue|angular|web/.test(r))                return ROLE_DB.frontend;
  if (/ml|machine learning|data sci|ai|nlp|pytorch/.test(r))      return ROLE_DB.ml;
  if (/devops|sre|platform|infra|cloud|k8s|kubernetes/.test(r))   return ROLE_DB.devops;
  return ROLE_DB.default;
};

const mockGenerateRoadmap = async ({ role, company, resumeText, githubData }) => {
  await delay(2800);
  const profile  = pickProfile(role, company);
  const fromGH   = githubData?.topLangs?.filter(l => !profile.acquired.includes(l)) ?? [];
  const acquired = [...new Set([...profile.acquired, ...fromGH])].slice(0, 8);
  return {
    match_score:      profile.base + (resumeText.length > 200 ? 4 : 0),
    acquired_skills:  acquired,
    missing_skills:   profile.missing,
    radar:            profile.radar,
    tasks:            profile.tasks,
    weeksToTarget:    Math.round(profile.missing.length * profile.weeksPerGap),
    roadmap:          profile.roadmap,
  };
};

/* ─────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────── */
const STORAGE_KEY  = 'nexus_aim_v4';
const TASKS_KEY    = 'nexus_aim_tasks';

const TYPE_META = {
  learn:    { label: 'Learning',  icon: BookOpen },
  build:    { label: 'Project',   icon: Wrench },
  practice: { label: 'Practice',  icon: Activity },
};

/* ─────────────────────────────────────────────────────────────
   MATCH SCORE RING  (thin SVG radial)
   ──────────────────────────────────────────────────────────── */
const MatchScoreRing = ({ score, size = 140 }) => {
  const r    = (size / 2) - 12;
  const circ = 2 * Math.PI * r;
  const off  = circ - (score / 100) * circ;

  return (
    <div className="msr-wrap">
      <svg width={size} height={size} className="msr-svg">
        <circle cx={size/2} cy={size/2} r={r} className="msr-track" />
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          className="msr-fill"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="msr-center">
        <motion.span className="msr-num"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}>
          {score}<span className="msr-pct">%</span>
        </motion.span>
        <span className="msr-label">Match</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SKILL RADAR (Recharts)
   ──────────────────────────────────────────────────────────── */
const SkillRadarChart = ({ data }) => {
  const chartData = data.map(d => ({
    axis:     d.axis,
    Current:  d.current,
    Required: d.required,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
        <PolarGrid stroke="#262626" strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: '#737373', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
        />
        <Radar
          name="Required"
          dataKey="Required"
          stroke="#262626"
          fill="#1a1a1a"
          fillOpacity={0.6}
          dot={false}
        />
        <Radar
          name="Current"
          dataKey="Current"
          stroke="#0070F3"
          fill="#0070F3"
          fillOpacity={0.18}
          dot={{ fill: '#0070F3', r: 3, strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

/* ─────────────────────────────────────────────────────────────
   VERTICAL STEPPER  (roadmap)
   ──────────────────────────────────────────────────────────── */
const VerticalStepper = ({ roadmap, completedNodes, onToggle }) => {
  const activeIdx = useMemo(() => {
    for (let i = 0; i < roadmap.length; i++) {
      if (!completedNodes.has(roadmap[i].id)) return i;
    }
    return roadmap.length; // all done
  }, [roadmap, completedNodes]);

  return (
    <div className="stepper">
      {roadmap.map((node, i) => {
        const done   = completedNodes.has(node.id);
        const active = i === activeIdx;
        const locked = i > activeIdx;
        const meta   = TYPE_META[node.type] || TYPE_META.learn;
        const Icon   = meta.icon;

        return (
          <div key={node.id} className={`step ${done ? 'step--done' : active ? 'step--active' : 'step--locked'}`}>
            {/* Timeline spine */}
            <div className="step-spine">
              <div className="step-dot-wrap">
                {done   && <div className="step-dot step-dot--done"><Check size={10} /></div>}
                {active && <div className="step-dot step-dot--active"><span className="step-pulse" /></div>}
                {locked && <div className="step-dot step-dot--locked" />}
              </div>
              {i < roadmap.length - 1 && <div className={`step-line ${done ? 'step-line--done' : ''}`} />}
            </div>

            {/* Content */}
            <div className="step-body">
              <div className="step-header">
                <span className="step-type-tag">
                  <Icon size={11} /> {meta.label}
                </span>
                {done && <span className="step-done-badge">Completed</span>}
                {active && (
                  <span className="step-active-badge">
                    <span className="step-active-dot" /> In Progress
                  </span>
                )}
                {node.impact && (
                  <span className="step-impact">+{node.impact}% readiness</span>
                )}
              </div>

              <h3 className="step-title">{node.title}</h3>
              <p className="step-desc">{node.desc}</p>

              {(active || done) && (
                <div className="step-actions">
                  {node.link && (
                    <a href={node.link} target="_blank" rel="noreferrer" className="step-resource-btn">
                      <ExternalLink size={12} /> Open Resource <ArrowUpRight size={11} />
                    </a>
                  )}
                  {!locked && (
                    <button
                      className={`step-mark-btn ${done ? 'step-mark-btn--undo' : ''}`}
                      onClick={() => onToggle(node.id)}>
                      {done
                        ? <><RotateCcw size={11} /> Mark Incomplete</>
                        : <><CheckCircle2 size={11} /> Mark Complete</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TOAST
   ──────────────────────────────────────────────────────────── */
const Toast = ({ message, scoreGain, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div className="toast"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
      <div className="toast-icon"><CheckCircle2 size={14} /></div>
      <div className="toast-text">
        <span className="toast-title">{message}</span>
        {scoreGain > 0 && (
          <span className="toast-sub">Match score increased by {scoreGain}%</span>
        )}
      </div>
      <button className="toast-close" onClick={onDone}><X size={12} /></button>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SKELETON DASHBOARD
   ──────────────────────────────────────────────────────────── */
const Shimmer = ({ w, h, className = '' }) => (
  <div className={`shimmer ${className}`} style={{ width: w, height: h, borderRadius: 6 }} />
);

const SkeletonDashboard = () => (
  <div className="skel-wrap">
    {/* Top bar */}
    <div className="skel-topbar">
      <Shimmer w="340px" h="20px" />
      <Shimmer w="120px" h="32px" />
    </div>
    {/* Telemetry row */}
    <div className="skel-telemetry">
      <div className="skel-card"><Shimmer w="100%" h="180px" /></div>
      <div className="skel-card"><Shimmer w="100%" h="180px" /></div>
      <div className="skel-card"><Shimmer w="100%" h="180px" /></div>
    </div>
    {/* Main */}
    <div className="skel-main">
      <div className="skel-card skel-stepper">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="skel-step">
            <Shimmer w="16px" h="16px" style={{ borderRadius: '50%' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Shimmer w="60px" h="12px" />
              <Shimmer w="220px" h="16px" />
              <Shimmer w="100%" h="12px" />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skel-card"><Shimmer w="100%" h="160px" /></div>
        <div className="skel-card"><Shimmer w="100%" h="130px" /></div>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   RESULTS DASHBOARD
   ──────────────────────────────────────────────────────────── */
const ResultsDashboard = ({ target, roadmapData, githubData, completedNodes, onToggle, onReset }) => {
  const [toast, setToast] = useState(null);
  const [prevScore, setPrevScore] = useState(null);

  const completedImpact = roadmapData.roadmap
    .filter(n => completedNodes.has(n.id))
    .reduce((s, n) => s + n.impact, 0);
  const score = Math.min(100, roadmapData.match_score + completedImpact);

  const completedCount = roadmapData.roadmap.filter(n => completedNodes.has(n.id)).length;
  const totalCount     = roadmapData.roadmap.length;

  const [tasks, setTasks] = useState(() => {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return roadmapData.tasks.map(t => ({ ...t, done: false }));
  });

  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }, [tasks]);

  const handleToggle = useCallback(nodeId => {
    const node    = roadmapData.roadmap.find(n => n.id === nodeId);
    const wasDone = completedNodes.has(nodeId);
    const impact  = node?.impact ?? 0;
    onToggle(nodeId);
    if (!wasDone) {
      setToast({ message: 'Roadmap updated.', scoreGain: impact });
    }
  }, [completedNodes, onToggle, roadmapData.roadmap]);

  const tasksLeft = roadmapData.totalTasks - roadmapData.completedTasks;

  return (
    <div className="dash">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="dash-topbar">
        <div className="dash-topbar-left">
          <span className="dash-tb-label">Target Objective</span>
          <h1 className="dash-tb-title">
            {target.role}
            {target.company && <><span className="dash-tb-sep"> — </span>{target.company}</>}
          </h1>
        </div>
        <div className="dash-topbar-right">
          <a
            className="dash-recalibrate"
            onClick={onReset}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onReset()}>
            <RefreshCw size={13} /> Recalibrate AI
          </a>
        </div>
      </div>

      {/* ── Telemetry Row ────────────────────────────────────── */}
      <div className="dash-telemetry">

        {/* Card 1: Match Score */}
        <div className="dash-card dash-card--score">
          <div className="dash-card-label">Overall Match Score</div>
          <div className="dash-score-body">
            <MatchScoreRing score={score} size={130} />
            <div className="dash-score-meta">
              <div className="dash-score-stat">
                <span className="dash-score-stat-val">{completedCount}/{totalCount}</span>
                <span className="dash-score-stat-key">steps done</span>
              </div>
              <div className="dash-score-stat">
                <span className="dash-score-stat-val" style={{ color: '#0070F3' }}>
                  +{completedImpact}%
                </span>
                <span className="dash-score-stat-key">gained</span>
              </div>
            </div>
          </div>
          {completedImpact > 0 && (
            <div className="dash-trend">
              <TrendingUp size={11} /> +{completedImpact}% since you started
            </div>
          )}
        </div>

        {/* Card 2: Skill Radar */}
        <div className="dash-card dash-card--radar">
          <div className="dash-card-label">Skill Gap Analysis</div>
          <SkillRadarChart data={roadmapData.radar} />
          <div className="dash-radar-legend">
            <span className="dash-radar-leg"><span className="dash-leg-dot dash-leg-dot--req" />Required</span>
            <span className="dash-radar-leg"><span className="dash-leg-dot dash-leg-dot--cur" />Current</span>
          </div>
        </div>

        {/* Card 3: Time to Target + GitHub */}
        <div className="dash-card dash-card--meta">
          <div className="dash-card-label">Estimated Time to Target</div>
          <div className="dash-metric">
            <span className="dash-metric-val">
              {Math.max(1, Math.round((roadmapData.weeksToTarget * (1 - completedCount / totalCount)) / 4))}
            </span>
            <span className="dash-metric-unit">months</span>
          </div>
          <div className="dash-metric-sub">
            <Clock size={11} /> {roadmapData.weeksToTarget - Math.round(completedCount * (roadmapData.weeksToTarget / totalCount))} weeks remaining at current velocity
          </div>

          <div className="dash-divider" />

          {/* GitHub signals */}
          {githubData ? (
            <div className="dash-gh">
              <div className="dash-gh-header">
                <Github size={12} style={{ color: '#737373' }} />
                <span className="dash-gh-user">@{githubData.username}</span>
                <span className="dash-gh-repos">{githubData.publicRepos} repos</span>
              </div>
              <div className="dash-gh-langs">
                {githubData.topLangs.slice(0, 4).map(l => (
                  <span key={l} className="dash-gh-lang">{l}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="dash-gh-empty">
              <Github size={13} style={{ color: '#404040' }} />
              <span>No GitHub data connected</span>
            </div>
          )}
        </div>

      </div>

      {/* ── Main Grid ────────────────────────────────────────── */}
      <div className="dash-main">

        {/* Left: Execution plan */}
        <div className="dash-card dash-roadmap-card">
          <div className="dash-card-header">
            <div className="dash-card-label">Execution Plan</div>
            <span className="dash-roadmap-progress">
              {completedCount}/{totalCount} completed
            </span>
          </div>
          <VerticalStepper
            roadmap={roadmapData.roadmap}
            completedNodes={completedNodes}
            onToggle={handleToggle}
          />
        </div>

        {/* Right: Skills + Tasks */}
        <div className="dash-sidebar">

          {/* Skill matrix */}
          <div className="dash-card">
            <div className="dash-card-label">Skill Matrix</div>
            <div className="dash-skills-section">
              <div className="dash-skills-heading dash-skills-heading--ok">
                <CheckCircle2 size={11} /> Acquired
              </div>
              <div className="dash-pills">
                {roadmapData.acquired_skills.map(s => (
                  <span key={s} className="dash-pill dash-pill--ok">{s}</span>
                ))}
              </div>
            </div>
            <div className="dash-skills-section" style={{ marginTop: '0.9rem' }}>
              <div className="dash-skills-heading dash-skills-heading--req">
                <AlertTriangle size={11} /> Required
              </div>
              <div className="dash-pills">
                {roadmapData.missing_skills.map(s => (
                  <span key={s} className="dash-pill dash-pill--req">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Today's focus */}
          <div className="dash-card">
            <div className="dash-card-label">Today's Focus</div>
            <div className="dash-tasks">
              {tasks.map((t, i) => {
                const meta = TYPE_META[t.type] || TYPE_META.learn;
                const Icon = meta.icon;
                return (
                  <div
                    key={i}
                    className={`dash-task ${t.done ? 'dash-task--done' : ''}`}
                    onClick={() => {
                      setTasks(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], done: !next[i].done };
                        return next;
                      });
                    }}>
                    <div className={`dash-task-check ${t.done ? 'dash-task-check--done' : ''}`}>
                      {t.done && <Check size={9} />}
                    </div>
                    <span className="dash-task-text">{t.text}</span>
                    <span className="dash-task-type">
                      <Icon size={10} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            key="toast"
            message={toast.message}
            scoreGain={toast.scoreGain}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   INPUT PHASE  (clean SaaS form)
   ──────────────────────────────────────────────────────────── */
const InputPhase = ({ onSubmit }) => {
  const [targetInput, setTargetInput] = useState('');
  const [resumeFile, setResumeFile]   = useState(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeText, setResumeText]   = useState('');
  const [githubUser, setGithubUser]   = useState('');
  const [githubData, setGithubData]   = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState('');
  const fileRef = useRef(null);

  const handleResumeUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file); setResumeParsing(true);
    try { setResumeText(await extractTextFromPdf(file)); } catch { setResumeText(''); }
    setResumeParsing(false);
  };

  const handleGitHubSync = async () => {
    if (!githubUser.trim()) return;
    setGithubLoading(true); setGithubError('');
    try { setGithubData(await fetchGitHubData(githubUser.trim())); }
    catch (err) { setGithubError(err.message); }
    setGithubLoading(false);
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!targetInput.trim()) return;
    const m = targetInput.match(/^(.+?)\s+at\s+(.+)$/i);
    onSubmit({
      role:       m ? m[1].trim() : targetInput.trim(),
      company:    m ? m[2].trim() : '',
      resumeText, resumeFile, githubData,
    });
  };

  return (
    <div className="inp-phase">
      <div className="inp-container">
        {/* Eyebrow */}
        <div className="inp-eyebrow">AI-Powered Career Analysis</div>

        {/* Headline */}
        <h1 className="inp-title">
          Know exactly what it takes<br />
          to land your next role.
        </h1>
        <p className="inp-sub">
          Connect your resume and GitHub. Our AI cross-references your skills
          against the role requirements and builds a precise, actionable roadmap.
        </p>

        {/* Form card */}
        <form className="inp-card" onSubmit={handleSubmit}>
          {/* Target */}
          <div className="inp-field">
            <label className="inp-label">Target Role</label>
            <input
              autoFocus
              className="inp-input"
              placeholder='e.g.  "Backend Engineer at Stripe"'
              value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
            />
          </div>

          {/* Sources */}
          <div className="inp-sources">
            <div className="inp-source-label">Data Sources <span className="inp-optional">— optional, improves accuracy</span></div>
            <div className="inp-sources-grid">

              {/* Resume */}
              <div className="inp-source">
                <input type="file" accept=".pdf" ref={fileRef}
                  style={{ display: 'none' }} onChange={handleResumeUpload} />
                <button type="button"
                  className={`inp-source-btn ${resumeFile ? 'inp-source-btn--ok' : ''}`}
                  onClick={() => fileRef.current?.click()}>
                  {resumeParsing
                    ? <><RefreshCw size={13} className="inp-spin" /> Parsing PDF…</>
                    : resumeFile
                      ? <><CheckCircle2 size={13} style={{ color: '#10B981' }} /> {resumeFile.name.slice(0, 24)}</>
                      : <><Upload size={13} /> Upload Resume PDF</>}
                </button>
              </div>

              {/* GitHub */}
              <div className="inp-source inp-source--gh">
                <div className="inp-gh-row">
                  <input
                    className="inp-gh-input"
                    placeholder="github_username"
                    value={githubUser}
                    onChange={e => { setGithubUser(e.target.value); setGithubError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleGitHubSync(); } }}
                  />
                  <button type="button"
                    className={`inp-source-btn inp-source-btn--gh ${githubData ? 'inp-source-btn--ok' : ''}`}
                    onClick={handleGitHubSync} disabled={githubLoading}>
                    {githubLoading
                      ? <><RefreshCw size={13} className="inp-spin" /> Syncing…</>
                      : githubData
                        ? <><CheckCircle2 size={13} style={{ color: '#10B981' }} /> @{githubData.username}</>
                        : <><Github size={13} /> Connect GitHub</>}
                  </button>
                </div>
                {githubError && (
                  <p className="inp-error"><AlertTriangle size={11} /> {githubError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="inp-submit"
            disabled={!targetInput.trim()}>
            Analyze &amp; Build Roadmap <ChevronRight size={15} />
          </button>
        </form>

        {/* Social proof / trust signal */}
        <div className="inp-trust">
          <span className="inp-trust-dot" />
          <span>Analysis takes ~3 seconds · No account required</span>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────────── */
const AimPage = () => {
  const [phase, setPhase]               = useState('input');
  const [target, setTarget]             = useState({ role: '', company: '' });
  const [roadmapData, setRoadmapData]   = useState(null);
  const [githubData, setGithubData]     = useState(null);
  const [completedNodes, setCompleted]  = useState(new Set());

  // Restore session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.phase === 'results' && d.roadmapData) {
        setTarget(d.target);
        setRoadmapData(d.roadmapData);
        setGithubData(d.githubData ?? null);
        setCompleted(new Set(d.completedNodes ?? []));
        setPhase('results');
      }
    } catch {}
  }, []);

  // Persist session
  useEffect(() => {
    if (phase !== 'results' || !roadmapData) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      phase, target, roadmapData, githubData,
      completedNodes: [...completedNodes],
    }));
  }, [phase, target, roadmapData, githubData, completedNodes]);

  const handleInputSubmit = useCallback(async payload => {
    setTarget({ role: payload.role, company: payload.company });
    setGithubData(payload.githubData);
    setPhase('scanning');
    try {
      const data = await mockGenerateRoadmap({
        role: payload.role, company: payload.company,
        resumeText: payload.resumeText ?? '', githubData: payload.githubData,
      });
      setRoadmapData(data);
      setCompleted(new Set());
      setTimeout(() => setPhase('results'), 300);
    } catch { setPhase('input'); }
  }, []);

  const handleToggle = useCallback(nodeId => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  }, []);

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TASKS_KEY);
    setPhase('input');
    setRoadmapData(null);
    setCompleted(new Set());
    setGithubData(null);
    setTarget({ role: '', company: '' });
  };

  return (
    <div className="aim-page">
      <Navbar />

      <AnimatePresence mode="wait">
        {phase === 'input' && (
          <motion.div key="input"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <InputPhase onSubmit={handleInputSubmit} />
            <Footer />
          </motion.div>
        )}

        {phase === 'scanning' && (
          <motion.div key="scanning"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="aim-scanning-wrap">
            <SkeletonDashboard />
            <div className="aim-scanning-label">
              <RefreshCw size={13} className="inp-spin" />
              Analyzing your profile against role requirements…
            </div>
          </motion.div>
        )}

        {phase === 'results' && roadmapData && (
          <motion.div key="results"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <ResultsDashboard
              target={target}
              roadmapData={roadmapData}
              githubData={githubData}
              completedNodes={completedNodes}
              onToggle={handleToggle}
              onReset={handleReset}
            />
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AimPage;
