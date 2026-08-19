/* Design philosophy: 午夜天文台 / Scientific Instrument Aesthetic. A true celestial sphere replaces the former flat viewport; controls remain edge-mounted and quiet. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Crosshair, Info, LocateFixed, MapPin, Minus, Moon, Plus, RotateCcw, Search, SunMedium, Telescope } from "lucide-react";
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

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}
function vectorToRaDec(vector: Vec3) {
  const unit = normalize(vector);
  return { ra: ((Math.atan2(unit.z, unit.x) * 12) / Math.PI + 24) % 24, dec: (Math.asin(unit.y) * 180) / Math.PI };
}

function dateToJulian(date: Date) { return date.getTime() / 86400000 + 2440587.5; }
function localSiderealHours(date: Date, longitude: number) {
  const jd = dateToJulian(date);
  const t = (jd - 2451545.0) / 36525;
  const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t) % 360;
  return ((gmst + longitude) / 15 + 24) % 24;
}

const SOLAR_OBJECTS = [
  { id: "sun", name: "太阳", latin: "SUN", color: "#ffd875", size: 5.5, baseRa: 0, baseDec: 0 },
  { id: "moon", name: "月球", latin: "MOON", color: "#d7e8e4", size: 4.2, baseRa: 3.2, baseDec: 8 },
  { id: "mercury", name: "水星", latin: "MERCURY", color: "#d1aa83", size: 2.8, baseRa: 4.7, baseDec: 18 },
  { id: "venus", name: "金星", latin: "VENUS", color: "#ffe3a0", size: 3.8, baseRa: 5.1, baseDec: 21 },
  { id: "mars", name: "火星", latin: "MARS", color: "#e77d61", size: 3.3, baseRa: 8.8, baseDec: 23 },
  { id: "jupiter", name: "木星", latin: "JUPITER", color: "#e9c99b", size: 4.5, baseRa: 4.4, baseDec: 20 },
  { id: "saturn", name: "土星", latin: "SATURN", color: "#d9c28b", size: 4, baseRa: 22.1, baseDec: -12 },
];

function getSolarObjects(date: Date) {
  const days = dateToJulian(date) - 2451545;
  return SOLAR_OBJECTS.map((object, index) => {
    const drift = (days / (index === 0 ? 365.25 : 87.97 + index * 140)) * 24;
    const ra = (object.baseRa + drift) % 24;
    const dec = object.baseDec + Math.sin(days / (35 + index * 17)) * (index === 0 ? 23 : 8);
    return { ...object, ra: (ra + 24) % 24, dec, vector: toVector((ra + 24) % 24, dec) };
  });
}

const MESSIER_OBJECTS = [
  ["M31", "仙女座星系", 0.71, 41.27], ["M42", "猎户座大星云", 5.59, -5.45], ["M45", "昴星团", 3.79, 24.12], ["M13", "武仙座球状星团", 16.69, 36.46], ["M1", "蟹状星云", 5.58, 22.01], ["M8", "礁湖星云", 18.06, -24.39], ["M20", "三叶星云", 18.04, -23.03], ["M51", "涡状星系", 13.50, 47.20], ["M57", "环状星云", 18.89, 33.03], ["M27", "哑铃星云", 19.99, 22.72], ["M81", "波德星系", 9.93, 69.07], ["M82", "雪茄星系", 9.93, 69.68], ["M87", "室女 A 星系", 12.51, 12.39], ["M104", "汉堡星系", 12.67, -11.62], ["M6", "蝴蝶星团", 17.67, -32.22], ["M7", "托勒密星团", 17.90, -34.82], ["M16", "鹰星云", 18.31, -13.78], ["M17", "欧米伽星云", 18.35, -16.17], ["M22", "人马座球状星团", 18.61, -23.90], ["M44", "鬼星团", 8.67, 19.67]
].map(([id, name, ra, dec]) => ({ id: String(id), name: String(name), latin: String(id), ra: Number(ra), dec: Number(dec), vector: toVector(Number(ra), Number(dec)) }));

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef({ active: false, x: 0, y: 0, yaw: 0, pitch: 0 });
  const [active, setActive] = useState("ori");
  const [showLines, setShowLines] = useState(true);
  const [showNames, setShowNames] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [yaw, setYaw] = useState(0.9);
  const [pitch, setPitch] = useState(0.18);
  const [observerDate, setObserverDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [latitude, setLatitude] = useState(31.23);
  const [longitude, setLongitude] = useState(121.47);
  const [showSolar, setShowSolar] = useState(true);
  const [showMessier, setShowMessier] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState<{ x: number; y: number; name: string; latin: string } | null>(null);
  const [focusTarget, setFocusTarget] = useState("orion");
  const [cameraTarget, setCameraTarget] = useState<{ yaw: number; pitch: number } | null>(null);

  const stars = useMemo(() => SKY_DATA.stars.map((star) => ({ ...star, vector: toVector(star.ra, star.dec) })), []);
  const byHr = useMemo(() => new Map(stars.map((star) => [star.hr, star])), [stars]);
  const current = SKY_DATA.constellations.find((item) => item.id === active) ?? SKY_DATA.constellations[0];
  const featured = FEATURED.map((id) => SKY_DATA.constellations.find((item) => item.id === id)).filter((item): item is typeof SKY_DATA.constellations[number] => Boolean(item));
  const observationDate = useMemo(() => new Date(observerDate), [observerDate]);
  const sidereal = useMemo(() => localSiderealHours(observationDate, longitude), [observationDate, longitude]);
  const solarObjects = useMemo(() => getSolarObjects(observationDate), [observationDate]);
  const query = search.trim().toLowerCase();
  const searchResults = query ? [...SKY_DATA.constellations.map((item) => ({ id: item.id, name: item.name, latin: item.abbr, vector: normalize(item.points.map((hr) => byHr.get(hr)?.vector).filter((v): v is Vec3 => Boolean(v)).reduce<Vec3>((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: acc.z + v.z }), { x: 0, y: 0, z: 0 })) })), ...solarObjects.map((item) => ({ id: item.id, name: item.name, latin: item.latin, vector: item.vector })), ...MESSIER_OBJECTS.map((item) => ({ id: item.id, name: item.name, latin: item.latin, vector: item.vector }))].filter((item) => `${item.name} ${item.latin}`.toLowerCase().includes(query)).slice(0, 8) : [];
  const skyYaw = yaw + (sidereal / 24) * Math.PI * 2;

  useEffect(() => {
    if (!cameraTarget) return;
    const startYaw = yaw;
    const startPitch = pitch;
    let delta = cameraTarget.yaw - startYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const started = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - started) / 620);
      const eased = 1 - Math.pow(1 - progress, 3);
      setYaw(startYaw + delta * eased);
      setPitch(startPitch + (cameraTarget.pitch - startPitch) * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [cameraTarget]);

  const rotateToVector = (vector: Vec3, nextActive?: string) => {
    const coordinates = vectorToRaDec(vector);
    setCameraTarget({ yaw: (coordinates.ra / 24) * Math.PI * 2 - (sidereal / 24) * Math.PI * 2, pitch: (coordinates.dec * Math.PI) / 180 });
    if (nextActive) { setActive(nextActive); setFocusTarget(nextActive); }
  };
  const focusConstellation = (item: typeof SKY_DATA.constellations[number]) => {
    const vector = normalize(item.points.map((hr) => byHr.get(hr)?.vector).filter((v): v is Vec3 => Boolean(v)).reduce<Vec3>((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: acc.z + v.z }), { x: 0, y: 0, z: 0 }));
    rotateToVector(vector, item.id);
  };

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
        const p = project(star.vector, skyYaw, pitch, width, height, zoom);
        projected.set(star.hr, p);
        if (!p.visible || p.sx < -12 || p.sx > width + 12 || p.sy < -12 || p.sy > height + 12) continue;
        const radius = Math.max(.38, Math.min(3.2, 2.7 - star.mag * .34)) * (star.mag < 2.6 ? 1.15 : 1);
        ctx.globalAlpha = Math.max(.2, Math.min(.96, 1.15 - (star.mag + 1.5) / 8));
        ctx.fillStyle = starColor(star.ci);
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = star.mag < 2.7 ? 7 : 1.5;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (showSolar) {
        for (const object of solarObjects) {
          const p = project(object.vector, skyYaw, pitch, width, height, zoom);
          if (!p.visible) continue;
          ctx.fillStyle = object.color; ctx.shadowColor = object.color; ctx.shadowBlur = 13;
          ctx.beginPath(); ctx.arc(p.sx, p.sy, object.size, 0, Math.PI * 2); ctx.fill();
          if (showNames) { ctx.shadowBlur = 0; ctx.font = "500 10px IBM Plex Mono"; ctx.fillText(object.name, p.sx + 8, p.sy - 7); }
        }
      }
      if (showMessier) {
        for (const object of MESSIER_OBJECTS) {
          const p = project(object.vector, skyYaw, pitch, width, height, zoom);
          if (!p.visible) continue;
          ctx.fillStyle = "#9bd0c2"; ctx.strokeStyle = "rgba(155,208,194,.7)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.sx, p.sy, 3.3, 0, Math.PI * 2); ctx.stroke();
          if (showNames) { ctx.font = "500 9px IBM Plex Mono"; ctx.fillText(object.id, p.sx + 7, p.sy + 3); }
        }
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
  }, [stars, current, byHr, skyYaw, pitch, zoom, showLines, showNames, showSolar, showMessier, solarObjects]);

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
  const resetView = () => { setYaw(.9); setPitch(.18); setZoom(1); setCameraTarget(null); };
  const azimuth = Math.round((((yaw * 180) / Math.PI + 360) % 360));
  const altitude = Math.round((pitch * 180) / Math.PI);

  return (
    <main className="observatory">
      <div className="sky-shell"><canvas ref={canvasRef} className="sky-canvas" aria-label="3D 天球观测视场" /><div className="milky-way" /><div className="horizon horizon-back"><span className="ridge ridge-one" /><span className="ridge ridge-two" /><span className="ridge ridge-three" /></div><div className="horizon horizon-front"><span className="ground-texture" /><div className="observer"><div className="observer-head" /><div className="observer-body" /><div className="observer-leg left" /><div className="observer-leg right" /><div className="telescope-tripod" /><div className="telescope-tube" /><div className="telescope-lens" /></div></div></div><div className="sky-gesture-layer" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} />
      {label && <div className="constellation-label" style={{ left: label.x, top: label.y }}><span>{label.latin}</span><strong>{label.name}</strong></div>}
      <header className="topbar"><div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><div className="eyebrow">NIGHT OBSERVATORY · 3D SKY</div><h1>午夜天文台</h1></div></div><div className="status"><span className="status-dot" /> HYG v4.1 · {STAR_COUNT.toLocaleString()} STARS <b>·</b> {CONSTELLATION_COUNT} CONSTELLATIONS</div><button className="icon-button" aria-label="观测信息"><Info size={17} /></button></header>
      <aside className="left-rail"><div className="rail-label">CONSTELLATIONS · {CONSTELLATION_COUNT}</div>{featured.map((item) => <button key={item.id} className={`constellation-tab ${active === item.id ? "active" : ""}`} onClick={() => focusConstellation(item)}><span className="tab-dot" /><span>{item.name}</span><small>{item.abbr.toUpperCase()}</small></button>)}</aside>
      <section className="scene-hint"><Crosshair size={15} /><span>{isDragging ? "球面旋转中 · 探索天球" : "拖动以环视 3D 天球"}</span><kbd>ORBIT</kbd></section>
      <aside className="right-console"><div className="console-header"><span>TELESCOPE VIEW · 3D</span><Telescope size={17} /></div><div className="target-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索星座、行星或 M 天体" aria-label="搜索观测目标" />{searchResults.length > 0 && <div className="search-results">{searchResults.map((result) => <button key={`${result.id}-${result.latin}`} onClick={() => { rotateToVector(result.vector); setSearch(""); const constellation = SKY_DATA.constellations.find((item) => item.id === result.id); if (constellation) setActive(constellation.id); setFocusTarget(result.id); }}><span>{result.name}</span><small>{result.latin}</small></button>)}</div>}</div><div className="target-readout"><div className="readout-label">当前目标 · {current.name}</div><h2>{current.name}</h2><p>真实星表节点与星座线 · J2000</p><div className="readout-grid"><span><small>AZ</small>{azimuth}°</span><span><small>ALT</small>{altitude}°</span><span><small>MAG</small>{current.points.length}</span></div></div><div className="console-section"><div className="section-title"><span>VIEW SCALE</span><strong>{zoom.toFixed(1)}×</strong></div><div className="scale-control"><button onClick={() => setZoom(Math.max(.7, +(zoom - .1).toFixed(1)))} aria-label="缩小"><Minus size={14} /></button><div className="scale-track"><span style={{ width: `${((zoom - .7) / 1.1) * 100}%` }} /></div><button onClick={() => setZoom(Math.min(1.8, +(zoom + .1).toFixed(1)))} aria-label="放大"><Plus size={14} /></button></div></div><div className="console-section toggles"><button onClick={() => setShowLines(!showLines)} className={showLines ? "switch-on" : ""}><span className="switch" /><span>星座连线</span></button><button onClick={() => setShowNames(!showNames)} className={showNames ? "switch-on" : ""}><span className="switch" /><span>名称标注</span></button><button onClick={() => setShowSolar(!showSolar)} className={showSolar ? "switch-on" : ""}><span className="switch" /><span>太阳 · 月球 · 行星</span></button><button onClick={() => setShowMessier(!showMessier)} className={showMessier ? "switch-on" : ""}><span className="switch" /><span>梅西耶天体</span></button></div><div className="observer-mini"><div className="mini-title"><MapPin size={13} /> OBSERVATION SITE</div><label>时间<input type="datetime-local" value={observerDate} onChange={(event) => setObserverDate(event.target.value)} /></label><div className="coordinate-row"><label>纬度<input type="number" value={latitude} onChange={(event) => setLatitude(Number(event.target.value))} /></label><label>经度<input type="number" value={longitude} onChange={(event) => setLongitude(Number(event.target.value))} /></label></div><div className="lst-readout">LOCAL SIDEREAL TIME <strong>{sidereal.toFixed(2)}h</strong></div></div><div className="console-actions"><button className="tool-active"><LocateFixed size={16} /><span>锁定目标</span></button><button onClick={resetView}><RotateCcw size={16} /><span>重置视角</span></button></div></aside>
      <footer className="bottom-bar"><div className="location"><Compass size={15} /><span>纬 {latitude.toFixed(2)}° · 经 {longitude.toFixed(2)}° · J2000</span></div><div className="azimuth-dial"><span className="dial-tick t1" /><span className="dial-tick t2" /><span className="dial-tick t3" /><span className="dial-needle" /><span className="dial-north">N</span><span className="dial-east">E</span><span className="dial-south">S</span><span className="dial-west">W</span></div><div className="footer-meta"><span><Moon size={14} /> 朔月 · 04:18</span><span className="divider" /><span>HYG / BSC</span></div></footer>
    </main>
  );
}
