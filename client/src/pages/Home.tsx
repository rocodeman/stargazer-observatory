/* Design philosophy: 午夜天文台 / Scientific Instrument Aesthetic. A true celestial sphere replaces the former flat viewport; controls remain edge-mounted and quiet. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Crosshair, Eye, Info, LocateFixed, Minus, Moon, Plus, RotateCcw, Telescope } from "lucide-react";
import { SKY_DATA } from "@/data/skyData";

type Vec3 = { x: number; y: number; z: number };
type Projected = Vec3 & { sx: number; sy: number; visible: boolean };

const FEATURED = ["ori", "uma", "cas", "cyg", "sco", "leo", "gem", "tau", "lyr", "sgr", "and", "peg"];
const STAR_COUNT = SKY_DATA.meta.starCount;
const CONSTELLATION_COUNT = SKY_DATA.meta.constellationCount;

function toVector(ra: number, dec: number): Vec3 {
  const r = (ra / 24) * Math.PI * 2;
  const d = (dec * Math.PI) / 180;
  return { x: Math.cos(d) * Math.cos(r), y: Math.sin(d), z: Math.cos(d) * Math.sin(r) };
}

function project(vector: Vec3, yaw: number, pitch: number, width: number, height: number, zoom: number): Projected {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x1 = vector.x * cy - vector.z * sy;
  const z1 = vector.x * sy + vector.z * cy;
  const y1 = vector.y * cp - z1 * sp;
  const z2 = vector.y * sp + z1 * cp;
  const az = Math.atan2(x1, z2);
  const alt = Math.asin(Math.max(-1, Math.min(1, y1)));
  const fovX = Math.min(Math.PI * 1.65, (Math.PI * 1.65) / zoom);
  const fovY = Math.min(Math.PI * 0.95, (Math.PI * 0.95) / zoom);
  const visible = Math.abs(az) < fovX / 2 && Math.abs(alt) < fovY / 2;
  return { x: x1, y: y1, z: z2, sx: width / 2 + (az / fovX) * width, sy: height / 2 - (alt / fovY) * height, visible };
}

function starColor(ci: number) {
  if (ci < 0.25) return "#b9d9f0";
  if (ci > 1.05) return "#f0b56f";
  if (ci > 0.75) return "#efca88";
  return "#f0f1df";
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef({ active: false, x: 0, y: 0, yaw: 0, pitch: 0 });
  const [active, setActive] = useState("ori");
  const [showLines, setShowLines] = useState(true);
  const [showNames, setShowNames] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [yaw, setYaw] = useState(0.9);
  const [pitch, setPitch] = useState(0.18);
  const [isDragging, setIsDragging] = useState(false);
  const [label, setLabel] = useState<{ x: number; y: number; name: string; latin: string } | null>(null);

  const stars = useMemo(() => SKY_DATA.stars.map((star) => ({ ...star, vector: toVector(star.ra, star.dec) })), []);
  const byHr = useMemo(() => new Map(stars.map((star) => [star.hr, star])), [stars]);
  const current = SKY_DATA.constellations.find((item) => item.id === active) ?? SKY_DATA.constellations[0];
  const featured = FEATURED.map((id) => SKY_DATA.constellations.find((item) => item.id === id)).filter((item): item is typeof SKY_DATA.constellations[number] => Boolean(item));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = rect.width;
      const height = rect.height;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createRadialGradient(width * .52, height * .37, 0, width * .52, height * .52, Math.max(width, height) * .76);
      gradient.addColorStop(0, "#173a55"); gradient.addColorStop(.42, "#0d2739"); gradient.addColorStop(1, "#050d15");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      const projected = new Map<number, Projected>();
      for (const star of stars) {
        const p = project(star.vector, yaw, pitch, width, height, zoom);
        projected.set(star.hr, p);
        if (!p.visible || p.sx < -12 || p.sx > width + 12 || p.sy < -12 || p.sy > height + 12) continue;
        const radius = Math.max(.38, Math.min(3.2, 2.7 - star.mag * .34)) * (star.mag < 2.6 ? 1.15 : 1);
        ctx.globalAlpha = Math.max(.2, Math.min(.96, 1.15 - (star.mag + 1.5) / 8));
        ctx.fillStyle = starColor(star.ci);
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = star.mag < 2.7 ? 7 : 1.5;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (showLines) {
        for (let index = 0; index < current.points.length - 1; index += 1) {
          const hr = current.points[index];
          const nextHr = current.points[index + 1]; if (nextHr === undefined) break;
          const from = projected.get(hr), to = projected.get(nextHr);
          if (!from || !to || !from.visible || !to.visible) continue;
          ctx.strokeStyle = "rgba(231,185,106,.78)"; ctx.lineWidth = 1.1; ctx.setLineDash([6, 5]);
          ctx.beginPath(); ctx.moveTo(from.sx, from.sy); ctx.lineTo(to.sx, to.sy); ctx.stroke();
        }
      }
      const selectedPoints = current.points.map((hr) => projected.get(hr)).filter((p): p is Projected => Boolean(p && p.visible));
      if (showNames && selectedPoints.length) {
        const center = selectedPoints.reduce((acc, p) => ({ x: acc.x + p.sx, y: acc.y + p.sy }), { x: 0, y: 0 });
        setLabel({ x: center.x / selectedPoints.length, y: center.y / selectedPoints.length - 20, name: current.name, latin: current.abbr.toUpperCase() });
      } else setLabel(null);
      ctx.globalAlpha = 1;
    };
    render();
  }, [stars, current, byHr, yaw, pitch, zoom, showLines, showNames]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { active: true, x: event.clientX, y: event.clientY, yaw, pitch };
    setIsDragging(true);
  };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    setYaw(drag.current.yaw - (event.clientX - drag.current.x) * 0.006);
    setPitch(Math.max(-1.48, Math.min(1.48, drag.current.pitch + (event.clientY - drag.current.y) * 0.006)));
  };
  const stopDrag = () => { drag.current.active = false; setIsDragging(false); };
  const resetView = () => { setYaw(.9); setPitch(.18); setZoom(1); };
  const azimuth = Math.round((((yaw * 180) / Math.PI + 360) % 360));
  const altitude = Math.round((pitch * 180) / Math.PI);

  return (
    <main className="observatory">
      <div className="sky-shell"><canvas ref={canvasRef} className="sky-canvas" aria-label="3D 天球观测视场" /><div className="milky-way" /><div className="horizon horizon-back"><span className="ridge ridge-one" /><span className="ridge ridge-two" /><span className="ridge ridge-three" /></div><div className="horizon horizon-front"><span className="ground-texture" /><div className="observer"><div className="observer-head" /><div className="observer-body" /><div className="observer-leg left" /><div className="observer-leg right" /><div className="telescope-tripod" /><div className="telescope-tube" /><div className="telescope-lens" /></div></div></div><div className="sky-gesture-layer" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} />
      {label && <div className="constellation-label" style={{ left: label.x, top: label.y }}><span>{label.latin}</span><strong>{label.name}</strong></div>}
      <header className="topbar"><div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><div className="eyebrow">NIGHT OBSERVATORY · 3D SKY</div><h1>午夜天文台</h1></div></div><div className="status"><span className="status-dot" /> HYG v4.1 · {STAR_COUNT.toLocaleString()} STARS <b>·</b> {CONSTELLATION_COUNT} CONSTELLATIONS</div><button className="icon-button" aria-label="观测信息"><Info size={17} /></button></header>
      <aside className="left-rail"><div className="rail-label">CONSTELLATIONS · {CONSTELLATION_COUNT}</div>{featured.map((item) => <button key={item.id} className={`constellation-tab ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}><span className="tab-dot" /><span>{item.name}</span><small>{item.abbr.toUpperCase()}</small></button>)}</aside>
      <section className="scene-hint"><Crosshair size={15} /><span>{isDragging ? "球面旋转中 · 探索天球" : "拖动以环视 3D 天球"}</span><kbd>ORBIT</kbd></section>
      <aside className="right-console"><div className="console-header"><span>TELESCOPE VIEW · 3D</span><Telescope size={17} /></div><div className="target-readout"><div className="readout-label">当前目标 · {current.name}</div><h2>{current.name}</h2><p>真实星表节点与星座线 · J2000</p><div className="readout-grid"><span><small>AZ</small>{azimuth}°</span><span><small>ALT</small>{altitude}°</span><span><small>MAG</small>{current.points.length}</span></div></div><div className="console-section"><div className="section-title"><span>VIEW SCALE</span><strong>{zoom.toFixed(1)}×</strong></div><div className="scale-control"><button onClick={() => setZoom(Math.max(.7, +(zoom - .1).toFixed(1)))} aria-label="缩小"><Minus size={14} /></button><div className="scale-track"><span style={{ width: `${((zoom - .7) / 1.1) * 100}%` }} /></div><button onClick={() => setZoom(Math.min(1.8, +(zoom + .1).toFixed(1)))} aria-label="放大"><Plus size={14} /></button></div></div><div className="console-section toggles"><button onClick={() => setShowLines(!showLines)} className={showLines ? "switch-on" : ""}><span className="switch" /><span>星座连线</span></button><button onClick={() => setShowNames(!showNames)} className={showNames ? "switch-on" : ""}><span className="switch" /><span>名称标注</span></button></div><div className="console-actions"><button className="tool-active"><LocateFixed size={16} /><span>锁定目标</span></button><button onClick={resetView}><RotateCcw size={16} /><span>重置视角</span></button></div></aside>
      <footer className="bottom-bar"><div className="location"><Compass size={15} /><span>天球坐标 · J2000 · 真实星表</span></div><div className="azimuth-dial"><span className="dial-tick t1" /><span className="dial-tick t2" /><span className="dial-tick t3" /><span className="dial-needle" /><span className="dial-north">N</span><span className="dial-east">E</span><span className="dial-south">S</span><span className="dial-west">W</span></div><div className="footer-meta"><span><Moon size={14} /> 朔月 · 04:18</span><span className="divider" /><span>HYG / BSC</span></div></footer>
    </main>
  );
}
