'use client';
import { useEffect, useRef } from 'react';
import IrisCanvas from './IrisCanvas';

export type EyeState = 'safe' | 'warn' | 'alert';

const SPECKS = [
  { x: -150, y: -112, r: 2.2, d: 0 }, { x: 168, y: -64, r: 1.6, d: 1.2 }, { x: -186, y: 58, r: 1.4, d: 2.1 },
  { x: 120, y: 150, r: 1.8, d: 0.6 }, { x: -60, y: -205, r: 1.2, d: 1.7 }, { x: 214, y: 92, r: 1.3, d: 2.6 },
  { x: -120, y: 182, r: 1.5, d: 3.1 }, { x: 40, y: -178, r: 1.1, d: 0.3 },
];

/**
 * The "eye", built in real 3D: a dark mass far behind, orbit arcs in the middle, the iris in front.
 * The stack tilts toward the mouse so the layers slide against each other.
 * Blue = calm, amber = caution, red = something is wrong.
 */
export default function Eye({ state, scanning }: { state: EyeState; scanning: boolean }) {
  const tilt = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let cur = { x: 0, y: 0 }, goal = { x: 0, y: 0 };
    const tick = () => {
      cur = { x: cur.x + (goal.x - cur.x) * 0.08, y: cur.y + (goal.y - cur.y) * 0.08 };
      const t = tilt.current;
      if (t) {
        t.style.setProperty('--ry', `${cur.x * 16}deg`);
        t.style.setProperty('--rx', `${-cur.y * 11}deg`);
        t.style.setProperty('--px', cur.x.toFixed(4));
        t.style.setProperty('--py', cur.y.toFixed(4));
      }
      raf = Math.abs(goal.x - cur.x) + Math.abs(goal.y - cur.y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      goal = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 };
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const leave = () => { goal = { x: 0, y: 0 }; if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener('pointermove', move);
    document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf); };
  }, []);

  const label = scanning ? 'Checking the logs' : state === 'alert' ? 'Alert: something needs attention' : state === 'warn' ? 'Caution' : 'All clear';
  return (
    <div className={`eye-stage eye-${scanning ? 'scan' : state}`} role="img" aria-label={label}>
      <div className="eye-tilt" ref={tilt}>
        {/* far back: soft dark mass */}
        <div className="layer layer-blob"><div className="blob" /><div className="blob blob-2" /></div>

        {/* middle: orbit arcs, markers and drifting specks */}
        <svg className="layer layer-arcs" viewBox="-300 -300 600 600" aria-hidden="true">
          <g className="spin-slow">
            <path d="M -205 -78 A 220 220 0 0 1 -20 -219" fill="none" stroke="var(--eye-line)" strokeWidth="1.1" opacity=".8" />
            <circle cx="-168" cy="-150" r="2.4" fill="var(--eye-line)" />
          </g>
          <g className="spin-rev">
            <path d="M 175 -35 A 180 180 0 0 1 20 177" fill="none" stroke="var(--eye-line)" strokeWidth="1" opacity=".6" />
            <path d="M 215 125 A 250 250 0 0 1 60 242" fill="none" stroke="var(--eye-line)" strokeWidth=".8" opacity=".5" />
            <path d="M -150 -40 A 156 156 0 0 1 -60 -144" fill="none" stroke="var(--eye-line)" strokeWidth=".7" opacity=".45" strokeDasharray="2 5" />
          </g>
          <rect x="-118" y="-186" width="6" height="6" fill="none" stroke="var(--eye-line)" opacity=".6" />
          <rect x="196" y="-38" width="6" height="6" fill="none" stroke="var(--eye-line)" opacity=".6" />
          <rect x="196" y="12" width="6" height="6" fill="none" stroke="var(--eye-line)" opacity=".6" />
          <rect x="-196" y="148" width="6" height="6" fill="none" stroke="var(--eye-line)" opacity=".6" />
          {SPECKS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--eye-line)" className="speck" style={{ animationDelay: `${s.d}s` }} />)}
        </svg>

        {/* front: the iris */}
        <div className="layer layer-iris">
          <IrisCanvas mood={state} scanning={scanning} />
        </div>
      </div>
    </div>
  );
}
