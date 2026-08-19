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
  const solarReturn = targetId === "sun";
  const logTime = (index: number) => `T+ ${Math.max(0, progress - (logStage - index) * 12).toFixed(1)}%`;
  const [paused, setPaused] = useState(false);
  const flightCallout = paused ? "NAV HOLD · AWAITING PILOT INPUT" : progress < 30 ? "SHIP VECTOR · DEPARTURE BURN" : progress < 70 ? "SHIP VECTOR · DEEP SPACE CRUISE" : "SHIP VECTOR · TARGET APPROACH";
  const earthTime = useMemo(() => new Date(Date.UTC(2026, 7, 19, 20, 50) + progress * 60 * 60 * 1000).toISOString().slice(11, 16), [progress]);
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
      <header className="travel-topbar"><button className="travel-back" onClick={() => navigate("/")}><ArrowLeft size={15} /> 返回观测站</button></header>
      {!arrived ? <>
        <aside className="flight-console"><div className="mission-target"><div className="readout-label">目标锁定</div><h2>{planet.name}</h2><span>{planet.latin} · {planet.orbit}</span></div><p className="mission-copy">{planet.description}</p></aside>
        <div className="flight-status"><Gauge size={14} /> {paused ? "航行状态 · 已暂停" : "航行状态 · 航行中"}</div><div className="bottom-telemetry"><div className="bottom-telemetry-row"><span><small>进度</small>{progress.toFixed(1)}%</span><span><small>距离</small>{planet.distance}</span><span><small>预计抵达</small>{planet.travel}</span><span><small>地球时间</small>{earthTime}</span></div></div><div className="center-flight-controls"><button className="cockpit-control" aria-pressed={paused} onClick={() => setPaused(!paused)}><span className="control-led" />{paused ? <Play size={15} /> : <Gauge size={15} />}<span><strong>{paused ? "推进恢复" : "推力保持"}</strong><small>{paused ? "推进恢复" : "推力保持"}</small></span></button><button className="cockpit-control lock-control" onClick={() => { setProgress(100); setArrived(true); setPaused(false); }}><span className="control-led" /> <Rocket size={15} /><span><strong>航线锁定</strong><small>目标锁定 · 接近中</small></span></button></div><div className="ai-log-panel"><div className="panel-kicker"><span className="panel-live" /> AI 航行日志 · 实时</div><div className="log-time">当前航行时刻 · {logTime(logStage)} · 阶段 {String(logStage + 1).padStart(2, "0")}</div><p>{aiLogs[logStage]}</p><div className="log-stream">{aiLogs.slice(0, logStage + 1).map((entry, index) => <span key={entry} className={index === logStage ? "current" : ""}><b>{logTime(index)}</b> › {entry}</span>)}</div></div><div className="navigation-panel planet-list-panel"><div className="panel-kicker">行星 · 6 个目标</div><div className="planet-list">{Object.entries(PLANETS).map(([id, item]) => <button key={id} className={targetId === id ? "planet-list-item active" : "planet-list-item"} onClick={() => changeTarget(id)}><span className="planet-list-dot" style={{ background: item.color }} /><span className="planet-list-copy"><strong>{item.name}</strong><small>{item.latin}</small></span></button>)}</div></div>
      </> : <section className={`arrival-stage ${solarReturn ? "sun-safe-arrival" : ""}`}><div className="arrival-copy"><div className="mission-kicker">已确认抵达 · 已进入目标轨道</div><h1>{solarReturn ? "已进入太阳安全观测距离" : `已抵达 ${planet.name}`}</h1><p>{solarReturn ? "当前保持远距观测轨道，已启用隔热屏与辐射防护。" : "拖拽行星查看近距离 3D 轨道视角"}</p></div><div className="arrival-viewer"><div className="orbit-guide" /><PlanetThreeScene planetId={targetId} color={planet.color} onAnglesChange={(yaw, pitch) => { setOrbitYaw(yaw); setOrbitPitch(pitch); }} /><div className="viewer-label">{solarReturn ? "安全距离环绕 · " : "拖拽环绕 · "}{orbitYaw.toFixed(0)}° / {orbitPitch.toFixed(0)}° · 滚轮缩放</div></div><aside className="arrival-console"><div className="console-header"><span>目标轨道 · 三维</span><Telescope size={17} /></div><div className="mission-target"><div className="readout-label">当前目的地</div><h2>{planet.name}</h2><span>{planet.latin} · {planet.orbit}</span></div><p className="mission-copy">{solarReturn ? "安全观测模式已启用。飞船保持远离光球层的观测距离，拖拽中央太阳可查看耀斑辉光与日面旋转。" : "近距离观测模式已启用。拖拽中央行星可从不同方向查看表面明暗、辉光与轨道姿态。"}</p><button className="mission-action" onClick={resetOrbit}><RotateCcw size={15} />重置环绕视角</button><button className="mission-action secondary" onClick={() => { setProgress(0); setArrived(false); setPaused(false); }}>重新开始航行</button></aside></section>}
      
    </main>
  );
}
