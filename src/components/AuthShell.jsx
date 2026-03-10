import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/Auth.css';

/* ─────────────────────────────────────────────────────────────
   Art panel — shared between login and signup, never unmounts.
   mode: 'login'  → art on right, purple
   mode: 'signup' → art on left,  cyan
───────────────────────────────────────────────────────────── */
function ArtPanel({ mode }) {
    return (
        <div className={`auth-art-panel auth-art-panel--${mode}`}>
            <div className="auth-art-core-glow" />
            <div className="auth-art-ring art-ring-1" />
            <div className="auth-art-ring art-ring-2" />
            <div className="auth-art-ring art-ring-3" />
            <div className="auth-art-ring art-ring-4" />
            <div className="auth-art-line art-line-1" />
            <div className="auth-art-line art-line-2" />
            <div className="auth-art-line art-line-3" />
            <div className="auth-art-line art-line-4" />
            <div className="auth-art-orb art-orb-1" />
            <div className="auth-art-orb art-orb-2" />
            <div className="auth-art-orb art-orb-3" />
            <div className="auth-art-dot art-dot-1" />
            <div className="auth-art-dot art-dot-2" />
            <div className="auth-art-dot art-dot-3" />
            <div className="auth-art-dot art-dot-4" />
            <div className="auth-art-dot art-dot-5" />
            <div className="auth-art-dot art-dot-6" />
            <div className="auth-art-dot art-dot-7" />
            <div className="auth-art-dot art-dot-8" />
            <div className="auth-art-diamond" />
            <div className="auth-art-brand">
                <div className={`auth-art-brand-mark${mode === 'signup' ? ' auth-art-brand-mark--signup' : ''}`}>N</div>
                <p className="auth-art-brand-text">NEXUS</p>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   AuthShell — wrapper used by both LoginPage and SignupPage.
   Keeps the art panel alive and transitions it on mode switch.

   Props:
     mode      : 'login' | 'signup'
     formPanel : JSX of the form (left col when login, right when signup)
───────────────────────────────────────────────────────────── */
export default function AuthShell({ mode, formPanel }) {
    const canvasRef  = useRef(null);
    const navigate   = useNavigate();

    // 'idle' | 'to-login' | 'to-signup'
    const [transitioning, setTransitioning] = useState(false);
    const [targetMode, setTargetMode]       = useState(mode);
    const [visibleMode, setVisibleMode]     = useState(mode); // what the art panel currently shows

    /* ── star canvas ── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx   = canvas.getContext('2d');
        let animId;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);
        const starColor = mode === 'login' ? '167,139,250' : '56,189,248';
        const stars = Array.from({ length: 130 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 1.3 + 0.3,
            dx: (Math.random() - 0.5) * 0.17,
            dy: (Math.random() - 0.5) * 0.17,
            a: Math.random() * 0.65 + 0.2,
        }));
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${starColor},${s.a})`; ctx.fill();
                s.x += s.dx; s.y += s.dy;
                if (s.x < 0) s.x = canvas.width;  if (s.x > canvas.width)  s.x = 0;
                if (s.y < 0) s.y = canvas.height; if (s.y > canvas.height) s.y = 0;
            });
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, [mode]);

    /* ── intercept nav links — trigger animation first, then navigate ── */
    useEffect(() => {
        const handleClick = (e) => {
            const anchor = e.target.closest('a[data-auth-nav]');
            if (!anchor) return;
            e.preventDefault();
            const dest = anchor.getAttribute('href');
            const destMode = dest === '/login' ? 'login' : 'signup';
            if (destMode === mode || transitioning) return;

            setTargetMode(destMode);
            setTransitioning(true);

            // At ~50% of sweep (panel centred), flip art colour so @property gradient morphs smoothly
            setTimeout(() => { setVisibleMode(destMode); }, 360);

            // After sweep completes (720ms) + tiny buffer, navigate
            setTimeout(() => {
                setTransitioning(false);
                navigate(dest, { replace: true });
            }, 750);
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [mode, navigate, transitioning]);

    // data attribute drives CSS: 'login→signup' slides art left, 'signup→login' slides art right
    const transDir = transitioning
        ? (targetMode === 'signup' ? 'to-signup' : 'to-login')
        : '';

    return (
        <div className="auth-root">
            <canvas ref={canvasRef} className="auth-canvas" />

            <div className="auth-body auth-body--wide">
                <div className={`auth-card-wrap${mode === 'signup' ? ' auth-card-wrap--signup' : ''}`}>
                    <div className="auth-conic" />

                    {/*
                     * The card uses CSS grid but the art panel is absolutely
                     * positioned OVER the grid during transition so it can
                     * sweep across the full card width unimpeded.
                     */}
                    <div
                        className={`auth-card auth-card--split auth-card--shell${transDir ? ` auth-card--${transDir}` : ''}`}
                        data-mode={mode}
                    >
                        {/* ── Form slot (always behind art panel during transition) ── */}
                        <div
                            className={`auth-form-slot auth-form-slot--${mode}${transitioning ? ' auth-form-slot--exiting' : ''}`}
                        >
                            {formPanel}
                        </div>

                        {/* ── Art overlay (positioned absolutely, slides across) ── */}
                        <div
                            className={`auth-art-overlay auth-art-overlay--${visibleMode}${transDir ? ` auth-art-overlay--${transDir}` : ''}`}
                        >
                            <ArtPanel mode={visibleMode} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
