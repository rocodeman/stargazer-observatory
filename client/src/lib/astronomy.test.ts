import { describe, expect, it } from "vitest";
import {
  dateToJulian,
  localSiderealHours,
  normalize,
  project,
  starColor,
  toVector,
  vectorToRaDec,
  getSolarObjects,
  SOLAR_OBJECT_DEFS,
} from "./astronomy";

describe("astronomy calculations", () => {
  describe("dateToJulian", () => {
    it("should correctly compute Julian date for J2000.0 epoch", () => {
      // 2000-01-01T12:00:00Z corresponds to Julian Date 2451545.0
      const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
      const jd = dateToJulian(j2000);
      expect(jd).toBeCloseTo(2451545.0, 4);
    });

    it("should increase by 1.0 per day", () => {
      const d1 = new Date(Date.UTC(2026, 7, 20, 0, 0, 0));
      const d2 = new Date(Date.UTC(2026, 7, 21, 0, 0, 0));
      expect(dateToJulian(d2) - dateToJulian(d1)).toBeCloseTo(1.0, 5);
    });
  });

  describe("localSiderealHours", () => {
    it("should return a value in the range [0, 24)", () => {
      const date = new Date(Date.UTC(2026, 7, 20, 12, 0, 0));
      const lst = localSiderealHours(date, 121.47);
      expect(lst).toBeGreaterThanOrEqual(0);
      expect(lst).toBeLessThan(24);
    });
  });

  describe("toVector & vectorToRaDec", () => {
    it("should convert north pole (Dec = 90) to vector (0, 1, 0)", () => {
      const vec = toVector(0, 90);
      expect(vec.x).toBeCloseTo(0, 5);
      expect(vec.y).toBeCloseTo(1, 5);
      expect(vec.z).toBeCloseTo(0, 5);
    });

    it("should round-trip conversion between RA/Dec and 3D vector", () => {
      const originalRa = 5.59; // Orion / Betelgeuse approx RA
      const originalDec = 7.4;
      const vec = toVector(originalRa, originalDec);
      const radec = vectorToRaDec(vec);

      expect(radec.ra).toBeCloseTo(originalRa, 3);
      expect(radec.dec).toBeCloseTo(originalDec, 3);
    });
  });

  describe("normalize", () => {
    it("should produce a unit vector of length 1", () => {
      const vec = normalize({ x: 3, y: 4, z: 0 });
      expect(Math.hypot(vec.x, vec.y, vec.z)).toBeCloseTo(1.0, 5);
      expect(vec.x).toBeCloseTo(0.6, 5);
      expect(vec.y).toBeCloseTo(0.8, 5);
    });
  });

  describe("starColor", () => {
    it("should return cool blue for low color index", () => {
      expect(starColor(0.1)).toBe("#b9d9f0");
    });

    it("should return warm orange for high color index", () => {
      expect(starColor(1.2)).toBe("#f0b56f");
    });

    it("should return neutral white/yellow for intermediate color index", () => {
      expect(starColor(0.5)).toBe("#f0f1df");
      expect(starColor(0.85)).toBe("#efca88");
    });
  });

  describe("project", () => {
    it("should place center vector in screen center when camera boresight matches", () => {
      // Boresight camera at yaw=0, pitch=0 points towards +Z axis (RA = 6h, Dec = 0)
      const vec = toVector(6, 0); // (0, 0, 1)
      const projected = project(vec, 0, 0, 800, 600, 1);
      expect(projected.visible).toBe(true);
      expect(projected.sx).toBeCloseTo(400, 1);
      expect(projected.sy).toBeCloseTo(300, 1);
    });

    it("should mark opposite hemisphere as not visible", () => {
      // Opposite side of boresight is -Z axis (RA = 18h, Dec = 0)
      const vec = toVector(18, 0);
      const projected = project(vec, 0, 0, 800, 600, 1);
      expect(projected.visible).toBe(false);
    });
  });

  describe("getSolarObjects", () => {
    it("should return all solar objects with computed vectors and positions", () => {
      const objects = getSolarObjects(new Date(2026, 7, 20));
      expect(objects.length).toBe(SOLAR_OBJECT_DEFS.length);

      for (const obj of objects) {
        expect(obj.ra).toBeGreaterThanOrEqual(0);
        expect(obj.ra).toBeLessThan(24);
        expect(obj.vector).toBeDefined();
        expect(Math.hypot(obj.vector.x, obj.vector.y, obj.vector.z)).toBeCloseTo(1.0, 4);
      }
    });
  });
});
