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

/* ── mock data ── */
const STUDY_TASKS = [
  { id: 1, label: 'Binary Trees LC#104', done: true },
  { id: 2, label: 'DP: Coin Change', done: true },
  { id: 3, label: 'Graph BFS Review', done: false },
  { id: 4, label: 'System Design: CDN', done: false },
  { id: 5, label: 'Mock Interview Prep', done: false },
];

const HACKATHONS = [
  { id:1, name:'MLH Global Hack Week', date:'Feb 28', daysUntil:2, prize:'$50k', color:'#8b5cf6' },
  { id:2, name:'HackMIT 2026',         date:'Mar 7',  daysUntil:9, prize:'$25k', color:'#3b82f6' },
  { id:3, name:'ETHGlobal Waterloo',   date:'Mar 14', daysUntil:16,prize:'$30k', color:'#8b5cf6' },
];

const INTERNSHIPS = [
  { id:1, company:'Google',   role:'SWE Intern',  deadline:'Mar 1',  daysUntil:3,  status:'Applied',  color:'#10b981' },
  { id:2, company:'Meta',     role:'ML Intern',   deadline:'Mar 10', daysUntil:12, status:'OA Sent',   color:'#f59e0b' },
  { id:3, company:'Stripe',   role:'Backend Eng', deadline:'Mar 18', daysUntil:20, status:'Wishlist',  color:'#3b82f6' },
  { id:4, company:'Notion',   role:'FE Intern',   deadline:'Mar 22', daysUntil:24, status:'Interview', color:'#8b5cf6' },
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
  const name = user?.name || 'Engineer';
  const heroImg = user?.gender === 'female' ? girlImg : boyImg;
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const studyDone = STUDY_TASKS.filter(t=>t.done).length;
  const readiness = Math.round((studyDone/STUDY_TASKS.length)*70 + 30);
  const gridRef = useRef(null);

  useEffect(()=>{
    if(!gridRef.current) return;
    const tiles = gridRef.current.querySelectorAll('.bt');
    gsap.fromTo(tiles,
      { opacity:0, y:28, scale:0.96 },
      { opacity:1, y:0, scale:1, duration:0.5, stagger:0.06, ease:'power3.out', delay:0.05 }
    );
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
                  <div className="bt-hstat"><span className="bt-hstat-n">{HACKATHONS.length}</span><span className="bt-hstat-l">Hackathons</span></div>
                  <div className="bt-hstat"><span className="bt-hstat-n">{readiness}%</span><span className="bt-hstat-l">Readiness</span></div>
                </div>

                <div className="bt-tag-row">
                  {['React','Node.js','DSA','System Design'].map(t=>(
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
                <Ring done={studyDone} total={STUDY_TASKS.length} color="#8b5cf6" size={68}/>
                <div className="bt-study-tasks">
                  {STUDY_TASKS.slice(0,4).map(t=>(
                    <div key={t.id} className={`bt-task${t.done?' done':''}`}>
                      {t.done?<CheckCircle2 size={11} style={{color:'#8b5cf6'}}/>:<Circle size={11} style={{color:'rgba(255,255,255,0.2)'}}/>}
                      <span>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. HACKATHONS — col 1, row 3-4 */}
            <div className="bt bt-hack" onClick={()=>navigate('/hackathons')}>
              <div className="bt-eyebrow"><Trophy size={12}/>Hackathons</div>
              <div className="bt-hack-list">
                {HACKATHONS.map(h=>(
                  <div key={h.id} className="bt-hack-item">
                    <div className="bt-hack-bar" style={{background:h.color}}/>
                    <div className="bt-hack-info">
                      <div className="bt-hack-name">{h.name}</div>
                      <div className="bt-hack-sub">
                        <Clock size={9}/> {h.date} &nbsp;·&nbsp; <Star size={9}/> {h.prize}
                      </div>
                    </div>
                    <span className="bt-days" style={{color:h.color,borderColor:`${h.color}50`,background:`${h.color}15`}}>{h.daysUntil}d</span>
                  </div>
                ))}
              </div>
              <div className="bt-hack-cta">
                View all <ChevronRight size={12}/>
              </div>
              <div className="bt-bg-icon"><Trophy size={80}/></div>
            </div>

            {/* 6. PLACEMENT PORTAL — col 2-3, row 3 */}
            <div className="bt bt-placement" onClick={()=>navigate('/placement-portal')}>
              <div className="bt-eyebrow"><Briefcase size={12}/>Placement Portal</div>
              <div className="bt-placement-inner">
                <ScoreArc pct={readiness} color="#10b981" size={110}/>
                <div className="bt-placement-breakdown">
                  {[
                    {l:'Resume',      v:30,                                            c:'#8b5cf6'},
                    {l:'Study Tasks', v:Math.round((studyDone/STUDY_TASKS.length)*70), c:'#8b5cf6'},
                  ].map(it=>(
                    <div key={it.l} className="bt-pb-row">
                      <span className="bt-pb-lbl">{it.l}</span>
                      <div className="bt-pb-track"><div className="bt-pb-fill" style={{width:`${it.v}%`,background:it.c}}/></div>
                      <span className="bt-pb-val" style={{color:it.c}}>{it.v}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 7. RESUME BUILDER — col 4, row 3 */}
            <div className="bt bt-resume" onClick={()=>navigate('/experience')}>
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
            <div className="bt bt-dbboard" onClick={()=>navigate('/whiteboard')}>
              <div className="bt-eyebrow"><Database size={12}/>Database Board</div>
              <div className="bt-tool-icon bt-tool-cyan"><Database size={26}/></div>
              <div className="bt-tool-name">DB Designer</div>
              <div className="bt-tool-desc">Design schemas & ER diagrams visually.</div>
              <span className="bt-go"><ArrowRight size={14}/></span>
            </div>

            {/* 9. COMPONENT ARCHITECT — col 3-4, row 4 */}
            <div className="bt bt-component" onClick={()=>navigate('/whiteboard')}>
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
            <div className="bt bt-internships" onClick={()=>navigate('/internships')}>
              <div className="bt-eyebrow"><Briefcase size={12}/>Internships</div>
              <div className="bt-int-list">
                {INTERNSHIPS.map(i=>(
                  <div key={i.id} className="bt-int-row">
                    <div className="bt-int-co" style={{color:i.color}}>{i.company}</div>
                    <div className="bt-int-role">{i.role}</div>
                    <div className="bt-int-dead"><Calendar size={9}/> {i.deadline}</div>
                    <span className="bt-int-status" style={{color:i.color,borderColor:`${i.color}50`,background:`${i.color}12`}}>{i.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 11. APPLICATION TRACKER — col 3-4, row 5 */}
            <div className="bt bt-tracker" onClick={()=>navigate('/placement-portal')}>
              <div className="bt-eyebrow"><Layers size={12}/>Application Tracker</div>
              <div className="bt-tracker-cols">
                {[
                  {label:'Wishlist', count:1, color:'rgba(255,255,255,0.3)', items:['Stripe']},
                  {label:'Applied',  count:2, color:'#3b82f6', items:['Google','Meta']},
                  {label:'Interview',count:1, color:'#10b981', items:['Notion']},
                  {label:'Offer',    count:0, color:'#8b5cf6', items:[]},
                ].map(col=>(
                  <div key={col.label} className="bt-tcol">
                    <div className="bt-tcol-head" style={{color:col.color}}>
                      <span className="bt-tcol-dot" style={{background:col.color}}/>
                      {col.label}
                      <span className="bt-tcol-count">{col.count}</span>
                    </div>
                    {col.items.map(item=>(
                      <div key={item} className="bt-tcard">{item}</div>
                    ))}
                    {col.items.length===0 && <div className="bt-tcard bt-tcard-empty">—</div>}
                  </div>
                ))}
              </div>
            </div>

          </div>{/* /dash-grid */}
        </div>
      </main>
      <Footer/>
    </div>
  );
}
