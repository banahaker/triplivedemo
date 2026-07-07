import { Fragment, type CSSProperties, type RefObject } from "react";
import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  type MapRef,
} from "@/components/ui/map";
import { prefersReducedMotion } from "@/hooks/useCameraController";
import { useRouteProgress } from "@/hooks/useRouteProgress";
import type { Scene } from "@/hooks/useTripScene";
import { dayColor, markerSpots, routeCoordinates } from "@/lib/map-utils";
import { clamp01, partialPath } from "@/lib/route-animation";
import type { DayGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TripMapProps {
  days: DayGroup[];
  activeDay: number;
  selectedSpotId: string | null;
  scene: Scene;
  onSelectSpot: (spotId: string) => void;
  mapRef: RefObject<MapRef | null>;
}

// Frames the whole Keelung–Yilan trip on first paint (before any camera call).
const INITIAL_VIEW = { center: [121.72, 24.86] as [number, number], zoom: 8.6, pitch: 30 };

export function TripMap({
  days,
  activeDay,
  selectedSpotId,
  scene,
  onSelectSpot,
  mapRef,
}: TripMapProps) {
  const markers = markerSpots(days);
  const reduced = prefersReducedMotion();
  const introProgress = useRouteProgress("intro", 2600, scene === "intro" && !reduced);
  const dayProgress = useRouteProgress(activeDay, 1400, scene !== "intro" && !reduced);

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        theme="dark"
        className="h-full w-full"
        center={INITIAL_VIEW.center}
        zoom={INITIAL_VIEW.zoom}
        pitch={INITIAL_VIEW.pitch}
      >
        {days.map((d) => {
          const coords = routeCoordinates(d);
          const isActive = d.day === activeDay;
          const progress =
            scene === "intro"
              ? clamp01(introProgress * days.length - (d.day - 1))
              : isActive
                ? dayProgress
                : 1;
          const drawn = partialPath(coords, progress);
          const color = dayColor(d.day);
          const dim = scene !== "intro" && !isActive;
          return (
            <Fragment key={d.day}>
              <MapRoute
                id={`glow-${d.day}`}
                coordinates={drawn}
                color={color}
                width={10}
                opacity={dim ? 0.06 : 0.25}
                interactive={false}
              />
              <MapRoute
                id={`line-${d.day}`}
                coordinates={drawn}
                color={color}
                width={dim ? 2 : 3.5}
                opacity={dim ? 0.4 : 0.95}
                interactive={false}
              />
            </Fragment>
          );
        })}

        {markers.map((s) => {
          const selected = s.id === selectedSpotId;
          const color = dayColor(s.day);
          return (
            <MapMarker key={s.id} longitude={s.lng!} latitude={s.lat!} onClick={() => onSelectSpot(s.id)}>
              <MarkerContent>
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border border-white/70 text-[11px] font-bold text-slate-950 shadow-lg transition-transform duration-300",
                    selected && "marker-pulse scale-125"
                  )}
                  style={{ backgroundColor: color, "--pulse-color": `${color}88` } as CSSProperties}
                  aria-label={s.name}
                >
                  {s.order}
                </div>
                {selected && (
                  <MarkerLabel className="text-xs font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
                    {s.name}
                  </MarkerLabel>
                )}
              </MarkerContent>
            </MapMarker>
          );
        })}
        <MapControls position="bottom-right" />
      </Map>
    </div>
  );
}
