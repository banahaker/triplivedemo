import { Car, ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotCard } from "@/components/SpotCard";
import { dayColor } from "@/lib/map-utils";
import type { Spot } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TourHUDProps {
  stops: Spot[];
  index: number;
  autoPlay: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleAutoPlay: () => void;
  onExit: () => void;
  onGoto: (index: number) => void;
}

function TransitCard({ stop }: { stop: Spot }) {
  return (
    <div className="glass p-4 text-slate-100">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300">
          <Car className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-slate-400">移動中</p>
          <h3 className="text-base font-bold">{stop.name}</h3>
          {stop.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{stop.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TourHUD({
  stops,
  index,
  autoPlay,
  onPrev,
  onNext,
  onToggleAutoPlay,
  onExit,
  onGoto,
}: TourHUDProps) {
  const stop = stops[index];
  if (!stop) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-3">
        <div key={stop.id} className="duration-500 animate-in fade-in slide-in-from-bottom-2">
          {stop.type === "transit" ? <TransitCard stop={stop} /> : <SpotCard spot={stop} />}
        </div>

        <div className="glass flex items-center justify-between gap-2 px-3 py-2">
          <Button variant="ghost" size="sm" aria-label="上一站" disabled={index === 0} onClick={onPrev}
            className="text-slate-200 hover:bg-white/10 hover:text-white">
            <ChevronLeft className="size-5" />
          </Button>

          <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
            {stops.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`第 ${i + 1} 站`}
                onClick={() => onGoto(i)}
                className={cn(
                  "size-2 rounded-full transition-all",
                  i === index && "size-2.5 shadow-[0_0_8px_currentColor]"
                )}
                style={{ backgroundColor: dayColor(s.day), opacity: i === index ? 1 : 0.4 }}
              />
            ))}
          </div>

          <Button variant="ghost" size="sm" aria-label={autoPlay ? "暫停" : "自動播放"}
            onClick={onToggleAutoPlay} className="text-slate-200 hover:bg-white/10 hover:text-white">
            {autoPlay ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
          <Button variant="ghost" size="sm" aria-label="下一站" disabled={index === stops.length - 1}
            onClick={onNext} className="text-slate-200 hover:bg-white/10 hover:text-white">
            <ChevronRight className="size-5" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="結束導覽" onClick={onExit}
            className="text-slate-200 hover:bg-white/10 hover:text-white">
            <X className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
