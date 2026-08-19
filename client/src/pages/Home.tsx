/* Design philosophy: 午夜天文台 / 科学仪器美学。全屏观测优先，暖金标记星座，雾青承载仪器读数。 */
import { useMemo, useRef, useState } from "react";
import { Compass, Crosshair, Eye, Focus, Gauge, Info, LocateFixed, Minus, Moon, Plus, RotateCcw, SlidersHorizontal, SunMedium, Telescope, ZoomIn } from "lucide-react";

type Star = { x: number; y: number; r: number; a: number; tone: "warm" | "cool" | "white" };
type Constellation = { id: string; name: string; latin: string; points: [number, number][]; edges: [number, number][]; detail: string };

const CONSTELLATIONS: Constellation[] = [
  { id: "orion", name: "猎户座", latin: "ORION", points: [[20, 34], [31, 24], [42, 31], [49, 47], [43, 61], [32, 52], [25, 69], [16, 65]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [5, 6], [6, 7]], detail: "冬季最醒目的猎人轮廓" },
  { id: "ursa", name: "大熊座", latin: "URSA MAJOR", points: [[63, 24], [72, 20], [80, 27], [86, 38], [77, 43], [68, 39], [58, 34]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]], detail: "北天七星勾勒的巨熊" },
  { id: "cassiopeia", name: "仙后座", latin: "CASSIOPEIA", points: [[57, 60], [65, 53], [72, 62], [80, 52], [89, 59]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]], detail: "呈 W 形横跨北方天区" },
];

function seededStars(count: number): Star[] {
  let seed = 93271;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  return Array.from({ length: count }, () => ({ x: rand() * 100, y: rand() * 72 + 2, r: rand() * 1.55 + 0.35, a: rand() * 0.65 + 0.3, tone: rand() > 0.84 ? "warm" : rand() > 0.55 ? "cool" : "white" }));
}

export default function Home() {
  const [active, setActive] = useState("orion");
  const [showLines, setShowLines] = useState(true);
  const [showNames, setShowNames] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [azimuth, setAzimuth] = useState(184);
  const [altitude, setAltitude] = useState(42);
  const [viewX, setViewX] = useState(0);
  const [viewY, setViewY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef({ x: 0, y: 0, viewX: 0, viewY: 0, az: 184, alt: 42 });
  const stars = useMemo(() => seededStars(168), []);
  const constellation = CONSTELLATIONS.find((item) => item.id === active) ?? CONSTELLATIONS[0];

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, viewX, viewY, az: azimuth, alt: altitude };
    setIsDragging(true);
  };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const nextX = Math.max(-520, Math.min(520, drag.current.viewX - (event.clientX - drag.current.x)));
    const nextY = Math.max(-300, Math.min(300, drag.current.viewY - (event.clientY - drag.current.y)));
    setViewX(nextX);
    setViewY(nextY);
    setAzimuth(Math.round((drag.current.az + nextX * 0.22 + 360) % 360));
    setAltitude(Math.max(12, Math.min(78, Math.round(drag.current.alt + nextY * 0.12))));
  };
  const stopDrag = () => setIsDragging(false);
  const resetView = () => { setAzimuth(184); setAltitude(42); setViewX(0); setViewY(0); setZoom(1); };

  return (
    <main className="observatory" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <div className="sky-stage" style={{ transform: `translate(${viewX}px, ${viewY}px) scale(${zoom})` }}>
        <div className="sky-gradient" />
        <div className="milky-way" />
        <div className="stars-layer" aria-hidden="true">
          {stars.map((star, index) => <i key={index} className={`star star-${star.tone}`} style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.r * 2}px`, height: `${star.r * 2}px`, opacity: star.a }} />)}
        </div>
        <div className="horizon-glow" />
        <svg className={`constellation-map ${showLines ? "visible" : "hidden"}`} viewBox="0 0 100 78" preserveAspectRatio="none" aria-label={`${constellation.name}星座连线`}>
          {constellation.edges.map(([from, to], index) => <line key={index} x1={constellation.points[from][0]} y1={constellation.points[from][1]} x2={constellation.points[to][0]} y2={constellation.points[to][1]} />)}
          {constellation.points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index === 0 ? 0.9 : 0.56} />)}
        </svg>
        {showNames && <div className="constellation-label" style={{ left: `${constellation.points[0][0] + 3}%`, top: `${constellation.points[0][1] - 5}%` }}><span>{constellation.latin}</span><strong>{constellation.name}</strong></div>}
        <div className="horizon horizon-back"><span className="ridge ridge-one" /><span className="ridge ridge-two" /><span className="ridge ridge-three" /></div>
        <div className="horizon horizon-front"><span className="ground-texture" /><div className="observer"><div className="observer-head" /><div className="observer-body" /><div className="observer-leg left" /><div className="observer-leg right" /><div className="telescope-tripod" /><div className="telescope-tube" /><div className="telescope-lens" /></div></div>
      </div>

      <header className="topbar">
        <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><div className="eyebrow">NIGHT OBSERVATORY · 04</div><h1>午夜天文台</h1></div></div>
        <div className="status"><span className="status-dot" /> SKY IS CLEAR <b>·</b> 观测条件良好</div>
        <button className="icon-button" aria-label="观测信息"><Info size={17} /></button>
      </header>

      <aside className="left-rail"><div className="rail-label">CONSTELLATIONS</div>{CONSTELLATIONS.map((item) => <button key={item.id} className={`constellation-tab ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}><span className="tab-dot" /><span>{item.name}</span><small>{item.latin}</small></button>)}</aside>

      <section className="scene-hint"><Crosshair size={15} /><span>{isDragging ? "拖动中 · 调整视角" : "拖动天空以转动望远镜"}</span><kbd>DRAG</kbd></section>

      <aside className="right-console">
        <div className="console-header"><span>TELESCOPE VIEW</span><Telescope size={17} /></div>
        <div className="target-readout"><div className="readout-label">当前目标</div><h2>{constellation.name}</h2><p>{constellation.detail}</p><div className="readout-grid"><span><small>AZ</small>{azimuth}°</span><span><small>ALT</small>{altitude}°</span><span><small>MAG</small>2.4</span></div></div>
        <div className="console-section"><div className="section-title"><span>VIEW SCALE</span><strong>{zoom.toFixed(1)}×</strong></div><div className="scale-control"><button onClick={() => setZoom(Math.max(0.8, +(zoom - 0.1).toFixed(1)))} aria-label="缩小"><Minus size={14} /></button><div className="scale-track"><span style={{ width: `${((zoom - 0.8) / 1.2) * 100}%` }} /></div><button onClick={() => setZoom(Math.min(2, +(zoom + 0.1).toFixed(1)))} aria-label="放大"><Plus size={14} /></button></div></div>
        <div className="console-section toggles"><button onClick={() => setShowLines(!showLines)} className={showLines ? "switch-on" : ""}><span className="switch" /><span>星座连线</span></button><button onClick={() => setShowNames(!showNames)} className={showNames ? "switch-on" : ""}><span className="switch" /><span>名称标注</span></button></div>
        <div className="console-actions"><button className="tool-active"><LocateFixed size={16} /><span>锁定目标</span></button><button onClick={resetView}><RotateCcw size={16} /><span>重置视角</span></button></div>
      </aside>

      <footer className="bottom-bar"><div className="location"><Compass size={15} /><span>北纬 31°13′ · 东经 121°29′</span></div><div className="azimuth-dial"><span className="dial-tick t1" /><span className="dial-tick t2" /><span className="dial-tick t3" /><span className="dial-needle" /><span className="dial-north">N</span><span className="dial-east">E</span><span className="dial-south">S</span><span className="dial-west">W</span></div><div className="footer-meta"><span><Moon size={14} /> 朔月 · 04:18</span><span className="divider" /><span>VIEW 68°</span></div></footer>
    </main>
  );
}
