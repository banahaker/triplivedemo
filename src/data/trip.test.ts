import { describe, expect, it } from "vitest";
import trip from "@/data/trip.json";
import type { TripData } from "@/lib/types";

const data = trip as TripData;

describe("trip.json", () => {
  it("has a title and 20 spots", () => {
    expect(data.title).toBeTruthy();
    expect(data.spots).toHaveLength(20);
  });

  it("has unique ids", () => {
    const ids = data.spots.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers days 1, 2, 3", () => {
    expect(new Set(data.spots.map((s) => s.day))).toEqual(new Set([1, 2, 3]));
  });

  it("gives every spot-type entry coordinates and every transit entry none", () => {
    for (const s of data.spots) {
      if (s.type === "spot") {
        expect(typeof s.lat).toBe("number");
        expect(typeof s.lng).toBe("number");
      } else {
        expect(s.lat).toBeUndefined();
        expect(s.lng).toBeUndefined();
      }
    }
  });
});
