import { describe, expect, it } from "vitest";
import { clamp01, easeInOutCubic, partialPath, pathLength } from "@/lib/route-animation";

const line: [number, number][] = [[0, 0], [1, 0], [1, 1]];

describe("pathLength", () => {
  it("sums segment lengths", () => {
    expect(pathLength(line)).toBeCloseTo(2);
    expect(pathLength([[3, 4]])).toBe(0);
  });
});

describe("partialPath", () => {
  it("returns full path at t=1 and clamps above", () => {
    expect(partialPath(line, 1)).toEqual(line);
    expect(partialPath(line, 1.5)).toEqual(line);
  });
  it("returns only the start point at t=0", () => {
    expect(partialPath(line, 0)).toEqual([[0, 0]]);
  });
  it("interpolates the final point mid-segment", () => {
    expect(partialPath(line, 0.25)).toEqual([[0, 0], [0.5, 0]]);
    expect(partialPath(line, 0.75)).toEqual([[0, 0], [1, 0], [1, 0.5]]);
  });
  it("passes through single-point and empty inputs", () => {
    expect(partialPath([], 0.5)).toEqual([]);
    expect(partialPath([[2, 2]], 0.5)).toEqual([[2, 2]]);
  });
});

describe("clamp01 / easeInOutCubic", () => {
  it("clamps to [0,1]", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.4)).toBe(0.4);
  });
  it("eases monotonically from 0 to 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
  });
});
