import { useEffect, useRef, useState } from "react";
import { Download, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotCard } from "@/components/SpotCard";
import { categoryIcon } from "@/lib/category";
import { dayColor } from "@/lib/map-utils";
import type { DayGroup, Spot } from "@/lib/types";
import { cn } from "@/lib/utils";

type SnapState = "peek" | "half" | "full";
const SNAP_ORDER: SnapState[] = ["peek", "half", "full"];
const SWIPE_THRESHOLD_PX = 40;

function nextSnap(current: SnapState, direction: 1 | -1): SnapState {
  const i = SNAP_ORDER.indexOf(current) + direction;
  return SNAP_ORDER[Math.min(SNAP_ORDER.length - 1, Math.max(0, i))];
}

interface ItinerarySheetProps {
  title: string;
  days: DayGroup[];
  activeDay: number;
  onDayChange: (day: number) => void;
  selectedSpotId: string | null;
  onSelect: (spotId: string) => void;
  onNoteChange: (spotId: string, note: string) => void;
  onExport: () => void;
  onStartTour: () => void;
  onReplayIntro: () => void;
}

function TimelineItem({
  spot,
  selected,
  onSelect,
  onNoteChange,
}: {
  spot: Spot;
  selected: boolean;
  onSelect: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const color = dayColor(spot.day);
  const Icon = categoryIcon(spot.category);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  if (spot.type === "transit") {
    return (
      <li ref={ref} className="relative py-1 pl-7">
        <span className="absolute bottom-0 left-[5px] top-0 w-px bg-white/10" aria-hidden />
        <span className="block px-2 py-1 text-sm italic text-slate-400">{spot.name}</span>
      </li>
    );
  }

  return (
    <li ref={ref} className="relative pl-7">
      <span className="absolute bottom-0 left-[5px] top-0 w-px bg-white/10" aria-hidden />
      <span
        className="absolute left-0 top-3.5 size-[11px] rounded-full border-2 border-slate-950"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => onSelect(spot.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-white/5",
          selected && "bg-white/10 font-medium text-white"
        )}
      >
        {spot.time && (
          <span className="w-11 shrink-0 font-mono text-xs text-slate-400">{spot.time}</span>
        )}
        <Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden />
        <span className="truncate">{spot.name}</span>
      </button>
      {selected && (
        <div className="pb-2 pr-2 pt-1 duration-300 animate-in fade-in slide-in-from-top-1">
          <SpotCard spot={spot} onNoteChange={onNoteChange} className="border-white/5 bg-slate-950/60 shadow-none" />
        </div>
      )}
    </li>
  );
}

export function ItinerarySheet({
  title,
  days,
  activeDay,
  onDayChange,
  selectedSpotId,
  onSelect,
  onNoteChange,
  onExport,
  onStartTour,
  onReplayIntro,
}: ItinerarySheetProps) {
  const [snap, setSnap] = useState<SnapState>("half");
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (selectedSpotId) setSnap((s) => (s === "peek" ? "half" : s));
  }, [selectedSpotId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* jsdom */
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = dragStartY.current - e.clientY; // >0 means swiped up
    dragStartY.current = null;
    if (delta > SWIPE_THRESHOLD_PX) setSnap((s) => nextSnap(s, 1));
    else if (delta < -SWIPE_THRESHOLD_PX) setSnap((s) => nextSnap(s, -1));
    else setSnap((s) => (s === "peek" ? "half" : "peek"));
  };

  return (
    <section
      aria-label="行程列表"
      className={cn(
        "glass fixed inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-b-none border-b-0 transition-[height] duration-300 ease-out",
        snap === "peek" && "h-20",
        snap === "half" && "h-[45dvh]",
        snap === "full" && "h-[85dvh]",
        "lg:inset-auto lg:bottom-4 lg:left-4 lg:top-4 lg:h-auto lg:w-96 lg:rounded-2xl lg:border-b"
      )}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none justify-center py-2 lg:hidden"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        role="presentation"
      >
        <span className="h-1 w-10 rounded-full bg-white/20" />
      </div>

      <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 lg:pt-4">
        <h2 className="truncate text-sm font-bold text-slate-100">{title}</h2>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onStartTour}
            className="text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200">
            <Play className="size-4" /> 播放導覽
          </Button>
          <Button variant="ghost" size="sm" aria-label="匯出 JSON" onClick={onExport}
            className="text-slate-300 hover:bg-white/10 hover:text-white">
            <Download className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="重看開場" onClick={onReplayIntro}
            className="text-slate-300 hover:bg-white/10 hover:text-white">
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </header>

      <Tabs
        value={String(activeDay)}
        onValueChange={(v) => onDayChange(Number(v))}
        className="flex min-h-0 flex-1 flex-col px-4 pb-4"
      >
        <TabsList className="shrink-0 bg-white/5">
          {days.map((d) => (
            <TabsTrigger
              key={d.day}
              value={String(d.day)}
              style={activeDay === d.day ? { backgroundColor: `${dayColor(d.day)}26`, color: dayColor(d.day) } : undefined}
            >
              Day {d.day}
            </TabsTrigger>
          ))}
        </TabsList>

        {days.map((d) => (
          <TabsContent key={d.day} value={String(d.day)} className="min-h-0 flex-1 overflow-y-auto">
            <ol className="space-y-0.5 py-2">
              {d.spots.map((s) => (
                <TimelineItem
                  key={s.id}
                  spot={s}
                  selected={s.id === selectedSpotId}
                  onSelect={onSelect}
                  onNoteChange={onNoteChange}
                />
              ))}
            </ol>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
