import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Pencil, Square, Circle, Type, Minus, Eraser,
  Download, Trash2, Undo, Redo,
  ChevronLeft, ChevronRight, ArrowLeft, Hand,
  ZoomIn, ZoomOut, Maximize2, MousePointer2,
  Copy, Check, Users, Link2,
} from 'lucide-react';
import '../styles/WhiteboardCanvas.css';
import DatabaseBoard from './DatabaseBoard';
import ComponentTree from './ComponentTree';
import socket from '../socket';
import { useAuth } from '../contexts/AuthContext';

/* ─── Template painters ──────────────────────────────── */
const TEMPLATE_LABEL = {
  blank:  'Blank Canvas',
  schema: 'Database Schema',
  react:  'React Component Tree',
};

const BRAND = '#8b5cf6';
const DARK  = '#1e293b';
const CANVAS_W = 4000;
const CANVAS_H = 2800;

function drawBlank(ctx, w, h) {
  // faint dot grid
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(139,92,246,0.25)';
  for (let x = 32; x < w; x += 32)
    for (let y = 32; y < h; y += 32)
      ctx.fillRect(x, y, 2, 2);
}

function drawTable(ctx, x, y, title, cols, accent = BRAND) {
  const TW = 200, RH = 30, HH = 36;
  const th = HH + cols.length * RH;
  // shadow
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 16;
  // header
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(x, y, TW, HH, [8, 8, 0, 0]);
  ctx.fill();
  ctx.shadowBlur = 0;
  // body bg
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y + HH, TW, cols.length * RH, [0, 0, 8, 8]);
  ctx.fill();
  ctx.stroke();
  // header text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + TW / 2, y + HH / 2);
  // rows
  cols.forEach((col, i) => {
    const ry = y + HH + i * RH;
    ctx.strokeStyle = 'rgba(139,92,246,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + TW, ry); ctx.stroke();
    ctx.fillStyle = col.pk ? '#fbbf24' : col.fk ? '#60a5fa' : '#cbd5e1';
    ctx.font = `${col.pk || col.fk ? 'bold' : 'normal'} 12px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`${col.pk ? '🔑 ' : col.fk ? '🔗 ' : '   '}${col.name}`, x + 10, ry + RH / 2);
    ctx.fillStyle = '#475569';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(col.type, x + TW - 8, ry + RH / 2);
  });
  return { cx: x + TW / 2, cy: y + HH / 2, right: x + TW, left: x, midY: y + th / 2 };
}

function drawSchema(ctx, w, h) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  // grid
  ctx.strokeStyle = 'rgba(139,92,246,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  const cx = w / 2, cy = h / 2;
  // users table (left)
  const usersT = drawTable(ctx, cx - 480, cy - 110, '👤  users', [
    { name: 'id',         type: 'INT',      pk: true  },
    { name: 'username',   type: 'VARCHAR'             },
    { name: 'email',      type: 'VARCHAR'             },
    { name: 'role',       type: 'ENUM'                },
    { name: 'created_at', type: 'TIMESTAMP'           },
  ], '#7c3aed');

  // posts table (center)
  const postsT = drawTable(ctx, cx - 100, cy - 148, '📝  posts', [
    { name: 'id',         type: 'INT',      pk: true  },
    { name: 'user_id',    type: 'INT',      fk: true  },
    { name: 'title',      type: 'VARCHAR'             },
    { name: 'body',       type: 'TEXT'                },
    { name: 'status',     type: 'ENUM'                },
    { name: 'created_at', type: 'TIMESTAMP'           },
  ], '#2563eb');

  // comments table (right)
  const commentsT = drawTable(ctx, cx + 180, cy - 100, '💬  comments', [
    { name: 'id',         type: 'INT',      pk: true  },
    { name: 'post_id',    type: 'INT',      fk: true  },
    { name: 'user_id',    type: 'INT',      fk: true  },
    { name: 'body',       type: 'TEXT'                },
    { name: 'created_at', type: 'TIMESTAMP'           },
  ], '#059669');

  // relation lines
  function arrow(x1, y1, x2, y2, label) {
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 6);
    }
  }
  arrow(usersT.right, usersT.midY, postsT.left, postsT.midY, '1 → N');
  arrow(postsT.right, postsT.midY, commentsT.left, commentsT.midY, '1 → N');

  // title
  ctx.fillStyle = 'rgba(139,92,246,0.6)';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DATABASE SCHEMA · ERD', 24, 28);
}

function drawBox(ctx, x, y, w, h, label, sub, accent = BRAND) {
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 - (sub ? 6 : 0));
  if (sub) {
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText(sub, x + w / 2, y + h / 2 + 8);
  }
  return { cx: x + w / 2, cy: y + h / 2, top: y, bottom: y + h, left: x, right: x + w };
}

function drawLine(ctx, x1, y1, x2, y2, color = 'rgba(100,116,139,0.55)') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function drawReact(ctx, w, h) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 48) { ctx.strokeStyle='rgba(59,130,246,0.06)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

  const cx = w / 2, BW = 148, BH = 46, GAP_Y = 90;
  const y0 = h / 2 - GAP_Y * 1.8;

  // Layer 0 – App (root)
  const app = drawBox(ctx, cx - BW/2, y0, BW, BH, '<App />', 'root', '#7c3aed');

  // Layer 1 – Navbar | Router
  const nav = drawBox(ctx, cx - BW - 60, y0 + GAP_Y, BW, BH, '<Navbar />', 'layout', '#2563eb');
  const rtr = drawBox(ctx, cx + 60,       y0 + GAP_Y, BW, BH, '<Router />', 'provider', '#2563eb');
  drawLine(ctx, app.cx, app.bottom, nav.cx, nav.top);
  drawLine(ctx, app.cx, app.bottom, rtr.cx, rtr.top);

  // Layer 2 – three routes
  const pages = [
    { label: '<Home />', sub: '/home', accent: '#059669' },
    { label: '<Dashboard />', sub: '/dashboard', accent: '#059669' },
    { label: '<Profile />', sub: '/profile', accent: '#059669' },
  ];
  const totalW = pages.length * BW + (pages.length - 1) * 24;
  const pStarts = pages.map((_, i) => cx - totalW / 2 + i * (BW + 24));
  const y2 = y0 + GAP_Y * 2;
  const pageBoxes = pages.map((p, i) => {
    const b = drawBox(ctx, pStarts[i], y2, BW, BH, p.label, p.sub, p.accent);
    drawLine(ctx, rtr.cx, rtr.bottom, b.cx, b.top);
    return b;
  });

  // Layer 3 – children of Home
  const homeKids = [
    { label: '<Hero />', sub: 'section', accent: '#0891b2' },
    { label: '<Features />', sub: 'section', accent: '#0891b2' },
    { label: '<Footer />', sub: 'shared', accent: '#0891b2' },
  ];
  const hkW = homeKids.length * (BW - 20) + (homeKids.length - 1) * 16;
  const hkStart = pageBoxes[0].cx - hkW / 2;
  const y3 = y2 + GAP_Y;
  homeKids.forEach((k, i) => {
    const b = drawBox(ctx, hkStart + i * ((BW - 20) + 16), y3, BW - 20, BH - 6, k.label, k.sub, k.accent);
    drawLine(ctx, pageBoxes[0].cx, pageBoxes[0].bottom, b.cx, b.top);
  });

  ctx.fillStyle = 'rgba(59,130,246,0.6)';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('REACT COMPONENT TREE', 24, 28);
}

const TEMPLATE_DRAWERS = { blank: drawBlank, schema: drawSchema, react: drawReact };

/* ─────────────────────────────────────────────────── */

/* ── Route wrapper: delegates schema to DatabaseBoard ── */
const WhiteboardCanvas = () => {
  const { canvasId }   = useParams();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const templateParam  = searchParams.get('template');

  // If no template in URL yet, probe the server for the room's real template
  const [probing,    setProbing]    = useState(!templateParam);
  const [joinError,  setJoinError]  = useState(null); // null | string

  useEffect(() => {
    if (templateParam) return; // template already known — skip probe
    const userId      = user?._id || user?.id || user?.username
                        || localStorage.getItem('nexus_guest_id') || 'guest';
    const displayName = user?.name || user?.username
                        || user?.email?.split('@')[0] || userId;

    socket.emit('register_user', { userId, displayName });

    const onConfirmed = ({ template: tpl }) => {
      socket.off('error_msg', onError);
      navigate(`/whiteboard/${canvasId}?template=${tpl || 'blank'}`, { replace: true });
      setProbing(false);
    };
    const onError = (msg) => {
      socket.off('join_confirmed', onConfirmed);
      setJoinError(msg || `Room "${canvasId}" not found.`);
      setProbing(false);
    };

    socket.once('join_confirmed', onConfirmed);
    socket.once('error_msg',      onError);
    socket.emit('join_room', { roomCode: canvasId });

    return () => {
      socket.off('join_confirmed', onConfirmed);
      socket.off('error_msg',      onError);
    };
  }, [canvasId, templateParam, navigate, user]);

  // ── Error state: room not found ──────────────────────────────────── //
  if (joinError) {
    return (
      <div style={{ height:'100vh', background:'#0a0f1a', display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', color:'#f1f5f9',
                    fontFamily:'Inter,sans-serif', gap:16, textAlign:'center', padding:'0 24px' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <h2 style={{ margin:0, fontSize:20, color:'#f1f5f9' }}>Room Not Found</h2>
        <p style={{ margin:0, fontSize:14, color:'#94a3b8', maxWidth:360 }}>{joinError}</p>
        <p style={{ margin:0, fontSize:13, color:'#64748b' }}>
          The room may have expired — rooms are reset when the server restarts.
        </p>
        <button
          onClick={() => navigate('/whiteboard')}
          style={{ marginTop:8, padding:'10px 24px', background:'#7c3aed', color:'#fff',
                   border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 }}>
          ← Back to Lobby
        </button>
      </div>
    );
  }

  // ── Probing spinner ──────────────────────────────────────────────── //
  if (probing) {
    return (
      <div style={{ height:'100vh', background:'#0a0f1a', display:'flex',
                    alignItems:'center', justifyContent:'center', color:'#8b5cf6',
                    fontFamily:'Inter,sans-serif', gap:12 }}>
        <svg style={{animation:'spin 1s linear infinite'}} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </svg>
        Joining room…
      </div>
    );
  }

  const template = templateParam || 'blank';
  if (template === 'schema') return <DatabaseBoard canvasId={canvasId} />;
  if (template === 'react')  return <ComponentTree  canvasId={canvasId} />;
  return <WhiteboardCanvasInner canvasId={canvasId} template={template} />;
};

export default WhiteboardCanvas;

/* ── Main canvas (non-schema templates) ── */
function WhiteboardCanvasInner({ canvasId, template }) {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);

  /* sidebar */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen,   setRightOpen]   = useState(true);

  /* drawing */
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [color, setColor]               = useState('#8b5cf6');
  const [lineWidth, setLineWidth]       = useState(4);
  const isDrawing = useRef(false);

  /* ── socket / collab ── */
  const [remoteCursors, setRemoteCursors] = useState({});   // { userId: { x, y, displayName, color } }
  const [roomMembers,   setRoomMembers]   = useState([]);   // [{ userId, displayName, color, isHost }]
  const currentStrokeRef = useRef(null);    // { tool, color, lineWidth, points:[], start, end }
  const cursorThrottleRef = useRef(0);
  const roomCodeRef = useRef(canvasId);

  /* share */
  const [copiedCode, setCopiedCode] = useState(false);
  const copyRoomCode = () => {
    if (!canvasId) return;
    navigator.clipboard.writeText(canvasId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  /* view */
  const zoomRef = useRef(1);
  const panRef  = useRef({ x: 0, y: 0 });
  const [zoom, setZoomState] = useState(1);
  const [pan,  setPanState]  = useState({ x: 0, y: 0 });
  const setZoom = (z) => { zoomRef.current = z; setZoomState(z); };
  const setPan  = (p) => { panRef.current  = p; setPanState(p);  };

  /* pan drag */
  const isPanning = useRef(false);
  const panStart  = useRef(null);
  const spaceDown = useRef(false);

  /* undo / redo */
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const saveSnapshot = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    undoStack.current.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    const ctx = canvasRef.current.getContext('2d');
    redoStack.current.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
    ctx.putImageData(undoStack.current.pop(), 0, 0);
  }, []);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    const ctx = canvasRef.current.getContext('2d');
    undoStack.current.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
    ctx.putImageData(redoStack.current.pop(), 0, 0);
  }, []);

  /* shape preview */
  const snapshotRef = useRef(null);
  const drawStart   = useRef(null);  // { x, y } in canvas-space

  /* text tool */
  const [textPos, setTextPos] = useState(null);
  const [textVal, setTextVal] = useState('');
  // Refs so commitText always reads latest values (avoids stale-closure bugs)
  const textPosRef   = useRef(null);
  const textValRef   = useRef('');
  const colorRef     = useRef(color);
  const lineWidthRef = useRef(lineWidth);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { lineWidthRef.current = lineWidth; }, [lineWidth]);

  const commitText = useCallback(() => {
    const pos = textPosRef.current;
    const val = textValRef.current.trim();
    textPosRef.current = null;
    textValRef.current = '';
    setTextPos(null);
    setTextVal('');
    if (!pos || !val) return;
    const lw = lineWidthRef.current;
    const fontSize = Math.max(14, lw * 4 + 12);
    const element = {
      id: Date.now(),
      cx: pos.cx,
      cy: pos.cy,
      text: val,
      color: colorRef.current,
      fontSize,
    };
    setTextElements(prev => [...prev, element]);
    if (roomCodeRef.current) {
      socket.emit('add_text_element', { roomCode: roomCodeRef.current, element });
    }
  }, []);

  const cancelText = useCallback(() => {
    textPosRef.current = null;
    textValRef.current = '';
    setTextPos(null);
    setTextVal('');
  }, []);

  /* ── text element objects (selectable / movable / resizable) ── */
  const [textElements,    setTextElements]    = useState([]);
  const [selectedTextId,  setSelectedTextId]  = useState(null);
  const textElementsRef  = useRef([]);
  const textDragRef      = useRef(null);
  const selectedToolRef  = useRef(selectedTool);
  useEffect(() => { textElementsRef.current = textElements; }, [textElements]);
  useEffect(() => { selectedToolRef.current  = selectedTool; }, [selectedTool]);

  const handleTextObjMouseDown = useCallback((e, id) => {
    if (selectedToolRef.current !== 'select') return;
    e.stopPropagation();
    setSelectedTextId(id);
    const el = textElementsRef.current.find(t => t.id === id);
    if (!el) return;
    const drag = { id, startX: e.clientX, startY: e.clientY, startCx: el.cx, startCy: el.cy };
    textDragRef.current = drag;
    const onMove = (ev) => {
      const d = textDragRef.current;
      if (!d) return;
      const z  = zoomRef.current;
      setTextElements(prev => prev.map(t =>
        t.id === d.id
          ? { ...t, cx: d.startCx + (ev.clientX - d.startX) / z,
                    cy: d.startCy + (ev.clientY - d.startY) / z }
          : t
      ));
    };
    const onUp = () => {
      textDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const handleResizeStart = useCallback((e, id) => {
    if (selectedToolRef.current !== 'select') return;
    e.stopPropagation();
    const el = textElementsRef.current.find(t => t.id === id);
    if (!el) return;
    const startY = e.clientY;
    const startFontSize = el.fontSize;
    const onMove = (ev) => {
      const dy = (ev.clientY - startY) / zoomRef.current;
      setTextElements(prev => prev.map(t =>
        t.id === id ? { ...t, fontSize: Math.max(10, startFontSize + dy) } : t
      ));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const colors = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#f1f5f9','#0f172a'];

  const tools = [
    { name: 'select',    icon: <MousePointer2 size={18}/>, label: 'Select'    },
    { name: 'pencil',    icon: <Pencil size={18}/>,        label: 'Pencil'    },
    { name: 'eraser',    icon: <Eraser size={18}/>,        label: 'Eraser'    },
    { name: 'line',      icon: <Minus size={18}/>,         label: 'Line'      },
    { name: 'rectangle', icon: <Square size={18}/>,        label: 'Rectangle' },
    { name: 'circle',    icon: <Circle size={18}/>,        label: 'Circle'    },
    { name: 'text',      icon: <Type size={18}/>,          label: 'Text'      },
    { name: 'hand',      icon: <Hand size={18}/>,          label: 'Pan'       },
  ];

  /* draw template on mount */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    (TEMPLATE_DRAWERS[template] || drawBlank)(ctx, CANVAS_W, CANVAS_H);
    // fit canvas to viewport
    const vw = containerRef.current?.offsetWidth  || window.innerWidth;
    const vh = containerRef.current?.offsetHeight || window.innerHeight;
    const z  = Math.min(vw / CANVAS_W, vh / CANVAS_H) * 0.95;
    setZoom(z);
    setPan({ x: (vw - CANVAS_W * z) / 2, y: (vh - CANVAS_H * z) / 2 });
  }, [template]);

  /* keyboard: space = pan, Ctrl+Z/Y = undo/redo */
  useEffect(() => {
    const dn = (e) => {
      if (e.code === 'Space' && !e.target.closest?.('input,textarea')) { e.preventDefault(); spaceDown.current = true; }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); }
    };
    const up = (e) => { if (e.code === 'Space') { spaceDown.current = false; isPanning.current = false; } };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [undo, redo]);

  /* wheel zoom / scroll-pan */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const curZ   = zoomRef.current;
        const newZ   = Math.min(Math.max(curZ * factor, 0.08), 10);
        const rect   = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const cur = panRef.current;
        setZoom(newZ);
        setPan({ x: mx - (mx - cur.x) * newZ / curZ, y: my - (my - cur.y) * newZ / curZ });
      } else {
        const cur = panRef.current;
        setPan({ x: cur.x - e.deltaX, y: cur.y - e.deltaY });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ── replay a remote stroke on the canvas ── */
  const replayStroke = useCallback((stroke) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.save();
    if (stroke.tool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth   = stroke.lineWidth;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      (stroke.points || []).forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    } else if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.lineWidth * 4;
      ctx.lineCap   = 'round';
      ctx.lineJoin  = 'round';
      ctx.beginPath();
      (stroke.points || []).forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    } else if (stroke.tool === 'line') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth   = stroke.lineWidth;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.start.x, stroke.start.y);
      ctx.lineTo(stroke.end.x, stroke.end.y);
      ctx.stroke();
    } else if (stroke.tool === 'rectangle') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth   = stroke.lineWidth;
      ctx.beginPath();
      ctx.strokeRect(stroke.start.x, stroke.start.y,
        stroke.end.x - stroke.start.x, stroke.end.y - stroke.start.y);
    } else if (stroke.tool === 'circle') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth   = stroke.lineWidth;
      const rx = Math.abs(stroke.end.x - stroke.start.x) / 2;
      const ry = Math.abs(stroke.end.y - stroke.start.y) / 2;
      const cx = stroke.start.x + (stroke.end.x - stroke.start.x) / 2;
      const cy = stroke.start.y + (stroke.end.y - stroke.start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  /* ── socket: join room + real-time event listeners ── */
  useEffect(() => {
    if (!canvasId) return;
    // Solo canvases are local-only — skip all server socket operations
    if (canvasId.startsWith('solo_')) { roomCodeRef.current = null; return; }

    const userId        = user?._id || user?.id || user?.username
                          || localStorage.getItem('nexus_guest_id') || 'guest';
    const displayName   = user?.name || user?.username || user?.email?.split('@')[0] || userId;

    socket.emit('register_user', { userId, displayName });
    socket.emit('join_room', { roomCode: canvasId });
    roomCodeRef.current = canvasId;

    // Re-register + re-join if socket reconnects while canvas is open
    const onReconnect = () => {
      socket.emit('register_user', { userId, displayName });
      socket.emit('join_room', { roomCode: canvasId });
    };
    socket.on('connect', onReconnect);

    const onJoinConfirmed = ({ members, strokes, textEls, template: roomTemplate, yourColor }) => {
      // If we landed here without a template param, the wrapper already handled the redirect.
      // But if somehow the template still differs (e.g. direct URL with wrong template), fix it.
      if (roomTemplate && roomTemplate !== template) {
        navigate(`/whiteboard/${canvasId}?template=${roomTemplate}`, { replace: true });
        return;
      }
      if (yourColor) setRemoteCursors(prev => prev); // colour available for future use
      setRoomMembers(members || []);
      // Replay historical strokes (drawn by others before we joined)
      (strokes || []).forEach(s => replayStroke(s));
      // Add historical text elements
      if (textEls?.length) {
        setTextElements(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newEls = (textEls || []).filter(t => !existingIds.has(t.id));
          return [...prev, ...newEls];
        });
      }
    };

    const onRemoteStroke = ({ stroke }) => replayStroke(stroke);

    const onRemoteTextElement = ({ element }) => {
      setTextElements(prev =>
        prev.find(t => t.id === element.id) ? prev : [...prev, element]
      );
    };

    const onRemoteCursor = ({ userId: uid, displayName: dn, color: c, x, y }) => {
      setRemoteCursors(prev => ({ ...prev, [uid]: { displayName: dn, color: c, x, y } }));
      // Auto-remove cursor after 4 s of inactivity
      setTimeout(() => {
        setRemoteCursors(prev => {
          const next = { ...prev };
          delete next[uid];
          return next;
        });
      }, 4000);
    };

    const onUserJoined = ({ members: ms }) => setRoomMembers(ms || []);
    const onUserLeft   = ({ userId: uid, members: ms }) => {
      setRoomMembers(ms || []);
      setRemoteCursors(prev => { const n = { ...prev }; delete n[uid]; return n; });
    };
    const onYouWereRemoved = () => navigate('/whiteboard');
    const onErrorMsg = (msg) => console.warn('[WB socket]', msg);
    const onCanvasCleared = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) (TEMPLATE_DRAWERS[template] || drawBlank)(ctx, CANVAS_W, CANVAS_H);
      setTextElements([]);
      setSelectedTextId(null);
      undoStack.current = [];
      redoStack.current = [];
    };

    socket.on('join_confirmed',      onJoinConfirmed);
    socket.on('remote_stroke',       onRemoteStroke);
    socket.on('remote_text_element', onRemoteTextElement);
    socket.on('remote_cursor',       onRemoteCursor);
    socket.on('user_joined',         onUserJoined);
    socket.on('user_left',           onUserLeft);
    socket.on('you_were_removed',    onYouWereRemoved);
    socket.on('error_msg',           onErrorMsg);
    socket.on('canvas_cleared',      onCanvasCleared);

    return () => {
      socket.emit('leave_room', { roomCode: canvasId });
      socket.off('connect',            onReconnect);
      socket.off('join_confirmed',      onJoinConfirmed);
      socket.off('remote_stroke',       onRemoteStroke);
      socket.off('remote_text_element', onRemoteTextElement);
      socket.off('remote_cursor',       onRemoteCursor);
      socket.off('user_joined',         onUserJoined);
      socket.off('user_left',           onUserLeft);
      socket.off('you_were_removed',    onYouWereRemoved);
      socket.off('error_msg',           onErrorMsg);
      socket.off('canvas_cleared',      onCanvasCleared);
    };
  }, [canvasId, navigate, user, replayStroke]);

  /* canvas → world coordinates */
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (e.clientY - rect.top)  * (CANVAS_H / rect.height),
    };
  };

  /* pointer events */
  const onMouseDown = useCallback((e) => {
    if (e.button === 1 || spaceDown.current || selectedTool === 'hand') {
      isPanning.current = true;
      panStart.current  = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
      return;
    }
    if (e.button !== 0) return;
    // click on blank canvas — deselect any text element
    setSelectedTextId(null);

    const pos = getCanvasPos(e);

    // select tool: just deselect, no drawing
    if (selectedTool === 'select') return;

    // text tool: place overlay (commit any existing text first)
    if (selectedTool === 'text') {
      if (textPosRef.current) commitText();
      const cp = getCanvasPos(e);
      const anchor = { screenX: e.clientX, screenY: e.clientY, cx: cp.x, cy: cp.y };
      textPosRef.current = anchor;
      textValRef.current = '';
      setTextPos(anchor);
      setTextVal('');
      return;
    }

    saveSnapshot();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    if (selectedTool === 'line' || selectedTool === 'rectangle' || selectedTool === 'circle') {
      snapshotRef.current   = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      drawStart.current     = pos;
      currentStrokeRef.current = { tool: selectedTool, color, lineWidth, start: pos };
      return;
    }

    // pencil / eraser
    currentStrokeRef.current = { tool: selectedTool, color, lineWidth, points: [pos] };
    if (selectedTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineWidth = lineWidth * 4;
      ctx.lineCap   = 'round';
      ctx.lineJoin  = 'round';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth   = lineWidth;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
    }
  }, [selectedTool, color, lineWidth, saveSnapshot, commitText]);

  const onMouseMove = useCallback((e) => {
    // Throttled cursor broadcast
    const _now = Date.now();
    if (roomCodeRef.current && _now - cursorThrottleRef.current > 50) {
      cursorThrottleRef.current = _now;
      const _el = containerRef.current;
      if (_el) {
        const _r = _el.getBoundingClientRect();
        const _cx = (e.clientX - _r.left - panRef.current.x) / zoomRef.current;
        const _cy = (e.clientY - _r.top  - panRef.current.y) / zoomRef.current;
        socket.emit('cursor_move', { roomCode: roomCodeRef.current, x: _cx, y: _cy });
      }
    }
    if (isPanning.current) {
      const s = panStart.current;
      setPan({ x: s.px + (e.clientX - s.x), y: s.py + (e.clientY - s.y) });
      return;
    }
    if (!isDrawing.current) return;
    const { x, y } = getCanvasPos(e);
    const ctx = canvasRef.current.getContext('2d');

    if (snapshotRef.current && drawStart.current) {
      // shape preview: restore, then draw preview
      ctx.putImageData(snapshotRef.current, 0, 0);
      const sx = drawStart.current.x;
      const sy = drawStart.current.y;
      ctx.strokeStyle = color;
      ctx.lineWidth   = lineWidth;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      // track live end for emission on mouseUp
      if (currentStrokeRef.current) currentStrokeRef.current.end = { x, y };
      if (selectedTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (selectedTool === 'rectangle') {
        ctx.beginPath();
        ctx.strokeRect(sx, sy, x - sx, y - sy);
      } else if (selectedTool === 'circle') {
        const rx = Math.abs(x - sx) / 2;
        const ry = Math.abs(y - sy) / 2;
        const cx = sx + (x - sx) / 2;
        const cy = sy + (y - sy) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    // track point for broadcasting
    if (currentStrokeRef.current?.points) currentStrokeRef.current.points.push({ x, y });
  }, [selectedTool, color, lineWidth]);

  /* throttled cursor broadcast (emit at most every 50 ms) */

  const onMouseUp = useCallback(() => {
    const wasDrawing = isDrawing.current;
    isDrawing.current   = false;
    isPanning.current   = false;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').globalCompositeOperation = 'source-over';

    // Emit completed stroke to room
    if (wasDrawing && roomCodeRef.current && currentStrokeRef.current) {
      const stroke = currentStrokeRef.current;
      // For shapes where user just clicked (no drag), use start as end
      if (drawStart.current && !stroke.end) stroke.end = { ...drawStart.current };
      socket.emit('draw_stroke', { roomCode: roomCodeRef.current, stroke });
    }
    currentStrokeRef.current = null;
    snapshotRef.current = null;
    drawStart.current   = null;
  }, []);

  /* zoom helpers */
  const changeZoom = (delta) => {
    const curZ = zoomRef.current;
    const newZ = Math.min(Math.max(curZ + delta, 0.08), 10);
    const el   = containerRef.current;
    const vw   = el?.offsetWidth  || window.innerWidth;
    const vh   = el?.offsetHeight || window.innerHeight;
    const cx = vw / 2, cy = vh / 2;
    const cur = panRef.current;
    setZoom(newZ);
    setPan({ x: cx - (cx - cur.x) * newZ / curZ, y: cy - (cy - cur.y) * newZ / curZ });
  };

  const resetView = () => {
    const el = containerRef.current;
    const vw = el?.offsetWidth  || window.innerWidth;
    const vh = el?.offsetHeight || window.innerHeight;
    const z  = Math.min(vw / CANVAS_W, vh / CANVAS_H) * 0.95;
    setZoom(z);
    setPan({ x: (vw - CANVAS_W * z) / 2, y: (vh - CANVAS_H * z) / 2 });
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    (TEMPLATE_DRAWERS[template] || drawBlank)(ctx, CANVAS_W, CANVAS_H);
    setTextElements([]);
    setSelectedTextId(null);
    undoStack.current = [];
    redoStack.current = [];
    // Broadcast canvas clear to all collaborators in the room
    if (roomCodeRef.current) {
      socket.emit('clear_canvas', { roomCode: roomCodeRef.current });
    }
  };

  const downloadCanvas = () => {
    // composite text layer on top before exporting
    const composite = document.createElement('canvas');
    composite.width  = CANVAS_W;
    composite.height = CANVAS_H;
    const cctx = composite.getContext('2d');
    cctx.drawImage(canvasRef.current, 0, 0);
    textElementsRef.current.forEach(el => {
      cctx.font         = `bold ${el.fontSize}px Inter, sans-serif`;
      cctx.fillStyle    = el.color;
      cctx.textBaseline = 'middle';
      cctx.textAlign    = 'left';
      cctx.fillText(el.text, el.cx, el.cy);
    });
    const link = document.createElement('a');
    link.download = `board-${canvasId || 'nexus'}.png`;
    link.href = composite.toDataURL();
    link.click();
  };

  /* cursor */
  const cursor = selectedTool === 'hand' || spaceDown.current
    ? (isPanning.current ? 'grabbing' : 'grab')
    : selectedTool === 'select' ? 'default'
    : selectedTool === 'eraser' ? 'cell'
    : 'crosshair';

  return (
    <div className="wbc-root">

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`wbc-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="wbc-toggle" onClick={() => setSidebarOpen(v => !v)}
          title={sidebarOpen ? 'Collapse' : 'Expand'}>
          {sidebarOpen ? <ChevronLeft size={15}/> : <ChevronRight size={15}/>}
        </button>

        {sidebarOpen && <div className="wbc-sb-scroll">
          {/* back */}
          <button className="wbc-tool wbc-back" onClick={() => navigate('/whiteboard')} title="Back to lobby">
            <ArrowLeft size={16}/>
            <span>Back</span>
          </button>

          <div className="wbc-sep"/>

          {/* tools */}
          <p className="wbc-label">Tools</p>
          {tools.map(t => (
            <button key={t.name}
              className={`wbc-tool ${selectedTool === t.name ? 'active' : ''}`}
              onClick={() => setSelectedTool(t.name)} title={t.label}>
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}

          <div className="wbc-sep"/>

          {/* undo / redo */}
          <p className="wbc-label">History</p>
          <div className="wbc-undo-row">
            <button className="wbc-tool" onClick={undo} title="Undo (Ctrl+Z)">
              <Undo size={16}/><span>Undo</span>
            </button>
            <button className="wbc-tool" onClick={redo} title="Redo (Ctrl+Y)">
              <Redo size={16}/><span>Redo</span>
            </button>
          </div>

          <div className="wbc-sep"/>

          {/* colors */}
          <p className="wbc-label">Color</p>
          <div className="wbc-colors">
            {colors.map(c => (
              <button key={c}
                className={`wbc-dot ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)} title={c}/>
            ))}
          </div>

          {/* stroke */}
          <div className="wbc-sep"/>
          <p className="wbc-label">Stroke — {lineWidth}px</p>
          <input type="range" min="1" max="30" value={lineWidth}
            onChange={e => setLineWidth(+e.target.value)}
            className="wbc-slider"/>

          <div className="wbc-sep"/>

          {/* zoom */}
          <p className="wbc-label">Zoom</p>
          <div className="wbc-zoom-row">
            <button className="wbc-tool wbc-zoom-btn" onClick={() => changeZoom(-0.15)} title="Zoom out">
              <ZoomOut size={16}/>
            </button>
            <button className="wbc-zoom-pct" onClick={resetView} title="Fit to screen">
              {Math.round(zoom * 100)}%
            </button>
            <button className="wbc-tool wbc-zoom-btn" onClick={() => changeZoom(+0.15)} title="Zoom in">
              <ZoomIn size={16}/>
            </button>
          </div>
          <button className="wbc-tool" onClick={resetView} title="Fit to screen">
            <Maximize2 size={16}/><span>Fit Screen</span>
          </button>

          <div className="wbc-sep"/>

          {/* actions */}
          <p className="wbc-label">Actions</p>
          <button className="wbc-tool danger" onClick={clearCanvas} title="Reset canvas">
            <Trash2 size={16}/><span>Reset</span>
          </button>
          <button className="wbc-tool" onClick={downloadCanvas} title="Download PNG">
            <Download size={16}/><span>Download</span>
          </button>
        </div>}
      </aside>

      {/* ── CANVAS AREA ── */}
      <div ref={containerRef} className="wbc-canvas-area"
        style={{ cursor }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}>

        <div className="wbc-canvas-wrapper"
          style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          <canvas ref={canvasRef} className="wbc-canvas"/>

          {/* text elements: live in canvas-coordinate space, move/scale with canvas */}
          <div className="wbc-text-layer">
            {textElements.map(el => (
              <div
                key={el.id}
                className={`wbc-text-obj ${selectedTextId === el.id ? 'selected' : ''}`}
                style={{ left: el.cx, top: el.cy, fontSize: el.fontSize, color: el.color }}
                onMouseDown={e => handleTextObjMouseDown(e, el.id)}
              >
                {el.text}
                {selectedTextId === el.id && (
                  <div
                    className="wbc-text-resize"
                    title="Drag to resize"
                    onMouseDown={e => handleResizeStart(e, el.id)}
                  />
                )}
              </div>
            ))}
          </div>

        </div>

        {/* ── Remote cursors: screen-space overlay so they never scale with zoom ── */}
        <div className="wbc-remote-cursors" style={{ pointerEvents: 'none' }}>
          {Object.entries(remoteCursors).map(([uid, cur]) => {
            // Convert canvas-space coords → screen-space
            const sx = cur.x * zoom + pan.x;
            const sy = cur.y * zoom + pan.y;
            const raw = cur.displayName || 'Guest';
            const label = raw.length > 12 ? raw.slice(0, 11) + '…' : raw;
            return (
              <div key={uid} className="wbc-remote-cursor" style={{ left: sx, top: sy }}>
                <svg
                  width="16" height="20"
                  viewBox="0 0 24 28"
                  fill={cur.color}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))' }}
                >
                  <path d="M4 2 L4 22 L9 17 L13 26 L16 24.5 L12 15.5 L18 15.5 Z"/>
                  <path d="M4 2 L4 22 L9 17 L13 26 L16 24.5 L12 15.5 L18 15.5 Z"
                    fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
                </svg>
                <span className="wbc-remote-name" style={{ background: cur.color }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* text tool overlay */}
        {textPos && (
          <input
            className="wbc-text-input"
            autoFocus
            value={textVal}
            onChange={e => { setTextVal(e.target.value); textValRef.current = e.target.value; }}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); e.stopPropagation(); commitText(); }
              if (e.key === 'Escape') { e.stopPropagation(); cancelText(); }
            }}
            onMouseDown={e => e.stopPropagation()}
            style={{ left: textPos.screenX, top: textPos.screenY }}
            placeholder="Type & press Enter"
          />
        )}

        {/* HUD */}
        <div className="wbc-hud-tl">
          <span className="wbc-badge">{TEMPLATE_LABEL[template] || 'Canvas'}</span>
          {canvasId && !canvasId.startsWith('solo_') && (
            <button className="wbc-badge wbc-badge-btn" onClick={copyRoomCode} title="Click to copy room code">
              <Link2 size={10}/>&nbsp;{canvasId}&nbsp;
              {copiedCode ? <Check size={10}/> : <Copy size={10}/>}
            </button>
          )}
        </div>

        {/* Participants HUD (top-right) */}
        {roomMembers.length > 0 && (
          <div className="wbc-hud-tr">
            {roomMembers.slice(0, 6).map(m => (
              <div key={m.userId} className="wbc-hud-avatar" style={{ background: m.color }}
                title={`${m.displayName}${m.isHost ? ' (Host)' : ''}`}>
                {(m.displayName || '?')[0].toUpperCase()}
              </div>
            ))}
            {roomMembers.length > 6 && (
              <div className="wbc-hud-avatar wbc-hud-more">+{roomMembers.length - 6}</div>
            )}
          </div>
        )}

      </div>

      {/* ── RIGHT SIDEBAR: Room Code + Participants ── */}
      {canvasId && !canvasId.startsWith('solo_') && (
        <aside className={`wbc-rsidebar ${rightOpen ? 'open' : ''}`}>
          {/* toggle tab on the left edge */}
          <button className="wbc-rtoggle" onClick={() => setRightOpen(v => !v)}
            title={rightOpen ? 'Collapse' : 'Expand'}>
            {rightOpen ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}
          </button>

          {rightOpen && (
            <div className="wbc-rsb-scroll">
              {/* Room Code */}
              <p className="wbc-label" style={{ marginTop: 8 }}>
                <Link2 size={11}/>&nbsp;Room Code
              </p>
              <div className="wbc-room-code-box">
                <span className="wbc-room-code-text">{canvasId}</span>
                <button className="wbc-room-code-copy" onClick={copyRoomCode} title="Copy room code">
                  {copiedCode ? <><Check size={12}/>&nbsp;Copied!</> : <><Copy size={12}/>&nbsp;Copy</>}
                </button>
              </div>
              <p className="wbc-room-hint">Share this code so others can join</p>

              <div className="wbc-sep" style={{ margin: '8px 0' }}/>

              {/* Participants */}
              <p className="wbc-label">
                <Users size={11}/>&nbsp;Participants
                <span className="wbc-rsb-count">{roomMembers.length}</span>
              </p>

              <ul className="wbc-sb-members" style={{ marginTop: 4 }}>
                {roomMembers.map(m => (
                  <li key={m.userId} className="wbc-sb-member">
                    <span className="wbc-rsb-avatar" style={{ background: m.color }}>
                      {(m.displayName || '?')[0].toUpperCase()}
                    </span>
                    <div className="wbc-rsb-info">
                      <span className="wbc-sb-name">
                        {m.displayName.length > 14 ? m.displayName.slice(0, 13) + '…' : m.displayName}
                      </span>
                      {m.isHost && <span className="wbc-rsb-host">Host 👑</span>}
                    </div>
                    <span className="wbc-rsb-online"/>
                  </li>
                ))}
                {roomMembers.length === 0 && (
                  <li className="wbc-rsb-empty">No one here yet</li>
                )}
              </ul>
            </div>
          )}
        </aside>
      )}

    </div>
  );
}
