/* Design philosophy: 午夜天文台 / Scientific Instrument Aesthetic. Real 3D planet materials sit inside a quiet, instrument-like viewport. */
import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = { planetId: string; color: string; onAnglesChange?: (yaw: number, pitch: number) => void };

function makeSurfaceTexture(planetId: string, base: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();
  context.fillStyle = base; context.fillRect(0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const rgb = new THREE.Color(base);
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    const pixel = (y * canvas.width + x) * 4;
    const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const noise = (seed - Math.floor(seed) - .5) * 22;
    image.data[pixel] = Math.max(0, Math.min(255, rgb.r * 255 + noise));
    image.data[pixel + 1] = Math.max(0, Math.min(255, rgb.g * 255 + noise));
    image.data[pixel + 2] = Math.max(0, Math.min(255, rgb.b * 255 + noise));
  }
  context.putImageData(image, 0, 0);
  context.globalAlpha = .34;
  if (planetId === "jupiter" || planetId === "saturn") {
    for (let y = 20; y < canvas.height; y += 34) { context.fillStyle = y % 68 ? "#8d7158" : "#f0d6ab"; context.fillRect(0, y, canvas.width, 12); }
  } else if (planetId === "mars") {
    context.fillStyle = "#8f3e2f";
    for (let index = 0; index < 28; index += 1) { context.beginPath(); context.arc((index * 193) % 1024, (index * 97) % 512, 8 + index % 13, 0, Math.PI * 2); context.fill(); }
  } else if (planetId === "venus") {
    context.strokeStyle = "#fff0c0";
    for (let index = 0; index < 18; index += 1) { context.beginPath(); context.moveTo(0, index * 37); context.bezierCurveTo(300, index * 37 - 18, 680, index * 37 + 18, 1024, index * 37); context.stroke(); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default function PlanetThreeScene({ planetId, color, onAnglesChange }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const angles = useRef({ yaw: -12, pitch: 4, distance: 4.5, dragging: false, x: 0, y: 0 });
  const callbackRef = useRef(onAnglesChange);
  callbackRef.current = onAnglesChange;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    angles.current.distance = planetId === "sun" ? 8.5 : 5.2;
    camera.position.set(0, 0, angles.current.distance);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    mount.appendChild(renderer.domElement);

    const planetGroup = new THREE.Group();
    const texture = makeSurfaceTexture(planetId, color);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: planetId === "venus" ? .82 : .68, metalness: planetId === "sun" ? .1 : .02, emissive: planetId === "sun" ? new THREE.Color(color) : new THREE.Color("#000000"), emissiveIntensity: planetId === "sun" ? .65 : 0 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.45, 96, 64), material);
    planetGroup.add(sphere);
    if (planetId === "saturn") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.18, .13, 12, 96), new THREE.MeshStandardMaterial({ color: "#c6a873", roughness: .84, side: THREE.DoubleSide, transparent: true, opacity: .78, depthWrite: false }));
      ring.scale.y = .28;
      ring.rotation.x = Math.PI / 2.35;
      planetGroup.add(ring);
    }
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 64, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: planetId === "mars" ? .14 : .1, side: THREE.BackSide, blending: THREE.AdditiveBlending }));
    planetGroup.add(atmosphere);
    scene.add(planetGroup);

    const keyLight = new THREE.DirectionalLight("#fff3d0", planetId === "sun" ? 1.9 : 2.8);
    keyLight.position.set(-4, 2.6, 5); scene.add(keyLight);
    scene.add(new THREE.HemisphereLight("#789fb5", "#03070b", .3));
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(1500 * 3);
    for (let index = 0; index < starPositions.length; index += 3) { const radius = 14 + ((index * 17) % 22); const theta = (index * 1.71) % (Math.PI * 2); const phi = ((index * .91) % Math.PI); starPositions[index] = radius * Math.sin(phi) * Math.cos(theta); starPositions[index + 1] = radius * Math.cos(phi); starPositions[index + 2] = radius * Math.sin(phi) * Math.sin(theta); }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: "#d9e8e2", size: .055, sizeAttenuation: true, transparent: true, opacity: .74 })));

    const resize = () => { const width = mount.clientWidth || 600; const height = mount.clientHeight || 520; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
    resize(); window.addEventListener("resize", resize);
    const pointerDown = (event: PointerEvent) => { angles.current.dragging = true; angles.current.x = event.clientX; angles.current.y = event.clientY; mount.setPointerCapture(event.pointerId); };
    const pointerMove = (event: PointerEvent) => { if (!angles.current.dragging) return; angles.current.yaw += (event.clientX - angles.current.x) * .42; angles.current.pitch = Math.max(-55, Math.min(55, angles.current.pitch - (event.clientY - angles.current.y) * .3)); angles.current.x = event.clientX; angles.current.y = event.clientY; callbackRef.current?.(angles.current.yaw, angles.current.pitch); };
    const pointerUp = () => { angles.current.dragging = false; };
    const wheel = (event: WheelEvent) => { event.preventDefault(); const minDistance = planetId === "sun" ? 7.2 : 3.2; const maxDistance = planetId === "sun" ? 11 : 7; angles.current.distance = Math.max(minDistance, Math.min(maxDistance, angles.current.distance + event.deltaY * .003)); };
    mount.addEventListener("pointerdown", pointerDown); mount.addEventListener("pointermove", pointerMove); mount.addEventListener("pointerup", pointerUp); mount.addEventListener("pointercancel", pointerUp); mount.addEventListener("wheel", wheel, { passive: false });
    let frame = 0; const animate = () => { frame = requestAnimationFrame(animate); if (!angles.current.dragging) angles.current.yaw += .018; planetGroup.rotation.y = THREE.MathUtils.degToRad(angles.current.yaw); planetGroup.rotation.x = THREE.MathUtils.degToRad(angles.current.pitch); camera.position.z = angles.current.distance; renderer.render(scene, camera); }; animate();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); mount.removeEventListener("pointerdown", pointerDown); mount.removeEventListener("pointermove", pointerMove); mount.removeEventListener("pointerup", pointerUp); mount.removeEventListener("pointercancel", pointerUp); mount.removeEventListener("wheel", wheel); texture.dispose(); material.dispose(); sphere.geometry.dispose(); atmosphere.geometry.dispose(); (atmosphere.material as THREE.Material).dispose(); starGeometry.dispose(); (scene.children.find((item) => item instanceof THREE.Points)?.material as THREE.Material | undefined)?.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [planetId, color]);

  return <div ref={mountRef} className={`planet-three-scene ${planetId === "sun" ? "safe-solar-distance" : ""}`} aria-label={`${planetId} 3D 行星观察视角`} />;
}
