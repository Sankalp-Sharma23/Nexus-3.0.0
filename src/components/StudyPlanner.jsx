import { useState, useEffect, useRef } from 'react';
import {
  Calendar, Clock, BookOpen, Brain, Target, TrendingUp, Play, Pause,
  RotateCcw, Users, Zap, CheckCircle2, Circle, Eye, AlertTriangle,
  Plus, ChevronRight, ChevronLeft, Flame, BarChart2, Layers,
  Upload, Sparkles, ArrowRight, X, SkipForward, AlarmClock,
  SlidersHorizontal, Activity, Coffee, Bookmark, RefreshCcw,
  ListTodo, Trophy, Star, MessageSquare, ArrowLeft
} from 'lucide-react';
import { usePomodoro } from '../contexts/PomodoroContext';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/StudyPlanner.css';


/* ─── Static data ───────────────────────────────────────────────────────── */

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMELINE_START = 8;   // 8 AM
const TIMELINE_END   = 23;  // 11 PM
const PX_PER_HOUR    = 56;  // pixels per hour in timeline

const BLOCK_META = {
  academic:         { color: '#3b82f6', label: 'University',     dot: '🔵' },
  'self-learning':  { color: '#8b5cf6', label: 'Self-Learning',  dot: '🟣' },
  interview:        { color: '#10b981', label: 'Interview Prep', dot: '🟢' },
  event:            { color: '#f97316', label: 'Events/Builds',  dot: '🟠' },
};

const DEFAULT_BLOCKS = [
  { id:1,  day:0, startHour:9,    duration:1.5, title:'DBMS – Normalization',         type:'academic',        intensity:'high',   category:'University' },
  { id:2,  day:0, startHour:14,   duration:1,   title:'LeetCode – Arrays',            type:'interview',       intensity:'medium', category:'Interview Prep' },
  { id:3,  day:0, startHour:20,   duration:1.5, title:'AWS Cloud Foundations',        type:'self-learning',   intensity:'medium', category:'Self-Learning' },
  { id:4,  day:1, startHour:10,   duration:2,   title:'OS – Process Scheduling',       type:'academic',        intensity:'high',   category:'University' },
  { id:5,  day:1, startHour:15,   duration:1,   title:'System Design Concepts',       type:'interview',       intensity:'high',   category:'Interview Prep' },
  { id:6,  day:1, startHour:20,   duration:2,   title:'Neural Network Module',        type:'self-learning',   intensity:'high',   category:'Self-Learning' },  // AI/ML Tuesday
  { id:7,  day:2, startHour:9,    duration:3,   title:'RH124 – Linux Lab',            type:'self-learning',   intensity:'high',   category:'Self-Learning' },
  { id:8,  day:2, startHour:14,   duration:1,   title:'LeetCode – Graphs',            type:'interview',       intensity:'high',   category:'Interview Prep' },
  { id:9,  day:3, startHour:11,   duration:1.5, title:'CN – Transport Layer',         type:'academic',        intensity:'medium', category:'University' },
  { id:10, day:3, startHour:16,   duration:2,   title:'Nexus – Dashboard Build',      type:'event',           intensity:'medium', category:'Events/Builds' },
  { id:11, day:4, startHour:10,   duration:2,   title:'Algorithm Design – Revision',  type:'academic',        intensity:'high',   category:'University' },
  { id:12, day:4, startHour:19,   duration:1.5, title:'Mock Interview Practice',      type:'interview',       intensity:'high',   category:'Interview Prep' },
  { id:13, day:5, startHour:11,   duration:3,   title:'AWS SAA Practice Tests',       type:'self-learning',   intensity:'high',   category:'Self-Learning' },
  { id:14, day:6, startHour:14,   duration:4,   title:'Hackathon – Nexus Sprint',     type:'event',           intensity:'high',   category:'Events/Builds' },
];

const URGENT_TASKS = [
  { id:1, title:'CN Assignment – Transport Layer', deadline:'Today 11:59 PM', subject:'Computer Networks' },
  { id:2, title:'DBMS Lab Report Submission',      deadline:'Tomorrow 9 AM',  subject:'DBMS' },
];

const AI_SUGGESTIONS = [
  { id:1, text:'You usually study AI/ML on Tuesday nights. Block 8–10 PM for your Neural Network module?', icon:<Brain size={14}/> },
  { id:2, text:'3 missed LeetCode "Graph" problems detected. Drop a 30-min Graph Review into tomorrow?', icon:<Activity size={14}/> },
  { id:3, text:'You applied for an AWS Cloud role. Auto-schedule "AWS Mock Assessments" 3 days before the interview?', icon:<Zap size={14}/> },
];

const BACKLOG_ITEMS = [
  { id:1, title:'Fix navbar CSS',         priority:'low' },
  { id:2, title:'Read RH134 Chapter 2',   priority:'medium' },
  { id:3, title:'GraphQL schema cleanup', priority:'medium' },
  { id:4, title:'Write OS chapter notes', priority:'high' },
  { id:5, title:'Complete AWS lab 4',     priority:'high' },
];

const SAVED_GOALS = [
  { id:1, name:'Complete RH124 Linux', deadline:'Apr 30', progress:42, chaptersTotal:15, chaptersLeft:9, color:'#10b981' },
  { id:2, name:'AWS SAA Certification', deadline:'Jun 15', progress:28, chaptersTotal:12, chaptersLeft:9, color:'#f59e0b' },
];

// Energy heatmap: 7 rows (days) × 24 cols (hours), simulated productivity
function buildHeatmap() {
  const days = 7, hours = 24;
  return Array.from({ length: days }, (_, d) =>
    Array.from({ length: hours }, (_, h) => {
      // Simulate night-owl pattern: everyone in this persona is most active 10pm–2am
      const base = h >= 22 || h <= 2 ? 0.85 : h >= 9 && h <= 12 ? 0.65 : h >= 14 && h <= 17 ? 0.5 : 0.15;
      const jitter = (Math.sin(d * 7.3 + h * 2.1) + 1) / 2 * 0.25;
      return Math.min(1, base + jitter);
    })
  );
}
const HEATMAP_DATA = buildHeatmap();

const STUDY_TOPICS = ['Web Dev', 'DSA', 'Linux', 'AWS', 'University'];
const STUDY_HOURS  = [8, 12, 5, 7, 10];   // hours studied
const STUDY_SCORES = [72, 85, 55, 61, 78]; // practice scores

/* ─── Main Component ──────────────────────────────────────────────────────── */

const StudyPlanner = () => {
  const [activePage, setActivePage]       = useState('command');
  const [crunchMode, setCrunchMode]       = useState(false);
  const [blocks, setBlocks]               = useState(DEFAULT_BLOCKS);
  const [suggestions, setSuggestions]     = useState(AI_SUGGESTIONS);
  const [backlog]                         = useState(BACKLOG_ITEMS);
  const [savedGoals]                      = useState(SAVED_GOALS);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [burnoutDay, setBurnoutDay]       = useState(null);

  // Goals wizard
  const [wizardStep, setWizardStep]   = useState(1);
  const [goalForm, setGoalForm]       = useState({ name:'', deadline:'', content:'', chapters:0 });
  const [roadmapLines, setRoadmapLines] = useState([]);

  // Focus workspace
  const { mode, isRunning, secondsLeft, startWork, pause, resume, reset, totalStudySeconds } = usePomodoro();
  const [flowExtensions, setFlowExtensions] = useState(0);
  const [showPostpone, setShowPostpone]     = useState(false);

  /* Crunch mode body class */
  useEffect(() => {
    document.body.classList.toggle('crunch-mode', crunchMode);
    return () => document.body.classList.remove('crunch-mode');
  }, [crunchMode]);

  /* Burnout detection – flag any day with ≥8 h high-intensity */
  useEffect(() => {
    for (let d = 0; d < 7; d++) {
      const hours = blocks.filter(b => b.day === d && b.intensity === 'high').reduce((s, b) => s + b.duration, 0);
      if (hours >= 8) { setBurnoutDay(d); return; }
    }
    setBurnoutDay(null);
  }, [blocks]);

  /* When crunch mode activates, remove non-critical (non-high-intensity) blocks */
  const applycrunchToggle = () => {
    if (!crunchMode) {
      setBlocks(prev => prev.filter(b => b.intensity === 'high'));
    } else {
      setBlocks(DEFAULT_BLOCKS);
    }
    setCrunchMode(prev => !prev);
  };

  /* Accept an AI suggestion as a block */
  const acceptSuggestion = (id) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  /* Enter focus mode with a block */
  const enterFocus = (block) => {
    setSelectedBlock(block);
    setActivePage('focus');
    reset();
    startWork();
  };

  /* Wizard step advance with basic roadmap generation */
  const advanceWizard = () => {
    if (wizardStep === 3) {
      // Parse chapters from pasted content
      const lines = goalForm.content.split('\n').filter(l => l.trim());
      const chapterCount = lines.filter(l => /chapter|module|unit|section|\d+\./i.test(l)).length || Math.max(5, Math.floor(lines.length / 2)) || 8;
      const deadlineDate = goalForm.deadline ? new Date(goalForm.deadline) : new Date(Date.now() + 30 * 86400000);
      const deadlineDays = Math.max(7, Math.ceil((deadlineDate - new Date()) / 86400000));
      const weeksLeft = Math.max(1, Math.ceil(deadlineDays / 7));
      const chapPerWeek = Math.ceil(chapterCount / weeksLeft);
      setGoalForm(f => ({ ...f, chapters: chapterCount }));
      setRoadmapLines(Array.from({ length: Math.min(weeksLeft, 8) }, (_, i) => ({
        week: i + 1,
        start: i * chapPerWeek + 1,
        end: Math.min((i + 1) * chapPerWeek, chapterCount),
      })));
    }
    setWizardStep(s => s + 1);
  };

  /* Circular timer math */
  const TIMER_DURATION = mode === 'work' ? 45 * 60 + flowExtensions * 15 * 60 : 5 * 60;
  const R   = 88;
  const CIRC = 2 * Math.PI * R;
  const fraction = secondsLeft / (mode === 'work' ? 25 * 60 : 5 * 60); // uses PomodoroContext's baseline
  const dashOffset = CIRC * (1 - Math.min(1, fraction));

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  /* ─── SUB-PAGES ──────────────────────────────────────────────────────── */

  /* ── Page 1: Command Center ─────────────────────────────────────────── */
  const CommandCenter = () => (
    <div className={`sp-command ${crunchMode ? 'sp-crunch-active' : ''}`}>
      {/* Burnout warning */}
      {burnoutDay !== null && !crunchMode && (
        <div className="sp-burnout-banner">
          <AlertTriangle size={16} />
          <span>Burnout risk on <strong>{WEEK_DAYS[burnoutDay]}</strong> — {'>'}8 hrs of heavy cognitive load scheduled. Consider moving non-urgent tasks to the weekend.</span>
          <button onClick={() => setBurnoutDay(null)}><X size={14}/></button>
        </div>
      )}

      <div className="sp-command-layout">
        {/* ── LEFT: Smart Inbox ── */}
        <aside className="sp-inbox">
          <div className="sp-inbox-section">
            <h4 className="sp-inbox-heading sp-inbox-urgent">
              <AlertTriangle size={14}/> Urgent &amp; Overdue
            </h4>
            {URGENT_TASKS.map(t => (
              <div key={t.id} className="sp-inbox-item sp-item-urgent">
                <span className="sp-item-title">{t.title}</span>
                <span className="sp-item-meta">{t.deadline}</span>
              </div>
            ))}
          </div>

          <div className="sp-inbox-section">
            <h4 className="sp-inbox-heading sp-inbox-ai">
              <Sparkles size={14}/> AI Suggestions
            </h4>
            {suggestions.map(s => (
              <div key={s.id} className="sp-inbox-item sp-item-ai">
                <div className="sp-item-ai-icon">{s.icon}</div>
                <p className="sp-item-title">{s.text}</p>
                <div className="sp-item-actions">
                  <button className="sp-btn-accept" onClick={() => acceptSuggestion(s.id)}>Accept</button>
                  <button className="sp-btn-dismiss" onClick={() => acceptSuggestion(s.id)}>Dismiss</button>
                </div>
              </div>
            ))}
            {suggestions.length === 0 && <p className="sp-inbox-empty">All caught up ✓</p>}
          </div>

          <div className="sp-inbox-section">
            <h4 className="sp-inbox-heading sp-inbox-backlog">
              <ListTodo size={14}/> Backlog
            </h4>
            {backlog.map(item => (
              <div key={item.id} className="sp-inbox-item sp-item-backlog">
                <span className="sp-backlog-priority" data-priority={item.priority}></span>
                <span className="sp-item-title">{item.title}</span>
              </div>
            ))}
          </div>

          {/* Saved Goals progress */}
          <div className="sp-inbox-section">
            <h4 className="sp-inbox-heading" style={{color:'#f59e0b'}}>
              <Target size={14}/> Active Goals
            </h4>
            {savedGoals.map(g => (
              <div key={g.id} className="sp-goal-card">
                <div className="sp-goal-top">
                  <span>{g.name}</span>
                  <span className="sp-goal-dead">{g.deadline}</span>
                </div>
                <div className="sp-goal-bar-track">
                  <div className="sp-goal-bar-fill" style={{width:`${g.progress}%`, background:g.color}}/>
                </div>
                <span className="sp-goal-pct">{g.progress}% — {g.chaptersLeft} chapters left</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── MAIN: Weekly Timeline ── */}
        <main className="sp-timeline-wrap">
          {/* Legend */}
          <div className="sp-timeline-legend">
            {Object.entries(BLOCK_META).map(([k, v]) => (
              <span key={k} className="sp-legend-item">
                <span className="sp-legend-dot" style={{background:v.color}}/>
                {v.label}
              </span>
            ))}
            <span className="sp-legend-sep"/>
            <button className="sp-add-block-btn" onClick={() => setActivePage('goals')}>
              <Plus size={14}/> Add Goal
            </button>
          </div>

          {/* Timeline grid */}
          <div className="sp-timeline-scroll">
            <div className="sp-timeline-grid">
              {/* Hour labels column */}
              <div className="sp-hour-labels">
                <div className="sp-day-header sp-hour-blank"/>
                {Array.from({ length: TIMELINE_END - TIMELINE_START }, (_, i) => (
                  <div key={i} className="sp-hour-label" style={{height: PX_PER_HOUR}}>
                    {((TIMELINE_START + i) % 12 || 12)}{TIMELINE_START + i < 12 ? 'am' : 'pm'}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {WEEK_DAYS.map((day, dayIdx) => {
                const today = (new Date().getDay() + 6) % 7;
                const isToday = dayIdx === today;
                const dayBlocks = crunchMode
                  ? blocks.filter(b => b.day === dayIdx && b.intensity === 'high')
                  : blocks.filter(b => b.day === dayIdx);

                return (
                  <div key={day} className={`sp-day-col ${isToday ? 'sp-today' : ''}`}>
                    <div className="sp-day-header">
                      <span className="sp-day-name">{day}</span>
                      {isToday && <span className="sp-today-badge">Today</span>}
                    </div>
                    <div className="sp-day-body" style={{height: (TIMELINE_END - TIMELINE_START) * PX_PER_HOUR}}>
                      {/* Hour grid lines */}
                      {Array.from({ length: TIMELINE_END - TIMELINE_START }, (_, i) => (
                        <div key={i} className="sp-grid-line" style={{top: i * PX_PER_HOUR}}/>
                      ))}
                      {/* Blocks */}
                      {dayBlocks.map(block => {
                        const top = (block.startHour - TIMELINE_START) * PX_PER_HOUR;
                        const height = block.duration * PX_PER_HOUR - 4;
                        const meta = BLOCK_META[block.type];
                        return (
                          <div
                            key={block.id}
                            className="sp-block"
                            style={{ top, height, borderColor: meta.color, background: `${meta.color}18` }}
                            onClick={() => enterFocus(block)}
                          >
                            <div className="sp-block-accent" style={{background: meta.color}}/>
                            <span className="sp-block-title">{block.title}</span>
                            <span className="sp-block-dur">{block.duration >= 1 ? `${block.duration}h` : `${block.duration * 60}m`}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {crunchMode && (
            <div className="sp-crunch-notice">
              <Flame size={14}/> Crunch Mode active — only high-priority blocks shown. Non-essential tasks pushed to next week.
            </div>
          )}
        </main>
      </div>
    </div>
  );

  /* ── Page 2: Goal & Syllabus Engine ─────────────────────────────────── */
  const GoalsEngine = () => (
    <div className="sp-goals-page">
      <div className="sp-goals-split">
        {/* Wizard */}
        <div className="sp-wizard-pane">
          <div className="sp-wizard-header">
            <h2>New Goal Wizard</h2>
            <div className="sp-wizard-steps">
              {[1,2,3,4].map(n => (
                <div key={n} className={`sp-step-dot ${wizardStep >= n ? 'sp-step-done' : ''} ${wizardStep === n ? 'sp-step-active' : ''}`}>
                  {wizardStep > n ? <CheckCircle2 size={14}/> : n}
                </div>
              ))}
            </div>
          </div>

          {wizardStep === 1 && (
            <div className="sp-wizard-body">
              <label className="sp-wiz-label">
                <Target size={16}/> What is your goal?
              </label>
              <input
                className="sp-wiz-input"
                placeholder='e.g. "Complete Red Hat Linux RH124"'
                value={goalForm.name}
                onChange={e => setGoalForm(f => ({...f, name: e.target.value}))}
              />
              <p className="sp-wiz-hint">Be specific. The more context, the better Nexus can schedule it.</p>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="sp-wizard-body">
              <label className="sp-wiz-label">
                <Calendar size={16}/> When is your deadline?
              </label>
              <input
                type="date"
                className="sp-wiz-input"
                value={goalForm.deadline}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setGoalForm(f => ({...f, deadline: e.target.value}))}
              />
              <p className="sp-wiz-hint">Nexus will back-calculate a weekly schedule from this date.</p>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="sp-wizard-body">
              <label className="sp-wiz-label">
                <BookOpen size={16}/> Paste your syllabus or table of contents
              </label>
              <textarea
                className="sp-wiz-textarea"
                rows={8}
                placeholder={'Chapter 1: Introduction to Linux\nChapter 2: File System Hierarchy\nModule 3: User Management\n...'}
                value={goalForm.content}
                onChange={e => setGoalForm(f => ({...f, content: e.target.value}))}
              />
              <div className="sp-wiz-upload-hint">
                <Upload size={14}/> PDF upload or YouTube playlist link coming soon
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="sp-wizard-body">
              <div className="sp-roadmap-header">
                <Sparkles size={18}/>
                <div>
                  <strong>Roadmap Generated</strong>
                  <p>Found {goalForm.chapters} chapters. Here's your schedule to hit <em>{goalForm.deadline || 'deadline'}</em>:</p>
                </div>
              </div>
              <div className="sp-roadmap-list">
                {roadmapLines.map(r => (
                  <div key={r.week} className="sp-roadmap-row">
                    <span className="sp-roadmap-week">Week {r.week}</span>
                    <span>Chapters {r.start}–{r.end}</span>
                    <span className="sp-roadmap-slots">Tue + Thu 45-min blocks</span>
                  </div>
                ))}
                {roadmapLines.length === 0 && <p className="sp-inbox-empty">No content pasted — add a syllabus in Step 3.</p>}
              </div>
              <div className="sp-wiz-actions">
                <button className="sp-btn-approve">
                  <CheckCircle2 size={16}/> Approve &amp; Schedule
                </button>
              </div>
            </div>
          )}

          <div className="sp-wiz-nav">
            {wizardStep > 1 && (
              <button className="sp-wiz-back" onClick={() => setWizardStep(s => s - 1)}>
                <ChevronLeft size={16}/> Back
              </button>
            )}
            {wizardStep < 4 && (
              <button
                className="sp-wiz-next"
                onClick={advanceWizard}
                disabled={wizardStep === 1 && !goalForm.name}
              >
                Next <ChevronRight size={16}/>
              </button>
            )}
          </div>
        </div>

        {/* Saved goals */}
        <div className="sp-goals-list-pane">
          <h3 className="sp-goals-list-title">
            <Trophy size={16}/> Active Goals
          </h3>
          {savedGoals.map(g => (
            <div key={g.id} className="sp-saved-goal">
              <div className="sp-saved-goal-top">
                <span style={{color: g.color, fontWeight:600}}>{g.name}</span>
                <span className="sp-saved-dead">📅 {g.deadline}</span>
              </div>
              <div className="sp-goal-bar-track" style={{marginTop:8}}>
                <div className="sp-goal-bar-fill" style={{width:`${g.progress}%`, background:g.color}}/>
              </div>
              <div className="sp-saved-meta">
                <span>{g.progress}% complete</span>
                <span>{g.chaptersLeft} chapters remaining</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Page 3: Deep Focus Workspace ───────────────────────────────────── */
  const FocusWorkspace = () => {
    const resources = selectedBlock?.type === 'interview'
      ? [
          { label:'NeetCode – Graphs', url:'https://neetcode.io/roadmap' },
          { label:'Practice Hub (Nexus)', url:'/practice' },
          { label:'Recent Mistakes', url:'/practice' },
        ]
      : selectedBlock?.type === 'self-learning'
      ? [
          { label:'AWS Skill Builder', url:'https://skillbuilder.aws' },
          { label:'RH124 Labs Portal', url:'https://rol.redhat.com' },
        ]
      : [
          { label:'Class Notes (Drive)', url:'#' },
          { label:'Practice Problems', url:'/practice' },
        ];

    return (
      <div className="sp-focus-workspace">
        {showPostpone && (
          <div className="sp-postpone-overlay">
            <div className="sp-postpone-modal">
              <h3>Life happens. What do you want to do?</h3>
              <p>"{selectedBlock?.title}"</p>
              <div className="sp-postpone-actions">
                <button className="sp-postpone-opt" onClick={() => { setShowPostpone(false); pause(); }}>
                  <Clock size={16}/> Push to tonight
                </button>
                <button className="sp-postpone-opt" onClick={() => { setShowPostpone(false); setActivePage('command'); reset(); }}>
                  <Calendar size={16}/> Redistribute across tomorrow
                </button>
                <button className="sp-postpone-cancel" onClick={() => setShowPostpone(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="sp-focus-topbar">
          <button className="sp-focus-exit" onClick={() => { setActivePage('command'); reset(); }}>
            <ArrowLeft size={18}/> Exit Focus
          </button>
          <div className="sp-focus-task">
            <span className="sp-focus-task-label">Now Studying</span>
            <span className="sp-focus-task-name">{selectedBlock?.title ?? 'Free Study'}</span>
          </div>
          <div className="sp-focus-session">
            <Coffee size={14}/> {(totalStudySeconds / 3600).toFixed(1)}h today
          </div>
        </div>

        <div className="sp-focus-body">
          {/* ── Center: Timer ── */}
          <div className="sp-focus-center">
            <div className="sp-timer-wrap">
              <svg className="sp-timer-svg" viewBox="0 0 200 200">
                {/* Glow filter */}
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                {/* Track */}
                <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="10"/>
                {/* Progress */}
                <circle
                  cx="100" cy="100" r={R}
                  fill="none"
                  stroke={mode === 'work' ? '#8b5cf6' : '#10b981'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 100 100)"
                  filter="url(#glow)"
                />
                {/* Time text */}
                <text x="100" y="90" textAnchor="middle" className="sp-timer-text-main" fill="#f1f5f9">{fmtTime(secondsLeft)}</text>
                <text x="100" y="115" textAnchor="middle" className="sp-timer-text-sub" fill="#94a3b8">
                  {mode === 'work' ? 'Focus' : 'Break'}{flowExtensions > 0 ? ` +${flowExtensions * 15}m flow` : ''}
                </text>
              </svg>
            </div>

            <div className="sp-focus-controls">
              <button className="sp-focus-btn sp-focus-btn-primary" onClick={isRunning ? pause : resume}>
                {isRunning ? <><Pause size={18}/> Pause</> : <><Play size={18}/> Resume</>}
              </button>
              <button className="sp-focus-btn sp-focus-btn-flow" onClick={() => setFlowExtensions(e => e + 1)} disabled={mode !== 'work'}>
                <AlarmClock size={16}/> +15 Flow State
              </button>
              <button className="sp-focus-btn sp-focus-btn-warn" onClick={() => setShowPostpone(true)}>
                <SkipForward size={16}/> Postpone
              </button>
              <button className="sp-focus-btn sp-focus-btn-ghost" onClick={() => { reset(); setFlowExtensions(0); }}>
                <RotateCcw size={16}/>
              </button>
            </div>

            <p className="sp-focus-pomodoro-hint">
              {mode === 'work' ? '25-min deep work · Break follows automatically' : 'Rest & recharge'}
            </p>
          </div>

          {/* ── Right: Resource Injector ── */}
          <aside className="sp-focus-resources">
            <h4 className="sp-res-title">
              <Bookmark size={14}/> Resources for this block
            </h4>
            {resources.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target={r.url.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="sp-res-link"
              >
                <ArrowRight size={14}/> {r.label}
              </a>
            ))}
            <div className="sp-res-divider"/>
            <h4 className="sp-res-title">
              <BarChart2 size={14}/> Session Stats
            </h4>
            <div className="sp-res-stat">
              <span>Today total</span>
              <strong>{(totalStudySeconds/3600).toFixed(2)}h</strong>
            </div>
            <div className="sp-res-stat">
              <span>Flow extensions</span>
              <strong>× {flowExtensions}</strong>
            </div>
            <div className="sp-res-stat">
              <span>Mode</span>
              <strong style={{color: mode === 'work' ? '#8b5cf6' : '#10b981'}}>{mode === 'work' ? 'Focus' : 'Break'}</strong>
            </div>
          </aside>
        </div>
      </div>
    );
  };

  /* ── Page 4: Analytics & Reflection Hub ─────────────────────────────── */
  const AnalyticsHub = () => {
    const HOURS_24 = Array.from({length:24}, (_,i) => i);
    const intensityColor = (v) => {
      if (v > 0.75) return '#22c55e';
      if (v > 0.5)  return '#84cc16';
      if (v > 0.25) return '#fbbf24';
      return 'rgba(255,255,255,0.07)';
    };

    return (
      <div className="sp-analytics-page">
        {/* ── Energy Heatmap ── */}
        <div className="sp-analytics-card sp-heatmap-card">
          <h3 className="sp-analytics-title">
            <Activity size={16}/> Productivity Energy Heatmap
          </h3>
          <p className="sp-analytics-sub">Hours you are most focused (last 7 days)</p>
          <div className="sp-heatmap-container">
            <div className="sp-heatmap-ylabels">
              {WEEK_DAYS.map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="sp-heatmap-grid">
              {HEATMAP_DATA.map((row, d) => (
                <div key={d} className="sp-heatmap-row">
                  {row.map((v, h) => (
                    <div
                      key={h}
                      className="sp-heatmap-cell"
                      style={{background: intensityColor(v)}}
                      title={`${WEEK_DAYS[d]} ${h}:00 — ${Math.round(v*100)}% focused`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="sp-heatmap-xlabels">
              {[0,3,6,9,12,15,18,21].map(h => (
                <span key={h} style={{flex:`0 0 ${100/8}%`}}>
                  {h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`}
                </span>
              ))}
            </div>
          </div>
          <div className="sp-heatmap-legend">
            <span>Less</span>
            {[0.1, 0.3, 0.55, 0.8].map(v => (
              <div key={v} className="sp-legend-swatch" style={{background: intensityColor(v)}}/>
            ))}
            <span>More</span>
          </div>
        </div>

        {/* ── Time vs Output ── */}
        <div className="sp-analytics-card sp-chart-card">
          <h3 className="sp-analytics-title">
            <BarChart2 size={16}/> Time Invested vs Skill Progress
          </h3>
          <p className="sp-analytics-sub">Is your study time actually translating to skill improvement?</p>
          <div className="sp-dual-chart">
            {STUDY_TOPICS.map((topic, i) => (
              <div key={topic} className="sp-chart-col">
                <div className="sp-chart-bars">
                  <div
                    className="sp-chart-bar-hours"
                    style={{height: `${(STUDY_HOURS[i] / 12) * 100}%`}}
                    title={`${STUDY_HOURS[i]}h studied`}
                  />
                  <div
                    className="sp-chart-bar-score"
                    style={{height: `${STUDY_SCORES[i]}%`}}
                    title={`${STUDY_SCORES[i]}% practice score`}
                  />
                </div>
                <span className="sp-chart-label">{topic}</span>
              </div>
            ))}
          </div>
          <div className="sp-chart-legend">
            <span><span className="sp-cleg sp-cleg-hours"/>Hours studied</span>
            <span><span className="sp-cleg sp-cleg-score"/>Practice score %</span>
          </div>
        </div>

        {/* ── Goals Overview ── */}
        <div className="sp-analytics-card sp-goals-overview">
          <h3 className="sp-analytics-title"><Target size={16}/> Goals Tracker</h3>
          {savedGoals.map(g => (
            <div key={g.id} className="sp-ao-row">
              <span className="sp-ao-name">{g.name}</span>
              <div className="sp-ao-bar-track">
                <div className="sp-ao-bar-fill" style={{width:`${g.progress}%`, background:g.color}}/>
              </div>
              <span className="sp-ao-pct" style={{color:g.color}}>{g.progress}%</span>
            </div>
          ))}
        </div>

        {/* ── Weekly AI Retrospective ── */}
        <div className="sp-analytics-card sp-retro-card">
          <h3 className="sp-analytics-title">
            <MessageSquare size={16}/> Weekly AI Retrospective
            <span className="sp-retro-badge">Sunday Summary</span>
          </h3>
          <div className="sp-retro-text">
            <p>
              You crushed your <strong>Web Development</strong> and <strong>DSA</strong> goals this week — your LeetCode score jumped +8 points.
              However, your <strong>University Academics</strong> blocks were postponed 4 times, mostly in the morning slots.
            </p>
            <p>
              Next week suggestion: Move your DBMS and OS revision blocks to <strong>Tuesday &amp; Thursday evenings</strong>, when your energy heatmap shows you're at peak focus.
              Your late-night window (10 PM–2 AM) is consistently your most productive — consider scheduling one deep-work block there per day.
            </p>
            <p>
              <strong>3 LeetCode Graph problems</strong> remain unsolved from your last sync. A 30-min "Graph Concept Review" has been queued in your inbox.
            </p>
          </div>
          <div className="sp-retro-footer">
            <RefreshCcw size={14}/> Regenerates every Sunday
          </div>
        </div>
      </div>
    );
  };

  /* ─── Full page render ─────────────────────────────────────────────────── */
  const isFocus = activePage === 'focus';

  return (
    <div className={`sp-page ${crunchMode ? 'sp-crunch' : ''}`}>
      {!isFocus && <Navbar theme="dark"/>}

      <div className={`sp-root ${isFocus ? 'sp-root-focus' : ''}`}>
        {/* ── Top nav bar (hidden in focus mode) ── */}
        {!isFocus && (
          <div className="sp-topbar">
            <div className="sp-tabs">
              {[
                { key:'command',   icon:<Calendar size={15}/>,    label:'Command Center'   },
                { key:'goals',     icon:<Target size={15}/>,      label:'Goals Engine'     },
                { key:'analytics', icon:<BarChart2 size={15}/>,   label:'Analytics'        },
              ].map(t => (
                <button
                  key={t.key}
                  className={`sp-tab ${activePage === t.key ? 'sp-tab-active' : ''}`}
                  onClick={() => setActivePage(t.key)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {activePage === 'command' && (
              <button
                className={`sp-crunch-toggle ${crunchMode ? 'sp-crunch-on' : ''}`}
                onClick={applycrunchToggle}
              >
                <Flame size={16}/>
                {crunchMode ? 'Exit Crunch Mode' : 'Crunch Mode'}
                <span className={`sp-crunch-knob ${crunchMode ? 'sp-crunch-knob-on' : ''}`}/>
              </button>
            )}
          </div>
        )}

        {/* ── Page content ── */}
        <div className="sp-content">
          {activePage === 'command'   && CommandCenter()}
          {activePage === 'goals'     && GoalsEngine()}
          {activePage === 'focus'     && FocusWorkspace()}
          {activePage === 'analytics' && AnalyticsHub()}
        </div>
      </div>

      {!isFocus && <Footer/>}
    </div>
  );
};

export default StudyPlanner;

