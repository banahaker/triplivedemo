import { describe, expect, it } from "vitest";
import { allCoordinates, coordsBounds, dayColor, markerSpots, routeCoordinates, tourStops, transitContext } from "@/lib/map-utils";
import type { DayGroup, Spot } from "@/lib/types";

const group: DayGroup = {
  day: 1,
  spots: [
    { id: "a", day: 1, order: 1, name: "A", type: "spot", lat: 25.1, lng: 121.7, note: "" },
    { id: "t", day: 1, order: 2, name: "T", type: "transit", note: "" },
    { id: "b", day: 1, order: 3, name: "B", type: "spot", lat: 25.2, lng: 121.8, note: "" },
  ],
};

const mk = (over: Partial<Spot>): Spot => ({
  id: "x", day: 1, order: 1, name: "X", type: "spot", lat: 25, lng: 121, note: "", ...over,
});

const twoDays: DayGroup[] = [
  { day: 1, spots: [mk({ id: "a", order: 1, lat: 25, lng: 121 }), mk({ id: "t", order: 2, type: "transit", lat: undefined, lng: undefined })] },
  { day: 2, spots: [mk({ id: "b", day: 2, order: 1, lat: 24, lng: 122 })] },
];

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

describe("neon day colors", () => {
  it("maps days to the neon palette", () => {
    expect(dayColor(1)).toBe("#22d3ee");
    expect(dayColor(2)).toBe("#34d399");
    expect(dayColor(3)).toBe("#a78bfa");
    expect(dayColor(9)).toBe("#94a3b8");
  });
});

describe("allCoordinates", () => {
  it("returns coords of plottable spots only, in day/order sequence", () => {
    expect(allCoordinates(twoDays)).toEqual([[121, 25], [122, 24]]);
  });
});

describe("tourStops", () => {
  it("flattens all stops including transit, in order", () => {
    expect(tourStops(twoDays).map((s) => s.id)).toEqual(["a", "t", "b"]);
  });
});

describe("coordsBounds", () => {
  it("computes [[minLng,minLat],[maxLng,maxLat]]", () => {
    expect(coordsBounds([[121, 25], [122, 24]])).toEqual([[121, 24], [122, 25]]);
  });
  it("throws on empty input", () => {
    expect(() => coordsBounds([])).toThrow();
  });
});

describe("transitContext", () => {
  it("returns coords of nearest plottable neighbours around a transit stop", () => {
    const stops = tourStops(twoDays);
    expect(transitContext(stops, 1)).toEqual([[121, 25], [122, 24]]);
  });
  it("skips missing sides at the edges", () => {
    const stops = tourStops(twoDays);
    expect(transitContext(stops, 0)).toEqual([[122, 24]]);
  });
});
