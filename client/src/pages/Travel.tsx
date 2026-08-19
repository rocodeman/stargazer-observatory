/* Design philosophy: 午夜天文台 / Scientific Instrument Aesthetic. Travel is a quiet mission-control view, not a separate visual world. */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Gauge, Orbit, Radio, Rocket, Telescope } from "lucide-react";
import { useLocation, useParams } from "wouter";

const PLANETS: Record<string, { name: string; latin: string; color: string; distance: string; travel: string; description: string; orbit: string }> = {
  sun: { name: "太阳", latin: "SUN", color: "#ffd875", distance: "149.6 million km", travel: "8 minutes", description: "从地球返回太阳的模拟航行。飞船需要在接近阶段降低热负荷，并进入安全观测距离。", orbit: "1 AU" },
  mercury: { name: "水星", latin: "MERCURY", color: "#b89270", distance: "91.7 million km", travel: "3 months", description: "航向最接近太阳的行星。接近目标后，飞船需要抵抗强烈的太阳辐射与高温环境。", orbit: "0.39 AU" },
  venus: { name: "金星", latin: "VENUS", color: "#e7c887", distance: "41.4 million km", travel: "5 months", description: "云层下的高温世界。航行界面会在接近阶段提高大气散射与目标辉光。", orbit: "0.72 AU" },
  mars: { name: "火星", latin: "MARS", color: "#d87458", distance: "78.3 million km", travel: "7 months", description: "红色行星与未来深空任务的重要目的地。当前模拟展示行星际转移航段。", orbit: "1.52 AU" },
  jupiter: { name: "木星", latin: "JUPITER", color: "#d9b58b", distance: "628.7 million km", travel: "2.4 years", description: "太阳系最大的行星。飞船将穿越长距离深空，沿途观测星尘与外太阳系天区。", orbit: "5.20 AU" },
  saturn: { name: "土星", latin: "SATURN", color: "#d5c18d", distance: "1.28 billion km", travel: "6.7 years", description: "环系壮观的气态巨行星。航行完成后将进入土星环外缘的观测轨道。", orbit: "9.58 AU" },
};

export default function Travel() {
  const { planetId = "mars" } = useParams<{ planetId: string }>();
  const [, navigate] = useLocation();
  const planet = PLANETS[planetId] ?? PLANETS.mars;
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const stars = useMemo(() => Array.from({ length: 120 }, (_, index) => ({ id: index, left: (index * 47) % 100, top: (index * 71) % 88, size: 1 + (index % 3) * .6, delay: (index % 13) * .18 })), []);

  useEffect(() => {
    if (paused || progress >= 100) return;
    const timer = window.setInterval(() => setProgress((value) => Math.min(100, value + .34)), 1000);
    return () => window.clearInterval(timer);
  }, [paused, progress]);

  return (
    <main className="travel-page">
      <div className="travel-stars" aria-hidden="true">{stars.map((star) => <span key={star.id} style={{ left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size, animationDelay: `${star.delay}s` }} />)}</div>
      <div className="travel-nebula" aria-hidden="true" />
      <header className="travel-topbar"><button className="travel-back" onClick={() => navigate("/")}><ArrowLeft size={15} /> 返回观测站</button><div className="travel-brand"><span className="status-dot" /> INTERPLANETARY TRANSFER · MISSION 01</div><div className="travel-signal"><Radio size={14} /> SIGNAL 98.2%</div></header>
      <section className="travel-hero"><div className="mission-kicker">EARTH DEPARTURE · TARGET LOCKED</div><h1>开始星际旅行</h1><p>从地球出发，前往 <strong>{planet.name}</strong> 的模拟航行</p></section>
      <section className="travel-route"><div className="route-node earth-node"><span className="earth-dot" /><small>地球 · EARTH</small></div><div className="route-line"><span className="route-progress" style={{ width: `${progress}%` }} /><span className="ship-marker" style={{ left: `${Math.max(3, progress)}%` }}><Rocket size={15} /></span></div><div className="route-node target-node"><span className="planet-dot" style={{ background: planet.color, boxShadow: `0 0 18px ${planet.color}` }} /><small>{planet.name} · {planet.latin}</small></div></section>
      <section className="travel-grid"><div className="planet-visual"><div className="planet-glow" style={{ background: planet.color }} /><div className="destination-planet" style={{ background: `radial-gradient(circle at 32% 28%, #fff4d1 0%, ${planet.color} 13%, #251d24 70%)`, boxShadow: `0 0 60px ${planet.color}55` }} /><div className="planet-ring" style={{ borderColor: `${planet.color}66` }} /><div className="visual-caption"><span>TARGET VISUAL</span><strong>{planet.latin}</strong></div></div><aside className="mission-console"><div className="console-header"><span>FLIGHT TELEMETRY · 3D</span><Telescope size={17} /></div><div className="mission-target"><div className="readout-label">CURRENT DESTINATION</div><h2>{planet.name}</h2><span>{planet.latin} · {planet.orbit}</span></div><div className="telemetry-row"><span><small>PROGRESS</small>{progress.toFixed(1)}%</span><span><small>RANGE</small>{planet.distance}</span><span><small>ETA</small>{planet.travel}</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p className="mission-copy">{planet.description}</p><div className="mission-actions"><button className="mission-action" onClick={() => setPaused(!paused)}><Gauge size={15} />{paused ? "继续航行" : "暂停航行"}</button><button className="mission-action secondary" onClick={() => setProgress(0)}><Orbit size={15} />重新出发</button></div></aside></section>
      <footer className="travel-footer"><span>航行状态 · {progress >= 100 ? "已抵达目标轨道" : paused ? "暂停中" : "深空巡航中"}</span><span>地球时间 · 模拟模式</span></footer>
    </main>
  );
}
