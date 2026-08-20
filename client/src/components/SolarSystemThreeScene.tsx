/* Design philosophy: 三体 / Scientific Instrument Aesthetic. A quiet instrument-grade 3D orrery uses brass orbital geometry, teal telemetry, and restrained midnight space. */
import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = { running: boolean; speed: number; onFocus?: (name: string) => void };

const BODIES = [
  { id: "mercury", name: "水星", orbit: 2.2, size: .11, color: "#a98d76", period: .42 },
  { id: "venus", name: "金星", orbit: 3.1, size: .18, color: "#d8b77e", period: .72 },
  { id: "earth", name: "地球", orbit: 4.15, size: .2, color: "#6ea6bd", period: 1 },
  { id: "mars", name: "火星", orbit: 5.25, size: .15, color: "#c56d53", period: 1.88 },
  { id: "jupiter", name: "木星", orbit: 7, size: .42, color: "#c79d79", period: 11.86 },
  { id: "saturn", name: "土星", orbit: 8.8, size: .35, color: "#d4ba86", period: 29.46 },
];

function makeOrbit(radius: number) {
  const points = Array.from({ length: 128 }, (_, index) => {
    const angle = (index / 128) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  });
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: "#8caeaa", transparent: true, opacity: .25 }));
}

export default function SolarSystemThreeScene({ running, speed, onFocus }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const focusRef = useRef(onFocus);
  runningRef.current = running;
  speedRef.current = speed;
  focusRef.current = onFocus;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    mount.appendChild(renderer.domElement);

    const system = new THREE.Group();
    scene.add(system);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(.82, 48, 32), new THREE.MeshBasicMaterial({ color: "#ffd875" }));
    sun.userData = { name: "太阳" };
    system.add(sun);
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(1.06, 32, 24), new THREE.MeshBasicMaterial({ color: "#e7a944", transparent: true, opacity: .16, side: THREE.BackSide, blending: THREE.AdditiveBlending }));
    system.add(sunGlow);
    const light = new THREE.PointLight("#ffe9af", 4.6, 45, 1.2); system.add(light);
    const bodies = BODIES.map((body, index) => {
      const orbit = makeOrbit(body.orbit); system.add(orbit);
      const group = new THREE.Group(); group.rotation.y = index * .82;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(body.size, 32, 24), new THREE.MeshStandardMaterial({ color: body.color, roughness: .7, metalness: .03 }));
      mesh.position.x = body.orbit; mesh.userData = { name: body.name };
      group.add(mesh);
      if (body.id === "saturn") {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.58, .045, 8, 64), new THREE.MeshBasicMaterial({ color: "#d8bd88", transparent: true, opacity: .75, side: THREE.DoubleSide }));
        ring.rotation.x = Math.PI / 2.25; mesh.add(ring);
      }
      system.add(group);
      return { body, group, mesh };
    });

    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1800 * 3);
    for (let index = 0; index < positions.length; index += 3) {
      const radius = 19 + (index % 31); const theta = index * .47; const phi = (index * .91) % Math.PI;
      positions[index] = radius * Math.sin(phi) * Math.cos(theta); positions[index + 1] = radius * Math.cos(phi); positions[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: "#dce8df", size: .055, sizeAttenuation: true, transparent: true, opacity: .72 }));
    scene.add(stars);
    scene.add(new THREE.AmbientLight("#5a7888", .28));

    const view = { yaw: .45, pitch: .54, distance: 14, dragging: false, x: 0, y: 0 };
    const updateCamera = () => {
      view.pitch = Math.max(-1.2, Math.min(1.2, view.pitch));
      camera.position.set(Math.sin(view.yaw) * Math.cos(view.pitch) * view.distance, Math.sin(view.pitch) * view.distance, Math.cos(view.yaw) * Math.cos(view.pitch) * view.distance);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();
    const resize = () => { const width = mount.clientWidth || 800; const height = mount.clientHeight || 600; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
    resize(); window.addEventListener("resize", resize);
    const down = (event: PointerEvent) => { view.dragging = true; view.x = event.clientX; view.y = event.clientY; mount.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => { if (!view.dragging) return; view.yaw -= (event.clientX - view.x) * .006; view.pitch -= (event.clientY - view.y) * .006; view.x = event.clientX; view.y = event.clientY; updateCamera(); };
    const up = () => { view.dragging = false; };
    const wheel = (event: WheelEvent) => { event.preventDefault(); view.distance = Math.max(7, Math.min(24, view.distance + event.deltaY * .012)); updateCamera(); };
    const click = (event: MouseEvent) => { const rect = renderer.domElement.getBoundingClientRect(); const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(ndc, camera); const hit = raycaster.intersectObjects([sun, ...bodies.map((item) => item.mesh)]); if (hit[0]?.object.userData.name) focusRef.current?.(hit[0].object.userData.name); };
    mount.addEventListener("pointerdown", down); mount.addEventListener("pointermove", move); mount.addEventListener("pointerup", up); mount.addEventListener("pointercancel", up); mount.addEventListener("wheel", wheel, { passive: false }); mount.addEventListener("click", click);
    let frame = 0;
    const animate = () => { frame = requestAnimationFrame(animate); if (runningRef.current) { const factor = speedRef.current * .004; bodies.forEach(({ body, group }) => { group.rotation.y += factor / body.period; }); sun.rotation.y += factor * .35; } renderer.render(scene, camera); };
    animate();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); mount.removeEventListener("pointerdown", down); mount.removeEventListener("pointermove", move); mount.removeEventListener("pointerup", up); mount.removeEventListener("pointercancel", up); mount.removeEventListener("wheel", wheel); mount.removeEventListener("click", click); bodies.forEach(({ group }) => group.children.forEach((child) => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); (child.material as THREE.Material).dispose(); } })); starGeometry.dispose(); (stars.material as THREE.Material).dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, []);

  return <div ref={mountRef} className="solar-system-three-scene" aria-label="Three.js 太阳系运转 3D 场景" />;
}
