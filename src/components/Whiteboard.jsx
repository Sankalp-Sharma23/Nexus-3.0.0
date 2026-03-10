import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import {
  Pencil, Check, Copy, Users, Link2, Lock, Globe, Plus,
  ChevronRight, Grid, Layers, Code2,
  Eye, Edit3, Share2, Hash, Crown, Shield,
  Wifi, ArrowRight, X, UserPlus, CheckCircle, XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import socket from '../socket';
import invitationIcon from '../assets/invitation.png';
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

/* ── Helpers ──────────────────────────────── */
function getInitials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
}
function getGuestId() {
  let id = localStorage.getItem('nexus_guest_id');
  if (!id) { id = 'guest_' + Math.random().toString(36).substring(2, 10); localStorage.setItem('nexus_guest_id', id); }
  return id;
}


export default function Whiteboard() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { user }      = useAuth();
  const userId        = user?._id || user?.id || user?.username || getGuestId();
  const displayName   = user?.name || user?.username || user?.email?.split('@')[0] || userId;

  /* Auto-enter with template if navigated from Dashboard */
  useEffect(() => {
    const tpl = location.state?.autoTemplate;
    if (!tpl) return;
    const localId = 'auto_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/whiteboard/${localId}?template=${tpl}`, { replace: true });
  }, []); // eslint-disable-line

  const [boardTitle,    setBoardTitle]    = useState('Untitled Board');
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [draftTitle,    setDraftTitle]    = useState('');
  const [mode,          setMode]          = useState('private');
  const [selectedTpl,   setSelectedTpl]   = useState('blank');
  const [joinCode,      setJoinCode]      = useState('');
  const [copied,        setCopied]        = useState(false);
  const [copiedUserId,   setCopiedUserId]  = useState(false);
  const [memberPerms,   setMemberPerms]   = useState({});
  const titleInputRef = useRef(null);

  /* ── Socket / collab state ── */
  const [members,         setMembers]         = useState([{ userId, displayName, color: '#8b5cf6', isHost: true }]);
  const [currentRoomCode, setCurrentRoomCode] = useState(null);
  const [creatingRoom,    setCreatingRoom]    = useState(false);
  const [inviteOpen,      setInviteOpen]      = useState(false);
  const [inviteTarget,    setInviteTarget]    = useState('');
  const [inviteStatus,    setInviteStatus]    = useState('idle');
  const [inviteMsg,       setInviteMsg]       = useState('');
  const [pendingInvites,  setPendingInvites]  = useState([]);
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [joining,         setJoining]         = useState(false);
  const [joinError,       setJoinError]       = useState('');
  const joiningRef  = useRef(false);  // stays in-sync for socket callbacks
  const wbSectionRef = useRef(null);

  /* ── Scroll-triggered circle animation ── */
  useEffect(() => {
    const el = wbSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add('in-view');
        else el.classList.remove('in-view');
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const invBtnRef   = useRef(null);
  const pendingDirectInviteRef = useRef(null); // userId to invite right after room is created

  /* ── Socket lifecycle ── */
  useEffect(() => {
    socket.emit('register_user', { userId, displayName });
    const onRoomCreated = ({ roomCode, template, members: ms }) => {
      setCreatingRoom(false);
      setCurrentRoomCode(roomCode);
      setMembers(ms);
      // If a direct invite was queued (user clicked Invite before creating a room)
      if (pendingDirectInviteRef.current) {
        const targetId = pendingDirectInviteRef.current;
        pendingDirectInviteRef.current = null;
        setInviteStatus('sending');
        socket.emit('invite_user', { roomCode, targetUserId: targetId });
      } else {
        navigate(`/whiteboard/${roomCode}?template=${template}`);
      }
    };
    const onInviteSent = ({ targetUserId }) => {
      setInviteStatus('sent');
      setInviteMsg(`Invite sent to ${targetUserId}`);
      setTimeout(() => { setInviteStatus('idle'); setInviteMsg(''); setInviteOpen(false); setInviteTarget(''); }, 2200);
    };
    const onRoomInvite     = (inv)  => setPendingInvites(prev => [...prev, inv]);
    const onInviteAccepted = ({ displayName: dn }) => { setInviteMsg(`${dn} joined!`); setTimeout(() => setInviteMsg(''), 3000); };
    const onInviteRejected = ({ displayName: dn }) => { setInviteMsg(`${dn} declined.`); setTimeout(() => setInviteMsg(''), 3000); };
    const onUserJoined     = ({ members: ms }) => setMembers(ms);
    const onUserLeft       = ({ members: ms }) => setMembers(ms);
    const onErrorMsg       = msg => {
      if (joiningRef.current) return; // join flow handles its own errors inline
      setCreatingRoom(false); setInviteStatus('error'); setInviteMsg(msg);
      setTimeout(() => { setInviteStatus('idle'); setInviteMsg(''); }, 3500);
    };
    socket.on('room_created',     onRoomCreated);
    socket.on('invite_sent',      onInviteSent);
    socket.on('room_invite',      onRoomInvite);
    socket.on('invite_accepted',  onInviteAccepted);
    socket.on('invite_rejected',  onInviteRejected);
    socket.on('user_joined',      onUserJoined);
    socket.on('user_left',        onUserLeft);
    socket.on('error_msg',        onErrorMsg);

    // Re-register on every reconnect (socket.id changes after reconnect)
    const onReconnect = () => socket.emit('register_user', { userId, displayName });
    socket.on('connect', onReconnect);

    return () => {
      socket.off('room_created',    onRoomCreated);
      socket.off('invite_sent',     onInviteSent);
      socket.off('room_invite',     onRoomInvite);
      socket.off('invite_accepted', onInviteAccepted);
      socket.off('invite_rejected', onInviteRejected);
      socket.off('user_joined',     onUserJoined);
      socket.off('user_left',       onUserLeft);
      socket.off('error_msg',       onErrorMsg);
      socket.off('connect',         onReconnect);
    };
  }, [userId, displayName, navigate]);

  /* ── Close invite panel on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (invBtnRef.current && !invBtnRef.current.contains(e.target)) {
        setInvitePanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* helpers */
  const startEdit    = () => { setDraftTitle(boardTitle); setEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 0); };
  const commitTitle  = () => { if (draftTitle.trim()) setBoardTitle(draftTitle.trim()); setEditingTitle(false); };
  const handleCreate = useCallback(() => { setCreatingRoom(true); socket.emit('create_room', { template: selectedTpl }); }, [selectedTpl]);
  // Private mode: just open a local canvas straight away (no server room needed)
  const handleEnter = useCallback(() => {
    if (mode === 'collab') {
      handleCreate();
    } else {
      const localId = 'solo_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      navigate(`/whiteboard/${localId}?template=${selectedTpl}`);
    }
  }, [mode, handleCreate, navigate, selectedTpl]);

  // Join a room: emit join_room HERE in the lobby and navigate only after confirmed
  const handleJoin = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    if (!code || joining) return;
    setJoinError('');
    setJoining(true);
    joiningRef.current = true;

    // Always re-register first — covers the case where socket reconnected
    // after the component mounted (new socket.id, server lost the old mapping)
    socket.emit('register_user', { userId, displayName });

    // One-time listeners — only active for this join attempt
    const onConfirmed = ({ template: tpl, roomCode: rc }) => {
      socket.off('error_msg', onErr);
      joiningRef.current = false;
      setJoining(false);
      navigate(`/whiteboard/${rc || code}?template=${tpl || 'blank'}`);
    };
    const onErr = (msg) => {
      socket.off('join_confirmed', onConfirmed);
      joiningRef.current = false;
      setJoining(false);
      setJoinError(msg || `Room "${code}" not found. Check the code and try again.`);
    };

    socket.once('join_confirmed', onConfirmed);
    socket.once('error_msg',      onErr);
    socket.emit('join_room', { roomCode: code });

    // Safety timeout: 8 s
    setTimeout(() => {
      socket.off('join_confirmed', onConfirmed);
      socket.off('error_msg',      onErr);
      joiningRef.current = false;
      setJoining(prev => {
        if (prev) setJoinError('Server did not respond — make sure the server is running.');
        return false;
      });
    }, 8000);
  }, [joinCode, joining, navigate, userId, displayName]);
  const handleCopy   = (t) => { navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const cyclePerm    = (id) => setMemberPerms(p => ({ ...p, [id]: p[id] === 'Editor' ? 'Viewer' : 'Editor' }));
  const handleSendInvite = () => {
    if (!inviteTarget.trim() || !currentRoomCode) return;
    setInviteStatus('sending');
    socket.emit('invite_user', { roomCode: currentRoomCode, targetUserId: inviteTarget.trim() });
  };
  // Direct invite from the Share & Invite card (no modal)
  const handleDirectInvite = () => {
    if (!inviteTarget.trim() || inviteStatus === 'sending' || inviteStatus === 'sent') return;
    if (!currentRoomCode) {
      // Queue invite, create room first — onRoomCreated will fire it
      pendingDirectInviteRef.current = inviteTarget.trim();
      setCreatingRoom(true);
      socket.emit('create_room', { template: selectedTpl });
    } else {
      handleSendInvite();
    }
  };
  const handleAcceptInvite = (inv) => {
    setPendingInvites(prev => prev.filter(i => i.roomCode !== inv.roomCode));
    socket.emit('accept_invite', { roomCode: inv.roomCode });
    navigate(`/whiteboard/${inv.roomCode}?template=${inv.template}`);
  };
  const handleRejectInvite = (inv) => {
    setPendingInvites(prev => prev.filter(i => i.roomCode !== inv.roomCode));
    socket.emit('reject_invite', { roomCode: inv.roomCode });
  };

  return (
    <div className="wb-page">
      <Navbar leftSlot={
        <div
          ref={invBtnRef}
          className={`wb-inv-btn${pendingInvites.length > 0 ? ' wb-inv-btn--glow' : ''}`}
          onClick={() => setInvitePanelOpen(v => !v)}
        >
          <img src={invitationIcon} alt="Invitations" className="wb-inv-icon" />
          <span className="wb-inv-tooltip">Invites</span>
          {pendingInvites.length > 0 && (
            <span className="wb-inv-badge">{pendingInvites.length}</span>
          )}
          {invitePanelOpen && (
            <div className="wb-inv-panel" onClick={e => e.stopPropagation()}>
              <div className="wb-inv-panel-header">
                <img src={invitationIcon} alt="" className="wb-inv-icon-sm" />
                <span>Invitations</span>
                {pendingInvites.length > 0 && (
                  <span className="wb-inv-panel-count">{pendingInvites.length}</span>
                )}
                <button className="wb-inv-panel-close" onClick={() => setInvitePanelOpen(false)}>
                  <X size={13} />
                </button>
              </div>
              {pendingInvites.length === 0 ? (
                <div className="wb-inv-empty">No pending invitations</div>
              ) : (
                <ul className="wb-inv-list">
                  {pendingInvites.map(inv => (
                    <li key={inv.roomCode} className="wb-inv-item">
                      <div className="wb-inv-item-info">
                        <strong>{inv.hostName}</strong> invited you to join
                        <div className="wb-inv-item-meta">
                          <code className="wb-invite-code">{inv.roomCode}</code>
                          <span className="wb-invite-tpl"> · {inv.template}</span>
                        </div>
                      </div>
                      <div className="wb-inv-item-actions">
                        <button
                          className="wb-invite-accept"
                          onClick={() => { handleAcceptInvite(inv); setInvitePanelOpen(false); }}
                        >
                          <CheckCircle size={13} /> Accept
                        </button>
                        <button className="wb-invite-reject" onClick={() => handleRejectInvite(inv)}>
                          <XCircle size={13} /> Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      } />

      {/* ── Toast ── */}
      {inviteMsg && (
        <div className={`wb-toast ${inviteStatus === 'error' ? 'error' : 'success'}`}>
          {inviteStatus === 'error' ? <XCircle size={15}/> : <CheckCircle size={15}/>}
          {inviteMsg}
        </div>
      )}

      {/* ── Invite modal ── */}
      {inviteOpen && (
        <div className="wb-modal-overlay" onClick={() => setInviteOpen(false)}>
          <div className="wb-modal" onClick={e => e.stopPropagation()}>
            <div className="wb-modal-header">
              <UserPlus size={18}/>
              <h3>Invite a User</h3>
              <button className="wb-modal-close" onClick={() => setInviteOpen(false)}><X size={16}/></button>
            </div>
            {currentRoomCode ? (
              <>
                <p className="wb-modal-sub">Enter the User ID of the person you want to invite to <strong>{currentRoomCode}</strong>.</p>
                <input className="wb-modal-input" placeholder="User ID" value={inviteTarget}
                  onChange={e => setInviteTarget(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendInvite()} autoFocus />
                {inviteStatus === 'error' && <p className="wb-modal-err">{inviteMsg}</p>}
                <div className="wb-modal-actions">
                  <button className="wb-modal-cancel" onClick={() => setInviteOpen(false)}>Cancel</button>
                  <button className="wb-modal-send"
                    disabled={!inviteTarget.trim() || inviteStatus === 'sending'}
                    onClick={handleSendInvite}>
                    {inviteStatus === 'sending' ? 'Sending…' : <><UserPlus size={14}/> Send Invite</>}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="wb-modal-sub">Create a board first to invite users.</p>
                <div className="wb-modal-actions">
                  <button className="wb-modal-cancel" onClick={() => setInviteOpen(false)}>OK</button>
                  <button className="wb-modal-send" onClick={() => { setInviteOpen(false); handleCreate(); }}>
                    <Plus size={14}/> Create Board
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
            <span className="wb-status-text">Real-time</span>
            <span className="wb-status-sep" />
            <span className="wb-status-text">Your ID:&nbsp;<code style={{fontFamily:'monospace'}}>{userId}</code></span>
          </div>

          {/* editable title */}
          <div className="wb-title-row">
            {editingTitle ? (
              <input ref={titleInputRef} className="wb-title-input"
                value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
                onBlur={commitTitle} onKeyDown={e => e.key === 'Enter' && commitTitle()} />
            ) : (
              <h1 className="wb-title" onClick={startEdit}>
                {boardTitle}
                <button className="wb-title-edit-btn" aria-label="Rename"><Pencil size={17} /></button>
              </h1>
            )}
          </div>

          {/* glass card */}
          <div className="wb-glass-card">
            <div className="wb-mode-toggle">
              <button className={`wb-mode-btn ${mode === 'private' ? 'active' : ''}`} onClick={() => setMode('private')}>
                <Lock size={14}/> Private Sketch
              </button>
              <button className={`wb-mode-btn ${mode === 'collab' ? 'active' : ''}`} onClick={() => setMode('collab')}>
                <Globe size={14}/> Collaboration Mode
              </button>
            </div>

            {mode === 'collab' && (
              <div className="wb-avatars">
                {members.map(m => (
                  <div key={m.userId} className="wb-avatar" style={{ background: m.color }}
                    title={`${m.displayName}${m.isHost ? ' (Host)' : ''}`}>
                    {getInitials(m.displayName)}
                    {m.userId === userId && <span className="wb-avatar-dot"/>}
                  </div>
                ))}
                <div className="wb-avatar wb-avatar-add" title="Invite user"
                  onClick={() => setInviteOpen(true)}>
                  <Plus size={13}/>
                </div>
              </div>
            )}

            <button className="wb-enter-btn" onClick={handleEnter} disabled={creatingRoom}>
              <Edit3 size={19}/>
              <span>{creatingRoom ? 'Creating room…' : 'Enter Canvas'}</span>
              <ArrowRight size={17}/>
            </button>

            {mode === 'collab' && currentRoomCode && (
              <div className="wb-share-row">
                <Link2 size={13}/>
                <span className="wb-share-link">Room&nbsp;<strong>{currentRoomCode}</strong></span>
                <button className="wb-copy-btn" onClick={() => handleCopy(currentRoomCode)}>
                  {copied ? <Check size={13}/> : <Copy size={13}/>}
                </button>
              </div>
            )}
            {mode === 'collab' && !currentRoomCode && (
              <div className="wb-share-row wb-share-row--hint">
                <Link2 size={13}/>
                <span className="wb-share-link">Create a board to get your room code</span>
              </div>
            )}
          </div>

          {/* templates */}
          <div className="wb-tpl-row">
            {TEMPLATES.map(t => (
              <button key={t.id} className={`wb-tpl-card ${selectedTpl === t.id ? 'active' : ''}`}
                style={{ '--tpl-color': t.color }} onClick={() => setSelectedTpl(t.id)}>
                <span className="wb-tpl-icon">{t.icon}</span>
                <span className="wb-tpl-label">{t.label}</span>
                <span className="wb-tpl-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

        {/* ══════ SESSION MANAGEMENT ══════ */}
      <section className="wb-section" ref={wbSectionRef}>
        <div className="wb-section-inner">
          <div className="wb-section-header">
            <h2 className="wb-section-title">Session Management</h2>
            <p className="wb-section-sub">Create, revisit, or join a canvas</p>
          </div>

          <div className="wb-session-grid">
            {/* create */}
            <div className="wb-session-card wb-create-card">
              <div className="wb-sc-border-glow" />
              <div className="wb-sc-icon"><Plus size={26}/></div>
              <h3 className="wb-sc-title">New Board</h3>
              <p className="wb-sc-desc">Pick a template and start a fresh canvas</p>
              <div className="wb-tpl-mini">
                {TEMPLATES.map(t => (
                  <button key={t.id} className={`wb-tpl-mini-btn ${selectedTpl === t.id ? 'active' : ''}`}
                    style={{ '--tpl-color': t.color }} onClick={() => setSelectedTpl(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="wb-sc-reveal">
                <span className="wb-sc-reveal-hint">Canvas opens instantly — draw, diagram, collaborate.</span>
              </div>
              <button className="wb-action-btn wb-create-btn" onClick={handleCreate} disabled={creatingRoom}>
                <Plus size={16}/> {creatingRoom ? 'Creating…' : 'Create Board'}
              </button>
            </div>

            {/* join */}
            <div className="wb-session-card wb-join-card">
              <div className="wb-sc-border-glow" />
              <div className="wb-sc-icon wb-sc-icon--blue"><Users size={26}/></div>
              <h3 className="wb-sc-title">Join a Room</h3>
              <p className="wb-sc-desc">Paste the room code shared by the host</p>
              <input className="wb-join-input" placeholder="Room code — e.g. A3BF91C2"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={10}
                disabled={joining}/>
              {joinError && (
                <p style={{ margin:'6px 0 0', fontSize:12, color:'#f87171', lineHeight:1.4 }}>{joinError}</p>
              )}
              <div className="wb-sc-reveal">
                <span className="wb-sc-reveal-hint">Room codes are 8 characters — ask your host for theirs.</span>
              </div>
              <button className="wb-action-btn wb-join-btn" onClick={handleJoin}
                disabled={!joinCode.trim() || joining}>
                {joining
                  ? <><span style={{display:'inline-block',animation:'spin .8s linear infinite',marginRight:6}}>⟳</span>Joining…</>
                  : <><ChevronRight size={16}/> Join Now</>}
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
                <span className="wb-online-badge">{members.length} online</span>
              </div>
              <ul className="wb-member-list">
                {members.map(m => (
                  <li key={m.userId} className="wb-member-row">
                    <div className="wb-member-avatar" style={{ background: m.color }}>
                      {getInitials(m.displayName)}
                      <span className="wb-member-dot wb-member-dot--online"/>
                    </div>
                    <div className="wb-member-info">
                      <span className="wb-member-name">{m.displayName}{m.userId === userId ? ' (You)' : ''}</span>
                      <span className="wb-member-sl wb-member-sl--online">online</span>
                    </div>
                    <div className="wb-member-right">
                      {m.isHost
                        ? <span className="wb-role-owner"><Crown size={11}/> Host</span>
                        : <button className={`wb-perm-toggle ${memberPerms[m.userId] === 'Editor' ? 'editor' : 'viewer'}`}
                            onClick={() => cyclePerm(m.userId)}>
                            {memberPerms[m.userId] === 'Editor' ? <><Edit3 size={11}/> Editor</> : <><Eye size={11}/> Viewer</>}
                          </button>
                      }
                    </div>
                  </li>
                ))}
              </ul>
              {currentRoomCode && (
                <button className="wb-invite-btn-row" onClick={() => setInviteOpen(true)}>
                  <UserPlus size={14}/> Invite a User
                </button>
              )}
            </div>

            {/* invitations */}
            <div className="wb-collab-card">
              <div className="wb-collab-card-header">
                <UserPlus size={16}/><span>Invitations</span>
                {pendingInvites.length > 0 && (
                  <span className="wb-online-badge" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                    {pendingInvites.length} pending
                  </span>
                )}
              </div>
              
              {pendingInvites.length === 0 ? (
                <div className="wb-no-invites">
                  <div className="wb-no-invites-icon">📭</div>
                  <p className="wb-no-invites-text">No pending invitations</p>
                  <p className="wb-no-invites-hint">You'll see invites from other users here</p>
                </div>
              ) : (
                <ul className="wb-invite-list">
                  {pendingInvites.map(inv => (
                    <li key={inv.roomCode} className="wb-invite-item">
                      <div className="wb-invite-item-avatar">
                        {getInitials(inv.hostName)}
                      </div>
                      <div className="wb-invite-item-content">
                        <div className="wb-invite-item-info">
                          <strong className="wb-invite-host">{inv.hostName}</strong>
                          <span className="wb-invite-label">invited you to join</span>
                        </div>
                        <div className="wb-invite-item-meta">
                          <code className="wb-invite-room-code">{inv.roomCode}</code>
                          <span className="wb-invite-template">• {inv.template}</span>
                        </div>
                        <div className="wb-invite-item-actions">
                          <button
                            className="wb-invite-accept-btn"
                            onClick={() => handleAcceptInvite(inv)}
                            title="Accept and join board"
                          >
                            <CheckCircle size={13} /> Accept
                          </button>
                          <button
                            className="wb-invite-decline-btn"
                            onClick={() => handleRejectInvite(inv)}
                            title="Decline invitation"
                          >
                            <XCircle size={13} /> Decline
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* share */}
            <div className="wb-collab-card">
              <div className="wb-collab-card-header">
                <Share2 size={16}/><span>Share & Invite</span>
              </div>

              {currentRoomCode && (
                <div className="wb-share-block">
                  <label className="wb-share-label"><Link2 size={13}/> Room Code</label>
                  <div className="wb-share-link-row">
                    <span className="wb-share-link-text" style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }}>{currentRoomCode}</span>
                    <button className="wb-copy-pill" onClick={() => handleCopy(currentRoomCode)}>
                      {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
                    </button>
                  </div>
                </div>
              )}
              {!currentRoomCode && (
                <div className="wb-share-block">
                  <p className="wb-share-note">ℹ️ Create a board first — a unique room code will appear here for sharing.</p>
                </div>
              )}

              <div className="wb-share-block">
                <label className="wb-share-label"><Hash size={13}/> Invite by User ID</label>
                <div className="wb-email-row">
                  <input
                    className="wb-email-input"
                    placeholder="e.g. @user1234 or user ID"
                    value={inviteTarget}
                    onChange={e => setInviteTarget(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleDirectInvite()}
                    disabled={inviteStatus === 'sending' || inviteStatus === 'sent'}
                  />
                  <button
                    className={`wb-send-btn wb-send-btn--${inviteStatus}`}
                    disabled={!inviteTarget.trim() || inviteStatus === 'sending' || inviteStatus === 'sent'}
                    onClick={handleDirectInvite}
                  >
                    {inviteStatus === 'sending' && (
                      <span className="wb-send-spinner" />
                    )}
                    {inviteStatus === 'sent' && (
                      <>
                        <span className="wb-send-plane">✈</span>
                        <CheckCircle size={13} className="wb-send-check" />
                        Sent!
                      </>
                    )}
                    {inviteStatus === 'error' && (
                      <><XCircle size={13}/> Failed</>
                    )}
                    {(inviteStatus === 'idle' || !inviteStatus) && (
                      <><UserPlus size={13}/> Invite</>
                    )}
                  </button>
                </div>
              </div>

              <div className="wb-share-block">
                <label className="wb-share-label"><Shield size={13}/> Your User ID</label>
                <div className="wb-share-link-row">
                  <span className="wb-share-link-text" style={{ fontFamily: 'monospace', fontSize: 13 }}>{userId}</span>
                  <button
                    className={`wb-copy-pill${copiedUserId ? ' wb-copy-pill--copied' : ''}`}
                    onClick={() => { navigator.clipboard.writeText(userId); setCopiedUserId(true); setTimeout(() => setCopiedUserId(false), 2200); }}
                  >
                    {copiedUserId
                      ? <><Check size={12}/> Copied!</>
                      : <><Copy size={12}/> Copy</>}
                  </button>
                </div>
                <p className="wb-share-note">Share this ID so others can invite you to their boards.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer/>
    </div>
  );
}