import type { DayGroup, Spot } from "@/lib/types";

const DAY_COLORS: Record<number, string> = {
  1: "#22d3ee",
  2: "#34d399",
  3: "#a78bfa",
};

export function dayColor(day: number): string {
  return DAY_COLORS[day] ?? "#94a3b8";
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

export function allCoordinates(days: DayGroup[]): [number, number][] {
  return markerSpots(days).map((s) => [s.lng!, s.lat!]);
}

export function tourStops(days: DayGroup[]): Spot[] {
  return days.flatMap((d) => d.spots);
}

export function coordsBounds(
  coords: [number, number][]
): [[number, number], [number, number]] {
  if (coords.length === 0) throw new Error("coordsBounds: empty coordinates");
  let minLng = coords[0][0], minLat = coords[0][1];
  let maxLng = coords[0][0], maxLat = coords[0][1];
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

export function transitContext(stops: Spot[], index: number): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = index - 1; i >= 0; i--) {
    const s = stops[i];
    if (isPlottable(s)) { coords.push([s.lng, s.lat]); break; }
  }
  for (let i = index + 1; i < stops.length; i++) {
    const s = stops[i];
    if (isPlottable(s)) { coords.push([s.lng, s.lat]); break; }
  }
  return coords;
}
