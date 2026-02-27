import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Download, ChevronLeft, ChevronRight,
  Link2, Database, Code2, Key, Hash, AlignLeft, ZoomIn, ZoomOut,
  Maximize2, LayoutGrid, X, Check,
} from 'lucide-react';
import '../styles/DatabaseBoard.css';

/* ─── constants ──────────────────────────────────────── */
const GRID   = 20;
const TBL_W  = 230;
const ROW_H  = 34;
const HEAD_H = 44;
const FOOT_H = 34;
const TYPES  = ['INT','BIGINT','VARCHAR(255)','TEXT','BOOLEAN','TIMESTAMP','DECIMAL(10,2)','UUID','JSON','DATE'];

/* ─── id generator ───────────────────────────────────── */
let _id = 1;
const uid = () => `id_${_id++}`;

/* ─── snap to grid ───────────────────────────────────── */
const snap = v => Math.round(v / GRID) * GRID;

/* ─── table geometry helpers ─────────────────────────── */
const tableH  = t => HEAD_H + t.columns.length * ROW_H + FOOT_H;
const tableR  = t => ({ x: t.x, y: t.y, w: TBL_W, h: tableH(t) });

/* anchor points for connection lines (left/right mid) */
function getAnchors(t) {
  const r = tableR(t);
  return {
    left:  { x: r.x,         y: r.y + r.h / 2 },
    right: { x: r.x + r.w,   y: r.y + r.h / 2 },
    top:   { x: r.x + r.w/2, y: r.y            },
    bottom:{ x: r.x + r.w/2, y: r.y + r.h      },
  };
}

/* Manhattan path: exit one side, route with horizontal then vertical */
function manhattanPath(t1, t2) {
  const a1 = getAnchors(t1);
  const a2 = getAnchors(t2);
  const dx = t2.x - t1.x;
  const side1 = dx >= 0 ? a1.right : a1.left;
  const side2 = dx >= 0 ? a2.left  : a2.right;
  const mx = (side1.x + side2.x) / 2;
  return {
    d: `M${side1.x},${side1.y} L${mx},${side1.y} L${mx},${side2.y} L${side2.x},${side2.y}`,
    src: side1,
    dst: side2,
    srcDir: dx >= 0 ? 'right' : 'left',
    dstDir: dx >= 0 ? 'left'  : 'right',
  };
}

/* crow's foot symbol at a point, facing a direction */
function crowFoot(x, y, dir, cardinality, end /* 'src'|'dst' */) {
  const D  = 14; // arm length
  const OX = dir === 'left' ? -D : D;
  const OX2 = dir === 'left' ? -D*1.7 : D*1.7;
  const isMany = (end === 'src' && cardinality === 'N:M') ||
                 (end === 'dst' && (cardinality === '1:N' || cardinality === 'N:M'));
  const isOne  = !isMany;

  const elements = [];
  if (isOne) {
    // single bar
    elements.push(`M${x + OX},${y - 8} L${x + OX},${y + 8}`);
    // double bar for mandatory
    elements.push(`M${x + OX*0.5},${y - 8} L${x + OX*0.5},${y + 8}`);
  } else {
    // crow's foot (3 diverging lines)
    elements.push(`M${x},${y} L${x + OX},${y - 9}`);
    elements.push(`M${x},${y} L${x + OX},${y}`);
    elements.push(`M${x},${y} L${x + OX},${y + 9}`);
    // bar
    elements.push(`M${x + OX2},${y - 8} L${x + OX2},${y + 8}`);
  }
  return elements;
}

/* ─── SQL generator ──────────────────────────────────── */
function generateSQL(tables, relationships) {
  return tables.map(t => {
    const colDefs = t.columns.map(c => {
      let def = `  ${c.name} ${c.type}`;
      if (c.isPK) def += ' PRIMARY KEY';
      if (c.isNotNull && !c.isPK) def += ' NOT NULL';
      return def;
    });
    const rels = relationships.filter(r => r.toTableId === t.id);
    const fkConstraints = rels.flatMap(r => {
      const srcTable = tables.find(tt => tt.id === r.fromTableId);
      if (!srcTable) return [];
      const fkCols = t.columns.filter(c => c.isFK && c.refTable === srcTable.name);
      return fkCols.map(c =>
        `  CONSTRAINT fk_${t.name}_${c.name}\n    FOREIGN KEY (${c.name})\n    REFERENCES ${srcTable.name}(${c.refCol || 'id'})`
      );
    });
    const lines = [...colDefs, ...fkConstraints];
    return `CREATE TABLE ${t.name} (\n${lines.join(',\n')}\n);`;
  }).join('\n\n');
}

/* ─── default tables ─────────────────────────────────── */
const INIT_TABLES = [
  {
    id: uid(), name: 'users',
    x: snap(120), y: snap(140),
    color: '#8b5cf6',
    columns: [
      { id: uid(), name: 'id',         type: 'UUID',        isPK: true,  isFK: false, isNotNull: true,  refTable: null, refCol: null },
      { id: uid(), name: 'username',   type: 'VARCHAR(255)', isPK: false, isFK: false, isNotNull: true,  refTable: null, refCol: null },
      { id: uid(), name: 'email',      type: 'VARCHAR(255)', isPK: false, isFK: false, isNotNull: true,  refTable: null, refCol: null },
      { id: uid(), name: 'created_at', type: 'TIMESTAMP',   isPK: false, isFK: false, isNotNull: false, refTable: null, refCol: null },
    ],
  },
  {
    id: uid(), name: 'posts',
    x: snap(440), y: snap(100),
    color: '#3b82f6',
    columns: [
      { id: uid(), name: 'id',         type: 'UUID',        isPK: true,  isFK: false, isNotNull: true,  refTable: null, refCol: null },
      { id: uid(), name: 'title',      type: 'VARCHAR(255)', isPK: false, isFK: false, isNotNull: true,  refTable: null, refCol: null },
      { id: uid(), name: 'body',       type: 'TEXT',        isPK: false, isFK: false, isNotNull: false, refTable: null, refCol: null },
      { id: uid(), name: 'user_id',    type: 'UUID',        isPK: false, isFK: true,  isNotNull: true,  refTable: 'users', refCol: 'id' },
    ],
  },
  {
    id: uid(), name: 'comments',
    x: snap(440), y: snap(360),
    color: '#10b981',
    columns: [
      { id: uid(), name: 'id',        type: 'UUID', isPK: true,  isFK: false, isNotNull: true,  refTable: null, refCol: null },
      { id: uid(), name: 'body',      type: 'TEXT', isPK: false, isFK: false, isNotNull: true,  refTable: null, refCol: null },
      { id: uid(), name: 'post_id',   type: 'UUID', isPK: false, isFK: true,  isNotNull: true,  refTable: 'posts', refCol: 'id' },
      { id: uid(), name: 'user_id',   type: 'UUID', isPK: false, isFK: true,  isNotNull: true,  refTable: 'users', refCol: 'id' },
    ],
  },
];
const INIT_RELS = [];

/* ════════════════════════════════════════════════════════
   DatabaseBoard component
════════════════════════════════════════════════════════ */
export default function DatabaseBoard({ canvasId }) {
  const navigate = useNavigate();

  /* core state */
  const [tables,        setTables]        = useState(INIT_TABLES);
  const [relationships, setRelationships] = useState(INIT_RELS);

  /* ui state */
  const [tool,          setTool]          = useState('select'); // 'select' | 'table' | 'connect'
  const [sqlOpen,       setSqlOpen]       = useState(true);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [selectedId,    setSelectedId]    = useState(null);   // table id
  const [connectFrom,   setConnectFrom]   = useState(null);   // table id
  const [relModal,      setRelModal]      = useState(null);   // { fromId, toId }
  const [clearModal,    setClearModal]    = useState(false);
  const [editingCell,   setEditingCell]   = useState(null);   // { tableId, colId, field }
  const [editingName,   setEditingName]   = useState(null);   // tableId

  /* zoom / pan */
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x: 60, y: 60 });
  const zoomRef = useRef(1);
  const panRef  = useRef({ x: 60, y: 60 });
  const setZ = z => { zoomRef.current = z; setZoom(z); };
  const setP = p => { panRef.current  = p; setPan(p);  };

  const containerRef = useRef(null);
  const isPanning    = useRef(false);
  const panStart     = useRef(null);
  const spaceDown    = useRef(false);
  const dragRef      = useRef(null); // { tableId, startX, startY, startTX, startTY }

  /* live SQL */
  const sql = useMemo(() => generateSQL(tables, relationships), [tables, relationships]);

  /* ── keyboard ── */
  useEffect(() => {
    const dn = e => {
      if (e.code === 'Space' && !e.target.closest('input,textarea,select')) {
        e.preventDefault(); spaceDown.current = true;
      }
      if (e.key === 'Escape') { setSelectedId(null); setConnectFrom(null); setRelModal(null); }
      if (e.key === 'Delete' && selectedId) {
        setTables(prev => prev.filter(t => t.id !== selectedId));
        setRelationships(prev => prev.filter(r => r.fromTableId !== selectedId && r.toTableId !== selectedId));
        setSelectedId(null);
      }
    };
    const up = e => { if (e.code === 'Space') spaceDown.current = false; };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [selectedId]);

  /* ── wheel zoom ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const f    = e.deltaY > 0 ? 0.92 : 1.08;
        const curZ = zoomRef.current;
        const newZ = Math.min(Math.max(curZ * f, 0.15), 4);
        const rect = el.getBoundingClientRect();
        const mx   = e.clientX - rect.left;
        const my   = e.clientY - rect.top;
        const cur  = panRef.current;
        setZ(newZ);
        setP({ x: mx - (mx - cur.x) * newZ / curZ, y: my - (my - cur.y) * newZ / curZ });
      } else {
        setP({ x: panRef.current.x - e.deltaX, y: panRef.current.y - e.deltaY });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ── board mousedown (pan / place table) ── */
  const onBoardMouseDown = useCallback(e => {
    if (e.button === 1 || spaceDown.current) {
      isPanning.current = true;
      panStart.current  = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
      return;
    }
    if (e.button !== 0) return;

    if (tool === 'connect') {
      // mousedown reached the board ⟹ user clicked empty canvas → cancel connecting
      setConnectFrom(null);
      return;
    }

    setSelectedId(null);
    setConnectFrom(null);

    if (tool === 'table') {
      const rect = containerRef.current.getBoundingClientRect();
      const wx   = snap((e.clientX - rect.left  - panRef.current.x) / zoomRef.current);
      const wy   = snap((e.clientY - rect.top    - panRef.current.y) / zoomRef.current);
      const newT = {
        id: uid(), name: `table_${tables.length + 1}`,
        x: wx, y: wy, color: '#8b5cf6',
        columns: [{ id: uid(), name: 'id', type: 'UUID', isPK: true, isFK: false, isNotNull: true, refTable: null, refCol: null }],
      };
      setTables(prev => [...prev, newT]);
      setTool('select');
    }
  }, [tool, tables.length]);

  const onBoardMouseMove = useCallback(e => {
    if (isPanning.current) {
      const s = panStart.current;
      setP({ x: s.px + (e.clientX - s.x), y: s.py + (e.clientY - s.y) });
    }
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = (e.clientX - d.startX) / zoomRef.current;
      const dy = (e.clientY - d.startY) / zoomRef.current;
      setTables(prev => prev.map(t =>
        t.id === d.tableId ? { ...t, x: snap(d.startTX + dx), y: snap(d.startTY + dy) } : t
      ));
    }
  }, []);

  const onBoardMouseUp = useCallback(() => {
    isPanning.current = false;
    dragRef.current   = null;
  }, []);

  /* ── table drag ── */
  const startTableDrag = useCallback((e, tableId) => {
    if (tool === 'connect') return;
    e.stopPropagation();
    const t = tables.find(tt => tt.id === tableId);
    if (!t) return;
    setSelectedId(tableId);
    dragRef.current = { tableId, startX: e.clientX, startY: e.clientY, startTX: t.x, startTY: t.y };
  }, [tool, tables]);

  /* ── connect tool ── */
  const handleTableClick = useCallback((e, tableId) => {
    if (tool !== 'connect') return;
    e.stopPropagation();
    if (!connectFrom) {
      setConnectFrom(tableId);
    } else if (connectFrom !== tableId) {
      setRelModal({ fromId: connectFrom, toId: tableId });
      setConnectFrom(null);
    } else {
      setConnectFrom(null);
    }
  }, [tool, connectFrom]);

  /* ── confirm relationship ── */
  const confirmRelationship = useCallback((cardinality) => {
    const { fromId, toId } = relModal;
    const fromTable = tables.find(t => t.id === fromId);
    const toTable   = tables.find(t => t.id === toId);
    if (!fromTable || !toTable) { setRelModal(null); return; }

    const relId = uid();
    setRelationships(prev => [...prev, { id: relId, fromTableId: fromId, toTableId: toId, cardinality }]);

    // FK injection for 1:N
    if (cardinality === '1:N') {
      const pk = fromTable.columns.find(c => c.isPK);
      if (pk) {
        const fkName = `${fromTable.name}_${pk.name}`;
        const alreadyExists = toTable.columns.some(c => c.name === fkName);
        if (!alreadyExists) {
          setTables(prev => prev.map(t =>
            t.id === toId
              ? { ...t, columns: [...t.columns, {
                  id: uid(), name: fkName, type: pk.type,
                  isPK: false, isFK: true, isNotNull: true,
                  refTable: fromTable.name, refCol: pk.name,
                }]}
              : t
          ));
        }
      }
    }
    setRelModal(null);
    setTool('select');
  }, [relModal, tables]);

  /* ── column mutations ── */
  const addColumn = useCallback((tableId) => {
    setTables(prev => prev.map(t =>
      t.id === tableId
        ? { ...t, columns: [...t.columns, { id: uid(), name: 'column', type: 'VARCHAR(255)', isPK: false, isFK: false, isNotNull: false, refTable: null, refCol: null }] }
        : t
    ));
  }, []);

  const removeColumn = useCallback((tableId, colId) => {
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, columns: t.columns.filter(c => c.id !== colId) } : t
    ));
  }, []);

  const updateColumn = useCallback((tableId, colId, field, value) => {
    // special: color/name update bubbled from TableNode
    if (colId === '__color__') { setTables(prev => prev.map(t => t.id === tableId ? { ...t, color: value } : t)); return; }
    if (colId === '__name__')  { setTables(prev => prev.map(t => t.id === tableId ? { ...t, name: value }  : t)); return; }
    setTables(prev => prev.map(t =>
      t.id === tableId
        ? { ...t, columns: t.columns.map(c => c.id === colId ? { ...c, [field]: value } : c) }
        : t
    ));
  }, []);

  const removeTable = useCallback((tableId) => {
    setTables(prev => prev.filter(t => t.id !== tableId));
    setRelationships(prev => prev.filter(r => r.fromTableId !== tableId && r.toTableId !== tableId));
    if (selectedId === tableId) setSelectedId(null);
  }, [selectedId]);

  const removeRelationship = useCallback((relId) => {
    setRelationships(prev => prev.filter(r => r.id !== relId));
  }, []);

  /* ── zoom helpers ── */
  const changeZoom = d => {
    const curZ = zoomRef.current;
    const newZ = Math.min(Math.max(curZ + d, 0.15), 4);
    const el   = containerRef.current;
    const vw   = el?.offsetWidth  || 800;
    const vh   = el?.offsetHeight || 600;
    setZ(newZ);
    setP({ x: vw/2 - (vw/2 - panRef.current.x) * newZ/curZ,
           y: vh/2 - (vh/2 - panRef.current.y) * newZ/curZ });
  };

  const resetView = () => { setZ(1); setP({ x: 60, y: 60 }); };

  /* ── download as PNG ── */
  const download = () => {
    const el = document.getElementById('db-board-inner');
    if (!el) return;
    import('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/es/index.js')
      .then(({ toPng }) => toPng(el))
      .then(url => { const a = document.createElement('a'); a.href = url; a.download = `schema-${canvasId || 'nexus'}.png`; a.click(); })
      .catch(() => alert('Download failed — please use a screenshot.'));
  };

  /* ── board cursor ── */
  const boardCursor = spaceDown.current ? 'grab' : tool === 'table' ? 'crosshair' : tool === 'connect' ? 'cell' : 'default';

  /* ── SVG board size ── */
  const SVG_W = 4000, SVG_H = 3000;

  /* ── mini-map ── */
  const MM_W = 160, MM_H = 110;
  const mmScale = MM_W / SVG_W;

  return (
    <div className="dbb-root">

      {/* ──── SIDEBAR ──── */}
      <aside className={`dbb-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="dbb-toggle" onClick={() => setSidebarOpen(v => !v)}
          title={sidebarOpen ? 'Collapse' : 'Expand'}>
          {sidebarOpen ? <ChevronLeft size={15}/> : <ChevronRight size={15}/>}
        </button>

        {sidebarOpen && <div className="dbb-sb-scroll">
        <button className="dbb-tool" onClick={() => navigate('/whiteboard')} title="Back">
          <ArrowLeft size={15}/><span>Back</span>
        </button>
        <div className="dbb-sep"/>

        <p className="dbb-label">Tools</p>
        <button className={`dbb-tool ${tool==='select'  ? 'active' : ''}`} onClick={() => setTool('select')}  title="Select / Move (V)"><LayoutGrid size={15}/><span>Select</span></button>
        <button className={`dbb-tool ${tool==='table'   ? 'active' : ''}`} onClick={() => setTool('table')}   title="Add Table (T)"><Database size={15}/><span>Add Table</span></button>
        <button className={`dbb-tool ${tool==='connect' ? 'active' : ''}`} onClick={() => { setTool('connect'); setConnectFrom(null); }} title="Connect (C)"><Link2 size={15}/><span>Connect</span></button>

        <div className="dbb-sep"/>
        <p className="dbb-label">Zoom</p>
        <div className="dbb-zoom-row">
          <button className="dbb-tool dbb-zb" onClick={() => changeZoom(-0.15)}><ZoomOut size={14}/></button>
          <button className="dbb-zoom-pct" onClick={resetView}>{Math.round(zoom*100)}%</button>
          <button className="dbb-tool dbb-zb" onClick={() => changeZoom(+0.15)}><ZoomIn size={14}/></button>
        </div>
        <button className="dbb-tool" onClick={resetView}><Maximize2 size={14}/><span>Fit</span></button>

        <div className="dbb-sep"/>
        <p className="dbb-label">Actions</p>
        <button className="dbb-tool" onClick={() => setSqlOpen(v => !v)} title="Toggle SQL panel">
          <Code2 size={15}/><span>Live SQL</span>
        </button>
        <button className="dbb-tool" onClick={download}><Download size={15}/><span>Export PNG</span></button>
        <button className="dbb-tool danger" onClick={() => setClearModal(true)}>
          <Trash2 size={15}/><span>Clear Board</span>
        </button>
        </div>}
      </aside>

      {/* ──── MAIN CANVAS ──── */}
      <div
        ref={containerRef}
        className="dbb-canvas-area"
        style={{ cursor: boardCursor }}
        onMouseDown={onBoardMouseDown}
        onMouseMove={onBoardMouseMove}
        onMouseUp={onBoardMouseUp}
        onMouseLeave={onBoardMouseUp}
      >
        <div
          id="db-board-inner"
          className="dbb-inner"
          style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {/* dot-grid background */}
          <svg className="dbb-grid" width={SVG_W} height={SVG_H}>
            <defs>
              <pattern id="dots" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <circle cx={GRID/2} cy={GRID/2} r="1.2" fill="rgba(139,92,246,0.22)"/>
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#dots)"/>
          </svg>

          {/* relationship lines */}
          <svg className="dbb-svg-rels" width={SVG_W} height={SVG_H}>
            {relationships.map(rel => {
              const t1 = tables.find(t => t.id === rel.fromTableId);
              const t2 = tables.find(t => t.id === rel.toTableId);
              if (!t1 || !t2) return null;
              const { d, src, dst, srcDir, dstDir } = manhattanPath(t1, t2);
              const srcLines = crowFoot(src.x, src.y, srcDir, rel.cardinality, 'src');
              const dstLines = crowFoot(dst.x, dst.y, dstDir, rel.cardinality, 'dst');
              return (
                <g key={rel.id} className="dbb-rel-group" onClick={() => removeRelationship(rel.id)}>
                  <path d={d} className="dbb-rel-line dbb-rel-hit"/>
                  <path d={d} className="dbb-rel-line"/>
                  {[...srcLines, ...dstLines].map((sd, i) => (
                    <path key={i} d={sd} className="dbb-rel-symbol"/>
                  ))}
                  {/* cardinality label at midpoint */}
                  <text
                    x={(src.x + dst.x) / 2}
                    y={(src.y + dst.y) / 2 - 8}
                    className="dbb-rel-label"
                  >{rel.cardinality}</text>
                </g>
              );
            })}
          </svg>

          {/* table nodes */}
          {tables.map(table => (
            <TableNode
              key={table.id}
              table={table}
              selected={selectedId === table.id}
              connecting={connectFrom === table.id}
              connectMode={tool === 'connect'}
              onHeaderMouseDown={e => startTableDrag(e, table.id)}
              onTableClick={e => handleTableClick(e, table.id)}
              onRemove={() => removeTable(table.id)}
              onAddColumn={() => addColumn(table.id)}
              onRemoveColumn={colId => removeColumn(table.id, colId)}
              onUpdateColumn={(colId, field, val) => updateColumn(table.id, colId, field, val)}
              editingCell={editingCell}
              setEditingCell={setEditingCell}
              editingName={editingName}
              setEditingName={setEditingName}
            />
          ))}
        </div>

        {/* connect-from indicator */}
        {connectFrom && (
          <div className="dbb-connect-hint">
            <Link2 size={13}/>
            Connecting from <strong>{tables.find(t=>t.id===connectFrom)?.name}</strong> — click target table
            <button onClick={() => setConnectFrom(null)}><X size={12}/></button>
          </div>
        )}

        {/* tool hint */}
        {tool === 'table' && (
          <div className="dbb-connect-hint"><Database size={13}/> Click to place a new table</div>
        )}

        {/* mini-map */}
        <div className="dbb-minimap">
          <svg width={MM_W} height={MM_H} style={{ display:'block' }}>
            <rect width={MM_W} height={MM_H} fill="#0a0f1a" rx="6"/>
            {tables.map(t => (
              <rect
                key={t.id}
                x={t.x * mmScale}
                y={t.y * mmScale}
                width={TBL_W * mmScale}
                height={tableH(t) * mmScale}
                fill={t.color}
                opacity="0.6"
                rx="1"
              />
            ))}
            {/* viewport rect */}
            <rect
              x={(-pan.x / zoom) * mmScale}
              y={(-pan.y / zoom) * mmScale}
              width={(containerRef.current?.offsetWidth || 800) / zoom * mmScale}
              height={(containerRef.current?.offsetHeight || 600) / zoom * mmScale}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
              rx="2"
            />
          </svg>
        </div>

        {/* HUD badges */}
        <div className="dbb-hud-tl">
          <span className="dbb-badge">Database Schema</span>
          {canvasId && <span className="dbb-badge dim">{canvasId}</span>}
          <span className="dbb-badge">{tables.length} tables · {relationships.length} relations</span>
        </div>
      </div>

      {/* ──── LIVE SQL PANEL ──── */}
      {sqlOpen && (
        <aside className="dbb-sql-panel">
          <div className="dbb-sql-header">
            <Code2 size={13}/>
            <span>Live SQL</span>
            <button className="dbb-sql-close" onClick={() => setSqlOpen(false)}><X size={13}/></button>
          </div>
          <pre className="dbb-sql-body">{sql}</pre>
        </aside>
      )}

      {/* ──── RELATIONSHIP MODAL ──── */}
      {relModal && (
        <div className="dbb-modal-backdrop" onClick={() => setRelModal(null)}>
          <div className="dbb-modal" onClick={e => e.stopPropagation()}>
            <h3>Set Relationship</h3>
            <p>
              <strong>{tables.find(t=>t.id===relModal.fromId)?.name}</strong>
              {' → '}
              <strong>{tables.find(t=>t.id===relModal.toId)?.name}</strong>
            </p>
            <div className="dbb-modal-cards">
              {['1:1','1:N','N:M'].map(c => (
                <button key={c} className="dbb-modal-card" onClick={() => confirmRelationship(c)}>
                  <span className="dbb-modal-card-label">{c}</span>
                  <span className="dbb-modal-card-desc">
                    {c==='1:1'&&'One-to-One'}
                    {c==='1:N'&&'One-to-Many (auto FK)'}
                    {c==='N:M'&&'Many-to-Many'}
                  </span>
                </button>
              ))}
            </div>
            <button className="dbb-modal-cancel" onClick={() => setRelModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ──── CLEAR CONFIRMATION MODAL ──── */}
      {clearModal && (
        <div className="dbb-modal-backdrop" onClick={() => setClearModal(false)}>
          <div className="dbb-modal" onClick={e => e.stopPropagation()}>
            <h3>Clear Board?</h3>
            <p>This will remove all tables and relationships. This action cannot be undone.</p>
            <div className="dbb-modal-actions">
              <button className="dbb-modal-confirm-danger" onClick={() => {
                setTables([]);
                setRelationships([]);
                setSelectedId(null);
                setConnectFrom(null);
                setClearModal(false);
              }}>Yes, Clear</button>
              <button className="dbb-modal-cancel" onClick={() => setClearModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TableNode sub-component
════════════════════════════════════════════════════════ */
const COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899'];

function TableNode({
  table, selected, connecting, connectMode,
  onHeaderMouseDown, onTableClick, onRemove,
  onAddColumn, onRemoveColumn, onUpdateColumn,
  editingCell, setEditingCell, editingName, setEditingName,
}) {
  const isEditingName = editingName === table.id;

  return (
    <div
      className={`dbb-table ${selected ? 'selected' : ''} ${connecting ? 'connecting' : ''}`}
      style={{ left: table.x, top: table.y, '--accent': table.color }}
      onMouseDown={e => { if (connectMode) e.stopPropagation(); }}
      onClick={onTableClick}
    >
      {/* header */}
      <div
        className="dbb-table-header"
        style={{ background: table.color }}
        onMouseDown={e => { if (!connectMode) onHeaderMouseDown(e); }}
      >
        <Database size={13} style={{ flexShrink:0, opacity:0.8 }}/>
        {isEditingName ? (
          <input
            className="dbb-name-input"
            autoFocus
            defaultValue={table.name}
            onBlur={e => {
              onUpdateColumn && setEditingName(null);
              // update table name via workaround: we call updateColumn with special key
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                const val = e.target.value.trim() || table.name;
                // bubble up table name change
                e.stopPropagation();
                setEditingName(null);
                onUpdateColumn('__name__', '__table__', val);
              }
            }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          />
        ) : (
          <span className="dbb-table-name" onDoubleClick={e => { e.stopPropagation(); setEditingName(table.id); }}>
            {table.name}
          </span>
        )}
        <button className="dbb-tbl-remove" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onRemove();}}>
          <X size={11}/>
        </button>
      </div>

      {/* color picker strip */}
      <div className="dbb-color-strip">
        {COLORS.map(c => (
          <button
            key={c} className="dbb-color-dot"
            style={{ background: c }}
            onMouseDown={e=>e.stopPropagation()}
            onClick={e=>{e.stopPropagation(); onUpdateColumn('__color__','__table__',c);}}
          />
        ))}
      </div>

      {/* column sub-header */}
      <div className="dbb-col-head">
        <span style={{width:20}}/>
        <span className="dbb-ch-name">Name</span>
        <span className="dbb-ch-type">Type</span>
        <span style={{width:18}}/>
      </div>

      {/* columns */}
      {table.columns.map(col => (
        <ColumnRow
          key={col.id}
          col={col}
          tableId={table.id}
          editing={editingCell}
          setEditing={setEditingCell}
          onUpdate={(field, val) => onUpdateColumn(col.id, field, val)}
          onRemove={() => onRemoveColumn(col.id)}
        />
      ))}

      {/* add column */}
      <button className="dbb-add-col"
        onMouseDown={e=>e.stopPropagation()}
        onClick={e=>{e.stopPropagation();onAddColumn();}}>
        <Plus size={12}/> Add column
      </button>
    </div>
  );
}

/* column row */
function ColumnRow({ col, tableId, editing, setEditing, onUpdate, onRemove }) {
  const isEditingName = editing?.tableId === tableId && editing?.colId === col.id && editing?.field === 'name';
  const isEditingType = editing?.tableId === tableId && editing?.colId === col.id && editing?.field === 'type';

  return (
    <div className={`dbb-col-row ${col.isPK ? 'pk' : col.isFK ? 'fk' : ''}`}>
      {/* PK / FK badge */}
      <span className="dbb-col-badge">
        {col.isPK ? <Key size={10} color="#fbbf24"/> : col.isFK ? <Hash size={10} color="#60a5fa"/> : <AlignLeft size={10} color="#475569"/>}
      </span>

      {/* name */}
      {isEditingName ? (
        <input
          className="dbb-col-input"
          autoFocus
          defaultValue={col.name}
          onBlur={e  => { onUpdate('name', e.target.value || col.name); setEditing(null); }}
          onKeyDown={e=> { if(e.key==='Enter'||e.key==='Escape'){onUpdate('name',e.target.value||col.name);setEditing(null);}}}
          onMouseDown={e=>e.stopPropagation()}
          onClick={e=>e.stopPropagation()}
        />
      ) : (
        <span className="dbb-col-name" onDoubleClick={e=>{e.stopPropagation();setEditing({tableId,colId:col.id,field:'name'});}}>
          {col.name}
        </span>
      )}

      {/* type */}
      {isEditingType ? (
        <select
          className="dbb-col-select"
          autoFocus
          defaultValue={col.type}
          onBlur={e  => { onUpdate('type', e.target.value); setEditing(null); }}
          onChange={e=> { onUpdate('type',e.target.value); setEditing(null); }}
          onMouseDown={e=>e.stopPropagation()}
          onClick={e=>e.stopPropagation()}
        >
          {TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
      ) : (
        <span className="dbb-col-type" onDoubleClick={e=>{e.stopPropagation();setEditing({tableId,colId:col.id,field:'type'});}}>
          {col.type}
        </span>
      )}

      {/* PK toggle */}
      <button className={`dbb-col-btn ${col.isPK?'on':''}`}
        title="Toggle PK"
        onMouseDown={e=>e.stopPropagation()}
        onClick={e=>{e.stopPropagation();onUpdate('isPK',!col.isPK);}}>
        <Key size={10}/>
      </button>

      {/* remove */}
      <button className="dbb-col-btn remove"
        title="Delete column"
        onMouseDown={e=>e.stopPropagation()}
        onClick={e=>{e.stopPropagation();onRemove();}}>
        <X size={10}/>
      </button>
    </div>
  );
}
