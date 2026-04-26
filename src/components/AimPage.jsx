import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, RefreshCw, Upload, Github, AlertTriangle,
  Target, X, TrendingUp, Clock,
  ChevronRight, Zap, BookOpen, Wrench, Activity, Lock,
  Check, Trophy, Flame, CalendarCheck,
  ChevronDown, ChevronUp, Loader2, Star, AlertCircle,
  Briefcase, ExternalLink, MapPin, Info, Search, Code2,
  Layers, ArrowRight, Sparkles, Award,
  FileText, Terminal, Lightbulb, ThumbsUp, ThumbsDown,
  Flag, ListChecks, Copy, ClipboardCheck,
  MessageSquare, Send, Heart, Filter, ChevronLeft, BookMarked,
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AimPageNew.css';

/* ─────────────── API helper ──────────────────────────────── */
const API = '/api/aim';
const apiFetch = async (path, opts = {}) => {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
};

/* ─────────────── PDF.js lazy ────────────────────────────── */
let _pdfjs = null;
const loadPdfJs = async () => {
  if (_pdfjs) return _pdfjs;
  const mod = await import('pdfjs-dist');
  mod.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  _pdfjs = mod;
  return _pdfjs;
};
const extractResumePdf = async file => {
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

/* ─────────────── GitHub API ─────────────────────────────── */
const fetchGitHubData = async username => {
  const [uRes, rRes] = await Promise.all([
    fetch('https://api.github.com/users/' + username),
    fetch('https://api.github.com/users/' + username + '/repos?per_page=100&sort=updated'),
  ]);
  if (!uRes.ok) throw new Error('GitHub user "' + username + '" not found.');
  const user  = await uRes.json();
  const repos = await rRes.json();
  const lc = {};
  const repoList = Array.isArray(repos) ? repos : [];
  repoList.forEach(r => {
    if (r.language) lc[r.language] = (lc[r.language] || 0) + 1;
  });
  const topLangs = Object.entries(lc).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l]) => l);

  /* Fetch README excerpts for top 6 repos (by stars, then recency) */
  const topRepos = repoList
    .filter(r => !r.fork)
    .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.updated_at) - new Date(a.updated_at)))
    .slice(0, 6);

  const readmeResults = await Promise.allSettled(
    topRepos.map(r =>
      fetch('https://api.github.com/repos/' + username + '/' + r.name + '/readme')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data || data.encoding !== 'base64') return null;
          const decoded = atob(data.content.replace(/\n/g, ''));
          return decoded.slice(0, 600);
        })
        .catch(() => null)
    )
  );

  const reposWithReadme = topRepos.map((r, i) => ({
    name:        r.name,
    description: r.description || '',
    stars:       r.stargazers_count,
    language:    r.language || '',
    readmeExcerpt: readmeResults[i].status === 'fulfilled' ? readmeResults[i].value : null,
  }));

  return { username: user.login, publicRepos: user.public_repos, topLangs, repos: reposWithReadme };
};

/* ─────────────── User ID ────────────────────────────────── */
const getUserId = user => {
  if (user) return user._id || user.id || user.username || user.email || 'anon';
  let id = localStorage.getItem('nexus_aim_uid');
  if (!id) {
    id = 'aim_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('nexus_aim_uid', id);
  }
  return id;
};

/* ═══════════════════════════════════════════════════════════   JOB SOURCE CARD  — shows which JD was used for analysis
   ════════════════════════════════════════════════════════════ */
const JD_MATCH_META = {
  exact:       { label: 'Live Job Match',    color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', icon: Briefcase },
  similar:     { label: 'Similar Role',      color: '#0070F3', bg: 'rgba(0,112,243,0.1)',   border: 'rgba(0,112,243,0.25)',  icon: Search },
  bestPractice:{ label: 'Best Practice',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.25)', icon: Star },
};

const JobSourceCard = memo(function JobSourceCard({ jobSource }) {
  if (!jobSource) return null;
  const meta    = JD_MATCH_META[jobSource.matchType] || JD_MATCH_META.bestPractice;
  const Icon    = meta.icon;
  const skills  = jobSource.requiredSkills || [];
  const [open, setOpen] = useState(false);

  return (
    <div className="jd-banner" style={{ borderColor: meta.border, background: meta.bg }}>
      <div className="jd-banner-left">
        {/* Match badge */}
        <span className="jd-badge" style={{ color: meta.color, background: 'transparent', border: '1px solid ' + meta.border }}>
          <Icon size={10} /> {meta.label}
        </span>
        <div className="jd-info">
          <span className="jd-title">
            {jobSource.title || jobSource.company}
            {jobSource.company && jobSource.title && jobSource.title !== jobSource.company && (
              <span className="jd-company"> @ {jobSource.company}</span>
            )}
          </span>
          {jobSource.matchType === 'exact' && (
            <span className="jd-meta-tag">Analysis is based on a real job listing</span>
          )}
          {jobSource.matchType === 'similar' && (
            <span className="jd-meta-tag">Based on a similar open role — requirements closely match</span>
          )}
          {jobSource.matchType === 'bestPractice' && (
            <span className="jd-meta-tag">No open listing found — using industry expert knowledge for {jobSource.company || 'this role'}</span>
          )}
        </div>
      </div>

      <div className="jd-banner-right">
        {/* Required skills pills */}
        {skills.length > 0 && (
          <div className="jd-skills">
            {(open ? skills : skills.slice(0, 5)).map(function(s) {
              return (
                <span key={s} className="jd-skill-pill" style={{ borderColor: meta.color + '40', color: meta.color }}>
                  {s}
                </span>
              );
            })}
            {skills.length > 5 && (
              <button className="jd-more" onClick={function() { setOpen(function(v) { return !v; }); }}
                style={{ color: meta.color }}>
                {open ? 'less' : '+' + (skills.length - 5) + ' more'}
              </button>
            )}
          </div>
        )}
        {/* Snippet toggle */}
        {jobSource.snippet && (
          <button className="jd-snippet-toggle" onClick={function() { setOpen(function(v) { return !v; }); }}
            style={{ color: meta.color }}>
            <Info size={11} /> {open ? 'Hide JD' : 'View JD excerpt'}
          </button>
        )}
        {/* External link */}
        {jobSource.url && (
          <a href={jobSource.url} target="_blank" rel="noopener noreferrer"
            className="jd-link" style={{ color: meta.color }}>
            <ExternalLink size={11} /> View posting
          </a>
        )}
      </div>

      {/* Expanded snippet */}
      {open && jobSource.snippet && (
        <div className="jd-snippet">{jobSource.snippet}</div>
      )}
    </div>
  );
});

/* ════════════════════════════════════════════════════════════   NEXUS SCORE GAUGE  (0–1000, 240° SVG arc)
   ═══════════════════════════════════════════════════════════ */
const NexusGauge = memo(function NexusGauge({ score, breakdown }) {
  score = score || 0;
  breakdown = breakdown || {};

  const r    = 72;
  const circ = 2 * Math.PI * r;
  const arc  = circ * (240 / 360);
  const pct  = Math.min(score / 1000, 1);
  const fill = arc * pct;

  const color = score >= 850 ? '#10B981' : score >= 500 ? '#0070F3' : '#f59e0b';
  const label = score >= 850 ? 'Interview Ready'
    : score >= 600 ? 'On Track'
    : score >= 300 ? 'Building'
    : 'Just Started';

  return (
    <div className="ng-wrap">
      <svg viewBox="0 0 200 205" className="ng-svg">
        <g transform="rotate(150, 100, 105)">
          {/* Track */}
          <circle cx="100" cy="105" r={r} fill="none"
            stroke="#1f1f1f" strokeWidth="13"
            strokeDasharray={arc + ' ' + (circ - arc)}
            strokeLinecap="round" />
          {/* Fill */}
          <motion.circle cx="100" cy="105" r={r} fill="none"
            stroke={color} strokeWidth="13"
            strokeDasharray={fill + ' ' + (circ - fill)}
            strokeLinecap="round"
            initial={{ strokeDasharray: '0 ' + circ }}
            animate={{ strokeDasharray: fill + ' ' + (circ - fill) }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </g>
        <motion.text x="100" y="95" textAnchor="middle" className="ng-score"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {score}
        </motion.text>
        <text x="100" y="113" textAnchor="middle" className="ng-denom">/ 1000</text>
        <text x="100" y="130" textAnchor="middle" className="ng-label-svg">{label}</text>
      </svg>

      <div className="ng-breakdown">
        {[
          { key: 'skillCoverage',     label: 'Skill',     max: 400, color: '#0070F3' },
          { key: 'executionProgress', label: 'Execution', max: 400, color: '#8b5cf6' },
          { key: 'momentum',          label: 'Momentum',  max: 200, color: '#10B981' },
        ].map(function(item) {
          const val = breakdown[item.key] || 0;
          return (
            <div key={item.key} className="ng-bar-row">
              <span className="ng-bar-label">{item.label}</span>
              <div className="ng-bar-track">
                <motion.div className="ng-bar-fill"
                  style={{ background: item.color }}
                  initial={{ width: 0 }}
                  animate={{ width: ((val / item.max) * 100) + '%' }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
              <span className="ng-bar-val">{val}<span className="ng-bar-max">/{item.max}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   ETA CARD
   ═══════════════════════════════════════════════════════════ */
const ETACard = memo(function ETACard({ plan }) {
  const eta    = plan.eta;
  const target = plan.target;
  const streak = plan.streak || 0;
  if (!eta) return null;

  const allTasks = (plan.executionPlan || []).flatMap(function(p) { return p.tasks; });
  const done     = allTasks.filter(function(t) { return t.isDone; }).length;
  const total    = allTasks.length;

  return (
    <div className="eta-card">
      <div className="eta-header">
        <CalendarCheck size={14} />
        <span>Estimated Completion</span>
      </div>
      <div className="eta-date">{eta.targetDate}</div>
      <div className={'eta-days' + (eta.totalDays > 180 ? ' eta-days--warn' : '')}>
        {eta.totalDays} days remaining
      </div>
      <div className="eta-sub">
        {eta.remainHours}h of work left &middot; {(target && target.hoursPerDay) || 2}h/day committed
      </div>
      <div className="eta-divider" />
      <div className="eta-stats">
        <div className="eta-stat">
          <Flame size={13} style={{ color: streak > 0 ? '#f59e0b' : '#404040' }} />
          <span><strong>{streak}</strong> day streak</span>
        </div>
        <div className="eta-stat">
          <TrendingUp size={13} style={{ color: '#10B981' }} />
          <span><strong>{done}/{total}</strong> tasks</span>
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   SKILL GAP BARS
   ═══════════════════════════════════════════════════════════ */
const SkillGapSection = memo(function SkillGapSection({ skillGap }) {
  skillGap = skillGap || [];
  return (
    <div className="gap-section">
      <div className="section-label">Skill Gap Analysis</div>
      <div className="gap-list">
        {skillGap.map(function(item) {
          const skill        = item.skill;
          const currentLevel = item.currentLevel;
          const requiredLevel = item.requiredLevel;
          const delta   = requiredLevel - currentLevel;
          const curPct  = Math.round((currentLevel   / 10) * 100);
          const reqPct  = Math.round((requiredLevel  / 10) * 100);
          const gapColor = delta >= 6 ? '#ef4444' : delta >= 3 ? '#f59e0b' : '#10B981';
          return (
            <div key={skill} className="gap-row">
              <div className="gap-row-top">
                <span className="gap-skill">
                  {skill}
                  {item.fromJD && (
                    <span className="gap-jd-badge"><Briefcase size={8} /> JD Required</span>
                  )}
                </span>
                <span className="gap-nums" style={{ color: gapColor }}>
                  {currentLevel} <span className="gap-arrow">&rarr;</span> {requiredLevel}
                  <span className="gap-ten">/10</span>
                </span>
              </div>
              <div className="gap-bar-track" data-from-jd={item.fromJD ? 'true' : 'false'}>
                <div className="gap-bar-req" style={{ width: reqPct + '%' }} />
                <motion.div className="gap-bar-cur"
                  style={{ background: gapColor }}
                  initial={{ width: 0 }}
                  animate={{ width: curPct + '%' }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   SKILL MATRIX GRID
   ═══════════════════════════════════════════════════════════ */
const STATUS_META = {
  mastered: { color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  learning: { color: '#0070F3', bg: 'rgba(0,112,243,0.12)'  },
  locked:   { color: '#404040', bg: 'rgba(255,255,255,0.04)' },
};

const SkillMatrixSection = memo(function SkillMatrixSection({ skillMatrix }) {
  skillMatrix = skillMatrix || {};
  return (
    <div className="matrix-section">
      <div className="section-label">Skill Matrix</div>
      <div className="matrix-legend">
        <span className="matrix-leg"><span className="matrix-leg-dot" style={{ background: '#10B981' }} />You have it</span>
        <span className="matrix-leg"><span className="matrix-leg-dot" style={{ background: '#0070F3' }} />Learning</span>
        <span className="matrix-leg"><span className="matrix-leg-dot" style={{ background: '#404040' }} />Need to learn</span>
      </div>
      {Object.entries(skillMatrix).map(function(entry) {
        const cat   = entry[0];
        const skills = [...entry[1]].sort((a, b) => {
          const order = { mastered: 0, learning: 1, locked: 2 };
          return (order[a.status] ?? 2) - (order[b.status] ?? 2);
        });
        return (
          <div key={cat} className="matrix-cat">
            <div className="matrix-cat-label">{cat}</div>
            <div className="matrix-pills">
              {skills.map(function(s) {
                const m = STATUS_META[s.status] || STATUS_META.locked;
                const isMastered = s.status === 'mastered';
                return (
                  <span key={s.name}
                    className={'matrix-pill' + (isMastered ? ' matrix-pill--mastered' : '')}
                    style={isMastered
                      ? {}
                      : { color: m.color, background: m.bg, borderColor: m.color + '30' }}>
                    {isMastered && <Check size={10} strokeWidth={3} />}
                    {isMastered && <span className="matrix-pill-have">You have</span>}
                    {s.status === 'learning' && <Zap size={9} />}
                    {s.status === 'locked'   && <Lock size={9} />}
                    {s.name}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   EXECUTION PLAN — flat checklist, all topics visible
   ═══════════════════════════════════════════════════════════ */
const ExecutionPlan = memo(function ExecutionPlan({ executionPlan, onToggleTask }) {
  executionPlan = executionPlan || [];

  const allTasks  = executionPlan.flatMap(p => (p.tasks || []).map(t => ({ ...t, phaseNum: p.phase, phaseTitle: p.title })));
  const doneCount = allTasks.filter(t => t.isDone).length;
  const total     = allTasks.length;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="ep-wrap">
      <div className="ep-flat-header">
        <div className="section-label" style={{ margin: 0 }}>Execution Checklist</div>
        <div className="ep-flat-progress">
          <span className="ep-flat-counts">{doneCount}<span className="ep-flat-total">/{total}</span></span>
          <div className="ep-flat-bar-track">
            <motion.div className="ep-flat-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: pct + '%' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          <span className="ep-flat-pct">{pct}%</span>
        </div>
      </div>

      <div className="ep-flat-list">
        {executionPlan.map(function(phase) {
          const tasks     = phase.tasks || [];
          const phaseDone = tasks.filter(t => t.isDone).length;

          return (
            <div key={phase.phase} className="ep-flat-group">
              {/* Phase heading */}
              <div className="ep-flat-group-header">
                <span className={'ep-flat-phase-num' + (phase.status === 'locked' ? ' ep-flat-phase-num--locked' : phase.status === 'completed' ? ' ep-flat-phase-num--done' : '')}>
                  {phase.status === 'locked' && <Lock size={8} />}
                  {phase.status === 'completed' && <Check size={8} />}
                  Phase {phase.phase}
                </span>
                <span className="ep-flat-phase-title">{phase.title}</span>
                {phase.estimatedWeeks && (
                  <span className="ep-flat-weeks">~{phase.estimatedWeeks}w</span>
                )}
                <span className="ep-flat-group-prog">{phaseDone}/{tasks.length}</span>
              </div>

              {/* Tasks */}
              {tasks.map(function(task) {
                const isLocked = phase.status === 'locked' && !task.isDone;
                return (
                  <div key={task.id}
                    className={'ep-flat-task' + (task.isDone ? ' ep-flat-task--done' : isLocked ? ' ep-flat-task--locked' : '')}
                    onClick={isLocked ? undefined : function() { onToggleTask(task.id, !task.isDone); }}>
                    <div className={'ep-flat-check' + (task.isDone ? ' ep-flat-check--done' : '')}>
                      {task.isDone && <Check size={10} />}
                      {isLocked && <Lock size={8} style={{ opacity: 0.35 }} />}
                    </div>
                    <div className="ep-flat-task-body">
                      <span className="ep-flat-task-title">{task.title}</span>
                      <div className="ep-flat-task-meta">
                        <span className="ep-flat-hours"><Clock size={10} /> {task.timeEstimate}h</span>
                        {(Array.isArray(task.skills) ? task.skills : [task.skills]).filter(Boolean).map(function(skill) {
                          return <span key={skill} className="ep-flat-skill">{skill}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   SCANNING SCREEN
   ═══════════════════════════════════════════════════════════ */
const ScanningScreen = function ScanningScreen({ role, company, hasResume, hasGitHub }) {
  const co = company || 'this company';
  const steps = [
    `Fetching live job listings for ${role}${company ? ' at ' + company : ''}…`,
    hasResume
      ? `Parsing your resume against the ${co} engineering bar…`
      : `Analyzing required skills for ${role}…`,
    hasGitHub
      ? `Reading your GitHub repos & language fingerprint…`
      : `Mapping your skill profile to industry requirements…`,
    `Computing skill gaps vs ${co}'s hiring bar…`,
    `Generating your personalised execution roadmap…`,
    `Calculating Hire Readiness score & Proof-of-Work projects…`,
  ];

  return (
    <div className="scan-screen">
      <div className="scan-inner">
        <div className="scan-pulse-ring">
          <div className="scan-pulse-ring-inner">
            <Loader2 size={26} className="aim-spin" style={{ color: '#0070F3' }} />
          </div>
        </div>
        <div className="scan-title">
          Mapping your path to {company ? <strong>{company}</strong> : 'your dream role'}…
        </div>
        <div className="scan-sub">
          <strong>{role}</strong>{company ? <span> · <strong>{company}</strong></span> : ''}
          {hasResume && <span className="scan-tag scan-tag--resume"><Upload size={9} /> Resume</span>}
          {hasGitHub && <span className="scan-tag scan-tag--github"><Github size={9} /> GitHub</span>}
        </div>
        <div className="scan-steps">
          {steps.map(function(s, i) {
            return (
              <motion.div key={s} className="scan-step"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.5 + 0.2 }}>
                <span className="scan-step-dot" />
                {s}
              </motion.div>
            );
          })}
        </div>
        <div className="scan-progress-bar">
          <motion.div className="scan-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: '95%' }}
            transition={{ duration: steps.length * 0.5 + 0.5, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   RESULTS DASHBOARD
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   SKILLS OVERVIEW — "You Have" vs "They Want"
   ═══════════════════════════════════════════════════════════ */
const SkillsOverview = memo(function SkillsOverview({ skillsOverview }) {
  if (!skillsOverview) return null;
  const { youHave = [], theyWant = [] } = skillsOverview;
  if (!youHave.length && !theyWant.length) return null;

  const matchCount = theyWant.filter(t => t.userHasIt).length;
  const gapCount   = theyWant.filter(t => !t.userHasIt).length;

  return (
    <div className="so-wrap">
      <div className="so-header">
        <span className="so-title">Skills Overview</span>
        <span className="so-meta">
          <span className="so-badge so-badge--match">{matchCount} matched</span>
          <span className="so-badge so-badge--gap">{gapCount} to learn</span>
        </span>
      </div>

      <div className="so-cols">
        {/* You Have column */}
        <div className="so-col">
          <div className="so-col-header">
            <span className="so-col-icon">✦</span> You Have
          </div>
          <div className="so-pills">
            {youHave.length === 0
              ? <span className="so-empty">No skills listed</span>
              : youHave.map(({ skill, level }) => (
                  <span key={skill} className="so-pill so-pill--have" title={`Level ${level}/10`}>
                    {skill}
                    <span className="so-pill-level">{level}</span>
                  </span>
                ))
            }
          </div>
        </div>

        {/* They Want column */}
        <div className="so-col">
          <div className="so-col-header">
            <span className="so-col-icon">◎</span> They Want
          </div>
          <div className="so-pills">
            {theyWant.length === 0
              ? <span className="so-empty">No requirements found</span>
              : theyWant.map(({ skill, required, userHasIt }) => (
                  <span
                    key={skill}
                    className={[
                      'so-pill',
                      userHasIt
                        ? 'so-pill--match'
                        : required
                          ? 'so-pill--gap'
                          : 'so-pill--nice',
                    ].join(' ')}
                    title={userHasIt ? 'You have this ✓' : required ? 'Required — gap' : 'Nice to have'}
                  >
                    {userHasIt ? '✓ ' : required ? '✗ ' : '○ '}
                    {skill}
                  </span>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
});

/* ─── useLcStats: fetch solved counts from Practice Hub ────── */
function useLcStats(nexusUsername) {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!nexusUsername) return;
    setLoading(true);
    fetch('/api/practice/solved/' + encodeURIComponent(nexusUsername))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const bd = data.solvedByDifficulty || {};
        const easy   = bd.Easy   || 0;
        const medium = bd.Medium || 0;
        const hard   = bd.Hard   || 0;
        setStats({ easy, medium, hard, total: easy + medium + hard });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [nexusUsername]);
  return { stats, loading };
}

/* ═══════════════════════════════════════════════════════════
   LC DSA PANEL — Practice Hub integration
   Shows Easy/Medium/Hard solved vs AI-recommended benchmarks
   ═══════════════════════════════════════════════════════════ */
const LC_DIFF_META = {
  easy:   { label: 'Easy',   color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  medium: { label: 'Medium', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  hard:   { label: 'Hard',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
};

const VERDICT_META = {
  strong:     { label: 'Strong DSA',   color: '#10B981', icon: Trophy },
  good:       { label: 'On Track',     color: '#0070F3', icon: TrendingUp },
  needs_work: { label: 'Needs Work',   color: '#F59E0B', icon: AlertTriangle },
};

const LCDsaPanel = memo(function LCDsaPanel({ lcStats, lcBenchmarks, company, role }) {
  if (!lcBenchmarks) return null;

  const verdict   = lcBenchmarks.verdict || 'needs_work';
  const vm        = VERDICT_META[verdict] || VERDICT_META.needs_work;
  const VIcon     = vm.icon;
  const insight   = lcBenchmarks.insight || '';

  // If no lcStats from Practice Hub, show just benchmarks (what user needs)
  const noStats = !lcStats;

  return (
    <div className="lc-dsa-panel">
      <div className="lc-dsa-header">
        <div className="lc-dsa-title-row">
          <Code2 size={14} style={{ color: '#0070F3' }} />
          <span className="lc-dsa-title">DSA Readiness</span>
          <span className="lc-dsa-source">via Practice Hub</span>
        </div>
        <span className="lc-dsa-verdict" style={{ color: vm.color, borderColor: vm.color + '30', background: vm.color + '10' }}>
          <VIcon size={11} /> {vm.label}
        </span>
      </div>

      {insight && (
        <div className="lc-dsa-insight">
          <AlertCircle size={11} style={{ color: '#A1A1A1', flexShrink: 0 }} />
          <span>{insight}</span>
        </div>
      )}

      <div className="lc-dsa-bars">
        {['easy', 'medium', 'hard'].map(function(diff) {
          const meta      = LC_DIFF_META[diff];
          const solved    = lcStats ? (lcStats[diff] || 0) : null;
          const required  = lcBenchmarks[diff] || 0;
          const pct       = solved !== null ? Math.min((solved / Math.max(required, 1)) * 100, 100) : 0;
          const met       = solved !== null && solved >= required * 0.8;

          return (
            <div key={diff} className="lc-dsa-bar-row">
              <div className="lc-dsa-bar-meta">
                <span className="lc-dsa-diff-label" style={{ color: meta.color }}>{meta.label}</span>
                <span className="lc-dsa-counts">
                  {solved !== null
                    ? <><strong style={{ color: met ? meta.color : '#A1A1A1' }}>{solved}</strong> / {required}</>  
                    : <span style={{ color: '#555' }}>Target: {required}</span>
                  }
                </span>
              </div>
              <div className="lc-dsa-bar-track">
                {solved !== null && (
                  <motion.div
                    className="lc-dsa-bar-fill"
                    style={{ background: met ? meta.color : meta.color + '80' }}
                    initial={{ width: 0 }}
                    animate={{ width: pct + '%' }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                )}
                {/* Required marker at 100% */}
                <div className="lc-dsa-bar-req-line" />
              </div>
              {solved !== null && met && (
                <Check size={12} style={{ color: meta.color, flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {noStats && (
        <div className="lc-dsa-no-stats">
          <a href="/practice" className="lc-dsa-link">
            <Zap size={11} /> Open Practice Hub to track your LeetCode progress
          </a>
        </div>
      )}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   HIRE READINESS METER  (0–100%)
   ═══════════════════════════════════════════════════════════ */
const HIRE_TIERS = [
  { min: 0,  max: 25, label: 'Gap Year Zone',       color: '#ef4444', bg: 'rgba(239,68,68,0.08)'       },
  { min: 26, max: 50, label: 'Building Foundation',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'      },
  { min: 51, max: 75, label: 'Strong Candidate',     color: '#0070F3', bg: 'rgba(0,112,243,0.08)'       },
  { min: 76, max: 90, label: 'Approaching Bar',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)'      },
  { min: 91, max: 100,label: 'Hire-Ready',           color: '#10B981', bg: 'rgba(16,185,129,0.08)'      },
];

const HireReadinessMeter = memo(function HireReadinessMeter({ hireReadiness }) {
  if (!hireReadiness) return null;
  const { total = 0, label = '', skillScore = 0, taskScore = 0, dsaScore = 0 } = hireReadiness;
  const tier = HIRE_TIERS.find(t => total >= t.min && total <= t.max) || HIRE_TIERS[0];

  /* milestone percentages shown as tick marks */
  const milestones = [25, 50, 75, 90];

  return (
    <div className="hrm-wrap" style={{ '--hrm-color': tier.color, '--hrm-bg': tier.bg }}>
      {/* Top row: % + label */}
      <div className="hrm-top">
        <div className="hrm-left">
          <div className="hrm-eyebrow">
            <Award size={13} style={{ color: tier.color }} />
            <span>Hire Readiness</span>
          </div>
          <div className="hrm-pct-row">
            <motion.span
              className="hrm-pct"
              style={{ color: tier.color }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              {total}%
            </motion.span>
            <span className="hrm-tier-label" style={{ color: tier.color, borderColor: tier.color + '30', background: tier.color + '12' }}>
              {label || tier.label}
            </span>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="hrm-sub-scores">
          {[
            { key: 'Skills',    val: skillScore, max: 40, color: '#0070F3' },
            { key: 'Execution', val: taskScore,  max: 40, color: '#8b5cf6' },
            { key: 'DSA',       val: dsaScore,   max: 20, color: '#10B981' },
          ].map(s => (
            <div key={s.key} className="hrm-sub">
              <span className="hrm-sub-key">{s.key}</span>
              <div className="hrm-sub-bar-track">
                <motion.div className="hrm-sub-bar-fill"
                  style={{ background: s.color }}
                  initial={{ width: 0 }}
                  animate={{ width: ((s.val / s.max) * 100) + '%' }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <span className="hrm-sub-val" style={{ color: s.color }}>{s.val}<span className="hrm-sub-max">/{s.max}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Segmented progress bar */}
      <div className="hrm-bar-wrap">
        <div className="hrm-bar-track">
          <motion.div
            className="hrm-bar-fill"
            style={{ background: `linear-gradient(90deg, #ef4444 0%, #f59e0b 25%, #0070F3 50%, #8b5cf6 75%, #10B981 100%)` }}
            initial={{ width: 0 }}
            animate={{ width: total + '%' }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
          {/* Milestone tick marks */}
          {milestones.map(m => (
            <div key={m} className="hrm-tick" style={{ left: m + '%' }}>
              <div className="hrm-tick-line" />
              <span className="hrm-tick-label">{m}%</span>
            </div>
          ))}
          {/* Position cursor */}
          <motion.div
            className="hrm-cursor"
            initial={{ left: 0 }}
            animate={{ left: Math.min(total, 98) + '%' }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Milestone labels row */}
      <div className="hrm-milestones">
        {HIRE_TIERS.map(t => (
          <div key={t.label}
            className={'hrm-milestone' + (total >= t.min ? ' hrm-milestone--reached' : '')}
            style={{ '--m-color': t.color }}>
            <span>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   PROOF OF WORK PANEL
   ═══════════════════════════════════════════════════════════ */
const DIFF_META = {
  beginner:     { color: '#10B981', label: 'Beginner' },
  intermediate: { color: '#F59E0B', label: 'Intermediate' },
  advanced:     { color: '#EF4444', label: 'Advanced' },
};

const ProofOfWorkPanel = memo(function ProofOfWorkPanel({ proofOfWork, company, role, githubRepos }) {
  const [expanded, setExpanded] = useState(null);
  if (!proofOfWork || proofOfWork.length === 0) return null;

  /* Fuzzy-match a project title against user's GitHub repos */
  const findMatchingRepo = (projTitle) => {
    if (!githubRepos || !githubRepos.length) return null;
    const keywords = projTitle.toLowerCase()
      .replace(/[()\[\]]/g, '')
      .split(/[\s\-\/+,]+/)
      .filter(w => w.length > 3 && !['with','and','for','the','using','based','powered'].includes(w));
    return githubRepos.find(repo => {
      const haystack = (repo.name + ' ' + (repo.description || '') + ' ' + (repo.readmeExcerpt || '')).toLowerCase();
      return keywords.filter(kw => haystack.includes(kw)).length >= 2;
    }) || null;
  };

  return (
    <div className="pow-wrap">
      <div className="pow-header">
        <div className="pow-title-row">
          <Sparkles size={15} style={{ color: '#0070F3' }} />
          <span className="pow-title">Proof-of-Work Projects</span>
          <span className="pow-subtitle">
            High-signal builds that prove readiness at {company || 'this company'}
          </span>
        </div>
        <span className="pow-count">{proofOfWork.length} projects</span>
      </div>

      <div className="pow-grid">
        {proofOfWork.map((proj, idx) => {
          const diff = DIFF_META[proj.difficulty] || DIFF_META.intermediate;
          const isOpen = expanded === idx;

          return (
            <div key={idx}
              className={'pow-card' + (isOpen ? ' pow-card--open' : '')}
              style={{ '--pow-color': diff.color }}>
              {/* Card header */}
              <button className="pow-card-header" onClick={() => setExpanded(isOpen ? null : idx)}>
                <div className="pow-card-left">
                  <div className="pow-card-index">#{idx + 1}</div>
                  <div className="pow-card-info">
                    <span className="pow-card-title">{proj.title}</span>
                    <div className="pow-card-meta">
                      <span className="pow-diff-badge" style={{ color: diff.color, borderColor: diff.color + '30', background: diff.color + '10' }}>
                        {diff.label}
                      </span>
                      <span className="pow-hours"><Clock size={10} /> ~{proj.estimatedHours}h</span>
                    </div>
                  </div>
                </div>
                <div className="pow-card-right">
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {/* Expanded body */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div className="pow-card-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}>

                    {/* Why it matters */}
                    <div className="pow-section">
                      <div className="pow-section-label">
                        <Target size={11} style={{ color: diff.color }} /> Why it matters
                      </div>
                      <p className="pow-section-text">{proj.why}</p>
                    </div>

                    {/* What to build */}
                    <div className="pow-section">
                      <div className="pow-section-label">
                        <Wrench size={11} style={{ color: diff.color }} /> What to build
                      </div>
                      <p className="pow-section-text">{proj.what}</p>
                    </div>

                    {/* Hiring signals */}
                    {proj.signals && proj.signals.length > 0 && (
                      <div className="pow-section">
                        <div className="pow-section-label">
                          <Zap size={11} style={{ color: diff.color }} /> Hiring signals
                        </div>
                        <div className="pow-signals">
                          {proj.signals.map(sig => (
                            <span key={sig} className="pow-signal-pill"
                              style={{ borderColor: diff.color + '35', color: diff.color, background: diff.color + '0d' }}>
                              {sig}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* GitHub match or Not built yet */}
                    {(() => {
                      const repo = findMatchingRepo(proj.title);
                      return repo ? (
                        <div className="pow-cta-row">
                          <a
                            href={'https://github.com/' + (githubRepos[0]?.__username || '') + '/' + repo.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pow-cta pow-cta--built"
                          >
                            <Github size={12} /> You built this — view on GitHub
                            <ArrowRight size={12} />
                          </a>
                          {repo.stars > 0 && (
                            <span className="pow-repo-stars">⭐ {repo.stars}</span>
                          )}
                        </div>
                      ) : (
                        <div className="pow-cta-row">
                          <span className="pow-not-built">
                            <AlertCircle size={11} /> Not built yet — add to your project list
                          </span>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   RESUME PROJECTS PANEL
   ═══════════════════════════════════════════════════════════ */
const DIFF_RP = {
  beginner:     { label: 'Beginner',     color: '#10B981' },
  intermediate: { label: 'Intermediate', color: '#0070F3' },
  advanced:     { label: 'Advanced',     color: '#f59e0b' },
};

const ResumeProjectsPanel = memo(function ResumeProjectsPanel({ resumeProjects, company }) {
  const [openIdx, setOpenIdx] = useState(null);
  const [copied, setCopied]   = useState(null);  // index of copied bullet
  if (!resumeProjects || !resumeProjects.length) return null;

  const copyBullet = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  return (
    <div className="rp-wrap">
      <div className="section-label"><ListChecks size={13} /> Resume-Ready Projects</div>
      <p className="rp-subtext">
        Build these projects, push them to GitHub, and reference them in your resume and interviews{company ? ' for ' + company : ''}.
      </p>
      <div className="rp-grid">
        {resumeProjects.map((proj, idx) => {
          const diff   = DIFF_RP[proj.difficulty] || DIFF_RP.intermediate;
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className={'rp-card' + (isOpen ? ' rp-card--open' : '')}>
              {/* Header */}
              <button className="rp-card-header" onClick={() => setOpenIdx(isOpen ? null : idx)}>
                <div className="rp-card-header-left">
                  <span className="rp-diff-badge" style={{ color: diff.color, borderColor: diff.color + '40', background: diff.color + '12' }}>
                    {diff.label}
                  </span>
                  <span className="rp-title">{proj.title}</span>
                </div>
                <div className="rp-card-header-right">
                  {proj.stack && proj.stack.slice(0, 3).map(s => (
                    <span key={s} className="rp-stack-pill">{s}</span>
                  ))}
                  <span className="rp-est">{proj.estimatedHours}h</span>
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div className="rp-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    {/* All stack pills */}
                    {proj.stack && proj.stack.length > 0 && (
                      <div className="rp-section">
                        <div className="rp-section-label"><Terminal size={11} /> Tech Stack</div>
                        <div className="rp-stack-row">
                          {proj.stack.map(s => <span key={s} className="rp-stack-pill rp-stack-pill--full">{s}</span>)}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className="rp-section">
                      <div className="rp-section-label"><FileText size={11} /> What to Build</div>
                      <p className="rp-desc">{proj.description}</p>
                    </div>

                    {/* Why it matters */}
                    {proj.whyItMatters && (
                      <div className="rp-section">
                        <div className="rp-section-label"><Lightbulb size={11} /> Why Recruiters Love This</div>
                        <p className="rp-desc rp-why">{proj.whyItMatters}</p>
                      </div>
                    )}

                    {/* Resume bullets */}
                    {proj.highlights && proj.highlights.length > 0 && (
                      <div className="rp-section">
                        <div className="rp-section-label"><ClipboardCheck size={11} /> Copy-Paste Resume Bullets</div>
                        <div className="rp-bullets">
                          {proj.highlights.map((h, bi) => {
                            const key = idx + '-' + bi;
                            return (
                              <div key={bi} className="rp-bullet-row">
                                <span className="rp-bullet-dot" />
                                <span className="rp-bullet-text">{h}</span>
                                <button className="rp-copy-btn" title="Copy bullet" onClick={() => copyBullet(h, key)}>
                                  {copied === key ? <Check size={11} style={{ color: '#10B981' }} /> : <Copy size={11} />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   CAREER ROADMAP DOCUMENT
   ═══════════════════════════════════════════════════════════ */
const CareerRoadmapDoc = memo(function CareerRoadmapDoc({ careerRoadmap, role, company }) {
  const [tab, setTab] = useState('milestones');
  if (!careerRoadmap) return null;
  const { summary, milestones, interviewStrategy, doAndDont } = careerRoadmap;

  return (
    <div className="crd-wrap">
      <div className="crd-header-row">
        <div className="section-label"><FileText size={13} /> Career Strategy Document</div>
        <div className="crd-subtitle">Your personalised roadmap to {role}{company ? ' @ ' + company : ''}</div>
      </div>

      {/* Summary block */}
      {summary && (
        <div className="crd-summary">
          <Sparkles size={13} style={{ color: '#a78bfa', flexShrink: 0, marginTop: 2 }} />
          <p>{summary}</p>
        </div>
      )}

      {/* Tab nav */}
      <div className="crd-tabs">
        {[['milestones','Milestones'],['interview','Interview Strategy'],['dndont','Do & Don\'t']].map(([id, label]) => (
          <button key={id} className={'crd-tab' + (tab === id ? ' crd-tab--active' : '')} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* Milestones */}
      {tab === 'milestones' && milestones && (
        <div className="crd-milestones">
          {milestones.map((m, i) => (
            <div key={i} className="crd-milestone">
              <div className="crd-milestone-badge">
                <Flag size={11} />
                {m.label}
              </div>
              <div className="crd-milestone-body">
                <div className="crd-milestone-goal">{m.goal}</div>
                {m.actions && m.actions.length > 0 && (
                  <ul className="crd-milestone-actions">
                    {m.actions.map((a, ai) => (
                      <li key={ai}><ArrowRight size={10} style={{ flexShrink: 0 }} /> {a}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interview Strategy */}
      {tab === 'interview' && interviewStrategy && (
        <div className="crd-interview">
          {interviewStrategy.overview && (
            <p className="crd-interview-overview">{interviewStrategy.overview}</p>
          )}
          {interviewStrategy.rounds && interviewStrategy.rounds.length > 0 && (
            <div className="crd-int-section">
              <div className="crd-int-label">Interview Rounds</div>
              {interviewStrategy.rounds.map((r, ri) => (
                <div key={ri} className="crd-int-round">
                  <span className="crd-round-num">{ri + 1}</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
          {interviewStrategy.tips && interviewStrategy.tips.length > 0 && (
            <div className="crd-int-section">
              <div className="crd-int-label"><Lightbulb size={11} /> Insider Tips</div>
              {interviewStrategy.tips.map((t, ti) => (
                <div key={ti} className="crd-tip">
                  <Sparkles size={10} style={{ color: '#a78bfa', flexShrink: 0 }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Do and Dont */}
      {tab === 'dndont' && doAndDont && (
        <div className="crd-dndont">
          <div className="crd-dndont-col">
            <div className="crd-dndont-header crd-dndont-header--do"><ThumbsUp size={13} /> Do This</div>
            {(doAndDont.do || []).map((d, i) => (
              <div key={i} className="crd-dndont-item crd-dndont-item--do">
                <Check size={11} style={{ color: '#10B981', flexShrink: 0 }} />
                <span>{d}</span>
              </div>
            ))}
          </div>
          <div className="crd-dndont-col">
            <div className="crd-dndont-header crd-dndont-header--dont"><ThumbsDown size={13} /> Avoid This</div>
            {(doAndDont.dont || []).map((d, i) => (
              <div key={i} className="crd-dndont-item crd-dndont-item--dont">
                <X size={11} style={{ color: '#f87171', flexShrink: 0 }} />
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const ResultsDashboard = function ResultsDashboard({ plan, onToggleTask, onReset, isUpdating, liveLcStats }) {
  const target         = plan.target         || {};
  const nexusScore     = plan.nexusScore     || 0;
  const nexusBreakdown = plan.nexusBreakdown || {};
  const skillGap       = plan.skillGap       || [];
  const skillMatrix    = plan.skillMatrix    || {};
  const executionPlan  = plan.executionPlan  || [];
  const skillsOverview = plan.skillsOverview || null;
  const lcStats        = liveLcStats || plan.lcStats || null;
  const lcBenchmarks   = plan.lcBenchmarks   || null;
  const hireReadiness  = plan.hireReadiness  || null;
  const proofOfWork    = plan.proofOfWork    || [];
  const resumeProjects = plan.resumeProjects  || [];
  const careerRoadmap  = plan.careerRoadmap   || null;

  return (
    <div className="results-root">
      {/* ── Top bar ─────────────────────────────────── */}
      <div className="results-topbar">
        <div>
          <div className="results-eyebrow">Career Roadmap</div>
          <h1 className="results-title">
            {target.role}
            {target.company && <span className="results-company"> @ {target.company}</span>}
          </h1>
        </div>
        <div className="results-topbar-right">
          {isUpdating && (
            <div className="r-updating">
              <Loader2 size={12} className="aim-spin" /> Saving&hellip;
            </div>
          )}
          <button className="results-reset" onClick={onReset}>
            <RefreshCw size={13} /> Recalibrate
          </button>
        </div>
      </div>

      {/* ── Job Source Banner ────────────────────── */}
      {plan.jobSource && <JobSourceCard jobSource={plan.jobSource} />}

      {/* ── Hire Readiness Meter (GPS) ─────────── */}
      {hireReadiness && <HireReadinessMeter hireReadiness={hireReadiness} />}

      {/* ── Row 1: Score + ETA + Skill Gap ────────── */}
      <div className="results-row1">
        <div className="r-card r-card--score">
          <div className="r-card-label"><Star size={13} /> Nexus Score</div>
          <NexusGauge score={nexusScore} breakdown={nexusBreakdown} />
        </div>

        <div className="r-card">
          <ETACard plan={plan} />
        </div>

        <div className="r-card r-card--gap">
          <SkillGapSection skillGap={skillGap} />
        </div>
      </div>

      {/* ── Skills Overview: You Have vs They Want ── */}
      {skillsOverview && <SkillsOverview skillsOverview={skillsOverview} />}

      {/* ── DSA / LeetCode Panel ─────────────────── */}
      <LCDsaPanel
        lcStats={lcStats}
        lcBenchmarks={lcBenchmarks}
        company={target.company}
        role={target.role}
      />

      {/* ── Career Strategy Document ──────────────────────────── */}
      {careerRoadmap && (
        <CareerRoadmapDoc careerRoadmap={careerRoadmap} role={target.role} company={target.company} />
      )}

      {/* ── Row 2: Execution Plan + Skill Matrix ──── */}
      <div className="results-row2">
        <div className="r-card r-card--ep">
          <ExecutionPlan executionPlan={executionPlan} onToggleTask={onToggleTask} />
        </div>
        <div className="r-card r-card--matrix">
          <SkillMatrixSection skillMatrix={skillMatrix} />
        </div>
      </div>

      {/* ── Proof-of-Work Projects ──────────────── */}
      {proofOfWork.length > 0 && (
        <ProofOfWorkPanel proofOfWork={proofOfWork} company={target.company} role={target.role}
          githubRepos={(plan.target && plan.target.githubData && plan.target.githubData.repos
            ? plan.target.githubData.repos.map(r => ({ ...r, __username: plan.target.githubData.username }))
            : [])}
        />
      )}

      {/* ── Resume-Ready Projects ─────────────────────────────── */}
      {resumeProjects.length > 0 && (
        <ResumeProjectsPanel resumeProjects={resumeProjects} company={target.company} />
      )}

    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   INPUT PHASE
   ═══════════════════════════════════════════════════════════ */
const InputPhase = function InputPhase({ onSubmit }) {
  const [roleInput,    setRoleInput]    = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [skillsInput,  setSkillsInput]  = useState('');
  const [hours,        setHours]        = useState('2');
  const [timeline,     setTimeline]     = useState('6 months');
  const [resumeFile,   setResumeFile]   = useState(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeText,   setResumeText]   = useState('');
  const [githubUser,   setGithubUser]   = useState('');
  const [githubData,   setGithubData]   = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError,  setGithubError]  = useState('');
  const fileRef = useRef(null);

  const handleResumeUpload = async function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setResumeFile(file);
    setResumeParsing(true);
    try { setResumeText(await extractResumePdf(file)); } catch (_e) { setResumeText(''); }
    setResumeParsing(false);
  };

  const handleGHSync = async function() {
    if (!githubUser.trim()) return;
    setGithubLoading(true);
    setGithubError('');
    try {
      const data = await fetchGitHubData(githubUser.trim());
      setGithubData(data);
      if (data.topLangs && data.topLangs.length && !skillsInput.trim()) {
        setSkillsInput(data.topLangs.join(', '));
      }
    } catch (err) {
      setGithubError(err.message);
    }
    setGithubLoading(false);
  };

  const handleSubmit = function(e) {
    e.preventDefault();
    if (!roleInput.trim()) return;
    onSubmit({
      role:        roleInput.trim(),
      company:     companyInput.trim(),
      skills:      skillsInput.trim(),
      resumeText:  resumeText || '',
      githubData:  githubData || null,
      hoursPerDay: parseFloat(hours) || 2,
      timeline,
    });
  };

  return (
    <div className="inp-phase">
      <div className="inp-container">
        <div className="inp-text-section">
          <div className="inp-eyebrow"><Zap size={11} /> AI-Powered Career Engine</div>
          <h1 className="inp-title">
            Know exactly what it takes<br />to land your dream role.
          </h1>
          <p className="inp-sub">
            Enter your target role and current skills. The AI generates a precise skill gap analysis,
            a phased execution plan, and a live Nexus Score that rises as you complete tasks.
          </p>

          <div className="scroll-indicator">
            <div className="scroll-mouse">
              <div className="scroll-wheel"></div>
            </div>
            <div className="scroll-text">Scroll to continue</div>
            <div className="scroll-arrow">
              <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2V18M6 18L1 13M6 18L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="inp-form-section">
          <form className="inp-card" onSubmit={handleSubmit}>
          <div className="inp-row2">
            <div className="inp-field">
              <label className="inp-label">
                Target Role <span className="inp-req">*</span>
              </label>
              <input className="inp-input"
                placeholder="e.g. Frontend Engineer, ML Engineer"
                value={roleInput}
                onChange={function(e) { setRoleInput(e.target.value); }}
                autoFocus />
            </div>
            <div className="inp-field">
              <label className="inp-label">Target Company</label>
              <input className="inp-input"
                placeholder="e.g. Google, Stripe, any startup"
                value={companyInput}
                onChange={function(e) { setCompanyInput(e.target.value); }} />
            </div>
          </div>

          <div className="inp-field">
            <label className="inp-label">
              Your Current Skills
              <span className="inp-hint"> &mdash; comma-separated</span>
            </label>
            <input className="inp-input"
              placeholder="e.g. React, JavaScript, Node.js, Git, Python"
              value={skillsInput}
              onChange={function(e) { setSkillsInput(e.target.value); }} />
          </div>

          <div className="inp-row2">
            <div className="inp-field">
              <label className="inp-label">Study Hours / Day</label>
              <select className="inp-input inp-select"
                value={hours}
                onChange={function(e) { setHours(e.target.value); }}>
                {['1', '1.5', '2', '3', '4', '5', '6', '8'].map(function(h) {
                  return <option key={h} value={h}>{h} hour{h !== '1' ? 's' : ''}</option>;
                })}
              </select>
            </div>
            <div className="inp-field">
              <label className="inp-label">Target Timeline</label>
              <select className="inp-input inp-select"
                value={timeline}
                onChange={function(e) { setTimeline(e.target.value); }}>
                {['3 months', '6 months', '9 months', '12 months', 'No deadline'].map(function(t) {
                  return <option key={t} value={t}>{t}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Data sources */}
          <div className="inp-sources">
            <div className="inp-source-label">
              Boost accuracy
              <span className="inp-optional"> &mdash; optional</span>
            </div>
            <div className="inp-sources-grid">
              {/* Resume PDF */}
              <div className="inp-source">
                <input type="file" accept=".pdf" ref={fileRef}
                  style={{ display: 'none' }}
                  onChange={handleResumeUpload} />
                <button type="button"
                  className={'inp-source-btn ' + (resumeFile ? 'inp-source-btn--ok' : '')}
                  onClick={function() { fileRef.current && fileRef.current.click(); }}>
                  {resumeParsing
                    ? <span><RefreshCw size={13} className="aim-spin" /> Parsing&hellip;</span>
                    : resumeFile
                      ? <span><CheckCircle2 size={13} style={{ color: '#10B981' }} /> {resumeFile.name.slice(0, 22)}</span>
                      : <span><Upload size={13} /> Upload Resume PDF</span>}
                </button>
              </div>

              {/* GitHub */}
              <div className="inp-source inp-source--gh">
                <div className="inp-gh-row">
                  <input className="inp-gh-input"
                    placeholder="github_username"
                    value={githubUser}
                    onChange={function(e) { setGithubUser(e.target.value); setGithubError(''); }}
                    onKeyDown={function(e) { if (e.key === 'Enter') { e.preventDefault(); handleGHSync(); } }}
                  />
                  <button type="button"
                    className={'inp-source-btn inp-source-btn--gh ' + (githubData ? 'inp-source-btn--ok' : '')}
                    onClick={handleGHSync}
                    disabled={githubLoading}>
                    {githubLoading
                      ? <span><RefreshCw size={13} className="aim-spin" /> Syncing&hellip;</span>
                      : githubData
                        ? <span><CheckCircle2 size={13} style={{ color: '#10B981' }} /> @{githubData.username}</span>
                        : <span><Github size={13} /> Connect GitHub</span>}
                  </button>
                </div>
                {githubError && (
                  <p className="inp-error">
                    <AlertTriangle size={11} /> {githubError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className="inp-submit" disabled={!roleInput.trim()}>
            <Zap size={14} />
            Analyze &amp; Build Roadmap
            <ChevronRight size={14} />
          </button>
        </form>
        </div>
      </div>

      <div className="inp-trust">
        <span className="inp-trust-dot" />
        <span>Analysis is instant &middot; All data stays on your device</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE CONTROLLER
   ═══════════════════════════════════════════════════════════ */
export default function AimPage() {
  const { user }    = useAuth();
  const userId      = useMemo(function() { return getUserId(user); }, [user]);
  // Derive nexus username for practice stats lookup
  const nexusUsername = user ? (user.username || user.email || userId) : null;
  const { stats: lcStats } = useLcStats(nexusUsername);

  const [phase,      setPhase]      = useState('input');   // input | scanning | results
  const [scanMeta,   setScanMeta]   = useState(null);      // { role, company }
  const [plan,       setPlan]       = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast,      setToast]      = useState(null);

  // Load saved plan on mount — skip if user just hit Recalibrate
  useEffect(function() {
    try {
      const resetFlag = sessionStorage.getItem('aim_reset_' + userId);
      if (resetFlag) { sessionStorage.removeItem('aim_reset_' + userId); return; }
    } catch (_) {}
    apiFetch('/plan/' + userId)
      .then(function(data) {
        if (data && data.plan) {
          setPlan(data.plan);
          setPhase('results');
        }
      })
      .catch(function() {});
  }, [userId]);

  // Generate plan from input
  const handleInputSubmit = useCallback(async function(payload) {
    setScanMeta({ role: payload.role, company: payload.company, hasResume: !!(payload.resumeText && payload.resumeText.length > 30), hasGitHub: !!(payload.githubData) });
    setPhase('scanning');
    try {
      const data = await apiFetch('/generate', {
        method: 'POST',
        body: JSON.stringify(Object.assign({ userId: userId, lcStats: lcStats || null }, payload)),
      });
      setPlan(data.plan);
      setPhase('results');
    } catch (err) {
      console.error('[AimPage] generate error:', err);
      setPhase('input');
      setToast({ type: 'error', text: 'Generation failed — please try again.' });
    }
  }, [userId, lcStats]);

  // Toggle a task done/undone
  const handleToggleTask = useCallback(async function(taskId, isDone) {
    // Optimistic UI update
    setPlan(function(prev) {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      for (let pi = 0; pi < next.executionPlan.length; pi++) {
        const ep = next.executionPlan[pi];
        for (let ti = 0; ti < ep.tasks.length; ti++) {
          if (ep.tasks[ti].id === taskId) {
            ep.tasks[ti].isDone = isDone;
            break;
          }
        }
      }
      return next;
    });

    setIsUpdating(true);
    try {
      const data = await apiFetch('/task', {
        method: 'PUT',
        body: JSON.stringify({ userId: userId, taskId: taskId, isDone: isDone }),
      });
      setPlan(data.plan);
      if (isDone) {
        setToast({ type: 'success', text: 'Task complete! Nexus Score: ' + data.plan.nexusScore });
      }
    } catch (err) {
      console.error('[AimPage] task error:', err);
      setToast({ type: 'error', text: 'Could not save progress.' });
    } finally {
      setIsUpdating(false);
    }
  }, [userId]);

  // Reset to input — persist flag so a page refresh doesn't reload the old plan
  const handleReset = useCallback(function() {
    try { sessionStorage.setItem('aim_reset_' + userId, '1'); } catch (_) {}
    setPhase('input');
    setPlan(null);
  }, [userId]);

  // Auto-dismiss toast
  useEffect(function() {
    if (!toast) return;
    const t = setTimeout(function() { setToast(null); }, 3500);
    return function() { clearTimeout(t); };
  }, [toast]);

  return (
    <div className="aim-page">
      {/* Multi-layer Animated Background */}
      <div className="aim-bg-layer">
        
        {/* Hexagonal grid pattern */}
        <div className="aim-hex-grid">
          <div className="aim-hex aim-hex-1"></div>
          <div className="aim-hex aim-hex-2"></div>
          <div className="aim-hex aim-hex-3"></div>
          <div className="aim-hex aim-hex-4"></div>
          <div className="aim-hex aim-hex-5"></div>
          <div className="aim-hex aim-hex-6"></div>
          <div className="aim-hex aim-hex-7"></div>
          <div className="aim-hex aim-hex-8"></div>
        </div>
        
        {/* Floating particles */}
        <div className="aim-particles">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="aim-particle" style={{
              '--x': Math.random() * 100 + '%',
              '--y': Math.random() * 100 + '%',
              '--delay': Math.random() * 10 + 's',
              '--duration': (15 + Math.random() * 15) + 's'
            }}></div>
          ))}
        </div>
        
        {/* Wireframe 3D shapes */}
        <div className="aim-wireframes">
          <div className="aim-wireframe aim-wire-cube"></div>
          <div className="aim-wireframe aim-wire-pyramid"></div>
          <div className="aim-wireframe aim-wire-sphere"></div>
        </div>
        
        {/* Data streams */}
        <div className="aim-data-streams">
          <div className="aim-stream aim-stream-1"></div>
          <div className="aim-stream aim-stream-2"></div>
          <div className="aim-stream aim-stream-3"></div>
          <div className="aim-stream aim-stream-4"></div>
        </div>
        
        {/* Floating geometric shapes */}
        <div className="aim-bg-shapes">
          <div className="aim-shape aim-shape-1"></div>
          <div className="aim-shape aim-shape-2"></div>
          <div className="aim-shape aim-shape-3"></div>
          <div className="aim-shape aim-shape-4"></div>
          <div className="aim-shape aim-shape-5"></div>
          <div className="aim-shape aim-shape-6"></div>
          <div className="aim-shape aim-shape-7"></div>
          <div className="aim-shape aim-shape-8"></div>
        </div>
        
        {/* Circuit board lines */}
        <div className="aim-circuit-lines">
          <svg className="aim-circuit-svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
            <path className="aim-circuit-path aim-path-1" d="M 100,200 L 400,200 L 400,500 L 700,500" />
            <path className="aim-circuit-path aim-path-2" d="M 1800,100 L 1500,100 L 1500,400 L 1200,400" />
            <path className="aim-circuit-path aim-path-3" d="M 300,900 L 600,900 L 600,600 L 900,600" />
            <path className="aim-circuit-path aim-path-4" d="M 1600,800 L 1300,800 L 1300,500 L 1000,500" />
            <circle className="aim-circuit-node" cx="400" cy="200" r="4" />
            <circle className="aim-circuit-node" cx="700" cy="500" r="4" />
            <circle className="aim-circuit-node" cx="1500" cy="100" r="4" />
            <circle className="aim-circuit-node" cx="1200" cy="400" r="4" />
            <circle className="aim-circuit-node" cx="600" cy="900" r="4" />
            <circle className="aim-circuit-node" cx="900" cy="600" r="4" />
          </svg>
        </div>
        
        {/* Gradient orbs */}
        <div className="aim-bg-orbs">
          <div className="aim-orb aim-orb-1"></div>
          <div className="aim-orb aim-orb-2"></div>
          <div className="aim-orb aim-orb-3"></div>
          <div className="aim-orb aim-orb-4"></div>
        </div>
        
        {/* Animated grid with glowing nodes */}
        <div className="aim-bg-grid">
          <div className="aim-grid-node aim-node-1"></div>
          <div className="aim-grid-node aim-node-2"></div>
          <div className="aim-grid-node aim-node-3"></div>
          <div className="aim-grid-node aim-node-4"></div>
          <div className="aim-grid-node aim-node-5"></div>
          <div className="aim-grid-node aim-node-6"></div>
          <div className="aim-grid-node aim-node-7"></div>
          <div className="aim-grid-node aim-node-8"></div>
        </div>
        
        {/* Connection lines between nodes */}
        <svg className="aim-connections" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
          <line className="aim-connection-line aim-conn-1" x1="15%" y1="20%" x2="35%" y2="45%" />
          <line className="aim-connection-line aim-conn-2" x1="80%" y1="20%" x2="60%" y2="45%" />
          <line className="aim-connection-line aim-conn-3" x1="35%" y1="25%" x2="55%" y2="35%" />
          <line className="aim-connection-line aim-conn-4" x1="35%" y1="65%" x2="60%" y2="45%" />
          <line className="aim-connection-line aim-conn-5" x1="55%" y1="35%" x2="35%" y2="65%" />
        </svg>
        
        {/* Scanning lines */}
        <div className="aim-scan-line aim-scan-1"></div>
        <div className="aim-scan-line aim-scan-2"></div>
        <div className="aim-scan-line aim-scan-3"></div>
        
        {/* Binary code rain */}
        <div className="aim-binary-rain">
          <div className="aim-binary-col" style={{'--col-delay': '0s'}}>01100101</div>
          <div className="aim-binary-col" style={{'--col-delay': '2s'}}>11000010</div>
          <div className="aim-binary-col" style={{'--col-delay': '4s'}}>10101010</div>
          <div className="aim-binary-col" style={{'--col-delay': '6s'}}>01011101</div>
          <div className="aim-binary-col" style={{'--col-delay': '8s'}}>11001100</div>
        </div>
        
        {/* Tech text overlay */}
        <div className="aim-tech-text">
          <div className="aim-tech-label aim-label-1">AI ANALYSIS</div>
          <div className="aim-tech-label aim-label-2">SKILL MAPPING</div>
          <div className="aim-tech-label aim-label-3">CAREER PATH</div>
          <div className="aim-tech-label aim-label-4">OPTIMIZATION</div>
        </div>
        
      </div>
      
      <Navbar />

      <AnimatePresence mode="wait">
        {phase === 'input' && (
          <motion.div key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}>
            <InputPhase onSubmit={handleInputSubmit} />
            <Footer />
          </motion.div>
        )}

        {phase === 'scanning' && scanMeta && (
          <motion.div key="scan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}>
            <ScanningScreen role={scanMeta.role} company={scanMeta.company} hasResume={scanMeta.hasResume} hasGitHub={scanMeta.hasGitHub} />
          </motion.div>
        )}

        {phase === 'results' && plan && (
          <motion.div key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}>
            <ResultsDashboard
              plan={plan}
              onToggleTask={handleToggleTask}
              onReset={handleReset}
              isUpdating={isUpdating}
              liveLcStats={lcStats}
            />
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            className={'aim-toast ' + (toast.type === 'error' ? 'aim-toast--err' : '')}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1     }}
            exit={{ opacity: 0, y: 10,  scale: 0.97 }}
            transition={{ duration: 0.2 }}>
            {toast.type === 'success'
              ? <CheckCircle2 size={14} style={{ color: '#10B981' }} />
              : <AlertCircle  size={14} style={{ color: '#ef4444' }} />}
            <span>{toast.text}</span>
            <button onClick={function() { setToast(null); }}><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
