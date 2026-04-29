// 
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Download, Link2, X, ChevronLeft, ChevronRight,
  Cpu, Monitor, Layers, RefreshCw, Eye, EyeOff, FolderPlus, FileCode,
  MousePointer2, ZoomIn, ZoomOut, Maximize2, GitBranch, Code2, Package,
  CheckSquare, Copy, Users, Check,
} from 'lucide-react';
import '../styles/ComponentTree.css';
import socket from '../socket';
import { useAuth } from '../contexts/AuthContext';

/* ─── constants ──────────────────────────────────── */
const GRID   = 20;
const CARD_W = 270;
const snap   = v => Math.round(v / GRID) * GRID;

const HOOK_COLORS = {
  useState: '#61DAFB', useEffect: '#f59e0b', useContext: '#a78bfa',
  useRef: '#10b981',   useMemo: '#ec4899',   useCallback: '#3b82f6',
  useReducer: '#f97316', useLayoutEffect: '#e11d48',
};
const COMMON_HOOKS = Object.keys(HOOK_COLORS);
const COMP_TYPES   = { smart: { label: 'Container', color: '#61DAFB', icon: '⚡' }, dumb: { label: 'Presentational', color: '#a78bfa', icon: '🎨' } };
const FOLDERS      = ['Layout', 'Common', 'Features', 'Pages', 'Hooks'];

/* ─── id helper ──────────────────────────────────── */
let _cid = 1;
const uid = () => `cid_${_cid++}`;

/* ─── initial data ───────────────────────────────── */
const INIT_COMPONENTS = [
  {
    id: uid(), name: 'App', type: 'smart',
    x: snap(340), y: snap(60),
    props: [], state: ['user', 'isLoading'],
    hooks: ['useState', 'useEffect'],
    folder: 'Layout', color: '#61DAFB',
  },
  {
    id: uid(), name: 'Navbar', type: 'dumb',
    x: snap(60), y: snap(320),
    props: ['user', 'onLogout'],
    state: [],
    hooks: [],
    folder: 'Layout', color: '#a78bfa',
  },
  {
    id: uid(), name: 'Dashboard', type: 'smart',
    x: snap(380), y: snap(320),
    props: ['user'],
    state: ['data', 'filter'],
    hooks: ['useState', 'useContext', 'useEffect'],
    folder: 'Features', color: '#61DAFB',
  },
  {
    id: uid(), name: 'Button', type: 'dumb',
    x: snap(680), y: snap(320),
    props: ['label', 'onClick', 'variant'],
    state: [],
    hooks: [],
    folder: 'Common', color: '#a78bfa',
  },
];
const INIT_CONNECTIONS = [];
const INIT_PROVIDERS   = [];

/* ─── boilerplate generator ──────────────────────── */
function generateBoilerplate(comp, allComps, connections) {
  const children = connections
    .filter(c => c.type === 'parent-child' && c.fromId === comp.id)
    .map(c => allComps.find(a => a.id === c.toId))
    .filter(Boolean);

  const imports = [
    `import React${comp.hooks.includes('useState') ? ', { useState }' : comp.hooks.length ? `, { ${comp.hooks.join(', ')} }` : ''} from 'react';`,
    ...children.map(ch => `import ${ch.name} from './${ch.name}';`),
  ].join('\n');

  const propsDestructure = comp.props.length ? `{ ${comp.props.join(', ')} }` : '';
  const stateDecls = comp.state.map(s => `  const [${s}, set${s.charAt(0).toUpperCase() + s.slice(1)}] = useState(null);`).join('\n');
  const hooksDecls = comp.hooks.filter(h => h !== 'useState').map(h => `  // ${h} logic here`).join('\n');
  const childrenJsx = children.map(ch => {
    const propLines = connections
      .filter(c => c.type === 'prop' && c.fromId === comp.id && c.toId === ch.id)
      .map(c => `      ${c.toProp}={${c.fromState}}`).join('\n');
    return `    <${ch.name}\n${propLines || `      // add props`}\n    />`;
  }).join('\n');

  return `${imports}

export default function ${comp.name}(${propsDestructure}) {
${stateDecls ? stateDecls + '\n' : ''}${hooksDecls ? hooksDecls + '\n' : ''}
  return (
    <div className="${comp.name.toLowerCase()}-root">
${childrenJsx || '      {/* component content */}'}
    </div>
  );
}
`;
}

/* ─── layout algorithm ───────────────────────────── */
function autoLayout(components, connections) {
  const parentChildConns = connections.filter(c => c.type === 'parent-child');
  const childIds = new Set(parentChildConns.map(c => c.toId));
  const roots = components.filter(c => !childIds.has(c.id));
  const levels = new Map();
  const visited = new Set();

  function assignLevel(id, level) {
    if (visited.has(id)) return;
    visited.add(id);
    const cur = levels.get(id) ?? 0;
    levels.set(id, Math.max(cur, level));
    parentChildConns.filter(c => c.fromId === id).forEach(c => assignLevel(c.toId, level + 1));
  }
  roots.forEach(r => assignLevel(r.id, 0));
  components.forEach(c => { if (!levels.has(c.id)) levels.set(c.id, 0); });

  // group by level
  const byLevel = new Map();
  levels.forEach((lv, id) => {
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv).push(id);
  });

  const H_GAP = CARD_W + 60;
  const V_GAP = 260;
  const START_X = 60, START_Y = 60;

  return components.map(comp => {
    const lv  = levels.get(comp.id) ?? 0;
    const peers = byLevel.get(lv) || [comp.id];
    const idx  = peers.indexOf(comp.id);
    const totalW = peers.length * H_GAP - 60;
    const startX  = START_X + lv * 80; // slight offset per level for readability
    return {
      ...comp,
      x: snap(START_X + idx * H_GAP),
      y: snap(START_Y + lv * V_GAP),
    };
  });
}

/* ─── connection path helper ─────────────────────── */
function getCardHeight(comp) {
  let h = 52; // header
  if (comp.props.length)  h += 28 + comp.props.length * 24;
  if (comp.state.length)  h += 28 + comp.state.length * 24;
  if (comp.hooks.length)  h += 28 + 32;
  h += 8; // bottom padding
  return Math.max(h, 140);
}

function connectionPath(from, to, allComps) {
  const fc = allComps.find(c => c.id === from.fromId);
  const tc = allComps.find(c => c.id === from.toId);
  if (!fc || !tc) return '';
  const fx = fc.x + CARD_W / 2;
  const fy = fc.y + getCardHeight(fc);
  const tx = tc.x + CARD_W / 2;
  const ty = tc.y;
  const my = (fy + ty) / 2;
  return `M${fx},${fy} C${fx},${my} ${tx},${my} ${tx},${ty}`;
}

function propLinePath(conn, allComps) {
  const fc = allComps.find(c => c.id === conn.fromId);
  const tc = allComps.find(c => c.id === conn.toId);
  if (!fc || !tc) return '';
  const fx = fc.x + CARD_W;
  const fy = fc.y + 60 + (fc.state.indexOf(conn.fromState) + 0.5) * 24;
  const tx = tc.x;
  const ty = tc.y + 52 + (tc.props.indexOf(conn.toProp) + 0.5) * 24;
  const mx = (fx + tx) / 2;
  return `M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}`;
}

/* ════════════════════════════════════════════════
   ComponentTree component
════════════════════════════════════════════════ */
export default function ComponentTree({ canvasId }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ── collab state ── */
  const [roomMembers,   setRoomMembers]   = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [copiedCode,    setCopiedCode]    = useState(false);
  const [fileCopied,    setFileCopied]    = useState(false);
  const [rightOpen,     setRightOpen]     = useState(true);
  const hasJoinedRef      = useRef(false);
  const lastReceivedRef   = useRef(null);
  const broadcastTimerRef = useRef(null);
  const cursorThrottleRef = useRef(0);

  /* core state */
  const [components,   setComponents]   = useState(INIT_COMPONENTS);
  const [connections,  setConnections]  = useState(INIT_CONNECTIONS);
  const [providers,    setProviders]    = useState(INIT_PROVIDERS);

  /* ui state */
  const [tool,         setTool]         = useState('select');
  const [selectedId,   setSelectedId]   = useState(null);
  const [connectFrom,  setConnectFrom]  = useState(null);
  const [propDrag,     setPropDrag]     = useState(null);   // { fromId, fromState }
  const [connModal,    setConnModal]    = useState(null);   // { fromId, toId }
  const [propModal,    setPropModal]    = useState(null);   // { fromId, toId, fromState }
  const [clearModal,   setClearModal]   = useState(false);
  const [exportModal,  setExportModal]  = useState(false);
  const [exportTab,    setExportTab]    = useState(0);
  const [reRenderMode, setReRenderMode] = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [folderFilter, setFolderFilter] = useState(null);

  /* zoom / pan */
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x: 40, y: 40 });
  const zoomRef  = useRef(1);
  const panRef   = useRef({ x: 40, y: 40 });
  const setZ = z => { zoomRef.current = z; setZoom(z); };
  const setP = p => { panRef.current  = p; setPan(p);  };

  const containerRef = useRef(null);
  const isPanning    = useRef(false);
  const panStart     = useRef(null);
  const dragRef      = useRef(null);
  const spaceDown    = useRef(false);

  /* ── keyboard ── */
  useEffect(() => {
    const dn = e => {
      if (e.code === 'Space' && !e.target.closest('input,textarea')) {
        e.preventDefault(); spaceDown.current = true;
      }
      if (e.key === 'Escape') { setSelectedId(null); setConnectFrom(null); setConnModal(null); setPropModal(null); }
      if (e.key === 'Delete' && selectedId) {
        setComponents(prev => prev.filter(c => c.id !== selectedId));
        setConnections(prev => prev.filter(c => c.fromId !== selectedId && c.toId !== selectedId));
        setSelectedId(null);
      }
    };
    const up = e => { if (e.code === 'Space') spaceDown.current = false; };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [selectedId]);

  /* ── wheel zoom ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const f = e.deltaY > 0 ? 0.92 : 1.08;
        const nz = Math.min(Math.max(zoomRef.current * f, 0.15), 4);
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const cp = panRef.current;
        setZ(nz); setP({ x: mx - (mx - cp.x) * nz / zoomRef.current, y: my - (my - cp.y) * nz / zoomRef.current });
      } else {
        setP({ x: panRef.current.x - e.deltaX, y: panRef.current.y - e.deltaY });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ── socket: collab ── */
  useEffect(() => {
    if (!canvasId || canvasId.startsWith('solo_')) return;
    const userId      = user?._id || user?.id || user?.username || localStorage.getItem('nexus_guest_id') || 'guest';
    const displayName = user?.name || user?.username || user?.email?.split('@')[0] || userId;
    socket.emit('register_user', { userId, displayName });
    socket.emit('join_room', { roomCode: canvasId });
    const onReconnect = () => { socket.emit('register_user', { userId, displayName }); socket.emit('join_room', { roomCode: canvasId }); };
    socket.on('connect', onReconnect);
    const onJoinConfirmed = ({ members, boardData }) => {
      hasJoinedRef.current = true;
      setRoomMembers(members || []);
      if (boardData?.components || boardData?.connections) {
        const snap = JSON.stringify({ components: boardData.components || [], connections: boardData.connections || [], providers: boardData.providers || [] });
        lastReceivedRef.current = snap;
        if (boardData.components)  setComponents(boardData.components);
        if (boardData.connections) setConnections(boardData.connections);
        if (boardData.providers)   setProviders(boardData.providers);
      }
    };
    const onRemoteBoardState = ({ data }) => {
      lastReceivedRef.current = JSON.stringify({ components: data.components || [], connections: data.connections || [], providers: data.providers || [] });
      if (data.components)  setComponents(data.components);
      if (data.connections) setConnections(data.connections);
      if (data.providers)   setProviders(data.providers);
    };
    const onRemoteCursor = ({ userId: uid, displayName: dn, color: c, x, y }) => {
      setRemoteCursors(prev => ({ ...prev, [uid]: { displayName: dn, color: c, x, y } }));
      setTimeout(() => setRemoteCursors(prev => { const n = {...prev}; delete n[uid]; return n; }), 4000);
    };
    const onUserJoined     = ({ members: ms }) => setRoomMembers(ms || []);
    const onUserLeft       = ({ userId: uid, members: ms }) => { setRoomMembers(ms || []); setRemoteCursors(prev => { const n={...prev}; delete n[uid]; return n; }); };
    const onYouWereRemoved = () => navigate('/whiteboard');
    socket.on('join_confirmed',     onJoinConfirmed);
    socket.on('remote_board_state', onRemoteBoardState);
    socket.on('remote_cursor',      onRemoteCursor);
    socket.on('user_joined',        onUserJoined);
    socket.on('user_left',          onUserLeft);
    socket.on('you_were_removed',   onYouWereRemoved);
    return () => {
      socket.emit('leave_room', { roomCode: canvasId });
      socket.off('connect',           onReconnect);
      socket.off('join_confirmed',    onJoinConfirmed);
      socket.off('remote_board_state',onRemoteBoardState);
      socket.off('remote_cursor',     onRemoteCursor);
      socket.off('user_joined',       onUserJoined);
      socket.off('user_left',         onUserLeft);
      socket.off('you_were_removed',  onYouWereRemoved);
    };
  }, [canvasId, navigate, user]);

  /* ── broadcast board state on change (debounced 200ms) ── */
  useEffect(() => {
    if (!canvasId || canvasId.startsWith('solo_') || !hasJoinedRef.current) return;
    const current = JSON.stringify({ components, connections, providers });
    if (current === lastReceivedRef.current) { lastReceivedRef.current = null; return; }
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    broadcastTimerRef.current = setTimeout(() => {
      socket.emit('board_state', { roomCode: canvasId, data: { components, connections, providers } });
    }, 200);
    return () => clearTimeout(broadcastTimerRef.current);
  }, [components, connections, providers, canvasId]);

  /* ── board mousedown ── */
  const onBoardMouseDown = useCallback(e => {
    if (e.button === 1 || spaceDown.current) {
      isPanning.current = true;
      panStart.current  = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
      return;
    }
    if (e.button !== 0) return;
    if (tool === 'connect') { setConnectFrom(null); return; }
    setSelectedId(null);
    if (tool === 'add') {
      const rect = containerRef.current.getBoundingClientRect();
      const wx = snap((e.clientX - rect.left - panRef.current.x) / zoomRef.current);
      const wy = snap((e.clientY - rect.top  - panRef.current.y) / zoomRef.current);
      setComponents(prev => [...prev, {
        id: uid(), name: `Component${prev.length + 1}`, type: 'dumb',
        x: wx, y: wy, props: [], state: [], hooks: [], folder: 'Common', color: '#a78bfa',
      }]);
      setTool('select');
    }
  }, [tool]);

  const onBoardMouseMove = useCallback(e => {
    // throttled cursor broadcast
    const _now = Date.now();
    if (canvasId && !canvasId.startsWith('solo_') && _now - cursorThrottleRef.current > 50) {
      cursorThrottleRef.current = _now;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
        const cy = (e.clientY - rect.top  - panRef.current.y) / zoomRef.current;
        socket.emit('cursor_move', { roomCode: canvasId, x: cx, y: cy });
      }
    }
    if (isPanning.current) {
      const s = panStart.current;
      setP({ x: s.px + (e.clientX - s.x), y: s.py + (e.clientY - s.y) });
    }
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = (e.clientX - d.startX) / zoomRef.current;
      const dy = (e.clientY - d.startY) / zoomRef.current;
      setComponents(prev => prev.map(c =>
        c.id === d.id ? { ...c, x: snap(d.sx + dx), y: snap(d.sy + dy) } : c
      ));
    }
  }, []);

  const onBoardMouseUp = useCallback(() => {
    isPanning.current = false;
    dragRef.current   = null;
  }, []);

  /* ── card drag ── */
  const startDrag = useCallback((e, id) => {
    if (tool === 'connect') return;
    e.stopPropagation();
    const c = components.find(c => c.id === id);
    if (!c) return;
    setSelectedId(id);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, sx: c.x, sy: c.y };
  }, [tool, components]);

  /* ── connect tool ── */
  const handleCardClick = useCallback((e, id) => {
    if (tool !== 'connect') return;
    e.stopPropagation();
    if (!connectFrom) { setConnectFrom(id); return; }
    if (connectFrom === id) { setConnectFrom(null); return; }
    setConnModal({ fromId: connectFrom, toId: id });
    setConnectFrom(null);
  }, [tool, connectFrom]);

  /* ── confirm connection type ── */
  const confirmConnection = useCallback((type) => {
    const { fromId, toId } = connModal;
    const exists = connections.some(c => c.fromId === fromId && c.toId === toId && c.type === type);
    if (!exists) {
      if (type === 'prop') {
        setPropModal({ fromId, toId });
        setConnModal(null);
        return;
      }
      setConnections(prev => [...prev, { id: uid(), fromId, toId, type }]);
    }
    setConnModal(null);
    setTool('select');
  }, [connModal, connections]);

  /* ── confirm prop connection ── */
  const confirmPropConn = useCallback((fromState, toProp) => {
    const { fromId, toId } = propModal;
    const exists = connections.some(c => c.fromId === fromId && c.toId === toId && c.fromState === fromState && c.toProp === toProp);
    if (!exists) {
      setConnections(prev => [...prev, { id: uid(), fromId, toId, type: 'prop', fromState, toProp }]);
    }
    setPropModal(null);
    setTool('select');
  }, [propModal, connections]);

  /* ── update component field ── */
  const updateComp = useCallback((id, field, value) => {
    setComponents(prev => prev.map(c => {
      if (c.id !== id) return c;
      // if renaming a state var, propagate to prop connections
      if (field === 'renameState') {
        const { oldName, newName } = value;
        setConnections(cc => cc.map(conn =>
          conn.fromId === id && conn.fromState === oldName ? { ...conn, fromState: newName } : conn
        ));
        return { ...c, state: c.state.map(s => s === oldName ? newName : s) };
      }
      return { ...c, [field]: value };
    }));
  }, []);

  /* ── auto-layout ── */
  const runAutoLayout = useCallback(() => {
    setComponents(prev => autoLayout(prev, connections));
  }, [connections]);

  /* ── zoom helpers ── */
  const changeZoom = d => {
    const nz = Math.min(Math.max(zoomRef.current + d, 0.15), 4);
    const el = containerRef.current;
    const vw = el?.offsetWidth || 900, vh = el?.offsetHeight || 600;
    setZ(nz);
    setP({ x: vw/2 - (vw/2 - panRef.current.x) * nz / zoomRef.current, y: vh/2 - (vh/2 - panRef.current.y) * nz / zoomRef.current });
  };
  const resetView = () => { setZ(1); setP({ x: 40, y: 40 }); };

  /* ── re-render highlighted ids ── */
  const reRenderIds = useMemo(() => {
    if (!reRenderMode || !selectedId) return new Set();
    const result = new Set();
    const queue = [selectedId];
    while (queue.length) {
      const cur = queue.shift();
      connections.filter(c => c.type === 'parent-child' && c.fromId === cur).forEach(c => {
        if (!result.has(c.toId)) { result.add(c.toId); queue.push(c.toId); }
      });
    }
    return result;
  }, [reRenderMode, selectedId, connections]);

  /* ── display components (filtered by folder) ── */
  const visibleComps = useMemo(() =>
    folderFilter ? components.filter(c => c.folder === folderFilter) : components
  , [components, folderFilter]);

  const visibleIds = useMemo(() => new Set(visibleComps.map(c => c.id)), [visibleComps]);

  /* ── export boilerplate ── */
  const exportFiles = useMemo(() => components.map(c => ({
    name: `${c.name}.jsx`,
    code: generateBoilerplate(c, components, connections),
  })), [components, connections]);

  const downloadAll = () => {
    exportFiles.forEach(f => {
      const blob = new Blob([f.code], { type: 'text/javascript' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = f.name; a.click();
      URL.revokeObjectURL(url);
    });
  };

  const boardCursor = spaceDown.current ? 'grab'
    : tool === 'add'     ? 'crosshair'
    : tool === 'connect' ? 'cell'
    : 'default';

  const SVG_W = 4000, SVG_H = 3000;

  /* ── folder colors ── */
  const FOLDER_COLORS = { Layout: '#61DAFB', Common: '#a78bfa', Features: '#10b981', Pages: '#f59e0b', Hooks: '#ec4899' };

  return (
    <div className="ct-root">

      {/* ──── SIDEBAR ──── */}
      <aside className={`ct-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="ct-toggle" onClick={() => setSidebarOpen(v => !v)} title={sidebarOpen ? 'Collapse' : 'Expand'}>
          {sidebarOpen ? <ChevronLeft size={15}/> : <ChevronRight size={15}/>}
        </button>

        {sidebarOpen && <div className="ct-sb-scroll">
          <button className="ct-tool" onClick={() => navigate('/whiteboard')}>
            <ArrowLeft size={14}/><span>Back</span>
          </button>
          <div className="ct-sep"/>

          <p className="ct-label">Tools</p>
          {[
            { name: 'select',  icon: <MousePointer2 size={14}/>, label: 'Select' },
            { name: 'add',     icon: <Plus size={14}/>,          label: 'Add Component' },
            { name: 'connect', icon: <Link2 size={14}/>,         label: 'Connect' },
          ].map(t => (
            <button key={t.name} className={`ct-tool ${tool === t.name ? 'active' : ''}`}
              onClick={() => { setTool(t.name); setConnectFrom(null); }}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}

          <div className="ct-sep"/>
          <p className="ct-label">View</p>
          <button className={`ct-tool ${reRenderMode ? 'active' : ''}`} onClick={() => setReRenderMode(v => !v)}>
            {reRenderMode ? <Eye size={14}/> : <EyeOff size={14}/>}
            <span>Re-render Overlay</span>
          </button>
          <button className="ct-tool" onClick={runAutoLayout}>
            <GitBranch size={14}/><span>Auto Layout</span>
          </button>

          <div className="ct-sep"/>
          <p className="ct-label">Folders</p>
          <button className={`ct-tool ${!folderFilter ? 'active' : ''}`} onClick={() => setFolderFilter(null)}>
            <Layers size={14}/><span>All</span>
          </button>
          {FOLDERS.map(f => (
            <button key={f} className={`ct-tool ${folderFilter === f ? 'active' : ''}`}
              onClick={() => setFolderFilter(folderFilter === f ? null : f)}>
              <span className="ct-folder-dot" style={{ background: FOLDER_COLORS[f] }}/>
              <span>{f}</span>
            </button>
          ))}

          <div className="ct-sep"/>
          <p className="ct-label">Zoom</p>
          <div className="ct-zoom-row">
            <button className="ct-tool ct-zb" onClick={() => changeZoom(-0.15)}><ZoomOut size={13}/></button>
            <button className="ct-zoom-pct" onClick={resetView}>{Math.round(zoom * 100)}%</button>
            <button className="ct-tool ct-zb" onClick={() => changeZoom(+0.15)}><ZoomIn size={13}/></button>
          </div>
          <button className="ct-tool" onClick={resetView}><Maximize2 size={14}/><span>Fit</span></button>

          <div className="ct-sep"/>
          <p className="ct-label">Actions</p>
          <button className="ct-tool" onClick={() => { setExportModal(true); setExportTab(0); }}>
            <FileCode size={14}/><span>Export Boilerplate</span>
          </button>
          <button className="ct-tool danger" onClick={() => setClearModal(true)}>
            <Trash2 size={14}/><span>Clear Board</span>
          </button>
        </div>}
      </aside>

      {/* ──── CANVAS ──── */}
      <div
        ref={containerRef}
        className="ct-canvas-area"
        style={{ cursor: boardCursor }}
        onMouseDown={onBoardMouseDown}
        onMouseMove={onBoardMouseMove}
        onMouseUp={onBoardMouseUp}
        onMouseLeave={onBoardMouseUp}
      >
        <div
          className="ct-inner"
          style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {/* dot grid */}
          <svg className="ct-grid" width={SVG_W} height={SVG_H}>
            <defs>
              <pattern id="ct-dots" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <circle cx={GRID/2} cy={GRID/2} r="1.1" fill="rgba(97,218,251,0.18)"/>
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#ct-dots)"/>
          </svg>

          {/* connection lines SVG */}
          <svg className="ct-svg-conns" width={SVG_W} height={SVG_H}>
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#61DAFB" opacity="0.85"/>
              </marker>
              <marker id="arrow-prop" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#a78bfa" opacity="0.85"/>
              </marker>
            </defs>

            {connections.filter(c => c.type === 'parent-child' && visibleIds.has(c.fromId) && visibleIds.has(c.toId)).map(conn => {
              const d = connectionPath(conn, conn, visibleComps);
              return (
                <g key={conn.id} className="ct-conn-group" onClick={() => setConnections(prev => prev.filter(c => c.id !== conn.id))}>
                  <path d={d} className="ct-conn-hit"/>
                  <path d={d} className="ct-conn-line" markerEnd="url(#arrow)"/>
                </g>
              );
            })}

            {connections.filter(c => c.type === 'prop' && visibleIds.has(c.fromId) && visibleIds.has(c.toId)).map(conn => {
              const d = propLinePath(conn, visibleComps);
              const fromComp = components.find(c => c.id === conn.fromId);
              const toComp   = components.find(c => c.id === conn.toId);
              if (!fromComp || !toComp) return null;
              const fx = fromComp.x + CARD_W;
              const fy = fromComp.y + 60 + (fromComp.state.indexOf(conn.fromState) + 0.5) * 24;
              const tx = toComp.x;
              const ty = toComp.y + 52 + (toComp.props.indexOf(conn.toProp) + 0.5) * 24;
              return (
                <g key={conn.id} className="ct-conn-group" onClick={() => setConnections(prev => prev.filter(c => c.id !== conn.id))}>
                  <path d={d} className="ct-conn-hit"/>
                  <path d={d} className="ct-prop-line" markerEnd="url(#arrow-prop)"/>
                  {/* label midpoint */}
                  <text x={(fx + tx) / 2} y={(fy + ty) / 2 - 6} className="ct-prop-label">
                    {conn.fromState} → {conn.toProp}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* component cards */}
          {visibleComps.map(comp => (
            <ComponentCard
              key={comp.id}
              comp={comp}
              selected={selectedId === comp.id}
              connecting={connectFrom === comp.id}
              connectMode={tool === 'connect'}
              reRender={reRenderIds.has(comp.id)}
              folderColor={FOLDER_COLORS[comp.folder] || '#61DAFB'}
              onHeaderMouseDown={e => startDrag(e, comp.id)}
              onCardClick={e => handleCardClick(e, comp.id)}
              onUpdate={(field, value) => updateComp(comp.id, field, value)}
              onRemove={() => {
                setComponents(prev => prev.filter(c => c.id !== comp.id));
                setConnections(prev => prev.filter(c => c.fromId !== comp.id && c.toId !== comp.id));
              }}
            />
          ))}
        </div>

        {/* ── Remote cursors (screen-space) ── */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:25, overflow:'visible' }}>
          {Object.entries(remoteCursors).map(([uid, cur]) => {
            const sx = cur.x * zoom + pan.x;
            const sy = cur.y * zoom + pan.y;
            const label = (cur.displayName || 'Guest').length > 12
              ? (cur.displayName || 'Guest').slice(0, 11) + '…'
              : (cur.displayName || 'Guest');
            return (
              <div key={uid} style={{ position:'absolute', left:sx, top:sy, display:'flex', alignItems:'flex-start', gap:5, transform:'translate(-2px,-2px)', transition:'left .07s linear,top .07s linear', pointerEvents:'none' }}>
                <svg width="16" height="20" viewBox="0 0 24 28" fill={cur.color} style={{ filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.55))', flexShrink:0 }}>
                  <path d="M4 2 L4 22 L9 17 L13 26 L16 24.5 L12 15.5 L18 15.5 Z"/>
                  <path d="M4 2 L4 22 L9 17 L13 26 L16 24.5 L12 15.5 L18 15.5 Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
                </svg>
                <span style={{ fontSize:11, fontWeight:700, color:'#fff', padding:'2px 7px 3px', borderRadius:5, background:cur.color, whiteSpace:'nowrap', boxShadow:'0 2px 6px rgba(0,0,0,0.45)', fontFamily:'Inter,system-ui,sans-serif', marginTop:1 }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* connect hint */}
        {connectFrom && (
          <div className="ct-hint">
            <Link2 size={13}/>
            Connecting <strong>{components.find(c => c.id === connectFrom)?.name}</strong> — click target
            <button onClick={() => setConnectFrom(null)}><X size={12}/></button>
          </div>
        )}
        {tool === 'add' && (
          <div className="ct-hint"><Plus size={13}/> Click canvas to place component</div>
        )}

        {/* HUD */}
        <div className="ct-hud-tl">
          <span className="ct-badge">⚛ Component Tree</span>
          {canvasId && <span className="ct-badge dim">{canvasId}</span>}
          <span className="ct-badge">{components.length} components · {connections.length} connections</span>
          {reRenderMode && <span className="ct-badge glow">Re-render overlay ON</span>}
          {folderFilter && <span className="ct-badge folder">{folderFilter}</span>}
        </div>
      </div>

      {/* ──── RIGHT SIDEBAR: Room Code + Participants ──── */}
      {canvasId && !canvasId.startsWith('solo_') && (
        <aside className={`ct-rsidebar ${rightOpen ? 'open' : ''}`}>
          <button className="ct-rtoggle" onClick={() => setRightOpen(v => !v)}
            title={rightOpen ? 'Collapse' : 'Expand'}>
            {rightOpen ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}
          </button>
          {rightOpen && (
            <div className="ct-rsb-scroll">
              <p className="ct-label" style={{ marginTop:8 }}><Link2 size={11}/>&nbsp;Room Code</p>
              <div className="ct-rsb-code-box">
                <span className="ct-rsb-code-text">{canvasId}</span>
                <button className="ct-rsb-copy-btn" onClick={() => { navigator.clipboard.writeText(canvasId); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}>
                  {copiedCode ? <><Check size={12}/>&nbsp;Copied!</> : <><Copy size={12}/>&nbsp;Copy</>}
                </button>
              </div>
              <p className="ct-rsb-hint">Share so others can join</p>
              <div className="ct-sep" style={{ margin:'8px 0' }}/>
              <p className="ct-label">
                <Users size={11}/>&nbsp;Participants
                <span className="ct-rsb-count">{roomMembers.length}</span>
              </p>
              <ul className="ct-rsb-members">
                {roomMembers.map(m => (
                  <li key={m.userId} className="ct-rsb-member">
                    <span className="ct-rsb-avatar" style={{ background: m.color }}>
                      {(m.displayName || '?')[0].toUpperCase()}
                    </span>
                    <div className="ct-rsb-info">
                      <span className="ct-rsb-name">{m.displayName.length > 14 ? m.displayName.slice(0,13)+'…' : m.displayName}</span>
                      {m.isHost && <span className="ct-rsb-host">Host 👑</span>}
                    </div>
                    <span className="ct-rsb-online"/>
                  </li>
                ))}
                {roomMembers.length === 0 && <li className="ct-rsb-empty">No one here yet</li>}
              </ul>
            </div>
          )}
        </aside>
      )}

      {/* ──── CONNECT TYPE MODAL ──── */}
      {connModal && (
        <div className="ct-modal-backdrop" onClick={() => setConnModal(null)}>
          <div className="ct-modal" onClick={e => e.stopPropagation()}>
            <h3>Connection Type</h3>
            <p>
              <strong>{components.find(c => c.id === connModal.fromId)?.name}</strong>
              {' → '}
              <strong>{components.find(c => c.id === connModal.toId)?.name}</strong>
            </p>
            <div className="ct-modal-cards">
              <button className="ct-modal-card" onClick={() => confirmConnection('parent-child')}>
                <span className="ct-modal-icon">🌳</span>
                <span className="ct-modal-clabel">Parent → Child</span>
                <span className="ct-modal-cdesc">Hierarchy · renders child in JSX</span>
              </button>
              <button className="ct-modal-card" onClick={() => confirmConnection('prop')}>
                <span className="ct-modal-icon">📦</span>
                <span className="ct-modal-clabel">State → Prop</span>
                <span className="ct-modal-cdesc">Pass state as prop (animated flow)</span>
              </button>
            </div>
            <button className="ct-modal-cancel" onClick={() => setConnModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ──── PROP MAPPING MODAL ──── */}
      {propModal && (() => {
        const fromComp = components.find(c => c.id === propModal.fromId);
        const toComp   = components.find(c => c.id === propModal.toId);
        return (
          <div className="ct-modal-backdrop" onClick={() => setPropModal(null)}>
            <div className="ct-modal wide" onClick={e => e.stopPropagation()}>
              <h3>Map State → Prop</h3>
              <p>Drag a state variable from <strong>{fromComp?.name}</strong> to a prop of <strong>{toComp?.name}</strong></p>
              <div className="ct-prop-map">
                <div className="ct-prop-col">
                  <p className="ct-prop-col-label">State in {fromComp?.name}</p>
                  {fromComp?.state.length ? fromComp.state.map(s => (
                    <div key={s} className="ct-prop-chip state">{s}</div>
                  )) : <span className="ct-empty">No state defined</span>}
                </div>
                <div className="ct-prop-arrow">→</div>
                <div className="ct-prop-col">
                  <p className="ct-prop-col-label">Props of {toComp?.name}</p>
                  {toComp?.props.length ? toComp.props.map(p => (
                    <div key={p} className="ct-prop-chip prop">{p}</div>
                  )) : <span className="ct-empty">No props defined</span>}
                </div>
              </div>
              <div className="ct-prop-pairs">
                {fromComp?.state.map(s =>
                  toComp?.props.map(p => (
                    <button key={`${s}-${p}`} className="ct-pair-btn" onClick={() => confirmPropConn(s, p)}>
                      <span className="chip-state">{s}</span>
                      <span className="chip-arrow">→</span>
                      <span className="chip-prop">{p}</span>
                    </button>
                  ))
                )}
              </div>
              <button className="ct-modal-cancel" onClick={() => setPropModal(null)}>Cancel</button>
            </div>
          </div>
        );
      })()}

      {/* ──── EXPORT MODAL ──── */}
      {exportModal && (
        <div className="ct-modal-backdrop" onClick={() => setExportModal(false)}>
          <div className="ct-modal export" onClick={e => e.stopPropagation()}>
            <div className="ct-export-header">
              <FileCode size={15}/>
              <span>Boilerplate Export</span>
              <button className="ct-modal-x" onClick={() => setExportModal(false)}><X size={14}/></button>
            </div>
            <div className="ct-export-tabs">
              {exportFiles.map((f, i) => (
                <button key={f.name} className={`ct-export-tab ${exportTab === i ? 'active' : ''}`}
                  onClick={() => setExportTab(i)}>{f.name}</button>
              ))}
            </div>
            <pre className="ct-export-code">{exportFiles[exportTab]?.code}</pre>
            <div className="ct-export-actions">
              <button
                className={`ct-copy-btn ${fileCopied ? 'copied' : ''}`}
                onClick={() => { navigator.clipboard.writeText(exportFiles[exportTab]?.code || ''); setFileCopied(true); setTimeout(() => setFileCopied(false), 1500); }}
              >
                {fileCopied ? <Check size={13}/> : <Copy size={13}/>}
                {fileCopied ? 'Copied!' : 'Copy File'}
              </button>
              <button className="ct-download-btn" onClick={downloadAll}>
                <Download size={13}/> Download All Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── CLEAR MODAL ──── */}
      {clearModal && (
        <div className="ct-modal-backdrop" onClick={() => setClearModal(false)}>
          <div className="ct-modal" onClick={e => e.stopPropagation()}>
            <h3>Clear Board?</h3>
            <p>This removes all components and connections. Cannot be undone.</p>
            <div className="ct-modal-actions">
              <button className="ct-confirm-danger" onClick={() => {
                setComponents([]); setConnections([]); setProviders([]);
                setSelectedId(null); setConnectFrom(null); setClearModal(false);
              }}>Yes, Clear</button>
              <button className="ct-modal-cancel" onClick={() => setClearModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   ComponentCard sub-component
════════════════════════════════════════════════ */
function ComponentCard({ comp, selected, connecting, connectMode, reRender, folderColor, onHeaderMouseDown, onCardClick, onUpdate, onRemove }) {
  const [editingName,   setEditingName]   = useState(false);
  const [editingProp,   setEditingProp]   = useState(null);  // index
  const [editingState,  setEditingState]  = useState(null);  // index
  const typeInfo = COMP_TYPES[comp.type];

  const addProp  = () => onUpdate('props', [...comp.props, `prop${comp.props.length + 1}`]);
  const addState = () => onUpdate('state', [...comp.state, `state${comp.state.length + 1}`]);
  const toggleHook = h => onUpdate('hooks', comp.hooks.includes(h) ? comp.hooks.filter(x => x !== h) : [...comp.hooks, h]);

  return (
    <div
      className={`ct-card ${comp.type} ${selected ? 'selected' : ''} ${connecting ? 'connecting' : ''} ${reRender ? 'rerender' : ''}`}
      style={{ left: comp.x, top: comp.y, '--accent': typeInfo.color, '--folder-color': folderColor }}
      onMouseDown={e => { if (connectMode) e.stopPropagation(); }}
      onClick={onCardClick}
    >
      {/* ── header ── */}
      <div className="ct-card-header" style={{ borderTopColor: typeInfo.color }}
        onMouseDown={e => { if (!connectMode) onHeaderMouseDown(e); }}>
        <span className="ct-type-icon">{typeInfo.icon}</span>
        {editingName ? (
          <input
            className="ct-name-input" autoFocus defaultValue={comp.name}
            onBlur={e => { onUpdate('name', e.target.value.trim() || comp.name); setEditingName(false); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { onUpdate('name', e.target.value.trim() || comp.name); setEditingName(false); } }}
            onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="ct-card-name" onDoubleClick={e => { e.stopPropagation(); setEditingName(true); }}>
            {comp.name}
          </span>
        )}
        <span className={`ct-type-badge ${comp.type}`} onClick={e => { e.stopPropagation(); onUpdate('type', comp.type === 'smart' ? 'dumb' : 'smart'); }}>
          {typeInfo.label}
        </span>
        <button className="ct-card-remove" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onRemove(); }}>
          <X size={10}/>
        </button>
      </div>

      {/* ── folder badge ── */}
      <div className="ct-card-folder">
        <select
          value={comp.folder}
          onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
          onChange={e => onUpdate('folder', e.target.value)}
          style={{ '--f': folderColor }}
        >
          {FOLDERS.map(f => <option key={f}>{f}</option>)}
        </select>
      </div>

      {/* ── props ── */}
      <div className="ct-section">
        <div className="ct-section-head">
          <span className="ct-section-label">Props</span>
          <button className="ct-add-btn" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); addProp(); }}>
            <Plus size={9}/>
          </button>
        </div>
        {comp.props.map((p, i) => (
          <div key={i} className="ct-row prop-row">
            <span className="ct-row-dot prop"/>
            {editingProp === i ? (
              <input
                className="ct-row-input" autoFocus defaultValue={p}
                onBlur={e => { const v = e.target.value.trim() || p; onUpdate('props', comp.props.map((x,j) => j===i?v:x)); setEditingProp(null); }}
                onKeyDown={e => { if (e.key==='Enter'||e.key==='Escape'){const v=e.target.value.trim()||p;onUpdate('props',comp.props.map((x,j)=>j===i?v:x));setEditingProp(null);}}}
                onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="ct-row-name" onDoubleClick={e => { e.stopPropagation(); setEditingProp(i); }}>{p}</span>
            )}
            <button className="ct-row-del" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onUpdate('props',comp.props.filter((_,j)=>j!==i));}}>
              <X size={8}/>
            </button>
          </div>
        ))}
      </div>

      {/* ── state ── */}
      <div className="ct-section">
        <div className="ct-section-head">
          <span className="ct-section-label">State</span>
          <button className="ct-add-btn" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); addState(); }}>
            <Plus size={9}/>
          </button>
        </div>
        {comp.state.map((s, i) => (
          <div key={i} className="ct-row state-row">
            <span className="ct-row-dot state"/>
            {editingState === i ? (
              <input
                className="ct-row-input" autoFocus defaultValue={s}
                onBlur={e => { const v=e.target.value.trim()||s; onUpdate('renameState',{oldName:s,newName:v}); setEditingState(null); }}
                onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape'){const v=e.target.value.trim()||s;onUpdate('renameState',{oldName:s,newName:v});setEditingState(null);}}}
                onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="ct-row-name" onDoubleClick={e => { e.stopPropagation(); setEditingState(i); }}>{s}</span>
            )}
            <button className="ct-row-del" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onUpdate('state',comp.state.filter((_,j)=>j!==i));}}>
              <X size={8}/>
            </button>
          </div>
        ))}
      </div>

      {/* ── hooks ── */}
      <div className="ct-section">
        <div className="ct-section-head">
          <span className="ct-section-label">Hooks</span>
        </div>
        <div className="ct-hooks-grid">
          {COMMON_HOOKS.map(h => (
            <button
              key={h}
              className={`ct-hook-chip ${comp.hooks.includes(h) ? 'on' : ''}`}
              style={{ '--hc': HOOK_COLORS[h] }}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); toggleHook(h); }}
              title={h}
            >{h.replace('use', '')}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
