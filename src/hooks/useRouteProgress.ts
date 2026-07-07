import { useEffect, useState } from "react";
import { easeInOutCubic } from "@/lib/route-animation";

/**
 * Animates 0→1 over durationMs using requestAnimationFrame.
 * Restarts whenever `key` changes. When `enabled` is false the
 * progress is pinned at 1 (reduced-motion fallback).
 */
export function useRouteProgress(key: unknown, durationMs: number, enabled = true): number {
  const [progress, setProgress] = useState(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) {
      setProgress(1);
      return;
    }
    setProgress(0);
    let raf = 0;
    const start = performance.now();
    const tick = (nowMs: number) => {
      const t = Math.min(1, (nowMs - start) / durationMs);
      setProgress(easeInOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, durationMs, enabled]);

  return progress;
}
