'use client';
import { useEffect, useRef } from 'react';

type RGB = [number, number, number];
interface Palette { dark: RGB; mid: RGB; light: RGB; fiber: RGB; tick: RGB; limbal: RGB }
export type IrisMood = 'safe' | 'warn' | 'alert';

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const P = (dark: string, mid: string, light: string, fiber: string, tick: string, limbal: string): Palette =>
  ({ dark: hex(dark), mid: hex(mid), light: hex(light), fiber: hex(fiber), tick: hex(tick), limbal: hex(limbal) });

const PALETTES: Record<IrisMood, Palette> = {
  safe: P('#0e2a46', '#3c7db5', '#a9d7f6', '#cfe8ff', '#eaf6ff', '#0a1a2c'),
  warn: P('#3a2606', '#b9822b', '#ffd48a', '#ffeccb', '#fff6e4', '#241805'),
  alert: P('#30050a', '#c21f2c', '#ff6e62', '#ffbdb4', '#ffe6e2', '#1e0307'),
};

const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const mixPal = (a: Palette, b: Palette, k: number): Palette =>
  ({ dark: mix(a.dark, b.dark, k), mid: mix(a.mid, b.mid, k), light: mix(a.light, b.light, k), fiber: mix(a.fiber, b.fiber, k), tick: mix(a.tick, b.tick, k), limbal: mix(a.limbal, b.limbal, k) });
const dist = (a: Palette, b: Palette) => Math.abs(a.mid[0] - b.mid[0]) + Math.abs(a.mid[1] - b.mid[1]) + Math.abs(a.mid[2] - b.mid[2]);

/** Small seeded random generator, so the iris texture is identical on every load. */
function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Texture is generated once, in units of the iris radius (1 = edge of the iris).
const R = rng(7);
const FIBERS = Array.from({ length: 1100 }, () => {
  const a = R() * Math.PI * 2;
  const r0 = 0.36 + R() * 0.12;
  return { a, bend: (R() - 0.5) * 0.14, r0, r1: r0 + 0.2 + R() * 0.42, bucket: Math.floor(R() * 4) };
});
const CODE = Array.from({ length: 300 }, (_, i) => ({ a: (i / 300) * Math.PI * 2, on: R() > 0.22, len: 0.05 + R() * 0.1, bright: R() > 0.86 }));
const BITS = Array.from({ length: 90 }, (_, i) => ({ a: (i / 90) * Math.PI * 2 + R() * 0.02, on: R() > 0.45, r: 0.62 + R() * 0.07 }));

/**
 * The iris, drawn on a canvas: radial fibres, a rotating ring of "data" ticks, a dotted inner ring,
 * a breathing pupil, a specular highlight, and a scanning sweep while it is checking or alarmed.
 * Colours ease smoothly between moods (blue → red).
 */
export default function IrisCanvas({ mood, scanning }: { mood: IrisMood; scanning: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ mood, scanning, kick: () => {} });
  // ?still=1 (used for screenshots): no animation, colours jump straight to the final state.
  live.current.mood = mood;
  live.current.scanning = scanning;

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const still = new URLSearchParams(window.location.search).get('still') === '1';
    const reduced = still || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let size = 0, raf = 0, last = performance.now(), t = 0;
    let pal = PALETTES[live.current.scanning ? 'safe' : live.current.mood];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = cv.clientWidth;
      cv.width = cv.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const { scanning: scan, mood: m } = live.current;
      const c = size / 2, Rr = size * 0.36;
      const alert = m === 'alert' && !scan;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(c, c);

      // halo
      let g = ctx.createRadialGradient(0, 0, Rr * 0.85, 0, 0, Rr * 1.38);
      g.addColorStop(0, rgba(pal.light, 0.3));
      g.addColorStop(1, rgba(pal.light, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, Rr * 1.38, 0, Math.PI * 2); ctx.fill();

      // iris body
      g = ctx.createRadialGradient(0, 0, Rr * 0.2, 0, 0, Rr);
      g.addColorStop(0, rgba(pal.dark, 1));
      g.addColorStop(0.42, rgba(pal.mid, 1));
      g.addColorStop(0.74, rgba(mix(pal.mid, pal.light, 0.7), 1));
      g.addColorStop(0.9, rgba(pal.mid, 1));
      g.addColorStop(0.97, rgba(pal.dark, 1));
      g.addColorStop(1, rgba(pal.limbal, 1));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, Rr, 0, Math.PI * 2); ctx.fill();

      // fibres, batched by brightness
      ctx.lineWidth = 0.7;
      const alphas = [0.05, 0.1, 0.17, 0.28];
      for (let b = 0; b < 4; b++) {
        ctx.beginPath();
        for (const f of FIBERS) {
          if (f.bucket !== b) continue;
          const am = f.a + f.bend;
          ctx.moveTo(Math.cos(f.a) * f.r0 * Rr, Math.sin(f.a) * f.r0 * Rr);
          ctx.quadraticCurveTo(Math.cos(am) * ((f.r0 + f.r1) / 2) * Rr, Math.sin(am) * ((f.r0 + f.r1) / 2) * Rr, Math.cos(f.a) * f.r1 * Rr, Math.sin(f.a) * f.r1 * Rr);
        }
        ctx.strokeStyle = rgba(pal.fiber, alphas[b]);
        ctx.stroke();
      }

      // dark collarette around the pupil
      g = ctx.createRadialGradient(0, 0, Rr * 0.3, 0, 0, Rr * 0.55);
      g.addColorStop(0, rgba(pal.dark, 0.85));
      g.addColorStop(1, rgba(pal.dark, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, Rr * 0.55, 0, Math.PI * 2); ctx.fill();

      // outer "code" ring (rotates)
      ctx.save();
      ctx.rotate(t * 0.06);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (const k of CODE) if (k.on && !k.bright) { const r0 = 0.8 * Rr, r1 = (0.8 + k.len) * Rr; ctx.moveTo(Math.cos(k.a) * r0, Math.sin(k.a) * r0); ctx.lineTo(Math.cos(k.a) * r1, Math.sin(k.a) * r1); }
      ctx.strokeStyle = rgba(pal.tick, 0.55); ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const k of CODE) if (k.on && k.bright) { const r0 = 0.79 * Rr, r1 = (0.82 + k.len) * Rr; ctx.moveTo(Math.cos(k.a) * r0, Math.sin(k.a) * r0); ctx.lineTo(Math.cos(k.a) * r1, Math.sin(k.a) * r1); }
      ctx.strokeStyle = rgba(pal.tick, 0.95); ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = rgba(pal.tick, 0.45);
      ctx.beginPath(); ctx.arc(0, 0, Rr * 0.975, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      // inner bits ring (counter-rotates)
      ctx.save();
      ctx.rotate(-t * 0.1);
      ctx.fillStyle = rgba(pal.tick, 0.8);
      for (const k of BITS) if (k.on) { ctx.save(); ctx.rotate(k.a); ctx.fillRect(k.r * Rr, -0.8, 2.6, 1.6); ctx.restore(); }
      ctx.setLineDash([1, 3]);
      ctx.strokeStyle = rgba(pal.tick, 0.5);
      ctx.beginPath(); ctx.arc(0, 0, Rr * 0.58, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // scanning sweep
      if ((scan || alert) && 'createConicGradient' in ctx) {
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, Rr, 0, Math.PI * 2); ctx.clip();
        ctx.rotate(t * (scan ? 2.4 : 1.1));
        const cg = ctx.createConicGradient(0, 0, 0);
        cg.addColorStop(0, rgba(pal.light, 0));
        cg.addColorStop(0.82, rgba(pal.light, 0));
        cg.addColorStop(0.995, rgba(pal.tick, scan ? 0.42 : 0.3));
        cg.addColorStop(1, rgba(pal.light, 0));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = cg;
        ctx.fillRect(-Rr, -Rr, Rr * 2, Rr * 2);
        ctx.restore();
      }

      // pupil (breathes; tightens and beats faster on alert)
      const beat = alert ? Math.pow(Math.max(0, Math.sin(t * 3.2)), 6) : 0;
      const pr = Rr * (alert ? 0.3 : 0.34) * (1 + 0.035 * Math.sin(t * 1.1) + 0.05 * beat);
      g = ctx.createRadialGradient(0, -pr * 0.2, pr * 0.1, 0, 0, pr);
      g.addColorStop(0, '#04070c');
      g.addColorStop(1, '#141d2a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(pal.light, 0.55);
      ctx.stroke();

      // specular highlights
      g = ctx.createRadialGradient(-Rr * 0.32, -Rr * 0.36, 0, -Rr * 0.32, -Rr * 0.36, Rr * 0.3);
      g.addColorStop(0, 'rgba(255,255,255,.42)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(-Rr * 0.32, -Rr * 0.36, Rr * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.ellipse(-pr * 0.35, -pr * 0.42, pr * 0.2, pr * 0.11, -0.6, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) t += dt;
      const target = PALETTES[live.current.scanning ? 'safe' : live.current.mood];
      pal = still ? target : mixPal(pal, target, 1 - Math.exp(-dt * 2.6));
      draw();
      // With reduced motion, stop once the colour has settled.
      if (!reduced || dist(pal, target) > 1) raf = requestAnimationFrame(frame);
      else raf = 0;
    };
    const kick = () => {
      if (still) { frame(performance.now()); return; }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    live.current.kick = kick;

    resize();
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(cv);
    kick();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  useEffect(() => { live.current.kick(); }, [mood, scanning]);

  return <canvas ref={canvas} className="iris-canvas" aria-hidden="true" />;
}
