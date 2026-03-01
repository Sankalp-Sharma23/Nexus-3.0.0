import { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Navbar from './Navbar';
import Footer from './Footer';
import {
  CheckCircle2, Circle, ExternalLink, Search,
  Hash, ArrowLeftRight, GalleryHorizontal, Layers, ScanSearch,
  Link2, GitFork, Network, BarChart3, RotateCcw,
  Workflow, MapPin, Activity, Grid3x3, Zap, Sliders,
  Compass, Binary, Trophy, Target,
  AlertCircle, X, Loader2, TrendingUp,
  BookOpen, Database, MessageSquare, Table2,
  Type, RefreshCcw, Server, SortAsc,
} from 'lucide-react';
import '../styles/PracticeHub.css';

/* ─────────────── constants ─────────────── */
const NEXUS_KEY = 'nexus_practice_username';
const API       = '/api/practice';

const DIFFICULTY_COLORS = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

const CATEGORY_ICONS = {
  // Data Structures
  'Array':                      <Hash size={15} />,
  'String':                     <Type size={15} />,
  'Hash Table':                 <Hash size={15} />,
  'Linked List':                <Link2 size={15} />,
  'Stack':                      <Layers size={15} />,
  'Queue':                      <GalleryHorizontal size={15} />,
  'Monotonic Stack':            <Layers size={15} />,
  'Monotonic Queue':            <GalleryHorizontal size={15} />,
  'Tree':                       <GitFork size={15} />,
  'Binary Tree':                <GitFork size={15} />,
  'Binary Search Tree':         <GitFork size={15} />,
  'Graph':                      <Workflow size={15} />,
  'Trie':                       <Network size={15} />,
  'Heap (Priority Queue)':      <BarChart3 size={15} />,
  'Matrix':                     <Grid3x3 size={15} />,
  'Union Find':                 <Network size={15} />,
  'Segment Tree':               <Activity size={15} />,
  'Binary Indexed Tree':        <Activity size={15} />,
  'Ordered Set':                <SortAsc size={15} />,
  // Algorithms
  'Dynamic Programming':        <Activity size={15} />,
  'Greedy':                     <Zap size={15} />,
  'Two Pointers':               <ArrowLeftRight size={15} />,
  'Binary Search':              <ScanSearch size={15} />,
  'Sliding Window':             <GalleryHorizontal size={15} />,
  'Backtracking':               <RotateCcw size={15} />,
  'Depth-First Search':         <MapPin size={15} />,
  'Breadth-First Search':       <Workflow size={15} />,
  'Divide and Conquer':         <Sliders size={15} />,
  'Recursion':                  <RefreshCcw size={15} />,
  'Memoization':                <RefreshCcw size={15} />,
  'Sorting':                    <SortAsc size={15} />,
  'Topological Sort':           <MapPin size={15} />,
  'Shortest Path':              <MapPin size={15} />,
  // Math & Logic
  'Math':                       <Compass size={15} />,
  'Bit Manipulation':           <Binary size={15} />,
  'Number Theory':              <Compass size={15} />,
  'Geometry':                   <Compass size={15} />,
  'Combinatorics':              <Compass size={15} />,
  'Brainteaser':                <Zap size={15} />,
  // Design & Topics
  'Design':                     <Server size={15} />,
  'Database':                   <Database size={15} />,
  'Simulation':                 <Grid3x3 size={15} />,
  'String Matching':            <Type size={15} />,
  'Prefix Sum':                 <Activity size={15} />,
  'Counting':                   <Hash size={15} />,
  'Enumeration':                <SortAsc size={15} />,
  'Data Stream':                <Activity size={15} />,
  'Concurrency':                <Server size={15} />,
  'Interactive':                <MessageSquare size={15} />,
  'Game Theory':                <Zap size={15} />,
  'Shell':                      <Server size={15} />,
};

/* Category groups — based on LeetCode's actual topic tags */
const CATEGORY_GROUPS = [
  { label: 'Data Structures', categories: ['Array', 'String', 'Hash Table', 'Linked List', 'Stack', 'Queue', 'Monotonic Stack', 'Monotonic Queue', 'Tree', 'Binary Tree', 'Binary Search Tree', 'Graph', 'Trie', 'Heap (Priority Queue)', 'Matrix', 'Ordered Set', 'Segment Tree', 'Binary Indexed Tree', 'Union Find'] },
  { label: 'Algorithms',      categories: ['Dynamic Programming', 'Greedy', 'Two Pointers', 'Binary Search', 'Sliding Window', 'Backtracking', 'Depth-First Search', 'Breadth-First Search', 'Divide and Conquer', 'Recursion', 'Memoization', 'Sorting', 'Topological Sort', 'Shortest Path'] },
  { label: 'Math & Logic',    categories: ['Math', 'Bit Manipulation', 'Number Theory', 'Geometry', 'Combinatorics', 'Probability and Statistics', 'Randomized', 'Brainteaser'] },
  { label: 'Topics',          categories: ['Design', 'Database', 'Simulation', 'String Matching', 'Prefix Sum', 'Counting', 'Enumeration', 'Data Stream', 'Interactive', 'Game Theory', 'Concurrency', 'Shell'] },
];

// Flat set of all categories covered by a group (for the "Other" catch-all)
const GROUPED_CATS = new Set(CATEGORY_GROUPS.flatMap(g => g.categories));

/* ─────────────── helpers ─────────────── */
function getOrCreateNexusId() {
  let id = localStorage.getItem(NEXUS_KEY);
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(NEXUS_KEY, id);
  }
  return id;
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ─────────────── NumberTicker ─────────────── */
function NumberTicker({ value, duration = 1100 }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);
  const fromRef  = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to   = value ?? 0;
    if (from === to) return;
    let startTime = null;
    const tick = (now) => {
      if (!startTime) startTime = now;
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <>{display}</>;
}

/* ─────────────── SpotlightCard ─────────────── */
function SpotlightCard({ children, className = '' }) {
  const ref = useRef(null);
  const handleMouseMove = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    ref.current.style.setProperty('--sx', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--sy', `${e.clientY - rect.top}px`);
  }, []);
  return (
    <div ref={ref} className={`ph-spotlight-card ${className}`} onMouseMove={handleMouseMove}>
      {children}
    </div>
  );
}

/* ─────────────── DifficultyDot ─────────────── */
function DifficultyDot({ d }) {
  return <span className={`ph-diff-dot diff-${DIFFICULTY_COLORS[d]}`} title={d} />;
}

/* ─────────────── MiniProgressBar ─────────────── */
function MiniBar({ value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="ph-mini-bar-track">
      <div className="ph-mini-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ─────────────── SyncToast ─────────────── */
function SyncToast({ msg, onDismiss }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          className={`ph-toast ph-toast-${msg.type}`}
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.4 }}
          onDragEnd={(_, { offset }) => { if (offset.x > 72) onDismiss(); }}
          style={{ cursor: 'grab' }}
        >
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg.text}</span>
          <button className="ph-toast-close" onClick={onDismiss}><X size={14} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────── ProblemRow ─────────────── */
function ProblemRow({ problem, isSolved, onToggle, isNew }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e) => {
    e.stopPropagation();
    const marking = !isSolved;
    if (marking) {
      const rect = e.currentTarget.getBoundingClientRect();
      confetti({
        particleCount: 14,
        spread: 58,
        origin: {
          x: (rect.left + rect.width  / 2) / window.innerWidth,
          y: (rect.top  + rect.height / 2) / window.innerHeight,
        },
        colors: ['#4ade80', '#22c55e', '#86efac', '#a7f3d0'],
        startVelocity: 20,
        scalar: 0.55,
        gravity: 1.1,
        ticks: 55,
        drift: 0.2,
      });
    }
    setToggling(true);
    await onToggle(problem.title_slug, marking);
    setToggling(false);
  };

  return (
    <div className={`ph-problem-row${isSolved ? ' solved' : ''}${isNew ? ' new-solve' : ''}`}>
      <button
        className={`ph-solve-btn${isSolved ? ' is-solved' : ''}${toggling ? ' toggling' : ''}`}
        onClick={handleToggle}
        title={isSolved ? 'Mark unsolved' : 'Mark solved'}
      >
        {toggling
          ? <Loader2 size={18} className="spin" />
          : isSolved ? <CheckCircle2 size={18} /> : <Circle size={18} />
        }
      </button>
      <span className="ph-row-num">{problem.id}</span>
      <DifficultyDot d={problem.difficulty} />
      <a
        className="ph-row-title"
        href={problem.leetcode_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
      >
        <span className="ph-row-title-text">{problem.title}</span>
        <ExternalLink size={12} className="ph-row-ext" />
      </a>
      <span className={`ph-diff-chip diff-${DIFFICULTY_COLORS[problem.difficulty]}`}>
        {problem.difficulty}
      </span>
    </div>
  );
}

/* ─────────────── ProblemList ─────────────── */
function ProblemList({ problems, solvedSlugs, selectedCategory, onToggle, diffFilter, searchQ, newlySolved }) {
  const filtered = useMemo(() => {
    return problems.filter(p => {
      const inCat    = !selectedCategory || p.category === selectedCategory;
      const inDiff   = diffFilter === 'All' || p.difficulty === diffFilter;
      const inSearch = !searchQ || p.title.toLowerCase().includes(searchQ.toLowerCase());
      return inCat && inDiff && inSearch;
    });
  }, [problems, selectedCategory, diffFilter, searchQ]);

  if (filtered.length === 0) {
    return (
      <motion.div className="ph-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <BookOpen size={36} />
        <p>No problems match your filters.</p>
      </motion.div>
    );
  }

  return (
    <div className="ph-problem-list">
      <AnimatePresence initial={false} mode="popLayout">
        {filtered.map((p, i) => (
          <motion.div
            key={p.title_slug}
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: 48,
              transition: {
                height:  { duration: 0.18, ease: 'easeOut' },
                opacity: { duration: 0.22, delay: Math.min(i * 0.018, 0.36) },
              },
            }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}
            style={{ overflow: 'hidden' }}
          >
            <ProblemRow
              problem={p}
              isSolved={solvedSlugs.has(p.title_slug)}
              onToggle={onToggle}
              isNew={newlySolved?.has(p.title_slug)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────── CategorySidebar ─────────────── */
function CategorySidebar({ problems, solvedSlugs, selected, onSelect }) {
  const categories = useMemo(() => {
    const cats = {};
    problems.forEach(p => {
      if (!cats[p.category]) cats[p.category] = { total: 0, solved: 0 };
      cats[p.category].total++;
      if (solvedSlugs.has(p.title_slug)) cats[p.category].solved++;
    });
    return cats;
  }, [problems, solvedSlugs]);

  const totalSolved   = solvedSlugs.size;
  const totalProblems = problems.length;

  const CatButton = ({ cat, icon, name, solved, total, isAllBtn }) => {
    const isActive = isAllBtn ? !selected : selected === cat;
    const isDone   = !isAllBtn && solved === total && total > 0;
    return (
      <button
        className={`ph-cat-btn${isActive ? ' active' : ''}${isDone ? ' all-done' : ''}`}
        onClick={() => onSelect(isAllBtn ? null : cat)}
        style={{ position: 'relative' }}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active-pill"
            className="ph-cat-active-bg"
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          />
        )}
        <span className="ph-cat-icon">{icon}</span>
        <span className="ph-cat-name">{name}</span>
        <span className="ph-cat-prog">{solved} / {total}</span>
        {isDone && (
          <motion.span
            className="ph-cat-done-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            <Check size={11} />
          </motion.span>
        )}
      </button>
    );
  };

  return (
    <aside className="ph-sidebar">
      <div className="ph-sidebar-header">
        <Target size={16} />
        <span>Categories</span>
      </div>

      <CatButton cat={null} icon={<BookOpen size={15} />} name="All Problems"
        solved={totalSolved} total={totalProblems} isAllBtn />

      {CATEGORY_GROUPS.map(({ label, categories: groupCats }) => {
        const visibleCats = groupCats.filter(c => categories[c]);
        if (visibleCats.length === 0) return null;
        return (
          <div key={label} className="ph-cat-group">
            <div className="ph-cat-group-label">{label}</div>
            {visibleCats.map(cat => {
              const { total, solved } = categories[cat];
              return (
                <CatButton
                  key={cat} cat={cat}
                  icon={CATEGORY_ICONS[cat] ?? <BookOpen size={15} />}
                  name={cat} solved={solved} total={total}
                />
              );
            })}
          </div>
        );
      })}

      {/* “Other” catch-all for any tags not covered by the groups above */}
      {(() => {
        const otherCats = Object.keys(categories).filter(c => !GROUPED_CATS.has(c)).sort();
        if (otherCats.length === 0) return null;
        return (
          <div className="ph-cat-group">
            <div className="ph-cat-group-label">Other</div>
            {otherCats.map(cat => {
              const { total, solved } = categories[cat];
              return (
                <CatButton
                  key={cat} cat={cat}
                  icon={CATEGORY_ICONS[cat] ?? <BookOpen size={15} />}
                  name={cat} solved={solved} total={total}
                />
              );
            })}
          </div>
        );
      })()}
    </aside>
  );
}

/* ─────────────── Main PracticeHub ─────────────── */
export default function PracticeHub() {
  const nexusUsername = useMemo(() => getOrCreateNexusId(), []);

  const [problems,      setProblems]      = useState([]);
  const [solvedSlugs,   setSolvedSlugs]   = useState(new Set());
  const [selectedCat,   setSelectedCat]   = useState(null);
  const [diffFilter,    setDiffFilter]    = useState('All');
  const [searchQ,       setSearchQ]       = useState('');
  const [isLoading,     setIsLoading]     = useState(true);
  const [toast,         setToast]         = useState(null);
  const [newlySolved,   setNewlySolved]   = useState(new Set());
  const prevCatSolvedRef  = useRef({});
  const [isPending, startTransition]      = useTransition();

  // ── Initial load ────────────────────────────────────────────────────── //
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Ensure user exists in DB
        await apiFetch('/user', {
          method: 'POST',
          body: JSON.stringify({ nexusUsername }),
        });

        const [probData, solvedData] = await Promise.all([
          apiFetch('/lc-problems'),
          apiFetch(`/solved/${encodeURIComponent(nexusUsername)}`),
        ]);

        if (!mounted) return;
        setProblems(probData.problems);
        setSolvedSlugs(new Set(solvedData.solvedSlugs));
      } catch (err) {
        console.error('[PracticeHub] load error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [nexusUsername]); // eslint-disable-line

  // ── Manual toggle ────────────────────────────────────────────────────── //
  const handleToggle = useCallback(async (slug, solved) => {
    try {
      const data = await apiFetch('/mark', {
        method: 'POST',
        body: JSON.stringify({ nexusUsername, slug, solved }),
      });
      setSolvedSlugs(new Set(data.solvedSlugs));
    } catch {
      setToast({ type: 'error', text: 'Could not update problem status.' });
    }
  }, [nexusUsername]);

  // ── Confetti on category completion ────────────────────────────────── //
  useEffect(() => {
    if (problems.length === 0) return;
    const catMap = {};
    problems.forEach(p => {
      if (!catMap[p.category]) catMap[p.category] = { solved: 0, total: 0 };
      catMap[p.category].total++;
      if (solvedSlugs.has(p.title_slug)) catMap[p.category].solved++;
    });
    Object.entries(catMap).forEach(([cat, { solved, total }]) => {
      const prev = prevCatSolvedRef.current[cat] ?? 0;
      if (solved === total && total > 0 && prev < total) {
        confetti({
          particleCount: 90,
          spread: 65,
          origin: { x: 0.13, y: 0.55 },
          colors: ['#8b5cf6', '#c4b5fd', '#4ade80', '#fbbf24', '#f9a8d4'],
          startVelocity: 38,
          scalar: 0.88,
          gravity: 0.85,
        });
      }
    });
    prevCatSolvedRef.current = Object.fromEntries(
      Object.entries(catMap).map(([k, v]) => [k, v.solved])
    );
  }, [solvedSlugs, problems]);

  // ── Derived stats ────────────────────────────────────────────────────── //
  const totalProblems = problems.length || 0;
  const totalSolved   = solvedSlugs.size;
  const progressPct   = Math.round((totalSolved / totalProblems) * 100);
  const easySolved    = useMemo(() => problems.filter(p => p.difficulty === 'Easy'   && solvedSlugs.has(p.title_slug)).length, [problems, solvedSlugs]);
  const mediumSolved  = useMemo(() => problems.filter(p => p.difficulty === 'Medium' && solvedSlugs.has(p.title_slug)).length, [problems, solvedSlugs]);
  const hardSolved    = useMemo(() => problems.filter(p => p.difficulty === 'Hard'   && solvedSlugs.has(p.title_slug)).length, [problems, solvedSlugs]);
  const easyTotal     = useMemo(() => problems.filter(p => p.difficulty === 'Easy').length,   [problems]);
  const mediumTotal   = useMemo(() => problems.filter(p => p.difficulty === 'Medium').length, [problems]);
  const hardTotal     = useMemo(() => problems.filter(p => p.difficulty === 'Hard').length,   [problems]);

  const catFilteredCount = useMemo(() => {
    if (!selectedCat) return problems.length;
    return problems.filter(p => p.category === selectedCat).length;
  }, [problems, selectedCat]);

  const catSolvedCount = useMemo(() => {
    if (!selectedCat) return totalSolved;
    return problems.filter(p => p.category === selectedCat && solvedSlugs.has(p.title_slug)).length;
  }, [problems, selectedCat, solvedSlugs, totalSolved]);

  // ── Render ───────────────────────────────────────────────────────────── //
  if (isLoading) return (
    <>
      <Navbar />
      <div className="ph-loading-screen">
        <Loader2 size={40} className="spin" />
        <p>Loading Practice Hub…</p>
      </div>
      <Footer />
    </>
  );

  return (
    <>
      <Navbar />

      <SyncToast msg={toast} onDismiss={() => setToast(null)} />

      <main className="ph-root">
        <div className="ph-mesh-bg" aria-hidden="true" />

        {/* ── Hero header ── */}
        <section className="ph-hero">
          <div className="ph-hero-inner">
            <div className="ph-hero-left">
              <motion.div
                className="ph-hero-badge"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, ease: 'easeOut' }}
              >
                <Trophy size={15} />
                {problems.length > 0 ? `${problems.length.toLocaleString()} Problems` : 'All LeetCode Problems'}
              </motion.div>
              <motion.h1
                className="ph-hero-title"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.06, ease: 'easeOut' }}
              >
                Practice Hub
              </motion.h1>
              <motion.p
                className="ph-hero-sub"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.44, delay: 0.12, ease: 'easeOut' }}
              >
                Track all LeetCode problems across every topic and difficulty.
                Solve a problem, mark it done here, and watch your progress grow.
              </motion.p>
              <motion.div
                className="ph-hero-tags"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
              >
                <span className="ph-htag ph-htag--str">{easyTotal.toLocaleString()} Easy</span>
                <span className="ph-htag ph-htag--db">{mediumTotal.toLocaleString()} Medium</span>
                <span className="ph-htag ph-htag--iv">{hardTotal.toLocaleString()} Hard</span>
                {problems.length > 0 && (
                  <span className="ph-htag ph-htag--dsa">{problems.length.toLocaleString()} Total</span>
                )}
              </motion.div>


            </div>

            {/* global progress card */}
            <SpotlightCard className="ph-progress-card">
              <div className="ph-global-count">
                <span className="ph-count-big"><NumberTicker value={totalSolved} /></span>
                <span className="ph-count-sep">/</span>
                <span className="ph-count-total">{totalProblems}</span>
              </div>
              <div className="ph-global-label">problems solved</div>

              {/* animated progress bar */}
              <div className="ph-global-bar-track">
                <motion.div
                  className="ph-global-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                />
                <span className="ph-global-pct">{progressPct}%</span>
              </div>

              {/* difficulty breakdown */}
              <div className="ph-diff-row">
                <div className="ph-diff-stat">
                  <span className="ph-diff-label diff-easy-text">Easy</span>
                  <span className="ph-diff-val"><NumberTicker value={easySolved} /><span>/{easyTotal}</span></span>
                </div>
                <div className="ph-diff-stat">
                  <span className="ph-diff-label diff-medium-text">Med</span>
                  <span className="ph-diff-val"><NumberTicker value={mediumSolved} /><span>/{mediumTotal}</span></span>
                </div>
                <div className="ph-diff-stat">
                  <span className="ph-diff-label diff-hard-text">Hard</span>
                  <span className="ph-diff-val"><NumberTicker value={hardSolved} /><span>/{hardTotal}</span></span>
                </div>
              </div>


            </SpotlightCard>
          </div>
        </section>

        {/* ── Split layout ── */}
        <div className="ph-split">

          {/* Sidebar */}
          <CategorySidebar
            problems={problems}
            solvedSlugs={solvedSlugs}
            selected={selectedCat}
            onSelect={cat => startTransition(() => setSelectedCat(cat))}
          />

          {/* Problem list pane */}
          <div className="ph-main-pane" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}>

            {/* pane header */}
            <div className="ph-pane-header">
              <div className="ph-pane-title-row">
                <h2 className="ph-pane-title">
                  {selectedCat ?? 'All Problems'}
                </h2>
                <span className="ph-pane-count">{catSolvedCount} / {catFilteredCount}</span>
                <MiniBar value={catSolvedCount} total={catFilteredCount} />
              </div>

              {/* search + difficulty filters */}
              <div className="ph-pane-controls">
                <div className="ph-search-wrap">
                  <Search size={15} className="ph-search-icon" />
                  <input
                    className="ph-search-input"
                    placeholder="Search problems…"
                    value={searchQ}
                    onChange={e => {
                      const v = e.target.value;
                      startTransition(() => setSearchQ(v));
                    }}
                  />
                  {searchQ && (
                    <button className="ph-search-clear" onClick={() => startTransition(() => setSearchQ(''))}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="ph-diff-filters">
                  {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                    <button
                      key={d}
                      className={`ph-diff-filter-btn${diffFilter === d ? ' active' : ''}${d !== 'All' ? ` df-${d.toLowerCase()}` : ''}`}
                      onClick={() => startTransition(() => setDiffFilter(d))}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* column headers */}
            <div className="ph-col-headers">
              <span />
              <span>#</span>
              <span />
              <span>Problem</span>
              <span>Difficulty</span>
            </div>

            {/* rows */}
            <ProblemList
              problems={problems}
              solvedSlugs={solvedSlugs}
              selectedCategory={selectedCat}
              diffFilter={diffFilter}
              searchQ={searchQ}
              onToggle={handleToggle}
              newlySolved={newlySolved}
            />
          </div>
        </div>

        {/* ── Footer stat bar ── */}
        <div className="ph-stat-bar">
          <div className="ph-stat-item">
            <TrendingUp size={16} />
            <span><strong>{progressPct}%</strong> complete</span>
          </div>
          <div className="ph-stat-item diff-easy-text">
            <span className="ph-diff-dot diff-easy" />
            <span>{easySolved} / {easyTotal} Easy</span>
          </div>
          <div className="ph-stat-item diff-medium-text">
            <span className="ph-diff-dot diff-medium" />
            <span>{mediumSolved} / {mediumTotal} Medium</span>
          </div>
          <div className="ph-stat-item diff-hard-text">
            <span className="ph-diff-dot diff-hard" />
            <span>{hardSolved} / {hardTotal} Hard</span>
          </div>
        </div>

      </main>

      <Footer />
    </>
  );
}
