/**
 * Astronomy Math & Coordinate Transformation Utilities
 * For Stargazer Observatory (HYG v4.1 / J2000 Epoch)
 */

export type Vec3 = { x: number; y: number; z: number };
export type Projected = Vec3 & { sx: number; sy: number; visible: boolean };

export interface SolarObjectDef {
  id: string;
  name: string;
  latin: string;
  color: string;
  size: number;
  baseRa: number;
  baseDec: number;
}

export interface SolarObjectInstance extends SolarObjectDef {
  ra: number;
  dec: number;
  vector: Vec3;
}

export const SOLAR_OBJECT_DEFS: SolarObjectDef[] = [
  { id: "sun", name: "太阳", latin: "SUN", color: "#ffd875", size: 5.5, baseRa: 0, baseDec: 0 },
  { id: "virtual-sun-a", name: "曜灵", latin: "YAO-LING", color: "#ffd875", size: 5.5, baseRa: 10.8, baseDec: -8 },
  { id: "virtual-sun-b", name: "烬环", latin: "JIN-HUAN", color: "#ffd875", size: 5.5, baseRa: 15.2, baseDec: 12 },
  { id: "virtual-sun-c", name: "星烛", latin: "XING-ZHU", color: "#ffd875", size: 5.5, baseRa: 20.4, baseDec: 4 },
  { id: "moon", name: "月球", latin: "MOON", color: "#d7e8e4", size: 4.2, baseRa: 3.2, baseDec: 8 },
  { id: "mercury", name: "水星", latin: "MERCURY", color: "#d1aa83", size: 2.8, baseRa: 4.7, baseDec: 18 },
  { id: "venus", name: "金星", latin: "VENUS", color: "#ffe3a0", size: 3.8, baseRa: 5.1, baseDec: 21 },
  { id: "mars", name: "火星", latin: "MARS", color: "#e77d61", size: 3.3, baseRa: 8.8, baseDec: 23 },
  { id: "jupiter", name: "木星", latin: "JUPITER", color: "#e9c99b", size: 4.5, baseRa: 4.4, baseDec: 20 },
  { id: "saturn", name: "土星", latin: "SATURN", color: "#d9c28b", size: 4, baseRa: 22.1, baseDec: -12 },
];

/**
 * Converts celestial Right Ascension (hours: 0..24) and Declination (degrees: -90..90)
 * into a normalized 3D Cartesian vector.
 */
export function toVector(ra: number, dec: number): Vec3 {
  const r = (ra / 24) * Math.PI * 2;
  const d = (dec * Math.PI) / 180;
  return {
    x: Math.cos(d) * Math.cos(r),
    y: Math.sin(d),
    z: Math.cos(d) * Math.sin(r),
  };
}

/**
 * Projects a 3D unit vector onto a 2D screen viewport given camera yaw, pitch, dimensions, and zoom.
 */
export function project(
  vector: Vec3,
  yaw: number,
  pitch: number,
  width: number,
  height: number,
  zoom: number
): Projected {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x1 = vector.x * cy - vector.z * sy;
  const z1 = vector.x * sy + vector.z * cy;
  const y1 = vector.y * cp - z1 * sp;
  const z2 = vector.y * sp + z1 * cp;

  const az = Math.atan2(x1, z2);
  const alt = Math.asin(Math.max(-1, Math.min(1, y1)));
  const fovX = Math.min(Math.PI * 1.65, (Math.PI * 1.65) / zoom);
  const fovY = Math.min(Math.PI * 0.95, (Math.PI * 0.95) / zoom);
  const visible = Math.abs(az) < fovX / 2 && Math.abs(alt) < fovY / 2;

  return {
    x: x1,
    y: y1,
    z: z2,
    sx: width / 2 + (az / fovX) * width,
    sy: height / 2 - (alt / fovY) * height,
    visible,
  };
}

/**
 * Returns star color hex by color index (B-V).
 */
export function starColor(ci: number): string {
  if (ci < 0.25) return "#b9d9f0";
  if (ci > 1.05) return "#f0b56f";
  if (ci > 0.75) return "#efca88";
  return "#f0f1df";
}

/**
 * Normalizes a 3D vector to unit length.
 */
export function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

/**
 * Converts a 3D vector back to Right Ascension (hours) and Declination (degrees).
 */
export function vectorToRaDec(vector: Vec3): { ra: number; dec: number } {
  const unit = normalize(vector);
  return {
    ra: ((Math.atan2(unit.z, unit.x) * 12) / Math.PI + 24) % 24,
    dec: (Math.asin(unit.y) * 180) / Math.PI,
  };
}

/**
 * Converts a JS Date into Julian Date number.
 */
export function dateToJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Computes Local Sidereal Time in hours (0..24) for a given Date and longitude.
 */
export function localSiderealHours(date: Date, longitude: number): number {
  const jd = dateToJulian(date);
  const t = (jd - 2451545.0) / 36525;
  const gmst =
    (280.46061837 +
      360.98564736629 * (jd - 2451545.0) +
      0.000387933 * t * t) %
    360;
  return ((gmst + longitude) / 15 + 24) % 24;
}

/**
 * Computes positions and vectors for solar system objects on a given date.
 */
export function getSolarObjects(date: Date): SolarObjectInstance[] {
  const days = dateToJulian(date) - 2451545;
  return SOLAR_OBJECT_DEFS.map((object, index) => {
    const drift =
      (days / (index === 0 ? 365.25 : 87.97 + index * 140)) * 24;
    const ra = (object.baseRa + drift) % 24;
    const dec =
      object.baseDec +
      Math.sin(days / (35 + index * 17)) * (index === 0 ? 23 : 8);
    const normalizedRa = (ra + 24) % 24;
    return {
      ...object,
      ra: normalizedRa,
      dec,
      vector: toVector(normalizedRa, dec),
    };
  });
}
