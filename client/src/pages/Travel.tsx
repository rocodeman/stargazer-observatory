/* Design philosophy: 午夜天文台 / Scientific Instrument Aesthetic. This is a full-screen cockpit view with a tactile arrival orbit mode. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Gauge, Pause, Play, RotateCcw, Rocket, Telescope } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PlanetThreeScene from "@/components/PlanetThreeScene";

const PLANETS: Record<string, { name: string; latin: string; color: string; distance: string; travel: string; description: string; orbit: string }> = {
  sun: { name: "太阳", latin: "SUN", color: "#ffd875", distance: "149.6 million km", travel: "8 minutes", description: "从地球返回太阳的模拟航行。抵达后进入安全观测距离，避免直接接近太阳表面。", orbit: "1 AU" },
  mercury: { name: "水星", latin: "MERCURY", color: "#b89270", distance: "91.7 million km", travel: "3 months", description: "航向最接近太阳的行星，接近目标后将抵抗强烈太阳辐射与高温环境。", orbit: "0.39 AU" },
  venus: { name: "金星", latin: "VENUS", color: "#e7c887", distance: "41.4 million km", travel: "5 months", description: "穿过金星轨道，接近云层外缘，观察高反照率大气的漫反射辉光。", orbit: "0.72 AU" },
  mars: { name: "火星", latin: "MARS", color: "#d87458", distance: "78.3 million km", travel: "7 months", description: "红色行星与未来深空任务的重要目的地，进入火星轨道后开启近距离观察。", orbit: "1.52 AU" },
  jupiter: { name: "木星", latin: "JUPITER", color: "#d9b58b", distance: "628.7 million km", travel: "2.4 years", description: "穿越长距离深空，最终进入木星外层观测轨道，避开强烈辐射带。", orbit: "5.20 AU" },
  saturn: { name: "土星", latin: "SATURN", color: "#d5c18d", distance: "1.28 billion km", travel: "6.7 years", description: "航向环系壮观的气态巨行星，抵达后环绕观察其行星环结构。", orbit: "9.58 AU" },
};

const AI_LOGS: Record<string, string[]> = {
  sun: ["太阳风粒子流稳定，飞船进入黄道面内侧航段。", "目标辐射强度上升，已自动调整隔热屏角度。", "太阳光球层的对流颗粒正在形成可见的金色纹理。", "进入太阳安全观测距离，准备切换近距离轨道。"],
  mercury: ["正在穿过水星轨道，前方为高温、低反照率的内行星环境。", "水星昼夜温差极大，航向计算已避开正午子午线。", "目标表面陨石坑密度上升，雷达开始采集地形回波。", "接近水星轨道，准备进入同步观测窗口。"],
  venus: ["前方黄道面云层反照增强，金星大气散射光正在升高。", "检测到高压二氧化碳云层，飞船保持云顶上方航线。", "金星云层呈现全球性旋转结构，导航系统锁定晨昏线。", "进入金星外层观测轨道，准备进行云顶扫描。"],
  mars: ["深空粒子背景下降，飞船进入火星转移轨道。", "前方检测到稀薄尘埃云，火星红色表面反照率正在增强。", "极冠与峡谷地貌进入望远镜分辨范围，开始预热观测阵列。", "接近火星轨道，准备进入近距离环绕观察。"],
  jupiter: ["正在离开内太阳系，背景星场密度进入外行星巡航模式。", "木星磁层范围巨大，航线已切换为辐射带外侧路径。", "目标云带和大红斑进入远距可见范围，光谱仪开始采样。", "接近木星系统，准备避开强辐射带并插入观测轨道。"],
  saturn: ["飞船进入外太阳系深空，星尘相对速度保持在 0.82c。", "土星环的冰粒散射光开始从前方星场中分离出来。", "环系内侧缝隙被识别，导航正在计算安全切入角度。", "进入土星外层观测轨道，准备展开环系三维扫描。"],
};

export default function Travel() {
  const { planetId = "mars" } = useParams<{ planetId: string }>();
  const [, navigate] = useLocation();
  const [targetId, setTargetId] = useState(planetId);
  const planet = PLANETS[targetId] ?? PLANETS.mars;
  const aiLogs = AI_LOGS[targetId] ?? AI_LOGS.mars;
  const [progress, setProgress] = useState(0);
  const logStage = Math.min(aiLogs.length - 1, Math.floor(progress / 26));
  const [paused, setPaused] = useState(false);
  const flightCallout = paused ? "NAV HOLD · AWAITING PILOT INPUT" : progress < 30 ? "SHIP VECTOR · DEPARTURE BURN" : progress < 70 ? "SHIP VECTOR · DEEP SPACE CRUISE" : "SHIP VECTOR · TARGET APPROACH";
  const [arrived, setArrived] = useState(() => new URLSearchParams(window.location.search).get("mode") === "arrival");
  const [orbitYaw, setOrbitYaw] = useState(-12);
  const [orbitPitch, setOrbitPitch] = useState(4);
  const drag = useRef({ active: false, x: 0, y: 0, yaw: -12, pitch: 4 });
  const stars = useMemo(() => Array.from({ length: 240 }, (_, index) => ({ id: index, angle: (index * 137.5) % 360, travel: 34 + (index * 19) % 70, depth: index % 5, size: 1 + (index % 3) * .55, delay: (index % 19) * .08, duration: 1.5 + (index % 7) * .18 })), []);
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
  const changeTarget = (nextId: string) => { setTargetId(nextId); window.history.replaceState(null, "", `/travel/${nextId}`); setProgress(0); setArrived(false); setPaused(false); };

  return (
    <main className={`travel-page ${arrived ? "arrival-mode" : "cruise-mode"}`}>
      <div className="travel-stars" aria-hidden="true">{stars.map((star) => <span key={star.id} className={`travel-star depth-${star.depth}`} style={{ ['--angle' as string]: `${star.angle}deg`, ['--travel' as string]: `${star.travel}vw`, ['--star-size' as string]: `${star.size}px`, ['--star-delay' as string]: `${star.delay}s`, ['--star-duration' as string]: `${star.duration}s` }} />)}</div>
      {!arrived && <div className="asteroid-field" aria-hidden="true">{asteroids.map((asteroid) => <span key={asteroid.id} className="passing-asteroid" style={{ left: `${asteroid.id % 2 ? 108 : -8}%`, ['--fly' as string]: asteroid.id % 2 ? -1 : 1, top: `${asteroid.top}%`, width: asteroid.size, height: asteroid.size, animationDelay: `${asteroid.delay}s`, animationDuration: `${asteroid.duration}s` }} />)}</div>}
      <div className="travel-speed-lines" aria-hidden="true" />
      <header className="travel-topbar"><button className="travel-back" onClick={() => navigate("/")}><ArrowLeft size={15} /> 返回观测站</button><div className="travel-top-title">星际航行中</div></header>
      {!arrived ? <>
        <div className="cockpit-ship flight-callout"><Rocket size={18} /><span>{flightCallout} · 0.82c · 38,400 km/s</span></div>
        <aside className="flight-console"><div className="console-header"><span>FLIGHT TELEMETRY · PILOT VIEW</span><Telescope size={17} /></div><div className="mission-target"><div className="readout-label">DESTINATION LOCK</div><h2>{planet.name}</h2><span>{planet.latin} · {planet.orbit}</span></div><div className="telemetry-row"><span><small>PROGRESS</small>{progress.toFixed(1)}%</span><span><small>RANGE</small>{planet.distance}</span><span><small>ETA</small>{planet.travel}</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p className="mission-copy">{planet.description}</p><div className="flight-actions"><button className="mission-action" onClick={() => setPaused(!paused)}>{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? "继续航行" : "暂停航行"}</button><button className="mission-action direct-action" onClick={() => { setProgress(100); setArrived(true); setPaused(false); }}><Rocket size={15} />直达</button></div></aside>
        <div className="flight-status"><Gauge size={14} /> {paused ? "航行暂停 · 等待指令" : "深空穿越中 · 星尘相对速度 0.82c"}</div><div className="ai-log-panel"><span>AI NAV LOG · T+ {progress.toFixed(1)}% · STAGE {String(logStage + 1).padStart(2, "0")}</span></div><div className="navigation-panel"><div className="panel-kicker">NAVIGATION · TARGET SELECT</div><div className="nav-route"><span>EARTH</span><i>→</i><strong>{planet.latin}</strong></div><div className="nav-targets">{Object.entries(PLANETS).map(([id, item]) => <button key={id} className={targetId === id ? "nav-target active" : "nav-target"} onClick={() => changeTarget(id)}><span className="nav-dot" style={{ background: item.color }} />{item.name}<small>{item.latin}</small></button>)}</div></div>
      </> : <section className="arrival-stage"><div className="arrival-copy"><div className="mission-kicker">ARRIVAL CONFIRMED · ORBIT INSERTION COMPLETE</div><h1>已抵达 {planet.name}</h1><p>拖拽行星查看近距离 3D 轨道视角</p></div><div className="arrival-viewer"><div className="orbit-guide" /><PlanetThreeScene planetId={targetId} color={planet.color} onAnglesChange={(yaw, pitch) => { setOrbitYaw(yaw); setOrbitPitch(pitch); }} /><div className="viewer-label">DRAG TO ORBIT · {orbitYaw.toFixed(0)}° / {orbitPitch.toFixed(0)}° · WHEEL TO ZOOM</div></div><aside className="arrival-console"><div className="console-header"><span>TARGET ORBIT · 3D</span><Telescope size={17} /></div><div className="mission-target"><div className="readout-label">CURRENT DESTINATION</div><h2>{planet.name}</h2><span>{planet.latin} · {planet.orbit}</span></div><p className="mission-copy">近距离观测模式已启用。拖拽中央行星可从不同方向查看表面明暗、辉光与轨道姿态。</p><button className="mission-action" onClick={resetOrbit}><RotateCcw size={15} />重置环绕视角</button><button className="mission-action secondary" onClick={() => { setProgress(0); setArrived(false); setPaused(false); }}>重新开始航行</button></aside></section>}
      <footer className="travel-footer"><span>航行状态 · {arrived ? "已抵达目标轨道" : paused ? "暂停中" : "深空巡航中"}</span><span>地球时间 · 模拟模式 · {arrived ? "ORBIT VIEW" : `${progress.toFixed(1)}%`}</span></footer>
    </main>
  );
}
