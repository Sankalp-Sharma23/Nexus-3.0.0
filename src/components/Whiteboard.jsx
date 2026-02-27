import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import {
  Pencil, Check, Copy, Users, Link2, Lock, Globe, Plus,
  ChevronRight, Grid, Layers, Code2,
  Eye, Edit3, Share2, Hash, Crown, Shield,
  Wifi, ArrowRight,
} from 'lucide-react';
import '../styles/Whiteboard.css';

/* ── Ghost cursors ──────────────────────────────────── */
const GHOSTS = [
  { name: 'alex.dev',  color: '#8b5cf6', ix: 8,  iy: 15 },
  { name: 'sara.ui',   color: '#10b981', ix: 72, iy: 10 },
  { name: 'raj_sys',   color: '#f59e0b', ix: 42, iy: 62 },
  { name: 'mia.eng',   color: '#ec4899', ix: 85, iy: 55 },
  { name: 'kiran.db',  color: '#3b82f6', ix: 20, iy: 80 },
];

function GhostCursor({ name, color, ix, iy }) {
  const [pos, setPos] = useState({ x: ix, y: iy });
  useEffect(() => {
    const rand  = (min, max) => Math.random() * (max - min) + min;
    // Build a path of 3-6 random waypoints scattered across the hero
    const makePath = () => {
      const len = 3 + Math.floor(Math.random() * 4);
      return Array.from({ length: len }, () => ({
        x: rand(3, 90),
        y: rand(3, 90),
      }));
    };
    let path  = makePath();
    let step  = 0;
    const tick = () => {
      setPos(path[step]);
      step += 1;
      if (step >= path.length) {
        path = makePath();
        step = 0;
      }
    };
    const delay = Math.random() * 2000;
    let iv;
    const to = setTimeout(() => {
      tick();
      iv = setInterval(tick, rand(3100, 4700));
    }, delay);
    return () => { clearTimeout(to); clearInterval(iv); };
  }, []);
  return (
    <div className="wb-ghost" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
      <svg width="13" height="16" viewBox="0 0 24 28" fill={color}>
        <path d="M4 2 L4 22 L9 17 L13 26 L16 24.5 L12 15.5 L18 15.5 Z"/>
      </svg>
      <span className="wb-ghost-label" style={{ color, borderColor: color + '55' }}>{name}</span>
    </div>
  );
}

const TEMPLATES = [
  { id: 'blank',  label: 'Blank Canvas',        icon: <Grid size={20} />,   color: '#8b5cf6', desc: 'Start from scratch' },
  { id: 'schema', label: 'Database Schema',      icon: <Layers size={20} />, color: '#3b82f6', desc: 'ER diagram tables'  },
  { id: 'react',  label: 'React Component Tree', icon: <Code2 size={20} />,  color: '#10b981', desc: 'UI component map'   },
];

const RECENT_BOARDS = [];

const TEAM_MEMBERS = [
  { id: 1, name: 'You', role: 'Owner', status: 'online', color: '#8b5cf6', initials: 'YO' },
];

export default function Whiteboard() {
  const navigate = useNavigate();

  const [boardTitle,    setBoardTitle]    = useState('Untitled Board');
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [draftTitle,    setDraftTitle]    = useState('');
  const [mode,          setMode]          = useState('private');
  const [selectedTpl,   setSelectedTpl]   = useState('blank');
  const [joinCode,      setJoinCode]      = useState('');
  const [copied,        setCopied]        = useState(false);
  const [shareEmail,    setShareEmail]    = useState('');
  const [linkPerm,      setLinkPerm]      = useState('Viewer');
  const [memberPerms,   setMemberPerms]   = useState({});
  const titleInputRef = useRef(null);

  /* helpers */
  const makeCode      = () => Math.random().toString(36).substring(2,10).toUpperCase();
  const startEdit     = () => { setDraftTitle(boardTitle); setEditingTitle(true); setTimeout(()=>titleInputRef.current?.focus(),0); };
  const commitTitle   = () => { if (draftTitle.trim()) setBoardTitle(draftTitle.trim()); setEditingTitle(false); };
  const handleEnter   = () => navigate(`/whiteboard/${makeCode()}?template=${selectedTpl}`);
  const handleCreate  = () => navigate(`/whiteboard/${makeCode()}?template=${selectedTpl}`);
  const handleJoin    = () => { if (joinCode.trim()) navigate(`/whiteboard/${joinCode.trim()}`); };
  const handleCopy    = (t) => { navigator.clipboard.writeText(t); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const cyclePerm     = (id) => setMemberPerms(p=>({ ...p, [id]: p[id]==='Editor'?'Viewer':'Editor' }));
  const boardCode     = useRef(makeCode());
  const boardLink     = `${window.location.origin}/whiteboard/${boardCode.current}`;

  return (
    <div className="wb-page">
      <Navbar />

      {/* ══════ HERO ══════ */}
      <section className="wb-hero">
        <div className="wb-dotgrid" aria-hidden="true" />
        {GHOSTS.map(g => <GhostCursor key={g.name} {...g} />)}

        <div className="wb-hero-inner">
          {/* status */}
          <div className="wb-status-bar">
            <span className="wb-status-dot" />
            <span className="wb-status-text">Cloud Sync Active</span>
            <span className="wb-status-sep" />
            <Wifi size={12} />
            <span className="wb-status-text">Auto-saving</span>
          </div>

          {/* editable title */}
          <div className="wb-title-row">
            {editingTitle ? (
              <input ref={titleInputRef} className="wb-title-input"
                value={draftTitle} onChange={e=>setDraftTitle(e.target.value)}
                onBlur={commitTitle} onKeyDown={e=>e.key==='Enter'&&commitTitle()} />
            ) : (
              <h1 className="wb-title" onClick={startEdit}>
                {boardTitle}
                <button className="wb-title-edit-btn" aria-label="Rename"><Pencil size={17} /></button>
              </h1>
            )}
          </div>

          {/* glass card */}
          <div className="wb-glass-card">
            {/* mode toggle */}
            <div className="wb-mode-toggle">
              <button className={`wb-mode-btn ${mode==='private'?'active':''}`} onClick={()=>setMode('private')}>
                <Lock size={14}/> Private Sketch
              </button>
              <button className={`wb-mode-btn ${mode==='collab'?'active':''}`} onClick={()=>setMode('collab')}>
                <Globe size={14}/> Collaboration Mode
              </button>
            </div>

            {mode==='collab' && (
              <div className="wb-avatars">
                {TEAM_MEMBERS.filter(m=>m.status!=='offline').map(m=>(
                  <div key={m.id} className="wb-avatar" style={{background:m.color}} title={m.name}>
                    {m.initials}
                    {m.status==='online' && <span className="wb-avatar-dot"/>}
                  </div>
                ))}
                <div className="wb-avatar wb-avatar-add" title="Invite"><Plus size={13}/></div>
              </div>
            )}

            <button className="wb-enter-btn" onClick={handleEnter}>
              <Edit3 size={19}/><span>Enter Canvas</span><ArrowRight size={17}/>
            </button>

            {mode==='collab' && (
              <div className="wb-share-row">
                <Link2 size={13}/>
                <span className="wb-share-link">{boardLink}</span>
                <button className="wb-copy-btn" onClick={()=>handleCopy(boardLink)}>
                  {copied?<Check size={13}/>:<Copy size={13}/>}
                </button>
              </div>
            )}
          </div>

          {/* templates */}
          <div className="wb-tpl-row">
            {TEMPLATES.map(t=>(
              <button key={t.id} className={`wb-tpl-card ${selectedTpl===t.id?'active':''}`}
                style={{'--tpl-color':t.color}} onClick={()=>setSelectedTpl(t.id)}>
                <span className="wb-tpl-icon">{t.icon}</span>
                <span className="wb-tpl-label">{t.label}</span>
                <span className="wb-tpl-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ SESSION MANAGEMENT ══════ */}
      <section className="wb-section">
        <div className="wb-section-inner">
          <div className="wb-section-header">
            <h2 className="wb-section-title">Session Management</h2>
            <p className="wb-section-sub">Create, revisit, or join a canvas</p>
          </div>

          <div className="wb-session-grid">
            {/* create */}
            <div className="wb-session-card wb-create-card">
              <div className="wb-sc-glow"/>
              <div className="wb-sc-icon"><Plus size={26}/></div>
              <h3 className="wb-sc-title">New Board</h3>
              <p className="wb-sc-desc">Pick a template and start a fresh canvas</p>
              <div className="wb-tpl-mini">
                {TEMPLATES.map(t=>(
                  <button key={t.id} className={`wb-tpl-mini-btn ${selectedTpl===t.id?'active':''}`}
                    style={{'--tpl-color':t.color}} onClick={()=>setSelectedTpl(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <button className="wb-action-btn wb-create-btn" onClick={handleCreate}>
                <Plus size={16}/> Create Board
              </button>
            </div>

            {/* join */}
            <div className="wb-session-card wb-join-card">
              <div className="wb-sc-icon wb-sc-icon--blue"><Users size={26}/></div>
              <h3 className="wb-sc-title">Join a Room</h3>
              <p className="wb-sc-desc">Paste a room code or shareable link</p>
              <input className="wb-join-input" placeholder="Room ID — e.g. A3BF91C2"
                value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} maxLength={10}/>
              <button className="wb-action-btn wb-join-btn" onClick={handleJoin} disabled={!joinCode.trim()}>
                <ChevronRight size={16}/> Join Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ COLLABORATION ══════ */}
      <section className="wb-section wb-collab-section">
        <div className="wb-section-inner">
          <div className="wb-section-header">
            <h2 className="wb-section-title">Collaboration & Team</h2>
            <p className="wb-section-sub">Manage participants and permissions</p>
          </div>

          <div className="wb-collab-grid">
            {/* participants */}
            <div className="wb-collab-card">
              <div className="wb-collab-card-header">
                <Users size={16}/><span>Participants</span>
                <span className="wb-online-badge">{TEAM_MEMBERS.filter(m=>m.status==='online').length} online</span>
              </div>
              <ul className="wb-member-list">
                {TEAM_MEMBERS.map(m=>(
                  <li key={m.id} className="wb-member-row">
                    <div className="wb-member-avatar" style={{background:m.color}}>
                      {m.initials}
                      <span className={`wb-member-dot wb-member-dot--${m.status}`}/>
                    </div>
                    <div className="wb-member-info">
                      <span className="wb-member-name">{m.name}</span>
                      <span className={`wb-member-sl wb-member-sl--${m.status}`}>{m.status}</span>
                    </div>
                    <div className="wb-member-right">
                      {m.role==='Owner'
                        ? <span className="wb-role-owner"><Crown size={11}/> Owner</span>
                        : <button className={`wb-perm-toggle ${memberPerms[m.id]==='Editor'?'editor':'viewer'}`}
                            onClick={()=>cyclePerm(m.id)}>
                            {memberPerms[m.id]==='Editor'?<><Edit3 size={11}/> Editor</>:<><Eye size={11}/> Viewer</>}
                          </button>
                      }
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* share */}
            <div className="wb-collab-card">
              <div className="wb-collab-card-header">
                <Share2 size={16}/><span>Share & Invite</span>
              </div>

              <div className="wb-share-block">
                <label className="wb-share-label"><Link2 size={13}/> Board Link</label>
                <div className="wb-share-link-row">
                  <span className="wb-share-link-text">{boardLink}</span>
                  <button className="wb-copy-pill" onClick={()=>handleCopy(boardLink)}>
                    {copied?<><Check size={12}/> Copied!</>:<><Copy size={12}/> Copy</>}
                  </button>
                </div>
              </div>

              <div className="wb-share-block">
                <label className="wb-share-label"><Hash size={13}/> Invite by User ID</label>
                <div className="wb-email-row">
                  <input className="wb-email-input" placeholder="e.g. @user1234 or #UID-5678"
                    value={shareEmail} onChange={e=>setShareEmail(e.target.value)}/>
                  <button className="wb-send-btn" disabled={!shareEmail.trim()}>Invite</button>
                </div>
              </div>

              <div className="wb-share-block">
                <label className="wb-share-label"><Shield size={13}/> Default Link Permission</label>
                <div className="wb-perm-row">
                  {['Viewer','Editor'].map(p=>(
                    <button key={p} className={`wb-perm-choice ${linkPerm===p?'active':''}`}
                      onClick={()=>setLinkPerm(p)}>
                      {p==='Viewer'?<><Eye size={12}/> Viewer</>:<><Edit3 size={12}/> Editor</>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer/>
    </div>
  );
}

