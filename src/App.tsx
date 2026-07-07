import { useState } from "react";
import { TripMap } from "@/components/TripMap";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { useTripData } from "@/hooks/useTripData";

export default function App() {
  const { days, updateNote, exportJson } = useTripData();
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

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
    <div className="relative h-screen w-screen overflow-hidden">
      <TripMap days={days} selectedSpotId={selectedSpotId} onSelectSpot={setSelectedSpotId} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="pointer-events-auto">
          <ItineraryPanel
            days={days}
            selectedSpotId={selectedSpotId}
            onSelect={setSelectedSpotId}
            onNoteChange={updateNote}
            onExport={handleExport}
          />
        </div>
      </div>
    </div>
  );
}
