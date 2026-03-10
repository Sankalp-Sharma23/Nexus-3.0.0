import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Zap, Trophy, Users, Calendar, MapPin, Clock,
  Rocket, Star, X, ArrowRight, ExternalLink, Code, Target, ArrowLeft, Search,
  Heart, Share2, Copy, CalendarPlus, MessageCircle, Shield, Check, ChevronDown
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/Hackathons.css';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MAGNETIC CURSOR HOOK
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function useMagnetic(strength = 0.4) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left - width  / 2) * strength;
    const y = (e.clientY - top  - height / 2) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }, [strength]);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'translate(0,0)';
  }, []);
  return { ref, onMove, onLeave };
}
const NeuralGrid = ({ hoveredCardRect }) => {
  const canvasRef  = useRef(null);
  const hoveredRef = useRef(null);
  const scrollRef  = useRef(0);

  useEffect(() => { hoveredRef.current = hoveredCardRect; }, [hoveredCardRect]);

  useEffect(() => {
    let cleanup = () => {};

    import('three').then((THREE) => {
      const canvas = canvasRef.current; if (!canvas) return;
      let W = window.innerWidth, H = window.innerHeight;

      /* renderer */
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);

      /* scene + camera */
      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, W / H, 1, 4000);
      camera.position.set(0, 160, 500);
      camera.lookAt(0, 0, -200);

      /* wireframe terrain mesh */
      const geo = new THREE.PlaneGeometry(1600, 2400, 90, 110);
      geo.rotateX(-Math.PI / 2);          // lay flat in X-Z plane
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b, wireframe: true,
        transparent: true, opacity: 0.55,
      });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      /* cache base vertex positions */
      const pos   = geo.attributes.position;
      const count = pos.count;
      const baseX = new Float32Array(count);
      const baseZ = new Float32Array(count);
      for (let i = 0; i < count; i++) { baseX[i] = pos.getX(i); baseZ[i] = pos.getZ(i); }

      /* reusable ray-cast vectors (avoid per-frame alloc) */
      const ndcVec = new THREE.Vector3();
      const dirVec = new THREE.Vector3();
      const camPos = new THREE.Vector3();

      /* scroll listener */
      const onScroll = () => { scrollRef.current = window.scrollY; };
      window.addEventListener('scroll', onScroll, { passive: true });

      /* animation loop */
      let animId, t = 0;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        t += 0.007;
        const sy = scrollRef.current;

        camera.position.set(0, Math.max(60, 160 - sy * 0.04), 500 - sy * 0.18);
        camera.lookAt(0, -sy * 0.02, -200 - sy * 0.1);
        camera.updateMatrixWorld();
        camPos.copy(camera.position);

       let pedestalX = null, pedestalZ = null;
        const rect = hoveredRef.current;
        if (rect) {
          const cx =  (rect.left + rect.width  * 0.5) / W * 2 - 1;
          const cy = -((rect.top  + rect.height * 0.5) / H * 2 - 1);
          ndcVec.set(cx, cy, 0.9).unproject(camera);
          dirVec.copy(ndcVec).sub(camPos).normalize();
          if (Math.abs(dirVec.y) > 0.001) {
            const tHit = -camPos.y / dirVec.y;
            if (tHit > 0) {
              pedestalX = camPos.x + dirVec.x * tHit;
              pedestalZ = camPos.z + dirVec.z * tHit;
            }
          }
        }

        /* â”€â”€ Vertex displacement */
        for (let i = 0; i < count; i++) {
          const x = baseX[i], z = baseZ[i];

            let y  = Math.sin(x * 0.006 + t)           * Math.cos(z * 0.005 + t * 0.8) * 28;
              y += Math.sin(x * 0.012 + t * 1.5)     * 13;
              y += Math.cos(z * 0.009 + t * 0.6)     * 16;
              y += Math.sin((x + z) * 0.007 + t * 0.4) * 9;

          // pedestal pulse under active card
          if (pedestalX !== null) {
            const dx = x - pedestalX, dz = z - pedestalZ;
            const d  = Math.sqrt(dx * dx + dz * dz);
            if (d < 220) {
              const s = (1 - d / 220) ** 2;            // quadratic falloff
              y += s * 85 * (0.65 + 0.35 * Math.sin(t * 4)); // pulse
            }
          }

          pos.setY(i, y);
        }
        pos.needsUpdate = true;
        renderer.render(scene, camera);
      };
      animate();

      /* resize */
      const onResize = () => {
        W = window.innerWidth; H = window.innerHeight;
        renderer.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      cleanup = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        renderer.dispose(); geo.dispose(); mat.dispose();
      };
    });

    return () => cleanup();
  }, []);

  return <canvas ref={canvasRef} className="hack-neural-grid" />;
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   3-D TILT CARD
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TiltCard = ({ children, className, onClick, layoutId, style, onCardHover, onCardLeave }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateX(${y * -12}deg) rotateY(${x * 12}deg) scale3d(1.03,1.03,1.03)`;
    onCardHover?.(el.getBoundingClientRect());
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
    onCardLeave?.();
  };
  return (
    <motion.div
      layoutId={layoutId} ref={ref} className={className} style={style}
      onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      initial={{ opacity: 0, scale: 0.86, y: 60 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   NEON CTA BUTTON
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const NeonButton = ({ children, className, onClick }) => {
  const mag = useMagnetic(0.38);
  return (
    <button ref={mag.ref} className={`hack-neon-btn ${className || ''}`}
      onMouseMove={mag.onMove} onMouseLeave={mag.onLeave} onClick={onClick}>
      {children}
    </button>
  );
};

/* ───────────────────────────────────────────────────────────
   COUNTDOWN TIMER (Feature 2)
   ─────────────────────────────────────────────────────────── */
const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!targetDate) return;
    const calc = () => {
      const ms = new Date(targetDate).getTime() - Date.now();
      if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
      return {
        d: Math.floor(ms / 86400000),
        h: Math.floor((ms % 86400000) / 3600000),
        m: Math.floor((ms % 3600000) / 60000),
        s: Math.floor((ms % 60000) / 1000),
      };
    };
    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  if (!targetDate) return null;
  const { d, h, m, s } = timeLeft;
  if (d > 7) return null;
  return (
    <div className="hack-countdown">
      <Clock size={11} />
      <span className="hack-cd-block">{String(d).padStart(2, '0')}<small>d</small></span>
      <span className="hack-cd-sep">:</span>
      <span className="hack-cd-block">{String(h).padStart(2, '0')}<small>h</small></span>
      <span className="hack-cd-sep">:</span>
      <span className="hack-cd-block">{String(m).padStart(2, '0')}<small>m</small></span>
      <span className="hack-cd-sep">:</span>
      <span className="hack-cd-block">{String(s).padStart(2, '0')}<small>s</small></span>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────
   DIFFICULTY BADGE (Feature 8)
   ─────────────────────────────────────────────────────────── */
const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     color: '#22c55e', icon: Shield },
  intermediate: { label: 'Intermediate', color: '#f59e0b', icon: Shield },
  advanced:     { label: 'Advanced',     color: '#ef4444', icon: Shield },
  'all levels': { label: 'All Levels',   color: '#8b5cf6', icon: Star },
};
const DifficultyBadge = ({ difficulty }) => {
  const key = (difficulty || 'all levels').toLowerCase();
  const cfg = DIFFICULTY_CONFIG[key] || DIFFICULTY_CONFIG['all levels'];
  const Icon = cfg.icon;
  return (
    <span className="hack-difficulty-badge" style={{ '--diff-color': cfg.color }}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
};

/* ───────────────────────────────────────────────────────────
   HELPER: Calendar Export (Feature 5)
   ─────────────────────────────────────────────────────────── */
function generateICS(hack) {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const start = hack.startDate ? fmt(hack.startDate) : '';
  const end = hack.endDate ? fmt(hack.endDate) : start;
  if (!start) return;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nexus//Hackathons//EN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${hack.name}`,
    `DESCRIPTION:${hack.name} by ${hack.organizer}. Prize: ${hack.prize || 'TBA'}. URL: ${hack.url}`,
    `LOCATION:${hack.location}`,
    `URL:${hack.url}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${hack.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ───────────────────────────────────────────────────────────
   HELPER: Share (Feature 6)
   ─────────────────────────────────────────────────────────── */
function shareHack(hack, platform) {
  const text = `Check out "${hack.name}" hackathon! Prize: ${hack.prize || 'TBA'}`;
  const url = hack.url && hack.url !== '#' ? hack.url : window.location.href;
  if (platform === 'copy') {
    navigator.clipboard?.writeText(`${text}\n${url}`);
    return true;
  }
  if (platform === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  }
  if (platform === 'linkedin') {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  }
  return false;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   EXPAND DETAIL OVERLAY
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const DetailOverlay = ({ hack, onClose, isSaved, onToggleSave }) => {
  const [copied, setCopied] = useState(false);
  const [lookingForTeam, setLookingForTeam] = useState(false);
  if (!hack) return null;

  const handleCopy = () => {
    if (shareHack(hack, 'copy')) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="hack-overlay-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          layoutId={`hack-${hack.id}`}
          className="hack-overlay-card"
          onClick={e => e.stopPropagation()}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        >
          <button className="hack-overlay-close" onClick={onClose}><X size={20} /></button>

          {/* header */}
          <div className="hack-overlay-header" style={{ '--accent': hack.color }}>
            <div className="hack-overlay-emoji">
              <span className="material-symbols-rounded">{hack.emoji}</span>
            </div>
            <div>
              <h2 className="hack-overlay-name">{hack.name}</h2>
              <p className="hack-overlay-org">{hack.organizer}</p>
            </div>
            {hack.isLive && (
              <span className="hack-live-pill"><span className="hack-live-dot" />LIVE</span>
            )}
          </div>

          {/* body slides up */}
          <motion.div className="hack-overlay-body"
            initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="hack-detail-grid">
              {[
                { icon: Calendar, label: 'Date',         val: hack.date          },
                { icon: MapPin,   label: 'Location',     val: hack.location      },
                { icon: Users,    label: 'Participants',  val: hack.participants  },
                { icon: Trophy,   label: 'Prize Pool',   val: hack.prize         },
                { icon: Target,   label: 'Difficulty',   val: hack.difficulty    },
                { icon: Clock,    label: 'Starts In',    val: hack.isLive ? 'Live now!' : (hack.daysUntil + ' days') },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="hack-detail-item">
                  <span className="hack-detail-icon"><Icon size={15} /></span>
                  <div>
                    <span className="hack-detail-label">{label}</span>
                    <span className="hack-detail-val">{val}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hack-overlay-section">
              <h4>Tracks &amp; Tags</h4>
              <div className="hack-pill-row">
                {hack.tags.map(t => <span key={t} className="hack-glass-pill">{t}</span>)}
                <DifficultyBadge difficulty={hack.difficulty} />
              </div>
            </div>

            <div className="hack-overlay-section">
              <h4>About this hackathon</h4>
              <p className="hack-overlay-desc">
                {hack.name} is one of the most exciting competitions of the year, organized by {hack.organizer}.
                With {hack.participants} participants, a prize pool of {hack.prize}, and tracks spanning {hack.tags.join(', ')},
                this is where bold ideas become real projects. Build, ship, and win.
              </p>
            </div>

            {/* ── Feature 7: Team Finder ── */}
            <div className="hack-overlay-section hack-team-finder">
              <h4>Team Finder</h4>
              <div className="hack-team-row">
                <button
                  className={`hack-team-toggle ${lookingForTeam ? 'active' : ''}`}
                  onClick={() => setLookingForTeam(v => !v)}
                >
                  <MessageCircle size={14} />
                  {lookingForTeam ? 'Looking for Team!' : 'Looking for a Team?'}
                </button>
                {lookingForTeam && (
                  <motion.p className="hack-team-hint"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  >
                    Share this hackathon with friends or find teammates on Discord communities!
                  </motion.p>
                )}
              </div>
            </div>

            {/* ── Action buttons row: Save + Calendar + Share ── */}
            <div className="hack-overlay-actions">
              <button className={`hack-action-btn hack-save-btn ${isSaved ? 'saved' : ''}`} onClick={onToggleSave}>
                <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Saved' : 'Save'}
              </button>
              {hack.startDate && (
                <button className="hack-action-btn" onClick={() => generateICS(hack)}>
                  <CalendarPlus size={16} /> Add to Calendar
                </button>
              )}
              <button className="hack-action-btn" onClick={handleCopy}>
                {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Link</>}
              </button>
              <button className="hack-action-btn" onClick={() => shareHack(hack, 'twitter')}>
                <Share2 size={16} /> Twitter
              </button>
              <button className="hack-action-btn" onClick={() => shareHack(hack, 'linkedin')}>
                <Share2 size={16} /> LinkedIn
              </button>
            </div>

            <NeonButton className="hack-register-neon" onClick={() => hack.url && hack.url !== '#' && window.open(hack.url, '_blank')}>
              {hack.isLive ? 'Join Now' : 'Register'} <ExternalLink size={15} />
            </NeonButton>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
const CATEGORY_COLOR = { ai:'#10a37f', web3:'#9945ff', hardware:'#4ECDC4', climate:'#22c55e', data:'#3B82F6', general:'#f59e0b' };
const CATEGORY_EMOJI = { ai:'psychology', web3:'currency_bitcoin', hardware:'memory', climate:'eco', data:'analytics', general:'code' };

function fmtDateRange(s, e) {
  if (!s) return 'TBA';
  const o = { month:'short', day:'numeric' };
  const start = new Date(s).toLocaleDateString('en-US', o);
  if (!e) return start;
  const end = new Date(e).toLocaleDateString('en-US', { ...o, year:'numeric' });
  return `${start} “ ${end}`;
}
function daysFromNow(d) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return ms < 0 ? 0 : Math.ceil(ms / 86_400_000);
}
function normalizeApiHack(h, idx) {
  const cat = h.category || 'general';
  return {
    id:           h.uid || h._id || `api-${idx}`,
    name:         h.title       || 'Untitled',
    organizer:    h.organizer   || 'Unknown',
    emoji:        CATEGORY_EMOJI[cat] || 'code',
    date:         fmtDateRange(h.startDate, h.endDate),
    location:     h.location    || 'Online',
    participants: h.participants || null,
    prize:        h.prize        || null,
    difficulty:   h.difficulty   || 'All Levels',
    tags:         h.tags         || [],
    isLive:       h.status === 'live',
    daysUntil:    daysFromNow(h.startDate),
    color:        CATEGORY_COLOR[cat] || '#f59e0b',
    featured:     !!h.featured,
    category:     cat,
    url:          h.url || '#',
    description:  h.description || '',
    startDate:    h.startDate || null,
    endDate:      h.endDate || null,
    prizeRaw:     h.prizeRaw || 0,
  };
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MAIN PAGE
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Hackathons = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const deepLinkDone = useRef(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeHack, setActiveHack]             = useState(null);
  const [hoveredCardRect, setHoveredCardRect]   = useState(null);
  const [apiHacks,  setApiHacks]                = useState([]);
  const [loading,   setLoading]                 = useState(true);
  const [liveCount, setLiveCount]               = useState(3);
  const [totalPrize, setTotalPrize]             = useState('$1.5M+');
  const [locationSearch, setLocationSearch]     = useState('');

  /* Feature 1: Bookmark / Save */
  const [savedHacks, setSavedHacks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexus_saved_hacks') || '[]'); }
    catch { return []; }
  });
  const toggleSave = useCallback((hackId) => {
    setSavedHacks(prev => {
      const next = prev.includes(hackId) ? prev.filter(id => id !== hackId) : [...prev, hackId];
      localStorage.setItem('nexus_saved_hacks', JSON.stringify(next));
      return next;
    });
  }, []);
  const [showSaved, setShowSaved] = useState(false);

  /* Feature 4: Sort */
  const [sortBy, setSortBy] = useState('default');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { scrollY } = useScroll();
  const heroY  = useTransform(scrollY, [0, 500], [0, 130]);
  const heroOp = useTransform(scrollY, [0, 350], [1, 0]);

  /* Fetch live data from backend */
  useEffect(() => {
    fetch('/api/hackathons?limit=500')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const normalized = (data.hackathons || []).map(normalizeApiHack);
        setApiHacks(normalized);
        if (normalized.length) {
          setLiveCount(normalized.filter(h => h.isLive).length);
          const raw = (data.hackathons || []).reduce((a, h) => a + (h.prizeRaw || 0), 0);
          if (raw > 0) setTotalPrize(
            raw >= 1_000_000 ? `$${(raw / 1_000_000).toFixed(1)}M+` : `$${Math.round(raw / 1000)}k+`
          );
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  /* Deep-link: open a specific hack card when navigated from Dashboard */
  useEffect(() => {
    if (!location.state?.openId || !apiHacks.length || deepLinkDone.current) return;
    const target = apiHacks.find(h => String(h._id || h.id) === String(location.state.openId));
    if (target) { setActiveHack(target); deepLinkDone.current = true; }
  }, [apiHacks, location.state]);

  /* Real API data only */
  const hackathons = apiHacks;

  const categories = ['all', 'ai', 'web3', 'hardware', 'climate', 'data'];

  const filtered = hackathons.filter(h => {
    if (showSaved && !savedHacks.includes(h.id)) return false;
    if (selectedCategory !== 'all' && h.category !== selectedCategory) return false;
    if (locationSearch.trim()) {
      const ll = locationSearch.toLowerCase().trim();
      if (!(h.location || '').toLowerCase().includes(ll)) return false;
    }
    return true;
  });

  /* Feature 4: Sort */
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'prize')        return (b.prizeRaw || 0) - (a.prizeRaw || 0);
    if (sortBy === 'deadline')     return (a.daysUntil ?? 999) - (b.daysUntil ?? 999);
    if (sortBy === 'participants') {
      const pa = parseInt(String(a.participants).replace(/\D/g, '')) || 0;
      const pb = parseInt(String(b.participants).replace(/\D/g, '')) || 0;
      return pb - pa;
    }
    if (sortBy === 'newest') return new Date(b.startDate || 0) - new Date(a.startDate || 0);
    return 0;
  });

  /* Feature 3: Happening Now */
  const liveHacks = sorted.filter(h => h.isLive);
  const featured  = sorted.filter(h => h.featured && !h.isLive);
  const rest      = sorted.filter(h => !h.featured && !h.isLive);

  return (
    <div className="hack-page">
      <Navbar />
      <NeuralGrid hoveredCardRect={hoveredCardRect} />

      {/* â”€â”€ Back to Experience Hub â”€â”€ */}
      <motion.button
        className="exp-back-btn"
        onClick={() => navigate('/experience-hub')}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ x: -3 }}
      >
        <ArrowLeft size={16} />
        Experience Hub
      </motion.button>

      {/* Mesh blobs */}
      <div className="hack-mesh-bg">
        <div className="hack-blob hack-blob-1" />
        <div className="hack-blob hack-blob-2" />
        <div className="hack-blob hack-blob-3" />
      </div>

      {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="hack-hero">
        <motion.div className="hack-hero-content" style={{ y: heroY, opacity: heroOp }}>
          <motion.div className="hack-hero-badge"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Zap size={13} /> The Hustler
          </motion.div>

          <motion.h1 className="hack-hero-title"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            Compete, Build
            <span className="hack-gradient-text"> &amp; Win.</span>
          </motion.h1>

          <motion.p className="hack-hero-sub"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            The world's hottest hackathons ” curated, live, and ready for you.<br />
            Ship bold ideas. Earn real prizes.
          </motion.p>

          {/* Live banner */}
          <motion.div className="hack-live-banner"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.22 }}
          >
            <span className="hack-live-indicator">
              <span className="hack-live-dot" /><Zap size={14} /> {liveCount} Live Right Now
            </span>
            <span className="hack-prize-total">
              <Trophy size={14} /> {totalPrize} Prize Pool
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* â”€â”€ CARDS BODY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="hack-cards-body">

        {/* Filter pills + location search */}
        <div className="hack-filter-wrapper">
          <motion.div className="hack-filter-row"
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.45 }}
          >
            {categories.map(c => (
              <button key={c}
                className={`hack-filter-pill ${selectedCategory === c && !showSaved ? 'active' : ''}`}
                onClick={() => { setSelectedCategory(c); setShowSaved(false); }}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
            <button
              className={`hack-filter-pill hack-saved-pill ${showSaved ? 'active' : ''}`}
              onClick={() => setShowSaved(v => !v)}
            >
              <Heart size={12} fill={showSaved ? 'currentColor' : 'none'} /> Saved ({savedHacks.length})
            </button>
          </motion.div>

          <motion.div className="hack-location-bar"
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.08 }}
          >
            <MapPin size={15} className="hack-location-icon" />
            <input
              type="text"
              className="hack-location-input"
              placeholder="Filter by location… e.g. India, Online, New York"
              value={locationSearch}
              onChange={e => setLocationSearch(e.target.value)}
            />
            {locationSearch && (
              <button className="hack-location-clear" onClick={() => setLocationSearch('')}>
                <X size={14} />
              </button>
            )}
          </motion.div>

          {/* Feature 4: Sort dropdown */}
          <div className="hack-sort-wrapper" ref={sortRef}>
            <button className="hack-sort-trigger" onClick={() => setShowSortMenu(v => !v)}>
              <ChevronDown size={14} className={showSortMenu ? 'hack-sort-chevron-open' : ''} />
              Sort: {sortBy === 'default' ? 'Relevance' : sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            </button>
            {showSortMenu && (
              <motion.div className="hack-sort-menu"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {[
                  { key: 'default',      label: 'Relevance' },
                  { key: 'prize',        label: 'Prize (highest)' },
                  { key: 'deadline',     label: 'Deadline (soonest)' },
                  { key: 'participants', label: 'Participants (most)' },
                  { key: 'newest',       label: 'Newest First' },
                ].map(opt => (
                  <button key={opt.key}
                    className={`hack-sort-opt ${sortBy === opt.key ? 'active' : ''}`}
                    onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                  >
                    {sortBy === opt.key && <Check size={13} />} {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* â”€â”€ FEATURED BENTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* ── Feature 3: HAPPENING NOW live section ── */}
        {!loading && liveHacks.length > 0 && (
          <section className="hack-section hack-live-section">
            <motion.div className="hack-section-header"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.55 }}
            >
              <span className="hack-live-pulse-icon"><Zap size={16} /></span>
              <h2>Happening Now</h2>
              <span className="hack-live-count-badge">{liveHacks.length} Live</span>
            </motion.div>
            <div className="hack-live-grid">
              {liveHacks.map(hack => (
                <TiltCard
                  key={hack.id}
                  layoutId={`hack-${hack.id}`}
                  className="hack-card hack-card-live"
                  style={{ '--accent': '#ef4444' }}
                  onClick={() => setActiveHack(hack)}
                  onCardHover={setHoveredCardRect}
                  onCardLeave={() => setHoveredCardRect(null)}
                >
                  <div className="hack-card-border-anim" />
                  <div className="hack-card-top">
                    <div className="hack-emoji-wrap">
                      <span className="material-symbols-rounded">{hack.emoji}</span>
                    </div>
                    <div className="hack-card-meta">
                      <span className="hack-card-name">{hack.name}</span>
                      <span className="hack-card-org">{hack.organizer}</span>
                    </div>
                    <span className="hack-live-chip"><span className="hack-live-dot" />LIVE</span>
                    <button className={`hack-bookmark ${savedHacks.includes(hack.id) ? 'saved' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleSave(hack.id); }}>
                      <Heart size={15} fill={savedHacks.includes(hack.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {hack.prize && (
                    <div className="hack-card-prize"><Trophy size={16} /><span>{hack.prize}</span></div>
                  )}
                  <div className="hack-card-stats">
                    <span className="hack-stat"><MapPin size={13} />{hack.location}</span>
                    <span className="hack-stat"><Users size={13} />{hack.participants}</span>
                  </div>
                  <div className="hack-pill-row">
                    {hack.tags.map(t => <span key={t} className="hack-glass-pill">{t}</span>)}
                    <DifficultyBadge difficulty={hack.difficulty} />
                  </div>
                  <NeonButton className="hack-reg-btn hack-reg-live">
                    Join Now <ArrowRight size={15} />
                  </NeonButton>
                </TiltCard>
              ))}
            </div>
          </section>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="hack-loading-state">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="hack-skeleton-card" />
            ))}
          </div>
        )}

        {/* No data from server */}
        {!loading && hackathons.length === 0 && (
          <div className="hack-empty-state">
            <Zap size={40} className="hack-empty-icon" />
            <h3>No hackathons found</h3>
            <p>The server couldn&apos;t load hackathon data. Make sure the backend is running.</p>
          </div>
        )}

        {/* No filter matches */}
        {!loading && filtered.length === 0 && hackathons.length > 0 && (
          <div className="hack-empty-state">
            <Search size={40} className="hack-empty-icon" />
            <h3>No matches</h3>
            <p>Try adjusting your category or location filter.</p>
          </div>
        )}

        {!loading && featured.length > 0 && (
          <section className="hack-section">
          <motion.div className="hack-section-header"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.55 }}
          >
            <Star size={16} className="hack-section-icon" />
            <h2>Featured Hackathons</h2>
          </motion.div>

          <div className="hack-bento-featured">
            {featured.map((hack, i) => (
              <TiltCard
                key={hack.id}
                layoutId={`hack-${hack.id}`}
                className={`hack-card hack-card-featured ${i === 0 ? 'hack-card-hero' : ''}`}
                style={{ '--accent': hack.color }}
                onClick={() => setActiveHack(hack)}
                onCardHover={setHoveredCardRect}
                onCardLeave={() => setHoveredCardRect(null)}
              >
                <div className="hack-card-border-anim" />

                <div className="hack-card-top">
                  <div className="hack-emoji-wrap">
                    <span className="material-symbols-rounded">{hack.emoji}</span>
                  </div>
                  <div className="hack-card-meta">
                    <span className="hack-card-name">{hack.name}</span>
                    <span className="hack-card-org">{hack.organizer}</span>
                  </div>
                  {hack.isLive
                    ? <span className="hack-live-chip"><span className="hack-live-dot" />LIVE</span>
                    : <span className="hack-days-chip"><Clock size={11} />{hack.daysUntil}d</span>
                  }
                  <button className={`hack-bookmark ${savedHacks.includes(hack.id) ? 'saved' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleSave(hack.id); }}>
                    <Heart size={15} fill={savedHacks.includes(hack.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {hack.prize && (
                  <div className="hack-card-prize">
                    <Trophy size={16} />
                    <span>{hack.prize}</span>
                  </div>
                )}

                <div className="hack-card-stats">
                  <span className="hack-stat"><MapPin size={13} />{hack.location}</span>
                  <span className="hack-stat"><Users size={13} />{hack.participants}</span>
                  <span className="hack-stat"><Calendar size={13} />{hack.date}</span>
                </div>

                {/* Feature 2+8: Countdown + Difficulty Badge */}
                <div className="hack-card-badges-row">
                  <DifficultyBadge difficulty={hack.difficulty} />
                  {!hack.isLive && <CountdownTimer targetDate={hack.startDate} />}
                </div>

                <div className="hack-pill-row">
                  {hack.tags.map(t => <span key={t} className="hack-glass-pill">{t}</span>)}
                </div>

                <NeonButton className={`hack-reg-btn ${hack.isLive ? 'hack-reg-live' : ''}`}>
                  {hack.isLive ? 'Join Now' : 'Register'} <ArrowRight size={15} />
                </NeonButton>
              </TiltCard>
            ))}
          </div>
          </section>
        )}

        {/* â”€â”€ REST GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!loading && rest.length > 0 && (
          <section className="hack-section">
          <motion.div className="hack-section-header"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.55 }}
          >
            <Rocket size={16} className="hack-section-icon" />
            <h2>More Hackathons</h2>
          </motion.div>

          <div className="hack-grid-rest">
            {rest.map(hack => (
              <TiltCard
                key={hack.id}
                layoutId={`hack-${hack.id}`}
                className="hack-card"
                style={{ '--accent': hack.color }}
                onClick={() => setActiveHack(hack)}
                onCardHover={setHoveredCardRect}
                onCardLeave={() => setHoveredCardRect(null)}
              >
                <div className="hack-card-border-anim" />

                <div className="hack-card-top">
                  <div className="hack-emoji-wrap">
                    <span className="material-symbols-rounded">{hack.emoji}</span>
                  </div>
                  <div className="hack-card-meta">
                    <span className="hack-card-name">{hack.name}</span>
                    <span className="hack-card-org">{hack.organizer}</span>
                  </div>
                  <span className="hack-days-chip"><Clock size={11} />{hack.daysUntil}d</span>
                  <button className={`hack-bookmark ${savedHacks.includes(hack.id) ? 'saved' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleSave(hack.id); }}>
                    <Heart size={15} fill={savedHacks.includes(hack.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {hack.prize && (
                  <div className="hack-card-prize">
                    <Trophy size={14} />
                    <span>{hack.prize}</span>
                  </div>
                )}

                <div className="hack-card-stats">
                  <span className="hack-stat"><MapPin size={13} />{hack.location}</span>
                  <span className="hack-stat"><Users size={13} />{hack.participants}</span>
                </div>

                {/* Feature 2+8: Countdown + Difficulty Badge */}
                <div className="hack-card-badges-row">
                  <DifficultyBadge difficulty={hack.difficulty} />
                  <CountdownTimer targetDate={hack.startDate} />
                </div>

                <div className="hack-pill-row">
                  {hack.tags.map(t => <span key={t} className="hack-glass-pill">{t}</span>)}
                </div>

                <NeonButton className="hack-reg-btn">
                  Register <ArrowRight size={14} />
                </NeonButton>
              </TiltCard>
            ))}
          </div>
          </section>
        )}

      </div>{/* /hack-cards-body */}

      <Footer />

      {/* â”€â”€ DETAIL OVERLAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {activeHack && (
          <DetailOverlay
            hack={activeHack}
            onClose={() => setActiveHack(null)}
            isSaved={activeHack ? savedHacks.includes(activeHack.id) : false}
            onToggleSave={() => activeHack && toggleSave(activeHack.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Hackathons;
