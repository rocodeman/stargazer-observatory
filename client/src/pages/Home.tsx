/* Design philosophy: 午夜天文台 / Scientific Instrument Aesthetic. A true celestial sphere replaces the former flat viewport; controls remain edge-mounted and quiet. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Camera, CheckCircle2, CircleUserRound, Compass, Crosshair, LocateFixed, Moon, Radio, RotateCcw, Sun, Telescope } from "lucide-react";
import html2canvas from "html2canvas";
import { SKY_DATA } from "@/data/skyData";

type Vec3 = { x: number; y: number; z: number };
type Projected = Vec3 & { sx: number; sy: number; visible: boolean };

const FEATURED = ["ori", "uma", "cas", "cyg", "sco", "leo", "gem", "tau", "lyr", "sgr", "and", "peg"];
const DEFAULT_VISUAL_INTENSITY = "strong" as const;
const SCIENTIST_PROFILES = [
  { id: 0, scale: 1.05, lean: -18, bodyWidth: 38, bodyHeight: 48, arm: -28, leg: 18 },
  { id: 1, scale: .82, lean: 12, bodyWidth: 31, bodyHeight: 42, arm: 22, leg: -12 },
  { id: 2, scale: 1.24, lean: 26, bodyWidth: 46, bodyHeight: 56, arm: 38, leg: 24 },
];
const SCIENTIST_SLOTS = [
  { left: "11%", top: "23%" }, { left: "24%", top: "57%" }, { left: "39%", top: "18%" },
  { left: "53%", top: "42%" }, { left: "68%", top: "25%" }, { left: "82%", top: "63%" },
  { left: "91%", top: "36%" }, { left: "31%", top: "78%" }, { left: "61%", top: "74%" },
];
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

const PLANET_IDS = new Set(["sun", "mercury", "venus", "mars", "jupiter", "saturn"]);
const BODY_DETAILS: Record<string, { type: string; distance: string; magnitude: string; description: string }> = {
  sun: { type: "恒星 · G2V", distance: "1 AU", magnitude: "−26.74", description: "太阳系中心恒星，提供地球上绝大多数可见光与热量。观测模拟中以当前日期的近似黄经位置显示。" },
  moon: { type: "地球卫星", distance: "384,400 km", magnitude: "−12.7", description: "地球唯一的天然卫星。月球位置和亮度会随着观测时间变化，夜空中的大气散射也会受其影响。" },
  mercury: { type: "行星 · 类地", distance: "0.39 AU", magnitude: "−0.4", description: "最靠近太阳的行星，轨道周期短，通常只在日出前或日落后较低的天空中出现。" },
  venus: { type: "行星 · 类地", distance: "0.72 AU", magnitude: "−4.7", description: "金星是夜空中最亮的行星之一，常被称为启明星或长庚星。" },
  mars: { type: "行星 · 类地", distance: "1.52 AU", magnitude: "−2.9", description: "表面富含氧化铁，因此呈现橙红色；它的视亮度会随地球与火星的相对位置显著变化。" },
  jupiter: { type: "行星 · 气态巨行星", distance: "5.20 AU", magnitude: "−2.9", description: "太阳系最大的行星，明亮且容易辨认；在高倍率望远镜中可以进一步观察其卫星系统。" },
  saturn: { type: "行星 · 气态巨行星", distance: "9.58 AU", magnitude: "0.5", description: "以壮观的环系闻名。页面中的标记用于定位，未模拟望远镜高倍率下的环系细节。" },
};
function formatLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const MESSIER_OBJECTS = [
  ["M31", "仙女座星系", 0.71, 41.27], ["M42", "猎户座大星云", 5.59, -5.45], ["M45", "昴星团", 3.79, 24.12], ["M13", "武仙座球状星团", 16.69, 36.46], ["M1", "蟹状星云", 5.58, 22.01], ["M8", "礁湖星云", 18.06, -24.39], ["M20", "三叶星云", 18.04, -23.03], ["M51", "涡状星系", 13.50, 47.20], ["M57", "环状星云", 18.89, 33.03], ["M27", "哑铃星云", 19.99, 22.72], ["M81", "波德星系", 9.93, 69.07], ["M82", "雪茄星系", 9.93, 69.68], ["M87", "室女 A 星系", 12.51, 12.39], ["M104", "汉堡星系", 12.67, -11.62], ["M6", "蝴蝶星团", 17.67, -32.22], ["M7", "托勒密星团", 17.90, -34.82], ["M16", "鹰星云", 18.31, -13.78], ["M17", "欧米伽星云", 18.35, -16.17], ["M22", "人马座球状星团", 18.61, -23.90], ["M44", "鬼星团", 8.67, 19.67]
].map(([id, name, ra, dec]) => ({ id: String(id), name: String(name), latin: String(id), ra: Number(ra), dec: Number(dec), vector: toVector(Number(ra), Number(dec)), detail: { type: "深空天体 · 梅西耶目录", distance: "依对象而异", magnitude: "目录目标", description: "梅西耶目录中的深空天体，可能是星系、星云或星团。当前页面使用赤经与赤纬进行天球定位。" } }));

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, navigate] = useLocation();
  const drag = useRef({ active: false, moved: false, x: 0, y: 0, yaw: 0, pitch: 0 });
  const [active, setActive] = useState("ori");
  const [showLines, setShowLines] = useState(true);
  const [selectedConstellations, setSelectedConstellations] = useState<Set<string>>(() => new Set(SKY_DATA.constellations.map((item) => item.id)));
  const [showNames, setShowNames] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [yaw, setYaw] = useState(0.9);
  const [pitch, setPitch] = useState(0.18);
  const [observerDate, setObserverDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [latitude, setLatitude] = useState(31.23);
  const [longitude, setLongitude] = useState(121.47);
  const [showSolar, setShowSolar] = useState(true);
  const [showMessier, setShowMessier] = useState(true);
  const [dayMode, setDayMode] = useState(false);
  const [visualIntensity, setVisualIntensity] = useState<"strong" | "soft">(DEFAULT_VISUAL_INTENSITY);
  const [selectedBody, setSelectedBody] = useState<{ id: string; name: string; latin: string; detail: { type: string; distance: string; magnitude: string; description: string } } | null>(null);
  const [environment, setEnvironment] = useState<"wild" | "city">("wild");
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [timeRate, setTimeRate] = useState(0);
  const [meteorEnabled, setMeteorEnabled] = useState(false);
  const [meteors, setMeteors] = useState<Array<{ id: number; left: number; top: number; angle: number; duration: number }>>([]);
  const [celebration, setCelebration] = useState(false);
  const [scientistNotice, setScientistNotice] = useState("");
  const [scientistCelebration, setScientistCelebration] = useState(false);
  const [scientistTargets] = useState(() => {
    const shuffledSlots = [...SCIENTIST_SLOTS].sort(() => Math.random() - .5);
    return SCIENTIST_PROFILES.map((profile, index) => ({ ...profile, ...shuffledSlots[index] }));
  });
  const [scientistsFound, setScientistsFound] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set<number>();
    try { return new Set<number>(JSON.parse(window.localStorage.getItem("stargazer.task.scienceBoundary") || "[]")); } catch { return new Set<number>(); }
  });
  const [isDragging, setIsDragging] = useState(false);
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState<{ x: number; y: number; name: string; latin: string } | null>(null);
  const [focusTarget, setFocusTarget] = useState("orion");
  const meteorId = useRef(0);
  const celebrationTimer = useRef<number | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ yaw: number; pitch: number } | null>(null);
  const [countdownComplete, setCountdownComplete] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("stargazer.task.countdown") === "complete");
  const [broadcastComplete, setBroadcastComplete] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("stargazer.task.cosmicBroadcast") === "complete");
  const [highlightModeCount, setHighlightModeCount] = useState(() => Math.min(3, Number(window.localStorage.getItem("stargazer.task.shineForYou.modeCount") || 0)));
  const shineComplete = highlightModeCount >= 3;
  const scienceBoundaryComplete = scientistsFound.size === scientistTargets.length;
  const scientistNoticeTimer = useRef<number | null>(null);
  useEffect(() => {
    setVisualIntensity(DEFAULT_VISUAL_INTENSITY);
  }, []);
  const toggleDayNight = () => setDayMode((mode) => !mode);
  const toggleVisualIntensity = () => {
    setVisualIntensity((mode) => {
      const nextMode = mode === "strong" ? "soft" : "strong";
      if (nextMode === "strong") {
        setHighlightModeCount((count) => {
          const nextCount = Math.min(3, count + 1);
          window.localStorage.setItem("stargazer.task.shineForYou.modeCount", String(nextCount));
          return nextCount;
        });
      }
      return nextMode;
    });
  };
  const highlightConstellation = (item: typeof SKY_DATA.constellations[number]) => {
    setSelectedConstellations((previous) => { const next = new Set(previous); next.add(item.id); return next; });
    setActive(item.id);
    setFocusTarget(item.id);
    focusConstellation(item);
  };
  const captureObservatory = async () => {
    try {
      const snapshot = await html2canvas(document.documentElement, { backgroundColor: null, useCORS: true, logging: false, scale: Math.min(2, window.devicePixelRatio || 1), windowWidth: document.documentElement.scrollWidth, windowHeight: document.documentElement.scrollHeight });
      const stamp = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      const timestamp = `${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())} ${pad(stamp.getHours())}:${pad(stamp.getMinutes())}:${pad(stamp.getSeconds())}`;
      const context = snapshot.getContext("2d");
      if (!context) return;
      const scale = snapshot.width / Math.max(1, document.documentElement.scrollWidth);
      const padding = 22 * scale;
      context.font = `600 ${15 * scale}px IBM Plex Mono, monospace`;
      const textWidth = context.measureText(timestamp).width;
      context.fillStyle = "rgba(3, 12, 18, .78)";
      context.fillRect(snapshot.width - textWidth - padding * 2, snapshot.height - 42 * scale - padding, textWidth + padding * 2, 42 * scale);
      context.fillStyle = "#f3d58d";
      context.textAlign = "right";
      context.textBaseline = "bottom";
      context.fillText(timestamp, snapshot.width - padding, snapshot.height - padding);
      const link = document.createElement("a");
      link.download = `midnight-observatory-${timestamp.replace(/[: ]/g, "-")}.png`;
      link.href = snapshot.toDataURL("image/png");
      link.click();
      window.localStorage.setItem("stargazer.task.countdown", "complete");
      setCountdownComplete(true);
      setCelebration(true);
      setMeteorEnabled(true);
      if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
      celebrationTimer.current = window.setTimeout(() => {
        setMeteorEnabled(false);
        setCelebration(false);
      }, 10000);
    } catch (error) {
      console.error("无法生成天文台截图", error);
    }
  };
  const discoverScientist = (id: number) => {
    if (scientistsFound.has(id)) return;
    const next = new Set(scientistsFound);
    next.add(id);
    setScientistsFound(next);
    window.localStorage.setItem("stargazer.task.scienceBoundary", JSON.stringify(Array.from(next)));
    if (scientistNoticeTimer.current) window.clearTimeout(scientistNoticeTimer.current);
    setScientistNotice(`发现科学家死亡 · ${next.size}/3`);
    scientistNoticeTimer.current = window.setTimeout(() => setScientistNotice(""), 3000);
    if (next.size === scientistTargets.length) {
      setScientistCelebration(true);
      window.setTimeout(() => setScientistCelebration(false), 3000);
    }
  };

  const replayMissions = () => {
    window.localStorage.removeItem("stargazer.task.countdown");
    window.localStorage.removeItem("stargazer.broadcast.sunDayAccess");
    window.localStorage.removeItem("stargazer.task.cosmicBroadcast");
    window.localStorage.removeItem("stargazer.task.shineForYou");
    window.localStorage.removeItem("stargazer.task.shineForYou.constellations");
    window.localStorage.removeItem("stargazer.task.shineForYou.modeCount");
    window.localStorage.removeItem("stargazer.task.scienceBoundary");
    setCountdownComplete(false);
    setBroadcastComplete(false);
    setHighlightModeCount(0);
    setScientistsFound(new Set());
    setScientistNotice("");
    setScientistCelebration(false);
    setVisualIntensity(DEFAULT_VISUAL_INTENSITY);
  };

  const stars = useMemo(() => SKY_DATA.stars.map((star) => ({ ...star, vector: toVector(star.ra, star.dec) })), []);
  const byHr = useMemo(() => new Map(stars.map((star) => [star.hr, star])), [stars]);
  const current = SKY_DATA.constellations.find((item) => item.id === active) ?? SKY_DATA.constellations[0];
  const featured = FEATURED.map((id) => SKY_DATA.constellations.find((item) => item.id === id)).filter((item): item is typeof SKY_DATA.constellations[number] => Boolean(item));
  const allConstellationsSelected = selectedConstellations.size === SKY_DATA.constellations.length;
  const observationDate = useMemo(() => new Date(observerDate), [observerDate]);
  const sidereal = useMemo(() => localSiderealHours(observationDate, longitude), [observationDate, longitude]);
  const solarObjects = useMemo(() => getSolarObjects(observationDate), [observationDate]);
  const query = search.trim().toLowerCase();
  const searchResults = query ? [...SKY_DATA.constellations.map((item) => ({ id: item.id, name: item.name, latin: item.abbr, vector: normalize(item.points.map((hr) => byHr.get(hr)?.vector).filter((v): v is Vec3 => Boolean(v)).reduce<Vec3>((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: acc.z + v.z }), { x: 0, y: 0, z: 0 })) })), ...solarObjects.map((item) => ({ id: item.id, name: item.name, latin: item.latin, vector: item.vector })), ...MESSIER_OBJECTS.map((item) => ({ id: item.id, name: item.name, latin: item.latin, vector: item.vector }))].filter((item) => `${item.name} ${item.latin}`.toLowerCase().includes(query)).slice(0, 8) : [];
  const skyYaw = yaw + (sidereal / 24) * Math.PI * 2;

  useEffect(() => {
    if (timeRate === 0) return;
    const timer = window.setInterval(() => {
      const next = new Date(new Date(observerDate).getTime() + timeRate * 60 * 1000);
      setObserverDate(formatLocalInput(next));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timeRate, observerDate]);

  useEffect(() => {
    if (!meteorEnabled) { setMeteors([]); return; }
    const spawn = () => {
      const id = meteorId.current++;
      const meteor = { id, left: -5 + Math.random() * 110, top: -5 + Math.random() * 105, angle: -45 + Math.random() * 12, duration: 760 + Math.random() * 820 };
      setMeteors((items) => [...items.slice(-134), meteor]);
      window.setTimeout(() => setMeteors((items) => items.filter((item) => item.id !== id)), meteor.duration + 120);
    };
    spawn();
    const timer = window.setInterval(spawn, 36);
    return () => window.clearInterval(timer);
  }, [meteorEnabled]);

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
  const toggleConstellation = (item: typeof SKY_DATA.constellations[number]) => {
    setSelectedConstellations((previous) => { const next = new Set(previous); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; });
    focusConstellation(item);
  };
  const toggleAllConstellations = () => setSelectedConstellations((previous) => previous.size === SKY_DATA.constellations.length ? new Set() : new Set(SKY_DATA.constellations.map((item) => item.id)));
  const focusConstellation = (item: typeof SKY_DATA.constellations[number]) => {
    const vector = normalize(item.points.map((hr) => byHr.get(hr)?.vector).filter((v): v is Vec3 => Boolean(v)).reduce<Vec3>((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: acc.z + v.z }), { x: 0, y: 0, z: 0 }));
    rotateToVector(vector, item.id);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frame = 0;
    const render = () => {
      if (disposed) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = rect.width;
      const height = rect.height;
      if (width <= 0 || height <= 0) {
        frame = requestAnimationFrame(render);
        return;
      }
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createRadialGradient(width * .52, height * .37, 0, width * .52, height * .52, Math.max(width, height) * .76);
      if (dayMode) { gradient.addColorStop(0, "#b8d3d8"); gradient.addColorStop(.42, "#769eaa"); gradient.addColorStop(1, "#456b78"); }
      else if (environment === "city") { gradient.addColorStop(0, "#294354"); gradient.addColorStop(.42, "#192d3a"); gradient.addColorStop(1, "#101820"); }
      else { gradient.addColorStop(0, "#173a55"); gradient.addColorStop(.42, "#0d2739"); gradient.addColorStop(1, "#050d15"); }
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      const projected = new Map<number, Projected>();
      for (const star of stars) {
        const p = project(star.vector, skyYaw, pitch, width, height, zoom);
        projected.set(star.hr, p);
        if (!p.visible || p.sx < -12 || p.sx > width + 12 || p.sy < -12 || p.sy > height + 12) continue;
        const radius = Math.max(.38, Math.min(3.2, 2.7 - star.mag * .34)) * (star.mag < 2.6 ? 1.15 : 1);
        const visibility = dayMode ? (star.mag < 0.5 ? .32 : .045) : environment === "city" ? (star.mag < 2.4 ? .72 : .22) : 1;
        ctx.globalAlpha = Math.max(.08, Math.min(.96, (1.15 - (star.mag + 1.5) / 8) * visibility));
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
      const constellationLayers = SKY_DATA.constellations.filter((constellation) => selectedConstellations.has(constellation.id));
      if (showLines) {
        for (const constellation of constellationLayers) {
          for (let index = 0; index < constellation.points.length - 1; index += 1) {
            const from = projected.get(constellation.points[index]);
            const to = projected.get(constellation.points[index + 1]);
            if (!from || !to || !from.visible || !to.visible) continue;
            ctx.strokeStyle = visualIntensity === "strong" ? "rgba(231,185,106,.72)" : "rgba(166,184,175,.28)";
            ctx.lineWidth = visualIntensity === "strong" ? 1.05 : .7; ctx.setLineDash([5, 6]);
            ctx.beginPath(); ctx.moveTo(from.sx, from.sy); ctx.lineTo(to.sx, to.sy); ctx.stroke();
          }
        }
      }
      if (showNames) {
        ctx.setLineDash([]);
        const occupiedLabels: Array<{ x: number; y: number; width: number; height: number }> = [];
        const labelCandidates = [[0, -22], [0, 22], [-34, -12], [34, -12], [-34, 16], [34, 16], [0, -42], [0, 42]];
        for (const constellation of constellationLayers) {
          const points = constellation.points.map((hr) => projected.get(hr)).filter((p): p is Projected => Boolean(p && p.visible));
          if (!points.length) continue;
          const center = points.reduce((acc, point) => ({ x: acc.x + point.sx, y: acc.y + point.sy }), { x: 0, y: 0 });
          const centerX = center.x / points.length;
          const centerY = center.y / points.length;
          const nameWidth = Math.max(34, constellation.name.length * 11);
          const candidate = labelCandidates.map(([dx, dy]) => ({ x: centerX + dx, y: centerY + dy, width: nameWidth, height: 25 })).find((item) => occupiedLabels.every((used) => Math.abs(item.x - used.x) > (item.width + used.width) / 2 || Math.abs(item.y - used.y) > (item.height + used.height) / 2)) ?? { x: centerX, y: centerY - 22, width: nameWidth, height: 25 };
          occupiedLabels.push(candidate);
          ctx.textAlign = "center";
          ctx.font = constellation.id === current.id ? "500 13px 'Noto Sans SC'" : "500 10px 'Noto Sans SC'";
          ctx.fillStyle = visualIntensity === "strong" ? (constellation.id === current.id ? "#e7b96a" : "rgba(224,234,228,.9)") : "rgba(184,199,192,.58)";
          ctx.shadowColor = "rgba(4,12,18,.95)";
          ctx.shadowBlur = visualIntensity === "strong" ? 7 : 4;
          ctx.fillText(constellation.name, candidate.x, candidate.y);
          ctx.font = "500 8px 'IBM Plex Mono'";
          ctx.fillStyle = visualIntensity === "strong" ? "#e7b96a" : "rgba(145,190,192,.55)";
          ctx.fillText(constellation.abbr.toUpperCase(), candidate.x, candidate.y + 13);
          ctx.strokeStyle = visualIntensity === "strong" ? "rgba(255,240,200,.9)" : "rgba(206,220,208,.42)";
          ctx.fillStyle = visualIntensity === "strong" ? "rgba(231,185,106,.95)" : "rgba(170,190,182,.48)";
          ctx.lineWidth = visualIntensity === "strong" ? 1 : .7;
          for (const point of points) {
            ctx.beginPath();
            ctx.arc(point.sx, point.sy, visualIntensity === "strong" ? 2.15 : 1.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
        ctx.textAlign = "start";
      }
      setLabel(null);
      ctx.globalAlpha = 1;
    };
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    });
    resizeObserver.observe(canvas);
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [stars, current, byHr, skyYaw, pitch, zoom, showLines, selectedConstellations, showNames, showSolar, showMessier, solarObjects, environment, visualIntensity, dayMode]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { active: true, moved: false, x: event.clientX, y: event.clientY, yaw, pitch };
    setIsDragging(true);
  };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    if (Math.abs(event.clientX - drag.current.x) + Math.abs(event.clientY - drag.current.y) > 5) drag.current.moved = true;
    setYaw(drag.current.yaw - (event.clientX - drag.current.x) * 0.006);
    setPitch(Math.max(-1.48, Math.min(1.48, drag.current.pitch + (event.clientY - drag.current.y) * 0.006)));
  };
  const stopDrag = () => { drag.current.active = false; setIsDragging(false); };
  const handleSkyClick = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current.moved) { drag.current.moved = false; return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const targets = [...solarObjects.map((item) => ({ id: item.id, name: item.name, latin: item.latin, vector: item.vector, detail: BODY_DETAILS[item.id] })), ...MESSIER_OBJECTS.map((item) => ({ id: item.id, name: item.name, latin: item.latin, vector: item.vector, detail: item.detail }))];
    let nearest: typeof targets[number] | null = null;
    let nearestDistance = 22;
    for (const target of targets) {
      const point = project(target.vector, skyYaw, pitch, rect.width, rect.height, zoom);
      const distance = Math.hypot(point.sx - x, point.sy - y);
      if (point.visible && distance < nearestDistance) { nearest = target; nearestDistance = distance; }
    }
    if (nearest) {
      if (nearest.id === "sun" && !dayMode) return;
      setSelectedBody(nearest);
      return;
    }
    let nearestConstellation: { item: typeof SKY_DATA.constellations[number]; distance: number } | null = null;
    const distanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSquared = dx * dx + dy * dy || 1;
      const projection = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
      return Math.hypot(px - (ax + projection * dx), py - (ay + projection * dy));
    };
    for (const item of SKY_DATA.constellations) {
      const points = item.points.map((hr) => project(byHr.get(hr)?.vector ?? { x: 0, y: 0, z: 0 }, skyYaw, pitch, rect.width, rect.height, zoom)).filter((point) => point.visible);
      if (!points.length) continue;
      let shapeDistance = Infinity;
      points.forEach((point, index) => {
        shapeDistance = Math.min(shapeDistance, Math.hypot(point.sx - x, point.sy - y));
        if (index > 0) shapeDistance = Math.min(shapeDistance, distanceToSegment(x, y, points[index - 1].sx, points[index - 1].sy, point.sx, point.sy));
      });
      const center = points.reduce((acc, point) => ({ x: acc.x + point.sx, y: acc.y + point.sy }), { x: 0, y: 0 });
      const centerDistance = Math.hypot(center.x / points.length - x, center.y / points.length - y);
      const distance = Math.min(shapeDistance, centerDistance * .7);
      if (!nearestConstellation || distance < nearestConstellation.distance) nearestConstellation = { item, distance };
    }
    if (nearestConstellation && nearestConstellation.distance < 48) highlightConstellation(nearestConstellation.item);
  };
  const resetView = () => { setYaw(.9); setPitch(.18); setZoom(1); setCameraTarget(null); };
  const azimuth = Math.round((((yaw * 180) / Math.PI + 360) % 360));
  const altitude = Math.round((pitch * 180) / Math.PI);

  return (
    <main className={`observatory ${dayMode ? "day-mode" : "night-mode"}`}>
      <div className="sky-shell"><canvas ref={canvasRef} className="sky-canvas" aria-label="3D 天球观测视场" /><div className="milky-way" /><div className="horizon horizon-back"><span className="ridge ridge-one" /><span className="ridge ridge-two" /><span className="ridge ridge-three" /></div><div className="horizon horizon-front"><span className="ground-texture" /><div className="observer"><div className="observer-head" /><div className="observer-body" /><div className="observer-leg left" /><div className="observer-leg right" /><div className="telescope-tripod" /><div className="telescope-tube" /><div className="telescope-lens" /></div></div></div><div className="sky-gesture-layer" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onClick={handleSkyClick} />
      {showAtmosphere && <div className={`atmosphere-layer ${environment}`} aria-hidden="true" />}
      <div className="meteor-layer" aria-hidden="true">{meteors.map((meteor) => <span key={meteor.id} className="meteor" style={{ left: `${meteor.left}%`, top: `${meteor.top}%`, ["--angle" as string]: `${meteor.angle}deg`, animationDuration: `${meteor.duration}ms` }} />)}</div>
      {label && <div className="constellation-label" style={{ left: label.x, top: label.y }}><span>{label.latin}</span><strong>{label.name}</strong></div>}
      {selectedBody && <aside className="body-detail"><button className="detail-close" onClick={() => setSelectedBody(null)} aria-label="关闭详情">×</button><div className="readout-label">CELESTIAL OBJECT · {selectedBody.latin}</div><h2>{selectedBody.name}</h2><div className="detail-type">{selectedBody.detail.type}</div><div className="detail-stats"><span><small>DISTANCE</small>{selectedBody.detail.distance}</span><span><small>MAGNITUDE</small>{selectedBody.detail.magnitude}</span></div><p>{selectedBody.detail.description}</p><button className="detail-focus travel-focus" onClick={() => { if (PLANET_IDS.has(selectedBody.id)) navigate(`/travel/${selectedBody.id}`); else { const target = [...solarObjects, ...MESSIER_OBJECTS].find((item) => item.id === selectedBody.id); if (target) rotateToVector(target.vector); } }}>{PLANET_IDS.has(selectedBody.id) ? <>开始星际旅行 <Telescope size={14} /></> : <>转到目标位置 <LocateFixed size={14} /></>}</button>{PLANET_IDS.has(selectedBody.id) && <button className="detail-focus solar-orbit-focus" onClick={() => { if (selectedBody.id === "sun" && dayMode) window.localStorage.setItem("stargazer.broadcast.sunDayAccess", "authorized"); navigate(`/solar-system?focus=${selectedBody.id}`); }}><RotateCcw size={14} />查看太阳系运转</button>}</aside>}
      <aside className="character-panel"><div className="character-profile"><div className="character-avatar"><CircleUserRound size={25} /></div><div><span>OBSERVATORY PILOT</span><strong>观测者</strong></div></div><div className="character-divider" /><div className="mission-panel-kicker"><Radio size={13} /> 任务 · 4</div><div className={`mission-item ${broadcastComplete ? "complete" : "incomplete"}`}><span className="mission-status">{broadcastComplete ? <CheckCircle2 size={16} /> : <span className="mission-ring" />}</span><div><strong>宇宙广播</strong><small>{broadcastComplete ? "已完成" : "未完成"}</small></div><em>{broadcastComplete ? "COMPLETE" : "ACTIVE"}</em></div><div className={`mission-item ${countdownComplete ? "complete" : "incomplete"}`}><span className="mission-status">{countdownComplete ? <CheckCircle2 size={16} /> : <span className="mission-ring" />}</span><div><strong>倒计时</strong><small>{countdownComplete ? "已完成" : "未完成"}</small></div><em>{countdownComplete ? "COMPLETE" : "ACTIVE"}</em></div><div className={`mission-item ${shineComplete ? "complete" : "incomplete"}`}><span className="mission-status">{shineComplete ? <CheckCircle2 size={16} /> : <span className="mission-ring" />}</span><div><strong>为你闪耀</strong><small>{shineComplete ? "已完成" : "未完成"}</small></div><em>{shineComplete ? "COMPLETE" : "ACTIVE"}</em></div><div className={`mission-item ${scienceBoundaryComplete ? "complete" : "incomplete"}`}><span className="mission-status">{scienceBoundaryComplete ? <CheckCircle2 size={16} /> : <span className="mission-ring" />}</span><div><strong>科学边界</strong><small>{scienceBoundaryComplete ? "已完成" : "未完成"}</small></div><em>{scienceBoundaryComplete ? "COMPLETE" : "ACTIVE"}</em></div><button type="button" className="mission-replay" onClick={replayMissions}><RotateCcw size={12} /> 重玩</button></aside>
      <header className="topbar"><div className="brand"><button className="brand-camera-button" onClick={captureObservatory} aria-label="拍摄天文台截图" title="拍摄天文台截图"><Camera size={18} /></button><div><div className="eyebrow">NIGHT OBSERVATORY · 3D SKY</div><h1>午夜天文台</h1></div></div><div className="status"><span className="status-dot" /> HYG v4.1 · {STAR_COUNT.toLocaleString()} STARS <b>·</b> {CONSTELLATION_COUNT} CONSTELLATIONS</div><button className="icon-button" onClick={toggleDayNight} aria-label={dayMode ? "切换到夜间观测" : "切换到白天观测"} title={dayMode ? "切换到夜间观测" : "切换到白天观测"}>{dayMode ? <Moon size={17} /> : <Sun size={17} />}</button></header>
      <section className="scene-hint"><Crosshair size={15} /><span>{isDragging ? "球面旋转中 · 探索天球" : "拖动以环视 3D 天球"}</span><kbd>ORBIT</kbd><button className={`intensity-toggle ${visualIntensity === "strong" ? "active" : ""}`} onClick={toggleVisualIntensity} aria-pressed={visualIntensity === "strong"}>{visualIntensity === "strong" ? "全部高亮" : "柔和显示"}</button></section>
      {scientistTargets.length > 0 && <div className="scientist-zone" aria-label="科学家遗留现场">{scientistTargets.map((scientist) => <button key={scientist.id} type="button" className={`scientist-target ${scientistsFound.has(scientist.id) ? "found" : ""}`} style={{ left: scientist.left, top: scientist.top, ["--scale" as string]: scientist.scale, ["--lean" as string]: `${scientist.lean}deg`, ["--body-width" as string]: `${scientist.bodyWidth}px`, ["--body-height" as string]: `${scientist.bodyHeight}px`, ["--arm" as string]: `${scientist.arm}deg`, ["--leg" as string]: `${scientist.leg}deg` }} onClick={() => discoverScientist(scientist.id)} aria-label="发现科学家"><span className="scientist-head" /><span className="scientist-body" /><span className="scientist-arm" /><span className="scientist-leg scientist-leg-one" /><span className="scientist-leg scientist-leg-two" /></button>)}</div>}
      {scientistNotice && <div className="scientist-notice" role="status">{scientistNotice}</div>}
      {celebration && <div className="mission-celebration" role="status"><span className="celebration-kicker">MISSION COMPLETE</span><strong>恭喜，倒计时任务完成</strong></div>}
      {scientistCelebration && <div className="mission-celebration science-celebration" role="status"><span className="celebration-kicker">MISSION COMPLETE</span><strong>恭喜，科学边界任务完成</strong></div>}
      <footer className="bottom-bar"><div className="location"><Compass size={15} /><span>纬 {latitude.toFixed(2)}° · 经 {longitude.toFixed(2)}° · J2000</span></div><div className="azimuth-dial"><span className="dial-tick t1" /><span className="dial-tick t2" /><span className="dial-tick t3" /><span className="dial-needle" /><span className="dial-north">N</span><span className="dial-east">E</span><span className="dial-south">S</span><span className="dial-west">W</span></div><div className="footer-meta"><span><Moon size={14} /> 朔月 · 04:18</span><span className="divider" /><span>HYG / BSC</span></div></footer>
    </main>
  );
}
