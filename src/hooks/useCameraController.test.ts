import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCameraController } from "@/hooks/useCameraController";
import type { MapRef } from "@/components/ui/map";

function makeMap() {
  return { flyTo: vi.fn(), jumpTo: vi.fn(), fitBounds: vi.fn() } as unknown as MapRef;
}

let reduced = false;
beforeEach(() => {
  reduced = false;
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) => ({ matches: reduced, media: query }) as MediaQueryList
  );
});

describe("useCameraController", () => {
  it("flies to a spot with cinematic defaults", () => {
    const map = makeMap();
    const { result } = renderHook(() => useCameraController({ current: map }));
    result.current.flyToSpot(121.5, 25.0, { bearing: 15 });
    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [121.5, 25.0],
        zoom: 14,
        pitch: 45,
        bearing: 15,
        duration: 2200,
        essential: true,
      })
    );
  });

  it("falls back to jumpTo under reduced motion", () => {
    reduced = true;
    const map = makeMap();
    const { result } = renderHook(() => useCameraController({ current: map }));
    result.current.flyToSpot(121.5, 25.0);
    expect(map.jumpTo).toHaveBeenCalled();
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it("fits bounds around coordinates", () => {
    const map = makeMap();
    const { result } = renderHook(() => useCameraController({ current: map }));
    result.current.fitCoords([[121, 24], [122, 25]]);
    expect(map.fitBounds).toHaveBeenCalledWith(
      [[121, 24], [122, 25]],
      expect.objectContaining({ pitch: 30, duration: 1800 })
    );
  });

  it("passes a custom duration through to fitBounds", () => {
    const map = makeMap();
    const { result } = renderHook(() => useCameraController({ current: map }));
    result.current.fitCoords([[121, 24], [122, 25]], { duration: 3200 });
    expect(map.fitBounds).toHaveBeenCalledWith(
      [[121, 24], [122, 25]],
      expect.objectContaining({ duration: 3200 })
    );
  });

  it("does nothing without a map or coordinates", () => {
    const map = makeMap();
    const { result, rerender } = renderHook(({ m }) => useCameraController({ current: m }), {
      initialProps: { m: null as MapRef | null },
    });
    result.current.flyToSpot(121, 24);
    result.current.fitCoords([[121, 24]]);
    rerender({ m: map });
    result.current.fitCoords([]);
    expect(map.fitBounds).not.toHaveBeenCalled();
  });
});
