/* Design philosophy: 三体 / Scientific Instrument Aesthetic. A true celestial sphere replaces the former flat viewport; controls remain edge-mounted and quiet. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Camera, CheckCircle2, CircleUserRound, Compass, Crosshair, LocateFixed, Moon, Radio, RotateCcw, Sun, Telescope } from "lucide-react";
import { SKY_DATA as INITIAL_SKY_DATA } from "@/data/skyDataCore";
import {
  type Vec3,
  type Projected,
  toVector,
  project,
  starColor,
  normalize,
  vectorToRaDec,
  localSiderealHours,
  getSolarObjects,
} from "@/lib/astronomy";

type SkyData = {
  stars: ReadonlyArray<{ hr: number; ra: number; dec: number; mag: number; ci: number }>;
  constellations: ReadonlyArray<{ id: string; abbr: string; name: string; latin: string; points: ReadonlyArray<number> }>;
  meta: { starCount: number; constellationCount: number; source: string; initialStarCount?: number; initialConstellationCount?: number };
};
const FEATURED = ["ori", "uma", "cas", "cyg", "sco", "leo", "gem", "tau", "lyr", "sgr", "and", "peg"];
const DEFAULT_VISUAL_INTENSITY = "soft" as const;
const INITIAL_CONSTELLATION_IDS = [...FEATURED, "aur", "per", "mon", "vir", "lib", "cap", "aqr", "psc"];
const SCIENTIST_PROFILES = [
  { id: 0, scale: 1.05, lean: -18, bodyWidth: 38, bodyHeight: 48, arm: -28, leg: 18 },
  { id: 1, scale: .82, lean: 12, bodyWidth: 31, bodyHeight: 42, arm: 22, leg: -12 },
  { id: 2, scale: 1.24, lean: 26, bodyWidth: 46, bodyHeight: 56, arm: 38, leg: 24 },
  { id: 3, scale: .94, lean: -34, bodyWidth: 35, bodyHeight: 45, arm: -12, leg: -28, missionOnly: true },
];
const SCIENTIST_SLOTS = [
  { left: "11%", top: "23%" }, { left: "24%", top: "57%" }, { left: "39%", top: "18%" },
  { left: "53%", top: "42%" }, { left: "68%", top: "25%" }, { left: "82%", top: "63%" },
  { left: "91%", top: "36%" }, { left: "31%", top: "78%" }, { left: "61%", top: "74%" },
];

const PLANET_IDS = new Set(["sun", "mercury", "venus", "mars", "jupiter", "saturn"]);
const VIRTUAL_SUN_IDS = new Set(["virtual-sun-a", "virtual-sun-b", "virtual-sun-c"]);
const BODY_DETAILS: Record<string, { type: string; distance: string; magnitude: string; description: string }> = {
  sun: { type: "恒星 · G2V", distance: "1 AU", magnitude: "−26.74", description: "太阳系中心恒星，提供地球上绝大多数可见光与热量。观测模拟中以当前日期的近似黄经位置显示。" },
  moon: { type: "地球卫星", distance: "384,400 km", magnitude: "−12.7", description: "地球唯一的天然卫星。月球位置和亮度会随着观测时间变化，夜空中的大气散射也会受其影响。" },
  mercury: { type: "行星 · 类地", distance: "0.39 AU", magnitude: "−0.4", description: "最靠近太阳的行星，轨道周期短，通常只在日出前或日落后较低的天空中出现。" },
  venus: { type: "行星 · 类地", distance: "0.72 AU", magnitude: "−4.7", description: "金星是夜空中最亮的行星之一，常被称为启明星或长庚星。" },
  mars: { type: "行星 · 类地", distance: "1.52 AU", magnitude: "−2.9", description: "表面富含氧化铁，因此呈现橙红色；它的视亮度会随地球与火星的相对位置显著变化。" },
  jupiter: { type: "行星 · 气态巨行星", distance: "5.20 AU", magnitude: "−2.9", description: "太阳系最大的行星，明亮且容易辨认；在高倍率望远镜中可以进一步观察其卫星系统。" },
  saturn: { type: "行星 · 气态巨行星", distance: "9.58 AU", magnitude: "0.5", description: "以壮观的环系闻名。页面中的标记用于定位，未模拟望远镜高倍率下的环系细节。" },
  "virtual-sun-a": { type: "异常恒星 · 观测幻象", distance: "未知", magnitude: "−25.8", description: "一个与太阳光谱外观相似的虚拟天体，轨迹无法归入现有星表。" },
  "virtual-sun-b": { type: "异常恒星 · 观测幻象", distance: "未知", magnitude: "−26.1", description: "一个与太阳光谱外观相似的虚拟天体，周围存在不规则轨迹扰动。" },
  "virtual-sun-c": { type: "异常恒星 · 观测幻象", distance: "未知", magnitude: "−25.4", description: "一个与太阳光谱外观相似的虚拟天体，信号呈现周期外闪烁。" },
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
  const [skyData, setSkyData] = useState<SkyData>(INITIAL_SKY_DATA as SkyData);
  const [fullDataLoaded, setFullDataLoaded] = useState(false);
  const [active, setActive] = useState("ori");
  const [showLines, setShowLines] = useState(true);
  const [selectedConstellations, setSelectedConstellations] = useState<Set<string>>(() => new Set(INITIAL_CONSTELLATION_IDS));
  const [showNames, setShowNames] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [yaw, setYaw] = useState(0.9);
  const [pitch, setPitch] = useState(0.18);
  const [observerDate, setObserverDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [latitude, setLatitude] = useState(31.23);
  const [longitude, setLongitude] = useState(121.47);
  const [showSolar, setShowSolar] = useState(true);
  const [showVirtualSuns, setShowVirtualSuns] = useState(true);
  const [showMessier, setShowMessier] = useState(true);
  const displayStarCount = fullDataLoaded ? skyData.meta.starCount : (skyData.meta.initialStarCount ?? skyData.meta.starCount);
  const displayConstellationCount = fullDataLoaded ? skyData.meta.constellationCount : (skyData.meta.initialConstellationCount ?? skyData.meta.constellationCount);
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
  const [triadCelebration, setTriadCelebration] = useState(false);
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
  const [triadComplete, setTriadComplete] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("stargazer.task.threeSuns") === "complete");
  const [highlightModeCount, setHighlightModeCount] = useState(() => Math.min(3, Number(window.localStorage.getItem("stargazer.task.shineForYou.modeCount") || 0)));
  const shineComplete = highlightModeCount >= 3;
  const loadFullSkyData = async () => {
    if (fullDataLoaded) return skyData;
    const module = await import("@/data/skyData");
    const fullData = module.SKY_DATA as unknown as SkyData;
    setSkyData(fullData);
    setFullDataLoaded(true);
    return fullData;
  };
  const scienceBoundaryComplete = scientistsFound.size === scientistTargets.length;
  const scientistNoticeTimer = useRef<number | null>(null);
  useEffect(() => {
    setVisualIntensity(DEFAULT_VISUAL_INTENSITY);
    if (window.sessionStorage.getItem("stargazer.triad.returned") === "1") {
      window.sessionStorage.removeItem("stargazer.triad.returned");
      setTriadCelebration(true);
      setMeteorEnabled(true);
      window.setTimeout(() => { setMeteorEnabled(false); setTriadCelebration(false); }, 5000);
    }
  }, []);
  const toggleDayNight = () => setDayMode((mode) => !mode);
  const toggleVisualIntensity = () => {
    setVisualIntensity((mode) => {
      const nextMode = mode === "strong" ? "soft" : "strong";
      if (nextMode === "strong" && !dayMode) {
        setHighlightModeCount((count) => {
          const nextCount = Math.min(3, count + 1);
          window.localStorage.setItem("stargazer.task.shineForYou.modeCount", String(nextCount));
          return nextCount;
        });
      }
      return nextMode;
    });
  };
  const highlightConstellation = (item: typeof skyData.constellations[number]) => {
    setSelectedConstellations((previous) => { const next = new Set(previous); next.add(item.id); return next; });
    setActive(item.id);
    setFocusTarget(item.id);
    focusConstellation(item);
  };
  const captureObservatory = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
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
      link.download = `three-body-${timestamp.replace(/[: ]/g, "-")}.png`;
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
    setScientistNotice(`发现科学家死亡 · ${next.size}/${scientistTargets.length}`);
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
    window.localStorage.removeItem("stargazer.task.threeSuns");
    window.localStorage.removeItem("stargazer.task.shineForYou");
    window.localStorage.removeItem("stargazer.task.shineForYou.constellations");
    window.localStorage.removeItem("stargazer.task.shineForYou.modeCount");
    window.localStorage.removeItem("stargazer.task.scienceBoundary");
    setCountdownComplete(false);
    setBroadcastComplete(false);
    setTriadComplete(false);
    setTriadCelebration(false);
    setHighlightModeCount(0);
    setScientistsFound(new Set());
    setScientistNotice("");
    setScientistCelebration(false);
    setVisualIntensity(DEFAULT_VISUAL_INTENSITY);
    setShowVirtualSuns(true);
  };

  const stars = useMemo(() => skyData.stars.map((star) => ({ ...star, vector: toVector(star.ra, star.dec) })), []);
  const byHr = useMemo(() => new Map(stars.map((star) => [star.hr, star])), [stars]);
  const current = skyData.constellations.find((item) => item.id === active) ?? skyData.constellations[0];
  const featured = FEATURED.map((id) => skyData.constellations.find((item) => item.id === id)).filter((item): item is typeof skyData.constellations[number] => Boolean(item));
  const allConstellationsSelected = selectedConstellations.size === skyData.constellations.length;
  const observationDate = useMemo(() => new Date(observerDate), [observerDate]);
  const sidereal = useMemo(() => localSiderealHours(observationDate, longitude), [observationDate, longitude]);
  const solarObjects = useMemo(() => getSolarObjects(observationDate), [observationDate]);
  const query = search.trim().toLowerCase();
  const searchResults = query ? [...skyData.constellations.map((item) => ({ id: item.id, name: item.name, latin: item.abbr, vector: normalize(item.points.map((hr) => byHr.get(hr)?.vector).filter((v): v is Vec3 => Boolean(v)).reduce<Vec3>((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: acc.z + v.z }), { x: 0, y: 0, z: 0 })) })), ...solarObjects.map((item) => ({ id: item.id, name: item.name, latin: item.latin, vector: item.vector })), ...MESSIER_OBJECTS.map((item) => ({ id: item.id, name: item.name, latin: item.latin, vector: item.vector }))].filter((item) => `${item.name} ${item.latin}`.toLowerCase().includes(query)).slice(0, 8) : [];
  const skyYaw = yaw + (sidereal / 24) * Math.PI * 2;

  useEffect(() => {
    if (search.trim() && !fullDataLoaded) void loadFullSkyData();
  }, [search, fullDataLoaded]);
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
  const toggleConstellation = (item: typeof skyData.constellations[number]) => {
    setSelectedConstellations((previous) => { const next = new Set(previous); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; });
    focusConstellation(item);
  };
  const toggleAllConstellations = async () => {
    const data = await loadFullSkyData();
    setSelectedConstellations((previous) => previous.size === data.constellations.length ? new Set() : new Set(data.constellations.map((item) => item.id)));
  };
  const focusConstellation = (item: typeof skyData.constellations[number]) => {
    const vector = normalize(item.points.map((hr) => byHr.get(hr)?.vector).filter((v): v is Vec3 => Boolean(v)).reduce<Vec3>((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: acc.z + v.z }), { x: 0, y: 0, z: 0 }));
    rotateToVector(vector, item.id);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frame = 0;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4 || deviceMemory <= 4 || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const render = () => {
      if (disposed) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
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
      for (let starIndex = 0; starIndex < stars.length; starIndex += 1) {
        const star = stars[starIndex];
        const p = project(star.vector, skyYaw, pitch, width, height, zoom);
        if (lowPower && starIndex % 2 === 1) {
          projected.set(star.hr, p);
          continue;
        }
        projected.set(star.hr, p);
        if (!p.visible || p.sx < -12 || p.sx > width + 12 || p.sy < -12 || p.sy > height + 12) continue;
        const radius = Math.max(.38, Math.min(3.2, 2.7 - star.mag * .34)) * (star.mag < 2.6 ? 1.15 : 1);
        const visibility = dayMode ? (star.mag < 0.5 ? .32 : .045) : environment === "city" ? (star.mag < 2.4 ? .72 : .22) : 1;
        ctx.globalAlpha = Math.max(.08, Math.min(.96, (1.15 - (star.mag + 1.5) / 8) * visibility));
        ctx.fillStyle = starColor(star.ci);
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = lowPower ? 0 : (star.mag < 2.7 ? 7 : 1.5);
        ctx.beginPath(); ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (showSolar) {
        for (const object of solarObjects) {
          if (!showVirtualSuns && object.id.startsWith("virtual-sun-")) continue;
          const p = project(object.vector, skyYaw, pitch, width, height, zoom);
          if (!p.visible) continue;
          ctx.fillStyle = object.color; ctx.shadowColor = object.color;           ctx.shadowBlur = lowPower ? 5 : 13;
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
      const constellationLayers = skyData.constellations.filter((constellation) => selectedConstellations.has(constellation.id));
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
          ctx.shadowBlur = lowPower ? 0 : (visualIntensity === "strong" ? 7 : 4);
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
  }, [stars, current, byHr, skyYaw, pitch, zoom, showLines, selectedConstellations, showNames, showSolar, showVirtualSuns, showMessier, solarObjects, environment, visualIntensity, dayMode]);

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
      if (VIRTUAL_SUN_IDS.has(nearest.id)) {
        navigate(`/solar-triad?focus=${nearest.id}`);
        return;
      }
      if (nearest.id === "sun" && !dayMode) return;
      setSelectedBody(nearest);
      return;
    }
    let nearestConstellation: { item: typeof skyData.constellations[number]; distance: number } | null = null;
    const distanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSquared = dx * dx + dy * dy || 1;
      const projection = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
      return Math.hypot(px - (ax + projection * dx), py - (ay + projection * dy));
    };
    for (const item of skyData.constellations) {
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
      <aside className="character-panel"><div className="character-profile"><div className="character-avatar"><CircleUserRound size={25} /></div><div><span>OBSERVATORY PILOT</span><strong>任务面板</strong></div></div><div className="character-divider" /><div className="mission-panel-kicker"><Radio size={13} /> 任务 · 5</div><div className={`mission-item ${triadComplete ? "complete" : "incomplete"}`} role="button" tabIndex={0} onClick={() => setShowVirtualSuns(true)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setShowVirtualSuns(true); }}><span className="mission-status">{triadComplete ? <CheckCircle2 size={16} /> : <span className="mission-ring" />}</span><div><strong>三个太阳</strong><small>{triadComplete ? "已完成" : "未完成"}</small></div><em>{triadComplete ? "COMPLETE" : "ACTIVE"}</em></div><div className={`mission-item ${broadcastComplete ? "complete" : "incomplete"}`}><span className="mission-status">{broadcastComplete ? <CheckCircle2 size={16} /> : <span className="mission-ring" />}</span><div><strong>宇宙广播</strong><small>{broadcastComplete ? "已完成" : "未完成"}</small></div><em>{broadcastComplete ? "COMPLETE" : "ACTIVE"}</em></div><div className={`mission-item ${scienceBoundaryComplete ? "complete" : "incomplete"}`} role="button" tabIndex={0} onClick={() => { const missionTarget = scientistTargets.find((scientist) => scientist.missionOnly && !scientistsFound.has(scientist.id)); if (missionTarget) discoverScientist(missionTarget.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { const missionTarget = scientistTargets.find((scientist) => scientist.missionOnly && !scientistsFound.has(scientist.id)); if (missionTarget) discoverScientist(missionTarget.id); } }}><span className="mission-status">{scienceBoundaryComplete ? <CheckCircle2 size={16} /> : <span className="mission-ring" />}</span><div><strong>科学家的葬礼</strong><small>{scienceBoundaryComplete ? "已完成" : `还需发现 ${scientistTargets.length - scientistsFound.size} 位完成`}</small></div><em>{scienceBoundaryComplete ? "COMPLETE" : "ACTIVE"}</em></div><div className={`mission-item ${countdownComplete ? "complete" : "incomplete"}`}><span className="mission-status">{countdownComplete ? <CheckCircle2 size={16} /> : <span className="mission-ring" />}</span><div><strong>倒计时</strong><small>{countdownComplete ? "已完成" : "未完成"}</small></div><em>{countdownComplete ? "COMPLETE" : "ACTIVE"}</em></div><div className={`mission-item ${shineComplete ? "complete" : "incomplete"}`}><span className="mission-status">{shineComplete ? <CheckCircle2 size={16} /> : <span className="mission-ring" />}</span><div><strong>为你闪耀</strong><small>{shineComplete ? "已完成" : "未完成"}</small></div><em>{shineComplete ? "COMPLETE" : "ACTIVE"}</em></div><button type="button" className="mission-replay" onClick={replayMissions}><RotateCcw size={12} /> 重玩</button></aside>
      <header className="topbar"><div className="brand"><button className="brand-camera-button" onClick={captureObservatory} aria-label="拍摄天文台截图" title="拍摄天文台截图"><Camera size={18} /></button><div><div className="eyebrow">NIGHT OBSERVATORY · 3D SKY</div><h1>三体</h1></div></div><div className="status"><span className="status-dot" /> HYG v4.1 · {displayStarCount.toLocaleString()} STARS <b>·</b> {displayConstellationCount} CONSTELLATIONS</div><button className="icon-button" onClick={toggleDayNight} aria-label={dayMode ? "切换到夜间观测" : "切换到白天观测"} title={dayMode ? "切换到夜间观测" : "切换到白天观测"}>{dayMode ? <Moon size={17} /> : <Sun size={17} />}</button></header>
      <section className="scene-hint"><Crosshair size={15} /><span>{isDragging ? "球面旋转中 · 探索天球" : "拖动以环视 3D 天球"}</span><kbd>ORBIT</kbd><button className={`intensity-toggle ${visualIntensity === "strong" ? "active" : ""}`} onClick={toggleVisualIntensity} aria-pressed={visualIntensity === "strong"}>{visualIntensity === "strong" ? "全部高亮" : "柔和显示"}</button><button className="intensity-toggle constellation-load-toggle" onClick={() => void toggleAllConstellations()} aria-label={fullDataLoaded ? "切换全部星座" : "加载完整星空数据"}>{fullDataLoaded ? (allConstellationsSelected ? "隐藏全部星座" : "全部星座") : "加载全部星座"}</button></section>
      {scientistTargets.length > 0 && <div className="scientist-zone" aria-label="科学家遗留现场">{scientistTargets.filter((scientist) => !scientist.missionOnly && !scientistsFound.has(scientist.id)).map((scientist) => <button key={scientist.id} type="button" className="scientist-target" style={{ left: scientist.left, top: scientist.top, ["--scale" as string]: scientist.scale, ["--lean" as string]: `${scientist.lean}deg`, ["--body-width" as string]: `${scientist.bodyWidth}px`, ["--body-height" as string]: `${scientist.bodyHeight}px`, ["--arm" as string]: `${scientist.arm}deg`, ["--leg" as string]: `${scientist.leg}deg` }} onClick={() => discoverScientist(scientist.id)} aria-label="发现科学家"><span className="scientist-head" /><span className="scientist-body" /><span className="scientist-arm" /><span className="scientist-leg scientist-leg-one" /><span className="scientist-leg scientist-leg-two" /></button>)}</div>}
      {scientistNotice && <div className="scientist-notice" role="status">{scientistNotice}</div>}
      {celebration && <div className="mission-celebration" role="status"><span className="celebration-kicker">MISSION COMPLETE</span><strong>恭喜，倒计时任务完成</strong></div>}
      {scientistCelebration && <div className="mission-celebration science-celebration" role="status"><span className="celebration-kicker">MISSION COMPLETE</span><strong>恭喜，科学家的葬礼任务完成</strong></div>}
      {triadCelebration && <div className="mission-celebration solar-triad-celebration" role="status"><span className="celebration-kicker">MISSION COMPLETE</span><strong>恭喜，三个太阳任务完成</strong></div>}
      <footer className="bottom-bar"><div className="location"><Compass size={15} /><span>纬 {latitude.toFixed(2)}° · 经 {longitude.toFixed(2)}° · J2000</span></div><div className="azimuth-dial"><span className="dial-tick t1" /><span className="dial-tick t2" /><span className="dial-tick t3" /><span className="dial-needle" style={{ left: `${Math.max(3, Math.min(97, (azimuth / 360) * 100))}%` }} /><span className="dial-north">N</span><span className="dial-east">E</span><span className="dial-south">S</span><span className="dial-west">W</span></div><div className="footer-meta"><span><Moon size={14} /> 朔月 · 04:18</span><span className="divider" /><span>HYG / BSC</span></div></footer>
    </main>
  );
}
