import { useCallback, useMemo, type RefObject } from "react";
import type { MapRef } from "@/components/ui/map";
import { coordsBounds } from "@/lib/map-utils";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  );
}

export interface FlyOptions {
  zoom?: number;
  pitch?: number;
  bearing?: number;
}

export interface FitOptions {
  padding?: { top: number; bottom: number; left: number; right: number };
  pitch?: number;
}

const DEFAULT_FIT_PADDING = { top: 80, bottom: 320, left: 48, right: 48 };

export function useCameraController(mapRef: RefObject<MapRef | null>) {
  const flyToSpot = useCallback(
    (lng: number, lat: number, opts: FlyOptions = {}) => {
      const map = mapRef.current;
      if (!map) return;
      const target = {
        center: [lng, lat] as [number, number],
        zoom: opts.zoom ?? 14,
        pitch: opts.pitch ?? 45,
        bearing: opts.bearing ?? 0,
      };
      if (prefersReducedMotion()) map.jumpTo(target);
      else map.flyTo({ ...target, duration: 2200, essential: true });
    },
    [mapRef]
  );

  const fitCoords = useCallback(
    (coords: [number, number][], opts: FitOptions = {}) => {
      const map = mapRef.current;
      if (!map || coords.length === 0) return;
      map.fitBounds(coordsBounds(coords), {
        padding: opts.padding ?? DEFAULT_FIT_PADDING,
        pitch: opts.pitch ?? 30,
        duration: prefersReducedMotion() ? 0 : 1800,
      });
    },
    [mapRef]
  );

  return useMemo(() => ({ flyToSpot, fitCoords }), [flyToSpot, fitCoords]);
}
