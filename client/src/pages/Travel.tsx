/* Design philosophy: 午夜天文台 / Scientific Instrument Aesthetic. This is a full-screen cockpit view with a tactile arrival orbit mode. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Gauge, Pause, Play, Radio, RotateCcw, Rocket, Telescope } from "lucide-react";
import { useLocation, useParams } from "wouter";

const PLANETS: Record<string, { name: string; latin: string; color: string; distance: string; travel: string; description: string; orbit: string }> = {
  sun: { name: "太阳", latin: "SUN", color: "#ffd875", distance: "149.6 million km", travel: "8 minutes", description: "从地球返回太阳的模拟航行。抵达后进入安全观测距离，避免直接接近太阳表面。", orbit: "1 AU" },
  mercury: { name: "水星", latin: "MERCURY", color: "#b89270", distance: "91.7 million km", travel: "3 months", description: "航向最接近太阳的行星，接近目标后将抵抗强烈太阳辐射与高温环境。", orbit: "0.39 AU" },
  venus: { name: "金星", latin: "VENUS", color: "#e7c887", distance: "41.4 million km", travel: "5 months", description: "穿过金星轨道，接近云层外缘，观察高反照率大气的漫反射辉光。", orbit: "0.72 AU" },
  mars: { name: "火星", latin: "MARS", color: "#d87458", distance: "78.3 million km", travel: "7 months", description: "红色行星与未来深空任务的重要目的地，进入火星轨道后开启近距离观察。", orbit: "1.52 AU" },
  jupiter: { name: "木星", latin: "JUPITER", color: "#d9b58b", distance: "628.7 million km", travel: "2.4 years", description: "穿越长距离深空，最终进入木星外层观测轨道，避开强烈辐射带。", orbit: "5.20 AU" },
  saturn: { name: "土星", latin: "SATURN", color: "#d5c18d", distance: "1.28 billion km", travel: "6.7 years", description: "航向环系壮观的气态巨行星，抵达后环绕观察其行星环结构。", orbit: "9.58 AU" },
};

export default function Travel() {
  const { planetId = "mars" } = useParams<{ planetId: string }>();
  const [, navigate] = useLocation();
  const planet = PLANETS[planetId] ?? PLANETS.mars;
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [arrived, setArrived] = useState(() => new URLSearchParams(window.location.search).get("mode") === "arrival");
  const [orbitYaw, setOrbitYaw] = useState(-12);
  const [orbitPitch, setOrbitPitch] = useState(4);
  const drag = useRef({ active: false, x: 0, y: 0, yaw: -12, pitch: 4 });
  const stars = useMemo(() => Array.from({ length: 180 }, (_, index) => ({ id: index, left: (index * 47) % 100, top: (index * 71) % 100, depth: index % 5, size: 1 + (index % 3) * .55, delay: (index % 13) * .16 })), []);
  const asteroids = useMemo(() => Array.from({ length: 18 }, (_, index) => ({ id: index, top: 8 + (index * 17) % 82, size: 3 + index % 5, delay: (index * .62) % 8, duration: 4.2 + (index % 5) * .8 })), []);

  useEffect(() => {
    if (paused || arrived) return;
    const timer = window.setInterval(() => setProgress((value) => {
      const next = Math.min(100, value + .72);
      if (next >= 100) { setArrived(true); return 100; }
      return next;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [paused, arrived]);

  const startOrbitDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { active: true, x: event.clientX, y: event.clientY, yaw: orbitYaw, pitch: orbitPitch };
  };
  const moveOrbitDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    setOrbitYaw(drag.current.yaw + (event.clientX - drag.current.x) * .35);
    setOrbitPitch(Math.max(-54, Math.min(54, drag.current.pitch - (event.clientY - drag.current.y) * .25)));
  };
  const stopOrbitDrag = () => { drag.current.active = false; };
  const resetOrbit = () => { setOrbitYaw(-12); setOrbitPitch(4); };

  return (
    <main className={`travel-page ${arrived ? "arrival-mode" : "cruise-mode"}`}>
      <div className="travel-stars" aria-hidden="true">{stars.map((star) => <span key={star.id} className={`travel-star depth-${star.depth}`} style={{ left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size, animationDelay: `${star.delay}s` }} />)}</div>
      {!arrived && <div className="asteroid-field" aria-hidden="true">{asteroids.map((asteroid) => <span key={asteroid.id} className="passing-asteroid" style={{ top: `${asteroid.top}%`, width: asteroid.size, height: asteroid.size, animationDelay: `${asteroid.delay}s`, animationDuration: `${asteroid.duration}s` }} />)}</div>}
      <div className="travel-speed-lines" aria-hidden="true" />
      <header className="travel-topbar"><button className="travel-back" onClick={() => navigate("/")}><ArrowLeft size={15} /> 返回观测站</button><div className="travel-brand"><span className="status-dot" /> {arrived ? "ARRIVAL ORBIT · TARGET ACQUIRED" : "INTERPLANETARY TRANSFER · MISSION 01"}</div><div className="travel-signal"><Radio size={14} /> SIGNAL 98.2%</div></header>
      {!arrived ? <>
        <section className="flight-hud"><div className="mission-kicker">EARTH DEPARTURE · PILOT VIEW</div><h1>星际航行中</h1><p>飞船正在穿越深空，目标：<strong>{planet.name}</strong></p></section>
        <div className="cockpit-frame"><div className="cockpit-reticle"><span /><span /><span /><span /></div><div className="cockpit-ship"><Rocket size={18} /><span>SHIP VECTOR · 0.72 AU / DAY</span></div></div>
        <aside className="flight-console"><div className="console-header"><span>FLIGHT TELEMETRY · PILOT VIEW</span><Telescope size={17} /></div><div className="mission-target"><div className="readout-label">DESTINATION LOCK</div><h2>{planet.name}</h2><span>{planet.latin} · {planet.orbit}</span></div><div className="telemetry-row"><span><small>PROGRESS</small>{progress.toFixed(1)}%</span><span><small>RANGE</small>{planet.distance}</span><span><small>ETA</small>{planet.travel}</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p className="mission-copy">{planet.description}</p><button className="mission-action" onClick={() => setPaused(!paused)}>{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? "继续航行" : "暂停航行"}</button></aside>
        <div className="flight-status"><Gauge size={14} /> {paused ? "航行暂停 · 等待指令" : "深空穿越中 · 星尘相对速度 0.82c"}</div>
      </> : <section className="arrival-stage"><div className="arrival-copy"><div className="mission-kicker">ARRIVAL CONFIRMED · ORBIT INSERTION COMPLETE</div><h1>已抵达 {planet.name}</h1><p>拖拽行星查看近距离 3D 轨道视角</p></div><div className="arrival-viewer" onPointerDown={startOrbitDrag} onPointerMove={moveOrbitDrag} onPointerUp={stopOrbitDrag} onPointerCancel={stopOrbitDrag}><div className="orbit-guide" /><div className="arrival-planet" style={{ background: `radial-gradient(circle at 28% 24%, #fff4d1 0%, ${planet.color} 15%, #211b23 71%)`, boxShadow: `0 0 75px ${planet.color}88`, transform: `rotateX(${orbitPitch}deg) rotateY(${orbitYaw}deg)` }}><span className="planet-highlight" /><span className="planet-shadow" /></div><div className="viewer-label">DRAG TO ORBIT · {orbitYaw.toFixed(0)}° / {orbitPitch.toFixed(0)}°</div></div><aside className="arrival-console"><div className="console-header"><span>TARGET ORBIT · 3D</span><Telescope size={17} /></div><div className="mission-target"><div className="readout-label">CURRENT DESTINATION</div><h2>{planet.name}</h2><span>{planet.latin} · {planet.orbit}</span></div><p className="mission-copy">近距离观测模式已启用。拖拽中央行星可从不同方向查看表面明暗、辉光与轨道姿态。</p><button className="mission-action" onClick={resetOrbit}><RotateCcw size={15} />重置环绕视角</button><button className="mission-action secondary" onClick={() => { setProgress(0); setArrived(false); setPaused(false); }}>重新开始航行</button></aside></section>}
      <footer className="travel-footer"><span>航行状态 · {arrived ? "已抵达目标轨道" : paused ? "暂停中" : "深空巡航中"}</span><span>地球时间 · 模拟模式 · {arrived ? "ORBIT VIEW" : `${progress.toFixed(1)}%`}</span></footer>
    </main>
  );
}
