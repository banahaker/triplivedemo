import { useEffect, useState } from "react";
import { Map, MapMarker, MarkerContent, MapRoute, MapControls } from "@/components/ui/map";
import type { DayGroup } from "@/lib/types";
import { dayColor, markerSpots, routeCoordinates } from "@/lib/map-utils";

interface TripMapProps {
  days: DayGroup[];
  selectedSpotId: string | null;
  onSelectSpot: (spotId: string) => void;
}

const INITIAL = { center: [121.75, 24.95] as [number, number], zoom: 9, bearing: 0, pitch: 0 };

export function TripMap({ days, selectedSpotId, onSelectSpot }: TripMapProps) {
  const [viewport, setViewport] = useState(INITIAL);
  const markers = markerSpots(days);

  useEffect(() => {
    const spot = markers.find((s) => s.id === selectedSpotId);
    if (spot && typeof spot.lng === "number" && typeof spot.lat === "number") {
      setViewport((v) => ({ ...v, center: [spot.lng!, spot.lat!], zoom: Math.max(v.zoom, 12) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpotId]);

  return (
    <div className="absolute inset-0">
      <Map viewport={viewport} onViewportChange={setViewport} className="h-full w-full">
        {days.map((d) => (
          <MapRoute
            key={`route-${d.day}`}
            coordinates={routeCoordinates(d)}
            color={dayColor(d.day)}
            width={4}
            opacity={0.85}
          />
        ))}
        {markers.map((s) => (
          <MapMarker key={s.id} longitude={s.lng!} latitude={s.lat!} onClick={() => onSelectSpot(s.id)}>
            <MarkerContent>
              <div
                className="h-4 w-4 rounded-full border-2 border-white shadow"
                style={{
                  backgroundColor: dayColor(s.day),
                  transform: s.id === selectedSpotId ? "scale(1.6)" : "scale(1)",
                }}
                aria-label={s.name}
              />
            </MarkerContent>
          </MapMarker>
        ))}
        <MapControls />
      </Map>
    </div>
  );
}
