import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTripScene } from "@/hooks/useTripScene";
import type { Spot } from "@/lib/types";

const mk = (id: string, type: Spot["type"] = "spot"): Spot => ({
  id, day: 1, order: 1, name: id, type, note: "",
  ...(type === "spot" ? { lat: 25, lng: 121 } : {}),
});

const stops = [mk("a"), mk("t", "transit"), mk("b")];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useTripScene", () => {
  it("starts at intro and can enter explore", () => {
    const { result } = renderHook(() => useTripScene(stops));
    expect(result.current.scene).toBe("intro");
    act(() => result.current.startExplore());
    expect(result.current.scene).toBe("explore");
  });

  it("startTour enters tour at index 0 with autoplay on", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    expect(result.current.scene).toBe("tour");
    expect(result.current.tourIndex).toBe(0);
    expect(result.current.autoPlay).toBe(true);
    expect(result.current.currentStop?.id).toBe("a");
  });

  it("autoplay dwells 5s on spots and 3s on transit, stopping at the end", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    act(() => vi.advanceTimersByTime(4999));
    expect(result.current.tourIndex).toBe(0);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.tourIndex).toBe(1);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.tourIndex).toBe(2);
    expect(result.current.autoPlay).toBe(false);
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.tourIndex).toBe(2);
  });

  it("toggleAutoPlay pauses the timer", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    act(() => result.current.toggleAutoPlay());
    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.tourIndex).toBe(0);
  });

  it("next/prev/gotoStop clamp to bounds", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    act(() => result.current.prev());
    expect(result.current.tourIndex).toBe(0);
    act(() => result.current.gotoStop(99));
    expect(result.current.tourIndex).toBe(2);
    act(() => result.current.next());
    expect(result.current.tourIndex).toBe(2);
  });

  it("exitTour returns to explore and stops autoplay", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    act(() => result.current.exitTour());
    expect(result.current.scene).toBe("explore");
    expect(result.current.autoPlay).toBe(false);
  });

  it("replayIntro returns to intro from explore", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startExplore());
    act(() => result.current.replayIntro());
    expect(result.current.scene).toBe("intro");
  });

  it("replayIntro from tour stops autoplay and returns to intro", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    act(() => result.current.replayIntro());
    expect(result.current.scene).toBe("intro");
    expect(result.current.autoPlay).toBe(false);
  });
});
