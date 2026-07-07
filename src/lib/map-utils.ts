import type { DayGroup, Spot } from "@/lib/types";

const DAY_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#3b82f6",
  3: "#22c55e",
};

export function dayColor(day: number): string {
  return DAY_COLORS[day] ?? "#6b7280";
}

function isPlottable(s: Spot): s is Spot & { lat: number; lng: number } {
  return s.type === "spot" && typeof s.lat === "number" && typeof s.lng === "number";
}

export function markerSpots(days: DayGroup[]): Spot[] {
  return days.flatMap((d) => d.spots).filter(isPlottable);
}

export function routeCoordinates(group: DayGroup): [number, number][] {
  return group.spots.filter(isPlottable).map((s) => [s.lng, s.lat]);
}
