import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import boyImg  from '../assets/image/boy.jpg';
import girlImg from '../assets/image/girl.png';
import {
  Layout, Database, FileText, GitBranch,
  Briefcase, BookOpen, Trophy, ArrowRight,
  ChevronRight, Plus, Target, Zap,
  Clock, CheckCircle2, Circle, Code2,
  TrendingUp
} from 'lucide-react';
import '../styles/Navbar.css';
import '../styles/Dashboard.css';



function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', emoji: '☀️' };
  if (h < 17) return { text: 'Good afternoon', emoji: '⚡' };
  return { text: 'Good evening', emoji: '🌙' };
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const pageRef   = useRef(null);

  const userId = user?._id || user?.id || user?.username
               || localStorage.getItem('nexus_guest_id') || 'guest';

  const [dashData, setDashData] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch(`/api/dashboard/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDashData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  /* derived values */
  const name     = user?.name || 'Engineer';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const greeting = getGreeting();

  /* Avatar: uploaded image > gender-based image > initials fallback */
  const avatarUrl = user?.avatar || null;
  const genderImg = user?.gender === 'female' ? girlImg : boyImg;

  const FOCUS_TAGS = {
    swe:    ['React','Node.js','DSA','System Design'],
    ml:     ['Python','TensorFlow','NLP','ML Ops'],
    data:   ['SQL','Python','Tableau','Statistics'],
    devops: ['Docker','K8s','CI/CD','AWS'],
    mobile: ['React Native','Swift','Kotlin','Flutter'],
  };
  const skillTags = user?.focusLabel
    ? [user.focusLabel, 'DSA', 'System Design', 'Git']
    : (FOCUS_TAGS[user?.focus] || FOCUS_TAGS.swe);

  const tasks       = dashData?.study?.upcomingTasks || [];
  const tasksDone   = dashData?.study?.tasksDone   ?? 0;
  const tasksTotal  = dashData?.study?.tasksTotal  ?? 0;
  const streak      = dashData?.study?.streak       ?? 0;
  const focusMins   = dashData?.study?.todayFocusMinutes ?? 0;
  const aimRole     = dashData?.aim?.role           || '';
  const aimEta      = dashData?.aim?.eta            || null;
  const readiness   = dashData?.aim?.hireReadiness  ?? 0;
  const nexusScore  = dashData?.aim?.nexusScore     ?? 0;
  const aimChecklist = dashData?.aim?.checklist     || [];
  const hackathons  = dashData?.hackathons          || [];
  const internships = dashData?.internships         || [];
  const jobs        = dashData?.jobs                || [];

  /* Derive colour for a job card if the API doesn't provide one */
  const JOB_COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899'];
  function jobColor(j, i) {
    if (j.color) return j.color;
    let h = 0;
    for (const c of (j.company || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return JOB_COLORS[h % JOB_COLORS.length];
  }

  /* lcStats */
  const lc      = user?.lcStats || {};
  const lcEasy  = lc.easySolved   || 0;
  const lcMed   = lc.mediumSolved || 0;
  const lcHard  = lc.hardSolved   || 0;

  /* GSAP entrance */
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.db-card',
        { opacity: 0, y: 28, scale: 0.97 },
        { opacity: 1, y: 0,  scale: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out', delay: 0.1 }
      );
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  return (
    <div className="db-layout" ref={pageRef}>
      <Navbar />
      <main className="db-main">
        <div className="db-page">

          {/* ══ TOP BAR ══ */}
          <div className="db-topbar">
            <span className="db-site-tag"><Zap size={11}/>NEXUS</span>
            <span className="db-date">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</span>
          </div>

          {/* ══ 1. PROFILE HERO ══ */}
          <section className="db-card db-hero">
            {/* image panel — 1/4 width, full height */}
            <div className="db-hero-img-panel">
              <img src={avatarUrl || genderImg} alt={name} className="db-hero-img"/>
              <div className="db-hero-img-overlay"/>
            </div>

            {/* content */}
            <div className="db-hero-right">
              <div className="db-hero-name-row">
                <h1 className="db-hero-name">{name}</h1>
                <span className="db-online-badge"><span className="db-dot"/>Online</span>
                {aimRole && <span className="db-aim-badge"><Target size={10}/>{aimRole}</span>}
              </div>
              <p className="db-hero-greeting">
                {greeting.emoji} {greeting.text}! What would you like to do today?
              </p>
              <div className="db-hero-stats">
                <div className="db-stat"><span className="db-stat-n">{tasksDone}</span><span className="db-stat-l">Tasks Done</span></div>
                <div className="db-stat-div"/>
                <div className="db-stat"><span className="db-stat-n">{streak > 0 ? `${streak}🔥` : '—'}</span><span className="db-stat-l">Streak</span></div>
                <div className="db-stat-div"/>
                <div className="db-stat"><span className="db-stat-n">{readiness > 0 ? `${readiness}%` : '—'}</span><span className="db-stat-l">Readiness</span></div>
                <div className="db-stat-div"/>
                <div className="db-stat"><span className="db-stat-n">{focusMins > 0 ? `${focusMins}m` : '—'}</span><span className="db-stat-l">Focus Today</span></div>
              </div>
              <div className="db-skill-row">
                <span className="db-skill-label">SKILLS</span>
                {skillTags.map(t => <span key={t} className="db-skill-tag">{t}</span>)}
              </div>
            </div>
          </section>

          {/* ══ 2. MAIN MIDDLE GRID ══ */}
          <div className="db-mid-grid">

            {/* LEFT COLUMN — Whiteboard + Database Board */}
            <div className="db-mid-left">
              {/* Whiteboard */}
              <div className="db-card db-tool-card db-whiteboard" onClick={() => navigate('/whiteboard')}>
                <div className="db-tool-eyebrow"><Layout size={11}/>Whiteboard</div>
                <div className="db-tool-body">
                  <div className="db-tool-icon-wrap db-icon-blue"><Layout size={22}/></div>
                  <p className="db-tool-desc">Brainstorm &amp; diagram ideas freely</p>
                </div>
                <button className="db-tool-btn" onClick={e=>{e.stopPropagation();navigate('/whiteboard');}}><Plus size={13}/>New Board</button>
                <span className="db-card-go"><ArrowRight size={12}/></span>
              </div>
              {/* Database Board */}
              <div className="db-card db-tool-card db-dbboard" onClick={() => navigate('/whiteboard',{state:{autoTemplate:'schema'}})}>
                <div className="db-tool-eyebrow"><Database size={11}/>Database Board</div>
                <div className="db-tool-body">
                  <div className="db-tool-icon-wrap db-icon-cyan"><Database size={22}/></div>
                  <p className="db-tool-desc">Design schemas &amp; ER diagrams</p>
                </div>
                <button className="db-tool-btn" onClick={e=>{e.stopPropagation();navigate('/whiteboard',{state:{autoTemplate:'schema'}})}}><Plus size={13}/>New Schema</button>
                <span className="db-card-go"><ArrowRight size={12}/></span>
              </div>
            </div>

            {/* MIDDLE COLUMN — Resume */}
            <div className="db-mid-center">
              <div className="db-card db-resume-card" onClick={() => navigate('/resume-builder')}>
                <div className="db-tool-eyebrow"><FileText size={11}/>Resume Builder</div>
                <div className="db-resume-visual">
                  <div className="db-resume-doc">
                    <div className="db-rdoc-header"/>
                    <div className="db-rdoc-line db-rdoc-short"/>
                    <div className="db-rdoc-line"/>
                    <div className="db-rdoc-line db-rdoc-short"/>
                    <div className="db-rdoc-divider"/>
                    <div className="db-rdoc-line"/>
                    <div className="db-rdoc-line db-rdoc-med"/>
                  </div>
                </div>
                <div className="db-resume-pills">
                  {['PDF Export','ATS Score','Templates'].map(p => <span key={p} className="db-pill">{p}</span>)}
                </div>
                <button className="db-resume-btn"><FileText size={13}/>Make Resume</button>
                <span className="db-card-go"><ArrowRight size={12}/></span>
              </div>
            </div>

            {/* RIGHT COLUMN — Task (Study Planner) */}
            <div className="db-mid-right">
              <div className="db-card db-task-card" onClick={() => navigate('/study-planner')}>
                <div className="db-tool-eyebrow"><BookOpen size={11}/>Task <span style={{marginLeft:4,opacity:.4}}>from Study Planner</span></div>
                {/* Progress summary */}
                <div className="db-task-progress-row">
                  <div className="db-task-progress-info">
                    <span className="db-task-done-count">{tasksDone}</span>
                    <span className="db-task-sep">/</span>
                    <span className="db-task-total-count">{tasksTotal}</span>
                    <span className="db-task-label">tasks completed</span>
                  </div>
                  <div className="db-task-track">
                    <div className="db-task-fill" style={{width: tasksTotal > 0 ? `${(tasksDone/tasksTotal)*100}%` : '0%'}}/>
                  </div>
                </div>
                {/* Task list */}
                <div className="db-task-list">
                  {tasks.slice(0,4).map((t,i) => (
                    <div key={t._id||t.id||i} className={`db-task-item${t.done?' db-task-done':''}`}>
                      {t.done
                        ? <CheckCircle2 size={13} className="db-task-check-done"/>
                        : <Circle size={13} className="db-task-check"/>}
                      <span className="db-task-text">{t.label}</span>
                      {t.subject && <span className="db-task-sub">{t.subject}</span>}
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="db-task-empty">No tasks yet — add some in Study Planner</div>
                  )}
                </div>
                <span className="db-card-go"><ArrowRight size={12}/></span>
              </div>
            </div>
          </div>

          {/* ══ 3. SECONDARY GRID ══ */}
          <div className="db-sec-grid">

            {/* React Board */}
            <div className="db-card db-tool-card db-reactboard" onClick={() => navigate('/whiteboard',{state:{autoTemplate:'react'}})}>
              <div className="db-tool-eyebrow"><GitBranch size={11}/>React Board</div>
              <div className="db-tool-body">
                <div className="db-tool-icon-wrap db-icon-purple"><GitBranch size={22}/></div>
                <div className="db-comp-preview">
                  <div className="db-cp-root">App</div>
                  <div className="db-cp-children">
                    <div className="db-cp-node db-cpn-blue">Nav</div>
                    <div className="db-cp-node db-cpn-purple">Page</div>
                    <div className="db-cp-node db-cpn-green">Footer</div>
                  </div>
                </div>
              </div>
              <button className="db-tool-btn" onClick={e=>{e.stopPropagation();navigate('/whiteboard',{state:{autoTemplate:'react'}})}}><Plus size={13}/>New Tree</button>
              <span className="db-card-go"><ArrowRight size={12}/></span>
            </div>

            {/* Practice Hub */}
            <div className="db-card db-practice-card" onClick={() => navigate('/practice')}>
              <div className="db-tool-eyebrow"><Code2 size={11}/>Practice Hub</div>
              <p className="db-practice-sub">LeetCode Progress</p>
              <div className="db-lc-stats">
                <div className="db-lc-stat db-lc-hard">
                  <span className="db-lc-n">{lcHard}</span>
                  <span className="db-lc-l">HARD</span>
                  <div className="db-lc-bar"><div className="db-lc-fill" style={{width:`${Math.min(lcHard/50*100,100)}%`}}/></div>
                </div>
                <div className="db-lc-stat db-lc-med">
                  <span className="db-lc-n">{lcMed}</span>
                  <span className="db-lc-l">MEDIUM</span>
                  <div className="db-lc-bar"><div className="db-lc-fill" style={{width:`${Math.min(lcMed/100*100,100)}%`}}/></div>
                </div>
                <div className="db-lc-stat db-lc-easy">
                  <span className="db-lc-n">{lcEasy}</span>
                  <span className="db-lc-l">EASY</span>
                  <div className="db-lc-bar"><div className="db-lc-fill" style={{width:`${Math.min(lcEasy/150*100,100)}%`}}/></div>
                </div>
              </div>
              <div className="db-lc-total">
                <TrendingUp size={11}/>
                Total Solved: <strong>{lcEasy + lcMed + lcHard}</strong>
              </div>
              <span className="db-card-go"><ArrowRight size={12}/></span>
            </div>

          </div>

          {/* ══ 4. AIM TASK ══ */}
          <div className="db-card db-aim-card" onClick={() => navigate('/aim')}>

            {/* LEFT: conditional — checklist or CTA */}
            <div className="db-aim-left">
              <div className="db-tool-eyebrow"><Target size={11}/>AIM Task
                {aimRole && <span style={{marginLeft:6,opacity:.4,fontWeight:400}}>{aimRole}</span>}
              </div>

              {aimRole ? (
                /* ── has AIM set ── */
                <>
                  <div className="db-aim-phase-label">
                    {aimChecklist[0]?.phase || 'Execution Plan'}
                  </div>
                  <div className="db-aim-checklist">
                    {aimChecklist.length > 0 ? (
                      aimChecklist.map((t, i) => (
                        <div key={t.id || i} className={`db-aim-task${t.isDone ? ' db-aim-task-done' : ''}`}
                             onClick={e => { e.stopPropagation(); navigate('/aim'); }}>
                          {t.isDone
                            ? <CheckCircle2 size={13} className="db-aim-check-done"/>
                            : <Circle size={13} className="db-aim-check"/>}
                          <span className="db-aim-task-title">{t.title}</span>
                        </div>
                      ))
                    ) : (
                      <div className="db-aim-cta-text" style={{margin:'8px 0'}}>
                        Click 'Full Roadmap' to generate your personalized AI execution plan.
                      </div>
                    )}
                  </div>
                  {aimEta && (
                    <div className="db-aim-eta">
                      <Clock size={11}/>
                      Target: {new Date(aimEta).toLocaleDateString('en-US',{month:'short',year:'numeric'})}
                    </div>
                  )}
                  <button className="db-aim-btn" onClick={e=>{e.stopPropagation();navigate('/aim');}}>
                    Full Roadmap <ArrowRight size={13}/>
                  </button>
                </>
              ) : (
                /* ── no AIM set ── */
                <>
                  <div className="db-aim-title">Set your career target</div>
                  <p className="db-aim-cta-text">Use AIM to generate a personalized AI roadmap to your dream role — skill gaps, execution plan &amp; more.</p>
                  <button className="db-aim-btn">
                    Set Your Goal <ArrowRight size={13}/>
                  </button>
                </>
              )}
            </div>

            {/* RIGHT: Nexus Score — always visible */}
            <div className="db-aim-right">
              <div className="db-aim-ring-wrap">
                <svg viewBox="0 0 120 120" width="120" height="120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#8b5cf6" strokeWidth="8"
                    strokeDasharray={`${(readiness/100)*314} 314`} strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)'}}/>
                  {nexusScore > 0 ? (
                    <>
                      <text x="60" y="52" textAnchor="middle" fill="#a78bfa" fontSize="24" fontWeight="800">{nexusScore}</text>
                      <text x="60" y="70" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">NEXUS SCORE</text>
                      <text x="60" y="85" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">{readiness}%</text>
                      <text x="60" y="98" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7">READINESS</text>
                    </>
                  ) : (
                    <>
                      <text x="60" y="51" textAnchor="middle" fill="white" fontSize="20" fontWeight="800">{readiness}</text>
                      <text x="60" y="66" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">READINESS</text>
                    </>
                  )}
                </svg>
              </div>
              <div className="db-aim-score-label">Nexus Score</div>
            </div>

          </div>

          {/* ══ 5. OPPORTUNITIES ══ */}
          <div className="db-opp-grid">

            {/* Internships */}
            <div className="db-card db-intern-card">
              <div className="db-tool-eyebrow" style={{cursor:'pointer'}} onClick={() => navigate('/internships')}>
                <Briefcase size={11}/>Internship
                <span className="db-see-all" onClick={e=>{e.stopPropagation();navigate('/internships');}}>See all <ChevronRight size={10}/></span>
              </div>
              <div className="db-opp-list">
                {internships.slice(0,4).map((item,i) => (
                  <div key={item._id||item.id||i} className="db-opp-row" onClick={() => navigate('/internships',{state:{openId:String(item._id||item.id)}})}>
                    <span className="db-opp-dot" style={{background:item.color}}/>
                    <div className="db-opp-info">
                      <span className="db-opp-co" style={{color:item.color}}>{item.company}</span>
                      <span className="db-opp-role">{item.role}</span>
                    </div>
                    <div className="db-opp-meta">
                      {item.stipend && <span className="db-opp-stipend">{item.stipend}</span>}
                      <span className="db-opp-dead">{item.deadline}</span>
                    </div>
                  </div>
                ))}
                {internships.length === 0 && <div className="db-opp-empty">No open internships right now</div>}
              </div>
            </div>

            {/* Hackathons */}
            <div className="db-card db-hack-card">
              <div className="db-tool-eyebrow" style={{cursor:'pointer'}} onClick={() => navigate('/hackathons')}>
                <Trophy size={11}/>Hackathon
                <span className="db-see-all" onClick={e=>{e.stopPropagation();navigate('/hackathons');}}>See all <ChevronRight size={10}/></span>
              </div>
              <div className="db-opp-list">
                {hackathons.slice(0,4).map((h,i) => (
                  <div key={h._id||h.id||i} className="db-opp-row" onClick={() => navigate('/hackathons',{state:{openId:h._id||h.id}})}>
                    <div className="db-hack-bar-accent" style={{background:h.color}}/>
                    <div className="db-opp-info">
                      <span className="db-opp-co" style={{color:h.color}}>{h.name}</span>
                      <span className="db-opp-role">{h.date}{h.prize && ` · ${h.prize}`}</span>
                    </div>
                    {h.daysUntil != null && (
                      <span className="db-days-badge" style={{color:h.color,borderColor:`${h.color}50`,background:`${h.color}15`}}>{h.daysUntil}d</span>
                    )}
                  </div>
                ))}
                {hackathons.length === 0 && <div className="db-opp-empty">No upcoming hackathons</div>}
              </div>
            </div>

          </div>

          {/* ══ 6. JOBS ══ */}
          <div className="db-card db-jobs-card" onClick={() => navigate('/placement-portal')}>
            <div className="db-jobs-header">
              <div className="db-tool-eyebrow"><Briefcase size={11}/>Jobs{aimRole && <span className="db-role-badge">{aimRole}</span>}</div>
              <button className="db-jobs-view-btn" onClick={e=>{e.stopPropagation();navigate('/placement-portal');}}>View All <ChevronRight size={12}/></button>
            </div>
            {jobs.length > 0 ? (
              <div className="db-jobs-grid">
                {jobs.slice(0, 8).map((j, i) => (
                  <div key={j._id||j.id||i} className="db-job-card" onClick={e=>{e.stopPropagation();navigate('/placement-portal',{state:{openJobId:j._id||j.id}});}}>
                    <div className="db-job-accent" style={{background: jobColor(j,i)}}/>
                    <div className="db-job-body">
                      <div className="db-job-title">{j.title}</div>
                      <div className="db-job-company">{j.company}{j.location && <span className="db-job-loc"> · {j.location}</span>}</div>
                      <div className="db-job-tags">
                        <span className="db-job-tag db-tag-type">{j.type||'Full-time'}</span>
                        {j.level && <span className="db-job-tag db-tag-level">{j.level}</span>}
                        {j.source && <span className="db-job-tag db-tag-src">{j.source}</span>}
                      </div>
                    </div>
                    {j.salary && <div className="db-job-salary">{j.salary}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="db-jobs-empty-state">
                <Briefcase size={36} style={{opacity:.15, margin:'0 auto 12px', display:'block'}}/>
                <p>No job listings right now.</p>
                <p className="db-jobs-empty-sub">Set your target role in AIM to get personalised matches, or check back soon as we scrape new listings daily.</p>
                <button className="db-aim-btn" style={{margin:'12px auto 0'}} onClick={e=>{e.stopPropagation();navigate('/aim');}}>Set Role in AIM <ArrowRight size={13}/></button>
              </div>
            )}
          </div>



        </div>
      </main>
      <Footer/>
    </div>
  );
}
