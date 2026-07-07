import { useEffect, useMemo, useRef, useState } from "react";
import { IntroOverlay } from "@/components/IntroOverlay";
import { ItinerarySheet } from "@/components/ItinerarySheet";
import { TourHUD } from "@/components/TourHUD";
import { TripMap } from "@/components/TripMap";
import type { MapRef } from "@/components/ui/map";
import { useCameraController } from "@/hooks/useCameraController";
import { useTripData } from "@/hooks/useTripData";
import { useTripScene } from "@/hooks/useTripScene";
import { routeCoordinates, tourStops, transitContext } from "@/lib/map-utils";

export default function App() {
  const { title, days, spots, updateNote, exportJson } = useTripData();
  const stops = useMemo(() => tourStops(days), [days]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number>(days[0]?.day ?? 1);
  const mapRef = useRef<MapRef | null>(null);
  const camera = useCameraController(mapRef);
  const {
    scene, tourIndex, currentStop, autoPlay,
    startExplore, startTour, exitTour, next, prev, gotoStop, toggleAutoPlay,
  } = useTripScene(stops);

  const spotCount = useMemo(() => spots.filter((s) => s.type === "spot").length, [spots]);

  // Tour: camera follows the current stop; keep activeDay in sync for route dimming.
  useEffect(() => {
    if (scene !== "tour" || !currentStop) return;
    setActiveDay(currentStop.day);
    setSelectedSpotId(currentStop.id);
    if (typeof currentStop.lng === "number" && typeof currentStop.lat === "number") {
      camera.flyToSpot(currentStop.lng, currentStop.lat, { bearing: tourIndex % 2 ? 18 : -18 });
    } else {
      camera.fitCoords(transitContext(stops, tourIndex));
    }
  }, [scene, currentStop, tourIndex, stops, camera]);

  const handleSelectSpot = (spotId: string) => {
    if (scene === "tour") {
      gotoStop(stops.findIndex((s) => s.id === spotId));
      return;
    }
    setSelectedSpotId(spotId);
    const spot = stops.find((s) => s.id === spotId);
    if (!spot) return;
    setActiveDay(spot.day);
    if (typeof spot.lng === "number" && typeof spot.lat === "number") {
      camera.flyToSpot(spot.lng, spot.lat, { pitch: 35 });
    }
  };

  const handleDayChange = (day: number) => {
    setActiveDay(day);
    const group = days.find((d) => d.day === day);
    if (group) camera.fitCoords(routeCoordinates(group));
  };

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trip.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-slate-950">
      <TripMap
        days={days}
        activeDay={activeDay}
        selectedSpotId={selectedSpotId}
        scene={scene}
        onSelectSpot={handleSelectSpot}
        mapRef={mapRef}
      />
      {scene === "intro" && (
        <IntroOverlay
          title={title}
          dayCount={days.length}
          spotCount={spotCount}
          onExplore={startExplore}
          onTour={startTour}
        />
      )}
      {scene === "explore" && (
        <ItinerarySheet
          title={title}
          days={days}
          activeDay={activeDay}
          onDayChange={handleDayChange}
          selectedSpotId={selectedSpotId}
          onSelect={handleSelectSpot}
          onNoteChange={updateNote}
          onExport={handleExport}
          onStartTour={startTour}
        />
      )}
      {scene === "tour" && (
        <TourHUD
          stops={stops}
          index={tourIndex}
          autoPlay={autoPlay}
          onPrev={prev}
          onNext={next}
          onToggleAutoPlay={toggleAutoPlay}
          onExit={exitTour}
          onGoto={gotoStop}
        />
      )}
    </div>
  );
}
