import { SpotNote } from "@/components/SpotNote";
import { categoryIcon } from "@/lib/category";
import { dayColor } from "@/lib/map-utils";
import type { Spot } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SpotCardProps {
  spot: Spot;
  onNoteChange?: (spotId: string, note: string) => void;
  className?: string;
}

export function SpotCard({ spot, onNoteChange, className }: SpotCardProps) {
  const Icon = categoryIcon(spot.category);
  const color = dayColor(spot.day);

  return (
    <div className={cn("glass p-4 text-slate-100", className)}>
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 text-xs text-slate-400">
            {spot.time && <span className="font-mono tracking-wide">{spot.time}</span>}
            {spot.duration && <span>· {spot.duration}</span>}
          </div>
          <h3 className="truncate text-base font-bold">{spot.name}</h3>
          {spot.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{spot.description}</p>
          )}
        </div>
      </div>
      {onNoteChange && spot.type === "spot" && (
        <SpotNote spotId={spot.id} value={spot.note} onChange={onNoteChange} />
      )}
    </div>
  );
}
