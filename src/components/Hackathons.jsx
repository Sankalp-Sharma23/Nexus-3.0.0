import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Zap, Trophy, Users, Calendar, MapPin, Clock,
  Rocket, Star, X, ArrowRight, ExternalLink, Code, Target, ArrowLeft
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/Hackathons.css';

/* ─────────────────────────────────────────────────────────────
   MAGNETIC CURSOR HOOK
   ───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   NEURAL GRID  — Three.js wireframe terrain with
   scroll parallax + card-hover pedestal pulse
   ───────────────────────────────────────────────────────────── */
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

        /* ── Parallax fly-over: camera advances along Z as user scrolls.
              Near grid lines (large Z in clip space) shift faster than
              distant ones — naturally 0.4x vs 0.1x through perspective. */
        camera.position.set(0, Math.max(60, 160 - sy * 0.04), 500 - sy * 0.18);
        camera.lookAt(0, -sy * 0.02, -200 - sy * 0.1);
        camera.updateMatrixWorld();
        camPos.copy(camera.position);

        /* ── Project hovered card centre onto the Y=0 grid plane */
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

        /* ── Vertex displacement */
        for (let i = 0; i < count; i++) {
          const x = baseX[i], z = baseZ[i];

          // rolling terrain — two frequency layers
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

/* ─────────────────────────────────────────────────────────────
   3-D TILT CARD
   ───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   NEON CTA BUTTON
   ───────────────────────────────────────────────────────────── */
const NeonButton = ({ children, className, onClick }) => {
  const mag = useMagnetic(0.38);
  return (
    <button ref={mag.ref} className={`hack-neon-btn ${className || ''}`}
      onMouseMove={mag.onMove} onMouseLeave={mag.onLeave} onClick={onClick}>
      {children}
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────
   EXPAND DETAIL OVERLAY
   ───────────────────────────────────────────────────────────── */
const DetailOverlay = ({ hack, onClose }) => {
  if (!hack) return null;
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
                { icon: Clock,    label: 'Starts In',    val: hack.isLive ? 'Live now!' : `${hack.daysUntil} days` },
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
                <span className="hack-diff-pill">{hack.difficulty}</span>
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

            <NeonButton className="hack-register-neon">
              {hack.isLive ? 'Join Now' : 'Register'} <ExternalLink size={15} />
            </NeonButton>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
const Hackathons = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeHack, setActiveHack]             = useState(null);
  const [hoveredCardRect, setHoveredCardRect]   = useState(null);

  const { scrollY } = useScroll();
  const heroY  = useTransform(scrollY, [0, 500], [0, 130]);
  const heroOp = useTransform(scrollY, [0, 350], [1, 0]);

  const hackathons = [
    /* ── LIVE NOW ───────────────────────────────────────────── */
    { id:  1, name: 'ETHGlobal Waterloo',           organizer: 'ETHGlobal',              emoji: 'bolt',                   date: 'Feb 27 – Mar 1, 2026',  location: 'Waterloo, Canada',  participants: '2,000+',   prize: '$100,000',  difficulty: 'Advanced',     tags: ['Blockchain', 'DeFi', 'Smart Contracts'],          isLive: true,  daysUntil: 0,  color: '#f59e0b', featured: true,  category: 'web3'     },
    { id:  2, name: 'Solana Grizzlython',           organizer: 'Solana Foundation',      emoji: 'currency_bitcoin',       date: 'Feb 25 – Mar 4, 2026',  location: 'Online',            participants: '8,500+',   prize: '$400,000',  difficulty: 'Advanced',     tags: ['Web3', 'DeFi', 'NFT', 'dApps'],                  isLive: true,  daysUntil: 0,  color: '#9945ff', featured: true,  category: 'web3'     },
    { id:  3, name: 'OpenAI Assistants Hackathon',  organizer: 'OpenAI',                 emoji: 'psychology',             date: 'Feb 26 – Mar 2, 2026',  location: 'Online',            participants: '12,000+',  prize: '$150,000',  difficulty: 'Intermediate', tags: ['GPT-4', 'Agents', 'Plugins', 'AI'],               isLive: true,  daysUntil: 0,  color: '#10a37f', featured: true,  category: 'ai'       },

    /* ── UPCOMING — FEATURED ────────────────────────────────── */
    { id:  4, name: 'MLH Global Hack Week',         organizer: 'Major League Hacking',   emoji: 'public',                 date: 'Mar 2-8, 2026',         location: 'Online',            participants: '18,000+',  prize: '$50,000',   difficulty: 'All Levels',   tags: ['AI/ML', 'Web3', 'Open Source'],                   isLive: false, daysUntil: 3,  color: '#a78bfa', featured: true,  category: 'ai'       },
    { id:  5, name: 'HackMIT 2026',                 organizer: 'MIT',                    emoji: 'school',                 date: 'Mar 5-7, 2026',         location: 'Cambridge, MA',     participants: '1,500+',   prize: '$25,000',   difficulty: 'Intermediate', tags: ['Hardware', 'IoT', 'Robotics'],                    isLive: false, daysUntil: 6,  color: '#4ECDC4', featured: true,  category: 'hardware' },
    { id:  6, name: 'Google DevFest Hackathon',     organizer: 'Google',                 emoji: 'local_fire_department',  date: 'Mar 12-14, 2026',       location: 'Online',            participants: '10,000+',  prize: '$75,000',   difficulty: 'Intermediate', tags: ['Cloud', 'Mobile', 'AI'],                          isLive: false, daysUntil: 13, color: '#fbbc04', featured: true,  category: 'ai'       },
    { id:  7, name: 'Hack the North 2026',          organizer: 'University of Waterloo', emoji: 'north_star',             date: 'Mar 20-22, 2026',       location: 'Waterloo, Canada',  participants: '3,000+',   prize: '$40,000',   difficulty: 'All Levels',   tags: ['ML', 'Health Tech', 'Fintech'],                   isLive: false, daysUntil: 21, color: '#f43f5e', featured: true,  category: 'ai'       },
    { id:  8, name: 'Chainlink Hackathon Spring',   organizer: 'Chainlink Labs',          emoji: 'link',                   date: 'Mar 25 – Apr 8, 2026',  location: 'Online',            participants: '5,000+',   prize: '$300,000',  difficulty: 'Advanced',     tags: ['Oracles', 'DeFi', 'Cross-chain', 'Automation'],  isLive: false, daysUntil: 26, color: '#375bd2', featured: true,  category: 'web3'     },
    { id:  9, name: 'NASA Space Apps Challenge',    organizer: 'NASA',                   emoji: 'rocket_launch',          date: 'Apr 2-4, 2026',         location: 'Global',            participants: '25,000+',  prize: '$60,000',   difficulty: 'All Levels',   tags: ['Space Tech', 'Data Science', 'Innovation'],       isLive: false, daysUntil: 34, color: '#3B82F6', featured: true,  category: 'data'     },

    /* ── UPCOMING — REST ────────────────────────────────────── */
    { id: 10, name: 'TreeHacks',                    organizer: 'Stanford University',    emoji: 'park',                   date: 'Mar 7-9, 2026',         location: 'Stanford, CA',      participants: '1,200+',   prize: '$30,000',   difficulty: 'All Levels',   tags: ['Climate Tech', 'Sustainability', 'Impact'],       isLive: false, daysUntil: 8,  color: '#10B981', featured: false, category: 'climate'  },
    { id: 11, name: 'Climate Hack 2026',            organizer: 'Climate Draft',          emoji: 'eco',                    date: 'Mar 14-16, 2026',       location: 'Online',            participants: '4,200+',   prize: '$35,000',   difficulty: 'All Levels',   tags: ['GreenTech', 'Carbon', 'Clean Energy'],            isLive: false, daysUntil: 15, color: '#22c55e', featured: false, category: 'climate'  },
    { id: 12, name: 'HackSC XI',                    organizer: 'USC',                    emoji: 'sunny',                  date: 'Mar 14-16, 2026',       location: 'Los Angeles, CA',   participants: '800+',     prize: '$20,000',   difficulty: 'Beginner',     tags: ['Social Good', 'EdTech', 'Health'],                isLive: false, daysUntil: 15, color: '#fb923c', featured: false, category: 'data'     },
    { id: 13, name: 'PennApps XXV',                 organizer: 'UPenn',                  emoji: 'lightbulb',              date: 'Mar 21-23, 2026',       location: 'Philadelphia, PA',  participants: '1,800+',   prize: '$45,000',   difficulty: 'Intermediate', tags: ['Fintech', 'AI', 'Open Innovation'],               isLive: false, daysUntil: 22, color: '#e879f9', featured: false, category: 'ai'       },
    { id: 14, name: 'Reality Hack 2026',            organizer: 'MIT Media Lab',          emoji: 'view_in_ar',             date: 'Mar 28-30, 2026',       location: 'Cambridge, MA',     participants: '600+',     prize: '$50,000',   difficulty: 'Intermediate', tags: ['AR/VR', 'XR', 'Spatial Computing'],               isLive: false, daysUntil: 29, color: '#c026d3', featured: false, category: 'hardware' },
    { id: 15, name: 'Junction 2026',                organizer: 'Junction',               emoji: 'hub',                    date: 'Apr 4-6, 2026',         location: 'Helsinki, Finland', participants: '1,500+',   prize: '$55,000',   difficulty: 'All Levels',   tags: ['Deep Tech', 'Mobility', 'AI'],                    isLive: false, daysUntil: 36, color: '#06b6d4', featured: false, category: 'hardware' },
    { id: 16, name: 'CalHacks 11.0',               organizer: 'UC Berkeley',            emoji: 'calculate',              date: 'Apr 11-13, 2026',       location: 'Berkeley, CA',      participants: '2,500+',   prize: '$30,000',   difficulty: 'All Levels',   tags: ['AI', 'Developer Tools', 'Open Innovation'],      isLive: false, daysUntil: 43, color: '#fbbf24', featured: false, category: 'ai'       },
    { id: 17, name: 'BioHack UCLA',                 organizer: 'UCLA',                   emoji: 'biotech',                date: 'Apr 18-20, 2026',       location: 'Los Angeles, CA',   participants: '700+',     prize: '$15,000',   difficulty: 'Intermediate', tags: ['Biotech', 'Health Tech', 'Data Science'],         isLive: false, daysUntil: 50, color: '#34d399', featured: false, category: 'data'     },
    { id: 18, name: 'HackDavis 2026',               organizer: 'UC Davis',               emoji: 'agriculture',            date: 'Apr 25-27, 2026',       location: 'Davis, CA',         participants: '1,000+',   prize: '$12,000',   difficulty: 'Beginner',     tags: ['Social Good', 'AgTech', 'Sustainability'],        isLive: false, daysUntil: 57, color: '#84cc16', featured: false, category: 'climate'  },
  ];

  const categories = ['all', 'ai', 'web3', 'hardware', 'climate', 'data'];

  const filtered = hackathons.filter(h =>
    selectedCategory === 'all' || h.category === selectedCategory
  );

  const featured = filtered.filter(h => h.featured);
  const rest     = filtered.filter(h => !h.featured);

  return (
    <div className="hack-page">
      <Navbar />
      <NeuralGrid hoveredCardRect={hoveredCardRect} />

      {/* ── Back to Experience Hub ── */}
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

      {/* ── HERO ─────────────────────────────────────────────── */}
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
            The world's hottest hackathons — curated, live, and ready for you.<br />
            Ship bold ideas. Earn real prizes.
          </motion.p>

          {/* Live banner */}
          <motion.div className="hack-live-banner"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.22 }}
          >
            <span className="hack-live-indicator">
              <span className="hack-live-dot" /><Zap size={14} /> 3 Live Right Now
            </span>
            <span className="hack-prize-total">
              <Trophy size={14} /> $1.5M+ Prize Pool
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── CARDS BODY ───────────────────────────────────────── */}
      <div className="hack-cards-body">

        {/* Filter pills */}
        <div className="hack-filter-wrapper">
          <motion.div className="hack-filter-row"
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.45 }}
          >
            {categories.map(c => (
              <button key={c}
                className={`hack-filter-pill ${selectedCategory === c ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c)}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </motion.div>
        </div>

        {/* ── FEATURED BENTO ─────────────────────────────────── */}
        {featured.length > 0 && (
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
                </div>

                <div className="hack-card-prize">
                  <Trophy size={16} />
                  <span>{hack.prize}</span>
                </div>

                <div className="hack-card-stats">
                  <span className="hack-stat"><MapPin size={13} />{hack.location}</span>
                  <span className="hack-stat"><Users size={13} />{hack.participants}</span>
                  <span className="hack-stat"><Calendar size={13} />{hack.date}</span>
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

        {/* ── REST GRID ──────────────────────────────────────── */}
        {rest.length > 0 && (
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
                </div>

                <div className="hack-card-prize">
                  <Trophy size={14} />
                  <span>{hack.prize}</span>
                </div>

                <div className="hack-card-stats">
                  <span className="hack-stat"><MapPin size={13} />{hack.location}</span>
                  <span className="hack-stat"><Users size={13} />{hack.participants}</span>
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

      {/* ── DETAIL OVERLAY ──────────────────────────────────── */}
      <AnimatePresence>
        {activeHack && (
          <DetailOverlay hack={activeHack} onClose={() => setActiveHack(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Hackathons;
