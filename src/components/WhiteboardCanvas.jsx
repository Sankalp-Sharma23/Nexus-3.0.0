import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Pencil, Square, Circle, Type, Minus, Eraser,
  Download, Trash2, Undo, Redo,
  ChevronLeft, ChevronRight, ArrowLeft, Hand,
  ZoomIn, ZoomOut, Maximize2, MousePointer2,
} from 'lucide-react';
import '../styles/WhiteboardCanvas.css';
import DatabaseBoard from './DatabaseBoard';
import ComponentTree from './ComponentTree';

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
  const template       = searchParams.get('template') || 'blank';
  if (template === 'schema') return <DatabaseBoard canvasId={canvasId} />;
  if (template === 'react')  return <ComponentTree  canvasId={canvasId} />;
  return <WhiteboardCanvasInner canvasId={canvasId} template={template} />;
};

export default WhiteboardCanvas;

/* ── Main canvas (non-schema templates) ── */
function WhiteboardCanvasInner({ canvasId, template }) {
  const navigate = useNavigate();
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);

  /* sidebar */
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* drawing */
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [color, setColor]               = useState('#8b5cf6');
  const [lineWidth, setLineWidth]       = useState(4);
  const isDrawing = useRef(false);

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
    setTextElements(prev => [...prev, {
      id: Date.now(),
      cx: pos.cx,
      cy: pos.cy,
      text: val,
      color: colorRef.current,
      fontSize,
    }]);
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
      snapshotRef.current = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      drawStart.current   = pos;
      return;
    }

    // pencil / eraser
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
  }, [selectedTool, color, lineWidth]);

  const onMouseUp = useCallback(() => {
    isDrawing.current   = false;
    isPanning.current   = false;
    snapshotRef.current = null;
    drawStart.current   = null;
    // always restore composite operation
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').globalCompositeOperation = 'source-over';
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
          {canvasId && <span className="wbc-badge dim">{canvasId}</span>}
        </div>
        <div className="wbc-hud-br">
          <span className="wbc-badge">{Math.round(zoom * 100)}%</span>
          <span className="wbc-hint">Ctrl+scroll to zoom · Space+drag to pan</span>
        </div>
      </div>

    </div>
  );
}
