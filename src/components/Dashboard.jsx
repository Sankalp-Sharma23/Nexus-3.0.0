import { useState, useEffect, useRef } from 'react';
import boyImg  from '../assets/image/boy.jpg';
import girlImg from '../assets/image/girl.png';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Layout, Database, GitBranch, FileText,
  Briefcase, BookOpen, Trophy, ArrowRight,
  ChevronRight, Calendar, Zap,
  Clock, CheckCircle2, Circle, TrendingUp,
  Star, Layers, User, Cpu
} from 'lucide-react';
import '../styles/Navbar.css';
import '../styles/Dashboard.css';

/* ── fallback data (shown when API is unreachable) ── */
const STUDY_UPCOMING_FB = [
  { id: 1, label: 'Graph BFS Review', done: false, dueDate: null },
  { id: 2, label: 'System Design: CDN', done: false, dueDate: null },
  { id: 3, label: 'Mock Interview Prep', done: false, dueDate: null },
];
const STUDY_DONE_COUNT_FB = 2;
const STUDY_TOTAL_FB      = 5;

const HACKATHONS_FB = [
  { id:1, name:'MLH Global Hack Week', date:'Feb 28', daysUntil:2,  prize:'$50k', featured:true,  color:'#8b5cf6' },
  { id:2, name:'HackMIT 2026',         date:'Mar 7',  daysUntil:9,  prize:'$25k', featured:false, color:'#3b82f6' },
  { id:3, name:'ETHGlobal Waterloo',   date:'Mar 14', daysUntil:16, prize:'$30k', featured:true,  color:'#8b5cf6' },
];

const INTERNSHIPS_FB = [
  { id:1, company:'Google',   role:'SWE Intern',  deadline:'Mar 1',  status:'Open', color:'#10b981' },
  { id:2, company:'Meta',     role:'ML Intern',   deadline:'Mar 10', status:'Open', color:'#f59e0b' },
  { id:3, company:'Stripe',   role:'Backend Eng', deadline:'Mar 18', status:'Open', color:'#3b82f6' },
  { id:4, company:'Notion',   role:'FE Intern',   deadline:'Mar 22', status:'Open', color:'#8b5cf6' },
];

const JOBS_FB = [
  { id:1, title:'Software Engineer', company:'Airbnb',  type:'Full-time', level:'Mid-level', color:'#f59e0b' },
  { id:2, title:'Frontend Developer', company:'Stripe', type:'Full-time', level:'Junior',    color:'#3b82f6' },
  { id:3, title:'Backend Engineer',   company:'Notion', type:'Full-time', level:'Mid-level', color:'#10b981' },
];



/* ── Progress Ring ── */
function Ring({ done, total, color='#8b5cf6', size=72 }) {
  const rad = (size-10)/2, circ = 2*Math.PI*rad, dash=(done/total)*circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={rad} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={rad} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:'stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1)'}}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="12" fontWeight="700">{done}/{total}</text>
    </svg>
  );
}

/* ── Score Arc ── */
function ScoreArc({ pct, color='#10b981', size=100 }) {
  const r=38, circ=Math.PI*r, dash=(pct/100)*circ;
  return (
    <svg width={size} height={size/2+10} viewBox={`0 0 ${size} ${size/2+10}`}>
      <path d={`M10,${size/2} A${r},${r} 0 0,1 ${size-10},${size/2}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" strokeLinecap="round"/>
      <path d={`M10,${size/2} A${r},${r} 0 0,1 ${size-10},${size/2}`}
        fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)'}}/>
      <text x={size/2} y={size/2-2} textAnchor="middle" fill="white" fontSize="22" fontWeight="800">{pct}</text>
      <text x={size/2} y={size/2+13} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">READINESS</text>
    </svg>
  );
}

/* ───────────────────────────
   MAIN DASHBOARD
─────────────────────────── */
export default function Dashboard({ children }) {
  const [theme] = useState('dark');
  const { user } = useAuth();
  const navigate = useNavigate();
  const gridRef = useRef(null);

  const userId = user?._id || user?.id || user?.username
                 || localStorage.getItem('nexus_guest_id') || 'guest';

  const [dashData, setDashData] = useState(null);

  useEffect(() => {
    fetch(`/api/dashboard/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDashData(d); })
      .catch(() => {});
  }, [userId]);

  const name = user?.name || 'Engineer';
  const heroImg = user?.gender === 'female' ? girlImg : boyImg;
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const hasStudyData  = (dashData?.study?.tasksTotal ?? 0) > 0;
  const upcomingTasks = dashData?.study?.upcomingTasks?.length ? dashData.study.upcomingTasks : STUDY_UPCOMING_FB;
  const overdueTasks  = dashData?.study?.overdueTasks || [];
  const studyDone     = hasStudyData ? dashData.study.tasksDone   : STUDY_DONE_COUNT_FB;
  const studyTotal    = hasStudyData ? dashData.study.tasksTotal  : STUDY_TOTAL_FB;
  const readiness     = dashData?.aim?.hireReadiness ?? Math.round((studyDone / (studyTotal||1)) * 70 + 30);
  const nexusScore    = dashData?.aim?.nexusScore   || 0;
  const aimEta        = dashData?.aim?.eta          || null;
  const aimRole       = dashData?.aim?.role         || '';
  const hackathons    = dashData?.hackathons?.length  ? dashData.hackathons   : HACKATHONS_FB;
  const featuredHacks = hackathons.filter(h => h.featured).slice(0, 3);
  const displayHacks  = featuredHacks.length ? featuredHacks : hackathons.slice(0, 3);
  const internships   = dashData?.internships?.length ? dashData.internships  : INTERNSHIPS_FB;
  const jobs          = dashData?.jobs?.length        ? dashData.jobs         : JOBS_FB;

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

  useEffect(()=>{
    const grid = gridRef.current;
    if(!grid) return;

    const ctx = gsap.context(()=>{
      const tiles   = grid.querySelectorAll('.bt');
      const icons   = grid.querySelectorAll('.bt-tool-icon');
      const tags    = grid.querySelectorAll('.bt-tag');
      const badges  = grid.querySelectorAll('.bt-days, .bt-int-status');
      const bars    = grid.querySelectorAll('.bt-hack-bar');

      /* reset so Strict-Mode double-run doesn't leave opacity:0 */
      gsap.set(tiles,  { opacity:1, y:0, scale:1, clearProps:'all' });
      gsap.set(icons,  { clearProps:'all' });
      gsap.set(tags,   { clearProps:'all' });
      gsap.set(badges, { clearProps:'all' });
      gsap.set(bars,   { clearProps:'all' });

      const tl = gsap.timeline({ delay: 0.05 });

      /* ── Stage 1: tile entrance ── */
      tl.fromTo(tiles,
        { opacity:0, y:32, scale:0.95 },
        { opacity:1, y:0,  scale:1, duration:0.55, stagger:0.06, ease:'power3.out' }
      )

      /* ── Stage 2: tool icons spin-pop ── */
      .fromTo(icons,
        { rotation:-18, scale:0.5, opacity:0 },
        { rotation:0,   scale:1,   opacity:1, duration:0.45, stagger:0.1,
          ease:'back.out(2.2)', clearProps:'rotation,transform' },
        '-=0.35'
      )

      /* ── Stage 3: hero tags slide in ── */
      .fromTo(tags,
        { x:-12, opacity:0 },
        { x:0,   opacity:1, duration:0.3, stagger:0.06, ease:'power2.out' },
        '-=0.28'
      )

      /* ── Stage 4: badges bounce in ── */
      .fromTo(badges,
        { scale:0.3, opacity:0 },
        { scale:1,   opacity:1, duration:0.4, stagger:0.05, ease:'back.out(2.5)' },
        '-=0.22'
      )

      /* ── Stage 5: hack bar colour accents ── */
      .fromTo(bars,
        { scaleY:0 },
        { scaleY:1, duration:0.32, stagger:0.06, ease:'power2.out', transformOrigin:'top center' },
        '-=0.28'
      )

      /* ── Stage 6: data-driven counters + bars (after tiles visible) ── */
      .call(()=>{
        /* progress bar fills */
        grid.querySelectorAll('.bt-pb-fill').forEach(fill => {
          const target = fill.style.width || '0%';
          gsap.fromTo(fill, { width:'0%' }, { width:target, duration:1.0, ease:'power2.out' });
        });

        /* hero stat counters */
        grid.querySelectorAll('.bt-hstat-n').forEach(el => {
          const raw   = el.textContent.trim();
          const isPct = raw.includes('%');
          const end   = parseInt(raw, 10);
          if (!isNaN(end) && end > 0) {
            const proxy = { val:0 };
            gsap.to(proxy, {
              val:end, duration:1.4, ease:'power2.out',
              onUpdate(){ el.textContent = Math.round(proxy.val) + (isPct ? '%' : ''); }
            });
          }
        });

        /* tracker column counts */
        grid.querySelectorAll('.bt-tcol-count').forEach(el => {
          const end = parseInt(el.textContent.trim(), 10);
          if (!isNaN(end) && end > 0) {
            const proxy = { val:0 };
            gsap.to(proxy, {
              val:end, duration:0.8, ease:'power2.out',
              onUpdate(){ el.textContent = Math.round(proxy.val); }
            });
          }
        });
      }, '-=0.4');

    }, grid);

    return () => ctx.revert();
  },[]);

  return (
    <div className="demo-layout" data-theme={theme}>
      <Navbar theme={theme}/>
      <main className="demo-content">
        {children}
        <div className="bento-page">

          {/* top bar */}
          <div className="bento-topbar">
            <span className="bento-site-tag"><Zap size={12}/>NEXUS</span>
            <span className="bento-date">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</span>
          </div>
          {/* ── BENTO GRID ── */}
          <div className="dash-grid" ref={gridRef}>

            {/* 1. HERO — col 1-2, row 1-2 */}
            <div className="bt bt-hero">
              {/* image side */}
              <div className="bt-hero-img-wrap">
                <img src={heroImg} alt="hero" className="bt-hero-img" />
                <div className="bt-hero-img-overlay" />
              </div>

              {/* text side */}
              <div className="bt-hero-body">
                <div className="bt-hero-top">
                  <div className="bt-avatar">{initials}</div>
                  <div className="bt-hero-meta">
                    <span className="bt-online"><span className="bt-dot"/>Online</span>
                  </div>
                </div>

                <div className="bt-hero-welcome">
                  <span className="bt-hero-greeting">
                    {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'} 👋
                  </span>
                  <div className="bt-hero-name">
                    <span className="bt-hi">Welcome back, </span>{name}
                  </div>
                  <p className="bt-hero-sub">
                    {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} &mdash; here&rsquo;s your career snapshot.
                  </p>
                </div>

                <div className="bt-hero-stats">
                  <div className="bt-hstat"><span className="bt-hstat-n">{studyDone}</span><span className="bt-hstat-l">Tasks Done</span></div>
                  <div className="bt-hstat"><span className="bt-hstat-n">{hackathons.length}</span><span className="bt-hstat-l">Hackathons</span></div>
                  <div className="bt-hstat"><span className="bt-hstat-n">{readiness}%</span><span className="bt-hstat-l">Readiness</span></div>
                </div>

                <div className="bt-tag-row">
                  {skillTags.map(t=>(
                    <span key={t} className="bt-tag">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. WHITEBOARD — col 3-4, row 1 */}
            <div className="bt bt-whiteboard" onClick={()=>navigate('/whiteboard')}>
              <div className="bt-eyebrow"><Layout size={12}/>Blank Canvas</div>
              <div className="bt-tool-icon bt-tool-blue"><Layout size={32}/></div>
              <div className="bt-tool-name">Whiteboard</div>
              <div className="bt-tool-desc">Brainstorm, diagram & visualise ideas freely.</div>
              <span className="bt-go"><ArrowRight size={14}/></span>
            </div>

            {/* 4. STUDY PLANNER — col 3-4, row 2 */}
            <div className="bt bt-study" onClick={()=>navigate('/study-planner')}>
              <div className="bt-eyebrow"><BookOpen size={12}/>Study Planner</div>
              <div className="bt-study-row">
                <Ring done={studyDone} total={studyTotal} color="#8b5cf6" size={68}/>
                <div className="bt-study-tasks">
                  {overdueTasks.length > 0 && overdueTasks.slice(0,2).map((t,i)=>(
                    <div key={t._id||t.id||`od${i}`} className="bt-task bt-task-overdue">
                      <Circle size={11} style={{color:'#ef4444'}}/>
                      <span>{t.label}</span>
                      <span className="bt-task-due-badge">Due</span>
                    </div>
                  ))}
                  {upcomingTasks.slice(0, overdueTasks.length > 0 ? 2 : 4).map((t,i)=>(
                    <div key={t._id||t.id||`up${i}`} className={`bt-task${t.done?' done':''}`}>
                      {t.done?<CheckCircle2 size={11} style={{color:'#8b5cf6'}}/>:<Circle size={11} style={{color:'rgba(255,255,255,0.2)'}}/>}
                      <span>{t.label}</span>
                      {t.dueDate && <span className="bt-task-date">{new Date(t.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>}
                    </div>
                  ))}
                  {(overdueTasks.length + upcomingTasks.length) === 0 && (
                    <div className="bt-task" style={{opacity:0.4}}><Circle size={11}/><span>No tasks yet — add in Planner</span></div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. HACKATHONS — col 1, row 3-4 */}
            <div className="bt bt-hack" onClick={()=>navigate('/hackathons')}>
              <div className="bt-eyebrow"><Trophy size={12}/>Hackathons{featuredHacks.length>0&&<span className="bt-featured-badge">Featured</span>}</div>
              {displayHacks.length > 0 ? (
                <div className="bt-hack-list">
                  {displayHacks.map((h,i)=>(
                    <div key={h._id||h.id||i} className="bt-hack-item" onClick={e=>{e.stopPropagation();navigate('/hackathons',{state:{openId:h._id||h.id}});}}>
                      <div className="bt-hack-bar" style={{background:h.color}}/>
                      <div className="bt-hack-info">
                        <div className="bt-hack-name">{h.name}</div>
                        <div className="bt-hack-sub">
                          <Clock size={9}/> {h.date}
                          {h.prize && <>&nbsp;·&nbsp;<Star size={9}/> {h.prize}</>}
                        </div>
                      </div>
                      {h.daysUntil != null && <span className="bt-days" style={{color:h.color,borderColor:`${h.color}50`,background:`${h.color}15`}}>{h.daysUntil}d</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bt-hack-empty">
                  <Trophy size={28} style={{opacity:0.2,margin:'0 auto 8px'}}/>
                  <p>No featured hackathons right now</p>
                  <button className="bt-hack-empty-btn" onClick={e=>{e.stopPropagation();navigate('/hackathons');}}>Browse All <ChevronRight size={12}/></button>
                </div>
              )}
              <div className="bt-hack-cta">View all <ChevronRight size={12}/></div>
              <div className="bt-bg-icon"><Trophy size={80}/></div>
            </div>

            {/* 6. PLACEMENT PORTAL — col 2-3, row 3 */}
            <div className="bt bt-placement" onClick={()=>navigate('/placement-portal')}>
              <div className="bt-eyebrow"><Briefcase size={12}/>Jobs{aimRole&&<span className="bt-role-badge">{aimRole}</span>}</div>
              <div className="bt-jobs-list">
                {jobs.map((j,i)=>(
                  <div key={j._id||j.id||i} className="bt-job-row" onClick={e=>{e.stopPropagation();navigate('/placement-portal',{state:{openJobId:j._id||j.id}});}}>
                    <div className="bt-job-left">
                      <div className="bt-job-title">{j.title}</div>
                      <div className="bt-job-company">{j.company}</div>
                    </div>
                    <div className="bt-job-right">
                      <span className="bt-job-type">{j.type}</span>
                      {j.salary && <span className="bt-job-salary">{j.salary}</span>}
                    </div>
                    <ChevronRight size={12} style={{opacity:0.3,flexShrink:0}}/>
                  </div>
                ))}
                {jobs.length===0&&<div className="bt-job-empty">No jobs found — set your role in AIM</div>}
              </div>
            </div>

            {/* 7. RESUME BUILDER — col 4, row 3 */}
            <div className="bt bt-resume" onClick={()=>navigate('/experience-hub')}>
              <div className="bt-eyebrow"><FileText size={12}/>Resume Builder</div>
              <div className="bt-tool-icon bt-tool-amber"><FileText size={28}/></div>
              <div className="bt-tool-name">Resume</div>
              <div className="bt-resume-pills">
                {['PDF Export','ATS Score','Templates'].map(p=>(
                  <span key={p} className="bt-pill">{p}</span>
                ))}
              </div>
              <span className="bt-go"><ArrowRight size={14}/></span>
            </div>

            {/* 8. DATABASE BOARD — col 2, row 4 */}
            <div className="bt bt-dbboard" onClick={()=>navigate('/whiteboard',{state:{autoTemplate:'schema'}})}>
              <div className="bt-eyebrow"><Database size={12}/>Database Board</div>
              <div className="bt-tool-icon bt-tool-cyan"><Database size={26}/></div>
              <div className="bt-tool-name">DB Designer</div>
              <div className="bt-tool-desc">Design schemas & ER diagrams visually.</div>
              <span className="bt-go"><ArrowRight size={14}/></span>
            </div>

            {/* 9. COMPONENT ARCHITECT — col 3-4, row 4 */}
            <div className="bt bt-component" onClick={()=>navigate('/whiteboard',{state:{autoTemplate:'react'}})}>
              <div className="bt-eyebrow"><GitBranch size={12}/>Component Architect</div>
              <div className="bt-comp-visual">
                <div className="bt-comp-tree">
                  <div className="bt-ct-root">App</div>
                  <div className="bt-ct-children">
                    <div className="bt-ct-node bt-ct-blue">Header</div>
                    <div className="bt-ct-node bt-ct-purple">Router</div>
                    <div className="bt-ct-node bt-ct-green">Footer</div>
                  </div>
                </div>
              </div>
              <div className="bt-comp-meta">Design React component trees, auto-layout & export boilerplate.</div>
              <span className="bt-go"><ArrowRight size={14}/></span>
            </div>

            {/* 10. INTERNSHIPS — col 1-2, row 5 */}
            <div className="bt bt-internships">
              <div className="bt-eyebrow" onClick={()=>navigate('/internships')} style={{cursor:'pointer'}}><Briefcase size={12}/>Internships <ChevronRight size={10}/></div>
              <div className="bt-int-list">
                {internships.map((i,idx)=>(
                  <div key={i._id||i.id||idx} className="bt-int-row" onClick={()=>navigate('/internships',{state:{openId:String(i._id||i.id)}})}>
                    <div className="bt-int-co" style={{color:i.color}}>{i.company}</div>
                    <div className="bt-int-role">{i.role}</div>
                    <div className="bt-int-dead"><Calendar size={9}/> {i.deadline}</div>
                    <span className="bt-int-status" style={{color:i.color,borderColor:`${i.color}50`,background:`${i.color}12`}}>{i.status||'Open'}</span>
                  </div>
                ))}
                {internships.length===0&&<div style={{opacity:0.4,fontSize:'12px',padding:'8px 0'}}>No open internships right now</div>}
              </div>
            </div>

          </div>{/* /dash-grid */}
        </div>
      </main>
      <Footer/>
    </div>
  );
}
