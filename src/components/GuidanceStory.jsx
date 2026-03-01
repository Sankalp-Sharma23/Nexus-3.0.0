import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Code2, Cpu, AlertTriangle,
  ExternalLink, Github, ChevronDown, Clock, Target,
  Calendar, CheckCircle, Trophy, Layers, Terminal,
  BarChart2, Zap, Lock, ChevronRight
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import Dither from './Dither';
import '../styles/GuidanceStory.css';

/* ─── Story data ─────────────────────────────────────────────── */
const STORIES = {
  'alex-sde-google': {
    name: 'Alex Chen', role: 'Software Engineer', company: 'Google',
    initials: 'AC', hue: '#00F0FF', totalTime: '9 Months',
    batch: '2025', status: 'HIRED',
    mission: 'Break into FAANG as a new grad with no prior internship.',
    timeline: [
      {
        id: 1, type: 'foundation', side: 'left',
        icon: 'book',
        title: 'OS & Systems Deep-Dive',
        subtitle: 'Laid the theoretical groundwork.',
        courseCode: 'MIT-6.004 / RH124',
        duration: '6 weeks',
        content: 'Covered memory management, process scheduling, virtual memory, and file systems. Used MIT OpenCourseWare for lecture series and Red Hat RH124/RH134 for hands-on Linux administration.',
        resources: [
          { label: 'MIT 6.004 Lectures', url: 'https://ocw.mit.edu/6-004' },
          { label: 'Red Hat RH124 Syllabus', url: 'https://www.redhat.com/en/services/training/rh124' },
        ],
      },
      {
        id: 2, type: 'grind', side: 'right',
        icon: 'dsa',
        title: 'DSA Mastery — 300 Problems',
        subtitle: '127-day active LeetCode streak.',
        metrics: { easy: 98, medium: 148, hard: 54, streak: 127 },
        content: 'Prioritised graph traversal, dynamic programming, and two-pointer patterns. Solved every problem from NeetCode 150 before expanding to company-tagged sets.',
        interviewProblems: [
          { label: 'LC 200 — Number of Islands', url: 'https://leetcode.com/problems/number-of-islands/' },
          { label: 'LC 56 — Merge Intervals', url: 'https://leetcode.com/problems/merge-intervals/' },
          { label: 'LC 1 — Two Sum (variant asked)', url: 'https://leetcode.com/problems/two-sum/' },
        ],
      },
      {
        id: 3, type: 'foundation', side: 'left',
        icon: 'book',
        title: 'System Design Fundamentals',
        courseCode: 'DDIA + Grokking',
        duration: '4 weeks',
        subtitle: 'Scalability patterns for L4/L5 interviews.',
        content: '"Designing Data-Intensive Applications" cover-to-cover, followed by Grokking the System Design Interview. Built mental models for CAP theorem, consistent hashing, and distributed caching.',
        resources: [
          { label: 'DDIA (O\'Reilly)', url: 'https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/' },
          { label: 'Grokking SD Interview', url: 'https://www.educative.io/courses/grokking-the-system-design-interview' },
        ],
      },
      {
        id: 4, type: 'build', side: 'right',
        icon: 'terminal',
        title: 'DistCache — Distributed LRU Cache',
        subtitle: 'Replicated the core of Memcached.',
        stack: ['Go', 'gRPC', 'Consistent Hashing', 'Docker', 'Redis'],
        githubUrl: 'https://github.com',
        problem: 'Needed a portfolio project that directly demonstrated knowledge of distributed systems concepts asked in Google interviews.',
        content: 'Built a horizontally-scalable LRU cache with consistent hashing for key distribution, gRPC for inter-node communication, and a WAL for crash recovery. Benchmarked at 140K ops/sec on a single node.',
        arch: ['Client → Load Balancer', 'Hash Ring → Node Selection', 'In-memory LRU + WAL', 'gRPC peer replication'],
      },
      {
        id: 5, type: 'build', side: 'left',
        icon: 'terminal',
        title: 'ThreadSafe — Collaborative Editor',
        subtitle: 'Real-time CRDT-based document editing.',
        stack: ['TypeScript', 'React', 'WebSockets', 'Y.js', 'Node.js', 'PostgreSQL'],
        githubUrl: 'https://github.com',
        problem: 'Wanted a frontend-heavy project to balance the DistCache backend work.',
        content: 'Implemented Operational Transformation via Y.js for conflict-free real-time edits. Presence indicators, cursor tracking, and persistent snapshots stored in PostgreSQL.',
        arch: ['Y.js CRDT → WebSocket broadcast', 'Awareness API → Cursor positions', 'Snapshot persistence → Postgres', 'React + Monaco Editor UI'],
      },
      {
        id: 6, type: 'grind', side: 'right',
        icon: 'dsa',
        title: 'Company-Specific Prep Sprint',
        subtitle: '3-week Google-tagged problem crunch.',
        metrics: { easy: 12, medium: 38, hard: 22, streak: 21 },
        content: 'Laser-focused on Google-tagged LeetCode problems. Identified patterns in segment trees, Trie structures, and graph BFS/DFS variants. Daily mock sessions with a peer.',
        interviewProblems: [
          { label: 'LC 212 — Word Search II (Trie)', url: 'https://leetcode.com/problems/word-search-ii/' },
          { label: 'LC 315 — Count of Smaller Numbers', url: 'https://leetcode.com/problems/count-of-smaller-numbers-after-self/' },
          { label: 'LC 76 — Minimum Window Substring', url: 'https://leetcode.com/problems/minimum-window-substring/' },
        ],
      },
      {
        id: 7, type: 'execution', side: 'left',
        icon: 'alert',
        title: 'Round 1 — Phone Screen',
        subtitle: 'Data Structures · 45 min · Passed',
        outcome: 'PASSED',
        round: 'PHONE_SCREEN',
        content: 'Two medium-difficulty problems on graphs and arrays. Interviewer wanted to see thought process narrated out loud more than perfect code. Used STAR framework for the intro.',
        questions: [
          { q: 'Implement BFS on a weighted adjacency matrix and return the shortest path.', hint: 'Dijkstra with a min-heap. Asked to optimize from O(V²) → O((V+E) log V).' },
          { q: 'Find all unique paths in a 2D grid with obstacles.', hint: 'DP with memoisation. Edge case: obstacle on start/end cell.' },
        ],
      },
      {
        id: 8, type: 'execution', side: 'right',
        icon: 'alert',
        title: 'On-site Loop — Day 1',
        subtitle: 'Coding × 2, Behavioural × 1 · Passed',
        outcome: 'PASSED',
        round: 'ONSITE_D1',
        content: 'Three back-to-back 45-min sessions. Coding rounds hit Trie + sliding window. Behavioural: "Tell me about a time you had technical disagreement with a teammate."',
        questions: [
          { q: 'Design an autocomplete system for a search box.', hint: 'Trie with frequency counters. Follow-up: scale to 1B queries/day.' },
          { q: 'Longest substring with at most K distinct characters.', hint: 'Sliding window + HashMap for char frequency.' },
          { q: '[Behavioural] Conflict with teammate over technical direction.', hint: 'Used disagreement on DB schema normalisation as example. STAR format.' },
        ],
      },
      {
        id: 9, type: 'execution', side: 'left',
        icon: 'alert',
        title: 'On-site Loop — Day 2 (System Design)',
        subtitle: 'System Design · 1hr · Passed',
        outcome: 'PASSED',
        round: 'SYSDESIGN',
        content: '"Design YouTube" — focused on video upload pipeline, distributed CDN, and recommendation ranking stub. Interviewer pushed hard on trade-offs between eventual and strong consistency.',
        questions: [
          { q: 'Design YouTube at Google scale.', hint: 'Blob storage for videos, CDN edge nodes, async transcoding pipeline (message queue), metadata DB with read replicas. Recommendation: collaborative filtering stub.' },
        ],
      },
    ],
  },

  'priya-ml-microsoft': {
    name: 'Priya Sharma', role: 'ML Engineer', company: 'Microsoft',
    initials: 'PS', hue: '#a78bfa', totalTime: '11 Months',
    batch: '2025', status: 'HIRED',
    mission: 'Transition from data analyst to ML Engineer at a top-tier tech company.',
    timeline: [
      { id: 1, type: 'foundation', side: 'left', icon: 'book', title: 'Mathematics for ML', courseCode: 'MIT-18.06 + 3B1B', duration: '8 weeks', subtitle: 'Linear algebra, calculus, and probability foundations.', content: 'MIT Linear Algebra + 3Blue1Brown series for intuition. Covered SVD, eigendecomposition, gradient descent derivations from first principles.', resources: [{ label: 'MIT 18.06 Gilbert Strang', url: 'https://ocw.mit.edu/18-06' }, { label: '3B1B Essence of Linear Algebra', url: 'https://youtube.com/3blue1brown' }] },
      { id: 2, type: 'build', side: 'right', icon: 'terminal', title: 'Sentiment BERT Fine-Tune', subtitle: 'Fine-tuned BERT on custom dataset.', stack: ['Python', 'PyTorch', 'Transformers', 'Azure ML', 'ONNX'], githubUrl: 'https://github.com', problem: 'Needed hands-on model deployment experience for ML engineer interviews.', content: 'Fine-tuned distilBERT on a 50K product review corpus. Exported to ONNX and deployed on Azure ML endpoints. Achieved 92.4% F1 on test set.', arch: ['HuggingFace → fine-tune', 'ONNX export → optimize', 'Azure ML endpoint', 'REST API wrapper'] },
      { id: 3, type: 'grind', side: 'left', icon: 'dsa', title: 'ML Coding Interview Prep', subtitle: '90-day structured ML coding sprint.', metrics: { easy: 45, medium: 72, hard: 18, streak: 90 }, content: 'Combined LeetCode for coding foundations with ML-specific questions from ML System Design interview resources. Focused on numpy implementations of ML algorithms from scratch.', interviewProblems: [{ label: 'Implement k-means from scratch', url: '#' }, { label: 'LC 215 — K-th Largest Element', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/' }, { label: 'Backprop derivation for 2-layer NN', url: '#' }] },
      { id: 4, type: 'execution', side: 'right', icon: 'alert', title: 'Microsoft ML Phone Screen', subtitle: 'Python data structures + ML concepts · Passed', outcome: 'PASSED', round: 'PHONE_SCREEN', content: 'Heavy on Python proficiency and ML theory. Questions on model evaluation, overfitting, and regularisation. One coding problem on matrix manipulation.', questions: [{ q: 'Explain bias-variance tradeoff and how you would diagnose it in a production model.', hint: 'Learning curves, cross-validation error analysis.' }, { q: 'Implement matrix multiplication without NumPy.', hint: 'O(n³) naive → discuss Strassen. Tested code cleanliness.' }] },
    ],
  },
};

/* ─── helpers ────────────────────────────────────────────────── */
const NODE_TYPE_META = {
  foundation: { label: 'FOUNDATION',  icon: BookOpen,      color: '#a78bfa' },
  grind:      { label: 'THE GRIND',   icon: BarChart2,     color: '#00F0FF' },
  build:      { label: 'BUILD',       icon: Terminal,      color: '#39FF14' },
  execution:  { label: 'EXECUTION',   icon: AlertTriangle, color: '#f59e0b' },
};

const OUTCOME_COLOR = { PASSED: '#39FF14', FAILED: '#ef4444', PENDING: '#f59e0b' };

/* ─── Foundation Node ────────────────────────────────────────── */
const FoundationNode = ({ node, side, lineX }) => {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div ref={ref} className={`gs-node gs-node--${side} gs-foundation`}
      initial={{ opacity: 0, x: side === 'left' ? -40 : 40, scale: 0.94 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* horizontal connector trace */}
      <div className={`gs-h-trace gs-h-trace--${side} ${hovered ? 'active' : ''}`} />

      {/* connector dot on timeline */}
      <div className={`gs-timeline-dot ${hovered ? 'active' : ''}`} style={{ background: NODE_TYPE_META.foundation.color }} />

      <div className="gs-node-inner">
        {/* type label */}
        <div className="gs-node-type" style={{ color: NODE_TYPE_META.foundation.color }}>
          <BookOpen size={11} /> {NODE_TYPE_META.foundation.label}
        </div>
        <div className="gs-node-course-code">{node.courseCode}</div>
        <h3 className="gs-node-title">{node.title}</h3>
        <p className="gs-node-sub">{node.subtitle}</p>

        <div className="gs-node-meta-row">
          <span className="gs-tag"><Clock size={11} />{node.duration}</span>
        </div>

        <p className="gs-node-body">{node.content}</p>

        {node.resources?.length > 0 && (
          <div className="gs-resource-list">
            <span className="gs-resource-label">// RESOURCES</span>
            {node.resources.map(r => (
              <a key={r.label} href={r.url} target="_blank" rel="noreferrer" className="gs-resource-link">
                <ExternalLink size={11} /> {r.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Grind Node ─────────────────────────────────────────────── */
const GrindNode = ({ node, side }) => {
  const [hovered, setHovered] = useState(false);
  const total = (node.metrics?.easy ?? 0) + (node.metrics?.medium ?? 0) + (node.metrics?.hard ?? 0);

  return (
    <motion.div className={`gs-node gs-node--${side} gs-grind`}
      initial={{ opacity: 0, x: side === 'left' ? -40 : 40, scale: 0.94 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`gs-h-trace gs-h-trace--${side} ${hovered ? 'active' : ''}`} />
      <div className={`gs-timeline-dot ${hovered ? 'active' : ''}`} style={{ background: NODE_TYPE_META.grind.color }} />

      <div className="gs-node-inner">
        <div className="gs-node-type" style={{ color: NODE_TYPE_META.grind.color }}>
          <BarChart2 size={11} /> {NODE_TYPE_META.grind.label}
        </div>
        <h3 className="gs-node-title">{node.title}</h3>
        <p className="gs-node-sub">{node.subtitle}</p>

        {node.metrics && (
          <div className="gs-lc-stats">
            <div className="gs-lc-streak">
              <Zap size={13} style={{ color: '#f59e0b' }} />
              <span className="gs-lc-streak-num">{node.metrics.streak}</span>
              <span className="gs-lc-streak-label">day streak</span>
            </div>
            <div className="gs-lc-bars">
              {[
                { label: 'Easy',   val: node.metrics.easy,   color: '#39FF14' },
                { label: 'Medium', val: node.metrics.medium, color: '#f59e0b' },
                { label: 'Hard',   val: node.metrics.hard,   color: '#ef4444' },
              ].map(b => (
                <div key={b.label} className="gs-lc-bar-row">
                  <span className="gs-lc-bar-label">{b.label}</span>
                  <div className="gs-lc-bar-track">
                    <motion.div className="gs-lc-bar-fill"
                      style={{ background: b.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(b.val / (total || 1)) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <span className="gs-lc-bar-num">{b.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="gs-node-body">{node.content}</p>

        {node.interviewProblems?.length > 0 && (
          <div className="gs-resource-list">
            <span className="gs-resource-label">// ASKED IN INTERVIEW</span>
            {node.interviewProblems.map(p => (
              <a key={p.label} href={p.url} target="_blank" rel="noreferrer" className="gs-resource-link">
                <Code2 size={11} /> {p.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Build Node ─────────────────────────────────────────────── */
const BuildNode = ({ node, side }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div className={`gs-node gs-node--${side} gs-build`}
      initial={{ opacity: 0, x: side === 'left' ? -40 : 40, scale: 0.94 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`gs-h-trace gs-h-trace--${side} ${hovered ? 'active' : ''}`} />
      <div className={`gs-timeline-dot ${hovered ? 'active' : ''}`} style={{ background: NODE_TYPE_META.build.color }} />

      <div className="gs-node-inner gs-terminal-window">
        {/* Terminal title bar */}
        <div className="gs-term-bar">
          <span className="gs-term-dot gs-term-dot--r" />
          <span className="gs-term-dot gs-term-dot--y" />
          <span className="gs-term-dot gs-term-dot--g" />
          <span className="gs-term-title">~/projects/{node.title.toLowerCase().replace(/\s+/g, '-')}</span>
        </div>

        <div className="gs-term-body">
          <div className="gs-node-type" style={{ color: NODE_TYPE_META.build.color }}>
            <Terminal size={11} /> {NODE_TYPE_META.build.label}
          </div>
          <h3 className="gs-node-title">{node.title}</h3>
          <p className="gs-node-sub">{node.subtitle}</p>

          <div className="gs-stack-row">
            {node.stack?.map(s => <span key={s} className="gs-stack-pill">{s}</span>)}
          </div>

          <p className="gs-node-body">{node.content}</p>

          {node.arch && (
            <div className="gs-arch">
              <span className="gs-resource-label">// ARCHITECTURE</span>
              {node.arch.map((a, i) => (
                <div key={i} className="gs-arch-row">
                  <span className="gs-arch-arrow">→</span>
                  <span className="gs-arch-step">{a}</span>
                </div>
              ))}
            </div>
          )}

          {node.githubUrl && (
            <a href={node.githubUrl} target="_blank" rel="noreferrer" className="gs-github-btn">
              <Github size={13} /> View Repository
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Execution Node ─────────────────────────────────────────── */
const ExecutionNode = ({ node, side }) => {
  const [hovered, setHovered] = useState(false);
  const [openQ, setOpenQ] = useState(null);

  return (
    <motion.div className={`gs-node gs-node--${side} gs-execution`}
      initial={{ opacity: 0, x: side === 'left' ? -40 : 40, scale: 0.94 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`gs-h-trace gs-h-trace--${side} ${hovered ? 'active' : ''}`} />
      <div className={`gs-timeline-dot ${hovered ? 'active' : ''}`} style={{ background: NODE_TYPE_META.execution.color }} />

      <div className="gs-node-inner">
        <div className="gs-exec-header">
          <div className="gs-node-type" style={{ color: NODE_TYPE_META.execution.color }}>
            <AlertTriangle size={11} /> {NODE_TYPE_META.execution.label}
          </div>
          <span className="gs-outcome-badge" style={{ color: OUTCOME_COLOR[node.outcome] ?? '#fff', borderColor: OUTCOME_COLOR[node.outcome] }}>
            {node.outcome}
          </span>
        </div>
        <div className="gs-round-code">[{node.round}]</div>
        <h3 className="gs-node-title">{node.title}</h3>
        <p className="gs-node-sub">{node.subtitle}</p>
        <p className="gs-node-body">{node.content}</p>

        {node.questions?.length > 0 && (
          <div className="gs-questions">
            <span className="gs-resource-label">// QUESTIONS ASKED</span>
            {node.questions.map((q, i) => (
              <div key={i} className="gs-q-item">
                <button className="gs-q-toggle" onClick={() => setOpenQ(openQ === i ? null : i)}>
                  <span className="gs-q-idx">Q{i + 1}</span>
                  <span className="gs-q-text">{q.q}</span>
                  <ChevronDown size={13} className={`gs-q-chevron ${openQ === i ? 'open' : ''}`} />
                </button>
                <AnimatePresence>
                  {openQ === i && (
                    <motion.div
                      className="gs-q-hint"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span className="gs-hint-label">// APPROACH</span>
                      <p>{q.hint}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Node router ────────────────────────────────────────────── */
const TimelineNode = ({ node }) => {
  const props = { node, side: node.side };
  switch (node.type) {
    case 'foundation': return <FoundationNode {...props} />;
    case 'grind':      return <GrindNode      {...props} />;
    case 'build':      return <BuildNode      {...props} />;
    case 'execution':  return <ExecutionNode  {...props} />;
    default:           return null;
  }
};

/* ─── Floating binary bits ───────────────────────────────────── */
const BITS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  char: i % 2 === 0 ? '1' : '0',
  x: (i * 4.7 + 2.3) % 100,
  dur: 9 + (i * 2.3) % 15,
  delay: (i * 3.7) % 12,
  size: 10 + (i * 1.1) % 8,
}));

function FloatingBits() {
  return (
    <div className="gs-float-bits" aria-hidden>
      {BITS.map(b => (
        <span
          key={b.id}
          className="gs-bit"
          style={{
            left: `${b.x}%`,
            fontSize: `${b.size}px`,
            animationDuration: `${b.dur}s`,
            animationDelay: `-${b.delay}s`,
          }}
        >{b.char}</span>
      ))}
    </div>
  );
}

/* ─── Central drawing line ───────────────────────────────────── */
const DrawingLine = ({ nodeCount }) => {
  const lineRef = useRef(null);
  const { scrollY } = useScroll();

  useEffect(() => {
    const unsub = scrollY.on('change', v => {
      if (!lineRef.current) return;
      const docH   = document.documentElement.scrollHeight - window.innerHeight;
      const prog   = Math.min(v / (docH || 1), 1);
      const pct    = prog * 100;
      lineRef.current.style.setProperty('--line-progress', `${pct}%`);
    });
    return unsub;
  }, [scrollY]);

  return (
    <div className="gs-timeline-track" ref={lineRef}>
      <div className="gs-line-base" />
      <div className="gs-line-glow" />
    </div>
  );
};

/* ─── Main page ──────────────────────────────────────────────── */
const GuidanceStory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const story = STORIES[id] ?? STORIES['alex-sde-google'];

  const { scrollY } = useScroll();
  const gridY  = useTransform(scrollY, [0, 2000], [0, -400]);
  const heroOp = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY  = useTransform(scrollY, [0, 300], [0, 60]);

  return (
    <div className="gs-page">
      <Navbar />

      {/* Persistent floating back button */}
      <motion.button
        className="gs-fab-back"
        onClick={() => navigate('/guidance')}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.08, x: -3 }}
        whileTap={{ scale: 0.94 }}
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </motion.button>

      {/* Dither WebGL background */}
      <div className="gs-dither-bg" aria-hidden>
        <Dither
          waveColor={[0.18, 0.04, 0.65]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.35}
          waveFrequency={4}
          waveSpeed={0.08}
        />
      </div>

      {/* Parallax grid */}
      <motion.div className="gs-grid-bg" style={{ y: gridY }} aria-hidden />
      <div className="gs-scanlines" aria-hidden />

      {/* Floating binary bits */}
      <FloatingBits />

      {/* ── HERO "MISSION BRIEFING" ─────────────────────────── */}
      <motion.section className="gs-hero" style={{ y: heroY }}>
        {/* Entrance animation outer wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 52, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Scroll-fade glass */}
          <motion.div className="gs-hero-glass" style={{ opacity: heroOp }}>

            <motion.div className="gs-hero-eyebrow"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <button className="gs-back-btn" onClick={() => navigate('/guidance')}>
                <ArrowLeft size={14} /> BACK_TO_DIRECTORY
              </button>
              <span className="gs-hero-batch">BATCH_{story.batch}</span>
            </motion.div>

            <motion.div className="gs-mission-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >// MISSION BRIEFING<span className="gs-cursor" /></motion.div>

            <motion.h1 className="gs-hero-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.62, ease: [0.22, 1, 0.36, 1] }}
            >
              TARGET ACQUIRED:<br />
              <span className="gs-hero-role">{story.role}</span>
              <span className="gs-hero-at"> @ </span>
              <span className="gs-hero-co" style={{ color: story.hue,
                textShadow: `0 0 30px ${story.hue}66` }}>{story.company}</span>
            </motion.h1>

            <motion.p className="gs-hero-mission"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.76 }}
            >{story.mission}</motion.p>

            <motion.div className="gs-hero-stats"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.88 }}
            >
              <div className="gs-hstat">
                <Clock size={15} />
                <span className="gs-hstat-val">{story.totalTime}</span>
                <span className="gs-hstat-label">TIME_TO_EXECUTE</span>
              </div>
              <div className="gs-hstat-sep" />
              <div className="gs-hstat">
                <Layers size={15} />
                <span className="gs-hstat-val">{story.timeline.length}</span>
                <span className="gs-hstat-label">MILESTONES</span>
              </div>
              <div className="gs-hstat-sep" />
              <div className="gs-hstat">
                <CheckCircle size={15} style={{ color: '#39FF14' }} />
                <span className="gs-hstat-val gs-hstat-val--hired" style={{ color: '#39FF14' }}>{story.status}</span>
                <span className="gs-hstat-label">FINAL_STATUS</span>
              </div>
            </motion.div>

            {/* avatar */}
            <motion.div className="gs-hero-avatar" style={{ '--accent': story.hue }}
              initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.75, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="gs-hero-initials">{story.initials}</span>
              <div className="gs-avatar-scan" />
              <div className="gs-avatar-duotone" style={{ background: `linear-gradient(145deg, ${story.hue}33, transparent)` }} />
            </motion.div>

            <motion.div className="gs-scroll-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <span>SCROLL_TO_LOAD_PATH</span>
              <ChevronDown size={14} className="gs-scroll-arrow" />
            </motion.div>

          </motion.div>
        </motion.div>
      </motion.section>

      {/* ── Z-AXIS TIMELINE ────────────────────────────────── */}
      <section className="gs-timeline-section">
        <DrawingLine nodeCount={story.timeline.length} />

        <div className="gs-nodes-wrap">
          {story.timeline.map(node => (
            <TimelineNode key={node.id} node={node} />
          ))}
        </div>

        {/* End node — Hired */}
        <motion.div className="gs-end-node"
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="gs-end-dot" />
          <div className="gs-end-card">
            <Trophy size={22} style={{ color: '#39FF14' }} />
            <div>
              <span className="gs-end-label">// MISSION COMPLETE</span>
              <p className="gs-end-title">{story.role} @ {story.company}</p>
              <p className="gs-end-offer">OFFER_ACCEPTED — {story.totalTime} total prep</p>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default GuidanceStory;
