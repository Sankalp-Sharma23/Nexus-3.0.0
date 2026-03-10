import { useState, useEffect, useCallback, useMemo, useRef, useTransition, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircle2, Circle, ExternalLink, Search,
  Hash, ArrowLeftRight, GalleryHorizontal, Layers, ScanSearch,
  Link2, GitFork, Network, BarChart3, RotateCcw,
  Workflow, MapPin, Activity, Grid3x3, Zap, Sliders,
  Compass, Binary, Trophy, Target,
  AlertCircle, X, Loader2, TrendingUp, Check,
  BookOpen, Database, MessageSquare, Table2,
  Type, RefreshCcw, Server, SortAsc, Play,
} from 'lucide-react';
import '../styles/PracticeHub.css';

/* ─────────────── constants ─────────────── */
const NEXUS_KEY = 'nexus_practice_username';
const API       = '/api/practice';
const LIMIT     = 50;   // problems per page

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

/* ─────────────── useDebounce ─────────────── */
function useDebounce(value, delay = 150) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

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
const ProblemRow = memo(function ProblemRow({ problem, isSolved, onToggle, isNew }) {
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
      <a
        className="ph-yt-btn"
        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(problem.title + ' leetcode solution')}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        title="Watch video solution"
      >
        <Play size={14} />
      </a>
    </div>
  );
});

/* ─────────────── ProblemList (virtualised + infinite scroll) ─────────────── */
const ProblemList = memo(function ProblemList({ problems, solvedSlugs, onToggle, newlySolved, hasMore, isLoadingMore, onLoadMore }) {
  const parentRef = useRef(null);
  // +1 count for the loading sentinel shown when hasMore
  const vCount = problems.length + (hasMore ? 1 : 0);

  const virtualizer = useVirtualizer({
    count:            vCount,
    getScrollElement: () => parentRef.current,
    estimateSize:     (i) => i === problems.length ? 56 : 48,
    overscan:         8,
  });

  const items    = virtualizer.getVirtualItems();
  const lastItem = items[items.length - 1];

  // When the sentinel (or near-last item) enters viewport → load next page
  useEffect(() => {
    if (!lastItem || !hasMore || isLoadingMore) return;
    if (lastItem.index >= problems.length - 1) onLoadMore();
  }, [lastItem?.index, hasMore, isLoadingMore, problems.length, onLoadMore]);

  if (!problems.length && !isLoadingMore) {
    return (
      <motion.div className="ph-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <BookOpen size={36} />
        <p>No problems match your filters.</p>
      </motion.div>
    );
  }

  return (
    <div ref={parentRef} className="ph-problem-list-scroller">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        <div
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%',
            transform: `translateY(${items[0]?.start ?? 0}px)`,
          }}
        >
          {items.map(vrow => {
            if (vrow.index === problems.length) {
              return (
                <div key="sentinel" data-index={vrow.index} ref={virtualizer.measureElement} className="ph-load-more-row">
                  <Loader2 size={18} className="spin" />
                </div>
              );
            }
            const p = problems[vrow.index];
            return (
              <div key={vrow.key} data-index={vrow.index} ref={virtualizer.measureElement}>
                <ProblemRow
                  problem={p}
                  isSolved={solvedSlugs.has(p.title_slug)}
                  onToggle={onToggle}
                  isNew={newlySolved?.has(p.title_slug)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

/* ─────────────── CatButton (module-level to avoid remount) ─────────────── */
const CatButton = memo(function CatButton({ cat, icon, name, solved, total, isAllBtn, selected, onSelect }) {
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
});

/* u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500} CategorySidebar u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500}u{2500} */
function CategorySidebar({ catStats, catSolvedMap, totalProblems, totalSolved, selected, onSelect }) {
  return (
    <aside className="ph-sidebar">
      <div className="ph-sidebar-header">
        <Target size={16} />
        <span>Categories</span>
      </div>

      <CatButton cat={null} icon={<BookOpen size={15} />} name="All Problems"
        solved={totalSolved} total={totalProblems} isAllBtn selected={selected} onSelect={onSelect} />

      {CATEGORY_GROUPS.map(({ label, categories: groupCats }) => {
        const visibleCats = groupCats.filter(c => catStats[c]);
        if (visibleCats.length === 0) return null;
        return (
          <div key={label} className="ph-cat-group">
            <div className="ph-cat-group-label">{label}</div>
            {visibleCats.map(cat => (
              <CatButton
                key={cat} cat={cat}
                icon={CATEGORY_ICONS[cat] ?? <BookOpen size={15} />}
                name={cat} solved={catSolvedMap[cat] ?? 0} total={catStats[cat]}
                selected={selected} onSelect={onSelect}
              />
            ))}
          </div>
        );
      })}

      {/* "Other" catch-all for any tags not covered by the groups above */}
      {(() => {
        const otherCats = Object.keys(catStats).filter(c => !GROUPED_CATS.has(c)).sort();
        if (otherCats.length === 0) return null;
        return (
          <div className="ph-cat-group">
            <div className="ph-cat-group-label">Other</div>
            {otherCats.map(cat => (
              <CatButton
                key={cat} cat={cat}
                icon={CATEGORY_ICONS[cat] ?? <BookOpen size={15} />}
                name={cat} solved={catSolvedMap[cat] ?? 0} total={catStats[cat]}
                selected={selected} onSelect={onSelect}
              />
            ))}
          </div>
        );
      })()}
    </aside>
  );
}

/* ─────────────── Main PracticeHub ─────────────── */
export default function PracticeHub() {
  const { user } = useAuth();

  // Prefer the authenticated user's stable ID; fall back to the anonymous localStorage key.
  // This means logged-in users keep progress across browsers/devices.
  const nexusUsername = useMemo(() => {
    if (user) return user._id || user.id || user.username || user.email || getOrCreateNexusId();
    return getOrCreateNexusId();
  }, [user]);

  const [problems,       setProblems]       = useState([]);
  const [probTotal,      setProbTotal]      = useState(0);   // total matching current filters
  const [probHasMore,    setProbHasMore]    = useState(false);
  const [isLoadingMore,  setIsLoadingMore]  = useState(false);
  const [catStats,       setCatStats]       = useState({});  // { category: total }
  const [diffStats,      setDiffStats]      = useState({});  // { Easy: N, Medium: N, Hard: N }
  const [catSolvedMap,   setCatSolvedMap]   = useState({});  // { category: solved }
  const [diffSolvedMap,  setDiffSolvedMap]  = useState({});  // { Easy: N, Medium: N, Hard: N }
  const [solvedSlugs,    setSolvedSlugs]    = useState(new Set());
  const [selectedCat,    setSelectedCat]    = useState(null);
  const [diffFilter,     setDiffFilter]     = useState('All');
  const [searchQ,        setSearchQ]        = useState('');
  const [isLoading,      setIsLoading]      = useState(true);
  const [toast,          setToast]          = useState(null);
  const [newlySolved,    setNewlySolved]    = useState(new Set());
  const prevCatSolvedRef   = useRef({});
  const initialLoadDoneRef = useRef(false);
  const currentPageRef     = useRef(1);          // stable page counter → no dep in handleLoadMore
  const filtersRef         = useRef({ cat: null, diff: 'All', q: '' }); // mirror of filter state for stable callbacks
  const [isPending, startTransition]        = useTransition();
  const debouncedSearch = useDebounce(searchQ, 350);

  // ── LeetCode sync state ─────────────────────────────────────────────── //
  const LC_KEY       = `nexus_lc_username_${nexusUsername}`;
  const LC_STATS_KEY = `nexus_lc_stats_${nexusUsername}`;
  const [syncOpen,      setSyncOpen]      = useState(false);
  const [syncTab,       setSyncTab]       = useState('quick'); // 'quick' | 'paste'
  const [lcUsername,    setLcUsername]    = useState(() => localStorage.getItem(LC_KEY) || '');
  const [pastedSlugs,   setPastedSlugs]   = useState('');
  const [scriptCopied,  setScriptCopied]  = useState(false);
  const [syncState,     setSyncState]     = useState('idle'); // idle | syncing | done | error
  const [lastSyncInfo,  setLastSyncInfo]  = useState(null);  // { newCount, total }
  const [lcAccountStats, setLcAccountStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LC_STATS_KEY) || 'null'); } catch { return null; }
  }); // { total, easy, medium, hard } straight from LeetCode
  const lcInputRef    = useRef(null);
  const pasteInputRef = useRef(null);

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

        const [catData, solvedData, probData] = await Promise.all([
          apiFetch('/lc-categories'),
          apiFetch(`/solved/${encodeURIComponent(nexusUsername)}`),
          apiFetch(`/lc-problems?page=1&limit=${LIMIT}`),
        ]);

        if (!mounted) return;
        setCatStats(catData.categories.reduce((acc, { category, total }) => ({ ...acc, [category]: total }), {}));
        setDiffStats(catData.byDifficulty ?? {});
        setCatSolvedMap(solvedData.solvedByCategory  ?? {});
        setDiffSolvedMap(solvedData.solvedByDifficulty ?? {});
        setSolvedSlugs(new Set(solvedData.solvedSlugs));
        setProblems(probData.problems);
        setProbTotal(probData.total);
        setProbHasMore(probData.hasMore);
        initialLoadDoneRef.current = true;

        // If we already have a linked LC username, refresh account stats in the background
        const lc = localStorage.getItem(LC_KEY);
        if (lc && mounted) {
          apiFetch(`/lc-account-stats/${encodeURIComponent(lc)}`).then(stats => {
            if (!mounted) return;
            setLcAccountStats(stats);
            localStorage.setItem(LC_STATS_KEY, JSON.stringify(stats));
          }).catch(() => {});
        }
      } catch (err) {
        console.error('[PracticeHub] load error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [nexusUsername]); // eslint-disable-line

  // ── Re-fetch on filter change ────────────────────────────────────────── //
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    // Keep the ref in sync so handleLoadMore always reads current filters
    filtersRef.current = { cat: selectedCat, diff: diffFilter, q: debouncedSearch };
    currentPageRef.current = 1;
    let mounted = true;
    setIsLoadingMore(true);
    (async () => {
      try {
        const params = new URLSearchParams({ page: 1, limit: LIMIT });
        if (selectedCat) params.set('category', selectedCat);
        if (diffFilter && diffFilter !== 'All') params.set('difficulty', diffFilter);
        if (debouncedSearch) params.set('q', debouncedSearch);
        const data = await apiFetch(`/lc-problems?${params}`);
        if (!mounted) return;
        setProblems(data.problems);
        setProbTotal(data.total);
        setProbHasMore(data.hasMore);
      } catch (err) {
        console.error('[PracticeHub] filter load error:', err);
      } finally {
        if (mounted) setIsLoadingMore(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedCat, diffFilter, debouncedSearch]); // eslint-disable-line

  // ── Load more (infinite scroll) ──────────────────────────────────────── //
  // Uses refs for filters/page so the function reference never changes → ProblemList stays memoized
  const handleLoadMore = useCallback(() => {
    if (!probHasMore || isLoadingMore) return;
    const nextPage = currentPageRef.current + 1;
    const { cat, diff, q } = filtersRef.current;
    setIsLoadingMore(true);
    (async () => {
      try {
        const params = new URLSearchParams({ page: nextPage, limit: LIMIT });
        if (cat) params.set('category', cat);
        if (diff && diff !== 'All') params.set('difficulty', diff);
        if (q) params.set('q', q);
        const data = await apiFetch(`/lc-problems?${params}`);
        setProblems(prev => [...prev, ...data.problems]);
        setProbHasMore(data.hasMore);
        currentPageRef.current = nextPage;
      } catch (err) {
        console.error('[PracticeHub] loadMore error:', err);
      } finally {
        setIsLoadingMore(false);
      }
    })();
  }, [probHasMore, isLoadingMore]); // ← stable: no problems.length/filter deps

  // ── Manual toggle ────────────────────────────────────────────────────── //
  const handleToggle = useCallback(async (slug, solved) => {
    // Optimistic update: instant UI response, no waiting for network
    setSolvedSlugs(prev => {
      const next = new Set(prev);
      if (solved) next.add(slug); else next.delete(slug);
      return next;
    });
    try {
      const data = await apiFetch('/mark', {
        method: 'POST',
        body: JSON.stringify({ nexusUsername, slug, solved }),
      });
      // Reconcile with server truth
      setSolvedSlugs(new Set(data.solvedSlugs));
      setCatSolvedMap(data.solvedByCategory   ?? {});
      setDiffSolvedMap(data.solvedByDifficulty ?? {});
    } catch {
      // Revert optimistic update
      setSolvedSlugs(prev => {
        const next = new Set(prev);
        if (solved) next.delete(slug); else next.add(slug);
        return next;
      });
      setToast({ type: 'error', text: 'Could not update problem status.' });
    }
  }, [nexusUsername]);

  // ── LeetCode sync ─────────────────────────────────────────────────── //
  const handleSync = useCallback(async () => {
    const lc = lcUsername.trim();
    if (!lc) { lcInputRef.current?.focus(); return; }
    localStorage.setItem(LC_KEY, lc);
    setSyncState('syncing');
    try {
      const data = await apiFetch('/sync', {
        method: 'POST',
        body: JSON.stringify({ nexusUsername, leetcodeUsername: lc }),
      });

      // Re-fetch the authoritative solved list from the server after sync,
      // so the UI always reflects exactly what is in the DB regardless of
      // what the sync response itself returned.
      const freshSolved = await apiFetch(`/solved/${encodeURIComponent(nexusUsername)}`);
      const freshSet = new Set(freshSolved.solvedSlugs);
      setSolvedSlugs(freshSet);
      setCatSolvedMap(freshSolved.solvedByCategory  ?? {});
      setDiffSolvedMap(freshSolved.solvedByDifficulty ?? {});

      const totalInNexus = freshSet.size;
      setLastSyncInfo({ newCount: data.newThisSync, total: totalInNexus });

      if (data.lcAccountStats) {
        setLcAccountStats(data.lcAccountStats);
        localStorage.setItem(LC_STATS_KEY, JSON.stringify(data.lcAccountStats));
      }
      setSyncState('done');
      setSyncOpen(false);
      const lc_total = data.lcAccountStats?.total;
      setToast({
        type: 'success',
        text: lc_total
          ? `LeetCode account: ${lc_total} solved · ${totalInNexus} tracked in Nexus`
          : data.newThisSync > 0
            ? `Imported ${data.newThisSync} new problems! (${totalInNexus} total tracked in Nexus)`
            : `Already up to date — ${totalInNexus} problems tracked.`,
      });
      setTimeout(() => setSyncState('idle'), 3000);
    } catch {
      setSyncState('error');
      setToast({ type: 'error', text: 'Sync failed. Check your LeetCode username and try again.' });
      setTimeout(() => setSyncState('idle'), 3000);
    }
  }, [lcUsername, nexusUsername, LC_KEY, LC_STATS_KEY]);

  // ── Paste import (from browser console script) ─────────────────────── //
  const CONSOLE_SCRIPT = `(async()=>{try{const r=await fetch('/api/problems/all/',{headers:{'x-requested-with':'XMLHttpRequest'}});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();const s=d.stat_status_pairs.filter(p=>p.status==='ac').map(p=>p.stat.question__title_slug);const j=JSON.stringify(s);try{await navigator.clipboard.writeText(j);console.log(s.length+' solved slugs copied to clipboard!');}catch(e){console.log('COPY EVERYTHING BETWEEN THE STARS');console.log('***'+j+'***');};}catch(e){console.error('Error:',e.message);}})();`;

  const handlePasteSync = useCallback(async () => {
    const raw = pastedSlugs.trim();
    if (!raw) { pasteInputRef.current?.focus(); return; }
    let slugs;
    try { slugs = JSON.parse(raw); } catch { setToast({ type: 'error', text: 'Invalid format — paste the JSON array from the console script.' }); return; }
    if (!Array.isArray(slugs) || slugs.length === 0) { setToast({ type: 'error', text: 'No slugs found in pasted data.' }); return; }
    setSyncState('syncing');
    try {
      await apiFetch('/paste-sync', {
        method: 'POST',
        body: JSON.stringify({ nexusUsername, slugs }),
      });
      const freshSolved = await apiFetch(`/solved/${encodeURIComponent(nexusUsername)}`);
      const freshSet = new Set(freshSolved.solvedSlugs);
      setSolvedSlugs(freshSet);
      setCatSolvedMap(freshSolved.solvedByCategory  ?? {});
      setDiffSolvedMap(freshSolved.solvedByDifficulty ?? {});
      const totalInNexus = freshSet.size;
      setLastSyncInfo({ newCount: slugs.length, total: totalInNexus });
      setSyncState('done');
      setSyncOpen(false);
      setPastedSlugs('');
      setToast({ type: 'success', text: `Imported ${slugs.length} problems! ${totalInNexus} total tracked in Nexus.` });
      setTimeout(() => setSyncState('idle'), 3000);
    } catch (err) {
      setSyncState('error');
      setToast({ type: 'error', text: err.message || 'Paste import failed.' });
      setTimeout(() => setSyncState('idle'), 3000);
    }
  }, [pastedSlugs, nexusUsername]);

  // ── Confetti on category completion ────────────────────────────────── //
  useEffect(() => {
    if (!Object.keys(catStats).length) return;
    Object.entries(catStats).forEach(([cat, total]) => {
      const solved = catSolvedMap[cat] ?? 0;
      const prev   = prevCatSolvedRef.current[cat] ?? 0;
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
    prevCatSolvedRef.current = { ...catSolvedMap };
  }, [catSolvedMap, catStats]);

  // ── Derived stats ────────────────────────────────────────────────────── //
  const totalProblems  = probTotal || 0;
  const totalSolved    = solvedSlugs.size;
  const progressPct    = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;
  const easySolved     = diffSolvedMap.Easy   ?? 0;
  const mediumSolved   = diffSolvedMap.Medium ?? 0;
  const hardSolved     = diffSolvedMap.Hard   ?? 0;
  const easyTotal      = diffStats.Easy   ?? 0;
  const mediumTotal    = diffStats.Medium ?? 0;
  const hardTotal      = diffStats.Hard   ?? 0;
  const catFilteredCount = selectedCat ? (catStats[selectedCat] ?? 0) : totalProblems;
  const catSolvedCount   = selectedCat ? (catSolvedMap[selectedCat] ?? 0) : totalSolved;

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
              <div className="ph-progress-user">
                <span className="ph-progress-user-label">Tracking progress for</span>
                <span className="ph-progress-user-id">
                  {user?.name || user?.username || user?.email?.split('@')[0] || 'Guest'}
                </span>
              </div>
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

              {/* LeetCode account stats — shown when synced */}
              {lcAccountStats && lcUsername && (
                <div className="ph-lc-account-stats">
                  <span className="ph-lc-account-label">LeetCode account</span>
                  <div className="ph-lc-account-nums">
                    <span className="ph-lc-total">{lcAccountStats.total}</span>
                    <span className="ph-lc-sep">·</span>
                    <span className="ph-lc-easy diff-easy-text">{lcAccountStats.easy}E</span>
                    <span className="ph-lc-sep">·</span>
                    <span className="ph-lc-medium diff-medium-text">{lcAccountStats.medium}M</span>
                    <span className="ph-lc-sep">·</span>
                    <span className="ph-lc-hard diff-hard-text">{lcAccountStats.hard}H</span>
                  </div>
                </div>
              )}

              {/* ── LeetCode sync ── */}
              <div className="ph-sync-area">
                {!syncOpen ? (
                  <button
                    className={`ph-sync-btn${!lcUsername ? ' needs-lc' : ''}`}
                    onClick={() => { setSyncOpen(true); setSyncTab('quick'); setTimeout(() => lcInputRef.current?.focus(), 60); }}
                  >
                    {syncState === 'syncing' ? (
                      <Loader2 size={15} className="spin" />
                    ) : syncState === 'done' ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <RefreshCcw size={15} />
                    )}
                    {lcUsername ? 'Sync from LeetCode' : 'Import LeetCode Progress'}
                  </button>
                ) : (
                  <div className="ph-sync-form">
                    {/* Tabs */}
                    <div className="ph-sync-tabs">
                      <button
                        className={`ph-sync-tab${syncTab === 'quick' ? ' active' : ''}`}
                        onClick={() => { setSyncTab('quick'); setTimeout(() => lcInputRef.current?.focus(), 60); }}
                      >Quick Sync</button>
                      <button
                        className={`ph-sync-tab${syncTab === 'paste' ? ' active' : ''}`}
                        onClick={() => { setSyncTab('paste'); }}
                      >Full Import ✦</button>
                    </div>

                    {syncTab === 'quick' ? (
                      <>
                        <div className="ph-sync-form-label"><RefreshCcw size={12} /> LeetCode username</div>
                        <div className="ph-sync-input-row">
                          <input
                            ref={lcInputRef}
                            className="ph-sync-input"
                            placeholder="e.g. lee215"
                            value={lcUsername}
                            onChange={e => setLcUsername(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSync()}
                            disabled={syncState === 'syncing'}
                            spellCheck={false}
                            autoCapitalize="none"
                          />
                          <button className="ph-sync-go-btn" onClick={handleSync} disabled={!lcUsername.trim() || syncState === 'syncing'}>
                            {syncState === 'syncing' ? <Loader2 size={14} className="spin" /> : <RefreshCcw size={14} />}
                          </button>
                        </div>
                        <p className="ph-sync-hint">Imports your ~20 most recent solved problems. No login needed.</p>
                      </>
                    ) : (
                      <>
                        {/* Step 1: copy the script */}
                        <div className="ph-sync-form-label">Step 1 — Run this in your browser console on leetcode.com</div>
                        <div className="ph-script-box">
                          <code className="ph-script-code">{CONSOLE_SCRIPT}</code>
                          <button
                            className={`ph-script-copy${scriptCopied ? ' copied' : ''}`}
                            onClick={() => {
                              navigator.clipboard.writeText(CONSOLE_SCRIPT);
                              setScriptCopied(true);
                              setTimeout(() => setScriptCopied(false), 2000);
                            }}
                          >{scriptCopied ? '✓ Copied' : 'Copy'}</button>
                        </div>
                        <p className="ph-sync-hint">Go to <strong>leetcode.com</strong> → press <code>F12</code> → <strong>Console</strong> tab → paste &amp; press Enter. It will copy a JSON array to your clipboard.</p>

                        {/* Step 2: paste result */}
                        <div className="ph-sync-form-label" style={{marginTop:'0.35rem'}}>Step 2 — Paste the result here</div>
                        <div className="ph-sync-input-row">
                          <textarea
                            ref={pasteInputRef}
                            className="ph-sync-input ph-sync-textarea"
                            placeholder='["two-sum","add-two-numbers",...]'
                            value={pastedSlugs}
                            onChange={e => setPastedSlugs(e.target.value)}
                            disabled={syncState === 'syncing'}
                            spellCheck={false}
                            rows={2}
                          />
                          <button className="ph-sync-go-btn" style={{alignSelf:'flex-end'}} onClick={handlePasteSync} disabled={!pastedSlugs.trim() || syncState === 'syncing'}>
                            {syncState === 'syncing' ? <Loader2 size={14} className="spin" /> : <RefreshCcw size={14} />}
                          </button>
                        </div>
                      </>
                    )}
                    <button className="ph-sync-cancel" onClick={() => { setSyncOpen(false); setPastedSlugs(''); }}>
                      Cancel
                    </button>
                  </div>
                )}
                {lastSyncInfo && !syncOpen && (
                  <p className="ph-last-synced">
                    Last sync: {lastSyncInfo.total} tracked in Nexus
                  </p>
                )}
              </div>

            </SpotlightCard>
          </div>
        </section>

        {/* ── Split layout ── */}
        <div className="ph-split">

          {/* Sidebar */}
          <CategorySidebar
            catStats={catStats}
            catSolvedMap={catSolvedMap}
            totalProblems={totalProblems}
            totalSolved={totalSolved}
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
              onToggle={handleToggle}
              newlySolved={newlySolved}
              hasMore={probHasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
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
