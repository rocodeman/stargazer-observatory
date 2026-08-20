/**
 * Singleton texture cache for the Solar System scene.
 * Prevents duplicate GPU texture uploads when the component re-mounts
 * after route navigation.
 */
import * as THREE from "three";
const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();
/**
 * Load a texture by path (relative to /public), caching the result.
 * Subsequent calls for the same path return the cached GPU texture immediately.
 */
export function getTexture(path: string): THREE.Texture {
  if (cache.has(path)) return cache.get(path)!;
  const texture = loader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(path, texture);
  return texture;
}
/**
 * Dispose all cached textures and clear the cache.
 * Call this only when the entire app is tearing down, NOT on component unmount
 * (the cache is intended to survive route transitions).
 */
export function disposeTextureCache(): void {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
