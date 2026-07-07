import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SpotNote } from "@/components/SpotNote";
import type { DayGroup } from "@/lib/types";

interface ItineraryPanelProps {
  days: DayGroup[];
  selectedSpotId: string | null;
  onSelect: (spotId: string) => void;
  onNoteChange: (spotId: string, note: string) => void;
  onExport: () => void;
}

export function ItineraryPanel({
  days,
  selectedSpotId,
  onSelect,
  onNoteChange,
  onExport,
}: ItineraryPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeDay, setActiveDay] = useState<number>(days[0]?.day ?? 1);

  const selectedDay = days.find((d) => d.spots.some((s) => s.id === selectedSpotId))?.day;
  useEffect(() => {
    if (selectedDay) setActiveDay(selectedDay);
  }, [selectedDay]);

  return (
    <div className="mx-auto max-w-3xl rounded-t-xl border bg-background shadow-lg">
      <div className="flex items-center justify-between px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? "展開行程" : "收合"}
        </Button>
        <span className="text-sm font-medium">基隆宜蘭三日遊</span>
        <Button variant="outline" size="sm" onClick={onExport}>
          匯出 JSON
        </Button>
      </div>

      {!collapsed && (
        <Tabs value={String(activeDay)} onValueChange={(v) => setActiveDay(Number(v))} className="px-4 pb-4">
          <TabsList>
            {days.map((d) => (
              <TabsTrigger key={d.day} value={String(d.day)}>
                Day{d.day}
              </TabsTrigger>
            ))}
          </TabsList>

          {days.map((d) => (
            <TabsContent key={d.day} value={String(d.day)}>
              <ol className="max-h-64 space-y-1 overflow-y-auto">
                {d.spots.map((s) => (
                  <li key={s.id} className="rounded-md p-1" data-selected={s.id === selectedSpotId}>
                    {s.type === "transit" ? (
                      <span className="block px-2 py-1 text-sm italic text-muted-foreground">
                        {s.name}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect(s.id)}
                        className={`block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-accent ${
                          s.id === selectedSpotId ? "bg-accent font-medium" : ""
                        }`}
                      >
                        {s.order}. {s.name}
                      </button>
                    )}
                    {s.id === selectedSpotId && s.type === "spot" && (
                      <div className="px-2 pb-2">
                        <SpotNote spotId={s.id} value={s.note} onChange={onNoteChange} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
