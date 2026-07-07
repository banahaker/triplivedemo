import { Compass, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IntroOverlayProps {
  title: string;
  dayCount: number;
  spotCount: number;
  onExplore: () => void;
  onTour: () => void;
}

export function IntroOverlay({ title, dayCount, spotCount, onExplore, onTour }: IntroOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-slate-950/80 via-slate-950/30 to-slate-950/80 p-6">
      <div className="max-w-md text-center text-slate-100 duration-700 animate-in fade-in slide-in-from-bottom-4">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
          Keelung — Yilan
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-wide sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm text-slate-300">
          {dayCount} 天 · {spotCount} 個地點 · 山海之間的小旅行
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={onTour}
            className="bg-cyan-400 font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.45)] hover:bg-cyan-300"
          >
            <Play className="size-4" /> 播放導覽
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onExplore}
            className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
          >
            <Compass className="size-4" /> 自由探索
          </Button>
        </div>
      </div>
    </div>
  );
}
