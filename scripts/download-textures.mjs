#!/usr/bin/env node
/**
 * Texture downloader for Stargazer Observatory Solar System
 * Sources: Solar System Scope (CC-BY 4.0) + NASA public domain
 * Run: node scripts/download-textures.mjs
 */
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../client/public/textures");

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Created directory: ${OUT_DIR}`);
}

// Solar System Scope 2K textures (CC-BY 4.0)
// https://www.solarsystemscope.com/textures/
const BASE = "https://www.solarsystemscope.com/textures/download";

const TEXTURES = [
  { file: "sun_surface.jpg",        url: `${BASE}/2k_sun.jpg` },
  { file: "mercury_surface.jpg",    url: `${BASE}/2k_mercury.jpg` },
  { file: "venus_atmosphere.jpg",   url: `${BASE}/2k_venus_atmosphere.jpg` },
  { file: "earth_daymap.jpg",       url: `${BASE}/2k_earth_daymap.jpg` },
  { file: "earth_clouds.jpg",       url: `${BASE}/2k_earth_clouds.jpg` },
  { file: "earth_normalmap.jpg",    url: `${BASE}/2k_earth_normal_map.tif`,  skip: true }, // TIF not supported easily
  { file: "earth_specularmap.jpg",  url: `${BASE}/2k_earth_specular_map.tif`, skip: true },
  { file: "mars_surface.jpg",       url: `${BASE}/2k_mars.jpg` },
  { file: "jupiter_surface.jpg",    url: `${BASE}/2k_jupiter.jpg` },
  { file: "saturn_surface.jpg",     url: `${BASE}/2k_saturn.jpg` },
  { file: "saturn_ring.png",        url: `${BASE}/2k_saturn_ring_alpha.png` },
  { file: "uranus_surface.jpg",     url: `${BASE}/2k_uranus.jpg` },
  { file: "neptune_surface.jpg",    url: `${BASE}/2k_neptune.jpg` },
  { file: "moon_surface.jpg",       url: `${BASE}/2k_moon.jpg` },
];

let ok = 0;
let fail = 0;

for (const { file, url, skip } of TEXTURES) {
  const dest = path.join(OUT_DIR, file);
  if (existsSync(dest)) {
    console.log(`  [skip] ${file} already exists`);
    ok++;
    continue;
  }
  if (skip) {
    console.log(`  [skip] ${file} - TIF format, skipping`);
    ok++;
    continue;
  }
  try {
    process.stdout.write(`  [dl]   ${file} ... `);
    const resp = await fetch(url, {
      headers: { "User-Agent": "StargazerObservatory/1.0 (educational, non-commercial)" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const ws = createWriteStream(dest);
    await pipeline(resp.body, ws);
    console.log("✓");
    ok++;
  } catch (err) {
    console.log(`✗ (${err.message})`);
    fail++;
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
