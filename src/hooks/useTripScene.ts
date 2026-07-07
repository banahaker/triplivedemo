import { useCallback, useEffect, useState } from "react";
import type { Spot } from "@/lib/types";

export type Scene = "intro" | "explore" | "tour";

const SPOT_DWELL_MS = 5000;
const TRANSIT_DWELL_MS = 3000;

export function useTripScene(stops: Spot[]) {
  const [scene, setScene] = useState<Scene>("intro");
  const [tourIndex, setTourIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const lastIndex = stops.length - 1;
  const currentStop = scene === "tour" ? stops[tourIndex] : undefined;

  const startExplore = useCallback(() => {
    setScene("explore");
    setAutoPlay(false);
  }, []);

  const startTour = useCallback(() => {
    setScene("tour");
    setTourIndex(0);
    setAutoPlay(true);
  }, []);

  const exitTour = useCallback(() => {
    setScene("explore");
    setAutoPlay(false);
  }, []);

  const replayIntro = useCallback(() => {
    setScene("intro");
    setAutoPlay(false);
  }, []);

  const next = useCallback(
    () => setTourIndex((i) => Math.min(i + 1, lastIndex)),
    [lastIndex]
  );
  const prev = useCallback(() => setTourIndex((i) => Math.max(i - 1, 0)), []);
  const gotoStop = useCallback(
    (i: number) => setTourIndex(Math.min(Math.max(i, 0), lastIndex)),
    [lastIndex]
  );
  const toggleAutoPlay = useCallback(() => setAutoPlay((a) => !a), []);

  useEffect(() => {
    if (scene !== "tour" || !autoPlay) return;
    if (tourIndex >= lastIndex) {
      setAutoPlay(false);
      return;
    }
    const dwell = stops[tourIndex]?.type === "transit" ? TRANSIT_DWELL_MS : SPOT_DWELL_MS;
    const timer = setTimeout(
      () => setTourIndex((i) => Math.min(i + 1, lastIndex)),
      dwell
    );
    return () => clearTimeout(timer);
  }, [scene, autoPlay, tourIndex, lastIndex, stops]);

  return {
    scene,
    tourIndex,
    currentStop,
    autoPlay,
    startExplore,
    startTour,
    exitTour,
    replayIntro,
    next,
    prev,
    gotoStop,
    toggleAutoPlay,
  };
}
