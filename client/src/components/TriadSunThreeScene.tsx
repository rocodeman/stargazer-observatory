import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = { running: boolean; speed: number; onFocus?: (name: string) => void };

const SUNS = [
  { id: "曜灵", color: "#ffd875", radius: 2.3, scale: 1.05, phase: .2, wobble: .7 },
  { id: "烬环", color: "#f4bf68", radius: 4.1, scale: .82, phase: 2.1, wobble: 1.05 },
  { id: "星烛", color: "#ffe6a2", radius: 5.9, scale: 1.22, phase: 4.4, wobble: .82 },
];

function makeOrbit(radius: number, tilt: number) {
  const points = Array.from({ length: 128 }, (_, index) => {
    const angle = (index / 128) * Math.PI * 2;
    const point = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    point.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
    return point;
  });
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: "#9bbdb5", transparent: true, opacity: .24 }));
}

export default function TriadSunThreeScene({ running, speed, onFocus }: Props) {
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
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const center = new THREE.Group();
    scene.add(center);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.62, 40, 28), new THREE.MeshBasicMaterial({ color: "#f7dda0" }));
    center.add(core);
    center.add(new THREE.Mesh(new THREE.SphereGeometry(.88, 32, 24), new THREE.MeshBasicMaterial({ color: "#e7a944", transparent: true, opacity: .14, side: THREE.BackSide, blending: THREE.AdditiveBlending })));
    center.add(new THREE.PointLight("#ffe9af", 4.5, 45, 1.2));

    const bodies = SUNS.map((sun, index) => {
      const group = new THREE.Group();
      group.rotation.set(index * .32, sun.phase, index * .45);
      const orbit = makeOrbit(sun.radius, .18 + index * .14);
      center.add(orbit);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(.42 * sun.scale, 32, 24), new THREE.MeshBasicMaterial({ color: sun.color }));
      mesh.position.x = sun.radius;
      mesh.userData = { name: sun.id };
      group.add(mesh);
      group.add(new THREE.Mesh(new THREE.SphereGeometry(.56 * sun.scale, 24, 18), new THREE.MeshBasicMaterial({ color: sun.color, transparent: true, opacity: .12, side: THREE.BackSide, blending: THREE.AdditiveBlending })));
      center.add(group);
      return { sun, group, mesh };
    });

    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1800 * 3);
    for (let index = 0; index < positions.length; index += 3) {
      const radius = 18 + (index % 31); const theta = index * .47; const phi = (index * .91) % Math.PI;
      positions[index] = radius * Math.sin(phi) * Math.cos(theta); positions[index + 1] = radius * Math.cos(phi); positions[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: "#dce8df", size: .055, sizeAttenuation: true, transparent: true, opacity: .72 }));
    scene.add(stars);
    scene.add(new THREE.AmbientLight("#5a7888", .28));

    const view = { yaw: .42, pitch: .54, distance: 14, dragging: false, x: 0, y: 0 };
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
    const click = (event: MouseEvent) => { const rect = renderer.domElement.getBoundingClientRect(); const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(ndc, camera); const hit = raycaster.intersectObjects(bodies.map((item) => item.mesh)); if (hit[0]?.object.userData.name) focusRef.current?.(hit[0].object.userData.name); };
    let isVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let frame = 0;
    const animate = (time: number) => {
      if (!isVisible) return;
      frame = requestAnimationFrame(animate);
      if (runningRef.current) {
        const factor = speedRef.current * .0036;
        bodies.forEach(({ sun, group }, index) => {
          group.rotation.y += factor * (index % 2 ? 1.4 : .72) / (index + 1);
          group.rotation.x = Math.sin(time * .00045 * sun.wobble + sun.phase) * .12;
        });
        core.rotation.y += factor;
      }
      renderer.render(scene, camera);
    };
    animate(performance.now());

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", resize);
      mount.removeEventListener("pointerdown", down);
      mount.removeEventListener("pointermove", move);
      mount.removeEventListener("pointerup", up);
      mount.removeEventListener("pointercancel", up);
      mount.removeEventListener("wheel", wheel);
      mount.removeEventListener("click", click);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineLoop) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else if (object.material) {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="solar-system-three-scene" aria-label="Three.js 三太阳不规则运行场景" />;
}
