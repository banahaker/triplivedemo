import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouteProgress } from "@/hooks/useRouteProgress";

let now = 0;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  now = 0;
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

function advance(ms: number) {
  now += ms;
  const pending = frames.splice(0);
  act(() => pending.forEach((cb) => cb(now)));
}

describe("useRouteProgress", () => {
  it("starts at 0 and reaches 1 after the duration", () => {
    const { result } = renderHook(() => useRouteProgress("a", 1000));
    expect(result.current).toBe(0);
    advance(500);
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1);
    advance(600);
    expect(result.current).toBe(1);
  });

  it("returns 1 immediately when disabled", () => {
    const { result } = renderHook(() => useRouteProgress("a", 1000, false));
    expect(result.current).toBe(1);
  });

  it("restarts from 0 when the key changes", () => {
    const { result, rerender } = renderHook(({ k }) => useRouteProgress(k, 1000), {
      initialProps: { k: "a" },
    });
    advance(1100);
    expect(result.current).toBe(1);
    rerender({ k: "b" });
    expect(result.current).toBe(0);
  });
});
