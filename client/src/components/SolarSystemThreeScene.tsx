/* Design philosophy: 三体 / Scientific Instrument Aesthetic. PBR textures, layered solar corona,
   atmospheric halos and satellite systems elevate the orrery into a true visual reference. */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getTexture } from "@/lib/textureCache";

type Props = { running: boolean; speed: number; onFocus?: (name: string) => void };

// ─── Body definitions ──────────────────────────────────────────────────────────
interface MoonDef {
  id: string;
  name: string;
  orbitR: number;
  size: number;
  period: number; // in Earth days, scaled
  tilt?: number;
  textureMap: string;
}

interface BodyDef {
  id: string;
  name: string;
  orbitR: number;
  size: number;
  period: number;
  tilt?: number;               // axial tilt (radians)
  textureMap: string;
  cloudMap?: string;
  rings?: { innerR: number; outerR: number; textureMap: string };
  atmosphere?: { color: string; opacity: number; scale: number };
  moons?: MoonDef[];
}

const BODIES: BodyDef[] = [
  {
    id: "mercury", name: "水星", orbitR: 2.2, size: 0.11, period: 0.42,
    textureMap: "/textures/mercury_surface.jpg",
  },
  {
    id: "venus", name: "金星", orbitR: 3.1, size: 0.18, period: 0.72,
    textureMap: "/textures/venus_atmosphere.jpg",
    atmosphere: { color: "#e0c860", opacity: 0.22, scale: 1.045 },
  },
  {
    id: "earth", name: "地球", orbitR: 4.15, size: 0.20, period: 1.0,
    textureMap: "/textures/earth_daymap.jpg",
    cloudMap: "/textures/earth_clouds.jpg",
    atmosphere: { color: "#4fa3e0", opacity: 0.18, scale: 1.048 },
    moons: [
      { id: "moon", name: "月球", orbitR: 0.46, size: 0.054, period: 27.3 / 365, textureMap: "/textures/moon_surface.jpg" },
    ],
  },
  {
    id: "mars", name: "火星", orbitR: 5.25, size: 0.15, period: 1.88,
    textureMap: "/textures/mars_surface.jpg",
    atmosphere: { color: "#c1623f", opacity: 0.10, scale: 1.036 },
  },
  {
    id: "jupiter", name: "木星", orbitR: 7.0, size: 0.42, period: 11.86,
    textureMap: "/textures/jupiter_surface.jpg",
    moons: [
      { id: "io",       name: "木卫一·伊俄",   orbitR: 0.62, size: 0.038, period: 1.77 / 365,  textureMap: "/textures/moon_surface.jpg" },
      { id: "europa",   name: "木卫二·欧罗巴", orbitR: 0.80, size: 0.032, period: 3.55 / 365,  textureMap: "/textures/moon_surface.jpg" },
      { id: "ganymede", name: "木卫三·盖尼米德",orbitR: 1.02, size: 0.052, period: 7.15 / 365,  textureMap: "/textures/moon_surface.jpg" },
      { id: "callisto", name: "木卫四·卡利斯托",orbitR: 1.32, size: 0.048, period: 16.69 / 365, textureMap: "/textures/moon_surface.jpg" },
    ],
  },
  {
    id: "saturn", name: "土星", orbitR: 8.8, size: 0.35, period: 29.46,
    tilt: THREE.MathUtils.degToRad(26.7),
    textureMap: "/textures/saturn_surface.jpg",
    rings: { innerR: 0.44, outerR: 0.92, textureMap: "/textures/saturn_ring.png" },
  },
  {
    id: "uranus", name: "天王星", orbitR: 10.4, size: 0.27, period: 84.0,
    tilt: THREE.MathUtils.degToRad(97.8),  // 独特侧躺自转轴
    textureMap: "/textures/uranus_surface.jpg",
    atmosphere: { color: "#7de8e8", opacity: 0.14, scale: 1.04 },
  },
  {
    id: "neptune", name: "海王星", orbitR: 11.9, size: 0.26, period: 165.0,
    textureMap: "/textures/neptune_surface.jpg",
    atmosphere: { color: "#4b70dd", opacity: 0.20, scale: 1.042 },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeOrbitLine(radius: number): THREE.LineLoop {
  const pts = Array.from({ length: 128 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  });
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: "#8caeaa", transparent: true, opacity: 0.22 }));
}

function makeAtmosphere(size: number, color: string, opacity: number, scale: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(size * scale, 32, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
}

/** Build a Canvas-based radial gradient sprite texture for the solar glow */
function makeSunGlowTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0,  "rgba(255,220,100,0.5)");
  grad.addColorStop(0.25, "rgba(255,170, 40,0.28)");
  grad.addColorStop(0.55, "rgba(255,130, 20,0.08)");
  grad.addColorStop(1.0,  "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SolarSystemThreeScene({ running, speed, onFocus }: Props) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const runningRef  = useRef(running);
  const speedRef    = useRef(speed);
  const focusRef    = useRef(onFocus);
  runningRef.current = running;
  speedRef.current   = speed;
  focusRef.current   = onFocus;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);

    // ── Lighting ──────────────────────────────────────────────────────────────
    const sunLight = new THREE.PointLight("#ffe9af", 8.2, 80, 0.9);
    scene.add(sunLight);
    scene.add(new THREE.HemisphereLight("#dcefff", "#101a26", 0.46));
    scene.add(new THREE.AmbientLight("#5d7890", 0.42));

    // ── System root ───────────────────────────────────────────────────────────
    const system = new THREE.Group();
    scene.add(system);

    // ── Sun ───────────────────────────────────────────────────────────────────
    const sunGeo  = new THREE.SphereGeometry(0.84, 64, 40);
    const sunMat  = new THREE.MeshBasicMaterial({ map: getTexture("/textures/sun_surface.jpg") });
    const sun     = new THREE.Mesh(sunGeo, sunMat);
    sun.userData  = { name: "太阳" };
    system.add(sun);

    // Corona layers: inner → outer, additive blending
    const coronaDefs = [
      { scale: 1.09, color: "#ff9f20", opacity: 0.22 },
      { scale: 1.22, color: "#e07010", opacity: 0.10 },
      { scale: 1.45, color: "#c05000", opacity: 0.045 },
    ];
    for (const def of coronaDefs) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.84 * def.scale, 32, 24),
        new THREE.MeshBasicMaterial({
          color: def.color, transparent: true, opacity: def.opacity,
          side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      system.add(m);
    }

    // Wide glow sprite
    const glowTex = makeSunGlowTexture(512);
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.85 }));
    glowSprite.scale.setScalar(4.8);
    system.add(glowSprite);

    // ── Planets ───────────────────────────────────────────────────────────────
    type BodyInstance = {
      def: BodyDef;
      orbitGroup: THREE.Group;   // rotates around the sun each frame
      pivot: THREE.Group;        // holds the planet mesh, tilted
      mesh: THREE.Mesh;
      cloudMesh?: THREE.Mesh;
      moonGroups: Array<{ group: THREE.Group; def: MoonDef }>;
    };

    const clickables: THREE.Object3D[] = [sun];

    const bodyInstances: BodyInstance[] = BODIES.map((def, idx) => {
      // Orbit line
      system.add(makeOrbitLine(def.orbitR));

      // Orbit group (rotates around sun)
      const orbitGroup = new THREE.Group();
      orbitGroup.rotation.y = idx * 0.72;   // spread initial positions
      system.add(orbitGroup);

      // Pivot (axial tilt)
      const pivot = new THREE.Group();
      if (def.tilt) pivot.rotation.z = def.tilt;
      pivot.position.x = def.orbitR;

      // Planet material
      const bodyTexture = getTexture(def.textureMap);
      const mat = new THREE.MeshStandardMaterial({
        map: bodyTexture,
        emissive: "#243746",
        emissiveMap: bodyTexture,
        emissiveIntensity: 0.12,
        roughness: 0.78,
        metalness: 0.02,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(def.size, 48, 32), mat);
      mesh.userData = { name: def.name };
      clickables.push(mesh);
      pivot.add(mesh);

      // Cloud layer (Earth only)
      let cloudMesh: THREE.Mesh | undefined;
      if (def.cloudMap) {
        cloudMesh = new THREE.Mesh(
          new THREE.SphereGeometry(def.size * 1.007, 48, 32),
          new THREE.MeshStandardMaterial({
            map: getTexture(def.cloudMap),
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
            roughness: 1,
            metalness: 0,
          })
        );
        pivot.add(cloudMesh);
      }

      // Atmosphere halo
      if (def.atmosphere) {
        pivot.add(makeAtmosphere(def.size, def.atmosphere.color, def.atmosphere.opacity, def.atmosphere.scale));
      }

      // Ring system (Saturn / Uranus)
      if (def.rings) {
        const { innerR, outerR, textureMap } = def.rings;
        const ringGeo = new THREE.RingGeometry(innerR, outerR, 128);
        // Remap UV so texture maps radially from inner to outer edge
        const pos  = ringGeo.attributes.position as THREE.BufferAttribute;
        const uv   = ringGeo.attributes.uv as THREE.BufferAttribute;
        const v3   = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const r = v3.length();
          uv.setXY(i, (r - innerR) / (outerR - innerR), 0.5);
        }
        const ringMat = new THREE.MeshBasicMaterial({
          map: getTexture(textureMap),
          side: THREE.DoubleSide,
          transparent: true,
          alphaTest: 0.01,
          depthWrite: false,
          blending: THREE.NormalBlending,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        pivot.add(ring);
      }

      orbitGroup.add(pivot);

      // Moons
      const moonGroups: Array<{ group: THREE.Group; def: MoonDef }> = [];
      for (const moonDef of def.moons ?? []) {
        const moonOrbit = new THREE.Group();
        moonOrbit.rotation.y = Math.random() * Math.PI * 2;
        const moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(moonDef.size, 24, 16),
          (() => {
            const moonTexture = getTexture(moonDef.textureMap);
            return new THREE.MeshStandardMaterial({
              map: moonTexture,
              emissive: "#273542",
              emissiveMap: moonTexture,
              emissiveIntensity: 0.10,
              roughness: 0.9,
              metalness: 0,
            });
          })()
        );
        moonMesh.userData = { name: moonDef.name };
        moonMesh.position.x = moonDef.orbitR;
        clickables.push(moonMesh);
        moonOrbit.add(moonMesh);
        // Attach to planet pivot so moons follow planetary orbit
        pivot.add(moonOrbit);
        moonGroups.push({ group: moonOrbit, def: moonDef });
      }

      return { def, orbitGroup, pivot, mesh, cloudMesh, moonGroups };
    });

    // ── Background stars ───────────────────────────────────────────────────────
    const starPositions = new Float32Array(2000 * 3);
    for (let i = 0; i < starPositions.length; i += 3) {
      const r = 22 + (i % 29);
      const th = i * 0.47;
      const ph = (i * 0.91) % Math.PI;
      starPositions[i]     = r * Math.sin(ph) * Math.cos(th);
      starPositions[i + 1] = r * Math.cos(ph);
      starPositions[i + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: "#d8e8df", size: 0.055, sizeAttenuation: true, transparent: true, opacity: 0.70 })));

    // ── Camera & controls ─────────────────────────────────────────────────────
    const view = { yaw: 0.45, pitch: 0.52, distance: 15.5, dragging: false, x: 0, y: 0 };

    const updateCamera = () => {
      view.pitch = Math.max(-1.2, Math.min(1.2, view.pitch));
      const d = view.distance;
      camera.position.set(
        Math.sin(view.yaw) * Math.cos(view.pitch) * d,
        Math.sin(view.pitch) * d,
        Math.cos(view.yaw) * Math.cos(view.pitch) * d,
      );
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const resize = () => {
      const w = mount.clientWidth  || 800;
      const h = mount.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    window.addEventListener("resize", resize);

    const down = (e: PointerEvent) => { view.dragging = true; view.x = e.clientX; view.y = e.clientY; mount.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!view.dragging) return;
      view.yaw   -= (e.clientX - view.x) * 0.006;
      view.pitch -= (e.clientY - view.y) * 0.006;
      view.x = e.clientX; view.y = e.clientY;
      updateCamera();
    };
    const up = () => { view.dragging = false; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      view.distance = Math.max(7, Math.min(26, view.distance + e.deltaY * 0.014));
      updateCamera();
    };
    const click = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc  = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width)  * 2 - 1,
        -((e.clientY - rect.top)  / rect.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(clickables, false);
      if (hit[0]?.object.userData.name) focusRef.current?.(hit[0].object.userData.name);
    };

    mount.addEventListener("pointerdown", down);
    mount.addEventListener("pointermove", move);
    mount.addEventListener("pointerup",   up);
    mount.addEventListener("pointercancel", up);
    mount.addEventListener("wheel",  wheel, { passive: false });
    mount.addEventListener("click",  click);

    // ── Visibility API ────────────────────────────────────────────────────────
    let isVisible = !document.hidden;
    const onVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) { cancelAnimationFrame(frame); frame = requestAnimationFrame(animate); }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ── Animation loop ────────────────────────────────────────────────────────
    let frame = 0;
    const animate = () => {
      if (!isVisible) return;
      frame = requestAnimationFrame(animate);

      if (runningRef.current) {
        const f = speedRef.current * 0.004;

        // Sun self-rotation + UV drift for surface texture animation
        sun.rotation.y += f * 0.30;
        if (Array.isArray(sunMat.map) || sunMat.map) {
          // Slight UV offset to simulate solar rotation texture drift
          sunMat.map!.offset.x += f * 0.0008;
        }

        bodyInstances.forEach(({ def, orbitGroup, mesh, cloudMesh, moonGroups }) => {
          // Orbital revolution
          orbitGroup.rotation.y += f / def.period;
          // Self-rotation (rough approximation — faster than orbital period)
          mesh.rotation.y += f * 1.2;
          // Cloud layer rotates slightly faster than surface
          if (cloudMesh) cloudMesh.rotation.y += f * 1.35;
          // Moons
          moonGroups.forEach(({ group, def: mDef }) => {
            group.rotation.y += f / mDef.period;
          });
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
      mount.removeEventListener("pointerdown", down);
      mount.removeEventListener("pointermove", move);
      mount.removeEventListener("pointerup",   up);
      mount.removeEventListener("pointercancel", up);
      mount.removeEventListener("wheel",  wheel);
      mount.removeEventListener("click",  click);
      glowTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineLoop || obj instanceof THREE.Sprite) {
          (obj as THREE.Mesh).geometry?.dispose();
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) { mat.forEach((m) => m.dispose()); }
          else if (mat) { (mat as THREE.Material).dispose(); }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="solar-system-three-scene"
      aria-label="Three.js 太阳系运转 3D 场景 — 含 PBR 真实材质纹理"
    />
  );
}
