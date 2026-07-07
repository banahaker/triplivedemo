import { describe, expect, it } from "vitest";
import { dayColor, markerSpots, routeCoordinates } from "@/lib/map-utils";
import type { DayGroup } from "@/lib/types";

const group: DayGroup = {
  day: 1,
  spots: [
    { id: "a", day: 1, order: 1, name: "A", type: "spot", lat: 25.1, lng: 121.7, note: "" },
    { id: "t", day: 1, order: 2, name: "T", type: "transit", note: "" },
    { id: "b", day: 1, order: 3, name: "B", type: "spot", lat: 25.2, lng: 121.8, note: "" },
  ],
};

describe("map-utils", () => {
  it("dayColor is stable per day and falls back", () => {
    expect(dayColor(1)).toBe(dayColor(1));
    expect(dayColor(1)).not.toBe(dayColor(2));
    expect(dayColor(99)).toBeTruthy();
  });

  it("markerSpots keeps only plottable spot entries", () => {
    expect(markerSpots([group]).map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("routeCoordinates returns [lng, lat] pairs in order, skipping transit", () => {
    expect(routeCoordinates(group)).toEqual([
      [121.7, 25.1],
      [121.8, 25.2],
    ]);
  });
});
