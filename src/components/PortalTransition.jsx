import { useRef, forwardRef, useImperativeHandle } from 'react';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';

const PortalTransition = forwardRef((_, ref) => {
  const overlayRef = useRef(null);
  const ringRef   = useRef(null);
  const navigate  = useNavigate();

  useImperativeHandle(ref, () => ({
    trigger(cx, cy, route) {
      const overlay = overlayRef.current;
      const ring    = ringRef.current;
      if (!overlay) return;

      /* position CSS custom props for the radial gradient */
      overlay.style.setProperty('--ox', `${cx}px`);
      overlay.style.setProperty('--oy', `${cy}px`);

      /* reset state */
      gsap.set(overlay, {
        display: 'block',
        clipPath: `circle(0px at ${cx}px ${cy}px)`,
      });
      gsap.set(ring, {
        x: cx,
        y: cy,
        xPercent: -50,
        yPercent: -50,
        width: 0,
        height: 0,
        opacity: 1,
      });

      const tl = gsap.timeline();

      /* 1. brief ring flash at click point */
      tl.to(ring, {
        width: 80,
        height: 80,
        duration: 0.18,
        ease: 'power2.out',
      });

      /* 2. portal opens — circle expands from click point */
      tl.to(
        overlay,
        {
          clipPath: `circle(200vmax at ${cx}px ${cy}px)`,
          duration: 0.72,
          ease: 'power3.inOut',
        },
        0.08
      );

      /* 3. ring races away and fades */
      tl.to(
        ring,
        {
          width: 500,
          height: 500,
          opacity: 0,
          duration: 0.55,
          ease: 'power2.out',
        },
        0.08
      );

      /* 4. navigate at the peak of coverage */
      tl.call(() => {
        navigate(route);
        gsap.set(overlay, { display: 'none' });
      });
    },
  }));

  return (
    <>
      {/* Full-screen portal overlay */}
      <div
        ref={overlayRef}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          background: `
            radial-gradient(
              circle at var(--ox, 50%) var(--oy, 50%),
              #3b1285 0%,
              #1a0550 30%,
              #0a0118 65%,
              #050010 100%
            )
          `,
        }}
      >
        {/* Depth grid — perspective tunnel lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 48px,
                rgba(139,92,246,0.07) 48px,
                rgba(139,92,246,0.07) 49px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 48px,
                rgba(139,92,246,0.07) 48px,
                rgba(139,92,246,0.07) 49px
              )
            `,
          }}
        />

        {/* Concentric glow rings at origin — static depth cue */}
        {[80, 160, 260, 380].map((r) => (
          <div
            key={r}
            style={{
              position: 'absolute',
              top:    'var(--oy, 50%)',
              left:   'var(--ox, 50%)',
              width:   r,
              height:  r,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: `1px solid rgba(139,92,246,${0.35 - r * 0.0007})`,
              boxShadow: `0 0 ${r * 0.12}px rgba(139,92,246,0.15)`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Radial centre glow */}
        <div
          style={{
            position: 'absolute',
            top:    'var(--oy, 50%)',
            left:   'var(--ox, 50%)',
            width:   220,
            height:  220,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.45) 0%, transparent 70%)',
            filter: 'blur(18px)',
          }}
        />
      </div>

      {/* Expanding ring (the portal "rim") */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          borderRadius: '50%',
          border: '2.5px solid #a78bfa',
          boxShadow:
            '0 0 18px 5px #8b5cf6, 0 0 60px 20px rgba(139,92,246,0.35)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      />
    </>
  );
});

PortalTransition.displayName = 'PortalTransition';
export default PortalTransition;
